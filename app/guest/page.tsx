'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { useRouter } from 'next/navigation';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Cropper from 'react-easy-crop';
import {
  FileText, Loader2, AlertTriangle, Activity, CheckCircle2,
  Clock, PieChart as PieIcon, Server, Search, CalendarDays,
  ArrowRight, Download, RefreshCw, Wifi, WifiOff, ArrowUpRight, 
  ArrowDownRight, Minus, Eye, MoreVertical, Cpu, Layers, X, 
  Calendar, Upload, FileSearch, User, Filter, MapPin, Gauge, 
  Edit3, ClipboardList, LayoutGrid, Database, Settings, Trash2,
  ZoomIn, ZoomOut, RotateCcw, Crop, Check, Plus, Moon, Sun, AlertCircle
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend, Brush
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Header from '@/components/Header';

const pjs = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

// ─── WARNA TEMA ──────────────────────────────────────────────────────────────
const TEAL        = '#2A6C7A';
const TEAL_LIGHT  = '#E8F4F6';
const TEAL_MID    = '#5DCAA5';
const RED         = '#CD3053';
const RED_LIGHT   = '#FBF0F2';
const PURPLE      = '#9F7CAC';
const PURPLE_LIGHT= '#F5F0F7';
const AMBER       = '#D97706';
const AMBER_LIGHT = '#FFFBEB';
const GREEN       = '#15803D';
const GREEN_LIGHT = '#F0FDF4';

// ─── DARK MODE COLORS (HITAM) ────────────────────────────────────────────────
const DARK_BG         = '#0A0A0A';
const DARK_CARD       = '#141414';
const DARK_BORDER     = '#262626';
const DARK_HOVER      = '#1A1A1A';
const DARK_INPUT      = '#1A1A1A';
const DARK_TEXT       = '#FAFAFA';
const DARK_TEXT_SEC   = '#A3A3A3';
const DARK_TEXT_TER   = '#737373';
const DARK_DIVIDER    = '#262626';
const DARK_TEAL_BG    = '#0D1F1F';
const DARK_RED_BG     = '#1F0D0D';
const DARK_PURPLE_BG  = '#1A1A1A';
const DARK_AMBER_BG   = '#1A1A1A';
const DARK_GREEN_BG   = '#0D1A0D';

const CHART_COLORS = [TEAL, PURPLE, AMBER, RED, '#3B82F6', '#10B981', '#F43F5E', '#8B5CF6', '#14B8A6'];
const colorPalette = [
  { stroke: "#2A6C7A", fill: "#2A6C7A20" }, { stroke: "#9F7CAC", fill: "#9F7CAC20" },
  { stroke: "#CD3053", fill: "#CD305320" }, { stroke: "#10b981", fill: "#d1fae5" }
];

// ─── HELPER: CREATE IMAGE ──────────────────────────────────────────────────
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

// ─── HELPER: GET CROPPED IMG ──────────────────────────────────────────────
async function getCroppedImg(imageSrc: string, pixelCrop: any): Promise<string | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const OUTPUT_W = 1050;
  const OUTPUT_H = 150;
  canvas.width  = OUTPUT_W;
  canvas.height = OUTPUT_H;
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, OUTPUT_W, OUTPUT_H);
  return canvas.toDataURL('image/png');
}

// ─── HELPER: GET CROPPED SQUARE IMG ──────────────────────────────────────────
async function getCroppedSquareImg(imageSrc: string, pixelCrop: any): Promise<string | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const OUTPUT_SIZE = 400;
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  return canvas.toDataURL('image/png');
}

// ─── SPARKLINE ───────────────────────────────────────────────────────────────
function Sparkline({ data, dataKey, color }: { data: any[]; dataKey: string; color: string }) {
  if (!data || data.length < 2) return (
    <svg viewBox="0 0 100 40" className="w-full h-full">
      <line x1="0" y1="20" x2="100" y2="20" stroke="#333" strokeWidth="1.5" />
    </svg>
  );
  const vals  = data.slice(-20).map(d => parseFloat(d[dataKey]) || 0);
  const mn    = Math.min(...vals);
  const mx    = Math.max(...vals);
  const range = mx - mn || 1;
  const pts   = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * 100;
    const y = 36 - ((v - mn) / range) * 28;
    return `${x},${y}`;
  });
  const polyFill = `0,40 ${pts.join(' ')} 100,40`;
  const id = `sg-${color.replace('#', '')}`;
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity={0.15} />
          <stop offset="100%" stopColor={color} stopOpacity={0}    />
        </linearGradient>
      </defs>
      <polygon  points={polyFill}      fill={`url(#${id})`} />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ value, label, trend, icon: Icon, iconColor, iconBg, barColor, stripeColor, isDark }: any) {
  const TrendIcon  = trend > 0 ? ArrowUpRight : trend < 0 ? ArrowDownRight : Minus;
  const trendStyle = trend > 0
    ? { bg: isDark ? '#0D1A0D' : GREEN_LIGHT, text: isDark ? '#4ADE80' : GREEN }
    : trend < 0
    ? { bg: isDark ? '#1A0D0D' : RED_LIGHT, text: isDark ? '#F87171' : RED }
    : { bg: isDark ? '#1A1A1A' : '#F1F5F9', text: isDark ? '#A3A3A3' : '#475569' };
  const barWidth = Math.min(Math.abs(trend) * 4, 100);

  return (
    <div className={`relative rounded-2xl border overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
      isDark
        ? 'bg-[#141414] border-[#262626] hover:border-teal-700'
        : 'bg-white border-slate-200 hover:shadow-lg'
    }`}>
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: stripeColor }} />
      <div className="p-5 pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: isDark ? `${iconColor}22` : iconBg }}>
            <Icon size={18} style={{ color: iconColor }} />
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold" style={{ background: trendStyle.bg, color: trendStyle.text }}>
            <TrendIcon size={11} />{Math.abs(trend)}%
          </div>
        </div>
        <p className={`text-[34px] font-extrabold leading-none tracking-tight mb-1 ${isDark ? 'text-[#FAFAFA]' : 'text-slate-800'}`}>{value}</p>
        <p className={`text-[11px] font-semibold uppercase tracking-widest mb-3 ${isDark ? 'text-[#A3A3A3]' : 'text-slate-400'}`}>{label}</p>
        <div className={`h-1 rounded-full overflow-hidden ${isDark ? 'bg-[#262626]' : 'bg-slate-100'}`}>
          <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${barWidth}%`, background: barColor }} />
        </div>
      </div>
    </div>
  );
}

// ─── DEVICE CARD ──────────────────────────────────────────────────────────────
function DeviceCard({ device, color, onExport, onView, isExporting, nodeImage, onManageImage, isDark }: any) {
  const [menuOpen, setMenuOpen] = useState(false);
  const online = device.status === 'online';
  const keys   = Object.keys(device) ?? [];

  return (
    <div className={`relative rounded-2xl border overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
      isDark
        ? online
          ? 'bg-[#141414] border-[#262626] hover:border-teal-700'
          : 'bg-[#141414] border-[#262626] hover:border-red-800'
        : online
          ? 'bg-white border-slate-200 hover:border-teal-200'
          : 'bg-white border-slate-200 hover:border-red-200'
    }`}>
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: online ? TEAL_MID : RED }} />
      <div className="p-5 pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              onClick={onManageImage}
              className="relative w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden group cursor-pointer"
              style={{ background: isDark ? (online ? '#0D1F1F' : '#1A0D0D') : (online ? TEAL_LIGHT : RED_LIGHT) }}
              title="Klik untuk mengelola foto mesin"
            >
              {nodeImage ? (
                <img src={nodeImage} alt="Node" className="w-full h-full object-cover" />
              ) : (
                <Cpu size={18} style={{ color: online ? TEAL_MID : RED }} className="group-hover:opacity-0 transition-opacity" />
              )}
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10">
                {nodeImage ? <Edit3 size={14} className="text-white" /> : <Plus size={14} className="text-white" />}
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 z-20 ${isDark ? 'border-[#141414]' : 'border-white'} ${online ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
            </div>
            <div>
              <p className={`font-bold text-[14px] leading-tight ${isDark ? 'text-[#FAFAFA]' : 'text-slate-800'}`}>{device.plcName}</p>
              <p className={`text-[9px] font-mono mt-0.5 ${isDark ? 'text-[#737373]' : 'text-slate-400'}`}>{device.plcId?.substring(0, 18)}…</p>
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors ${
                isDark
                  ? 'border-[#333] bg-[#1A1A1A] text-[#A3A3A3] hover:text-teal-400 hover:border-teal-700 hover:bg-[#262626]'
                  : 'border-slate-200 bg-slate-50 text-slate-400 hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50'
              }`}
            >
              <MoreVertical size={14} />
            </button>
            {menuOpen && (
              <div className={`absolute right-0 mt-1.5 w-44 border rounded-xl shadow-xl z-50 py-1 text-sm ${
                isDark ? 'bg-[#141414] border-[#333]' : 'bg-white border-slate-200'
              }`}>
                <button
                  onClick={() => { setMenuOpen(false); onView(); }}
                  className={`w-full text-left px-4 py-2 font-semibold flex items-center gap-2 transition-colors ${isDark ? 'text-[#FAFAFA] hover:bg-[#1A1A1A] hover:text-teal-400' : 'text-slate-700 hover:bg-slate-50 hover:text-teal-700'}`}
                >
                  <Eye size={13} /> View Details
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onExport(); }}
                  disabled={isExporting}
                  className={`w-full text-left px-4 py-2 font-semibold flex items-center gap-2 disabled:opacity-50 transition-colors ${isDark ? 'text-[#FAFAFA] hover:bg-[#1A1A1A] hover:text-teal-400' : 'text-slate-700 hover:bg-slate-50 hover:text-teal-700'}`}
                >
                  {isExporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Export Report
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="h-14 mb-3"><Sparkline data={device.realtimeData ?? []} dataKey={keys[0] ?? 'value'} color={color} /></div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {keys.slice(0, 3).map((p: string) => (
            <span key={p} className={`rounded-md px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider font-mono border ${isDark ? 'bg-[#1A1A1A] border-[#333] text-[#A3A3A3]' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>{p}</span>
          ))}
          {keys.length > 3 && (
            <span className="rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider font-mono" style={{ background: isDark ? '#0D1F1F' : TEAL_LIGHT, color: TEAL_MID, border: `1px solid #2A6C7A66` }}>+{keys.length - 3}</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={onExport}
            disabled={isExporting}
            variant="outline"
            size="sm"
            className={`flex-1 h-9 text-[11px] font-bold rounded-lg ${isDark ? 'border-[#333] text-[#A3A3A3] hover:border-teal-700 hover:text-teal-400 hover:bg-[#1A1A1A] bg-transparent' : 'border-slate-200 text-slate-500 hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50'}`}
          >
            {isExporting ? <Loader2 size={13} className="animate-spin mr-1" /> : <FileText size={13} className="mr-1" />} Export
          </Button>
          <Button
            onClick={onView}
            size="sm"
            className="flex-1 h-9 text-[11px] font-bold rounded-lg text-white"
            style={{ background: isDark ? '#262626' : '#1E293B' }}
          >
            View <ArrowRight size={13} className="ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── MEGA DASHBOARD ───────────────────────────────────────────────────────────
export default function MegaDashboard() {
  const router = useRouter();

  // ─── DITAMBAHKAN: CUSTOM DIALOG STATE ───
  const [dialogOptions, setDialogOptions] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm';
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({ isOpen: false, type: 'alert', title: '', message: '' });

  const showAlert = (title: string, message: string) => {
    setDialogOptions({ isOpen: true, type: 'alert', title, message });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setDialogOptions({ isOpen: true, type: 'confirm', title, message, onConfirm });
  };

  const closeDialog = () => {
    setDialogOptions(prev => ({ ...prev, isOpen: false }));
  };

  // ─── DITAMBAHKAN: GUEST MODE CHECK ───
  const [isGuest, setIsGuest] = useState(false);

  const [isDark, setIsDark] = useState(false);
  const [activeUser, setActiveUser] = useState('Administrator');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'alerts'>('overview');
  const [hiddenTags, setHiddenTags] = useState<Record<string, boolean>>({});
  const [yZoom, setYZoom] = useState<Record<string, number>>({});
  const [uptimeTab, setUptimeTab] = useState<'this' | 'prev' | 'compare'>('this');

  const [plcOptions, setPlcOptions] = useState<any[]>([]);
  const [filterPlc, setFilterPlc] = useState('ALL');
  const [filterStartDate, setFilterStartDate] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0];
  });
  const [filterEndDate, setFilterEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  const [plcs, setPlcs] = useState<any[]>([]);
  const [configs, setConfigs] = useState<any[]>([]);
  const [lostLogs, setLostLogs] = useState<any[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<any[]>([]);
  const [prevMonthStats, setPrevMonthStats] = useState<any[]>([]);
  const [statusDist, setStatusDist] = useState<any[]>([]);
  const [multiNodeCharts, setMultiNodeCharts] = useState<any[]>([]);
  const [systemMetrics, setSystemMetrics] = useState({ averageLatency: '45ms', uptime: '99.98%' });

  const [livePlc, setLivePlc] = useState<any | null>(null);
  const [liveData, setLiveData] = useState<number[]>([]);
  const [chartHistory, setChartHistory] = useState<any[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [activeParamIndex, setActiveParamIndex] = useState(0);

  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [isViewLogs, setIsViewLogs] = useState(false);
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);
  const [logTargetPlc, setLogTargetPlc] = useState<any>(null);

  const plcsRef = useRef<any[]>([]);
  useEffect(() => { plcsRef.current = plcs; }, [plcs]);

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState<string>(filterStartDate);
  const [exportEndDate, setExportEndDate] = useState<string>(filterEndDate);
  const [exportType, setExportType] = useState<'global' | 'node'>('global');
  const [exportTargetNode, setExportTargetNode] = useState<{id: string, name: string} | null>(null);
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

  const [rawKopImage, setRawKopImage]         = useState<string | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [crop, setCrop]                       = useState({ x: 0, y: 0 });
  const [cropZoom, setCropZoom]               = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const kopFileInputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback((_: any, croppedPixels: any) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleConfirmCrop = async () => {
    if (!rawKopImage || !croppedAreaPixels) return;
    const result = await getCroppedImg(rawKopImage, croppedAreaPixels);
    if (result) setCustomKopBase64(result);
    setIsCropModalOpen(false);
    setRawKopImage(null);
    setCrop({ x: 0, y: 0 });
    setCropZoom(1);
  };

  const handleCancelCrop = () => {
    setIsCropModalOpen(false);
    setRawKopImage(null);
    setCrop({ x: 0, y: 0 });
    setCropZoom(1);
  };

  const [nodeImages, setNodeImages] = useState<Record<string, string>>({});
  const [activeNodeForImage, setActiveNodeForImage] = useState<any | null>(null);
  const [rawNodeImage, setRawNodeImage] = useState<string | null>(null);
  const [nodeCrop, setNodeCrop] = useState({ x: 0, y: 0 });
  const [nodeCropZoom, setNodeCropZoom] = useState(1);
  const [nodeCroppedAreaPixels, setNodeCroppedAreaPixels] = useState<any>(null);
  const nodeFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('nodeImages');
    if (stored) {
      try { setNodeImages(JSON.parse(stored)); } catch(e){}
    }
    const darkStored = localStorage.getItem('ascon_darkmode') === 'true';
    setIsDark(darkStored);
    if (darkStored) document.documentElement.classList.add('dark');

    // ─── DITAMBAHKAN: CEK COOKIE GUEST ───
    const roleCookie = document.cookie.split('; ').find(row => row.startsWith('userRole='))?.split('=')[1];
    if (roleCookie && decodeURIComponent(roleCookie).toUpperCase() === 'GUEST') {
        setIsGuest(true);
    }
  }, []);

  // ─── DITAMBAHKAN: FUNGSI RESTRIKSI GUEST ───
  const handleGuestRestriction = () => {
      showAlert("Akses Ditolak", "Anda saat ini masuk dalam Mode Guest Viewer. Fitur tindakan ini dibatasi dan hanya dikhususkan untuk Engineer / Administrator aktif.");
  };

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem('ascon_darkmode', String(next));
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleNodeImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setRawNodeImage(reader.result as string);
      setNodeCrop({ x: 0, y: 0 });
      setNodeCropZoom(1);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleConfirmNodeCrop = async () => {
    if (!rawNodeImage || !nodeCroppedAreaPixels || !activeNodeForImage) return;
    const result = await getCroppedSquareImg(rawNodeImage, nodeCroppedAreaPixels);
    if (result) {
      const newImages = { ...nodeImages, [activeNodeForImage.plcId]: result };
      setNodeImages(newImages);
      localStorage.setItem('nodeImages', JSON.stringify(newImages));
    }
    setRawNodeImage(null);
  };

  const handleDeleteNodeImage = () => {
    if (!activeNodeForImage) return;
    const newImages = { ...nodeImages };
    delete newImages[activeNodeForImage.plcId];
    setNodeImages(newImages);
    localStorage.setItem('nodeImages', JSON.stringify(newImages));
  };

  const fetchPlcOptionsAndConfigs = async () => {
    try { 
      const res = await fetch('/api/plc-config'); 
      if (res.ok) { 
        const data = await res.json(); 
        setPlcOptions(data); 
        setConfigs(data); 
      } 
    } catch (e) {}
  };

  const fetchPlcsTable = async () => {
    try { const res = await fetch('/api/plc'); if (res.ok) setPlcs(await res.json()); } catch (err) {}
  };

  const fetchAnalyticsData = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStartDate) params.append('startDate', filterStartDate);
      if (filterEndDate) params.append('endDate', filterEndDate);
      if (filterPlc !== 'ALL') params.append('plcName', filterPlc);
      const res  = await fetch(`/api/analytics?${params.toString()}`);
      const data = await res.json();
      if (data.lostLogs) setLostLogs(data.lostLogs);
      if (data.monthlyStats) setMonthlyStats(data.monthlyStats);
      if (data.prevMonthStats) setPrevMonthStats(data.prevMonthStats);
      if (data.statusDistribution) setStatusDist(data.statusDistribution);
      if (data.multiNodeCharts) {
        setMultiNodeCharts(data.multiNodeCharts);
        setSystemMetrics(prev => ({
          ...prev,
          uptime: data.uptime || prev.uptime,
          averageLatency: data.averageLatency || prev.averageLatency
        }));
      }
      const ck = document.cookie.split('; ').find(r => r.startsWith('username='))?.split('=')[1];
      if (ck) setActiveUser(decodeURIComponent(ck));
    } catch {}
  };

  useEffect(() => { 
    fetchPlcOptionsAndConfigs();
    fetchPlcsTable();
    fetchAnalyticsData(); 
  }, []); 

  useEffect(() => {
    if (activeUser && customPrinterName === 'Administrator') setCustomPrinterName(activeUser.toUpperCase());
  }, [activeUser]);

  useEffect(() => {
    const checkNodeConnectivity = () => {
      const currentPlcs = plcsRef.current;
      currentPlcs.forEach(async (plc) => {
        try {
          const testAddress = plc.parameters?.[0]?.address || 1;
          const url = `/api/modbus?ip=${plc.ip_address}&port=${plc.port || 502}&addrs=${testAddress}&t=${Date.now()}`;
          const res = await fetch(url, { cache: 'no-store' });
          const result = await res.json();
          let isOnline = result.success === true && Number(result.data[0]) !== 0;
          setPlcs(prev => prev.map(p => p.id === plc.id ? { ...p, status: isOnline ? 'Online' : 'Offline' } : p));
        } catch (error) {
          setPlcs(prev => prev.map(p => p.id === plc.id ? { ...p, status: 'Offline' } : p));
        }
      });
    };
    const heartbeatInterval = setInterval(checkNodeConnectivity, 10000);
    return () => clearInterval(heartbeatInterval);
  }, []);

  useEffect(() => {
    let interval: any;
    if (isMonitoring && livePlc && livePlc.status === 'Online') {
      interval = setInterval(async () => {
        try {
          const params = livePlc.parameters || [];
          const paramQuery = params.map((p: any) => p.address).join(',');
          const res = await fetch(`/api/modbus?ip=${livePlc.ip_address}&port=${livePlc.port || 502}&addrs=${paramQuery}`);
          const result = await res.json();
          if (result.success) {
            setLiveData(result.data);
            setChartHistory(prev => {
              const now = new Date();
              const historyPoint: any = { time: `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${now.getMilliseconds()}` };
              result.data.forEach((val: number, idx: number) => { historyPoint[`val${idx}`] = val; });
              return [...prev, historyPoint].slice(-60);
            });
          }
        } catch (err) {}
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isMonitoring, livePlc?.id]);

  const handleApplyFilter = async () => {
    setIsRefreshing(true);
    setExportStartDate(filterStartDate); 
    setExportEndDate(filterEndDate);     
    await fetchAnalyticsData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchPlcsTable();
    await fetchAnalyticsData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleDeletePlc = async (id: string) => {
    // DITAMBAHKAN: Pengecekan Guest Mode
    if (isGuest) return handleGuestRestriction();
    
    showConfirm("Konfirmasi Hapus", "Apakah Anda yakin ingin menghapus node ini secara permanen?", async () => {
      await fetch(`/api/plc?id=${id}`, { method: 'DELETE' }); 
      fetchPlcsTable();
    });
  };

  const handleMonitorStart = (plc: any) => {
    setLivePlc(plc); setLiveData([]); setChartHistory([]); setActiveParamIndex(0); setIsMonitoring(true);
  };

  const openLogHistory = async (plc: any) => {
    setLogTargetPlc(plc);
    try {
      const res = await fetch(`/api/logs?plcId=${plc.id}`);
      const data = await res.json();
      setHistoryLogs(Array.isArray(data) ? data : []);
      setSelectedLogIds([]); setIsViewLogs(true);
    } catch (err) { setIsViewLogs(true); }
  };

  const toggleLogSelection = (id: string) => { setSelectedLogIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); };
  const selectAllLogs = () => { setSelectedLogIds(selectedLogIds.length === historyLogs.length ? [] : historyLogs.map(log => log.id)); };

  const exportSelectedLogs = () => {
    // DITAMBAHKAN: Pengecekan Guest Mode
    if (isGuest) return handleGuestRestriction();
    
    const dataToExport = historyLogs.filter(log => selectedLogIds.includes(log.id));
    if (dataToExport.length === 0) return showAlert("Peringatan", "Pilih minimal satu data baris untuk di-export!");
    
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text(`LAPORAN SELEKTIF LOG: ${logTargetPlc.nama_mesin}`, 14, 15);
    doc.setFontSize(10); doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 22);
    const tableRows = dataToExport.map((log: any) => [
      new Date(log.createdAt).toLocaleString('id-ID'),
      Object.entries(log.data).map(([k, v]) => `${k}: ${v}`).join(" | ")
    ]);
    autoTable(doc, { startY: 30, head: [["Waktu Pencatatan", "Data Sensor"]], body: tableRows, headStyles: { fillColor: [42, 108, 122] }, styles: { fontSize: 8 } });
    doc.save(`Selective_Log_${logTargetPlc.nama_mesin}.pdf`);
  };

  const openExportModalGlobal = () => { 
      // DITAMBAHKAN: Pengecekan Guest Mode
      if (isGuest) return handleGuestRestriction();
      setExportType('global'); setIsExportModalOpen(true); 
  };
  
  const openExportModalNode = (plcId: string, plcName: string) => { 
      // DITAMBAHKAN: Pengecekan Guest Mode
      if (isGuest) return handleGuestRestriction();
      setExportType('node'); setExportTargetNode({ id: plcId, name: plcName }); setIsExportModalOpen(true); 
  };

  const handleKopUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setRawKopImage(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setCropZoom(1);
      setIsCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleReEditKop = () => {
    if (customKopBase64) {
      setRawKopImage(customKopBase64);
      setCrop({ x: 0, y: 0 });
      setCropZoom(1);
      setIsCropModalOpen(true);
    }
  };

  const handleGeneratePreview = async () => {
    setIsPreviewLoading(true);
    try {
      const payload = {
        exporterName: customPrinterName, customPrintDate: customPrintDate, 
        startDate: exportStartDate, endDate: exportEndDate, customKop: customKopBase64, 
        targetId: exportType === 'node' ? exportTargetNode?.id : (filterPlc !== 'ALL' ? multiNodeCharts.find(n => n.plcName === filterPlc)?.plcId : null)
      };
      const res = await fetch('/api/export-pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      if (previewPdfUrl) URL.revokeObjectURL(previewPdfUrl);
      setPreviewPdfUrl(URL.createObjectURL(blob));
    } catch { 
      showAlert("Koneksi Error", "Gagal memuat pratinjau. Pastikan database aktif dan sinkron."); 
    } 
    finally { setIsPreviewLoading(false); }
  };

  const handleDownloadPdf = async () => {
    setIsFinalExporting(true);
    if (!previewPdfUrl) await handleGeneratePreview();
    const a = document.createElement('a'); a.href = previewPdfUrl || ''; 
    const filenameLabel = exportType === 'node' && exportTargetNode ? exportTargetNode.name.replace(/\s+/g, '_') : (filterPlc !== 'ALL' ? filterPlc.replace(/\s+/g, '_') : 'ASCON_MATRIX_ANALYTICS');
    a.download = `REPORT_${filenameLabel}_${exportStartDate}_to_${exportEndDate}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
    setIsExportModalOpen(false); setIsFinalExporting(false);
  };

  const toggleTag = (plcId: string, tag: string) => {
    const key = `${plcId}-${tag}`; setHiddenTags(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const activeParamsList = livePlc?.parameters || [];
  const activeTheme = colorPalette[activeParamIndex % colorPalette.length];
  const activeUnit = activeParamsList[activeParamIndex]?.unit || '';
  const filteredNodes = multiNodeCharts.filter(n => n.plcName?.toLowerCase().includes(searchTerm.toLowerCase()) || n.plcId?.toLowerCase().includes(searchTerm.toLowerCase()));

  const totalSegments = filterPlc === 'ALL' ? configs.length : 1;
  let onlineCount = 0; 
  let offlineCount = 0;
  if (statusDist.length) {
    statusDist.forEach((s: any) => {
      const nm = s.name.toLowerCase();
      if (nm.includes('normal') || nm.includes('online')) onlineCount += s.value;
      if (nm.includes('offline') || nm.includes('error')) offlineCount += s.value;
    });
  } else {
    onlineCount = filterPlc === 'ALL' ? configs.length : 1;
    offlineCount = 0;
  }
  const pieTotal = onlineCount + offlineCount || 1;
  const avgUptimePct = (data: any[]) => { if (!data.length) return '100.0%'; const avg = data.reduce((s, d) => s + (d.onlinePct ?? 100), 0) / data.length; return avg.toFixed(1) + '%'; };
  const offlineEventCount = (data: any[]) => data.filter(d => (d.offlineEvents ?? 0) > 0).length;

  const bg     = isDark ? 'bg-[#0A0A0A]'  : 'bg-slate-50';
  const card   = isDark ? 'bg-[#141414] border-[#262626]' : 'bg-white border-slate-200';
  const cardHover = isDark ? 'hover:border-teal-700' : '';
  const text   = isDark ? 'text-[#FAFAFA]' : 'text-slate-800';
  const textSm = isDark ? 'text-[#A3A3A3]' : 'text-slate-500';
  const textXs = isDark ? 'text-[#737373]' : 'text-slate-400';
  const divider = isDark ? 'border-[#262626]' : 'border-slate-100';
  const inputCls = isDark
    ? 'bg-[#1A1A1A] border-[#333] text-[#FAFAFA] focus:border-teal-500 focus:bg-[#262626]'
    : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-teal-400 focus:bg-white';
  const selectCls = isDark
    ? 'bg-[#1A1A1A] border-[#333] text-[#FAFAFA] focus:border-teal-500'
    : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-teal-400';
  const tooltipStyle = isDark
    ? { borderRadius: 10, border: '1px solid #333', background: '#141414', color: '#FAFAFA', fontSize: 11 }
    : { borderRadius: 10, border: '1px solid #E2E8F0', background: '#fff', color: '#1E293B', fontSize: 11 };

  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-300 ${bg} ${pjs.className}`}>
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Header title="Dashboard" />

        {/* ─── DITAMBAHKAN: CUSTOM DIALOG UI ─── */}
        {dialogOptions.isOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className={`w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border flex flex-col animate-in zoom-in-95 duration-200 bg-white dark:bg-[#141414] border-slate-200 dark:border-[#333]`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${dialogOptions.type === 'confirm' ? 'bg-red-50 dark:bg-red-900/30' : 'bg-amber-50 dark:bg-amber-900/30'}`}>
                  {dialogOptions.type === 'confirm' ? <AlertTriangle size={20} className="text-red-500" /> : <AlertCircle size={20} className="text-amber-500" />}
                </div>
                <h3 className="font-black uppercase tracking-widest text-sm text-slate-800 dark:text-white">{dialogOptions.title}</h3>
              </div>
              <p className="text-xs font-semibold leading-relaxed mb-6 text-slate-500 dark:text-[#A3A3A3]">{dialogOptions.message}</p>
              <div className="flex justify-end gap-3 mt-auto">
                <Button variant="ghost" onClick={closeDialog} className="h-10 px-5 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-[#A3A3A3] hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A1A1A]">
                  {dialogOptions.type === 'confirm' ? 'Batal' : 'Tutup'}
                </Button>
                {dialogOptions.type === 'confirm' && (
                  <Button onClick={() => { dialogOptions.onConfirm?.(); closeDialog(); }} className="h-10 px-6 text-[11px] font-bold uppercase tracking-widest bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20">
                    Ya, Lanjutkan
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {isCropModalOpen && rawKopImage && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <div className={`rounded-3xl shadow-2xl w-full max-w-4xl border overflow-hidden flex flex-col ${isDark ? 'bg-[#141414] border-[#333]' : 'bg-white border-slate-200'}`}>
              <div className={`flex items-center justify-between px-7 py-5 border-b ${isDark ? 'bg-[#141414]/80 border-[#333]' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: isDark ? '#0D1F1F' : TEAL_LIGHT }}>
                    <Crop size={16} style={{ color: TEAL_MID }} />
                  </div>
                  <div>
                    <h3 className={`text-base font-extrabold tracking-tight ${text}`}>Crop Kop Surat</h3>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${textXs}`}>
                      Rasio dikunci&nbsp;<span className="text-teal-500">210 : 30 mm</span>&nbsp;(7:1)
                    </p>
                  </div>
                </div>
                <button onClick={handleCancelCrop} className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isDark ? 'bg-[#1A1A1A] text-[#A3A3A3] hover:text-red-400 hover:bg-red-900/30' : 'bg-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50'}`}>
                  <X size={15} />
                </button>
              </div>
              <div className={`flex items-center gap-6 px-7 py-3 border-b ${isDark ? 'bg-teal-900/30 border-teal-800/50' : 'bg-teal-50 border-teal-100'}`}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>Output: 210mm × 30mm (A4 full-width)</span>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <span className={`text-[10px] font-semibold font-mono px-2 py-0.5 rounded ${isDark ? 'text-teal-300 bg-teal-900/50' : 'text-teal-600 bg-teal-100'}`}>1050 × 150 px hi-res</span>
                </div>
              </div>
              <div className="relative w-full bg-black" style={{ height: '340px' }}>
                <Cropper
                  image={rawKopImage} crop={crop} zoom={cropZoom} aspect={210 / 30}
                  onCropChange={setCrop} onZoomChange={setCropZoom} onCropComplete={onCropComplete}
                  showGrid={true}
                  style={{
                    containerStyle: { borderRadius: 0 },
                    cropAreaStyle: { border: `2px solid ${TEAL_MID}`, boxShadow: `0 0 0 9999px rgba(0,0,0,0.85)` },
                  }}
                />
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                  <div className="flex items-center gap-2 bg-black/80 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full border border-white/10">
                    <Crop size={11} /><span>210 × 30 mm</span>
                  </div>
                </div>
              </div>
              <div className={`px-7 py-4 border-t ${isDark ? 'bg-[#141414]/80 border-[#333]' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex items-center gap-4">
                  <span className={`text-[10px] font-bold uppercase tracking-widest shrink-0 ${textXs}`}>Zoom:</span>
                  <button onClick={() => setCropZoom(z => Math.max(1, +(z - 0.1).toFixed(1)))} className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors ${isDark ? 'border-[#333] bg-[#1A1A1A] text-[#A3A3A3] hover:text-teal-400 hover:border-teal-700' : 'border-slate-200 bg-white text-slate-500 hover:text-teal-600 hover:border-teal-300'} `}><ZoomOut size={13} /></button>
                  <input type="range" min={1} max={3} step={0.05} value={cropZoom} onChange={e => setCropZoom(Number(e.target.value))} className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer" style={{ accentColor: TEAL }} />
                  <button onClick={() => setCropZoom(z => Math.min(3, +(z + 0.1).toFixed(1)))} className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors ${isDark ? 'border-[#333] bg-[#1A1A1A] text-[#A3A3A3] hover:text-teal-400 hover:border-teal-700' : 'border-slate-200 bg-white text-slate-500 hover:text-teal-600 hover:border-teal-300'} `}><ZoomIn size={13} /></button>
                  <span className="text-[11px] font-black font-mono w-10 text-right" style={{ color: TEAL_MID }}>{cropZoom.toFixed(2)}×</span>
                  <button onClick={() => { setCropZoom(1); setCrop({ x: 0, y: 0 }); }} className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors ${isDark ? 'border-[#333] bg-[#1A1A1A] text-[#A3A3A3] hover:text-[#FAFAFA] hover:border-[#525252]' : 'border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:border-slate-300'} `} title="Reset zoom"><RotateCcw size={13} /></button>
                </div>
                <p className={`text-[10px] mt-2 font-medium ${textXs}`}>Geser gambar untuk mengatur posisi, gunakan slider untuk zoom.</p>
              </div>
              <div className={`flex justify-end gap-3 px-7 py-5 border-t ${isDark ? 'border-[#333]' : 'border-slate-100'}`}>
                <Button variant="ghost" onClick={handleCancelCrop} className={`h-10 px-6 text-[11px] font-bold uppercase tracking-widest ${isDark ? 'text-[#A3A3A3] hover:text-[#FAFAFA] hover:bg-[#1A1A1A]' : 'text-slate-500 hover:text-slate-700'}`}>Batal</Button>
                <Button onClick={handleConfirmCrop} className="h-10 px-8 text-[11px] font-bold uppercase tracking-widest text-white rounded-xl shadow-lg flex items-center gap-2" style={{ background: TEAL }}>
                  <Check size={14} />Terapkan Kop Surat
                </Button>
              </div>
            </div>
          </div>
        )}

        {isExportModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <div className={`rounded-3xl shadow-2xl flex w-full max-w-[1150px] h-[88vh] overflow-hidden border ${isDark ? 'bg-[#141414] border-[#333]' : 'bg-white border-slate-200'}`}>
              <div className={`w-[360px] border-r flex flex-col ${isDark ? 'border-[#333] bg-[#141414]' : 'border-slate-100 bg-white'}`}>
                <div className={`p-5 border-b flex justify-between items-center ${isDark ? 'border-[#333]' : 'border-slate-50'}`}>
                  <div>
                    <h3 className={`text-lg font-extrabold ${text}`}>Export Configuration</h3>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${textXs}`}>Configure layout &amp; content</p>
                  </div>
                  <button onClick={() => setIsExportModalOpen(false)} className={`transition-colors ${isDark ? 'text-[#737373] hover:text-red-400' : 'text-slate-300 hover:text-red-500'}`}><X size={20} /></button>
                </div>
                <div className="p-5 flex-1 overflow-y-auto space-y-5">
                  <div className="space-y-3">
                    <label className={`text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 ${textSm}`}><Calendar size={13} /> Date Range</label>
                    <div className="space-y-2">
                      <input type="date" value={exportStartDate} onChange={(e)=>setExportStartDate(e.target.value)} className={`w-full h-10 px-3 rounded-xl border text-xs font-bold outline-none transition-all cursor-pointer ${inputCls}`} />
                      <input type="date" value={exportEndDate} onChange={(e)=>setExportEndDate(e.target.value)} className={`w-full h-10 px-3 rounded-xl border text-xs font-bold outline-none transition-all cursor-pointer ${inputCls}`} />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className={`text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 ${textSm}`}><User size={13} /> Metadata Teks Sampul</label>
                    <div className="space-y-2">
                      <div><span className={`text-[9px] font-bold uppercase mb-1 block ml-1 ${textXs}`}>Dianalisis &amp; Dicetak Oleh:</span><input type="text" value={customPrinterName} onChange={(e)=>setCustomPrinterName(e.target.value)} className={`w-full h-10 px-3 rounded-xl border text-xs font-bold text-teal-500 outline-none transition-all ${inputCls}`} /></div>
                      <div><span className={`text-[9px] font-bold uppercase mb-1 block ml-1 ${textXs}`}>Waktu Cetak Dokumen:</span><input type="text" value={customPrintDate} onChange={(e)=>setCustomPrintDate(e.target.value)} className={`w-full h-10 px-3 rounded-xl border text-xs font-bold text-teal-500 outline-none transition-all ${inputCls}`} /></div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className={`text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 ${textSm}`}>
                      <Upload size={13} /> Custom Letterhead
                      <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full border" style={{ background: isDark ? '#0D1F1F' : TEAL_LIGHT, color: TEAL_MID, borderColor: isDark ? '#1E4A55' : '#B8DDE3' }}>210 × 30 mm</span>
                    </label>
                    <div className={`relative w-full rounded-2xl overflow-hidden border-2 border-dashed transition-colors ${isDark ? 'border-[#333] bg-[#1A1A1A]/50 hover:border-teal-700' : 'border-slate-200 bg-slate-50 hover:border-teal-300'} `} style={{ aspectRatio: '7 / 1' }}>
                      {customKopBase64 ? (
                        <img src={customKopBase64} alt="Kop Surat" className="w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 cursor-pointer" onClick={() => kopFileInputRef.current?.click()}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${isDark ? 'bg-[#262626] text-[#737373]' : 'bg-white text-slate-300'}`}><Upload size={14} /></div>
                          <p className={`text-[9px] font-bold ${textXs}`}>Klik untuk upload gambar kop</p>
                          <p className={`text-[8px] font-mono ${isDark ? 'text-[#525252]' : 'text-slate-300'}`}>JPG / PNG • Rasio 210:30 mm</p>
                        </div>
                      )}
                      {customKopBase64 && (
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-all group flex items-center justify-center gap-2">
                          <button onClick={handleReEditKop} className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-slate-700 text-[10px] font-bold shadow-lg hover:bg-teal-50 hover:text-teal-700"><Crop size={12} /> Re-crop</button>
                          <button onClick={() => kopFileInputRef.current?.click()} className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-slate-700 text-[10px] font-bold shadow-lg hover:bg-teal-50 hover:text-teal-700"><Upload size={12} /> Ganti</button>
                          <button onClick={(e) => { e.stopPropagation(); setCustomKopBase64(null); }} className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-red-500 text-[10px] font-bold shadow-lg hover:bg-red-50"><X size={12} /> Hapus</button>
                        </div>
                      )}
                    </div>
                    <input ref={kopFileInputRef} type="file" accept="image/*" onChange={handleKopUpload} className="hidden" />
                    {customKopBase64 ? (
                      <p className="text-[9px] font-semibold text-emerald-500 flex items-center gap-1.5"><Check size={10} /> Kop surat terpasang — hover untuk mengedit</p>
                    ) : (
                      <button onClick={() => kopFileInputRef.current?.click()} className={`w-full h-9 rounded-xl border border-dashed text-[10px] font-bold transition-all flex items-center justify-center gap-2 ${isDark ? 'border-[#333] text-[#737373] hover:border-teal-700 hover:text-teal-400 hover:bg-teal-900/20' : 'border-slate-200 text-slate-400 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50'} `}>
                        <Upload size={12} /> Upload &amp; Crop Kop Surat
                      </button>
                    )}
                  </div>
                </div>
                <div className={`p-5 border-t flex flex-col gap-2 ${isDark ? 'bg-[#141414]/50 border-[#333]' : 'bg-slate-50/50 border-slate-100'}`}>
                  <Button onClick={handleGeneratePreview} disabled={isPreviewLoading} className="w-full h-11 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20">{isPreviewLoading ? <Loader2 size={15} className="animate-spin" /> : <FileSearch size={15} />} Refresh Preview</Button>
                  <Button onClick={handleDownloadPdf} disabled={!previewPdfUrl || isPreviewLoading || isFinalExporting} className={`w-full h-11 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 ${isDark ? 'bg-[#262626] hover:bg-[#333]' : 'bg-slate-800 hover:bg-slate-900'} `}>{isFinalExporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Download PDF Report</Button>
                </div>
              </div>
              <div className={`flex-1 relative flex items-center justify-center ${isDark ? 'bg-[#0A0A0A]' : 'bg-slate-200'}`}>
                {previewPdfUrl
                  ? <iframe src={`${previewPdfUrl}#toolbar=0`} className="w-full h-full border-none" title="PDF Preview" />
                  : <div className="text-center p-10">
                      <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl border ${isDark ? 'bg-[#141414] border-[#333] text-[#525252]' : 'bg-white border-slate-100 text-slate-200'} `}><FileText size={40} /></div>
                      <p className={`font-extrabold text-sm ${textSm}`}>Pratinjau PDF Belum Dimuat</p>
                      <p className={`text-[11px] mt-2 ${textXs}`}>Tekan "Refresh Preview" untuk mengenerate laporan.</p>
                    </div>
                }
                {isPreviewLoading && (
                  <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                    <Loader2 size={32} className="text-teal-500 animate-spin mb-4" />
                    <p className={`font-bold text-xs px-4 py-2 rounded-full shadow-2xl ${isDark ? 'bg-[#141414] text-teal-300' : 'bg-white text-slate-800'}`}>Membangun Dokumen PDF...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL: CROP FOTO MESIN ── */}
        {activeNodeForImage && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className={`rounded-3xl shadow-2xl w-full max-w-md border overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 ${isDark ? 'bg-[#141414] border-[#333]' : 'bg-white border-slate-200'}`}>
              <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'bg-[#141414]/80 border-[#333]' : 'bg-slate-50 border-slate-100'} `}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-teal-900/50 text-teal-400' : 'bg-teal-100 text-teal-600'} `}><Cpu size={16}/></div>
                  <div>
                    <h3 className={`text-sm font-extrabold tracking-tight ${text}`}>Logo Node Mesin</h3>
                    <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${textXs}`}>{activeNodeForImage.plcName}</p>
                  </div>
                </div>
                <button onClick={() => { setActiveNodeForImage(null); setRawNodeImage(null); }} className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${isDark ? 'bg-[#1A1A1A] text-[#A3A3A3] hover:text-red-400 hover:bg-red-900/30' : 'bg-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50'} `}><X size={14}/></button>
              </div>
              <div className="p-6">
                {rawNodeImage ? (
                  <div className="space-y-4">
                    <div className="relative w-full bg-black rounded-2xl overflow-hidden" style={{ height: '280px' }}>
                      <Cropper image={rawNodeImage} crop={nodeCrop} zoom={nodeCropZoom} aspect={1} onCropChange={setNodeCrop} onZoomChange={setNodeCropZoom} onCropComplete={(_, croppedPixels) => setNodeCroppedAreaPixels(croppedPixels)} style={{ cropAreaStyle: { border: `2px solid ${TEAL_MID}`, borderRadius: '20px' } }} />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setRawNodeImage(null)} className={`h-9 text-xs font-bold ${isDark ? 'text-[#A3A3A3] hover:text-[#FAFAFA] hover:bg-[#1A1A1A]' : ''} `}>Batal</Button>
                      <Button style={{ background: TEAL }} onClick={handleConfirmNodeCrop} className="h-9 text-xs font-bold text-white"><Check size={14} className="mr-1.5"/> Simpan Crop</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className={`w-32 h-32 rounded-[2rem] border-4 overflow-hidden flex items-center justify-center mb-6 shadow-lg ${isDark ? 'bg-[#1A1A1A] border-[#333]' : 'bg-slate-100 border-slate-50'} `}>
                      {nodeImages[activeNodeForImage.plcId] ? (
                        <img src={nodeImages[activeNodeForImage.plcId]} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Cpu size={40} className={isDark ? 'text-[#525252]' : 'text-slate-300'} />
                      )}
                    </div>
                    <div className="flex gap-2 w-full">
                      <input type="file" accept="image/*" className="hidden" ref={nodeFileInputRef} onChange={handleNodeImageUpload} />
                      {nodeImages[activeNodeForImage.plcId] ? (
                        <>
                          <Button className={`flex-1 h-10 text-xs font-bold shadow-sm ${isDark ? 'border-[#333] text-[#A3A3A3] hover:bg-[#1A1A1A] bg-transparent' : ''} `} variant="outline" onClick={() => nodeFileInputRef.current?.click()}><Edit3 size={14} className="mr-2"/> Ganti Foto</Button>
                          <Button className={`flex-1 h-10 text-xs font-bold shadow-sm ${isDark ? 'border-red-900 text-red-400 hover:bg-red-900/30 hover:text-red-300 bg-transparent' : 'text-red-500 hover:text-red-600 hover:bg-red-50 border-red-100'} `} variant="outline" onClick={handleDeleteNodeImage}><Trash2 size={14} className="mr-2"/> Hapus Foto</Button>
                        </>
                      ) : (
                        <Button className="w-full h-11 text-xs font-bold text-white shadow-lg" style={{ background: TEAL }} onClick={() => nodeFileInputRef.current?.click()}><Upload size={15} className="mr-2"/> Upload Foto Mesin (Rasio 1:1)</Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <main className={`flex-1 overflow-y-auto p-6 md:p-10 transition-colors duration-300 ${isDark ? 'bg-[#0A0A0A]' : 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-600/5 via-slate-50 to-slate-100'}`}>
          <div className="max-w-[1600px] mx-auto space-y-7">

            <div className={`relative rounded-2xl border overflow-hidden shadow-sm ${card}`}>
              <div className="pointer-events-none absolute top-0 right-0 w-72 h-full" style={{ background: isDark ? 'linear-gradient(135deg, transparent 55%, #0D1F1F20 100%)' : 'linear-gradient(135deg, transparent 55%, #E8F4F6 100%)' }} />
              <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-5 p-7 md:p-9">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider mb-3 border" style={{ background: isDark ? '#0D1F1F' : TEAL_LIGHT, borderColor: isDark ? '#1E4A55' : '#B8DDE3', color: TEAL_MID }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: TEAL_MID }} />
                    System Online
                  </div>
                  <h1 className={`text-3xl md:text-4xl font-extrabold tracking-tight mb-1 ${text}`}>
                    Matrix <span style={{ color: TEAL_MID }}> Dashboard</span>
                  </h1>
                  <div className={`text-sm font-mono flex items-center gap-2 mt-1 ${textXs}`}>
                    <span>Sesi aktif: <span className="font-semibold" style={{ color: TEAL_MID }}>{activeUser}</span></span>
                    {isGuest && (
                        <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest shadow-sm ${isDark ? 'bg-red-900/30 text-red-400 border-red-800' : 'bg-red-50 text-red-600 border-red-200'}`}>
                        Guest Mode
                        </span>
                    )}
                </div>
                </div>
                <div className="flex items-center gap-3 z-10">
                  <button
                    onClick={toggleDark}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                      isDark ? 'border-[#333] bg-[#1A1A1A] text-amber-400 hover:border-amber-600 hover:text-amber-300 hover:bg-amber-900/20' : 'border-slate-200 bg-white text-slate-500 hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50'
                    }`}
                  >
                    {isDark ? <Sun size={14} /> : <Moon size={14} />}
                    {isDark ? 'Light' : 'Dark'}
                  </button>
                  <button onClick={handleRefresh} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${isDark ? 'border-[#333] bg-[#1A1A1A] text-[#A3A3A3] hover:border-teal-700 hover:text-teal-400 hover:bg-[#262626]' : 'border-slate-200 bg-white text-slate-500 hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50'} `}>
                    <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} /> Refresh
                  </button>
                  {/* ─── DITAMBAHKAN: GUEST RESTRICTION UNTUK TOMBOL EXPORT GLOBAL ─── */}
                  <button onClick={openExportModalGlobal} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-xs font-bold transition-all shadow-lg ${isGuest ? 'opacity-50 cursor-not-allowed bg-slate-400 shadow-none' : 'hover:opacity-90 shadow-teal-600/20'}`} style={{ background: isGuest ? '' : TEAL }}>
                    <FileText size={15} /> Export &amp; Design PDF
                  </button>
                </div>
              </div>
            </div>

            <div className={`p-5 rounded-2xl border shadow-sm flex flex-col gap-4 ${card}`}>
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                  <label className={`text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5 ${textSm}`}><Server size={12}/> Pilih Mesin</label>
                  <select value={filterPlc} onChange={e => setFilterPlc(e.target.value)} className={`w-full h-11 px-3 rounded-xl border text-xs font-bold outline-none focus:border-teal-400 cursor-pointer transition-colors ${selectCls}`}>
                    <option value="ALL">➔ SEMUA MESIN (GLOBAL)</option>
                    {plcOptions.map(p => (<option key={p.id} value={p.plc_name || p.nama_mesin}>{p.plc_name || p.nama_mesin}</option>))}
                  </select>
                </div>
                <div className="flex-1 w-full">
                  <label className={`text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5 ${textSm}`}><Calendar size={12}/> Dari Tanggal</label>
                  <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className={`w-full h-11 px-3 rounded-xl border text-xs font-bold outline-none transition-all cursor-pointer ${inputCls}`} />
                </div>
                <div className="flex-1 w-full">
                  <label className={`text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5 ${textSm}`}><Calendar size={12}/> Sampai Tanggal</label>
                  <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className={`w-full h-11 px-3 rounded-xl border text-xs font-bold outline-none transition-all cursor-pointer ${inputCls}`} />
                </div>
                <Button onClick={handleApplyFilter} disabled={isRefreshing} className="h-11 px-8 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-teal-600/20 w-full md:w-auto">
                  {isRefreshing ? <Loader2 size={14} className="animate-spin" /> : <Filter size={14} />} Terapkan Filter
                </Button>
              </div>

              {filterPlc !== 'ALL' && multiNodeCharts.find(n => n.plcName === filterPlc) && (
                <div className={`pt-4 border-t flex items-center gap-3 flex-wrap animate-in fade-in ${divider}`}>
                  <span className={`text-[10px] font-bold uppercase tracking-widest mr-2 ${textXs}`}>Tampilkan Tags:</span>
                  {multiNodeCharts.find(n => n.plcName === filterPlc)?.parameterKeys.map((k: string, i: number) => {
                    const plcId = multiNodeCharts.find(n => n.plcName === filterPlc)?.plcId;
                    const isHidden = hiddenTags[`${plcId}-${k}`];
                    return (
                      <label key={k} className={`flex items-center gap-2 cursor-pointer group border px-3 py-1.5 rounded-lg transition-colors ${isDark ? 'bg-[#1A1A1A] border-[#333] hover:bg-teal-900/30 hover:border-teal-800' : 'bg-slate-50 border-slate-200 hover:bg-teal-50 hover:border-teal-200'} `}>
                        <input type="checkbox" checked={!isHidden} onChange={() => toggleTag(plcId, k)} className="w-4 h-4 accent-teal-500 rounded focus:ring-teal-500 cursor-pointer" />
                        <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${!isHidden ? isDark ? 'text-[#FAFAFA]' : 'text-slate-700' : textXs}`}>{k}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard isDark={isDark} value={totalSegments} label={filterPlc === 'ALL' ? "Total Bridge Configs" : "Filter Aktif"} trend={12} icon={Server} iconColor={TEAL_MID} iconBg={TEAL_LIGHT} barColor={TEAL} stripeColor={TEAL} />
              <StatCard isDark={isDark} value={onlineCount} label="Active Bridges" trend={8} icon={Wifi} iconColor="#22C55E" iconBg={GREEN_LIGHT} barColor="#22C55E" stripeColor="#22C55E" />
              <StatCard isDark={isDark} value={offlineCount} label="Offline Bridges" trend={-15} icon={WifiOff} iconColor={RED} iconBg={RED_LIGHT} barColor={RED} stripeColor={RED} />
              <StatCard isDark={isDark} value={systemMetrics.uptime} label="System Uptime" trend={0.5} icon={Activity} iconColor={PURPLE} iconBg={PURPLE_LIGHT} barColor={PURPLE} stripeColor={PURPLE} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className={`rounded-2xl border p-6 ${card}`}>
                <div className={`flex items-center justify-between mb-5 pb-4 border-b ${divider}`}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: isDark ? '#1A1A1A' : PURPLE_LIGHT }}><PieIcon size={15} style={{ color: PURPLE }} /></div>
                    <div>
                      <p className={`text-[11px] font-bold uppercase tracking-wider ${text}`}>Health Distribution</p>
                      <p className={`text-[10px] font-mono ${textXs}`}>Node status</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-5">
                  <div className="w-36 h-36 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusDist.length ? statusDist : [{ name: 'Online', value: onlineCount }, { name: 'Offline', value: offlineCount }]} cx="50%" cy="50%" innerRadius={44} outerRadius={64} paddingAngle={3} dataKey="value" stroke="none" startAngle={90} endAngle={-270}>
                          {(statusDist.length ? statusDist : [{ name: 'Online', value: onlineCount }, { name: 'Offline', value: offlineCount }]).map((entry: any, i: number) => {
                            const nm = (entry.name ?? '').toLowerCase();
                            const c  = nm.includes('offline') || nm.includes('error') ? RED : nm.includes('warning') ? AMBER : TEAL_MID;
                            return <Cell key={i} fill={c} />;
                          })}
                          <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 20, fontWeight: 800, fill: isDark ? '#FAFAFA' : '#1E293B' }}>{pieTotal}</text>
                          <text x="50%" y="62%" textAnchor="middle" style={{ fontSize: 8, fontWeight: 600, fill: isDark ? '#525252' : '#94A3B8', letterSpacing: 1.5 }}>NODES</text>
                        </Pie>
                        <RechartsTooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-3 flex-1">
                    <div className="flex items-center gap-2.5"><span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: TEAL_MID }} /><span className={`text-xs font-semibold flex-1 ${textSm}`}>Online</span><span className={`text-sm font-extrabold font-mono ${text}`}>{onlineCount}</span></div>
                    <div className="flex items-center gap-2.5"><span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: RED }} /><span className={`text-xs font-semibold flex-1 ${textSm}`}>Offline</span><span className={`text-sm font-extrabold font-mono ${text}`}>{offlineCount}</span></div>
                    <div className={`border-t pt-2.5 ${divider}`}><div className="flex items-center justify-between"><span className={`text-[10px] font-semibold uppercase tracking-wider ${textXs}`}>Uptime</span><span className="text-[13px] font-bold font-mono" style={{ color: TEAL_MID }}>{((onlineCount / pieTotal) * 100).toFixed(1)}%</span></div></div>
                  </div>
                </div>
              </div>

              <div className={`lg:col-span-2 rounded-2xl border p-6 ${card}`}>
                <div className={`flex items-center justify-between mb-4 pb-4 border-b ${divider}`}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: isDark ? '#1A1A1A' : AMBER_LIGHT }}><AlertTriangle size={15} style={{ color: AMBER }} /></div>
                    <div>
                      <p className={`text-[11px] font-bold uppercase tracking-wider ${text}`}>System Uptime Overview</p>
                      <p className={`text-[10px] font-mono ${textXs}`}>Daily online / offline percentage</p>
                    </div>
                  </div>
                  <div className={`flex p-1 rounded-xl gap-1 ${isDark ? 'bg-[#1A1A1A]' : 'bg-slate-100'}`}>
                    {(['this', 'prev', 'compare'] as const).map(t => (
                      <button key={t} onClick={() => setUptimeTab(t)} className={`px-3 py-1.5 text-[9px] font-bold rounded-lg transition-all uppercase tracking-widest ${uptimeTab === t ? isDark ? 'bg-[#262626] shadow-sm text-teal-400' : 'bg-white shadow-sm text-teal-700' : isDark ? 'text-[#737373] hover:text-[#A3A3A3]' : 'text-slate-400 hover:text-slate-600'} `}>{t === 'this' ? 'This Month' : t === 'prev' ? 'Previous Month' : 'Compare'}</button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 mb-4">
                  {[
                    { label: 'Avg uptime this month', val: avgUptimePct(monthlyStats), color: isDark ? '#4ADE80' : GREEN },
                    { label: 'Avg uptime prev month', val: avgUptimePct(prevMonthStats), color: '#60A5FA' },
                    { label: 'Offline events (this month)', val: `${offlineEventCount(monthlyStats)}x`, color: isDark ? '#F87171' : RED },
                  ].map(({ label, val, color }) => (
                    <div key={label} className={`flex-1 rounded-xl p-3 border ${isDark ? 'bg-[#1A1A1A]/50 border-[#333]' : 'bg-slate-50 border-slate-100'} `}>
                      <p className={`text-[9px] uppercase tracking-widest mb-1 font-semibold ${textXs}`}>{label}</p>
                      <p className="text-[18px] font-extrabold font-mono" style={{ color }}>{val}</p>
                    </div>
                  ))}
                </div>
                {monthlyStats.length === 0 && prevMonthStats.length === 0 ? (
                  <div className={`flex flex-col items-center justify-center h-40 rounded-xl gap-3 border-2 border-dashed ${isDark ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'} `}>
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isDark ? 'bg-green-900/50' : 'bg-green-100'} `}><CheckCircle2 size={22} style={{ color: isDark ? '#4ADE80' : GREEN }} /></div>
                    <p className="font-bold text-xs uppercase tracking-widest" style={{ color: isDark ? '#4ADE80' : GREEN }}>100% Uptime</p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-4 mb-3">
                      {uptimeTab !== 'prev' && (
                        <><div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: '#9FE1CB' }} /><span className={`text-[10px] font-semibold ${textSm}`}>Online %</span></div><div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: '#F7C1C1' }} /><span className={`text-[10px] font-semibold ${textSm}`}>Offline %</span></div></>
                      )}
                      {uptimeTab === 'compare' && (<div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: '#60A5FA', opacity: 0.7 }} /><span className={`text-[10px] font-semibold ${textSm}`}>Previous month online %</span></div>)}
                      {uptimeTab === 'prev' && (
                        <><div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: '#B5D4F4' }} /><span className={`text-[10px] font-semibold ${textSm}`}>Online % (prev month)</span></div><div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: '#F7C1C1' }} /><span className={`text-[10px] font-semibold ${textSm}`}>Offline % (prev month)</span></div></>
                      )}
                    </div>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        {uptimeTab === 'compare' ? (
                          <AreaChart margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#262626' : '#F1F5F9'} />
                            <XAxis dataKey="day" type="category" allowDuplicatedCategory={false} fontSize={9} fontWeight={600} tickLine={false} axisLine={false} stroke={isDark ? '#525252' : '#94A3B8'} />
                            <YAxis domain={[80, 100]} tickFormatter={(v: number) => `${v}%`} fontSize={9} fontWeight={600} tickLine={false} axisLine={false} stroke={isDark ? '#525252' : '#94A3B8'} />
                            <RechartsTooltip formatter={(v: any) => [`${v}%`]} contentStyle={tooltipStyle} />
                            <Area data={monthlyStats} type="monotone" name="This month online %" dataKey="onlinePct" stroke={TEAL_MID} fill={TEAL_MID} fillOpacity={0.12} strokeWidth={2} />
                            <Area data={prevMonthStats} type="monotone" name="Previous month online %" dataKey="onlinePct" stroke="#60A5FA" fill="#60A5FA" fillOpacity={0.07} strokeWidth={2} strokeDasharray="5 3" />
                          </AreaChart>
                        ) : (
                          <BarChart data={uptimeTab === 'this' ? monthlyStats : prevMonthStats} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#262626' : '#F1F5F9'} />
                            <XAxis dataKey="day" fontSize={9} fontWeight={600} tickLine={false} axisLine={false} stroke={isDark ? '#525252' : '#94A3B8'} />
                            <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} fontSize={9} fontWeight={600} tickLine={false} axisLine={false} stroke={isDark ? '#525252' : '#94A3B8'} />
                            <RechartsTooltip formatter={(v: any) => [`${v}%`]} cursor={{ fill: isDark ? '#262626' : '#F8FAFC' }} contentStyle={tooltipStyle} />
                            <Bar name="Online %" dataKey="onlinePct" stackId="uptime" fill={uptimeTab === 'this' ? '#9FE1CB' : '#B5D4F4'} stroke={uptimeTab === 'this' ? TEAL_MID : '#60A5FA'} strokeWidth={1} radius={[4, 4, 0, 0]} maxBarSize={48} />
                            <Bar name="Offline %" dataKey="offlinePct" stackId="uptime" fill="#F7C1C1" stroke={RED} strokeWidth={1} radius={[0, 0, 0, 0]} maxBarSize={48} />
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </div>
            </div>

            <section className="space-y-4 pt-4">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 pb-2">
                <div className="flex items-center gap-3">
                  <Settings size={20} className={textXs}/>
                  <h3 className={`font-black uppercase text-[15px] ${text}`}>Konfigurasi Bridge (OPC UA to SQL)</h3>
                </div>
                {/* ─── DITAMBAHKAN: GUEST RESTRICTION UNTUK TOMBOL KONFIGURASI ─── */}
                <button 
                  onClick={() => isGuest ? handleGuestRestriction() : router.push('/plc-config')} 
                  className={`group text-[10px] font-bold px-4 py-2 rounded-full uppercase tracking-widest flex items-center gap-1 transition-all w-fit ${isDark ? 'text-[#A3A3A3] bg-[#1A1A1A] hover:bg-[#262626]' : 'text-slate-500 bg-slate-100 hover:bg-slate-200'} ${isGuest ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Konfigurasi <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform"/>
                </button>
              </div>
              <Card className={`rounded-[2.5rem] border overflow-hidden shadow-sm ${isDark ? 'bg-[#141414] border-[#333] shadow-black/40' : 'bg-white border-transparent shadow-slate-200/40'} `}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className={`text-[10px] font-black uppercase tracking-widest border-b ${isDark ? 'bg-[#1A1A1A]/50 text-[#737373] border-[#333]' : 'bg-slate-50 text-slate-400 border-slate-100'} `}>
                      <tr><th className="p-6 w-1/4">Informasi Bridge</th><th className="p-6 w-1/4">Endpoint OPC UA</th><th className="p-6 text-center">Monitoring Tags</th><th className="p-6">Status</th></tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-[#333]' : 'divide-slate-50'} `}>
                      {(Array.isArray(configs) ? configs : []).slice(0, 5).map((cfg) => (
                        <tr key={cfg.id} className={`text-sm group transition-all duration-300 ${isDark ? 'hover:bg-[#1A1A1A]/50' : 'hover:bg-slate-50/50'} `}>
                          <td className="p-6">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: isDark ? '#0D1F1F' : TEAL_LIGHT }}><Database size={16} style={{ color: TEAL_MID }}/></div>
                              <div>
                                <div className={`font-black text-base tracking-tight mb-1 ${text}`}>{cfg.plc_name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-6"><div className={`font-mono font-bold inline-block px-3 py-1 rounded-lg text-[10px] max-w-[180px] truncate ${isDark ? 'bg-[#1A1A1A] text-[#A3A3A3]' : 'bg-slate-100 text-slate-500'} `} title={cfg.endpoint_url}>{cfg.endpoint_url}</div></td>
                          <td className="p-6">
                            <div className="flex flex-wrap gap-1.5 justify-center">
                              {cfg.tags_json && JSON.parse(cfg.tags_json).slice(0, 3).map((t: any) => (<span key={t.nodeId} className={`border rounded-md px-2 py-1 text-[9px] font-bold uppercase tracking-wider font-mono shadow-sm ${isDark ? 'bg-[#1A1A1A] border-[#333] text-[#A3A3A3]' : 'bg-white border-slate-200 text-slate-600'} `}>{t.name}</span>))}
                              {cfg.tags_json && JSON.parse(cfg.tags_json).length > 3 && (<span className={`rounded-md px-2 py-1 text-[9px] font-bold uppercase tracking-wider font-mono border ${isDark ? 'bg-[#1A1A1A] text-[#737373] border-[#333]' : 'bg-slate-100 text-slate-500 border-slate-200'} `}>+{JSON.parse(cfg.tags_json).length - 3}</span>)}
                              {(!cfg.tags_json || JSON.parse(cfg.tags_json).length === 0) && (<span className={`text-[10px] italic ${textXs}`}>Belum Ada Tag</span>)}
                            </div>
                          </td>
                          <td className="p-6">
                            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${isDark ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' : 'bg-emerald-50 text-emerald-600 border-emerald-100'} `}>
                              <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>Active
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </section>

            <div className="pt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-[14px] font-extrabold uppercase tracking-wider ${text}`}>Miniatur Analitik (Sparklines)</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredNodes.map((device, idx) => (
                  <DeviceCard 
                    key={device.plcId} 
                    device={device} 
                    color={CHART_COLORS[idx % CHART_COLORS.length]} 
                    // DITAMBAHKAN: Pengecekan Guest Mode
                    onExport={() => isGuest ? handleGuestRestriction() : openExportModalNode(device.plcId, device.plcName)} 
                    onView={() => router.push(`/analytics/${device.plcId}`)} 
                    isExporting={false} 
                    nodeImage={nodeImages[device.plcId]}
                    onManageImage={() => isGuest ? handleGuestRestriction() : setActiveNodeForImage(device)}
                    isDark={isDark}
                  />
                ))}
                {filteredNodes.length === 0 && (
                  <Card className={`col-span-full p-12 text-center border rounded-2xl ${isDark ? 'bg-[#141414] border-[#333]' : 'bg-white border-slate-200'} `}>
                    <Layers size={36} className={`mx-auto mb-3 ${textXs}`} />
                    <p className={`font-bold text-xs uppercase tracking-widest ${textXs}`}>Tidak ada mesin terdeteksi</p>
                  </Card>
                )}
              </div>
            </div>

            {filteredNodes.length > 0 && (
              <Card className={`border rounded-2xl overflow-hidden shadow-sm mt-8 ${isDark ? 'bg-[#141414] border-[#333]' : 'bg-white border-slate-200'} `}>
                <div className={`flex items-center justify-between px-6 py-4 border-b ${divider}`}>
                  <div className={`flex p-1 rounded-xl gap-1 ${isDark ? 'bg-[#1A1A1A]' : 'bg-slate-100'} `}>
                    <button onClick={() => setActiveTab('overview')} className={`px-5 py-2 text-[10px] font-bold rounded-lg transition-all uppercase tracking-widest ${activeTab === 'overview' ? isDark ? 'bg-[#262626] shadow-sm text-teal-400' : 'bg-white shadow-sm text-teal-700' : isDark ? 'text-[#737373] hover:text-[#A3A3A3]' : 'text-slate-400 hover:text-slate-700'} `}>Detailed Analysis</button>
                    <button onClick={() => setActiveTab('alerts')} className={`px-5 py-2 text-[10px] font-bold rounded-lg transition-all uppercase tracking-widest ${activeTab === 'alerts' ? isDark ? 'bg-[#262626] shadow-sm text-red-400' : 'bg-white shadow-sm text-red-600' : isDark ? 'text-[#737373] hover:text-[#A3A3A3]' : 'text-slate-400 hover:text-slate-700'} `}>System Alerts ({lostLogs.length})</button>
                  </div>
                </div>

                <div className="p-6">
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      {filteredNodes.map((node, idx) => (
                        <div key={node.plcId} className={`p-5 rounded-xl border transition-colors ${isDark ? 'bg-[#0A0A0A]/40 border-[#333] hover:border-teal-800' : 'bg-slate-50 border-slate-100 hover:border-teal-100'} `}>
                          <div className={`flex items-center gap-3 mb-5 pb-4 border-b ${divider}`}>
                            <div className="w-1 h-8 rounded-full" style={{ background: CHART_COLORS[idx % CHART_COLORS.length] }} />
                            <div>
                              <p className={`font-extrabold uppercase tracking-tight ${text}`}>{node.plcName}</p>
                              <p className={`text-[9px] font-mono mt-0.5 ${textXs}`}>{node.plcId}</p>
                            </div>
                          </div>

                          <div className={`rounded-xl border p-5 mb-4 shadow-sm ${isDark ? 'bg-[#141414] border-[#333]' : 'bg-white border-slate-100'} `}>
                            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                              <p className={`text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${textXs}`}><Activity size={12} style={{ color: TEAL_MID }} /> Realtime Data Fluctuation</p>
                              <div className={`flex items-center gap-3 border px-3 py-1.5 rounded-lg shadow-inner ${isDark ? 'bg-[#1A1A1A] border-[#333]' : 'bg-slate-50 border-slate-200'} `}>
                                <span className={`text-[9px] font-bold uppercase tracking-widest ${textXs}`}>Max Y-Axis:</span>
                                <input type="number" min="0" step="0.01" placeholder="Auto" value={yZoom[node.plcId] || ''} onChange={(e) => { const val = e.target.value; setYZoom({ ...yZoom, [node.plcId]: val ? Number(val) : 0 }); }} className={`w-20 px-2 py-1 text-xs font-bold text-teal-500 border rounded outline-none focus:border-teal-400 ${isDark ? 'bg-[#262626] border-[#525252] text-teal-400' : 'bg-white border-slate-200 text-teal-700'} `} />
                                <span className={`text-[9px] font-mono font-bold ${isDark ? 'text-teal-400' : 'text-teal-600'} `}>{yZoom[node.plcId] ? 'Manual' : 'Auto Fit'}</span>
                              </div>
                            </div>

                            <div className={`w-full overflow-auto rounded-xl border ${isDark ? 'border-[#333] bg-[#0A0A0A]/30' : 'border-slate-100 bg-slate-50/30'} `} style={{ maxHeight: '450px' }}>
                              <div style={{ width: '1500px', height: '400px', paddingRight: '20px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={node.realtimeData} margin={{ top: 20, right: 20, left: -20, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#262626' : '#e2e8f0'} />
                                    <XAxis dataKey="time" fontSize={10} fontWeight={700} tickLine={false} axisLine={false} stroke={isDark ? '#525252' : '#64748b'} />
                                    <YAxis domain={[0, yZoom[node.plcId] ? yZoom[node.plcId] : 'auto']} allowDataOverflow={true} fontSize={10} fontWeight={700} tickLine={false} axisLine={false} stroke={isDark ? '#525252' : '#64748b'} />
                                    <RechartsTooltip contentStyle={{ ...tooltipStyle, fontWeight: 'bold' }} />
                                    {(node.parameterKeys ?? []).map((k: string, i: number) => {
                                      if (hiddenTags[`${node.plcId}-${k}`]) return null;
                                      return <Area key={k} type="monotone" name={k} dataKey={k} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={3} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={isDark ? 0.06 : 0.1} activeDot={{ r: 6, strokeWidth: 0 }} />;
                                    })}
                                    <Brush dataKey="time" height={25} stroke={TEAL} fill={isDark ? '#0A0A0A' : '#f1f5f9'} travellerWidth={15} tickFormatter={() => ''} />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-3 mt-6 justify-center">
                              {(node.parameterKeys ?? []).map((k: string, i: number) => {
                                const isHidden = hiddenTags[`${node.plcId}-${k}`];
                                return (
                                  <button key={k} onClick={() => toggleTag(node.plcId, k)} className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest transition-all border px-3 py-1.5 rounded-full shadow-sm ${isDark ? 'bg-[#1A1A1A] border-[#333] hover:opacity-70' : 'bg-white border-slate-200 hover:opacity-70'} `} style={{ color: isHidden ? isDark ? '#262626' : '#cbd5e1' : isDark ? '#A3A3A3' : '#475569', textDecoration: isHidden ? 'line-through' : 'none' }}>
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: isHidden ? isDark ? '#262626' : '#e2e8f0' : CHART_COLORS[i % CHART_COLORS.length] }} />{k}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {[
                              { title: 'This Month Average',    data: node.trendBulanIni,  icon: CalendarDays, col: TEAL_MID },
                              { title: 'Last Month Comparison', data: node.trendBulanLalu, icon: CalendarDays, col: PURPLE, dashed: true },
                            ].map(({ title, data, icon: Ico, col, dashed }) => (
                              <div key={title} className={`rounded-xl border p-5 ${isDark ? 'bg-[#141414] border-[#333]' : 'bg-white border-slate-100'} `}>
                                <p className="text-[9px] font-bold uppercase tracking-widest mb-4 flex items-center gap-1.5" style={{ color: col }}><Ico size={12} style={{ color: col }} /> {title}</p>
                                <div className="h-48">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 20 }}>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#262626' : '#F1F5F9'} />
                                      <XAxis dataKey="time" fontSize={9} fontWeight={600} tickLine={false} axisLine={false} stroke={isDark ? '#525252' : '#94A3B8'} />
                                      <YAxis domain={[0, yZoom[node.plcId] ? yZoom[node.plcId] : 'auto']} allowDataOverflow={true} fontSize={9} fontWeight={600} tickLine={false} axisLine={false} stroke={isDark ? '#525252' : '#94A3B8'} />
                                      <RechartsTooltip contentStyle={tooltipStyle} />
                                      {(node.parameterKeys ?? []).map((k: string, i: number) => {
                                        if (hiddenTags[`${node.plcId}-${k}`]) return null;
                                        return <Area key={k} type="monotone" name={k} dataKey={k} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} strokeDasharray={dashed ? '5 4' : undefined} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={isDark ? 0.04 : 0.04} />;
                                      })}
                                      <Brush dataKey="time" height={15} stroke={col} fill={isDark ? '#0A0A0A' : '#f8fafc'} travellerWidth={8} tickFormatter={() => ''} />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'alerts' && (
                    <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                      {lostLogs.map((log: any, idx) => (
                        <div key={idx} className={`flex gap-4 p-4 rounded-xl border transition-colors ${isDark ? 'bg-red-900/20 border-red-800/50' : 'bg-red-50 border-red-100'} `}>
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-red-900/50' : 'bg-red-100'} `}><AlertTriangle size={16} style={{ color: RED }} /></div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1.5">
                              <p className={`font-bold text-sm ${text}`}>{log.plcName}</p>
                              <span className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border font-mono ${isDark ? 'bg-red-900/40 text-red-400 border-red-800' : 'bg-red-50 text-red-600 border-red-200'} `}>Offline</span>
                            </div>
                            <p className={`text-[10px] font-mono mb-2 ${textXs}`}>{log.tanggal} <span style={{ color: RED }} className="mx-1">•</span>{log.jam} WIB</p>
                            <pre className={`text-[10px] font-mono border rounded-lg p-3 leading-relaxed whitespace-pre-wrap ${isDark ? 'text-[#A3A3A3] bg-[#141414] border-[#333]' : 'text-slate-600 bg-white border-slate-200'} `}>{log.data}</pre>
                          </div>
                        </div>
                      ))}
                      {lostLogs.length === 0 && (
                        <div className={`flex flex-col items-center justify-center py-14 rounded-xl gap-3 border-2 border-dashed ${isDark ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'} `}>
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDark ? 'bg-green-900/50' : 'bg-green-100'} `}><CheckCircle2 size={24} style={{ color: isDark ? '#4ADE80' : GREEN }} /></div>
                          <p className="font-extrabold text-base uppercase tracking-wider" style={{ color: isDark ? '#4ADE80' : GREEN }}>Systems Normal</p>
                          <p className="text-[10px] font-mono" style={{ color: isDark ? '#16A34A' : '#4ADE80' }}>Tidak ada catatan downtime</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            )}

            <div className="pb-10">
              <div className={`rounded-2xl overflow-hidden border ${isDark ? 'border-red-900/50 bg-[#141414]' : 'border-red-100 bg-white'} `}>
                <div className={`flex items-center gap-3 px-6 py-4 border-b ${isDark ? 'bg-red-900/20 border-red-900/40' : 'bg-red-50 border-red-100'} `}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-red-900/50' : 'bg-red-100'} `}><Clock size={16} style={{ color: RED }} /></div>
                  <div>
                    <p className="text-[12px] font-bold uppercase tracking-widest" style={{ color: RED }}>Global Downtime Log</p>
                    <p className={`text-[10px] font-mono mt-0.5 ${textXs}`}>Rekaman anomali sistem</p>
                  </div>
                </div>
                <div className="overflow-x-auto max-h-[360px]">
                  <table className="w-full text-left border-collapse" style={{ tableLayout: 'fixed' }}>
                    <thead className={`sticky top-0 z-10 border-b ${isDark ? 'bg-[#1A1A1A] border-[#333]' : 'bg-slate-50 border-slate-100'} `}>
                      <tr>
                        {['Nama Segment', 'Waktu Kejadian', 'Data Payload / Error', 'Status'].map((h, i) => (
                          <th key={h} className={`px-5 py-3 text-[9px] font-bold uppercase tracking-widest font-mono ${textXs}`} style={{ textAlign: i === 3 ? 'right' : 'left', width: i === 0 ? '22%' : i === 1 ? '20%' : i === 2 ? '45%' : '13%' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-[#333]' : 'divide-slate-50'} `}>
                      {lostLogs.map((log: any, idx) => (
                        <tr key={idx} className={`transition-colors ${isDark ? 'hover:bg-red-900/20' : 'hover:bg-red-50/60'} `}>
                          <td className={`px-5 py-3.5 font-bold text-xs uppercase tracking-wide ${text}`}>{log.plcName}</td>
                          <td className="px-5 py-3.5"><p className={`font-semibold text-xs ${textSm}`}>{log.tanggal}</p><p className="font-bold text-[10px] font-mono mt-0.5" style={{ color: RED }}>{log.jam} WIB</p></td>
                          <td className={`px-5 py-3.5 font-mono text-[10px] max-w-[200px] truncate ${textXs}`} title={log.data}>{log.data}</td>
                          <td className="px-5 py-3.5 text-right">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border font-mono ${isDark ? 'bg-red-900/30 text-red-400 border-red-800' : 'bg-red-50 text-red-600 border-red-200'} `}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: RED }} />Offline
                            </span>
                          </td>
                        </tr>
                      ))}
                      {lostLogs.length === 0 && (
                        <tr><td colSpan={4} className={`px-5 py-10 text-center font-bold text-xs uppercase tracking-widest ${isDark ? 'text-emerald-400 bg-emerald-900/20' : 'text-green-700 bg-green-50'} `}>100% Uptime Stabil</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}