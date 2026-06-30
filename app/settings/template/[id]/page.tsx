'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Save, ArrowLeft, LayoutTemplate, UploadCloud, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const pjs = Plus_Jakarta_Sans({ subsets: ['latin'] });

export default function TemplateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;
  const isNew = templateId === 'new';

  const [namaPerusahaan, setNamaPerusahaan] = useState('');
  const [pdfKop, setPdfKop] = useState('');
  const [pdfCover, setPdfCover] = useState('');
  
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isNew) {
      const fetchTemplate = async () => {
        try {
          const res = await fetch(`/api/settings/templates?id=${templateId}`);
          const data = await res.json();
          if (data.success && data.data) {
            setNamaPerusahaan(data.data.nama_perusahaan);
            setPdfKop(data.data.kop_base64 || '');
            setPdfCover(data.data.cover_base64 || '');
          }
        } catch (err) { alert("Gagal memuat template!"); }
        finally { setIsLoading(false); }
      };
      fetchTemplate();
    }
  }, [templateId, isNew]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'kop') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) return alert("Peringatan: Ukuran gambar maksimal 2MB!");
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (type === 'cover') setPdfCover(base64String);
        if (type === 'kop') setPdfKop(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!namaPerusahaan) return alert("Nama Perusahaan wajib diisi!");
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: isNew ? 'new' : templateId,
          nama_perusahaan: namaPerusahaan,
          kop_base64: pdfKop,
          cover_base64: pdfCover
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("Template Berhasil Disimpan!");
        router.push('/settings');
      } else {
        alert("Gagal menyimpan ke database.");
      }
    } catch (err) { alert("Terjadi kesalahan jaringan."); }
    finally { setIsSaving(false); }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={40}/></div>;

  return (
    <div className={`flex h-screen bg-slate-50 dark:bg-black overflow-hidden transition-colors duration-300 ${pjs.className}`}>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Template Builder" />

        <main className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
              <div className="flex items-center gap-4">
                <button onClick={() => router.push('/settings')} className="w-12 h-12 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-500 transition-all shadow-sm">
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h1 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-3">
                    <LayoutTemplate className="text-blue-500"/> {isNew ? 'New Template' : 'Edit Template'}
                  </h1>
                  <p className="text-sm font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mt-1">Design PDF report attributes for your client</p>
                </div>
              </div>
              <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 h-12 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-600/30 transition-all">
                {isSaving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save className="mr-2" size={16} />} Save Template
              </Button>
            </div>

            <Card className="p-8 rounded-3xl border-slate-200 dark:border-neutral-800 shadow-sm bg-white dark:bg-neutral-900">
              
              <div className="mb-8">
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Nama Perusahaan / Klien</label>
                <Input value={namaPerusahaan} onChange={(e) => setNamaPerusahaan(e.target.value)} placeholder="Contoh: PT ASCON MULTI PRATAMA" className="h-14 font-black text-lg bg-slate-50 dark:bg-black border-slate-200 dark:border-neutral-800 rounded-xl px-4" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* UPLOAD KOP SURAT */}
                <div className="p-6 bg-[#E8F4F6] dark:bg-teal-900/10 rounded-3xl border border-[#B8DDE3] dark:border-teal-800/40 flex flex-col justify-between">
                  <div className="mb-4">
                    <p className="text-sm font-black text-[#2A6C7A] dark:text-teal-400 uppercase flex items-center gap-2">Kop Surat (Header)</p>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mt-1">Dimensi Ideal: Landscape / Panjang</p>
                  </div>
                  {pdfKop ? (
                    <div className="relative group overflow-hidden rounded-xl border-2 border-[#2A6C7A]/20 bg-white">
                      <img src={pdfKop} className="w-full h-24 object-contain p-2" alt="Kop Surat" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button onClick={() => setPdfKop('')} variant="destructive" size="sm" className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest"><Trash2 size={14} className="mr-2"/> Hapus</Button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-[#2A6C7A]/30 rounded-xl cursor-pointer hover:bg-white/50 transition-colors">
                      <UploadCloud size={24} className="text-[#2A6C7A] mb-2" />
                      <span className="text-[10px] font-bold text-[#2A6C7A] uppercase tracking-widest">Upload Kop .PNG / .JPG</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'kop')} />
                    </label>
                  )}
                </div>

                {/* UPLOAD COVER */}
                <div className="p-6 bg-indigo-50 dark:bg-indigo-900/10 rounded-3xl border border-indigo-200 dark:border-indigo-800/40 flex flex-col justify-between">
                  <div className="mb-4">
                    <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase flex items-center gap-2">Cover Background</p>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mt-1">Dimensi Ideal: A4 (Portrait)</p>
                  </div>
                  {pdfCover ? (
                    <div className="relative group overflow-hidden rounded-xl border-2 border-indigo-600/20 bg-white">
                      <img src={pdfCover} className="w-full h-40 object-cover" alt="Cover Image" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button onClick={() => setPdfCover('')} variant="destructive" size="sm" className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest"><Trash2 size={14} className="mr-2"/> Hapus</Button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-indigo-600/30 rounded-xl cursor-pointer hover:bg-white/50 transition-colors">
                      <ImageIcon size={28} className="text-indigo-600 mb-2" />
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Upload Cover .JPG</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'cover')} />
                    </label>
                  )}
                </div>
              </div>

            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}