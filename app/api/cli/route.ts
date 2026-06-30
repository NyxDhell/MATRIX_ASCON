import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Kita paksa PrismaClient menjadi tipe 'any' agar TypeScript berhenti protes 
// tentang properti 'plc' yang dianggap tidak ada.
const prisma = new PrismaClient() as any;

export async function POST(req: Request) {
  try {
    const { command } = await req.json();
    const args = command.trim().split(' ');
    const action = args[0].toLowerCase();

    // PERINTAH: list-nodes
    if (action === 'list-nodes') {
      // Mengambil data dari tabel plc
      const allNodes = await prisma.plc.findMany();
      
      if (allNodes.length === 0) {
        return NextResponse.json({ output: 'Database kosong.' });
      }

      const tableHeader = "IP ADDRESS      | NAMA MESIN          | LOKASI\n" + "=".repeat(50);
      const rows = allNodes.map((n: any) => 
        `${n.ip_address.padEnd(15)} | ${n.nama_mesin.padEnd(18)} | ${n.lokasi}`
      ).join('\n');

      return NextResponse.json({ output: `${tableHeader}\n${rows}` });
    }

    // PERINTAH: add-node --name "xxx" --ip "xxx" --loc "xxx"
    if (action === 'add-node') {
      const name = command.match(/--name "([^"]+)"/)?.[1];
      const ip = command.match(/--ip "([^"]+)"/)?.[1];
      const loc = command.match(/--loc "([^"]+)"/)?.[1] || "Unset";

      if (!name || !ip) {
        return NextResponse.json({ 
          output: '❌ ERROR: Parameter --name dan --ip wajib ada.\nContoh: add-node --name "PLC-01" --ip "192.168.1.10"' 
        });
      }

      // Input ke database MySQL
      const newNode = await prisma.plc.create({
        data: {
          nama_mesin: name,
          ip_address: ip,
          lokasi: loc,
          tipe_plc: "Generic Modbus",
          status: "Offline",
          parameters: [] 
        }
      });

      return NextResponse.json({ 
        output: `✅ SUCCESS: Node [${newNode.nama_mesin}] ditambahkan ke database.` 
      });
    }

    // PERINTAH: help
    if (action === 'help') {
      return NextResponse.json({ 
        output: "ASCON CLI ENGINE\n" +
                "list-nodes : Lihat semua node\n" +
                "add-node   : Tambah node (--name, --ip, --loc)\n" +
                "clear      : Bersihkan layar" 
      });
    }

    return NextResponse.json({ output: `bash: ${action}: command not found` });

  } catch (error: any) {
    return NextResponse.json({ output: `🚨 ERROR: ${error.message}` }, { status: 500 });
  }
}