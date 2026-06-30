import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Menarik 50 data alarm terbaru dari database asli
    const alarms = await prisma.alarm.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return NextResponse.json(alarms);
  } catch (error) {
    return NextResponse.json({ error: "Gagal memuat alarm dari database" }, { status: 500 });
  }
}