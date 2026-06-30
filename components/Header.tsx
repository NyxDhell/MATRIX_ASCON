'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldOff, Settings, UserCircle, Sun, Moon } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const router = useRouter();
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [isAutoLogoutActive, setIsAutoLogoutActive] = useState(true);
  const [isDark, setIsDark] = useState(false);

  // Load Profile, Auto Logout, & Dark Mode Status
  useEffect(() => {
    const loadUserProfile = () => {
      const savedProfile = localStorage.getItem('ascon_user_profile');
      if (savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile);
          if (parsed.photo) setUserPhoto(parsed.photo);
        } catch (e) {}
      }
    };

    const loadAutoLogoutStatus = () => {
      const status = localStorage.getItem('ascon_auto_logout');
      setIsAutoLogoutActive(status !== 'false');
    };

    // FUNGSI SINKRONISASI TEMA DENGAN CUSTOM EVENT PAYLOAD
    const loadThemeStatus = (e?: any) => {
      let savedDarkMode = false;
      if (e && e.detail !== undefined) {
        savedDarkMode = e.detail.isDark;
      } else {
        savedDarkMode = localStorage.getItem('ascon_darkmode') === 'true';
      }
      
      setIsDark(savedDarkMode);
      if (savedDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    loadUserProfile();
    loadAutoLogoutStatus();
    loadThemeStatus();

    window.addEventListener('profileUpdated', loadUserProfile);
    window.addEventListener('autoLogoutChanged', loadAutoLogoutStatus); 
    window.addEventListener('themeChanged', loadThemeStatus as EventListener); 
    
    return () => {
      window.removeEventListener('profileUpdated', loadUserProfile);
      window.removeEventListener('autoLogoutChanged', loadAutoLogoutStatus);
      window.removeEventListener('themeChanged', loadThemeStatus as EventListener);
    };
  }, []);

  const toggleAutoLogout = () => {
    const newState = !isAutoLogoutActive;
    setIsAutoLogoutActive(newState);
    localStorage.setItem('ascon_auto_logout', String(newState));
    window.dispatchEvent(new Event('autoLogoutChanged'));
  };

  // ─── PERBAIKAN: MENGIRIM TEMA LANGSUNG LEWAT CUSTOM EVENT ───
  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem('ascon_darkmode', String(next));
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Kirim event beserta statusnya agar Dashboard langsung merespon seketika!
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { isDark: next } })); 
  };

  return (
    <header className="w-full bg-white dark:bg-neutral-900 border-b border-slate-200 dark:border-neutral-800 px-6 py-3 sticky top-0 z-40 shadow-sm transition-colors duration-300">
      <div className="flex items-center justify-between">
        
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/')} className="hover:opacity-70 transition-opacity flex items-center">
            <img 
              src="/logo-matrix header.png" 
              alt="Matrix Logo" 
              className="h-8 w-auto object-contain opacity-90"
            />
          </button>
          <div className="h-6 w-[2px] bg-slate-500 dark:bg-neutral-700 mx-1"></div>
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-bold text-ascon-teal dark:text-teal-400 uppercase tracking-[0.1em]">{title}</h2>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden lg:flex items-center gap-4 border-r border-slate-200 dark:border-neutral-800 pr-6 mr-2">
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-black text-slate-400 dark:text-neutral-500 leading-none">VERSION</span>
              <span className="text-[11px] font-bold text-slate-700 dark:text-neutral-300">MTX26.1.100-001 (ALPHA)</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-slate-400 dark:text-neutral-500">
            <button 
              onClick={() => router.push('/account')} 
              className="p-1 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg transition-all flex items-center justify-center"
              title="User Account"
            >
              {userPhoto ? (
                <img src={userPhoto} alt="Profile" className="w-[26px] h-[26px] rounded-full object-cover border border-slate-200 dark:border-neutral-700 shadow-sm" />
              ) : (
                <UserCircle size={22} className="hover:text-ascon-teal dark:hover:text-teal-400" />
              )}
            </button>

            <button 
              onClick={toggleDark} 
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-neutral-800 hover:text-ascon-teal dark:hover:text-teal-400 rounded-lg transition-all" 
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button onClick={() => router.push('/settings')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-neutral-800 hover:text-ascon-teal dark:hover:text-teal-400 rounded-lg transition-all" title="System Settings">
              <Settings size={18} />
            </button>
            
            <button 
              onClick={toggleAutoLogout} 
              className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all shadow-sm cursor-pointer ${
                isAutoLogoutActive 
                  ? 'bg-ascon-teal/10 dark:bg-ascon-teal/20 text-ascon-teal dark:text-teal-400 border-ascon-teal/20 hover:bg-ascon-teal hover:text-white dark:hover:text-white' 
                  : 'bg-slate-100 dark:bg-neutral-800 text-slate-400 dark:text-neutral-500 border-slate-200 dark:border-neutral-700 hover:bg-slate-200 dark:hover:bg-neutral-700'
              }`} 
              title={isAutoLogoutActive ? "Auto Logout: ON" : "Auto Logout: OFF"}
            >
              {isAutoLogoutActive ? <ShieldCheck size={16} /> : <ShieldOff size={16} />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}