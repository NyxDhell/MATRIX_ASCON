import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// (READ) MENGAMBIL PIN DARI DATABASE
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');

  if (!username) return NextResponse.json({ error: "Username kosong" }, { status: 400 });

  try {
    const user = await prisma.dashboardUser.findFirst({
      where: { username }
    });

    // Menggunakan as any untuk bypass cache VS Code
    return NextResponse.json({ success: true, pin: (user as any)?.securityPin || '' });
  } catch (error) {
    return NextResponse.json({ error: "Gagal mengambil data PIN dari Database" }, { status: 500 });
  }
}

// (UPDATE) MENYIMPAN PIN BARU KE DATABASE
export async function PUT(req: Request) {
  try {
    const { username, pin } = await req.json();

    if (!username || !pin) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    await prisma.dashboardUser.update({
      where: { username },
      data: { securityPin: pin } as any // Update nilai securityPin
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Gagal mengupdate PIN ke Database" }, { status: 500 });
  }
}