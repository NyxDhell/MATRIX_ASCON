import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');
  const action = searchParams.get('action');

  if (!username || !action) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  try {
    if (action === 'accept') {
      await prisma.dashboardUser.update({
        where: { username },
        data: { status: 'ACTIVE' }
      });
      return NextResponse.json({ success: true });
    } else {
      await prisma.dashboardUser.delete({ where: { username } });
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}