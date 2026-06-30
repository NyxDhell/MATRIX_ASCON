import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// [READ] Mengambil semua data user
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: "Gagal mengambil data database." }, { status: 500 });
  }
}

// [CREATE] Menambah user baru
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const newUser = await prisma.user.create({
      data: {
        username: body.username,
        password: body.password,
        name: body.name,
        role: body.role || 'admin',
        status: body.status || 'APPROVED'
      }
    });
    return NextResponse.json(newUser);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal menambah data. Username mungkin sudah ada." }, { status: 500 });
  }
}

// [UPDATE] Mengubah data user
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, ...updateData } = body;
    
    if (!id) return NextResponse.json({ error: "ID tidak ditemukan" }, { status: 400 });

    const updatedUser = await prisma.user.update({
      where: { id: id },
      data: updateData
    });
    return NextResponse.json(updatedUser);
  } catch (error) {
    return NextResponse.json({ error: "Gagal mengupdate data." }, { status: 500 });
  }
}

// [DELETE] Menghapus data user
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: "ID tidak ditemukan" }, { status: 400 });

    await prisma.user.delete({
      where: { id: id }
    });
    return NextResponse.json({ success: true, message: "Berhasil dihapus" });
  } catch (error) {
    return NextResponse.json({ error: "Gagal menghapus data." }, { status: 500 });
  }
}