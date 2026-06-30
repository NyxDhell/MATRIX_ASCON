import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { cookies } from 'next/headers';

// Fungsi helper agar dinamis membaca database dari Cookies Settings
async function getDbConfig() {
  const envUrl = process.env.DATABASE_URL || "";
  const hostMatch = envUrl.match(/@([^:\/]+)/); 
  const dynamicHost = hostMatch ? hostMatch[1] : 'localhost';
  
  const cookieStore = await cookies();
  const targetDB = cookieStore.get('matrix_active_db')?.value || 'plc_database'; // Membaca Cookie
  
  return { 
    host: dynamicHost, 
    port: 3306, 
    user: 'root', 
    password: 'rahasia123', 
    database: targetDB 
  };
}

export async function GET() {
  try {
    const connection = await mysql.createConnection(await getDbConfig());
    const [rows] = await connection.execute('SELECT * FROM plc_config ORDER BY updatedAt DESC');
    await connection.end();
    return NextResponse.json(rows);
  } catch (error: any) {
    return NextResponse.json({ error: 'Gagal mengambil data config' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { plc_name, endpoint_url, auth_type, username, password, tags } = body;
    const connection = await mysql.createConnection(await getDbConfig());
    const tagsJson = JSON.stringify(tags);

    const query = `
      INSERT INTO plc_config (plc_name, endpoint_url, auth_type, username, password, tags_json, status) 
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `;
    
    await connection.execute(query, [plc_name, endpoint_url, auth_type, username, password, tagsJson]);
    await connection.end();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Gagal menyimpan config' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID tidak ditemukan' }, { status: 400 });

    const connection = await mysql.createConnection(await getDbConfig());
    await connection.execute('DELETE FROM plc_config WHERE id = ?', [id]);
    await connection.end();

    return NextResponse.json({ success: true, message: 'Berhasil dihapus' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Gagal menghapus data' }, { status: 500 });
  }
}
