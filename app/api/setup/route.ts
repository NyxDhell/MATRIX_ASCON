import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Inject Akun Superadmin
    const superadmin = await prisma.user.upsert({
      where: { username: 'superadmin' },
      update: {}, // Jika sudah ada, biarkan saja
      create: {
        username: 'superadmin',
        password: 'super123',
        name: 'Main Controller',
        role: 'superadmin',
        status: 'APPROVED' // Superadmin langsung di-ACC
      }
    });

    // 2. Inject Akun Admin Default (untuk testing)
    const admin = await prisma.user.upsert({
      where: { username: 'admin' },
      update: {}, 
      create: {
        username: 'admin',
        password: 'admin123',
        name: 'Administrator IT',
        role: 'admin',
        status: 'APPROVED' // Admin bawaan juga langsung di-ACC
      }
    });

    return NextResponse.json({ 
      message: "✅ BERHASIL: Akun Superadmin & Admin berhasil di-inject ke MySQL!", 
      accounts: { 
        superadmin: superadmin.username, 
        admin: admin.username 
      } 
    });

  } catch (error: any) {
    console.error("❌ SETUP ERROR:", error.message);
    return NextResponse.json({ error: "Gagal inject database: " + error.message }, { status: 500 });
  }
}