'use client';

import React, { useState, useEffect } from 'react';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { useRouter } from 'next/navigation'; 
import { 
  Settings, Save, Bell, Lock, Globe, HardDrive, CheckCircle2, 
  Loader2, KeyRound, Moon, Sun, Database, RefreshCw, Sliders, ListFilter, LayoutTemplate, Trash2, Edit, Network, Plus, ShieldCheck
} from 'lucide-react';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const pjs = Plus_Jakarta_Sans({ subsets: ['latin'] });

export default function SettingsPage() {
  const router = useRouter(); 
  const ArrayTabs = ['general', 'templates', 'vpn', 'notifications', 'security'] as const;
  const [activeTab, setActiveTab] = useState<typeof ArrayTabs[number]>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isAutoLogoutActive, setIsAutoLogoutActive] = useState(true);

  // ─── STATE DINAMIS (DB & TABEL) ───
  const [availableDbs, setAvailableDbs] = useState<string[]>([]);
  const [selectedDb, setSelectedDb] = useState('');
  const [isScanningDb, setIsScanningDb] = useState(false);

  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [isScanningTable, setIsScanningTable] = useState(false);

  // ─── STATE PDF TEMPLATE ───
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  // ─── STATE VPN (CRUD) ───
  const [vpnList, setVpnList] = useState<string[]>([]);
  const [newVpnIp, setNewVpnIp] = useState('');
  const [isVpnLoading, setIsVpnLoading] = useState(false);
  const [isRebooting, setIsRebooting] = useState(false);

  // ─── STATE PIN & AKTIVASI ───
  const [dbPin, setDbPin] = useState('');
  const [isFetchingPin, setIsFetchingPin] = useState(true);
  const [isSavingPin, setIsSavingPin] = useState(false);
  const [isExportPinEnabled, setIsExportPinEnabled] = useState(false); // STATE BARU UNTUK TOGGLE PIN

  const [prefs, setPrefs] = useState({
    autoRefresh: true,
    highPrecision: true,
    systemAlerts: true,
    emailReports: false,
  });

  useEffect(() => {
    const savedPrefs = localStorage.getItem('ascon_settings');
    const savedDarkMode = localStorage.getItem('ascon_darkmode') === 'true';
    if (savedPrefs) setPrefs(JSON.parse(savedPrefs));
    setIsDarkMode(savedDarkMode);
    if (savedDarkMode) document.documentElement.classList.add('dark');

    const loadAutoLogout = () => setIsAutoLogoutActive(localStorage.getItem('ascon_auto_logout') !== 'false');
    loadAutoLogout();
    window.addEventListener('autoLogoutChanged', loadAutoLogout);

    setSelectedDb(localStorage.getItem('matrix_active_db') || '');
    setSelectedTable(localStorage.getItem('matrix_active_table') || '');
    
    // Load status aktivasi PIN
    setIsExportPinEnabled(localStorage.getItem('ascon_export_pin_enabled') === 'true');

    scanDatabases(); 
    fetchTemplates();
    fetchVpnIps();

    const loadPinFromDB = async () => {
      const username = localStorage.getItem('username');
      if (username) {
        try {
          const res = await fetch(`/api/settings/pin?username=${username}`);
          const data = await res.json();
          if (data.success && data.pin) setDbPin(data.pin);
        } catch (err) { console.error("Gagal menarik PIN"); } 
        finally { setIsFetchingPin(false); }
      }
    };
    loadPinFromDB();

    return () => window.removeEventListener('autoLogoutChanged', loadAutoLogout);
  }, []);

  useEffect(() => {
    if (selectedDb) scanTables(selectedDb);
    else setAvailableTables([]);
  }, [selectedDb]);

  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const res = await fetch('/api/settings/templates');
      const data = await res.json();
      if (data.success) setTemplates(data.data);
    } catch (err) {} finally { setIsLoadingTemplates(false); }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus template perusahaan ini? Data tidak bisa dikembalikan.")) return;
    try {
      await fetch('/api/settings/templates', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id })
      });
      fetchTemplates();
    } catch (err) {}
  };

  const fetchVpnIps = async () => {
    setIsVpnLoading(true);
    try {
      const res = await fetch('/api/settings/vpn');
      const data = await res.json();
      if (data.success) setVpnList(data.data);
    } catch (err) {} finally { setIsVpnLoading(false); }
  };

  const handleAddVpn = async () => {
    if (!newVpnIp) return alert("Masukkan IP VPN terlebih dahulu!");
    setIsRebooting(true);
    try {
      const res = await fetch('/api/settings/vpn', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: newVpnIp })
      });
      const data = await res.json();
      if (data.success) {
        alert("IP Jaringan Berhasil ditambahkan! Server sedang memproses REBOOT otomatis.\nHalaman akan disegarkan dalam 5 detik...");
        setNewVpnIp('');
        setTimeout(() => window.location.reload(), 5000);
      } else {
        alert("Gagal menyimpan konfigurasi jaringan: " + (data.message || data.error));
        setIsRebooting(false);
      }
    } catch (err) { setIsRebooting(false); }
  };

  const handleDeleteVpn = async (ip: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus IP ${ip} dari Whitelist? Akses jaringan akan dicabut dan server akan me-reboot otomatis.`)) return;
    setIsRebooting(true);
    try {
      const res = await fetch('/api/settings/vpn', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip, action: 'delete' })
      });
      const data = await res.json();
      if (data.success) {
        alert("Akses IP berhasil dicabut! Server sedang me-reboot otomatis.\nHalaman akan disegarkan dalam 5 detik...");
        setTimeout(() => window.location.reload(), 5000);
      } else {
        alert("Gagal menghapus IP: " + (data.message || data.error));
        setIsRebooting(false);
      }
    } catch (err) { setIsRebooting(false); }
  };

  const scanDatabases = async () => {
    setIsScanningDb(true);
    try {
      const res = await fetch('/api/settings/scan-databases');
      const result = await res.json();
      if (result.success) setAvailableDbs(result.databases);
    } catch (err) {} finally { setIsScanningDb(false); }
  };

  const scanTables = async (db: string) => {
    setIsScanningTable(true);
    try {
      const res = await fetch(`/api/settings/scan-tables?db=${db}`);
      const result = await res.json();
      if (result.success) setAvailableTables(result.tables);
    } catch (err) {} finally { setIsScanningTable(false); }
  };

  const toggleDarkMode = () => {
    const newValue = !isDarkMode;
    setIsDarkMode(newValue);
    localStorage.setItem('ascon_darkmode', String(newValue));
    document.documentElement.classList.toggle('dark');
  };

  const toggleAutoLogout = () => {
    const newValue = !isAutoLogoutActive;
    setIsAutoLogoutActive(newValue);
    localStorage.setItem('ascon_auto_logout', String(newValue));
    window.dispatchEvent(new Event('autoLogoutChanged'));
  };

  const togglePref = (key: keyof typeof prefs) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // FUNGSI TOGGLE PIN (LANGSUNG SAVE KE LOKAL)
  const toggleExportPin = () => {
    const next = !isExportPinEnabled;
    setIsExportPinEnabled(next);
    localStorage.setItem('ascon_export_pin_enabled', String(next));
    localStorage.setItem('ascon_pin_prompted', 'true'); // Tandai bahwa user sudah menyetel opsi secara manual
  };

  const handleUpdatePin = async () => {
    if (dbPin.length !== 6) return alert("Peringatan: PIN Keamanan wajib terdiri dari 6 angka!");
    setIsSavingPin(true);
    try {
      const username = localStorage.getItem('username');
      if (username) {
        const res = await fetch('/api/settings/pin', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, pin: dbPin })
        });
        const result = await res.json();
        if (result.success) alert("Berhasil! PIN Keamanan Anda telah diupdate di Database.");
        else alert("Gagal memperbarui PIN. Hubungi Admin.");
      }
    } catch (error) {} finally { setIsSavingPin(false); }
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('ascon_settings', JSON.stringify(prefs));

      if (selectedDb && selectedTable) {
        localStorage.setItem('matrix_active_db', selectedDb);
        localStorage.setItem('matrix_active_table', selectedTable);
        document.cookie = `matrix_active_db=${selectedDb}; path=/; max-age=86400`;
        document.cookie = `matrix_active_table=${selectedTable}; path=/; max-age=86400`;
      }

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      if (selectedDb && selectedDb !== localStorage.getItem('matrix_active_db_last')) {
         localStorage.setItem('matrix_active_db_last', selectedDb);
         setTimeout(() => window.location.reload(), 1500);
      } else if (selectedTable && selectedTable !== localStorage.getItem('matrix_active_table_last')) {
         localStorage.setItem('matrix_active_table_last', selectedTable);
         setTimeout(() => window.location.reload(), 1500);
      }
    } catch (error) {} finally { setIsSaving(false); }
  };

  const handleClearCache = () => {
    if (confirm("Peringatan: Ini akan menghapus semua preferensi lokal dan cache sesi Anda. Anda mungkin perlu login ulang. Lanjutkan?")) {
      localStorage.clear();
      document.cookie = "isLoggedIn=; path=/; max-age=0";
      window.location.href = '/login';
    }
  };

  const isMappingIncomplete = Boolean(!selectedDb || !selectedTable);

  return (
    <div className={`flex h-screen bg-slate-50 dark:bg-black overflow-hidden transition-colors duration-300 ${pjs.className}`}>
      
      {isRebooting && (
        <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
          <Loader2 size={50} className="animate-spin text-ascon-teal mb-6" />
          <h2 className="text-2xl font-black text-white uppercase tracking-widest">Rebooting Server...</h2>
          <p className="text-sm font-bold text-slate-400 font-mono text-center max-w-md">Menulis ulang file config dan memuat ulang origin akses.<br />Mohon tunggu sebentar...</p>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="System Settings" />

        <main className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="max-w-5xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
              <div>
                <h1 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Configuration</h1>
                <p className="text-sm font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mt-1">Manage your industrial dashboard preferences</p>
              </div>
              <div className="flex items-center gap-4">
                {showSuccess && <span className="text-emerald-500 text-xs font-black uppercase tracking-widest flex items-center animate-in fade-in zoom-in"><CheckCircle2 size={16} className="mr-1" /> Saved Successfully</span>}
                <Button onClick={handleSaveChanges} disabled={isSaving || isMappingIncomplete} className="bg-ascon-teal hover:bg-[#1d4f59] disabled:opacity-50 text-white rounded-xl px-8 h-12 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-ascon-teal/30 transition-all active:scale-95">
                  {isSaving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save className="mr-2" size={16} />} Save Changes
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-1 space-y-2">
                <button onClick={() => setActiveTab('general')} className={`w-full flex items-center gap-3 p-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-sm ${activeTab === 'general' ? 'bg-ascon-teal text-white border-transparent' : 'bg-white dark:bg-neutral-900 text-slate-500 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 border border-slate-100 dark:border-neutral-800'}`}><Globe size={18} /> General Setup</button>
                <button onClick={() => setActiveTab('templates')} className={`w-full flex items-center gap-3 p-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-sm ${activeTab === 'templates' ? 'bg-ascon-teal text-white border-transparent' : 'bg-white dark:bg-neutral-900 text-slate-500 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 border border-slate-100 dark:border-neutral-800'}`}><LayoutTemplate size={18} /> PDF Templates</button>
                <button onClick={() => setActiveTab('vpn')} className={`w-full flex items-center gap-3 p-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-sm ${activeTab === 'vpn' ? 'bg-[#2A6C7A] text-white border-transparent' : 'bg-white dark:bg-neutral-900 text-slate-500 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 border border-slate-100 dark:border-neutral-800'}`}><Network size={18} /> Configurasi VPN</button>
                <button onClick={() => setActiveTab('notifications')} className={`w-full flex items-center gap-3 p-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-sm ${activeTab === 'notifications' ? 'bg-ascon-teal text-white border-transparent' : 'bg-white dark:bg-neutral-900 text-slate-500 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 border border-slate-100 dark:border-neutral-800'}`}><Bell size={18} /> Notifications</button>
                <button onClick={() => setActiveTab('security')} className={`w-full flex items-center gap-3 p-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-sm ${activeTab === 'security' ? 'bg-ascon-teal text-white border-transparent' : 'bg-white dark:bg-neutral-900 text-slate-500 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 border border-slate-100 dark:border-neutral-800'}`}><Lock size={18} /> Security & PIN</button>
              </div>

              <div className="md:col-span-3 space-y-6">
                
                {/* ─── TAB 1: GENERAL SETUP ─── */}
                {activeTab === 'general' && (
                  <div className="animate-in fade-in duration-300 space-y-6">
                    <Card className="p-8 rounded-3xl border-slate-200 dark:border-neutral-800 shadow-sm bg-white dark:bg-neutral-900">
                      <h3 className="font-black text-slate-800 dark:text-white uppercase text-xs tracking-widest mb-6 border-b border-slate-100 dark:border-neutral-800 pb-4 flex items-center gap-2"><Globe size={16} className="text-ascon-teal"/> Data Integration Matrix</h3>
                      <div className="space-y-5">
                        <div className="p-5 bg-slate-50 dark:bg-black rounded-2xl border border-slate-100 dark:border-neutral-800">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-black text-slate-700 dark:text-neutral-200 uppercase flex items-center gap-2"><Database size={14}/> 1. Pilih Database Klien</p>
                            <Button onClick={scanDatabases} disabled={isScanningDb} variant="outline" className="h-8 px-3 text-[9px] font-black uppercase tracking-widest bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-700"><RefreshCw size={12} className={`mr-1.5 ${isScanningDb ? 'animate-spin' : ''}`} /> Scan DB</Button>
                          </div>
                          <select value={selectedDb} onChange={(e) => { setSelectedDb(e.target.value); setSelectedTable(''); }} className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-neutral-700 font-bold bg-white dark:bg-black text-xs text-slate-700 dark:text-white outline-none focus:border-ascon-teal cursor-pointer">
                            <option value="" disabled>➔ Klik Untuk Memilih Database Klien</option>
                            {availableDbs.map(db => <option key={db} value={db}>{db.toUpperCase()}</option>)}
                          </select>
                        </div>
                        {selectedDb && (
                          <div className="p-5 bg-slate-50 dark:bg-black rounded-2xl border border-slate-100 dark:border-neutral-800 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-xs font-black text-slate-700 dark:text-neutral-200 uppercase flex items-center gap-2"><ListFilter size={14}/> 2. Pilih Tabel Log Sensoring</p>
                              {isScanningTable && <Loader2 size={12} className="animate-spin text-ascon-teal" />}
                            </div>
                            <select value={selectedTable} onChange={(e) => setSelectedTable(e.target.value)} className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-neutral-700 font-bold bg-white dark:bg-black text-xs text-slate-700 dark:text-white outline-none focus:border-ascon-teal cursor-pointer">
                              <option value="" disabled>➔ Klik Untuk Memilih Tabel Log</option>
                              {availableTables.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                            </select>
                          </div>
                        )}
                        {selectedTable && (
                          <div className="flex justify-end pt-2 animate-in fade-in zoom-in-95">
                            <Button type="button" onClick={() => router.push(`/settings/database/${selectedTable}`)} className="bg-ascon-teal hover:bg-[#1d4f59] text-white rounded-xl px-8 h-12 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-ascon-teal/30 transition-all active:scale-95 w-full md:w-auto">
                              <Sliders size={16} className="mr-2" /> ADVANCED SETTINGS
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>

                    <Card className="p-8 rounded-3xl border-slate-200 dark:border-neutral-800 shadow-sm bg-white dark:bg-neutral-900 space-y-5 animate-in fade-in duration-300">
                      <h3 className="font-black text-slate-800 dark:text-white uppercase text-xs tracking-widest mb-4 border-b border-slate-100 dark:border-neutral-800 pb-4 flex items-center gap-2"><Sliders size={16} className="text-ascon-teal"/> Interface & Automation</h3>
                      <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-black rounded-2xl border border-slate-100 dark:border-neutral-800 transition-colors">
                        <div>
                          <p className="text-sm font-black text-slate-700 dark:text-neutral-200 uppercase">Dark Mode</p>
                          <p className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-widest mt-1">Switch interface theme to pitch black</p>
                        </div>
                        <div onClick={toggleDarkMode} className={`w-12 h-6 rounded-full relative cursor-pointer shadow-inner transition-colors duration-300 ${isDarkMode ? 'bg-ascon-teal' : 'bg-slate-300 dark:bg-neutral-700'}`}>
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${isDarkMode ? 'right-1' : 'left-1'}`}>{isDarkMode ? <Moon size={10} className="mt-1 ml-1 text-ascon-teal" /> : <Sun size={10} className="mt-1 ml-1 text-slate-500" />}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-black rounded-2xl border border-slate-100 dark:border-neutral-800 transition-colors">
                        <div>
                          <p className="text-sm font-black text-slate-700 dark:text-neutral-200 uppercase">Auto Logout (Idle Timer)</p>
                          <p className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-widest mt-1">End session automatically after 5 mins of inactivity</p>
                        </div>
                        <div onClick={toggleAutoLogout} className={`w-12 h-6 rounded-full relative cursor-pointer shadow-inner transition-colors duration-300 ${isAutoLogoutActive ? 'bg-ascon-teal' : 'bg-slate-300 dark:bg-neutral-700'}`}>
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${isAutoLogoutActive ? 'right-1' : 'left-1'}`}></div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-black rounded-2xl border border-slate-100 dark:border-neutral-800 transition-colors">
                        <div>
                          <p className="text-sm font-black text-slate-700 dark:text-neutral-200 uppercase">Auto Refresh Data</p>
                          <p className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-widest mt-1">Updates API every 10 seconds</p>
                        </div>
                        <div onClick={() => togglePref('autoRefresh')} className={`w-12 h-6 rounded-full relative cursor-pointer shadow-inner transition-colors duration-300 ${prefs.autoRefresh ? 'bg-ascon-teal' : 'bg-slate-300 dark:bg-neutral-700'}`}>
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${prefs.autoRefresh ? 'right-1' : 'left-1'}`}></div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-black rounded-2xl border border-slate-100 dark:border-neutral-800 transition-colors">
                        <div>
                          <p className="text-sm font-black text-slate-700 dark:text-neutral-200 uppercase">High Precision Charts</p>
                          <p className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-widest mt-1">Enable smooth svg animations</p>
                        </div>
                        <div onClick={() => togglePref('highPrecision')} className={`w-12 h-6 rounded-full relative cursor-pointer shadow-inner transition-colors duration-300 ${prefs.highPrecision ? 'bg-ascon-teal' : 'bg-slate-300 dark:bg-neutral-700'}`}>
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${prefs.highPrecision ? 'right-1' : 'left-1'}`}></div>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-8 rounded-3xl shadow-sm bg-ascon-red/5 border-ascon-red/20 dark:bg-ascon-red/10 dark:border-ascon-red/30">
                      <div className="flex items-center gap-3 mb-4 border-b border-ascon-red/10 pb-4">
                        <div className="p-2 bg-ascon-red/10 rounded-lg"><HardDrive size={18} className="text-ascon-red"/></div>
                        <h3 className="font-black text-ascon-red uppercase text-xs tracking-widest">Maintenance & Storage Area</h3>
                      </div>
                      <p className="text-xs font-bold text-slate-500 dark:text-neutral-400 mb-6 leading-relaxed">Membersihkan cache akan menghapus sementara riwayat sesi log, mengeluarkan Anda dari sistem, namun tidak menghapus data asli di dalam SQL Database.</p>
                      <Button onClick={handleClearCache} variant="outline" className="w-auto px-8 h-12 border-ascon-red/30 text-ascon-red hover:bg-ascon-red hover:text-white dark:hover:bg-ascon-red dark:hover:text-white rounded-xl font-black uppercase text-[10px] tracking-widest transition-all">Clear System Cache</Button>
                    </Card>
                  </div>
                )}

                {/* ─── TAB 2: PDF TEMPLATES ─── */}
                {activeTab === 'templates' && (
                  <div className="animate-in fade-in duration-300">
                    <Card className="p-8 rounded-3xl border-slate-200 dark:border-neutral-800 shadow-sm bg-white dark:bg-neutral-900">
                      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b border-slate-100 dark:border-neutral-800 pb-4 gap-4">
                        <div>
                          <h3 className="font-black text-slate-800 dark:text-white uppercase text-xs tracking-widest flex items-center gap-2"><LayoutTemplate size={16} className="text-ascon-teal"/> PDF Report Templates</h3>
                          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Manajemen Kop Surat & Cover Perusahaan</p>
                        </div>
                        <Button onClick={() => router.push('/settings/template/new')} className="bg-ascon-teal hover:bg-[#1d4f59] text-white rounded-xl h-10 px-6 font-black uppercase text-[10px] tracking-widest shadow-md shadow-ascon-teal/30">+ ADD NEW TEMPLATE</Button>
                      </div>
                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-black">
                        {isLoadingTemplates ? (
                           <div className="flex justify-center p-10"><Loader2 className="animate-spin text-ascon-teal" size={30} /></div>
                        ) : (
                          <table className="w-full text-left border-collapse">
                            <thead><tr className="border-b border-slate-200 dark:border-neutral-800 bg-slate-100 dark:bg-neutral-900"><th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500">ID</th><th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Nama Perusahaan (Klien)</th><th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Aksi</th></tr></thead>
                            <tbody>
                              {templates.length === 0 ? (
                                <tr><td colSpan={3} className="py-8 text-center text-xs font-bold text-slate-500">Belum ada template yang ditambahkan. Silakan klik tombol Add New Template.</td></tr>
                              ) : templates.map((tpl: any) => (
                                <tr key={tpl.id} className="border-b border-slate-100 dark:border-neutral-800/50 hover:bg-white dark:hover:bg-neutral-800/50 transition-colors">
                                  <td className="py-4 px-4 text-xs font-bold font-mono text-slate-500 dark:text-neutral-400">#{tpl.id}</td>
                                  <td className="py-4 px-4 text-sm font-black text-slate-800 dark:text-white uppercase">{tpl.nama_perusahaan}</td>
                                  <td className="py-4 px-4 flex justify-end gap-2">
                                    <Button onClick={() => router.push(`/settings/template/${tpl.id}`)} variant="outline" className="h-8 px-3 text-[10px] font-black uppercase rounded-lg border-ascon-teal/30 text-ascon-teal hover:bg-ascon-teal/10 dark:border-teal-900/50 dark:hover:bg-teal-900/20"><Edit size={12} className="mr-1.5"/> Edit</Button>
                                    <Button onClick={() => handleDeleteTemplate(tpl.id)} variant="outline" className="h-8 px-3 text-[10px] font-black uppercase rounded-lg border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20"><Trash2 size={12}/></Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </Card>
                  </div>
                )}

                {/* ─── TAB 3: CONFIGURASI VPN IP ACCESS WHITELIST ─── */}
                {activeTab === 'vpn' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <Card className="p-8 rounded-3xl border-slate-200 dark:border-neutral-800 shadow-sm bg-white dark:bg-neutral-900">
                      <h3 className="font-black text-slate-800 dark:text-white uppercase text-xs tracking-widest mb-6 border-b border-slate-100 dark:border-neutral-800 pb-4 flex items-center gap-2"><ShieldCheck size={16} className="text-ascon-teal"/> Network Access Whitelist (allowedDevOrigins)</h3>
                      <div className="flex flex-col md:flex-row gap-3 mb-8">
                        <Input placeholder="Masukkan IP VPN Baru (Contoh: 10.10.10.131)" value={newVpnIp} onChange={(e) => setNewVpnIp(e.target.value)} className="flex-1 h-12 px-4 rounded-xl border border-slate-200 dark:border-neutral-800 font-mono font-bold text-sm" />
                        <Button onClick={handleAddVpn} className="bg-ascon-teal hover:bg-[#1d4f59] text-white px-8 rounded-xl font-black uppercase text-[10px] tracking-widest h-12 shadow-lg"><Plus size={16} className="mr-2"/> ADD NEW IP</Button>
                      </div>
                      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-black">
                        {isVpnLoading ? (
                          <div className="flex justify-center p-10"><Loader2 className="animate-spin text-ascon-teal" size={30} /></div>
                        ) : (
                          <table className="w-full text-left border-collapse">
                            <thead><tr className="bg-slate-100 dark:bg-neutral-900 border-b border-slate-200 dark:border-neutral-800"><th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Allowed IP Address / Domain</th><th className="p-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Aksi Penanganan</th></tr></thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/50">
                              {vpnList.length === 0 ? (
                                <tr><td colSpan={2} className="py-8 text-center text-xs font-bold text-slate-500">Tidak ada IP tambahan. Server menggunakan konfigurasi default.</td></tr>
                              ) : vpnList.map((ip) => (
                                <tr key={ip} className="hover:bg-white dark:hover:bg-neutral-800/40 transition-colors">
                                  <td className="p-4 font-mono font-bold text-sm text-slate-700 dark:text-neutral-300">{ip}</td>
                                  <td className="p-4 text-right"><Button onClick={() => handleDeleteVpn(ip)} variant="outline" className="h-8 w-8 p-0 rounded-lg border-red-200 text-red-500 hover:bg-red-50 dark:border-red-950 dark:hover:bg-red-950/40" title="Cabut Akses IP"><Trash2 size={14}/></Button></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </Card>
                  </div>
                )}

                {/* ─── TAB 4: NOTIFICATIONS ─── */}
                {activeTab === 'notifications' && (
                  <div className="animate-in fade-in duration-300">
                    <Card className="p-8 rounded-3xl border-slate-200 dark:border-neutral-800 shadow-sm bg-white dark:bg-neutral-900">
                      <h3 className="font-black text-slate-800 dark:text-white uppercase text-xs tracking-widest mb-6 border-b border-slate-100 dark:border-neutral-800 pb-4 flex items-center gap-2"><Bell size={16} className="text-ascon-teal"/> Alert Configurations</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-black rounded-2xl border border-slate-100 dark:border-neutral-800 transition-colors">
                          <div>
                            <p className="text-sm font-black text-slate-700 dark:text-neutral-200 uppercase">Downtime System Alerts</p>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-widest mt-1">Show pop-up when node goes offline</p>
                          </div>
                          <div onClick={() => togglePref('systemAlerts')} className={`w-12 h-6 rounded-full relative cursor-pointer shadow-inner transition-colors duration-300 ${prefs.systemAlerts ? 'bg-ascon-teal' : 'bg-slate-300 dark:bg-neutral-700'}`}>
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${prefs.systemAlerts ? 'right-1' : 'left-1'}`}></div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                {/* ─── TAB 5: SECURITY & PIN ─── */}
                {activeTab === 'security' && (
                  <div className="animate-in fade-in duration-300 space-y-6">
                    <Card className="p-8 rounded-3xl border-slate-200 dark:border-neutral-800 shadow-sm bg-white dark:bg-neutral-900">
                      <h3 className="font-black text-slate-800 dark:text-white uppercase text-xs tracking-widest mb-6 border-b border-slate-100 dark:border-neutral-800 pb-4 flex items-center gap-2"><Lock size={16} className="text-ascon-teal"/> Security & Access</h3>
                      <div className="space-y-4">
                        
                        {/* FITUR BARU: TOGGLE AKTIVASI PIN */}
                        <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-black rounded-2xl border border-slate-100 dark:border-neutral-800 transition-colors">
                          <div>
                            <p className="text-sm font-black text-slate-700 dark:text-neutral-200 uppercase">Aktivasi PIN Export PDF</p>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-widest mt-1">Wajibkan verifikasi PIN saat akan mengunduh laporan PDF</p>
                          </div>
                          <div onClick={toggleExportPin} className={`w-12 h-6 rounded-full relative cursor-pointer shadow-inner transition-colors duration-300 ${isExportPinEnabled ? 'bg-ascon-teal' : 'bg-slate-300 dark:bg-neutral-700'}`}>
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${isExportPinEnabled ? 'right-1' : 'left-1'}`}></div>
                          </div>
                        </div>

                        {/* FORM UBAH PIN */}
                        <div className="p-6 bg-ascon-teal/5 dark:bg-teal-900/10 rounded-2xl border border-ascon-teal/10 dark:border-teal-800/40 relative overflow-hidden">
                          {isFetchingPin && <div className="absolute inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-sm z-10 flex items-center justify-center"><Loader2 className="animate-spin text-ascon-teal" size={24} /></div>}
                          <h4 className="font-black text-ascon-teal dark:text-teal-400 text-sm uppercase mb-2">Restricted Area PIN</h4>
                          <p className="text-xs font-bold text-slate-500 dark:text-neutral-400 mb-6">Ubah PIN keamanan 6 digit yang digunakan untuk mengakses halaman Export PDF.</p>
                          <div className="space-y-4 max-w-sm">
                            <div className="relative">
                              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-neutral-500" size={18} />
                              <input 
                                type="text" 
                                maxLength={6} 
                                placeholder="Ketik 6 Digit PIN Baru..." 
                                value={dbPin} 
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDbPin(e.target.value.replace(/[^0-9]/g, ''))} 
                                className="flex h-14 w-full bg-white dark:bg-black font-black tracking-[0.5em] text-lg text-ascon-teal dark:text-teal-400 rounded-xl border border-slate-200 dark:border-neutral-700 px-3 py-2 pl-12 focus:outline-none focus:border-ascon-teal transition-colors" 
                              />
                            </div>
                            <Button onClick={handleUpdatePin} disabled={isSavingPin || dbPin.length !== 6} className="w-full h-12 bg-ascon-teal hover:bg-[#1d4f59] text-white font-black tracking-widest text-xs rounded-xl shadow-md uppercase transition-all">
                              {isSavingPin ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save className="mr-2" size={16} />}
                              Update PIN Keamanan
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}