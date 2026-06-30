'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { UserCircle, Mail, Briefcase, Shield, LogOut, Save, Loader2, CheckCircle2, Camera } from 'lucide-react';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const pjs = Plus_Jakarta_Sans({ subsets: ['latin'] });

export default function AccountPage() {
  const [userRole, setUserRole] = useState('SUPER ADMIN');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // ─── STATE DARK MODE ───
  const [isDark, setIsDark] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState({
    name: 'Administrator',
    email: '',
    jobRole: '',
    photo: ''
  });

  useEffect(() => {
    // Sinkronisasi Dark Mode saat pertama kali load
    const savedDarkMode = localStorage.getItem('ascon_darkmode') === 'true';
    setIsDark(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }

    // Menarik data asli dari Database melalui API
    const fetchUserData = async () => {
      const currentUsername = localStorage.getItem('username');
      if (currentUsername) {
        try {
          const res = await fetch(`/api/account?username=${currentUsername}`);
          const result = await res.json();
          if (result.success && result.data) {
            setProfile({
              name: result.data.name || 'Administrator',
              email: result.data.email || '',
              jobRole: result.data.jobRole || '',
              photo: result.data.photo || ''
            });
            // Sinkronkan ke lokal agar Header langsung menampilkan foto
            localStorage.setItem('ascon_user_profile', JSON.stringify(result.data));
            window.dispatchEvent(new Event('profileUpdated'));
          }
        } catch (e) {
          console.error("Gagal menarik data dari database", e);
        }
      }
    };

    fetchUserData();

    // Ambil Role
    const roleCookie = document.cookie.split('; ').find(row => row.startsWith('userRole='))?.split('=')[1];
    if (roleCookie) setUserRole(decodeURIComponent(roleCookie).toUpperCase());

    // Listener untuk perubahan tema dari Header
    const handleThemeChange = () => {
      setIsDark(localStorage.getItem('ascon_darkmode') === 'true');
    };
    window.addEventListener('themeChanged', handleThemeChange);

    return () => {
      window.removeEventListener('themeChanged', handleThemeChange);
    };
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile(prev => ({ ...prev, photo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    const currentUsername = localStorage.getItem('username');
    
    try {
      // 1. Simpan ke Database
      const res = await fetch('/api/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUsername, ...profile })
      });

      if (res.ok) {
        // 2. Jika sukses DB, simpan ke lokal untuk Header
        localStorage.setItem('ascon_user_profile', JSON.stringify(profile));
        localStorage.setItem('nama', profile.name); 
        window.dispatchEvent(new Event('profileUpdated'));

        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        alert("Gagal menyimpan ke database MySQL.");
      }
    } catch (e) {
      alert("Error koneksi server.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    if (confirm("Apakah Anda yakin ingin keluar dari sesi ini?")) {
      localStorage.clear();
      document.cookie = "isLoggedIn=; path=/; max-age=0";
      document.cookie = "username=; path=/; max-age=0";
      document.cookie = "userRole=; path=/; max-age=0";
      window.location.href = '/login';
    }
  };

  return (
    <div className={`flex h-screen bg-slate-50 dark:bg-black overflow-hidden transition-colors duration-300 ${pjs.className}`}>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Account Management" />

        <main className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
              <div>
                <h1 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tight">User Profile</h1>
                <p className="text-sm font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mt-1">Manage your identity and access</p>
              </div>
              <div className="flex items-center gap-4">
                {showSuccess && (
                  <span className="text-emerald-500 text-xs font-black uppercase tracking-widest flex items-center animate-in fade-in zoom-in">
                    <CheckCircle2 size={16} className="mr-1" /> Profile Updated
                  </span>
                )}
                <Button 
                  onClick={handleSaveProfile} 
                  disabled={isSaving}
                  className="bg-ascon-teal hover:bg-[#1d4f59] text-white rounded-xl px-8 h-12 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-ascon-teal/30 transition-all active:scale-95"
                >
                  {isSaving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save className="mr-2" size={16} />}
                  {isSaving ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="md:col-span-1 space-y-6">
                <Card className="p-8 rounded-3xl border-slate-200 dark:border-neutral-800 shadow-sm bg-white dark:bg-neutral-900 text-center flex flex-col items-center transition-colors">
                  
                  <div className="relative mb-6 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-32 h-32 bg-slate-100 dark:bg-neutral-800 rounded-full flex items-center justify-center border-4 border-white dark:border-neutral-900 shadow-lg overflow-hidden relative transition-colors">
                      {profile.photo ? (
                        <img src={profile.photo} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <UserCircle size={64} className="text-slate-300 dark:text-neutral-600" />
                      )}
                      
                      <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="text-white" size={24} />
                      </div>
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={fileInputRef} 
                      onChange={handleImageUpload}
                    />
                  </div>

                  <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{profile.name}</h2>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-widest mb-6">{profile.jobRole || 'No Role Assigned'}</p>
                  
                  <div className="w-full bg-slate-50 dark:bg-black p-3 rounded-xl border border-slate-100 dark:border-neutral-800 flex items-center justify-center gap-2 mb-6 shadow-inner transition-colors">
                    <Shield size={14} className="text-ascon-purple dark:text-purple-400" />
                    <span className="text-[10px] font-black text-ascon-purple dark:text-purple-400 uppercase tracking-widest">{userRole} PRIVILEGE</span>
                  </div>

                  <Button 
                    onClick={handleLogout}
                    variant="outline" 
                    className="w-full border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-400 font-black uppercase text-[10px] tracking-widest h-12 rounded-xl transition-all"
                  >
                    <LogOut size={14} className="mr-2" /> Keluar Sesi (Logout)
                  </Button>
                </Card>
              </div>

              <div className="md:col-span-2 space-y-6">
                <Card className="p-8 rounded-3xl border-slate-200 dark:border-neutral-800 shadow-sm bg-white dark:bg-neutral-900 transition-colors">
                  <h3 className="font-black text-slate-800 dark:text-white uppercase text-xs tracking-widest mb-6 border-b border-slate-100 dark:border-neutral-800 pb-4 transition-colors">Personal Information</h3>
                  
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-neutral-500 uppercase tracking-widest">Full Name</label>
                      <div className="relative">
                        <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-neutral-500" size={16} />
                        <Input 
                          value={profile.name}
                          onChange={(e) => setProfile({...profile, name: e.target.value})}
                          className="pl-11 h-12 bg-slate-50 dark:bg-black border-slate-200 dark:border-neutral-800 font-bold text-slate-700 dark:text-white rounded-xl focus-visible:ring-ascon-teal transition-all hover:bg-slate-100 dark:hover:bg-neutral-900"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-neutral-500 uppercase tracking-widest">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-neutral-500" size={16} />
                        <Input 
                          type="email"
                          value={profile.email}
                          onChange={(e) => setProfile({...profile, email: e.target.value})}
                          className="pl-11 h-12 bg-slate-50 dark:bg-black border-slate-200 dark:border-neutral-800 font-bold text-slate-700 dark:text-white rounded-xl focus-visible:ring-ascon-teal transition-all hover:bg-slate-100 dark:hover:bg-neutral-900"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-neutral-500 uppercase tracking-widest">Job Role / Department</label>
                      <div className="relative">
                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-neutral-500" size={16} />
                        <Input 
                          value={profile.jobRole}
                          onChange={(e) => setProfile({...profile, jobRole: e.target.value})}
                          className="pl-11 h-12 bg-slate-50 dark:bg-black border-slate-200 dark:border-neutral-800 font-bold text-slate-700 dark:text-white rounded-xl focus-visible:ring-ascon-teal transition-all hover:bg-slate-100 dark:hover:bg-neutral-900"
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}