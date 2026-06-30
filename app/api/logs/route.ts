import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

async function getDbConfig() {
  const envUrl = process.env.DATABASE_URL || "";
  const hostMatch = envUrl.match(/@([^:\/]+)/); 
  const dynamicHost = hostMatch ? hostMatch[1] : 'localhost';
  
  const cookieStore = await cookies();
  const targetDB = cookieStore.get('matrix_active_db')?.value || 'plc_database';
  
  return { 
    host: dynamicHost, 
    port: 3306, 
    user: 'root', 
    password: 'rahasia123', 
    database: targetDB 
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.plcId || !body.sensorData) return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });

    const cookieStore = await cookies();
    const targetTable = cookieStore.get('matrix_active_table')?.value || 'plc_data_logs';

    const connection = await mysql.createConnection(await getDbConfig());
    const [result]: any = await connection.execute(
      `INSERT INTO \`${targetTable}\` (plc_name, tag_value) VALUES (?, ?)`,
      [body.plcName || "Unknown PLC", JSON.stringify(body.sensorData)]
    );
    await connection.end();
    return NextResponse.json({ success: true, id: result.insertId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const targetTable = cookieStore.get('matrix_active_table')?.value || 'plc_data_logs';
    const timeCol     = cookieStore.get('matrix_time_col')?.value || 'timestamp';

    const connection = await mysql.createConnection(await getDbConfig());
    // Baca dinamis dari tabel yang disetting user
    const [rows] = await connection.execute(
      `SELECT * FROM \`${targetTable}\` ORDER BY \`${timeCol}\` DESC LIMIT 100`
    );
    await connection.end();
    return NextResponse.json((rows as any[]).reverse());
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
