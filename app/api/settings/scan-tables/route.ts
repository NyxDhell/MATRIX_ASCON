    import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dbName = searchParams.get('db');

  if (!dbName) {
    return NextResponse.json({ error: "Database tidak disebutkan" }, { status: 400 });
  }

  try {
    // KONEKSI AMAN: Menggunakan format Object agar tidak ada error parsing URL
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'rahasia123',
      database: dbName // <-- Langsung tembak ke DB yang dipilih
    });
    
    // Ambil daftar tabel
    const [rows]: any = await connection.execute('SHOW TABLES');
    await connection.end();

    // Ekstrak nama tabel dari hasil query (Object key dinamis)
    const tables = rows.map((row: any) => Object.values(row)[0]);

    return NextResponse.json({ success: true, tables });
  } catch (error: any) {
    console.error("🔥 Gagal di API scan-tables:", error);
    return NextResponse.json({ error: "Gagal memindai tabel", details: error.message }, { status: 500 });
  }
}
