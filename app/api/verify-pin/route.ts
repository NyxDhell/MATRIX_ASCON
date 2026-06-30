import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { username, pin } = await req.json();

    const user = await prisma.dashboardUser.findFirst({
      where: { username }
    });

    // PERBAIKAN: Menambahkan (user as any) agar TypeScript berhenti protes
    // karena cache VS Code yang belum membaca update schema terbaru.
    if (!user || (user as any).securityPin !== pin) {
      return NextResponse.json({ error: "PIN Keamanan Salah!" }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}