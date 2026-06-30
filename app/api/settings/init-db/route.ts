import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function POST(req: Request) {
  try {
    const { targetDb } = await req.json();

    if (!targetDb) {
      return NextResponse.json({ error: "Target database tidak disertakan" }, { status: 400 });
    }

    // 1. Ambil info base URL server dari .env untuk mengekstrak kredensial host
    const envUrl = process.env.DATABASE_URL || "";
    const baseUrlMatch = envUrl.match(/^(mysql:\/\/[^/]+)/);
    const baseUrl = baseUrlMatch ? baseUrlMatch[1] : "mysql://root:rahasia123@localhost:3306";

    // 2. Lakukan koneksi ke server MySQL tanpa masuk ke database spesifik terlebih dahulu
    const connection = await mysql.createConnection(baseUrl);

    // 3. Arahkan koneksi ke database target yang dipilih oleh user di halaman Settings
    await connection.query(`USE \`${targetDb}\``);

    // 4. Kumpulan Query SQL untuk membangun struktur tabel SCADA Matrix secara otomatis jika belum ada
    // Menggunakan CREATE TABLE IF NOT EXISTS agar aman dan tidak menimpa data yang sudah ada
    const initQueries = [
      `CREATE TABLE IF NOT EXISTS \`plc_config\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`plc_name\` VARCHAR(255),
        \`ip_address\` VARCHAR(255),
        \`port\` INT DEFAULT 502,
        \`endpoint_url\` VARCHAR(255),
        \`tags_json\` LONGTEXT,
        \`status\` VARCHAR(50) DEFAULT 'active',
        \`updatedAt\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS \`plc_data_logs\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`plc_name\` VARCHAR(255),
        \`tag_name\` VARCHAR(255),
        \`tag_value\` FLOAT,
        \`status_code\` VARCHAR(50) DEFAULT 'Good',
        \`timestamp\` DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS \`plc_data_realtime\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`plc_name\` VARCHAR(255),
        \`tag_name\` VARCHAR(255),
        \`tag_value\` FLOAT,
        \`lastUpdated\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`
    ];

    // 5. Eksekusi semua query pembuatan tabel satu per satu secara berurutan
    for (const query of initQueries) {
      await connection.execute(query);
    }

    // Pastikan koneksi selalu ditutup setelah proses selesai agar tidak membebani memori XAMPP
    await connection.end();

    return NextResponse.json({ 
      success: true, 
      message: `Struktur tabel monitoring berhasil disinkronkan di database: ${targetDb}` 
    });

  } catch (error: any) {
    console.error("🔥 Gagal Inisialisasi DB Klien:", error);
    return NextResponse.json({ 
      error: "Gagal membangun struktur tabel di database target.",
      details: error.message 
    }, { status: 500 });
  }
}
