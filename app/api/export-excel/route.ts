import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { cookies } from 'next/headers';
import ExcelJS from 'exceljs';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function applySmartScale(value: number) {
  if (value > 1000000) return value / 1000000;
  if (value > 1000) return value / 1000;
  return value;
}

// ─── WARNA TEMA ───
const COLOR = {
  headerBg:    '1E40AF',   // biru tua
  headerFont:  'FFFFFF',
  subHeaderBg: 'DBEAFE',   // biru muda
  subHeaderFnt:'1E3A8A',
  accentBlue:  '2A6C7A',
  green:       '10B981',
  yellow:      'F59E0B',
  red:         'EF4444',
  gray:        '64748B',
  rowEven:     'F8FAFC',
  rowOdd:      'FFFFFF',
  border:      'CBD5E1',
  summaryBg:   'FFF7ED',
  summaryBdr:  'F59E0B',
  offlineBg:   'FEF2F2',
};

function applyBorderAll(ws: ExcelJS.Worksheet, row: number, colStart: number, colEnd: number) {
  for (let c = colStart; c <= colEnd; c++) {
    const cell = ws.getCell(row, c);
    cell.border = {
      top:    { style: 'thin', color: { argb: COLOR.border } },
      left:   { style: 'thin', color: { argb: COLOR.border } },
      bottom: { style: 'thin', color: { argb: COLOR.border } },
      right:  { style: 'thin', color: { argb: COLOR.border } },
    };
  }
}

function styleHeaderCell(cell: ExcelJS.Cell, text: string, bgColor = COLOR.headerBg, fontColor = COLOR.headerFont) {
  cell.value = text;
  cell.font = { bold: true, color: { argb: fontColor }, name: 'Arial', size: 10 };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  cell.border = {
    top:    { style: 'medium', color: { argb: COLOR.headerBg } },
    left:   { style: 'medium', color: { argb: COLOR.headerBg } },
    bottom: { style: 'medium', color: { argb: COLOR.headerBg } },
    right:  { style: 'medium', color: { argb: COLOR.headerBg } },
  };
}

function styleDataCell(cell: ExcelJS.Cell, value: any, isEven: boolean, align: 'left'|'center'|'right' = 'center') {
  cell.value = value;
  cell.font  = { name: 'Arial', size: 9, color: { argb: '1E293B' } };
  cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? COLOR.rowEven : COLOR.rowOdd } };
  cell.alignment = { horizontal: align, vertical: 'middle' };
  cell.border = {
    top:    { style: 'thin', color: { argb: COLOR.border } },
    left:   { style: 'thin', color: { argb: COLOR.border } },
    bottom: { style: 'thin', color: { argb: COLOR.border } },
    right:  { style: 'thin', color: { argb: COLOR.border } },
  };
}

export async function POST(req: Request) {
  let connection: mysql.Connection | undefined;

  try {
    const body = await req.json().catch(() => ({}));
    const identifier    = body.exporterName || body.nama || 'PENGGUNA SISTEM';
    const templateId    = body.templateId || null;
    const selectedTables= body.selectedTables || [];
    const interval      = body.interval || 'raw'; // INTERVAL RESOLUSI DARI FRONTEND
    const startDate     = body.startDate || new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0];
    const endDate       = body.endDate   || new Date().toISOString().split('T')[0];
    const startStr      = `${startDate} 00:00:00`;
    const endStr        = `${endDate} 23:59:59`;

    const formattedDate = new Date().toLocaleString('id-ID', {
      dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Jakarta'
    });

    // ─── BACA COOKIES ───
    const cookieStore    = await cookies();
    const targetDB       = cookieStore.get('matrix_active_db')?.value    || 'plc_database';
    const fallbackTable  = cookieStore.get('matrix_active_table')?.value || 'plc_data_logs';
    const timeCol        = cookieStore.get('matrix_time_col')?.value     || 'timestamp';
    const targetTables   = selectedTables.length > 0 ? selectedTables : [fallbackTable];

    // ─── KONEKSI DB ───
    const envUrl     = process.env.DATABASE_URL || '';
    const hostMatch  = envUrl.match(/@([^:\/]+)/);
    const dynamicHost= hostMatch ? hostMatch[1] : 'localhost';
    connection = await mysql.createConnection({
      host: dynamicHost, port: 3306, user: 'root', password: 'rahasia123', database: targetDB
    });

    // ─── NAMA EXPORTER ───
    let exporterName = identifier.toUpperCase();
    try {
      const [userRows]: any = await connection.execute(
        `SELECT name FROM \`plc_database\`.\`user\` WHERE username = ? OR name = ? LIMIT 1`,
        [identifier, identifier]
      );
      if (userRows.length > 0) exporterName = userRows[0].name.toUpperCase();
    } catch {}

    // =========================================================================
    // ─── BUAT WORKBOOK ───
    // =========================================================================
    const wb = new ExcelJS.Workbook();
    wb.creator  = exporterName;
    wb.created  = new Date();
    wb.modified = new Date();

    // ─── SHEET COVER / INFO ───
    const wsCover = wb.addWorksheet('📋 INFO LAPORAN', {
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true },
      properties: { tabColor: { argb: COLOR.headerBg } },
    });
    wsCover.columns = [
      { width: 5 }, { width: 30 }, { width: 45 }, { width: 10 }
    ];

    // Judul besar
    wsCover.mergeCells('B2:C3');
    const titleCell = wsCover.getCell('B2');
    titleCell.value = 'LAPORAN DIAGNOSTIK SISTEM PLC';
    titleCell.font  = { bold: true, size: 18, color: { argb: COLOR.headerFont }, name: 'Arial' };
    titleCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.headerBg } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    wsCover.getRow(2).height = 35;
    wsCover.getRow(3).height = 35;

    // Label Interval yang Ramah Pengguna
    let intervalLabel = 'Raw Data (Setiap Rekaman)';
    if (interval === 'minute') intervalLabel = 'Rata-rata per Menit';
    else if (interval === 'hour') intervalLabel = 'Rata-rata per Jam';
    else if (interval === 'day') intervalLabel = 'Rata-rata per Hari';
    else if (interval === 'week') intervalLabel = 'Rata-rata per Minggu';
    else if (interval === 'month') intervalLabel = 'Rata-rata per Bulan';

    const infoRows = [
      ['', 'DATABASE SUMBER',  targetDB],
      ['', 'RENTANG LAPORAN',  `${startDate}  s/d  ${endDate}`],
      ['', 'INTERVAL DATA',    intervalLabel], // MENUNJUKKAN INTERVAL DI COVER
      ['', 'JUMLAH TABEL',     `${targetTables.length} Tabel`],
      ['', 'DICETAK OLEH',     exporterName],
      ['', 'TANGGAL CETAK',    formattedDate],
    ];

    infoRows.forEach((r, idx) => {
      const rowNum = 5 + idx;
      wsCover.mergeCells(`B${rowNum}:B${rowNum}`);
      wsCover.mergeCells(`C${rowNum}:C${rowNum}`);
      const labelCell = wsCover.getCell(`B${rowNum}`);
      const valueCell = wsCover.getCell(`C${rowNum}`);
      labelCell.value = r[1];
      labelCell.font  = { bold: true, name: 'Arial', size: 10, color: { argb: COLOR.accentBlue } };
      labelCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.subHeaderBg } };
      labelCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      valueCell.value = r[2];
      valueCell.font  = { name: 'Arial', size: 10 };
      valueCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      applyBorderAll(wsCover, rowNum, 2, 3);
      wsCover.getRow(rowNum).height = 22;
    });

    // Daftar isi tabel
    const tocStartRow = 13;
    wsCover.mergeCells(`B${tocStartRow}:C${tocStartRow}`);
    const tocTitle = wsCover.getCell(`B${tocStartRow}`);
    styleHeaderCell(tocTitle, 'DAFTAR ISI LAPORAN');
    wsCover.getRow(tocStartRow).height = 22;

    targetTables.forEach((tbl: string, idx: number) => {
      const r = tocStartRow + 1 + idx;
      const numCell   = wsCover.getCell(`B${r}`);
      const nameCell  = wsCover.getCell(`C${r}`);
      styleDataCell(numCell, idx + 1, idx % 2 === 0, 'center');
      styleDataCell(nameCell, tbl.toUpperCase(), idx % 2 === 0, 'left');
      wsCover.getRow(r).height = 18;
    });

    // =========================================================================
    // ─── LOOP SETIAP TABEL ───
    // =========================================================================
    for (let i = 0; i < targetTables.length; i++) {
      const currentTable = targetTables[i];
      const plcName      = currentTable.toUpperCase();
      const sheetName    = `${String(i+1).padStart(2,'0')}_${currentTable.replace(/[^a-zA-Z0-9]/g,'_').substring(0,25)}`;

      const ws = wb.addWorksheet(sheetName, {
        pageSetup: {
          paperSize: 9,             // A4
          orientation: 'landscape',
          fitToPage:   true,
          fitToWidth:  1,
          fitToHeight: 0,
          margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
        },
        headerFooter: {
          oddHeader: `&L&B${plcName}&R&BHalaman &P dari &N`,
          oddFooter: `&LDicetak: ${formattedDate}  |  Oleh: ${exporterName}&RDatabase: ${targetDB}`,
        },
        properties: { tabColor: { argb: COLOR.accentBlue } },
      });

      try {
        // ─── AMBIL SCHEMA KOLOM ───
        const [colSchema]: any = await connection.execute(`
          SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
          AND COLUMN_NAME NOT IN ('id','Id','timestamp','Timestamp',?)
          AND DATA_TYPE IN ('int','float','double','decimal','bigint','smallint')
        `, [targetDB, currentTable, timeCol]);

        const detectedKeys: string[] = colSchema.map((c: any) => c.COLUMN_NAME);
        if (detectedKeys.length === 0) continue;

        // ─── STATISTIK UPTIME ───
        const [uptimeRows]: any = await connection.execute(`
          SELECT COUNT(*) as totalLogs FROM \`${currentTable}\`
          WHERE \`${timeCol}\` >= ? AND \`${timeCol}\` <= ?
        `, [startStr, endStr]);
        const totalLogs = uptimeRows[0].totalLogs || 0;

        const [logHistory]: any = await connection.execute(`
          SELECT \`${timeCol}\` as log_time FROM \`${currentTable}\`
          WHERE \`${timeCol}\` >= ? AND \`${timeCol}\` <= ?
          ORDER BY \`${timeCol}\` DESC
        `, [startStr, endStr]);

        let errorLogs  = 0;
        const localAlerts: any[] = [];
        for (let j = 0; j < logHistory.length - 1; j++) {
          const diffSec = (new Date(logHistory[j].log_time).getTime() - new Date(logHistory[j+1].log_time).getTime()) / 1000;
          if (diffSec > 120) {
            const mins    = Math.round(diffSec / 60);
            const offTime = new Date(logHistory[j+1].log_time);
            const onTime  = new Date(logHistory[j].log_time);
            localAlerts.push({
              waktu: offTime.toLocaleString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) + ' WIB',
              data:  `Offline selama ${mins} Menit. Kembali terhubung pada ${onTime.toLocaleString('id-ID', { hour:'2-digit', minute:'2-digit' })}`,
            });
            errorLogs++;
          }
        }
        const uptimePercentage = totalLogs > 0 ? (((totalLogs - errorLogs) / totalLogs) * 100).toFixed(2) : '0.00';

        let healthLabel = 'NO DATA';
        let healthColor = COLOR.gray;
        if (totalLogs > 0) {
          const up = parseFloat(uptimePercentage);
          if (up >= 99)   { healthLabel = 'OPTIMAL';   healthColor = COLOR.green; }
          else if (up >= 95) { healthLabel = 'STABIL';    healthColor = '3B82F6'; }
          else if (up >= 85) { healthLabel = 'DEGRADASI'; healthColor = COLOR.yellow; }
          else              { healthLabel = 'KRITIKAL';  healthColor = COLOR.red; }
        }

        // ─── AVG/MIN/MAX STATISTIK PARAMETER ───
        const avgCols = detectedKeys.map((k: string) =>
          `AVG(\`${k}\`) as \`avg_${k}\`, MIN(\`${k}\`) as \`min_${k}\`, MAX(\`${k}\`) as \`max_${k}\``
        ).join(', ');
        const [paramAvgRows]: any = await connection.execute(`
          SELECT ${avgCols} FROM \`${currentTable}\`
          WHERE \`${timeCol}\` >= ? AND \`${timeCol}\` <= ?
        `, [startStr, endStr]);

        // ─── LOGIC INTERVAL (DOWNSAMPLING) UNTUK TABEL LOGGING ───
        const safeCols = detectedKeys.map((k: string) => `\`${k}\``).join(', ');
        let selectPdfCols = detectedKeys.map((k: string) => `AVG(\`${k}\`) as \`${k}\``).join(', ');
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
                pdfTimeFormat = '%d %b %Y %H:%i:%s';
                selectPdfCols = safeCols; 
                groupByPdf = ""; 
                break;
        }

        const [rowsTabelLog]: any = await connection.execute(`
          SELECT DATE_FORMAT(\`${timeCol}\`, '${pdfTimeFormat}') as waktu, ${selectPdfCols}, MAX(\`${timeCol}\`) as real_time
          FROM \`${currentTable}\` WHERE \`${timeCol}\` >= ? AND \`${timeCol}\` <= ?
          ${groupByPdf} ORDER BY real_time ASC
        `, [startStr, endStr]);

        // =========================================================================
        // ─── MULAI TULIS KE WORKSHEET ───
        // =========================================================================
        let curRow = 1;

        // ── JUDUL LAPORAN ──
        const totalCols = detectedKeys.length + 1; // +1 untuk kolom TANGGAL/WAKTU
        ws.mergeCells(curRow, 1, curRow, totalCols);
        const mainTitle = ws.getCell(curRow, 1);
        mainTitle.value = `DOKUMEN DIAGNOSTIK: ${plcName}  |  DATABASE: ${targetDB}`;
        mainTitle.font  = { bold: true, size: 13, color: { argb: COLOR.headerFont }, name: 'Arial' };
        mainTitle.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.headerBg } };
        mainTitle.alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getRow(curRow).height = 28;
        curRow++;

        // ── BARIS META ──
        const metaData: [string, string][] = [
          ['Rentang Laporan', `${startDate} s/d ${endDate}`],
          ['Resolusi Data',   intervalLabel], // MENAMPILKAN RESOLUSI DI HEADER TABEL
          ['Dicetak Oleh',    exporterName],
          ['Tanggal Cetak',   formattedDate],
          ['Total Rekaman',   `${rowsTabelLog.length.toLocaleString('id-ID')} baris data setelah pemfilteran interval`],
          ['Status Sistem',   `${healthLabel}  (Uptime: ${uptimePercentage}%)`],
        ];
        metaData.forEach(([label, val]) => {
          ws.mergeCells(curRow, 1, curRow, 2);
          ws.mergeCells(curRow, 3, curRow, totalCols);
          const lCell = ws.getCell(curRow, 1);
          const vCell = ws.getCell(curRow, 3);
          lCell.value = label;
          lCell.font  = { bold: true, name: 'Arial', size: 9, color: { argb: COLOR.accentBlue } };
          lCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.subHeaderBg } };
          lCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
          vCell.value = val;
          vCell.font  = { name: 'Arial', size: 9 };
          vCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
          // warnai status
          if (label === 'Status Sistem') {
            vCell.font = { bold: true, name: 'Arial', size: 9, color: { argb: healthColor } };
          }
          applyBorderAll(ws, curRow, 1, totalCols);
          ws.getRow(curRow).height = 18;
          curRow++;
        });
        curRow++; // spasi

        // =========================================================================
        // ── SEKSI 1: STATISTIK PARAMETER ──
        // =========================================================================
        ws.mergeCells(curRow, 1, curRow, totalCols);
        styleHeaderCell(ws.getCell(curRow, 1), '1.  STATISTIK KESELURUHAN (RATA-RATA, MIN, MAX)');
        ws.getRow(curRow).height = 20;
        curRow++;

        // Header tabel statistik
        const statHeaders = ['PARAMETER', 'RATA-RATA KESELURUHAN', 'MINIMUM', 'MAKSIMUM'];
        ws.mergeCells(curRow, 1, curRow, Math.ceil(totalCols / 4));
        statHeaders.forEach((h, ci) => {
          styleHeaderCell(ws.getCell(curRow, ci + 1), h, COLOR.subHeaderBg, COLOR.subHeaderFnt);
        });
        ws.getRow(curRow).height = 20;
        curRow++;

        detectedKeys.forEach((key: string, idx: number) => {
          const avg = totalLogs > 0 ? applySmartScale(Number(paramAvgRows[0][`avg_${key}`]) || 0) : 0;
          const min = totalLogs > 0 ? applySmartScale(Number(paramAvgRows[0][`min_${key}`]) || 0) : 0;
          const max = totalLogs > 0 ? applySmartScale(Number(paramAvgRows[0][`max_${key}`]) || 0) : 0;
          const isEven = idx % 2 === 0;
          styleDataCell(ws.getCell(curRow, 1), key.toUpperCase(), isEven, 'left');
          styleDataCell(ws.getCell(curRow, 2), Number(avg.toFixed(2)), isEven, 'right');
          styleDataCell(ws.getCell(curRow, 3), Number(min.toFixed(2)), isEven, 'right');
          styleDataCell(ws.getCell(curRow, 4), Number(max.toFixed(2)), isEven, 'right');
          ws.getCell(curRow, 2).numFmt = '#,##0.00';
          ws.getCell(curRow, 3).numFmt = '#,##0.00';
          ws.getCell(curRow, 4).numFmt = '#,##0.00';
          ws.getRow(curRow).height = 16;
          curRow++;
        });
        curRow++;

        // =========================================================================
        // ── SEKSI 2: DATA LOGGING SESUAI INTERVAL ──
        // =========================================================================
        ws.mergeCells(curRow, 1, curRow, totalCols);
        styleHeaderCell(ws.getCell(curRow, 1), `2.  TABEL LOGGING PARAMETER  —  ${intervalLabel.toUpperCase()}`);
        ws.getRow(curRow).height = 20;
        curRow++;

        // Header tabel logging
        styleHeaderCell(ws.getCell(curRow, 1), 'WAKTU / TIMESTAMP', COLOR.subHeaderBg, COLOR.subHeaderFnt);
        detectedKeys.forEach((key: string, ci: number) => {
          styleHeaderCell(ws.getCell(curRow, ci + 2), key.toUpperCase(), COLOR.subHeaderBg, COLOR.subHeaderFnt);
        });
        ws.getRow(curRow).height = 20;
        curRow++;

        if (rowsTabelLog.length === 0) {
          ws.mergeCells(curRow, 1, curRow, totalCols);
          const emptyCell = ws.getCell(curRow, 1);
          emptyCell.value = 'Tidak ada data pada rentang waktu ini.';
          emptyCell.font  = { italic: true, color: { argb: COLOR.gray }, name: 'Arial', size: 9 };
          emptyCell.alignment = { horizontal: 'center', vertical: 'middle' };
          ws.getRow(curRow).height = 18;
          curRow++;
        } else {
          rowsTabelLog.forEach((r: any, idx: number) => {
            const isEven = idx % 2 === 0;
            styleDataCell(ws.getCell(curRow, 1), r.waktu, isEven, 'left');
            detectedKeys.forEach((key: string, ci: number) => {
              const val = Number(applySmartScale(Number(r[key]) || 0).toFixed(2));
              const cell = ws.getCell(curRow, ci + 2);
              styleDataCell(cell, val, isEven, 'right');
              cell.numFmt = '#,##0.00';
            });
            ws.getRow(curRow).height = 16;
            curRow++;
          });

          // Baris TOTAL / RATA-RATA keseluruhan di bawah tabel
          curRow++;
          const totLabel = ws.getCell(curRow, 1);
          totLabel.value = 'RATA-RATA DARI TABEL INI';
          totLabel.font  = { bold: true, name: 'Arial', size: 9, color: { argb: COLOR.headerFont } };
          totLabel.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.headerBg } };
          totLabel.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
          applyBorderAll(ws, curRow, 1, totalCols);

          detectedKeys.forEach((_: string, ci: number) => {
            const dataStartRow = curRow - rowsTabelLog.length - 1; // baris data pertama
            const colLetter    = String.fromCharCode(65 + ci + 1); // B, C, D, ...
            const formula      = `=IFERROR(AVERAGE(${colLetter}${dataStartRow}:${colLetter}${curRow - 2}),0)`;
            const cell         = ws.getCell(curRow, ci + 2);
            cell.value  = { formula, result: undefined } as any;
            cell.numFmt = '#,##0.00';
            cell.font   = { bold: true, name: 'Arial', size: 9, color: { argb: COLOR.headerFont } };
            cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.headerBg } };
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            applyBorderAll(ws, curRow, ci + 2, ci + 2);
          });
          ws.getRow(curRow).height = 18;
          curRow++;
        }
        curRow++;

        // =========================================================================
        // ── SEKSI 3: LOG DOWNTIME / ANOMALI ──
        // =========================================================================
        ws.mergeCells(curRow, 1, curRow, totalCols);
        styleHeaderCell(ws.getCell(curRow, 1), '3.  REKAMAN LOG DOWNTIME  /  ANOMALI', COLOR.red, COLOR.headerFont);
        ws.getRow(curRow).height = 20;
        curRow++;

        // Header
        const dtHeaders = ['NO', 'WAKTU KEJADIAN', 'KETERANGAN / DURASI', 'STATUS'];
        dtHeaders.forEach((h, ci) => {
          styleHeaderCell(ws.getCell(curRow, ci + 1), h, COLOR.subHeaderBg, COLOR.subHeaderFnt);
        });
        ws.getRow(curRow).height = 20;
        curRow++;

        if (localAlerts.length === 0) {
          ws.mergeCells(curRow, 1, curRow, 4);
          const okCell = ws.getCell(curRow, 1);
          okCell.value = '✅  Sistem Berjalan Normal. Tidak ada log anomali downtime terdeteksi.';
          okCell.font  = { bold: true, name: 'Arial', size: 9, color: { argb: COLOR.green } };
          okCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0FDF4' } };
          okCell.alignment = { horizontal: 'center', vertical: 'middle' };
          applyBorderAll(ws, curRow, 1, 4);
          ws.getRow(curRow).height = 18;
          curRow++;
        } else {
          localAlerts.slice(0, 100).forEach((a: any, idx: number) => {
            const isEven = idx % 2 === 0;
            styleDataCell(ws.getCell(curRow, 1), idx + 1, isEven, 'center');
            styleDataCell(ws.getCell(curRow, 2), a.waktu, isEven, 'left');
            styleDataCell(ws.getCell(curRow, 3), a.data,  isEven, 'left');
            const stCell = ws.getCell(curRow, 4);
            stCell.value = 'OFFLINE';
            stCell.font  = { bold: true, name: 'Arial', size: 9, color: { argb: COLOR.red } };
            stCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.offlineBg } };
            stCell.alignment = { horizontal: 'center', vertical: 'middle' };
            applyBorderAll(ws, curRow, 1, 4);
            ws.getRow(curRow).height = 18;
            curRow++;
          });
        }

        // ─── SET LEBAR KOLOM ───
        ws.getColumn(1).width = 24; // Tanggal / Waktu
        detectedKeys.forEach((_: string, ci: number) => {
          ws.getColumn(ci + 2).width = Math.max(15, detectedKeys[ci].length + 4);
        });

        // ─── FREEZE PANE (BEKUKAN HEADER WAKTU SCROLL) ───
        ws.views = [{ state: 'frozen', ySplit: 1, xSplit: 0 }];

      } catch (tableError) {
        console.error(`Gagal memproses Excel untuk tabel ${currentTable}:`, tableError);
      }
    } // end loop tabel

    // ─── KIRIM FILE ───
    const buffer = await wb.xlsx.writeBuffer();
    const filename = `REPORT_${startDate}_${endDate}_${Date.now()}.xlsx`;

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('❌ [EXCEL EXPORT FATAL ERROR]:', error);
    return NextResponse.json({ error: 'Gagal Generate Excel', details: String(error) }, { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}
