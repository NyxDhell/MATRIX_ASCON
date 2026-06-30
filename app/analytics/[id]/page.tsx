'use client';

import React, { useState, useEffect } from 'react';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { useParams, useRouter } from 'next/navigation';
import {
  FileText, Loader2, AlertTriangle, Activity, CheckCircle2,
  Clock, Server, CalendarDays, ArrowLeft, Download, RefreshCw,
  Cpu, Layers, ActivitySquare, Database, X, Calendar, Upload, FileSearch, User
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Brush
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Header from '@/components/Header';

const pjs = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] });

const TEAL = '#2A6C7A'; const TEAL_LIGHT = '#E8F4F6'; const TEAL_MID = '#5DCAA5';
const RED = '#CD3053'; const RED_LIGHT = '#FBF0F2'; const PURPLE = '#9F7CAC';
const AMBER = '#D97706'; const GREEN = '#15803D'; const GREEN_LIGHT = '#F0FDF4';
const CHART_COLORS = [TEAL, PURPLE, AMBER, RED, '#3B82F6', '#10B981', '#F43F5E', '#8B5CF6', '#14B8A6'];

export default function NodeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const nodeId = params.id as string;

  const [activeUser, setActiveUser] = useState('Administrator');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [nodeData, setNodeData] = useState<any>(null);
  const [nodeAlerts, setNodeAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [hiddenTags, setHiddenTags] = useState<Record<string, boolean>>({});
  const [yZoom, setYZoom] = useState<Record<string, number>>({});

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0];
  });
  const [exportEndDate, setExportEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  
  const [customPrinterName, setCustomPrinterName] = useState('Administrator');
  const [customPrintDate, setCustomPrintDate] = useState(() => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
    return `${dateStr} PUKUL ${timeStr} WIB`.toUpperCase();
  });

  const [customKopBase64, setCustomKopBase64] = useState<string | null>(null); 
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null); 
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isFinalExporting, setIsFinalExporting] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem('ascon_darkmode') === 'true';
    if (isDark) document.documentElement.classList.add('dark');
  }, []);

  const toggleTag = (tag: string) => { setHiddenTags(prev => ({ ...prev, [tag]: !prev[tag] })); };

  const fetchData = async () => {
    try {
      const res  = await fetch('/api/analytics');
      const data = await res.json();
      if (data.multiNodeCharts) {
        const targetNode = data.multiNodeCharts.find((n: any) => n.plcId === nodeId);
        setNodeData(targetNode || null);
      }
      if (data.lostLogs && nodeData) setNodeAlerts(data.lostLogs.filter((log: any) => log.plcName === nodeData.plcName));
      else if (data.lostLogs) {
          const targetNode = data.multiNodeCharts?.find((n: any) => n.plcId === nodeId);
          if (targetNode) setNodeAlerts(data.lostLogs.filter((log: any) => log.plcName === targetNode.plcName));
      }
      const ck = document.cookie.split('; ').find(r => r.startsWith('username='))?.split('=')[1];
      if (ck) setActiveUser(decodeURIComponent(ck));
    } catch (error) {} 
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 1000); 
    return () => clearInterval(interval);
  }, [nodeId]);

  useEffect(() => {
    if (activeUser && customPrinterName === 'Administrator') setCustomPrinterName(activeUser.toUpperCase());
  }, [activeUser]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleKopUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setCustomKopBase64(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGeneratePreview = async () => {
    setIsPreviewLoading(true);
    try {
      const payload = { exporterName: customPrinterName, customPrintDate: customPrintDate, startDate: exportStartDate, endDate: exportEndDate, customKop: customKopBase64, targetId: nodeId };
      const res = await fetch('/api/export-pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      if (previewPdfUrl) URL.revokeObjectURL(previewPdfUrl);
      setPreviewPdfUrl(URL.createObjectURL(blob));
    } catch { alert("Gagal memuat pratinjau. Pastikan database aktif."); } 
    finally { setIsPreviewLoading(false); }
  };

  const handleDownloadPdf = async () => {
    setIsFinalExporting(true);
    if (!previewPdfUrl) await handleGeneratePreview();
    const a = document.createElement('a'); a.href = previewPdfUrl || ''; 
    const filenameLabel = nodeData ? nodeData.plcName.replace(/\s+/g, '_') : nodeId;
    a.download = `REPORT_${filenameLabel}_${exportStartDate}_to_${exportEndDate}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
    setIsExportModalOpen(false); setIsFinalExporting(false);
  };

  if (isLoading) {
    return (
        <div className={`flex h-screen bg-slate-50 dark:bg-black overflow-hidden transition-colors ${pjs.className}`}>
            <div className="flex-1 flex flex-col items-center justify-center">
                <Loader2 size={40} className="text-teal-600 animate-spin mb-4" />
                <p className="text-slate-500 dark:text-neutral-400 font-bold tracking-widest uppercase text-sm">Menyinkronkan Data Mesin...</p>
            </div>
        </div>
    );
  }

  if (!nodeData) {
    return (
        <div className={`flex h-screen bg-slate-50 dark:bg-black overflow-hidden transition-colors ${pjs.className}`}>
            <div className="flex-1 flex flex-col items-center justify-center p-6">
                <AlertTriangle size={64} className="text-red-300 dark:text-red-500 mb-6" />
                <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white mb-2">Segment Tidak Ditemukan</h1>
                <p className="text-slate-500 dark:text-neutral-400 mb-8">Mesin dengan ID <strong className="text-teal-600 dark:text-teal-400">{nodeId}</strong> tidak tersedia di jaringan.</p>
                <Button onClick={() => router.push('/analytics')} className="bg-slate-800 dark:bg-neutral-800 text-white rounded-xl px-6"><ArrowLeft size={16} className="mr-2" /> Kembali ke Analytics</Button>
            </div>
        </div>
    );
  }

  const online = nodeData.status === 'online';
  const paramKeys = nodeData.parameterKeys || [];
  const latestDataPoint = nodeData.realtimeData && nodeData.realtimeData.length > 0 ? nodeData.realtimeData[nodeData.realtimeData.length - 1] : {};

  return (
    <div className={`flex h-screen bg-slate-50 dark:bg-black overflow-hidden transition-colors duration-300 ${pjs.className}`}>
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Header title={`Node Insight: ${nodeData.plcName}`} />

        {isExportModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4">
            <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl flex w-full max-w-[1150px] h-[88vh] overflow-hidden border border-slate-200 dark:border-neutral-800">
              <div className="w-[360px] border-r border-slate-100 dark:border-neutral-800 flex flex-col bg-white dark:bg-neutral-900">
                <div className="p-5 border-b border-slate-50 dark:border-neutral-800 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">Export Node Configuration</h3>
                    <p className="text-[10px] text-slate-400 dark:text-neutral-500 font-bold uppercase tracking-widest mt-1">Configure layout & content</p>
                  </div>
                  <button onClick={() => setIsExportModalOpen(false)} className="text-slate-300 dark:text-neutral-500 hover:text-red-500 transition-colors"><X size={20} /></button>
                </div>
                <div className="p-5 flex-1 overflow-y-auto space-y-5">
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest flex items-center gap-2"><Calendar size={13} /> Date Range</label>
                    <div className="space-y-2">
                      <input type="date" value={exportStartDate} onChange={(e)=>setExportStartDate(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-neutral-800 text-xs font-bold bg-slate-50 dark:bg-black dark:text-white outline-none focus:border-teal-400 transition-all cursor-pointer" />
                      <input type="date" value={exportEndDate} onChange={(e)=>setExportEndDate(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-neutral-800 text-xs font-bold bg-slate-50 dark:bg-black dark:text-white outline-none focus:border-teal-400 transition-all cursor-pointer" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest flex items-center gap-2"><User size={13} /> Metadata Teks Sampul</label>
                    <div className="space-y-2">
                      <div><span className="text-[9px] text-slate-400 dark:text-neutral-500 font-bold uppercase mb-1 block ml-1">Dianalisis & Dicetak Oleh:</span><input type="text" value={customPrinterName} onChange={(e)=>setCustomPrinterName(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-neutral-800 text-xs font-bold text-teal-800 dark:text-teal-300 bg-slate-50 dark:bg-black outline-none focus:border-teal-400 transition-all" /></div>
                      <div><span className="text-[9px] text-slate-400 dark:text-neutral-500 font-bold uppercase mb-1 block ml-1">Waktu Cetak Dokumen:</span><input type="text" value={customPrintDate} onChange={(e)=>setCustomPrintDate(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-neutral-800 text-xs font-bold text-teal-800 dark:text-teal-300 bg-slate-50 dark:bg-black outline-none focus:border-teal-400 transition-all" /></div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest flex items-center gap-2"><Upload size={13} /> Custom Letterhead</label>
                    <div className="group relative w-full h-24 rounded-2xl border-2 border-dashed border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-black flex flex-col items-center justify-center cursor-pointer hover:border-teal-400 transition-all overflow-hidden">
                      {customKopBase64 ? (<img src={customKopBase64} alt="Preview Kop" className="w-full h-full object-contain p-2" />) : (<><div className="w-8 h-8 rounded-full bg-white dark:bg-neutral-900 shadow-sm flex items-center justify-center text-slate-400 group-hover:text-teal-600 transition-colors"><Upload size={14} /></div><p className="text-[9px] font-bold text-slate-400 mt-2">Upload JPG/PNG Header</p></>)}
                      <input type="file" accept="image/*" onChange={handleKopUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                      {customKopBase64 && (<button onClick={(e)=>{e.stopPropagation(); setCustomKopBase64(null);}} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-lg hover:bg-red-600 shadow-lg"><X size={10} /></button>)}
                    </div>
                  </div>
                </div>
                <div className="p-5 bg-slate-50/50 dark:bg-black/50 border-t border-slate-100 dark:border-neutral-800 flex flex-col gap-2">
                  <Button onClick={handleGeneratePreview} disabled={isPreviewLoading} className="w-full h-11 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20">
                    {isPreviewLoading ? <Loader2 size={15} className="animate-spin" /> : <FileSearch size={15} />} Refresh Preview
                  </Button>
                  <Button onClick={handleDownloadPdf} disabled={!previewPdfUrl || isPreviewLoading || isFinalExporting} className="w-full h-11 rounded-xl bg-slate-800 dark:bg-neutral-800 hover:bg-slate-900 dark:hover:bg-neutral-700 text-white font-bold text-xs flex items-center justify-center gap-2">
                    {isFinalExporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Download PDF Report
                  </Button>
                </div>
              </div>
              <div className="flex-1 bg-slate-200 dark:bg-black relative flex items-center justify-center">
                {previewPdfUrl ? (<iframe src={`${previewPdfUrl}#toolbar=0`} className="w-full h-full border-none" title="PDF Preview" />) : (<div className="text-center p-10"><div className="w-20 h-20 bg-white dark:bg-neutral-900 rounded-3xl flex items-center justify-center mx-auto mb-4 text-slate-200 dark:text-neutral-700 shadow-xl border border-slate-100 dark:border-neutral-800"><FileText size={40} /></div><p className="text-slate-500 dark:text-neutral-400 font-extrabold text-sm">Pratinjau PDF Belum Dimuat</p><p className="text-slate-400 dark:text-neutral-500 text-[11px] mt-2">Tekan "Refresh Preview" untuk mengenerate laporan.</p></div>)}
                {isPreviewLoading && (<div className="absolute inset-0 bg-slate-900/20 dark:bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-10"><Loader2 size={32} className="text-teal-600 animate-spin mb-4" /><p className="text-slate-800 dark:text-white font-bold text-xs bg-white dark:bg-neutral-900 px-4 py-2 rounded-full shadow-2xl">Membangun Dokumen PDF...</p></div>)}
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-black">
          <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-7">
            <button onClick={() => router.push('/analytics')} className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
              <ArrowLeft size={16} /> Kembali ke Analytics Overview
            </button>

            <div className="relative bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200 dark:border-neutral-800 overflow-hidden shadow-sm">
              <div className="absolute top-0 left-0 bottom-0 w-2" style={{ background: online ? TEAL_MID : RED }} />
              <div className="pointer-events-none absolute top-0 right-0 w-96 h-full" style={{ background: `linear-gradient(135deg, transparent 40%, ${online ? TEAL_LIGHT : RED_LIGHT} 100%)`, opacity: 0.5 }} />
              <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-5 p-7 pl-9 md:p-9 md:pl-10">
                <div className="flex items-center gap-6">
                    <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: online ? '#DCF5E7' : '#FEE2E6' }}>
                        <Server size={28} style={{ color: online ? GREEN : RED }} />
                        <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-[3px] border-white dark:border-neutral-900 ${online ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
                    </div>
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider mb-2 border" style={{ background: online ? GREEN_LIGHT : RED_LIGHT, borderColor: online ? '#86EFAC' : '#FCA5A5', color: online ? GREEN : RED }}>
                            {online ? 'Status: Online & Transmitting' : 'Status: Connection Offline'}
                        </div>
                        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight mb-1 uppercase">{nodeData.plcName}</h1>
                        <p className="text-slate-400 dark:text-neutral-500 text-xs font-mono flex items-center gap-2"><Cpu size={12}/> Segment ID: {nodeData.plcId}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 z-10">
                  <button onClick={handleRefresh} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-black text-slate-500 dark:text-neutral-300 text-xs font-bold hover:border-teal-300 dark:hover:border-teal-500 hover:text-teal-700 dark:hover:text-teal-400 transition-all">
                    <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} /> Refresh
                  </button>
                  <button onClick={() => setIsExportModalOpen(true)} className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-xs font-bold transition-all shadow-lg hover:opacity-90" style={{ background: '#1E293B' }}>
                    <FileText size={15} /> Export & Design PDF
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-2">
                <h3 className="text-xs font-extrabold text-slate-500 dark:text-neutral-400 uppercase tracking-widest flex items-center gap-2 mb-3">
                    <ActivitySquare size={14} /> Nilai Sensor Realtime (Live)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {paramKeys.map((key: string, idx: number) => {
                        const val = latestDataPoint[key] !== undefined ? latestDataPoint[key] : '-';
                        return (
                            <div key={key} className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1" style={{ background: CHART_COLORS[idx % CHART_COLORS.length] }}/>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-widest break-words mb-2 mt-1">{key}</p>
                                <p className="text-lg font-extrabold font-mono text-slate-800 dark:text-white leading-none">{val}</p>
                            </div>
                        )
                    })}
                </div>
            </div>

            <Card className="border border-slate-200 dark:border-neutral-800 rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 shadow-sm">
                <div className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-5 gap-4 border-b border-slate-100 dark:border-neutral-800 pb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: TEAL_LIGHT }}>
                                <Activity size={18} style={{ color: TEAL }} />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-slate-800 dark:text-white text-[15px] uppercase tracking-wider">High-Speed Realtime Fluctuation</h3>
                                <p className="text-[10px] text-slate-400 dark:text-neutral-500 font-mono mt-0.5">Analisis gelombang sensor per detik</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-black border border-slate-200 dark:border-neutral-800 px-4 py-2 rounded-xl shadow-inner">
                            <span className="text-[10px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest">Batasan Y-Axis:</span>
                            <input type="number" min="0" step="0.01" placeholder="Auto" value={yZoom[nodeId] || ''} onChange={(e) => { const val = e.target.value; setYZoom({ ...yZoom, [nodeId]: val ? Number(val) : 0 }); }} className="w-24 px-2 py-1.5 text-xs font-bold text-teal-700 dark:text-teal-400 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg outline-none focus:border-teal-400 dark:focus:border-teal-500" />
                            <span className="text-[10px] font-mono text-teal-600 dark:text-teal-500 font-bold">{yZoom[nodeId] ? 'Manual Mode' : 'Auto Fit'}</span>
                        </div>
                    </div>
                    <div className="w-full overflow-auto rounded-xl border border-slate-100 dark:border-neutral-800 bg-slate-50/30 dark:bg-black/30" style={{ maxHeight: '500px' }}>
                        <div style={{ width: '1500px', height: '650px', paddingRight: '20px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={nodeData.realtimeData} margin={{ top: 20, right: 20, left: -20, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.2} />
                                    <XAxis dataKey="time" fontSize={11} fontWeight={700} tickLine={false} axisLine={false} stroke="#64748b" />
                                    <YAxis domain={[0, yZoom[nodeId] ? yZoom[nodeId] : 'auto']} allowDataOverflow={true} fontSize={11} fontWeight={700} tickLine={false} axisLine={false} stroke="#64748b" />
                                    <RechartsTooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', background: '#fff', color: '#1e293b', fontSize: 12, fontWeight: 'bold' }} />
                                    {paramKeys.map((k: string, i: number) => {
                                        if (hiddenTags[k]) return null;
                                        return <Area key={k} type="monotone" name={k} dataKey={k} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={3} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.1} activeDot={{ r: 6, strokeWidth: 0 }} />;
                                    })}
                                    <Brush dataKey="time" height={30} stroke={TEAL} fill="#f1f5f9" travellerWidth={15} tickFormatter={() => ''} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-6 justify-center bg-slate-50 dark:bg-black p-4 rounded-xl border border-slate-100 dark:border-neutral-800">
                        {paramKeys.map((k: string, i: number) => {
                            const isHidden = hiddenTags[k];
                            return (
                                <button key={k} onClick={() => toggleTag(k)} className={`flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest transition-all hover:scale-105 hover:shadow-md border border-slate-200 dark:border-neutral-800 px-4 py-2 rounded-full ${isHidden ? 'bg-slate-100 dark:bg-neutral-900' : 'bg-white dark:bg-neutral-900'}`} style={{ color: isHidden ? '#cbd5e1' : '#64748b', textDecoration: isHidden ? 'line-through' : 'none' }}>
                                    <span className="w-3 h-3 rounded-full shadow-inner" style={{ background: isHidden ? '#e2e8f0' : CHART_COLORS[i % CHART_COLORS.length] }} />{k}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-5">
                    {[
                        { title: 'TREN RATA-RATA BULAN INI', data: nodeData.trendBulanIni, col: TEAL },
                        { title: 'KOMPARASI BULAN LALU', data: nodeData.trendBulanLalu, col: PURPLE, dashed: true },
                    ].map(({ title, data, col, dashed }) => (
                        <Card key={title} className="bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 p-6 rounded-2xl shadow-sm">
                            <div className="flex items-center gap-2.5 mb-5 border-b border-slate-100 dark:border-neutral-800 pb-3">
                                <CalendarDays size={16} style={{ color: col }} />
                                <h3 className="text-xs font-extrabold uppercase tracking-widest" style={{ color: col }}>{title}</h3>
                            </div>
                            <div className="h-56">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" strokeOpacity={0.2} />
                                        <XAxis dataKey="time" fontSize={10} fontWeight={600} tickLine={false} axisLine={false} stroke="#94A3B8" />
                                        <YAxis domain={[0, yZoom[nodeId] ? yZoom[nodeId] : 'auto']} allowDataOverflow={true} fontSize={10} fontWeight={600} tickLine={false} axisLine={false} stroke="#94A3B8" />
                                        <RechartsTooltip contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', background: '#fff', fontSize: 11 }} />
                                        {paramKeys.map((k: string, i: number) => {
                                            if (hiddenTags[k]) return null;
                                            return <Area key={k} type="monotone" name={k} dataKey={k} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} strokeDasharray={dashed ? '5 4' : undefined} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.04} />;
                                        })}
                                        <Brush dataKey="time" height={15} stroke={col} fill="#f8fafc" travellerWidth={8} tickFormatter={() => ''} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    ))}
                </div>

                <Card className="bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-slate-100 dark:border-neutral-800" style={{ background: RED_LIGHT, opacity: 0.9 }}>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white shadow-sm"><AlertTriangle size={15} style={{ color: RED }} /></div>
                            <div>
                                <h3 className="font-extrabold text-[12px] uppercase tracking-widest" style={{ color: RED }}>Log Anomali Mesin</h3>
                                <p className="text-[10px] text-slate-500 font-mono mt-0.5">Downtime & Bad Quality Record</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[500px]">
                        {nodeAlerts.map((log: any, idx: number) => (
                            <div key={idx} className="flex gap-3 p-3.5 rounded-xl border border-red-100 dark:border-red-900 bg-red-50/50 dark:bg-red-900/20 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="font-bold text-slate-700 dark:text-slate-300 text-xs">{log.tanggal}</p>
                                        <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border font-mono bg-white dark:bg-neutral-900 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800">
                                            {log.jam}
                                        </span>
                                    </div>
                                    <p className="text-[10px] font-mono text-slate-500 dark:text-neutral-400 mt-2 leading-relaxed">{log.data}</p>
                                </div>
                            </div>
                        ))}

                        {nodeAlerts.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                                <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
                                    <CheckCircle2 size={28} className="text-emerald-500 dark:text-emerald-400" />
                                </div>
                                <h4 className="font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-widest text-sm mb-1">Performa Sempurna</h4>
                                <p className="text-xs text-slate-400 font-mono leading-relaxed">Tidak ditemukan catatan downtime atau anomali pada sensor {nodeData.plcName}.</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}