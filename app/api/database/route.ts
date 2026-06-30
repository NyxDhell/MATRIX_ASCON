import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const envUrl = process.env.DATABASE_URL || "";
// Regex ini bertugas mengambil IP VPN (teks setelah simbol '@' dan sebelum ':')
const hostMatch = envUrl.match(/@([^:\/]+)/); 
const dynamicHost = hostMatch ? hostMatch[1] : 'localhost';
const dbConfig = { 
  host: dynamicHost, // <-- Sekarang otomatis jadi '10.242.215.145' atau 'localhost' sesuai .env
  port: 3306, 
  user: 'root', 
  password: 'rahasia123', 
  database: 'plc_database' 
};

const generateId = () => 'cmo' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const table = searchParams.get('table');

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);

    if (action === 'tables') {
      const [rows] = await connection.execute('SHOW TABLES');
      const tables = (rows as any[])
        .map(row => Object.values(row)[0] as string)
        .filter(t => t !== '_prisma_migrations'); 
      return NextResponse.json(tables);
    }

    if (action === 'columns' && table) {
      const [rows] = await connection.execute(`SHOW COLUMNS FROM \`${table}\``);
      return NextResponse.json(rows);
    }

    if (action === 'data' && table) {
      try {
        const [rows] = await connection.execute(`SELECT * FROM \`${table}\` ORDER BY createdAt DESC LIMIT 150`);
        return NextResponse.json(rows);
      } catch (e) {
        try {
          const [rows] = await connection.execute(`SELECT * FROM \`${table}\` ORDER BY id DESC LIMIT 150`);
          return NextResponse.json(rows);
        } catch (err) {
          const [rows] = await connection.execute(`SELECT * FROM \`${table}\` LIMIT 150`);
          return NextResponse.json(rows);
        }
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}

export async function POST(req: Request) {
  let connection;
  try {
    const body = await req.json();
    connection = await mysql.createConnection(dbConfig);

    // ========================================================
    // FITUR BARU: EKSEKUSI RAW SQL QUERY
    // ========================================================
    if (body.action === 'raw_query') {
      // Menggunakan .query() bukan .execute() agar support semua jenis SQL String mentah
      const [result] = await connection.query(body.query);
      return NextResponse.json({ success: true, data: result });
    }

    // ========================================================
    // INSERT DATA DARI GUI MODE
    // ========================================================
    const { table, data } = body;
    if (!data.id) data.id = generateId();
    if (!data.createdAt) data.createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(',');
    const sql = `INSERT INTO \`${table}\` (${keys.map(k => `\`${k}\``).join(',')}) VALUES (${placeholders})`;

    await connection.execute(sql, values as any[]);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}

export async function PUT(req: Request) {
  let connection;
  try {
    const { table, id, data } = await req.json();
    connection = await mysql.createConnection(dbConfig);

    if (data.updatedAt) data.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const keys = Object.keys(data);
    const values = Object.values(data);
    const updates = keys.map(k => `\`${k}\` = ?`).join(',');
    
    const sql = `UPDATE \`${table}\` SET ${updates} WHERE id = ?`;
    await connection.execute(sql, [...values, id] as any[]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}

export async function DELETE(req: Request) {
  let connection;
  try {
    const { searchParams } = new URL(req.url);
    const table = searchParams.get('table');
    const id = searchParams.get('id');
    
    connection = await mysql.createConnection(dbConfig);
    await connection.execute(`DELETE FROM \`${table}\` WHERE id = ?`, [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}
