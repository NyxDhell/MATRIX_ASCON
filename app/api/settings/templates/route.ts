import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export const dynamic = 'force-dynamic';

async function getDb() {
  const envUrl = process.env.DATABASE_URL || "";
  const hostMatch = envUrl.match(/@([^:\/]+)/);
  const dynamicHost = hostMatch ? hostMatch[1] : 'localhost';
  return await mysql.createConnection({ host: dynamicHost, port: 3306, user: 'root', password: 'rahasia123', database: 'plc_database' });
}

export async function GET(req: Request) {
  let connection;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    connection = await getDb();

    if (id) {
      const [rows]: any = await connection.execute('SELECT * FROM pdf_templates WHERE id = ?', [id]);
      return NextResponse.json({ success: true, data: rows[0] });
    } else {
      // Jika tidak ada ID, ambil semua data untuk tabel list (kecuali gambar agar load cepat)
      const [rows]: any = await connection.execute('SELECT id, nama_perusahaan FROM pdf_templates ORDER BY id DESC');
      return NextResponse.json({ success: true, data: rows });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}

export async function POST(req: Request) {
  let connection;
  try {
    const body = await req.json();
    connection = await getDb();

    if (body.action === 'delete') {
      await connection.execute('DELETE FROM pdf_templates WHERE id = ?', [body.id]);
      return NextResponse.json({ success: true });
    }

    if (body.id === 'new') {
       await connection.execute('INSERT INTO pdf_templates (nama_perusahaan, kop_base64, cover_base64) VALUES (?, ?, ?)', [body.nama_perusahaan, body.kop_base64, body.cover_base64]);
    } else {
       await connection.execute('UPDATE pdf_templates SET nama_perusahaan = ?, kop_base64 = ?, cover_base64 = ? WHERE id = ?', [body.nama_perusahaan, body.kop_base64, body.cover_base64, body.id]);
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}