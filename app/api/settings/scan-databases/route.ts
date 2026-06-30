import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET() {
  try {
    // 1. Ambil URL utuh dari .env
    const envUrl = process.env.DATABASE_URL || "";
    
    // 2. Potong nama database di belakangnya secara otomatis menggunakan Regex
    // Contoh: "mysql://root:@localhost:3306/plc_database" menjadi "mysql://root:@localhost:3306"
    const baseUrlMatch = envUrl.match(/^(mysql:\/\/[^/]+)/);
    const baseUrl = baseUrlMatch ? baseUrlMatch[1] : "mysql://root:rahasia123@localhost:3306";

    // 3. Lakukan koneksi ke server MySQL tanpa masuk ke database spesifik
    const connection = await mysql.createConnection(baseUrl);
    
    // 4. Ambil daftar semua database
    const [rows]: any = await connection.execute('SHOW DATABASES');
    await connection.end();

    // 5. Saring database bawaan sistem agar tidak muncul di UI
    const dbList = rows
      .map((row: any) => row.Database)
      .filter((dbName: string) => 
        !['information_schema', 'mysql', 'performance_schema', 'sys', 'phpmyadmin'].includes(dbName)
      );

    return NextResponse.json({ success: true, databases: dbList });
  } catch (error) {
    console.error("Gagal scan DB:", error);
    return NextResponse.json({ error: "Gagal memindai database" }, { status: 500 });
  }
}
