'use client';

import React, { useState } from 'react';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Card } from '@/components/ui/card';
import { RefreshCw, MonitorSmartphone, Terminal, GitPullRequest, ArrowRight, CheckCircle2, ShieldAlert, Cpu, UploadCloud, FileArchive, Globe, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';

const pjs = Plus_Jakarta_Sans({ subsets: ['latin'] });

export default function WebUiUpdatePage() {
  const currentVersion = "v1.0.4-stable";
  
  // State untuk mode update
  const [updateMode, setUpdateMode] = useState<'online' | 'manual'>('online');
  
  // State Mode Online
  const [isChecking, setIsChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState<{ version: string, notes: string[] } | null>(null);
  
  // State Mode Manual
  const [file, setFile] = useState<File | null>(null);

  // State Eksekusi Terminal
  const [isUpdating, setIsUpdating] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // --- LOGIKA MODE ONLINE ---
  const checkForUpdates = () => {
    setIsChecking(true);
    setUpdateAvailable(null);
    setTerminalLogs([]);
    setUpdateSuccess(false);

    setTimeout(() => {
      setIsChecking(false);
      setUpdateAvailable({
        version: "v1.2.0-stable",
        notes: [
          "Optimasi rendering grafik Recharts (pengurangan lag 40%)",
          "Penambahan fitur Active Polling dengan AbortController",
          "Perbaikan bug status indikator Modbus TCP",
          "Peningkatan keamanan API dari serangan CSRF"
        ]
      });
    }, 2000);
  };

  // --- LOGIKA MODE MANUAL ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  // --- EKSEKUSI TERMINAL BUILD ---
  const startWebUiUpdate = () => {
    if (updateMode === 'manual' && !file) {
      return alert("Silakan unggah file patch WebUI (.tar.gz / .zip) terlebih dahulu!");
    }

    if (!confirm("Proses ini akan menghentikan sementara layanan WebUI selama beberapa detik. Lanjutkan?")) return;
    
    setIsUpdating(true);
    setTerminalLogs([`[SYSTEM] Memulai proses pembaruan WebUI via mode ${updateMode.toUpperCase()}...`]);
    
    let steps: string[] = [];

    // Jika lewat internet (Git)
    if (updateMode === 'online') {
      steps = [
        "> git fetch origin main",
        "> git pull origin main",
        "Updating 3f4a1b2..8c7d9e1",
        "Fast-forward",
        " app/page.tsx | 12 +++---",
        " package.json |  2 +-",
        "[SYSTEM] Repositori berhasil ditarik dari GitHub/GitLab."
      ];
    } 
    // Jika lewat file upload (Manual)
    else {
      steps = [
        `> Menerima file unggahan: ${file?.name} (${((file?.size || 0) / 1024 / 1024).toFixed(2)} MB)`,
        "[SYSTEM] File patch berhasil diterima server.",
        "> mkdir -p /tmp/ascon-update",
        `> tar -xzf /tmp/uploads/${file?.name} -C /tmp/ascon-update`,
        "> rsync -a /tmp/ascon-update/ /var/www/ascon-hub/",
        "> rm -rf /tmp/ascon-update",
        "[SYSTEM] File sistem WebUI berhasil ditimpa dengan versi offline."
      ];
    }

    // Langkah build yang sama untuk kedua mode
    const buildSteps = [
      "> npm install --production",
      "audited 345 packages in 2.1s",
      "found 0 vulnerabilities",
      "> npm run build",
      "▲ Next.js 14.x.x",
      "Creating an optimized production build...",
      "Compiled successfully",
      "Route (app)                              Size     First Load JS",
      "┌ ○ /                                    145 kB          210 kB",
      "└ ○ /analytics                           112 kB          180 kB",
      "[SYSTEM] Build produksi selesai.",
      "> pm2 restart ascon-hub-web",
      "[PM2] Applying action restartProcessId on app [ascon-hub-web](ids: 0)",
      "[PM2] ascon-hub-web ✓",
      "[SYSTEM] Layanan berhasil direstart! Memuat ulang antarmuka..."
    ];

    const finalSteps = [...steps, ...buildSteps];

    let stepIndex = 0;
    const logInterval = setInterval(() => {
      if (stepIndex < finalSteps.length) {
        setTerminalLogs(prev => [...prev, finalSteps[stepIndex]]);
        stepIndex++;
      } else {
        clearInterval(logInterval);
        setUpdateSuccess(true);
        setTimeout(() => {
          setIsUpdating(false);
          window.location.reload();
        }, 3000);
      }
    }, 600);
  };

  return (
    <div className={`flex h-screen bg-slate-50 overflow-hidden ${pjs.className}`}>
      <main className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-ascon-teal/5 via-slate-50 to-slate-100 p-6 md:p-10 relative">
        <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
          
          <div className="mb-8 flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-ascon-teal/10 p-3 rounded-2xl text-ascon-teal">
                <MonitorSmartphone size={28}/>
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">System WebUI Update</h2>
                <p className="text-sm font-medium text-slate-500 mt-1">Kelola versi antarmuka dashboard Ascon Matrix Anda.</p>
              </div>
            </div>

            {/* TAB SELECTOR */}
            {!isUpdating && !updateSuccess && (
              <div className="flex bg-slate-200/50 p-1 rounded-2xl shadow-inner border border-slate-200">
                <button 
                  onClick={() => setUpdateMode('online')} 
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${updateMode === 'online' ? 'bg-white text-ascon-teal shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Globe size={16}/> Online (Git)
                </button>
                <button 
                  onClick={() => setUpdateMode('manual')} 
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${updateMode === 'manual' ? 'bg-white text-ascon-teal shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <HardDrive size={16}/> Manual File
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Kolom Kiri: Informasi Sistem Saat Ini */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="p-6 rounded-[2rem] bg-white border border-slate-100 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-ascon-teal/5 rounded-full blur-2xl"></div>
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600 mb-4 border shadow-sm">
                    <Cpu size={24}/>
                  </div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Versi WebUI Saat Ini</p>
                  <h3 className="text-3xl font-black text-slate-800 tracking-tighter mb-4">{currentVersion}</h3>
                  
                  <div className="space-y-3 border-t pt-4 mt-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-500">Environment</span>
                      <span className="font-black text-ascon-teal bg-ascon-teal/10 px-2 py-1 rounded-md">Production</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-500">Framework</span>
                      <span className="font-black text-slate-700">Next.js 14</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-500">Node.js</span>
                      <span className="font-black text-slate-700">v20.11.0</span>
                    </div>
                  </div>
                </div>
              </Card>

              {updateMode === 'online' && !isUpdating && !updateSuccess && (
                <Button 
                  onClick={checkForUpdates}
                  disabled={isChecking}
                  className="w-full h-14 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 font-black tracking-widest text-xs uppercase shadow-sm transition-all"
                >
                  {isChecking ? <><RefreshCw className="animate-spin mr-2" size={16}/> Memeriksa Server...</> : <><RefreshCw className="mr-2" size={16}/> Cek Pembaruan Server</>}
                </Button>
              )}
            </div>

            {/* Kolom Kanan: Area Update & Terminal */}
            <div className="lg:col-span-2">
              <Card className="p-8 rounded-[2rem] bg-white border border-slate-100 shadow-xl min-h-[400px] flex flex-col">
                
                {/* --- TAMPILAN MODE ONLINE --- */}
                {updateMode === 'online' && !updateAvailable && !isUpdating && !updateSuccess && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60">
                    <GitPullRequest size={64} className="text-slate-300 mb-4"/>
                    <h4 className="font-black text-lg text-slate-600">Sistem Anda Terkelola Via Git</h4>
                    <p className="text-sm font-medium text-slate-400 mt-2 max-w-sm">Klik tombol "Cek Pembaruan" untuk melihat apakah ada versi WebUI terbaru dari repositori Ascon.</p>
                  </div>
                )}

                {updateMode === 'online' && updateAvailable && !isUpdating && !updateSuccess && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="bg-ascon-teal/10 border border-ascon-teal/20 p-6 rounded-3xl mb-8 flex items-start gap-4">
                      <div className="bg-white p-2 rounded-full text-ascon-teal shadow-sm shrink-0"><ShieldAlert size={24}/></div>
                      <div>
                        <h4 className="font-black text-lg text-ascon-teal mb-1">Pembaruan WebUI Tersedia!</h4>
                        <p className="text-sm text-slate-600 font-medium">Versi <b className="text-slate-800">{updateAvailable.version}</b> siap untuk ditarik dan diinstal.</p>
                      </div>
                    </div>

                    <div className="mb-8">
                      <h5 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Release Notes (Changelog):</h5>
                      <ul className="space-y-3">
                        {updateAvailable.notes.map((note, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-sm font-medium text-slate-700">
                            <ArrowRight size={16} className="text-ascon-purple shrink-0 mt-0.5"/> {note}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button onClick={startWebUiUpdate} className="w-full h-16 rounded-2xl bg-ascon-teal hover:bg-[#205560] text-white font-black uppercase tracking-widest text-sm shadow-xl shadow-ascon-teal/30 transition-transform active:scale-95">
                      Mulai Proses Update & Build
                    </Button>
                  </div>
                )}

                {/* --- TAMPILAN MODE MANUAL (FILE UPLOAD) --- */}
                {updateMode === 'manual' && !isUpdating && !updateSuccess && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col h-full">
                    <div className="mb-6">
                      <h4 className="font-black text-lg text-slate-800 mb-1">Manual Patch Update</h4>
                      <p className="text-sm text-slate-500 font-medium">Unggah file <code className="text-ascon-teal bg-ascon-teal/10 px-1 rounded">.tar.gz</code> atau <code className="text-ascon-teal bg-ascon-teal/10 px-1 rounded">.zip</code> yang berisi source code WebUI terbaru. Sistem akan menimpa file lama dan melakukan build ulang secara otomatis.</p>
                    </div>

                    <label className={`flex-1 border-2 border-dashed rounded-[2rem] p-10 flex flex-col items-center justify-center transition-all cursor-pointer ${file ? 'border-ascon-teal bg-ascon-teal/5' : 'border-slate-200 hover:border-ascon-teal hover:bg-slate-50'}`}>
                      <input type="file" accept=".zip,.tar,.gz" className="hidden" onChange={handleFileChange} />
                      
                      {file ? (
                        <div className="text-center animate-in zoom-in-95">
                          <FileArchive size={48} className="text-ascon-teal mx-auto mb-4" />
                          <p className="font-black text-slate-800">{file.name}</p>
                          <p className="text-xs font-bold text-slate-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-ascon-purple mt-4">Klik untuk mengganti file</p>
                        </div>
                      ) : (
                        <div className="text-center opacity-70">
                          <UploadCloud size={48} className="text-slate-400 mx-auto mb-4" />
                          <p className="font-black text-slate-600">Klik atau Drag & Drop file patch di sini</p>
                          <p className="text-xs font-bold text-slate-400 mt-1">Maksimal ukuran file: 50MB</p>
                        </div>
                      )}
                    </label>

                    <Button onClick={startWebUiUpdate} disabled={!file} className="w-full h-16 mt-6 rounded-2xl bg-ascon-teal hover:bg-[#205560] text-white font-black uppercase tracking-widest text-sm shadow-xl shadow-ascon-teal/30 transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100">
                      Ekstrak & Install Patch
                    </Button>
                  </div>
                )}

                {/* --- TAMPILAN TERMINAL (SAAT UPDATE KEDUA MODE) --- */}
                {(isUpdating || updateSuccess) && (
                  <div className="flex-1 flex flex-col h-full animate-in zoom-in-95 duration-300">
                    <div className="flex items-center justify-between bg-slate-800 text-slate-400 px-6 py-4 rounded-t-[2rem] border-b border-slate-700">
                      <div className="flex items-center gap-2 text-xs font-black tracking-widest uppercase">
                        <Terminal size={16}/> WebUI Build Console ({updateMode})
                      </div>
                      <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      </div>
                    </div>
                    
                    <div className="bg-slate-900 flex-1 rounded-b-[2rem] p-6 font-mono text-xs md:text-sm text-emerald-400 overflow-y-auto max-h-[350px] shadow-inner flex flex-col gap-1.5">
                      {terminalLogs.map((log, idx) => (
                        <div key={idx} className={`${log.startsWith('>') ? 'text-white font-bold mt-2' : log.startsWith('[SYSTEM]') ? 'text-blue-400 font-bold' : log.startsWith('▲') ? 'text-white font-black text-base' : 'opacity-80'}`}>
                          {log}
                        </div>
                      ))}
                      {isUpdating && <div className="w-2 h-4 bg-emerald-400 animate-pulse mt-1"></div>}
                    </div>

                    {updateSuccess && (
                      <div className="mt-6 bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl flex items-center justify-center gap-3 animate-in fade-in slide-in-from-bottom-4">
                        <CheckCircle2 size={24} />
                        <span className="font-bold">Update selesai! Halaman akan dimuat ulang secara otomatis...</span>
                      </div>
                    )}
                  </div>
                )}

              </Card>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}