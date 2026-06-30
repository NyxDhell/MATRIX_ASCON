import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dbName = searchParams.get('db');
  const tableName = searchParams.get('table');

  if (!dbName || !tableName) {
    return NextResponse.json({ error: "Parameter db atau table tidak lengkap" }, { status: 400 });
  }

  try {
    // KONEKSI AMAN: Menggunakan format Object
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'rahasia123',
      database: dbName // <-- DB Target
    });
    
    // Jalankan perintah SHOW COLUMNS menggunakan Backticks (`) agar aman dari spasi
    const [rows]: any = await connection.execute(`SHOW COLUMNS FROM \`${tableName}\``);
    await connection.end();

    // Petakan kolom menjadi object berisi nama field dan tipe datanya
    const columns = rows.map((col: any) => ({
      field: col.Field,
      type: col.Type.toUpperCase()
    }));

    return NextResponse.json({ success: true, columns });
  } catch (error: any) {
    console.error("🔥 Gagal di API scan-columns:", error);
    return NextResponse.json({ error: "Gagal memindai kolom tabel", details: error.message }, { status: 500 });
  }
}
