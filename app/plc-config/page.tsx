'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { useRouter } from 'next/navigation';
import { Server, Plus, Globe, ShieldAlert, DatabaseZap, Search, Loader2, CheckSquare, Square, FolderTree, ArrowLeft } from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const pjs = Plus_Jakarta_Sans({ subsets: ['latin'] });

export default function PLCConfigPage() {
  const router = useRouter();
  const [configs, setConfigs] = useState<any[]>([]);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [isScanning, setIsScanning] = useState(false);

  const [newPLC, setNewPLC] = useState({
    plc_name: '',
    endpoint_url: 'opc.tcp://',
    auth_type: 'anonymous', 
    username: '',
    password: '',
  });

  const [scannedTags, setScannedTags] = useState<any[]>([]);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [searchTag, setSearchTag] = useState('');

  useEffect(() => {
    const isDark = localStorage.getItem('ascon_darkmode') === 'true';
    if (isDark) document.documentElement.classList.add('dark');
  }, []);

  const fetchConfigs = async () => {
    try {
      const res = await fetch('/api/plc-config');
      const data = await res.json();
      if (Array.isArray(data)) setConfigs(data);
    } catch (error) {}
  };

  useEffect(() => { fetchConfigs(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus konfigurasi ini? Logging untuk node ini akan terhenti.")) return;
    try {
      const res = await fetch(`/api/plc-config?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchConfigs();
        alert("Konfigurasi berhasil dihapus.");
      } else alert("Gagal menghapus data dari server.");
    } catch (error) { alert("Terjadi kesalahan jaringan."); }
  };

  const handleScanServer = async () => {
    if (!newPLC.plc_name || !newPLC.endpoint_url) return alert("Nama dan Endpoint URL harus diisi!");
    setIsScanning(true);
    try {
      const res = await fetch('/api/opc-discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPLC)
      });
      const data = await res.json();
      if (data.success) {
        setScannedTags(data.tags);
        setStep(2); 
      } else alert("Gagal scan server: " + data.error);
    } catch (error) { alert("Koneksi gagal. Pastikan IP dan Port PLC dapat dijangkau."); } 
    finally { setIsScanning(false); }
  };

  const toggleTagSelection = (nodeId: string, name: string) => {
    const newSet = new Set(selectedTags);
    if (newSet.has(nodeId)) newSet.delete(nodeId);
    else newSet.add(JSON.stringify({ nodeId, name })); 
    setSelectedTags(newSet);
  };

  const selectAllTags = () => {
    if (selectedTags.size === filteredTags.length) setSelectedTags(new Set());
    else setSelectedTags(new Set(filteredTags.map(t => JSON.stringify({ nodeId: t.nodeId, name: t.name }))));
  };

  const handleDeploy = async () => {
    if (selectedTags.size === 0) return alert("Pilih minimal 1 tag untuk di-push ke SQL!");
    const finalTags = Array.from(selectedTags).map(item => JSON.parse(item));
    const payload = { ...newPLC, tags: finalTags };

    try {
      const res = await fetch('/api/plc-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert("Konfigurasi Berhasil Di-Deploy!");
        setStep(0);
        setSelectedTags(new Set());
        fetchConfigs();
      }
    } catch (err) { alert("Gagal menyimpan ke database."); }
  };

  const filteredTags = scannedTags.filter(t => t.name.toLowerCase().includes(searchTag.toLowerCase()) || t.path.toLowerCase().includes(searchTag.toLowerCase()));

  return (
    <div className={`flex h-screen bg-slate-50 dark:bg-black overflow-hidden transition-colors duration-300 ${pjs.className}`}>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Auto-Discovery OPC to SQL" />

        <main className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="max-w-5xl mx-auto space-y-6">
            
            <button onClick={() => router.push('/')} className="flex items-center text-xs font-bold text-slate-500 dark:text-neutral-400 hover:text-ascon-teal transition-colors mb-2 uppercase tracking-widest w-fit">
              <ArrowLeft size={16} className="mr-2"/> Kembali ke Dashboard
            </button>

            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Node Configurator</h1>
                <p className="text-sm text-slate-500 dark:text-neutral-400 font-bold uppercase tracking-widest">Scanner & Bridge Interface</p>
              </div>
              {step === 0 && (
                <Button onClick={() => setStep(1)} className="bg-ascon-teal hover:bg-[#1d4f59] text-white rounded-xl px-6 h-12 font-black uppercase text-[10px] tracking-widest shadow-lg">
                  <Plus size={18} className="mr-2"/> Scan New PLC
                </Button>
              )}
            </div>

            {step === 1 && (
              <Card className="p-8 rounded-[2.5rem] border-ascon-teal/30 dark:border-neutral-800 shadow-2xl bg-white dark:bg-neutral-900 animate-in zoom-in-95">
                <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase mb-4 flex items-center gap-2 border-b dark:border-neutral-800 pb-2">
                  <Globe className="text-ascon-teal" size={18} /> 1. Server Authentication
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Mesin / PLC</label>
                    <Input placeholder="Contoh: AKT" value={newPLC.plc_name} onChange={(e) => setNewPLC({...newPLC, plc_name: e.target.value})} className="h-12 rounded-xl border-slate-200 dark:border-neutral-800 dark:bg-black font-bold dark:text-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Endpoint Url</label>
                    <Input placeholder="opc.tcp://10.243.50.234:59100" value={newPLC.endpoint_url} onChange={(e) => setNewPLC({...newPLC, endpoint_url: e.target.value})} className="h-12 rounded-xl border-slate-200 dark:border-neutral-800 dark:bg-black font-mono text-xs dark:text-white" />
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-black p-6 rounded-2xl border border-slate-100 dark:border-neutral-800 mb-8 space-y-4">
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="auth" value="anonymous" checked={newPLC.auth_type === 'anonymous'} onChange={() => setNewPLC({...newPLC, auth_type: 'anonymous'})} className="w-4 h-4 text-ascon-teal focus:ring-ascon-teal" />
                      <span className="text-xs font-bold text-slate-700 dark:text-neutral-300 uppercase tracking-wider">Anonymous</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="auth" value="username" checked={newPLC.auth_type === 'username'} onChange={() => setNewPLC({...newPLC, auth_type: 'username'})} className="w-4 h-4 text-ascon-teal focus:ring-ascon-teal" />
                      <span className="text-xs font-bold text-slate-700 dark:text-neutral-300 uppercase tracking-wider">Username & Password</span>
                    </label>
                  </div>

                  {newPLC.auth_type === 'username' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-neutral-800 animate-in fade-in">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Username</label>
                        <Input placeholder="AKT_OPC" value={newPLC.username} onChange={(e) => setNewPLC({...newPLC, username: e.target.value})} className="h-10 rounded-xl font-bold dark:bg-neutral-900 dark:border-neutral-800 dark:text-white" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                        <Input type="password" placeholder="********" value={newPLC.password} onChange={(e) => setNewPLC({...newPLC, password: e.target.value})} className="h-10 rounded-xl font-bold tracking-widest dark:bg-neutral-900 dark:border-neutral-800 dark:text-white" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t dark:border-neutral-800">
                  <Button onClick={() => setStep(0)} variant="ghost" className="rounded-xl font-bold uppercase text-[10px] tracking-widest h-12 px-6 dark:text-neutral-300">Cancel</Button>
                  <Button onClick={handleScanServer} disabled={isScanning} className="bg-ascon-purple hover:bg-[#7e5c8a] text-white rounded-xl px-10 h-12 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-ascon-purple/30 flex items-center gap-2">
                    {isScanning ? <Loader2 size={16} className="animate-spin"/> : <Search size={16} />} 
                    {isScanning ? 'Membaca Sensor PLC...' : 'Scan & Browse Server'}
                  </Button>
                </div>
              </Card>
            )}

            {step === 2 && (
              <Card className="p-8 rounded-[2.5rem] border-ascon-purple/30 dark:border-neutral-800 shadow-2xl bg-white dark:bg-neutral-900 animate-in slide-in-from-right-8">
                <div className="flex justify-between items-center border-b dark:border-neutral-800 pb-4 mb-6">
                  <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase flex items-center gap-2">
                    <FolderTree className="text-ascon-purple" size={24} /> 2. Select Tags to Push
                  </h2>
                  <div className="bg-ascon-purple/10 text-ascon-purple px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest">
                    {scannedTags.length} Tags Found
                  </div>
                </div>

                <div className="flex justify-between items-center mb-4">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <Input placeholder="Cari tag..." value={searchTag} onChange={e => setSearchTag(e.target.value)} className="pl-9 h-10 rounded-xl bg-slate-50 dark:bg-black border-slate-200 dark:border-neutral-800 text-xs font-bold dark:text-white" />
                  </div>
                  <Button onClick={selectAllTags} variant="outline" className="h-10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-neutral-300 border-slate-200 dark:border-neutral-800">
                    {selectedTags.size === filteredTags.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>

                <div className="bg-slate-50 dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-2xl overflow-hidden max-h-[400px] overflow-y-auto shadow-inner">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 dark:bg-neutral-900 sticky top-0 z-10 text-[10px] font-black uppercase text-slate-500 dark:text-neutral-400 tracking-widest">
                      <tr>
                        <th className="p-4 w-10 text-center">#</th>
                        <th className="p-4">Display Name</th>
                        <th className="p-4">OPC NodeId (Address)</th>
                        <th className="p-4">Folder Path</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-neutral-800 text-xs">
                      {filteredTags.map((tag) => {
                        const strVal = JSON.stringify({nodeId: tag.nodeId, name: tag.name});
                        const isChecked = selectedTags.has(strVal);
                        return (
                          <tr key={tag.nodeId} onClick={() => toggleTagSelection(tag.nodeId, tag.name)} className={`cursor-pointer transition-colors ${isChecked ? 'bg-ascon-teal/5 dark:bg-ascon-teal/20' : 'hover:bg-slate-100 dark:hover:bg-neutral-800'}`}>
                            <td className="p-4 text-center">
                              {isChecked ? <CheckSquare size={18} className="text-ascon-teal mx-auto"/> : <Square size={18} className="text-slate-300 dark:text-neutral-600 mx-auto"/>}
                            </td>
                            <td className="p-4 font-black text-slate-700 dark:text-neutral-200">{tag.name}</td>
                            <td className="p-4 font-mono text-slate-500 dark:text-neutral-400 text-[10px]">{tag.nodeId}</td>
                            <td className="p-4 font-mono text-slate-400 dark:text-neutral-500 text-[9px] truncate max-w-[200px]" title={tag.path}>{tag.path}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center mt-6 pt-6 border-t dark:border-neutral-800">
                  <p className="text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest">
                    <span className="text-ascon-teal font-black">{selectedTags.size}</span> Tags Selected
                  </p>
                  <div className="flex gap-3">
                    <Button onClick={() => setStep(1)} variant="ghost" className="rounded-xl font-bold uppercase text-[10px] tracking-widest h-12 px-6 dark:text-neutral-300">Back</Button>
                    <Button onClick={handleDeploy} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-10 h-12 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/30 flex items-center gap-2">
                      <DatabaseZap size={16} /> Deploy & Push to SQL
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {step === 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 animate-in fade-in">
                {(Array.isArray(configs) ? configs : []).map((cfg) => (
                  <Card key={cfg.id} className="p-6 rounded-3xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-ascon-teal/30 dark:hover:border-teal-500 transition-all shadow-sm group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                         <div className="p-3 bg-ascon-teal/10 rounded-2xl text-ascon-teal"><Server size={20}/></div>
                         <div>
                           <h3 className="font-black text-slate-800 dark:text-white uppercase text-sm tracking-tight">{cfg.plc_name}</h3>
                           <p className="text-[9px] text-slate-400 font-mono">{cfg.endpoint_url}</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-100 dark:border-emerald-800">
                         <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                         <span className="text-[9px] font-black uppercase tracking-widest">Active</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-black p-4 rounded-2xl border border-slate-100 dark:border-neutral-800 mb-4">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Monitoring Tags:</p>
                       <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                          {cfg.tags_json && JSON.parse(cfg.tags_json).map((t: any) => (
                            <span key={t.nodeId} className="px-2 py-1 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-lg text-[9px] font-bold text-slate-600 dark:text-neutral-300 uppercase">{t.name}</span>
                          ))}
                       </div>
                    </div>
                    <Button 
                      onClick={() => handleDelete(cfg.id)}
                      variant="ghost" 
                      className="w-full rounded-xl text-[10px] font-black uppercase tracking-widest h-10 text-ascon-red hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Delete Configuration
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}