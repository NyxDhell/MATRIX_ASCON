import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Mengambil data user saat halaman Account dibuka
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');

    if (!username) return NextResponse.json({ error: "Username kosong" }, { status: 400 });

    const user = await prisma.dashboardUser.findFirst({
      where: { username: username }
    });

    if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Menyimpan data profile baru dari halaman Account ke Database
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { username, name, email, jobRole, photo } = body;

    if (!username) return NextResponse.json({ error: "Akses ditolak" }, { status: 400 });

    const updatedUser = await prisma.dashboardUser.update({
      where: { username: username },
      data: { name, email, jobRole, photo }
    });

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error: any) {
    return NextResponse.json({ error: "Gagal menyimpan ke database" }, { status: 500 });
  }
}