import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { cookies } from 'next/headers'; 

// ─── 3 BARIS INI WAJIB UNTUK MENGHANCURKAN CACHE DI NEXT.JS ───
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

function applySmartScale(value: number) {
  if (value > 1000000) return value / 1000000;
  if (value > 1000)    return value / 1000;
  return value;
}

function buildUptimeArray(map: Record<string, { online: number; total: number }>) {
  return Object.keys(map)
    .sort((a, b) => parseInt(a.replace('Day ', '')) - parseInt(b.replace('Day ', '')))
    .map((day: string) => {
      const { online, total } = map[day];
      const onlinePct  = total > 0 ? parseFloat(((online / total) * 100).toFixed(1))  : 100;
      const offlinePct = total > 0 ? parseFloat((100 - (online / total) * 100).toFixed(1)) : 0;
      return { day, onlinePct, offlinePct };
    });
}

export async function GET(req: Request) {
  let connection;
  try {
    // ─── BACA SETTINGS DASAR ───
    const cookieStore = await cookies();
    const targetDB    = cookieStore.get('matrix_active_db')?.value || 'plc_database';
    const timeCol     = cookieStore.get('matrix_time_col')?.value || 'timestamp';

    console.log(`📡 [API ANALYTICS] Menerima request multi-grafik. Target Database: [${targetDB}]`);

    // ─── SETUP KONEKSI DATABASE GLOBAL ───
    const envUrl = process.env.DATABASE_URL || "";
    const hostMatch = envUrl.match(/@([^:\/]+)/); 
    const dynamicHost = hostMatch ? hostMatch[1] : 'localhost';
    
    const dbGlobalConfig = { host: dynamicHost, port: 3306, user: 'root', password: 'rahasia123', database: targetDB };
    connection = await mysql.createConnection(dbGlobalConfig);

    // ─── TANGKAP PARAMETER DARI DASHBOARD ───
    const { searchParams } = new URL(req.url);
    const filterStartDate = searchParams.get('startDate');
    const filterEndDate = searchParams.get('endDate');
    const tablesParam = searchParams.get('tables'); // Menangkap checklist dari dashboard

    const startDateStr = filterStartDate ? `${filterStartDate} 00:00:00` : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + ' 00:00:00';
    const endDateStr = filterEndDate ? `${filterEndDate} 23:59:59` : new Date().toISOString().split('T')[0] + ' 23:59:59';

    // ─── AMBIL SEMUA TABEL YANG VALID DI DATABASE ───
    const [allTablesRows]: any = await connection.execute('SHOW TABLES');
    const allScannedTables = allTablesRows
        .map((r: any) => Object.values(r)[0])
        .filter((t: string) => !['pdf_templates', 'users', 'plc_config', 'sessions', 'vpn_ips'].includes(t));

    // ─── TENTUKAN TABEL MANA YANG AKAN DIPROSES ───
    let targetTables: string[] = [];
    if (tablesParam && tablesParam !== 'ALL' && tablesParam.trim() !== '') {
        targetTables = tablesParam.split(',');
    } else {
        targetTables = allScannedTables;
    }

    if (targetTables.length === 0) {
        const fallback = cookieStore.get('matrix_active_table')?.value;
        if (fallback) targetTables = [fallback];
    }

    // ─── WADAH DATA GLOBAL ───
    const multiNodeCharts: any[] = [];
    const allGlobalAlerts: any[] = [];
    let   countNormal  = 0, countWarning = 0, countError = 0;
    const uptimeThisMap:  Record<string, { online: number; total: number }> = {};
    const uptimePrevMap:  Record<string, { online: number; total: number }> = {};
    const now = new Date();

    // ─── LOOPING MULTI-TABEL (PROSES SEMUA MESIN YANG DI-CHECKLIST) ───
    for (const targetTable of targetTables) {
        try {
            // Deteksi kolom sensor otomatis per tabel
            const [colSchema]: any = await connection.execute(`
                SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
                AND COLUMN_NAME NOT IN ('id', 'Id', 'timestamp', 'Timestamp', ?)
                AND DATA_TYPE IN ('int', 'float', 'double', 'decimal', 'bigint', 'smallint')
            `, [targetDB, targetTable, timeCol]);

            const detectedKeys = colSchema.map((c: any) => c.COLUMN_NAME);
            if (detectedKeys.length === 0) continue; // Skip jika tabel tidak punya sensor

            const safeCols = detectedKeys.map((k: string) => `\`${k}\``).join(', ');

            // 1. REALTIME DATA
            const queryRealtime = `
              SELECT ${safeCols}, DATE_FORMAT(\`${timeCol}\`, '%H:%i:%s') as time
              FROM \`${targetTable}\`
              WHERE \`${timeCol}\` >= ? AND \`${timeCol}\` <= ?
              ORDER BY \`${timeCol}\` DESC LIMIT 150
            `;
            const [rtRows]: any = await connection.execute(queryRealtime, [startDateStr, endDateStr]);

            const realtimeData = rtRows.reverse().map((row: any) => {
              const entry: any = { time: row.time };
              detectedKeys.forEach((key: string) => entry[key] = Number(applySmartScale(Number(row[key]) || 0).toFixed(3)));
              return entry;
            });

            // 2. LOG HISTORY (Deteksi Offline & Gap)
            const [logHistory]: any = await connection.execute(`
              SELECT \`${timeCol}\` as log_time
              FROM \`${targetTable}\`
              WHERE \`${timeCol}\` >= ? AND \`${timeCol}\` <= ?
              ORDER BY \`${timeCol}\` DESC
            `, [startDateStr, endDateStr]);

            let isCurrentlyOffline = false;
            const nowMs = now.getTime();

            if (logHistory.length > 0) {
              const lastLogTime = new Date(logHistory[0].log_time).getTime();
              if ((nowMs - lastLogTime) / 1000 > 120) {
                isCurrentlyOffline = true;
                countError++;
              } else { countNormal++; }
            } else {
              isCurrentlyOffline = true; countError++;
            }

            for (let i = 0; i < logHistory.length; i++) {
              const logDate = new Date(logHistory[i].log_time);
              const dayKey  = `Day ${logDate.getDate()}`;
              
              if (!uptimeThisMap[dayKey]) uptimeThisMap[dayKey] = { online: 0, total: 0 };
              uptimeThisMap[dayKey].total += 1;

              let hasGap = false;
              if (i < logHistory.length - 1) {
                const t1 = new Date(logHistory[i].log_time).getTime();
                const t2 = new Date(logHistory[i + 1].log_time).getTime();
                const diffSec = (t1 - t2) / 1000;

                if (diffSec > 120) {
                  hasGap = true;
                  const offTime = new Date(logHistory[i + 1].log_time);
                  const onTime  = new Date(logHistory[i].log_time);
                  const mins    = Math.round(diffSec / 60);
                  allGlobalAlerts.push({
                    plcName:     targetTable.toUpperCase(),
                    tanggal:     offTime.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
                    jam:         offTime.toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                    data:        `Sistem offline selama ${mins} Menit. Terhubung kembali pada ${onTime.toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' })}`,
                    status_code: 'Offline',
                    timestamp:   offTime.getTime(),
                  });
                }
              }
              if (!hasGap) uptimeThisMap[dayKey].online += 1;
            }

            // 3. TREN BULANAN DINAMIS
            const avgCols = detectedKeys.map((k: string) => `AVG(\`${k}\`) as \`${k}\``).join(', ');

            const [rowsBulanIni]: any = await connection.execute(`
              SELECT DAY(\`${timeCol}\`) as day, ${avgCols}
              FROM \`${targetTable}\`
              WHERE \`${timeCol}\` >= ? AND \`${timeCol}\` <= ?
              GROUP BY DAY(\`${timeCol}\`)
            `, [startDateStr, endDateStr]);

            const [rowsBulanLalu]: any = await connection.execute(`
              SELECT DAY(\`${timeCol}\`) as day, ${avgCols}
              FROM \`${targetTable}\`
              WHERE \`${timeCol}\` >= DATE_SUB(?, INTERVAL 1 MONTH) 
                AND \`${timeCol}\` <= DATE_SUB(?, INTERVAL 1 MONTH)
              GROUP BY DAY(\`${timeCol}\`)
            `, [startDateStr, endDateStr]);

            const processMonthlyTrend = (rows: any[]) => {
              const trend = Array.from({ length: 31 }, (_, i) => {
                const baseObj: any = { time: `Tgl ${i + 1}` };
                detectedKeys.forEach((k: string) => baseObj[k] = 0);
                return baseObj;
              });

              rows.forEach((r: any) => {
                const d = r.day - 1;
                if (d >= 0 && d < 31) {
                  detectedKeys.forEach((k: string) => trend[d][k] = Number(applySmartScale(Number(r[k]) || 0).toFixed(2)));
                }
              });
              return trend;
            };

            multiNodeCharts.push({
              plcId:         `DB-${targetTable}`,
              plcName:       targetTable.toUpperCase(),
              status:        isCurrentlyOffline ? 'offline' : 'online',
              parameterKeys: detectedKeys,
              realtimeData,
              trendBulanIni:  processMonthlyTrend(rowsBulanIni),
              trendBulanLalu: processMonthlyTrend(rowsBulanLalu),
            });
        } catch (tableError) {
            console.error(`Gagal memproses tabel ${targetTable}:`, tableError);
        }
    }

    allGlobalAlerts.sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json({
      scannedTables:      allScannedTables, // Mengirim daftar semua tabel ke frontend
      lostLogs:           allGlobalAlerts.slice(0, 50),
      monthlyStats:       buildUptimeArray(uptimeThisMap),      
      prevMonthStats:     buildUptimeArray(uptimePrevMap),    
      statusDistribution: [
        { name: 'Normal',          value: countNormal  || 1, fill: '#10b981' },
        { name: 'Critical/Offline',value: countError,        fill: '#ef4444' },
      ],
      multiNodeCharts,
    });

  } catch (error: any) {
    console.error('API Analytics Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}
