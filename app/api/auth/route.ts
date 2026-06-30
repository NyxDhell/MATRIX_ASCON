import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body;

    console.log(`Mencoba login dengan username: ${username}`);

    // Cek apakah konektor Prisma siap
    if (!prisma) {
      throw new Error("Prisma Client tidak ditemukan/koneksi database mati.");
    }

    // PERBAIKAN: Gunakan dashboardUser sesuai dengan nama model di schema.prisma
    const user = await prisma.dashboardUser.findFirst({
      where: { username: username }
    });

    if (!user) {
      console.log("❌ User tidak ditemukan di database.");
      return NextResponse.json({ error: "Username tidak ditemukan!" }, { status: 401 });
    }

    // Pengecekan password
    if (user.password !== password) {
      console.log("❌ Password salah.");
      return NextResponse.json({ error: "Password salah!" }, { status: 401 });
    }

    console.log("✅ Login Berhasil!");
    return NextResponse.json({ 
      success: true, 
      user: { name: user.name || user.username, role: user.role } 
    });

  } catch (error: any) {
    console.error("🔥 SERVER CRASH (AUTH):", error.message); 
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}