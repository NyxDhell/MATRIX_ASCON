'use client';

import React, { useState, useEffect } from 'react';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Lock, User, Eye, EyeOff, Loader2, UserPlus, AlertCircle, CheckCircle2, AlertTriangle, Phone, Briefcase, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const pjs = Plus_Jakarta_Sans({ subsets: ['latin'] });

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '', name: '', phone: '', department: '' });
  const router = useRouter();

  // ─── CUSTOM DIALOG STATE ───
  const [dialogOptions, setDialogOptions] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
  }>({ isOpen: false, type: 'success', title: '', message: '' });

  const showCustomAlert = (type: 'success' | 'error' | 'warning', title: string, message: string) => {
    setDialogOptions({ isOpen: true, type, title, message });
  };

  const closeDialog = () => {
    setDialogOptions(prev => ({ ...prev, isOpen: false }));
  };

  // ─── DITAMBAHKAN: STATE UNTUK POP-UP PIN REGISTRASI ───
  const [isRegisterPinPromptOpen, setIsRegisterPinPromptOpen] = useState(false);
  const [registerPinValue, setRegisterPinValue] = useState('');

  // ─── DARK MODE CHECK ───
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const checkDark = localStorage.getItem('ascon_darkmode') === 'true';
    setIsDark(checkDark);
    if (checkDark) document.documentElement.classList.add('dark');
  }, []);

  // ─── FUNGSI SUBMIT FORM UTAMA ───
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Jika sedang di mode Register, TAHAN PROSES API, Munculkan Pop-up PIN!
    if (isRegister) {
      setRegisterPinValue('');
      setIsRegisterPinPromptOpen(true);
      return; 
    }

    // --- LOGIKA LOGIN (Jika bukan Register) ---
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const result = await res.json();
      
      if (res.ok && result.success) {
        localStorage.setItem('nama', result.user.name);
        localStorage.setItem('username', formData.username);
        document.cookie = `isLoggedIn=true; path=/; max-age=86400`;
        document.cookie = `userRole=${result.user.role}; path=/; max-age=86400`;
        
        if (result.user.role === 'superadmin') router.push('/superadmin');
        else router.push('/');
      } else {
        showCustomAlert("warning", "Akses Ditolak", result.error || "Username atau Password salah!");
      }
    } catch (err) { 
      showCustomAlert("error", "Koneksi Terputus", "Server gagal merespons. Pastikan database aktif."); 
    } finally {
      setLoading(false);
    }
  };

  // ─── FUNGSI PROSES REGISTRASI (Setelah PIN diisi) ───
  const processRegistration = async () => {
    if (registerPinValue.length < 6) return showCustomAlert("warning", "PIN Terlalu Pendek", "PIN Keamanan wajib 6 angka!");
    
    setLoading(true);
    
    // Menggabungkan data form utama dengan PIN yang baru diisi di Pop-Up
    const payload = { ...formData, pin: registerPinValue };

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      
      if (res.ok && result.success) {
        setIsRegisterPinPromptOpen(false); // Tutup pop-up PIN
        showCustomAlert("success", "Registrasi Berhasil", "Akun Engineer Anda telah dicatat. Silakan tunggu persetujuan (ACC) dari Administrator.");
        setIsRegister(false); // Kembalikan ke halaman login
        setFormData({ username: '', password: '', name: '', phone: '', department: '' });
      } else {
        setIsRegisterPinPromptOpen(false);
        showCustomAlert("warning", "Registrasi Gagal", result.error || "Terjadi kesalahan saat memproses data!");
      }
    } catch (err) { 
      setIsRegisterPinPromptOpen(false);
      showCustomAlert("error", "Koneksi Terputus", "Server gagal merespons. Pastikan database aktif."); 
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    localStorage.setItem('nama', 'Guest Viewer');
    localStorage.setItem('username', 'guest');
    document.cookie = `isLoggedIn=true; path=/; max-age=86400`;
    document.cookie = `userRole=GUEST; path=/; max-age=86400`;
    router.push('/guest');
  };

  return (
    <div className={`min-h-screen relative flex items-center justify-center p-6 bg-slate-50 dark:bg-black transition-colors duration-300 ${pjs.className} overflow-hidden`}>
      
      {/* ─── MODAL VERIFIKASI PIN REGISTRASI ─── */}
      {isRegisterPinPromptOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-sm rounded-[2rem] p-8 shadow-2xl border flex flex-col items-center text-center animate-in zoom-in-95 duration-200 ${isDark ? 'bg-[#141414] border-[#333]' : 'bg-white border-slate-200'}`}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: isDark ? '#1E40AF20' : '#DBEAFE' }}>
              <KeyRound size={28} className="text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className={`font-black uppercase tracking-widest text-lg mb-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>Buat PIN Keamanan</h3>
            <p className={`text-xs font-semibold leading-relaxed mb-8 ${isDark ? 'text-[#A3A3A3]' : 'text-slate-500'}`}>Buat 6 digit PIN rahasia untuk melakukan otorisasi fitur krusial (seperti Export PDF) nantinya.</p>
            
            <Input 
              autoFocus
              type="password"
              maxLength={6}
              placeholder="••••••"
              value={registerPinValue}
              onChange={(e) => setRegisterPinValue(e.target.value.replace(/[^0-9]/g, ''))}
              onKeyDown={(e) => { if (e.key === 'Enter') processRegistration(); }}
              className={`w-4/5 h-14 rounded-2xl border-none text-center font-black tracking-[0.7em] text-2xl focus-visible:ring-blue-500 ${isDark ? 'bg-[#1A1A1A] text-white' : 'bg-slate-50 text-slate-800'}`}
            />

            <div className="flex gap-3 mt-8 w-full">
              <Button type="button" variant="ghost" onClick={() => setIsRegisterPinPromptOpen(false)} className={`flex-1 h-12 text-xs font-bold uppercase tracking-widest ${isDark ? 'text-[#A3A3A3] hover:text-white hover:bg-[#1A1A1A]' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}>
                Kembali
              </Button>
              <Button disabled={loading} onClick={processRegistration} className="flex-1 h-12 text-xs font-bold uppercase tracking-widest bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20">
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Selesai & Daftar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── CUSTOM DIALOG ALERT ── */}
      {dialogOptions.isOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border flex flex-col animate-in zoom-in-95 duration-200 ${isDark ? 'bg-[#141414] border-[#333]' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                dialogOptions.type === 'success' ? (isDark ? 'bg-emerald-900/30' : 'bg-emerald-50') : 
                dialogOptions.type === 'error' ? (isDark ? 'bg-red-900/30' : 'bg-red-50') : 
                (isDark ? 'bg-amber-900/30' : 'bg-amber-50')
              }`}>
                {dialogOptions.type === 'success' ? <CheckCircle2 size={20} className="text-emerald-500" /> : 
                 dialogOptions.type === 'error' ? <AlertTriangle size={20} className="text-red-500" /> : 
                 <AlertCircle size={20} className="text-amber-500" />}
              </div>
              <h3 className={`font-black uppercase tracking-widest text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>{dialogOptions.title}</h3>
            </div>
            <p className={`text-xs font-semibold leading-relaxed mb-6 ${isDark ? 'text-[#A3A3A3]' : 'text-slate-500'}`}>{dialogOptions.message}</p>
            <div className="flex justify-end mt-auto">
              <Button onClick={closeDialog} className={`h-10 px-6 text-[11px] font-bold uppercase tracking-widest text-white shadow-lg transition-transform active:scale-95 ${
                dialogOptions.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 
                dialogOptions.type === 'error' ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20' : 
                'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
              }`}>
                Tutup Peringatan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── BACKGROUND ── */}
      <div className="absolute inset-0 z-0">
        <Image 
          src="/bg-main.jpg" 
          alt="Background Utama"
          fill
          quality={80}
          priority
          className="object-cover object-center blur-lg scale-110 opacity-60 dark:opacity-30" 
        />
        <div className="absolute inset-0 bg-slate-100/30 dark:bg-black/60"></div>
      </div>

      <div className="w-full max-w-[1100px] grid grid-cols-1 md:grid-cols-2 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm rounded-[2.5rem] shadow-2xl overflow-hidden border border-white dark:border-neutral-800 relative z-10">
        
        {/* ── FORM SECTION ── */}
        <div className={`p-8 md:p-16 flex flex-col justify-center relative transition-all duration-500 ${isRegister ? 'overflow-y-auto' : ''}`} style={{ maxHeight: isRegister ? '90vh' : 'auto' }}>
          <div className="mb-10 mt-8 md:mt-0">
            <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
              {isRegister ? "Buat Akun Akses" : "Selamat Datang"}
            </h1>
            <p className="text-slate-400 dark:text-neutral-400 text-sm font-medium">
              {isRegister ? "Daftar untuk mendapatkan akses Engineer penuh." : "Silakan masuk untuk mengelola infrastruktur PLC & IoT Anda."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister && (
               <>
                 <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                   <label className="text-[10px] font-black uppercase text-slate-400 dark:text-neutral-500 ml-1 tracking-widest">Nama Lengkap Engineer</label>
                   <div className="relative">
                     <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                     <Input 
                       required={isRegister}
                       placeholder="Misal: Fadhel / Nilam" 
                       className="pl-12 h-14 rounded-2xl bg-slate-50 dark:bg-black border-none text-slate-800 dark:text-white focus-visible:ring-ascon-teal font-bold"
                       value={formData.name}
                       onChange={(e) => setFormData({...formData, name: e.target.value})}
                     />
                   </div>
                 </div>

                 <div className="space-y-2 animate-in slide-in-from-top-2 duration-300 delay-75">
                   <label className="text-[10px] font-black uppercase text-slate-400 dark:text-neutral-500 ml-1 tracking-widest">Bagian / Divisi / Dept</label>
                   <div className="relative">
                     <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                     <Input 
                       required={isRegister}
                       placeholder="Contoh: IT Network, Maintenance..." 
                       className="pl-12 h-14 rounded-2xl bg-slate-50 dark:bg-black border-none text-slate-800 dark:text-white focus-visible:ring-ascon-teal font-bold"
                       value={formData.department}
                       onChange={(e) => setFormData({...formData, department: e.target.value})}
                     />
                   </div>
                 </div>

                 <div className="space-y-2 animate-in slide-in-from-top-2 duration-300 delay-100">
                   <label className="text-[10px] font-black uppercase text-slate-400 dark:text-neutral-500 ml-1 tracking-widest">Nomor Handphone</label>
                   <div className="relative">
                     <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                     <Input 
                       required={isRegister}
                       type="tel"
                       placeholder="Contoh: 08123456789" 
                       className="pl-12 h-14 rounded-2xl bg-slate-50 dark:bg-black border-none text-slate-800 dark:text-white focus-visible:ring-ascon-teal font-bold"
                       value={formData.phone}
                       onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/[^0-9]/g, '')})}
                     />
                   </div>
                 </div>
               </>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 dark:text-neutral-500 ml-1 tracking-widest">Username Login</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input 
                  required
                  placeholder="Masukkan username" 
                  className="pl-12 h-14 rounded-2xl bg-slate-50 dark:bg-black border-none text-slate-800 dark:text-white focus-visible:ring-ascon-teal font-bold"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value.toLowerCase().replace(/\s/g, '')})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 dark:text-neutral-500 ml-1 tracking-widest">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input 
                  required
                  type={showPassword ? "text" : "password"} 
                  placeholder={isRegister ? "Buat password yang kuat" : "Masukkan password"} 
                  className="pl-12 pr-12 h-14 rounded-2xl bg-slate-50 dark:bg-black border-none text-slate-800 dark:text-white focus-visible:ring-ascon-teal font-bold"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-ascon-teal transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {!isRegister && (
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <input type="checkbox" className="w-4 h-4 rounded accent-ascon-teal cursor-pointer" id="remember" />
                  <label htmlFor="remember" className="text-xs font-bold text-slate-500 dark:text-neutral-400 cursor-pointer">Ingat Perangkat</label>
                </div>
                <a href="#" className="text-xs font-black text-ascon-teal dark:text-teal-400 hover:underline">Lupa Password?</a>
              </div>
            )}

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-14 rounded-2xl bg-ascon-red hover:bg-[#A62743] text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-ascon-red/20 transition-all active:scale-[0.98] mt-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : <span>{isRegister ? "Selanjutnya (Buat PIN)" : "Login ke Sistem"}</span>}
            </Button>
          </form>

          {/* ── TOMBOL GUEST VIEWER ── */}
          {!isRegister && (
            <Button 
              type="button"
              variant="outline"
              onClick={handleGuestLogin}
              className="w-full h-14 rounded-2xl border-2 border-slate-200 dark:border-neutral-800 text-slate-500 dark:text-neutral-400 font-black uppercase text-xs tracking-widest hover:bg-slate-100 dark:hover:bg-neutral-800 transition-all active:scale-[0.98] mt-4"
            >
              <Eye size={16} className="mr-2" /> Masuk Sebagai Guest Viewer
            </Button>
          )}

          <div className="mt-8 text-center text-xs font-bold text-slate-500 dark:text-neutral-400">
            {isRegister ? "Sudah punya akun?" : "Belum punya akses Engineer?"} 
            <button 
              type="button" 
              onClick={() => { setIsRegister(!isRegister); setFormData({username:'', password:'', name:'', phone:'', department:''}); }} 
              className="ml-2 text-ascon-teal dark:text-teal-400 font-black hover:underline"
            >
              {isRegister ? "Login Sekarang" : "Daftar Disini"}
            </button>
          </div>

          <p className="mt-10 mb-4 text-center text-slate-400 dark:text-neutral-500 text-[9px] font-bold uppercase tracking-widest">
            © 2026 PT Ascon Multi Pratama • IT Network & IoT Division
          </p>
        </div>

        {/* ── VISUAL SECTION ── */}
        <div className="hidden md:flex bg-ascon-teal dark:bg-black p-12 flex-col justify-center items-center relative overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-ascon-purple rounded-full blur-3xl opacity-40 z-0"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-ascon-red rounded-full blur-3xl opacity-30 z-0"></div>

          <div className="relative z-10 flex flex-col items-center animate-in zoom-in-95 duration-700">
            <img 
              src="/logo-matrix.png" 
              alt="Ascon Matrix Logo" 
              className="w-full max-w-[320px] h-auto object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
            />
            <div className="mt-8 text-center">
               <div className="h-1 w-12 bg-white/20 mx-auto rounded-full mb-4"></div>
               <p className="text-white/80 text-sm italic font-medium max-w-[280px] leading-relaxed">
                "Sistem monitoring otomatis pencatatan data Modbus TCP/IP ke SQL tanpa operator manual."
              </p>
            </div>
          </div>

          <div className="absolute bottom-8 right-8 z-10">
            <span className="text-[10px] font-black text-white/40 tracking-[0.3em] uppercase border border-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
              v1.2.0 Stable
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}