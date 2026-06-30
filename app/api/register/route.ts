import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password, name, phone, department, pin } = body;

    // 1. Cek apakah username sudah ada
    const existingUser = await prisma.dashboardUser.findUnique({ where: { username } });
    if (existingUser) return NextResponse.json({ error: "Username sudah digunakan!" }, { status: 400 });

    // 2. Proses Simpan ke Database
    await prisma.dashboardUser.create({
      data: {
        username, 
        password, 
        name, 
        phone, 
        department, 
        jobRole: department, 
        securityPin: pin, 
        role: 'Operator', 
        status: 'PENDING'
      }
    });

    console.log("✅ Data user berhasil disimpan ke Database!");

    // 3. Proses Kirim Email (Dibungkus try-catch terpisah agar tidak merusak registrasi jika gagal)
    try {
      if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
         console.warn("⚠️ Peringatan: SMTP_EMAIL atau SMTP_PASSWORD di .env kosong. Email tidak dikirim.");
      } else {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { 
            user: process.env.SMTP_EMAIL, 
            pass: process.env.SMTP_PASSWORD.replace(/\s/g, '') // Otomatis menghapus spasi jika ada
          }
        });

        const superadmins = process.env.SUPERADMIN_EMAILS || process.env.SMTP_EMAIL;
        
        // PERBAIKAN: Mengambil host/IP secara dinamis dari request browser user (Nilam/Fadhel)
        // Jika gagal membaca, akan fallback ke IP VPN sebagai cadangan
        const host = req.headers.get('host') || '10.242.215.145:3000';
        const baseURL = `http://${host}`; 

        await transporter.sendMail({
          from: `"Matrix SCADA System" <${process.env.SMTP_EMAIL}>`,
          to: superadmins,
          subject: `🚨 Permintaan Akses Engineer Baru: ${name}`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
              <h2 style="color: #2A6C7A;">Permintaan Akses Baru</h2>
              <p>Seorang Engineer baru meminta akses ke Matrix Dashboard:</p>
              <ul>
                <li><strong>Nama:</strong> ${name}</li>
                <li><strong>Divisi:</strong> ${department}</li>
                <li><strong>No HP:</strong> ${phone}</li>
                <li><strong>Username:</strong> ${username}</li>
              </ul>
              <div style="margin-top: 20px; display: flex; gap: 10px;">
                <a href="${baseURL}/api/approve?username=${username}&action=accept" style="background: #10B981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Terima Akses (ACC)</a>
                <a href="${baseURL}/api/approve?username=${username}&action=reject" style="background: #EF4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-left: 10px;">Tolak & Hapus</a>
              </div>
            </div>
          `
        });
        console.log("✅ Email notifikasi berhasil dikirim ke Superadmin!");
      }
    } catch (emailError) {
      console.error("❌ Email gagal dikirim, tapi registrasi DB tetap aman. Detail Error:", emailError);
      // Kita membiarkan sistem tetap jalan meskipun email gagal
    }

    // Selalu kembalikan status sukses ke Frontend jika Database berhasil
    return NextResponse.json({ success: true });

  } catch (error: any) {
    // Menangkap error jika Database yang bermasalah
    console.error("🔥 ERROR DATABASE (REGISTER):", error);
    return NextResponse.json({ error: "Gagal mendaftar. Periksa koneksi Database MySQL." }, { status: 500 });
  }
}