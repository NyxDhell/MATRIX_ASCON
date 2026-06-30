'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Plus_Jakarta_Sans } from 'next/font/google';

const pjs = Plus_Jakarta_Sans({ subsets: ['latin'] });

// 1. Logika utama dipindahkan ke komponen ini agar bisa dibungkus Suspense
function ApproveContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  const username = searchParams.get('username');
  const action = searchParams.get('action');

  useEffect(() => {
    if (username && action) {
      // Mengirim request ke API untuk update status di database
      fetch(`/api/approve?username=${username}&action=${action}`)
        .then(res => {
          if (res.ok) {
            setStatus('success');
            setMessage(action === 'accept' 
              ? `Akun Engineer "${username}" telah berhasil diaktifkan.` 
              : `Permintaan akun "${username}" telah berhasil ditolak & dihapus.`);
          } else {
            throw new Error();
          }
        })
        .catch(() => {
          setStatus('error');
          setMessage("Terjadi kesalahan sistem saat memproses persetujuan.");
        });
    }
  }, [username, action]);

  return (
    <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl text-center border border-slate-100">
      {status === 'loading' && (
        <div className="flex flex-col items-center">
          <Loader2 size={48} className="text-teal-600 animate-spin mb-4" />
          <h2 className="text-xl font-black text-slate-800">Memproses...</h2>
        </div>
      )}

      {status === 'success' && (
        <div className="flex flex-col items-center animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Registrasi Selesai</h2>
          <p className="text-sm font-bold text-slate-500 mb-8">{message}</p>
          <a href="/login" className="bg-ascon-teal text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#1d4f59] transition-all">
            Kembali ke Login
          </a>
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col items-center animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
            <XCircle size={40} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Terjadi Kesalahan</h2>
          <p className="text-sm font-bold text-slate-500 mb-8">{message}</p>
        </div>
      )}
    </div>
  );
}

// 2. Komponen utama yang menjadi pembungkus (Suspense Boundary)
export default function ApprovePage() {
  return (
    <div className={`min-h-screen flex items-center justify-center bg-slate-50 p-6 ${pjs.className}`}>
      <Suspense fallback={
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl text-center border border-slate-100">
           <Loader2 size={48} className="text-teal-600 animate-spin mx-auto" />
        </div>
      }>
        <ApproveContent />
      </Suspense>
    </div>
  );
}