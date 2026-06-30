'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { 
  Save, ArrowLeft, Sliders, AlertOctagon, Palette, 
  Settings2, Activity, Tags, CheckCircle2, Loader2, Info
} from 'lucide-react';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const pjs = Plus_Jakarta_Sans({ subsets: ['latin'] });

// Tipe data untuk Advanced Config
interface TagConfig {
  alias: string;
  unit: string;
  color: string;
  visible: boolean;
  minAlert: number | '';
  maxAlert: number | '';
  scale: number;
  offset: number;
}

export default function AdvancedDbSettings() {
  const params = useParams();
  const router = useRouter();
  const tableName = decodeURIComponent(params.id as string);

  const [activeTab, setActiveTab] = useState<'mapping' | 'alarms' | 'calibration'>('mapping');
  const [columns, setColumns] = useState<{field: string, type: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // State utama untuk menyimpan konfigurasi tiap kolom
  const [tagConfigs, setTagConfigs] = useState<Record<string, TagConfig>>({});

  useEffect(() => {
    // 1. Ambil nama database aktif dari localStorage (General Setup)
    const activeDb = localStorage.getItem('matrix_active_db');
    
    if (!activeDb) {
      alert("Database belum dipilih di General Setup!");
      router.push('/settings');
      return;
    }

    // 2. Scan kolom khusus untuk tabel ini
    const fetchColumns = async () => {
      try {
        const res = await fetch(`/api/settings/scan-columns?db=${activeDb}&table=${tableName}`);
        const result = await res.json();
        
        if (result.success) {
          // Filter hanya kolom angka (sensor)
          const numCols = result.columns.filter((c: any) => 
            !['id', 'timestamp', 'createdat', 'updatedat'].includes(c.field.toLowerCase()) &&
            ['INT', 'FLOAT', 'DOUBLE', 'DECIMAL', 'BIGINT'].some(type => c.type.includes(type))
          );
          setColumns(numCols);

          // 3. Load konfigurasi yang sudah pernah disave (jika ada)
          const savedConfig = localStorage.getItem(`adv_cfg_${activeDb}_${tableName}`);
          let parsedConfig = savedConfig ? JSON.parse(savedConfig) : {};

          // Inisialisasi state default untuk kolom baru yang belum disetting
          const initialConfigs: Record<string, TagConfig> = {};
          numCols.forEach((col: any) => {
            initialConfigs[col.field] = parsedConfig[col.field] || {
              alias: col.field.replace(/_/g, ' ').toUpperCase(),
              unit: '',
              color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'),
              visible: true,
              minAlert: '',
              maxAlert: '',
              scale: 1,
              offset: 0
            };
          });
          setTagConfigs(initialConfigs);
        }
      } catch (err) {
        console.error("Gagal load kolom:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchColumns();
  }, [tableName, router]);

  const handleUpdateTag = (field: string, key: keyof TagConfig, value: any) => {
    setTagConfigs(prev => ({
      ...prev,
      [field]: { ...prev[field], [key]: value }
    }));
  };

  const handleSaveAdvanced = () => {
    setIsSaving(true);
    const activeDb = localStorage.getItem('matrix_active_db');
    
    // Simpan ke LocalStorage dengan format unik per Database & Tabel
    // Nantinya ini bisa dipindah ke API untuk disimpan ke tabel `advanced_config` MySQL kalian
    localStorage.setItem(`adv_cfg_${activeDb}_${tableName}`, JSON.stringify(tagConfigs));
    
    setTimeout(() => {
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 800);
  };

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-teal-600" size={40}/></div>;
  }

  return (
    <div className={`flex h-screen bg-slate-50 dark:bg-black overflow-hidden transition-colors duration-300 ${pjs.className}`}>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Advanced Parameters" />

        <main className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="max-w-6xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            
            {/* ─── HEADER AREA ─── */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
              <div className="flex items-center gap-4">
                <button onClick={() => router.push('/settings')} className="w-12 h-12 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex items-center justify-center text-slate-500 hover:text-teal-600 hover:border-teal-500 transition-all shadow-sm">
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h1 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-3">
                    <Settings2 className="text-teal-500"/> Tuning: {tableName}
                  </h1>
                  <p className="text-sm font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mt-1">
                    Advanced Telemetry Calibration & Thresholds
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {showSuccess && (
                  <span className="text-emerald-500 text-xs font-black uppercase tracking-widest flex items-center animate-in fade-in zoom-in">
                    <CheckCircle2 size={16} className="mr-1" /> Config Saved
                  </span>
                )}
                <Button 
                  onClick={handleSaveAdvanced} 
                  disabled={isSaving}
                  className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl px-8 h-12 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-teal-600/30 transition-all"
                >
                  {isSaving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save className="mr-2" size={16} />}
                  Save Tuning
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              
              {/* ─── SIDEBAR TAB MENU ─── */}
              <div className="xl:col-span-1 space-y-3">
                <Card className="p-4 rounded-3xl border-slate-200 dark:border-neutral-800 shadow-sm bg-white dark:bg-neutral-900">
                  <div className="space-y-2">
                    <button onClick={() => setActiveTab('mapping')} className={`w-full flex items-center justify-between p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'mapping' ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800' : 'text-slate-500 hover:bg-slate-50 dark:text-neutral-400 dark:hover:bg-neutral-800 border border-transparent'}`}>
                      <span className="flex items-center gap-3"><Tags size={16} /> Display & Units</span>
                    </button>
                    <button onClick={() => setActiveTab('alarms')} className={`w-full flex items-center justify-between p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'alarms' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800' : 'text-slate-500 hover:bg-slate-50 dark:text-neutral-400 dark:hover:bg-neutral-800 border border-transparent'}`}>
                      <span className="flex items-center gap-3"><AlertOctagon size={16} /> Threshold Limits</span>
                    </button>
                    <button onClick={() => setActiveTab('calibration')} className={`w-full flex items-center justify-between p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'calibration' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800' : 'text-slate-500 hover:bg-slate-50 dark:text-neutral-400 dark:hover:bg-neutral-800 border border-transparent'}`}>
                      <span className="flex items-center gap-3"><Sliders size={16} /> Sensor Calibration</span>
                    </button>
                  </div>
                </Card>

                <div className="p-6 rounded-3xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800">
                  <Info size={20} className="text-teal-500 mb-3" />
                  <p className="text-xs font-bold text-slate-500 dark:text-neutral-400 leading-relaxed">
                    Pengaturan di sini akan mempengaruhi bagaimana data mentah dari database <strong className="text-slate-700 dark:text-white">{tableName}</strong> ditampilkan, dihitung, dan diwarnai di seluruh Dashboard Matrix.
                  </p>
                </div>
              </div>

              {/* ─── KONTEN SETTINGS ─── */}
              <div className="xl:col-span-3">
                <Card className="p-8 rounded-3xl border-slate-200 dark:border-neutral-800 shadow-sm bg-white dark:bg-neutral-900 overflow-hidden">
                  
                  {/* TAB 1: MAPPING & UNITS */}
                  {activeTab === 'mapping' && (
                    <div className="animate-in fade-in zoom-in-95 duration-300">
                      <div className="mb-6 pb-4 border-b border-slate-100 dark:border-neutral-800">
                        <h3 className="font-black text-slate-800 dark:text-white uppercase text-sm tracking-widest flex items-center gap-2"><Palette size={18} className="text-teal-500"/> Custom Display & Formatting</h3>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Ubah nama kolom mentah menjadi label yang cantik untuk UI Dashboard.</p>
                      </div>

                      <div className="space-y-4">
                        {columns.map((col) => (
                          <div key={col.field} className={`p-4 rounded-2xl border transition-colors ${tagConfigs[col.field]?.visible ? 'bg-slate-50 border-slate-200 dark:bg-black dark:border-neutral-800' : 'bg-slate-100 border-dashed border-slate-300 opacity-60 dark:bg-neutral-900 dark:border-neutral-700'}`}>
                            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                              
                              <div className="w-full lg:w-1/4">
                                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Database Column</p>
                                <div className="flex items-center gap-3">
                                  <input type="checkbox" checked={tagConfigs[col.field]?.visible} onChange={(e) => handleUpdateTag(col.field, 'visible', e.target.checked)} className="w-5 h-5 accent-teal-500 cursor-pointer rounded-lg" title="Tampilkan/Sembunyikan di Chart"/>
                                  <p className="text-sm font-black font-mono text-slate-700 dark:text-white truncate">{col.field}</p>
                                </div>
                              </div>

                              <div className="w-full lg:w-2/4">
                                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Display Alias (UI Label)</p>
                                <Input value={tagConfigs[col.field]?.alias} onChange={(e) => handleUpdateTag(col.field, 'alias', e.target.value)} className="h-10 border-slate-200 dark:border-neutral-700 font-bold bg-white dark:bg-neutral-900" placeholder="Contoh: Tekanan Pompa 1" />
                              </div>

                              <div className="w-full lg:w-1/4 flex gap-3">
                                <div className="flex-1">
                                  <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Unit</p>
                                  <Input value={tagConfigs[col.field]?.unit} onChange={(e) => handleUpdateTag(col.field, 'unit', e.target.value)} className="h-10 text-center border-slate-200 dark:border-neutral-700 font-bold font-mono" placeholder="℃, Bar..." />
                                </div>
                                <div>
                                  <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Color</p>
                                  <input type="color" value={tagConfigs[col.field]?.color} onChange={(e) => handleUpdateTag(col.field, 'color', e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0" />
                                </div>
                              </div>

                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: THRESHOLD ALARMS */}
                  {activeTab === 'alarms' && (
                    <div className="animate-in fade-in zoom-in-95 duration-300">
                      <div className="mb-6 pb-4 border-b border-slate-100 dark:border-neutral-800">
                        <h3 className="font-black text-slate-800 dark:text-white uppercase text-sm tracking-widest flex items-center gap-2"><AlertOctagon size={18} className="text-amber-500"/> Threshold & Alarm Limits</h3>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Tentukan batas bawah dan atas. (Kosongkan jika tidak ada batas).</p>
                      </div>

                      <div className="space-y-4">
                        {columns.filter(c => tagConfigs[c.field]?.visible).map((col) => (
                          <div key={col.field} className="p-5 rounded-2xl bg-amber-50/30 border border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/30">
                            <div className="flex flex-col md:flex-row items-center gap-6">
                              <div className="w-full md:w-1/3">
                                <p className="text-sm font-black text-slate-700 dark:text-white">{tagConfigs[col.field]?.alias || col.field}</p>
                                <p className="text-[9px] font-bold font-mono uppercase text-slate-400 mt-1">Col: {col.field}</p>
                              </div>
                              <div className="w-full md:w-2/3 flex items-center gap-4">
                                <div className="flex-1 relative">
                                  <span className="absolute -top-2.5 left-3 bg-white dark:bg-black px-2 text-[9px] font-black uppercase text-blue-500">Min Alert Limit</span>
                                  <Input type="number" placeholder="Batas Bawah..." value={tagConfigs[col.field]?.minAlert} onChange={(e) => handleUpdateTag(col.field, 'minAlert', e.target.value ? Number(e.target.value) : '')} className="h-12 border-blue-200 dark:border-blue-900/50 bg-white dark:bg-black font-black font-mono text-center" />
                                </div>
                                <div className="w-8 h-[2px] bg-slate-200 dark:bg-neutral-800 rounded-full"></div>
                                <div className="flex-1 relative">
                                  <span className="absolute -top-2.5 left-3 bg-white dark:bg-black px-2 text-[9px] font-black uppercase text-red-500">Max Alert Limit</span>
                                  <Input type="number" placeholder="Batas Atas..." value={tagConfigs[col.field]?.maxAlert} onChange={(e) => handleUpdateTag(col.field, 'maxAlert', e.target.value ? Number(e.target.value) : '')} className="h-12 border-red-200 dark:border-red-900/50 bg-white dark:bg-black font-black font-mono text-center" />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: CALIBRATION */}
                  {activeTab === 'calibration' && (
                    <div className="animate-in fade-in zoom-in-95 duration-300">
                      <div className="mb-6 pb-4 border-b border-slate-100 dark:border-neutral-800">
                        <h3 className="font-black text-slate-800 dark:text-white uppercase text-sm tracking-widest flex items-center gap-2"><Sliders size={18} className="text-purple-500"/> Sensor Math Calibration</h3>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Rumus: <span className="font-mono bg-slate-100 dark:bg-neutral-800 px-2 py-0.5 rounded text-purple-600 dark:text-purple-400">(Raw_Value × Multiplier) + Offset</span></p>
                      </div>

                      <div className="space-y-4">
                        {columns.filter(c => tagConfigs[c.field]?.visible).map((col) => (
                          <div key={col.field} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 dark:bg-black dark:border-neutral-800">
                            <div className="flex flex-col md:flex-row items-center gap-6">
                              <div className="w-full md:w-1/3">
                                <p className="text-sm font-black text-slate-700 dark:text-white">{tagConfigs[col.field]?.alias || col.field}</p>
                                <p className="text-[9px] font-bold font-mono uppercase text-slate-400 mt-1">Tipe: {col.type}</p>
                              </div>
                              <div className="w-full md:w-2/3 flex items-center gap-4">
                                <div className="flex-1">
                                  <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Multiplier (Scale)</p>
                                  <Input type="number" step="0.01" value={tagConfigs[col.field]?.scale} onChange={(e) => handleUpdateTag(col.field, 'scale', Number(e.target.value))} className="h-11 font-mono font-bold" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Offset (+ / -)</p>
                                  <Input type="number" step="0.01" value={tagConfigs[col.field]?.offset} onChange={(e) => handleUpdateTag(col.field, 'offset', Number(e.target.value))} className="h-11 font-mono font-bold" />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </Card>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
