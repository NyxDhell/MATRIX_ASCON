import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const plcs = await prisma.plcNode.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(plcs);
  } catch (error) {
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const newPlc = await prisma.plcNode.create({ data });
    return NextResponse.json(newPlc);
  } catch (error: any) {
    // Ini akan memunculkan error warna merah sedetail mungkin di terminal VS Code
    console.error("ERROR DATABASE:", error); 
    
    // Ini akan mengirimkan error aslinya ke popup browser
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: "ID dibutuhkan" }, { status: 400 });
    
    await prisma.plcNode.delete({ where: { id } });
    return NextResponse.json({ message: "Berhasil dihapus" });
  } catch (error) {
    return NextResponse.json({ error: "Gagal menghapus data" }, { status: 500 });
  }
}

// Tambahkan fungsi ini di app/api/plc/route.ts

export async function PUT(req: Request) {
  try {
    const data = await req.json();
    const { id, ...updateData } = data;

    // Pastikan port dikonversi ke angka jika dari form dikirim sebagai string
    if (updateData.port) {
      updateData.port = parseInt(updateData.port);
    }

    const updatedPlc = await prisma.plcNode.update({
      where: { id: id },
      data: updateData,
    });
    
    return NextResponse.json(updatedPlc);
  } catch (error: any) {
    console.error("ERROR UPDATE:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}