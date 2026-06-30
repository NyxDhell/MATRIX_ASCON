import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const envUrl = process.env.DATABASE_URL || "";
// Regex ini bertugas mengambil IP VPN (teks setelah simbol '@' dan sebelum ':')
const hostMatch = envUrl.match(/@([^:\/]+)/); 
const dynamicHost = hostMatch ? hostMatch[1] : 'localhost';
const dbConfig = { 
  host: dynamicHost, // <-- Sekarang otomatis jadi '10.242.215.145' atau 'localhost' sesuai .env
  port: 3306, 
  user: 'root', 
  password: 'rahasia123', 
  database: 'plc_database' 
};

// PERBAIKAN: Menggunakan context: any agar bisa di-await dengan aman
export async function GET(req: Request, context: any) {
  let connection;

  try {
    // PERBAIKAN: Menunggu params terekstrak dengan sempurna (wajib di Next.js 14/15)
    const params = await context.params;
    const plcId = params.id;

    if (!plcId) {
      return NextResponse.json({ error: "ID Node tidak ditemukan" }, { status: 400 });
    }

    connection = await mysql.createConnection(dbConfig);

    const [rows]: any = await connection.execute(`
      SELECT plcName, DATE_FORMAT(createdAt, '%H:%i') as time, data 
      FROM plclog WHERE plcId = ? ORDER BY createdAt DESC LIMIT 50
    `, [plcId]);

    const namaMesin = rows.length > 0 ? rows[0].plcName : "Menunggu Rekaman Sensor";
    let countNormal = 0, countWarning = 0, countError = 0;
    let detectedKeys = new Set<string>();

    const nodeData = rows.slice(0, 30).reverse().map((row: any) => {
      let parsed: any = {}; try { parsed = JSON.parse(row.data); } catch(e){} 
      let dataPoint: any = { time: row.time };

      Object.keys(parsed).forEach(key => {
        if (key.toLowerCase() !== 'status') {
            detectedKeys.add(key);
            let rawVal = Number(parsed[key]) || 0;
            dataPoint[key] = rawVal > 500 ? rawVal / 1000 : rawVal;
        }
      });
      return dataPoint;
    });

    rows.forEach((row: any) => {
      let parsed: any = {}; try { parsed = JSON.parse(row.data); } catch(e){}
      const statusText = (parsed.Status || parsed.status || "").toLowerCase();
      if (statusText === "error" || statusText === "offline" || (parsed.Suhu > 45)) countError++;
      else if (statusText === "warning" || (parsed.Suhu > 35)) countWarning++;
      else countNormal++;
    });

    const statusDistribution = [
      { name: 'Normal', value: countNormal, fill: '#10b981' },
      { name: 'Warning', value: countWarning, fill: '#f59e0b' },
      { name: 'Critical/Offline', value: countError, fill: '#ef4444' }
    ];

    const [monthlyLogs]: any = await connection.execute(`
      SELECT MONTHNAME(createdAt) as bulan, COUNT(*) as total_lost
      FROM plclog WHERE plcId = ? AND (data LIKE '%"Suhu":"0"%' OR data LIKE '%"Offline"%' OR data LIKE '%"Error"%')
      GROUP BY MONTH(createdAt) ORDER BY MONTH(createdAt)
    `, [plcId]);

    const [downtimeRawLogs]: any = await connection.execute(`
      SELECT DATE_FORMAT(createdAt, '%d %M %Y') as tanggal, DATE_FORMAT(createdAt, '%H:%i:%s') as jam, data 
      FROM plclog WHERE plcId = ? AND (data LIKE '%"Suhu":"0"%' OR data LIKE '%"Offline"%' OR data LIKE '%"Error"%')
      ORDER BY createdAt DESC LIMIT 15
    `, [plcId]);

    const processMonthlyTrend = (trendRows: any[]) => {
      const trend = Array.from({length: 31}, (_, i) => ({ time: `Tgl ${i+1}`, count: 0, rawSums: {} as Record<string, number> }));
      trendRows.forEach((r: any) => {
         const d = r.day - 1;
         let p: any = {}; try { p = JSON.parse(r.data); } catch(e){}
         Object.keys(p).forEach(key => {
             if (key.toLowerCase() !== 'status') {
                 detectedKeys.add(key); // Ini otomatis membaca parameter dinamis
                 if (!trend[d].rawSums[key]) trend[d].rawSums[key] = 0;
                 trend[d].rawSums[key] += Number(p[key]) || 0;
             }
         });
         trend[d].count++;
      });
      return trend.map(t => {
         let finalPoint: any = { time: t.time };
         if (t.count > 0) {
             Object.keys(t.rawSums).forEach(key => {
                 let avgRaw = t.rawSums[key] / t.count;
                 finalPoint[key] = avgRaw > 500 ? Math.round((avgRaw / 1000) * 10) / 10 : Math.round(avgRaw);
             });
         }
         return finalPoint;
      });
    };

    const [rowsBulanIni]: any = await connection.execute(`SELECT DAY(createdAt) as day, data FROM plclog WHERE plcId = ? AND MONTH(createdAt) = MONTH(CURDATE()) AND YEAR(createdAt) = YEAR(CURDATE())`, [plcId]);
    const trendBulanIni = processMonthlyTrend(rowsBulanIni);

    const [rowsBulanLalu]: any = await connection.execute(`SELECT DAY(createdAt) as day, data FROM plclog WHERE plcId = ? AND MONTH(createdAt) = MONTH(CURDATE() - INTERVAL 1 MONTH) AND YEAR(createdAt) = YEAR(CURDATE() - INTERVAL 1 MONTH)`, [plcId]);
    const trendBulanLalu = processMonthlyTrend(rowsBulanLalu);

    return NextResponse.json({ 
      plcName: namaMesin, 
      nodeData, 
      parameterKeys: Array.from(detectedKeys), 
      statusDistribution, 
      monthlyStats: monthlyLogs, 
      downtimeLogs: downtimeRawLogs,
      trendBulanIni, 
      trendBulanLalu 
    });

  } catch (error) {
    console.error("Error Detail Node:", error);
    return NextResponse.json({ error: "Gagal ambil detail node" }, { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}
