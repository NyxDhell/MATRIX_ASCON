import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { cookies } from 'next/headers'; 

export const maxDuration = 60; 
export const dynamic = 'force-dynamic';

function applySmartScale(value: number) {
  if (value > 1000000) return value / 1000000;
  if (value > 1000) return value / 1000;
  return value;
}

export async function POST(req: Request) {
  let connection;
  let browser;

  console.log("\n========================================");
  console.log("🚀 [PDF EXPORT] PROSES MULTI-REPORT DIMULAI...");

  try {
    const body = await req.json().catch(() => ({}));
    const identifier = body.exporterName || body.nama || 'PENGGUNA SISTEM'; 
    
    const customKop = body.customKop; 
    const customCover = body.customCover; 
    const templateId = body.templateId || null;
    const selectedTables = body.selectedTables || []; 
    const interval = body.interval || 'raw';
    
    const startDate = body.startDate || new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0];
    const endDate = body.endDate || new Date().toISOString().split('T')[0];
    
    const startObj = new Date(startDate);
    const endObj = new Date(endDate);
    const diffTime = Math.abs(endObj.getTime() - startObj.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let groupLabel = `Jam`;
    if (diffDays > 14) groupLabel = `Hari`;

    const startStr = `${startDate} 00:00:00`;
    const endStr = `${endDate} 23:59:59`;
    
    const formattedDate = new Date().toLocaleString('id-ID', { 
        dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Jakarta'
    });

    // ─── BACA SETTINGS DARI COOKIES ───
    const cookieStore = await cookies();
    const targetDB    = cookieStore.get('matrix_active_db')?.value || 'plc_database';
    const fallbackTable = cookieStore.get('matrix_active_table')?.value || 'plc_data_logs';
    const timeCol     = cookieStore.get('matrix_time_col')?.value || 'timestamp';

    const targetTables = selectedTables.length > 0 ? selectedTables : [fallbackTable];

    // ─── SETUP KONEKSI GLOBAL ───
    const envUrl = process.env.DATABASE_URL || "";
    const hostMatch = envUrl.match(/@([^:\/]+)/); 
    const dynamicHost = hostMatch ? hostMatch[1] : 'localhost';
    
    const dbGlobalConfig = { host: dynamicHost, port: 3306, user: 'root', password: 'rahasia123', database: targetDB };
    connection = await mysql.createConnection(dbGlobalConfig);

    let exporterName = identifier.toUpperCase(); 
    try {
        const [userRows]: any = await connection.execute(
            `SELECT name FROM \`plc_database\`.\`user\` WHERE username = ? OR name = ? LIMIT 1`,
            [identifier, identifier]
        );
        if (userRows.length > 0) {
            exporterName = userRows[0].name.toUpperCase();
        }
    } catch (error) {}

    // ─── TARIK GAMBAR TEMPLATE ───
    let base64Kop = '';
    let base64Image = ''; 

    if (templateId) {
        try {
            const [tplRows]: any = await connection.execute('SELECT kop_base64, cover_base64 FROM `plc_database`.`pdf_templates` WHERE id = ?', [templateId]);
            if (tplRows.length > 0) {
                base64Kop = tplRows[0].kop_base64 || '';
                base64Image = tplRows[0].cover_base64 || '';
            }
        } catch (error) {}
    } else {
        if (customCover) base64Image = customCover;
        if (customKop) base64Kop = customKop;
    }

    if (!base64Image) {
        const imagePath = path.join(process.cwd(), 'public', 'cover-bg.jpg');
        try { base64Image = `data:image/jpeg;base64,${fs.readFileSync(imagePath).toString('base64')}`; } catch (err) {}
    }
    if (!base64Kop) {
        const kopPath = path.join(process.cwd(), 'public', 'kop-surat.png');
        try { base64Kop = `data:image/png;base64,${fs.readFileSync(kopPath).toString('base64')}`; } catch (err) {}
    }

    let chartJsContent = "";
    try {
        const response = await fetch('https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js');
        chartJsContent = await response.text();
    } catch (e) {}

    let tablesHTML = '';
    let chartScripts = '';
    const COLORS = ['#1E40AF', '#2A6C7A', '#9F7CAC', '#f59e0b', '#3b82f6', '#ec4899'];

    const kopSuratImageTag = base64Kop 
        ? `<img src="${base64Kop}" style="width: 100%; height: 120px; object-fit: fill; display: block;" alt="Kop Surat" />`
        : `<div style="height: 40px;"></div>`;

    // =========================================================================
    // ─── LOOPING: PROSES SETIAP TABEL ───
    // =========================================================================
    for (let i = 0; i < targetTables.length; i++) {
        const currentTable = targetTables[i];
        
        try {
            const [colSchema]: any = await connection.execute(`
                SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
                AND COLUMN_NAME NOT IN ('id', 'Id', 'timestamp', 'Timestamp', ?)
                AND DATA_TYPE IN ('int', 'float', 'double', 'decimal', 'bigint', 'smallint')
            `, [targetDB, currentTable, timeCol]);

            const detectedKeys = colSchema.map((c: any) => c.COLUMN_NAME);
            if (detectedKeys.length === 0) continue;

            const safeCols = detectedKeys.map((k: string) => `\`${k}\``).join(', ');
            const safeId = `node_${currentTable.replace(/[^a-zA-Z0-9]/g, '_')}`;
            const plcName = currentTable.toUpperCase();
            
            const [uptimeRows]: any = await connection.execute(`
                SELECT COUNT(*) as totalLogs
                FROM \`${currentTable}\` 
                WHERE \`${timeCol}\` >= ? AND \`${timeCol}\` <= ?
            `, [startStr, endStr]);
            const totalLogs = uptimeRows[0].totalLogs || 0;
            let errorLogs = 0;

            const [logHistory]: any = await connection.execute(`
                SELECT \`${timeCol}\` as log_time 
                FROM \`${currentTable}\` 
                WHERE \`${timeCol}\` >= ? AND \`${timeCol}\` <= ? ORDER BY \`${timeCol}\` DESC
            `, [startStr, endStr]);

            let localAlerts: any[] = [];
            for (let j = 0; j < logHistory.length - 1; j++) {
              const t1 = new Date(logHistory[j].log_time).getTime();
              const t2 = new Date(logHistory[j+1].log_time).getTime();
              const diffSec = (t1 - t2) / 1000;

              if (diffSec > 120) {
                  const mins = Math.round(diffSec / 60);
                  const offTime = new Date(logHistory[j+1].log_time); 
                  const onTime = new Date(logHistory[j].log_time);    
                  localAlerts.push({
                      waktu: offTime.toLocaleString('id-ID', {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'}) + ' WIB',
                      data: `Offline selama ${mins} Menit. Kembali terhubung pada ${onTime.toLocaleString('id-ID', {hour: '2-digit', minute: '2-digit'})}`
                  });
                  errorLogs++; 
              } 
            }
            localAlerts = localAlerts.slice(0, 30);
            const uptimePercentage = totalLogs > 0 ? (((totalLogs - errorLogs) / totalLogs) * 100).toFixed(2) : "0.00";

            const avgCols = detectedKeys.map((k: string) => `AVG(\`${k}\`) as \`avg_${k}\`, MIN(\`${k}\`) as \`min_${k}\`, MAX(\`${k}\`) as \`max_${k}\``).join(', ');
            const [paramAvgRows]: any = await connection.execute(`
                SELECT ${avgCols}
                FROM \`${currentTable}\` 
                WHERE \`${timeCol}\` >= ? AND \`${timeCol}\` <= ?
            `, [startStr, endStr]);

            let executiveSummary = "";
            let healthStatusLabel = "";
            let healthColor = "";

            if (totalLogs === 0) {
                healthStatusLabel = "NO DATA"; healthColor = "#64748b";
                executiveSummary = `Tidak ada rekam jejak telemetri yang terdeteksi untuk segment jaringan ini pada periode ${startDate} s/d ${endDate}.`;
            } else if (parseFloat(uptimePercentage) >= 99.00) {
                healthStatusLabel = "OPTIMAL"; healthColor = "#10b981";
                executiveSummary = `Infrastruktur beroperasi pada tingkat keandalan absolut (Uptime ${uptimePercentage}%). Integritas data berjalan sesuai spesifikasi pabrik tanpa packet loss.`;
            } else if (parseFloat(uptimePercentage) >= 95.00) {
                healthStatusLabel = "STABIL"; healthColor = "#3b82f6";
                executiveSummary = `Kinerja sistem berada dalam batas toleransi wajar (Uptime ${uptimePercentage}%). Secara arsitektur, mesin tergolong stabil.`;
            } else if (parseFloat(uptimePercentage) >= 85.00) {
                healthStatusLabel = "DEGRADASI"; healthColor = "#f59e0b";
                executiveSummary = `<strong>PERHATIAN:</strong> Terdeteksi degradasi performa dengan rasio ketersediaan menurun hingga ${uptimePercentage}%. Direkomendasikan inspeksi preventif.`;
            } else {
                healthStatusLabel = "KRITIKAL"; healthColor = "#ef4444";
                executiveSummary = `<strong>PERINGATAN KRITIS:</strong> Infrastruktur mengalami kegagalan operasional mayor (Uptime: ${uptimePercentage}%).`;
            }

            let paramAnalysisText = "";
            if (totalLogs > 0 && paramAvgRows.length > 0) {
                paramAnalysisText = "<ul style='margin-top:5px; margin-bottom:0; padding-left:20px; color:#475569;'>";
                detectedKeys.forEach((key: string) => {
                    const avg = applySmartScale(Number(paramAvgRows[0][`avg_${key}`]) || 0).toFixed(2);
                    const min = applySmartScale(Number(paramAvgRows[0][`min_${key}`]) || 0).toFixed(2);
                    const max = applySmartScale(Number(paramAvgRows[0][`max_${key}`]) || 0).toFixed(2);
                    paramAnalysisText += `<li><strong>${key.toUpperCase()}:</strong> Rata-rata <strong>${avg}</strong> (Min: ${min} | Max: ${max}).</li>`;
                });
                paramAnalysisText += "</ul>";
            }

            const [rtRows]: any = await connection.execute(`
                SELECT ${safeCols}, DATE_FORMAT(\`${timeCol}\`, '%d %b %H:%i') as waktu_chart 
                FROM \`${currentTable}\` 
                WHERE \`${timeCol}\` >= ? AND \`${timeCol}\` <= ?
                ORDER BY \`${timeCol}\` DESC LIMIT 300
            `, [startStr, endStr]);
            
            const rtMap: any = {};
            rtRows.reverse().forEach((r: any) => {
                if (!rtMap[r.waktu_chart]) rtMap[r.waktu_chart] = {};
                detectedKeys.forEach((k: string) => rtMap[r.waktu_chart][k] = applySmartScale(Number(r[k]) || 0));
            });
            const rtLabels = Object.keys(rtMap).slice(-30);
            let rtDataSets: Record<string, number[]> = {};
            detectedKeys.forEach((k: string) => rtDataSets[k] = rtLabels.map(lbl => rtMap[lbl][k] || 0));

            const monthAvgCols = detectedKeys.map((k: string) => `AVG(\`${k}\`) as \`${k}\``).join(', ');
            
            const processMonthlyTrend = (rows: any[], paramKeys: string[]) => {
              const trend = Array.from({length: 31}, (_, idx) => {
                  let obj: any = { time: `Tgl ${idx+1}` };
                  paramKeys.forEach(k => obj[k] = 0);
                  return obj;
              });
              rows.forEach((r: any) => {
                 const d = r.day - 1;
                 if (d >= 0 && d < 31) {
                     paramKeys.forEach(k => (trend[d] as any)[k] = applySmartScale(Number(r[k]) || 0));
                 }
              });
              return trend;
            };

            const [rowsBulanIni]: any = await connection.execute(`
              SELECT DAY(\`${timeCol}\`) as day, ${monthAvgCols} FROM \`${currentTable}\`
              WHERE MONTH(\`${timeCol}\`) = MONTH(CURDATE()) AND YEAR(\`${timeCol}\`) = YEAR(CURDATE()) 
              AND \`${timeCol}\` >= ? AND \`${timeCol}\` <= ?
              GROUP BY DAY(\`${timeCol}\`)
            `, [startStr, endStr]);
            const trendIni = processMonthlyTrend(rowsBulanIni, detectedKeys);

            const [rowsBulanLalu]: any = await connection.execute(`
              SELECT DAY(\`${timeCol}\`) as day, ${monthAvgCols} FROM \`${currentTable}\`
              WHERE MONTH(\`${timeCol}\`) = MONTH(CURDATE() - INTERVAL 1 MONTH) AND YEAR(\`${timeCol}\`) = YEAR(CURDATE() - INTERVAL 1 MONTH) 
              GROUP BY DAY(\`${timeCol}\`)
            `);
            const trendLalu = processMonthlyTrend(rowsBulanLalu, detectedKeys);

            let iniDataSets: Record<string, number[]> = {};
            let laluDataSets: Record<string, number[]> = {};
            const trendLabels = trendIni.map((t: any) => t.time);
            detectedKeys.forEach((k: string) => {
                iniDataSets[k] = trendIni.map((t:any) => t[k] || 0);
                laluDataSets[k] = trendLalu.map((t:any) => t[k] || 0);
            });

            // =========================================================================
            // ─── LOGIC PEMECAHAN TABEL DATA LOGGING (INTERVAL / RESOLUSI DENGAN GROUP BY) ───
            // =========================================================================
            
            let selectPdfCols = monthAvgCols;
            let pdfTimeFormat = "";
            let groupByPdf = "GROUP BY waktu";

            switch(interval) {
                case 'raw': 
                    pdfTimeFormat = '%d %b %Y %H:%i:%s'; 
                    selectPdfCols = safeCols; 
                    groupByPdf = ""; 
                    break;
                case 'minute': 
                    pdfTimeFormat = '%d %b %Y %H:%i'; 
                    break;
                case 'hour': 
                    pdfTimeFormat = '%d %b %Y %H:00'; 
                    break;
                case 'day': 
                    pdfTimeFormat = '%d %b %Y'; 
                    break;
                case 'week': 
                    pdfTimeFormat = 'Minggu %u, %Y'; 
                    break;
                case 'month': 
                    pdfTimeFormat = '%M %Y'; 
                    break;
                default:
                    pdfTimeFormat = '%d %b %Y'; 
                    break;
            }

            const [rowsTabelLog]: any = await connection.execute(`
                SELECT DATE_FORMAT(\`${timeCol}\`, '${pdfTimeFormat}') as waktu, ${selectPdfCols}, MAX(\`${timeCol}\`) as real_time
                FROM \`${currentTable}\` WHERE \`${timeCol}\` >= ? AND \`${timeCol}\` <= ?
                ${groupByPdf}
                ORDER BY real_time ASC
                ${interval === 'raw' ? 'LIMIT 1000' : ''}
            `, [startStr, endStr]);

            let allTablesLogsHTML = '';
            
            if (rowsTabelLog.length === 0) {
                allTablesLogsHTML = `
                    <div style="margin-bottom: 20px;">
                        <table class="data-table">
                            <thead style="display: table-header-group;">
                                <tr><th style="width: 80px;">TANGGAL</th>${detectedKeys.slice(0, 10).map((k: string) => `<th>${k.toUpperCase()}</th>`).join('')}</tr>
                            </thead>
                            <tbody>
                                <tr><td colspan="${Math.min(detectedKeys.length, 10) + 1}" style="text-align:center; padding: 15px;">Tidak ada data pada rentang waktu ini.</td></tr>
                            </tbody>
                        </table>
                    </div>
                `;
            } else {
                if(interval === 'raw') {
                    allTablesLogsHTML += `<p style="color: #ef4444; font-size: 8pt; font-weight:bold; margin-bottom: 5px;">*Catatan: Mode Ekspor "Semua Data (Raw)" pada PDF dibatasi maksimal 1000 baris pertama untuk mencegah kerusakan file. Gunakan Export Excel untuk raw data tanpa batas.</p>`;
                }
                const chunkSize = 10;
                const totalChunks = Math.ceil(detectedKeys.length / chunkSize);
                
                for (let c = 0; c < totalChunks; c++) {
                    const chunkKeys = detectedKeys.slice(c * chunkSize, (c + 1) * chunkSize);
                    
                    let chunkTbody = rowsTabelLog.map((r: any) => {
                        let rowCells = chunkKeys.map((k: string) => `<td>${applySmartScale(Number(r[k]) || 0).toFixed(2)}</td>`).join('');
                        return `<tr><td style="font-weight:bold; width: 95px;">${r.waktu}</td>${rowCells}</tr>`;
                    }).join('');

                    allTablesLogsHTML += `
                        <div class="avoid-orphan" style="margin-bottom: 20px;">
                            ${totalChunks > 1 ? `<div style="font-size: 8pt; font-weight: bold; color: #64748b; margin-bottom: 4px;">Bagian ${c + 1} dari ${totalChunks}</div>` : ''}
                            <table class="data-table">
                                <thead style="display: table-header-group;">
                                    <tr><th style="width: 95px;">WAKTU</th>${chunkKeys.map((k: string) => `<th>${k.toUpperCase()}</th>`).join('')}</tr>
                                </thead>
                                <tbody>${chunkTbody}</tbody>
                            </table>
                        </div>
                    `;
                }
            }

            let tableDtHTML = localAlerts.length === 0 
              ? `<tr><td colspan="3" style="text-align:center; color:#10b981; font-weight:bold; padding:15px;">Sistem Berjalan Normal. Tidak ada log anomali downtime.</td></tr>`
              : localAlerts.map((a: any) => `<tr><td style="color:#1E40AF; font-weight:bold;">${a.waktu}</td><td style="font-family:monospace; color:#64748b;">${a.data}</td><td><strong style="color:#ef4444">OFFLINE</strong></td></tr>`).join('');

            tablesHTML += `
              ${i > 0 ? '<div style="page-break-before: always; height: 1px;"></div>' : ''}
              <table style="width: 100%; border-collapse: collapse; border: none; margin: 0; padding: 0;">
                  <thead style="display: table-header-group;">
                      <tr><th style="padding: 0 0 20px 0; border: none; background: white;">${kopSuratImageTag}</th></tr>
                  </thead>
                  <tfoot style="display: table-footer-group;">
                      <tr><td style="border: none; height: 40px;"></td></tr>
                  </tfoot>
                  <tbody>
                      <tr>
                          <td style="padding: 10px 40px 20px 40px; border: none; vertical-align: top;">
                              
                              <div class="chapter-header safe-break">
                                  <div style="display: flex; align-items: center; gap: 15px;">
                                      <div class="chapter-number">${String(i + 1).padStart(2, '0')}</div>
                                      <div>
                                          <h2>DOKUMEN DIAGNOSTIK: ${plcName}</h2>
                                          <p>DATABASE SOURCE: <span style="font-family:monospace; color:#2A6C7A;">${targetDB}</span></p>
                                      </div>
                                  </div>
                                  <div style="background:${healthColor}; color:white; padding:8px 15px; border-radius:20px; font-size:10pt; font-weight:bold; letter-spacing:1px; white-space: nowrap;">
                                      STATUS: ${healthStatusLabel}
                                  </div>
                              </div>

                              <div class="analysis-box safe-break">
                                  <h3 style="margin-top:0; margin-bottom:8px; font-size:10pt; color:#1e293b;">RINGKASAN EKSEKUTIF (${startDate} s/d ${endDate})</h3>
                                  <p style="margin:0; color:#475569;">${executiveSummary}</p>
                                  <div style="margin-top:10px;">
                                      <strong>Distribusi Pembacaan Parameter:</strong>
                                      ${paramAnalysisText}
                                  </div>
                              </div>

                              <div class="box safe-break">
                                  <h3 class="box-title">1. FLUKTUASI PARAMETER (REALTIME SNAPSHOT)</h3>
                                  <div class="chart-container" style="height: 180px;"><canvas id="chart_rt_${safeId}"></canvas></div>
                              </div>
                              
                              <div class="grid-2 safe-break">
                                  <div class="col box">
                                      <h3 class="box-title" style="color:#2A6C7A;">2A. TREN HARIAN (BULAN INI)</h3>
                                      <div class="chart-container" style="height: 150px;"><canvas id="chart_ini_${safeId}"></canvas></div>
                                  </div>
                                  <div class="col box">
                                      <h3 class="box-title" style="color:#94a3b8;">2B. TREN HARIAN (BULAN LALU)</h3>
                                      <div class="chart-container" style="height: 150px;"><canvas id="chart_lalu_${safeId}"></canvas></div>
                                  </div>
                              </div>
                              
                              <h3 class="avoid-orphan" style="color:#1e293b; margin-top:20px; margin-bottom:10px;">3. DATA LOGGING PARAMETER</h3>
                              ${allTablesLogsHTML}
                              
                              <h3 class="avoid-orphan" style="color:#ef4444; margin-top:30px; margin-bottom:10px;">4. REKAMAN LOG DOWNTIME / ANOMALI</h3>
                              <table class="data-table">
                                  <thead style="display: table-header-group;">
                                      <tr><th style="width:20%">WAKTU KEJADIAN</th><th style="width:60%">KETERANGAN / TAG</th><th style="width:20%">STATUS</th></tr>
                                  </thead>
                                  <tbody>${tableDtHTML}</tbody>
                              </table>
                          </td>
                      </tr>
                  </tbody>
              </table>
            `;

            const makeDatasets = (dataMap: Record<string, number[]>) => detectedKeys.map((key: string, idx: number) => ({
              label: key, data: dataMap[key], borderColor: COLORS[idx % COLORS.length], backgroundColor: COLORS[idx % COLORS.length] + '1A', fill: true, tension: 0.4, borderWidth: 2, pointRadius: 0
            }));

            chartScripts += `
              new Chart(document.getElementById('chart_rt_${safeId}'), { type: 'line', data: { labels: ${JSON.stringify(rtLabels)}, datasets: ${JSON.stringify(makeDatasets(rtDataSets))} }, options: { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { position: 'bottom' } } } });
              new Chart(document.getElementById('chart_ini_${safeId}'), { type: 'line', data: { labels: ${JSON.stringify(trendLabels)}, datasets: ${JSON.stringify(makeDatasets(iniDataSets))} }, options: { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { position: 'bottom' } }, scales: { x: { ticks: { maxTicksLimit: 10 } } } } });
              new Chart(document.getElementById('chart_lalu_${safeId}'), { type: 'line', data: { labels: ${JSON.stringify(trendLabels)}, datasets: ${JSON.stringify(makeDatasets(laluDataSets))} }, options: { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { position: 'bottom' } }, scales: { x: { ticks: { maxTicksLimit: 10 } } } } });
            `;

        } catch (tableError) {
            console.error(`Gagal memproses PDF untuk tabel ${currentTable}:`, tableError);
        }
    }

    // =========================================================================
    // ─── FINALISASI HTML KESELURUHAN ───
    // =========================================================================
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <script>${chartJsContent}</script>
        <style>
            @page { size: A4; margin: 0; }
            body { font-family: 'Helvetica', sans-serif; margin: 0; padding: 0; color: #1e293b; -webkit-print-color-adjust: exact; }
            .cover-page { height: 100vh; width: 100%; background-image: url('${base64Image}'); background-size: cover; background-position: center; background-color: white; position: relative; z-index: 100; page-break-after: always; }
            .metadata-box { position: absolute; top: 48%; right: 10%; text-align: right; }
            .metadata-box p { margin: 0; font-size: 11pt; color: #64748b; }
            .metadata-box strong { color: #1E40AF; font-size: 14pt; display: block; margin-top: 5px; font-weight: 900; text-transform: uppercase; }
            .safe-break { page-break-inside: avoid; break-inside: avoid; }
            .avoid-orphan { page-break-after: avoid; break-after: avoid; }
            
            /* ORIGINAL CSS LAYOUT */
            .chapter-header { border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; }
            .chapter-number { background: #1e293b; color: white; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 10px; font-weight: 900; font-size: 16pt; }
            h2 { margin: 0; font-size: 14pt; font-weight: 900; color: #1e293b; }
            .chapter-header p { margin: 5px 0 0 0; font-size: 8pt; color: #94a3b8; font-family: monospace; }
            .analysis-box { background:#f8fafc; border-left:4px solid #f59e0b; padding:15px; border-radius:0 8px 8px 0; margin-bottom:20px; font-size:9pt; line-height:1.6; }
            .box { border: 1px solid #e2e8f0; padding: 15px; border-radius: 12px; background: #f8fafc; margin-bottom: 15px; }
            .box-title { margin: 0 0 10px 0; font-size: 9pt; color: #64748b; font-weight: 900; letter-spacing: 0.5px; }
            .grid-2 { display: flex; gap: 15px; }
            .col { flex: 1; width: 50%; }
            .chart-container { position: relative; width: 100%; }
            
            .data-table { width: 100%; border-collapse: collapse; font-size: 7.5pt; margin-top: 5px; table-layout: fixed; word-wrap: break-word; }
            .data-table th, .data-table td { border: 1px solid #e2e8f0; padding: 6px; text-align: left; }
            .data-table th { background: #f1f5f9; font-weight: 900; color: #475569; }
            thead { display: table-header-group; }
            .data-table tr { page-break-inside: avoid; break-inside: avoid; }
            .data-table tr:nth-child(even) { background-color: #f8fafc; }
        </style>
    </head>
    <body>
        <div class="cover-page">
            <div class="metadata-box">
                <p>Dicetak pada:</p><strong>${formattedDate}</strong>
                <p style="margin-top:20px;">Dianalisis dan dicetak oleh:</p><strong>${exporterName}</strong>
            </div>
        </div>

        ${tablesHTML}

        <script>
            Chart.defaults.font.family = 'Helvetica';
            Chart.defaults.font.size = 9;
            ${chartScripts}
        </script>
    </body>
    </html>
    `;

    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'load', timeout: 0 }); 

    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });

    console.log("✅ [PDF EXPORT] File PDF berhasil dibuat!");

    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="REPORT_${startDate}_to_${endDate}_${new Date().getTime()}.pdf"`
      }
    });

  } catch (error) {
    console.error("❌ [PDF EXPORT FATAL ERROR]:", error);
    return NextResponse.json({ error: "Gagal Generate PDF", details: String(error) }, { status: 500 });
  } finally {
    if (connection) await connection.end();
    if (browser) await browser.close();
    console.log("🏁 [PDF EXPORT] Selesai.");
  }
}
