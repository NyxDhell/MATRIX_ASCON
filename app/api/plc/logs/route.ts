import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mysql from 'mysql2/promise';

export async function GET(req: Request) {
  try {
    // 1. PERBAIKAN: Tambahkan 'await' di depan cookies() untuk Next.js terbaru
    const cookieStore = await cookies();
    
    // 2. Ambil nama Database, Tabel, dan Kolom parameter aktif dari Cookie Browser
    const activeDb = cookieStore.get('matrix_active_db')?.value || 'plc_database';
    const activeTable = cookieStore.get('matrix_active_table')?.value || 'plc_data_logs';
    const timeCol = cookieStore.get('matrix_time_col')?.value;
    const valueCol = cookieStore.get('matrix_value_col')?.value;

    // Proteksi: Jika user belum memetakan kolom di halaman settings, cegah crash
    if (!timeCol || !valueCol) {
      return NextResponse.json({ 
        success: false, 
        error: "Konfigurasi parameter kolom (Mapping) belum diset di halaman Settings!" 
      }, { status: 400 });
    }

    // 3. Ambil info base URL server dari .env untuk mengekstrak kredensial host
    const envUrl = process.env.DATABASE_URL || "";
    const baseUrlMatch = envUrl.match(/^(mysql:\/\/[^/]+)/);
    const baseUrl = baseUrlMatch ? baseUrlMatch[1] : "mysql://root:rahasia123@localhost:3306";

    // 4. Buat koneksi dinamis menggunakan mysql2 langsung ke database yang sedang aktif terpilih
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'rahasia123',
      database: activeDb // <-- Mengarah ke DB Klien pilihan dari settings
    });

    // 5. Baca parameter filter batas limit baris data dari URL
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 500;
    
    // 6. PENERAPAN ALIASING SECARA DINAMIS
    const dynamicQuery = `
      SELECT 
        \`${timeCol}\` AS timestamp, 
        \`${valueCol}\` AS tag_value 
      FROM \`${activeTable}\` 
      ORDER BY \`${timeCol}\` DESC 
      LIMIT ?
    `;

    // 7. Eksekusi query dinamis ke Database Klien
    const [rows] = await connection.execute(dynamicQuery, [limit]);
    
    // Pastikan koneksi selalu ditutup kembali agar server XAMPP tidak overload
    await connection.end();

    return NextResponse.json({ 
      success: true, 
      meta: {
        databaseInUse: activeDb,
        tableInUse: activeTable,
        mappedTimeColumn: timeCol,
        mappedValueColumn: valueCol
      },
      data: rows 
    });

  } catch (error: any) {
    console.error("🔥 Gagal memuat log dengan skema dinamis:", error);
    return NextResponse.json({ 
      error: "Gagal memproses query data PLC. Periksa kesesuaian tabel di halaman Settings.",
      details: error.message 
    }, { status: 500 });
  }
}