'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function AutoLogout() {
  const router = useRouter();
  const pathname = usePathname();
  const [isAutoLogoutActive, setIsAutoLogoutActive] = useState(true);

  // 1. Dengarkan perubahan status (ON/OFF) dari Header atau Settings
  useEffect(() => {
    const checkStatus = () => {
      const status = localStorage.getItem('ascon_auto_logout');
      // Defaultnya nyala (true), kecuali secara eksplisit di-set 'false'
      setIsAutoLogoutActive(status !== 'false');
    };

    checkStatus(); // Cek saat pertama kali dimuat
    window.addEventListener('autoLogoutChanged', checkStatus);
    
    return () => window.removeEventListener('autoLogoutChanged', checkStatus);
  }, []);

  // 2. Mesin Timer (Hanya berjalan jika isAutoLogoutActive == true)
  useEffect(() => {
    // Jangan jalankan di halaman login, atau jika fitur sedang di-OFF-kan
    if (pathname === '/login' || !isAutoLogoutActive) return;

    let timeoutId: NodeJS.Timeout;

    const forceLogout = () => {
      alert("Sesi Anda telah habis karena tidak ada aktivitas selama 5 menit. Silakan login kembali.");
      document.cookie = "isLoggedIn=; path=/; max-age=0";
      document.cookie = "userRole=; path=/; max-age=0";
      router.push('/login');
    };

    const resetTimer = () => {
      clearTimeout(timeoutId);
      // 300.000 milidetik = 5 menit
      timeoutId = setTimeout(forceLogout, 300000); 
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];

    resetTimer();
    events.forEach(event => window.addEventListener(event, resetTimer));

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [pathname, router, isAutoLogoutActive]); // isAutoLogoutActive ditambahkan sebagai pemicu (trigger)

  return null; 
}