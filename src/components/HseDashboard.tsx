import React, { useState, useEffect } from 'react';
import {
  Lock, KeyRound, Eye, LogOut, Search, Clock, FileSpreadsheet, ShieldAlert, BadgeCheck,
  Check, Trash2, Calendar, Filter, Users, Award, AlertTriangle, Printer, Database, ArrowUpDown, RefreshCw, FileText,
  Edit, X, Save
} from 'lucide-react';
import { GuestRecord, SecurityLog } from '../types';
import { exportToCsv, logSecurityAction } from '../utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface HseDashboardProps {
  records: GuestRecord[];
  securityLogs: SecurityLog[];
  onDeleteRecord: (id: string) => void;
  onClearAllRecords: () => void;
  onRestoreBackup: (imported: GuestRecord[]) => void;
  onCheckoutGuest: (id: string) => void;
  onUpdateRecord: (updated: GuestRecord) => void;
}

export const HseDashboard: React.FC<HseDashboardProps> = ({
  records,
  securityLogs,
  onDeleteRecord,
  onClearAllRecords,
  onRestoreBackup,
  onCheckoutGuest,
  onUpdateRecord
}) => {
  // Authorization States
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [activeRole, setActiveRole] = useState<'SECURITY' | 'HSE_SUPER' | 'ADMIN' | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [logs, setLogs] = useState<SecurityLog[]>(securityLogs);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterPurpose, setFilterPurpose] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterDate, setFilterDate] = useState<string>('');
  const [selectedRecordForView, setSelectedRecordForView] = useState<GuestRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<GuestRecord | null>(null);

  // Department ranking calculations
  const getDepartmentStats = () => {
    const counts: Record<string, number> = {};
    records.forEach(r => {
      const dept = r.picDepartment || 'Lainnya';
      counts[dept] = (counts[dept] || 0) + 1;
    });

    return Object.keys(counts)
      .map(dept => ({ name: dept, value: counts[dept] }))
      .sort((a, b) => b.value - a.value);
  };

  // Sync logs when parent updates
  useEffect(() => {
    setLogs(securityLogs);
  }, [securityLogs]);

  // Handle PIN Submission
  const handlePinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError(null);

    let role: 'SECURITY' | 'HSE_SUPER' | 'ADMIN' | null = null;
    let desc = '';

    if (pinInput === '1234') {
      role = 'SECURITY';
      desc = "Security Guard (Pos Utama) mendaftar masuk";
    } else if (pinInput === '5678') {
      role = 'HSE_SUPER';
      desc = "HSE Superintendent mendaftar masuk";
    } else if (pinInput === '9999') {
      role = 'ADMIN';
      desc = "System Administrator mendaftar masuk";
    }

    if (role) {
      setActiveRole(role);
      setIsAuthenticated(true);
      setPinInput('');
      
      const newLog = logSecurityAction("LOGIN", role, desc);
      setLogs(prev => [newLog, ...prev]);
    } else {
      setAuthError("Kode PIN salah. Silakan hubungi HSE Command Center.");
      setPinInput('');
    }
  };

  const handleLogout = () => {
    if (activeRole) {
      const newLog = logSecurityAction("LOGOUT", activeRole, `Petugas ${activeRole} melakukan logout`);
      setLogs(prev => [newLog, ...prev]);
    }
    setIsAuthenticated(false);
    setActiveRole(null);
  };

  const addPinChar = (char: string) => {
    if (pinInput.length < 4) {
      setPinInput(p => p + char);
    }
  };

  const clearPin = () => {
    setPinInput('');
    setAuthError(null);
  };

  // Helper date matching
  const isToday = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };

  const isThisWeek = (dateStr: string) => {
    const date = new Date(dateStr);
    const diffTime = Math.abs(new Date().getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  };

  const isThisMonth = (dateStr: string) => {
    const date = new Date(dateStr);
    const diffTime = Math.abs(new Date().getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  };

  // KPI Calculations
  const stats = {
    today: records.filter(r => isToday(r.visitDate)).length,
    week: records.filter(r => isThisWeek(r.visitDate)).length,
    month: records.filter(r => isThisMonth(r.visitDate)).length,
    passed: records.filter(r => r.quizResult === 'LULUS').length,
    failed: records.filter(r => r.quizResult === 'GAGAL').length,
    contractors: records.filter(r => ['Vendor', 'Pengiriman Barang', 'Survey'].includes(r.visitPurpose)).length,
    vendors: records.filter(r => r.visitPurpose === 'Vendor').length,
    auditors: records.filter(r => ['Audit', 'Inspeksi'].includes(r.visitPurpose)).length
  };

  // Date distribution chart compiling (grouped by visitDate)
  const getDailyVisitData = () => {
    const counts: Record<string, number> = {};
    records.forEach(r => {
      counts[r.visitDate] = (counts[r.visitDate] || 0) + 1;
    });

    // Sort dates
    return Object.keys(counts).sort().map(date => ({
      date: new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
      Kunjungan: counts[date]
    }));
  };

  const getPurposePieData = () => {
    const counts: Record<string, number> = {};
    records.forEach(r => {
      counts[r.visitPurpose] = (counts[r.visitPurpose] || 0) + 1;
    });

    return Object.keys(counts).map(purpose => ({
      name: purpose,
      value: counts[purpose]
    }));
  };

  const getPassFailPieData = () => {
    return [
      { name: 'Lulus Induksi', value: stats.passed },
      { name: 'Gagal / Remedial', value: stats.failed }
    ];
  };

  // CSV Export Action
  const handleExportCsv = () => {
    exportToCsv(records);
    if (activeRole) {
      const newLog = logSecurityAction("DATA_EXPORT", activeRole, `Ekspor laporan data kunjungan ke format Excel/CSV`);
      setLogs(prev => [newLog, ...prev]);
    }
  };

  // Print Screen
  const handlePrintDashboard = () => {
    window.print();
  };

  // Administration: Backup / download JSON
  const handleDownloadBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(records, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `SAFETY_BACKUP_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    if (activeRole) {
      const newLog = logSecurityAction("DATABASE_BACKUP", activeRole, "Backup database lokal diunduh ke file JSON");
      setLogs(prev => [newLog, ...prev]);
    }
  };

  // Administration: Restore JSON
  const handleUploadBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = e.target.files;
    if (files && files.length > 0) {
      fileReader.readAsText(files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string) as GuestRecord[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            onRestoreBackup(parsed);
            
            if (activeRole) {
              const newLog = logSecurityAction("DATABASE_RESTORE", activeRole, `Mengembalikan data cadangan berhasil: ${parsed.length} antrean data dimuat`);
              setLogs(prev => [newLog, ...prev]);
            }
            alert(`Berhasil mengembalikan cadangan database! Selesai memulihkan ${parsed.length} records.`);
          }
        } catch (err) {
          alert("Gagal membaca berkas cadangan JSON. Pastikan format file sesuai.");
        }
      };
    }
  };

  // Save modified guest details administratively
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    // Recalculate quiz result based on edits
    const updated: GuestRecord = {
      ...editingRecord,
      quizResult: editingRecord.quizScore >= 80 ? 'LULUS' : 'GAGAL'
    };

    onUpdateRecord(updated);

    const newLog = logSecurityAction(
      "DATA_EDIT",
      activeRole || "SYSTEM",
      `Mengubah data pendaftaran tamu secara administratif: ID ${updated.id} (${updated.fullName})`
    );
    setLogs(prev => [newLog, ...prev]);
    setEditingRecord(null);
  };

  // Overstay calculations (Visitors still inside whose check-out hour has passed)
  const getOverstayGuests = () => {
    const now = new Date();
    const currentHourString = now.toTimeString().slice(0, 5); // "HH:MM"
    
    return records.filter(r => {
      if (!isToday(r.visitDate)) return false;
      // If visit has checked out or didn't specify exit times
      if (!r.exitTime) return false;
      
      // Let's compare times by turning them into minutes
      const [nowH, nowM] = currentHourString.split(':').map(Number);
      const [exitH, exitM] = r.exitTime.split(':').map(Number);
      
      const nowMin = nowH * 60 + nowM;
      const exitMin = exitH * 60 + exitM;
      
      return nowMin > exitMin; // Overstay
    });
  };

  const overstayCount = getOverstayGuests().length;

  // Filter & Search Records logic
  const filteredRecords = records.filter(r => {
    // Search by Name, Company, PIC, or Location
    const matchQuery =
      r.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.picName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchPurpose = filterPurpose === 'ALL' || r.visitPurpose === filterPurpose;
    const matchStatus = filterStatus === 'ALL' || r.quizResult === filterStatus;
    const matchDate = !filterDate || r.visitDate === filterDate;

    return matchQuery && matchPurpose && matchStatus && matchDate;
  });

  // Color arrays for charts
  const COLORS_PIE = ['#1A4A8A', '#E85A1B', '#27AE60', '#C0392B', '#8E44AD', '#F39C12', '#16A085', '#2C3E50'];
  const COLORS_PASS = ['#27AE60', '#C0392B'];

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100">
      
      {/* 🔐 AUTH LOCK BLOCK OVERLAY */}
      {!isAuthenticated ? (
        <div className="max-w-md mx-auto px-4 py-16 animate-fade-in no-print">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 glow-blue text-center">
            
            <div className="inline-flex items-center justify-center bg-[#E85A1B]/10 border border-[#E85A1B]/30 text-[#E85A1B] p-4 rounded-full mb-4">
              <Lock className="w-10 h-10" />
            </div>

            <h1 className="text-xl font-display font-extrabold tracking-tight text-white mb-2 uppercase">
              HSE SECURITY CONTROL ROOM
            </h1>
            <p className="text-xs text-slate-400 mb-6 font-medium leading-relaxed">
              Dilarang masuk tanpa izin resmi. Masukkan Kode PIN Petugas Pos atau Superintendent untuk melihat database kepatuhan K3LH.
            </p>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type="password"
                  value={pinInput}
                  disabled
                  placeholder="&bull; &bull; &bull; &bull;"
                  className="w-full text-center bg-slate-950 border-2 border-slate-800 text-white rounded-xl py-3.5 text-2xl font-black font-mono tracking-widest placeholder-slate-650 focus:border-[#E85A1B] focus:outline-none transition-all"
                />
              </div>

              {authError && (
                <p className="text-xs text-red-400 font-semibold hazard-blink flex items-center gap-1.5 justify-center">
                  <ShieldAlert className="w-4 h-4" />
                  {authError}
                </p>
              )}

              {/* Pin Keyboard */}
              <div className="grid grid-cols-3 gap-3 pt-3">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => addPinChar(n)}
                    className="bg-slate-850 hover:bg-slate-800 active:bg-slate-750 text-white font-extrabold py-3.5 rounded-lg border border-slate-800 text-lg transition-all focus:outline-none focus:ring-1 focus:ring-[#E85A1B] cursor-pointer"
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={clearPin}
                  className="bg-slate-800 hover:bg-slate-750 text-red-400 font-bold py-3.5 rounded-lg border border-slate-800 text-sm transition-all cursor-pointer"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => addPinChar('0')}
                  className="bg-slate-850 hover:bg-slate-800 text-white font-extrabold py-3.5 rounded-lg border border-slate-800 text-lg transition-all cursor-pointer"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => handlePinSubmit()}
                  disabled={pinInput.length < 4}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-lg border border-emerald-700 text-xs transition-all uppercase tracking-wider cursor-pointer"
                >
                  Entr
                </button>
              </div>


            </form>

          </div>
        </div>
      ) : (
        /* ================= DASHBOARD MAIN SCREEN ================= */
        <div className="max-w-7xl mx-auto px-4 py-6 animate-fade-in">
          
          {/* Header Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6 no-print">
            <div className="flex items-center gap-3">
              <div className="bg-[#E85A1B] text-white p-2.5 rounded-xl">
                <Award className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-display font-black tracking-tight text-white uppercase leading-none">
                  HSE COMMAND DASHBOARD
                </h1>
                <span className="text-xs text-slate-400 mt-1 block">
                  PT. WATU PERKASA ABADI &bull; PALU
                </span>
              </div>
            </div>

            {/* Auth status & actions */}
            <div className="flex items-center gap-3 self-end md:self-center">
              <span className="bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-lg text-xs font-mono tracking-wider flex items-center gap-2 select-none">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 hazard-blink" />
                OFFICER: <strong className="text-white">
                  {activeRole === 'SECURITY' ? 'PORT SECURITY GATE' : activeRole === 'HSE_SUPER' ? 'HSE SUPERINTENDENT' : 'SYSTEM ADMINISTRATOR'}
                </strong>
              </span>

              <button
                onClick={handleLogout}
                type="button"
                className="bg-red-950 text-red-400 hover:bg-red-900 border border-red-900 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Log Out
              </button>
            </div>
          </div>

          {/* ⚡ ACTIVE WARNING/REMINDER FLAG ALERT FOR OVERSTAY VISITORS */}
          {overstayCount > 0 && (
            <div className="bg-red-950/40 border-2 border-red-600/40 p-4 rounded-xl flex items-start gap-3 mb-6 no-print">
              <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5 hazard-blink" />
              <div className="flex-1">
                <h4 className="text-sm font-black text-red-400 uppercase leading-none mb-1">
                  PEMBERITAHUAN DARURAT: MONITOR OVERSTAY ({overstayCount} TAMU)
                </h4>
                <p className="text-xs text-slate-350 leading-relaxed">
                  Terdapat {overstayCount} tamu yang waktu izin kunjungannya telah melampaui jadwal keluar yang didaftarkan hari ini. Segera verifikasi koordinat GPS beserta status PIC bersangkutan untuk pencegahan risiko jalan angkut tambang (Hauling Road).
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {getOverstayGuests().map((og, idx) => (
                    <span key={og.id} className="bg-red-900/50 text-red-300 font-mono text-[11px] px-2.5 py-0.5 rounded border border-red-500/30">
                      {og.fullName} ({og.company}) - Masuk: {og.entryTime} / Keluar: {og.exitTime}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= SECTION 1: EIGHT KPI NUMBERS ================= */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            
            {/* stats card 1 */}
            <div className="bg-slate-900 border border-slate-850 p-4.5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Tamu Hari Ini</span>
                <span className="text-2xl font-black text-white font-display mt-1 block">{stats.today}</span>
              </div>
              <div className="bg-slate-950 p-2 text-sky-400 rounded-lg">
                <Calendar className="w-5 h-5" />
              </div>
            </div>

            {/* stats card 2 */}
            <div className="bg-slate-900 border border-slate-850 p-4.5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Registrasi Minggu Ini</span>
                <span className="text-2xl font-black text-white font-display mt-1 block">{stats.week}</span>
              </div>
              <div className="bg-slate-950 p-2 text-yellow-500 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
            </div>

            {/* stats card 3 */}
            <div className="bg-slate-900 border border-slate-850 p-4.5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-green-400 block font-mono">Lulus Induksi</span>
                <span className="text-2xl font-black text-green-400 font-display mt-1 block">
                  {stats.passed} <sub className="text-xs text-slate-400 font-normal">({records.length ? Math.round((stats.passed/records.length)*100) : 0}%)</sub>
                </span>
              </div>
              <div className="bg-green-950 p-2 text-green-400 rounded-lg">
                <BadgeCheck className="w-5 h-5" />
              </div>
            </div>

            {/* stats card 4 */}
            <div className="bg-slate-900 border border-slate-850 p-4.5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-red-400 block font-mono">Gagal Induksi</span>
                <span className="text-2xl font-black text-red-400 font-display mt-1 block">{stats.failed}</span>
              </div>
              <div className="bg-red-950 p-2 text-red-400 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            {/* stats card 5 */}
            <div className="bg-slate-900 border border-slate-850 p-4.5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Tamu Kontraktor</span>
                <span className="text-2xl font-black text-slate-200 mt-1 block">{stats.contractors}</span>
              </div>
              <div className="bg-slate-950 p-2 text-orange-500 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
            </div>

            {/* stats card 6 */}
            <div className="bg-slate-900 border border-slate-850 p-4.5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Vendor Aktif</span>
                <span className="text-2xl font-black text-slate-200 mt-1 block">{stats.vendors}</span>
              </div>
              <div className="bg-slate-950 p-2 text-[#E85A1B] rounded-lg">
                <Award className="w-5 h-5" />
              </div>
            </div>

            {/* stats card 7 */}
            <div className="bg-slate-900 border border-slate-850 p-4.5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Audit & Inspeksi K3</span>
                <span className="text-2xl font-black text-slate-200 mt-1 block">{stats.auditors}</span>
              </div>
              <div className="bg-slate-950 p-2 text-violet-400 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
            </div>

            {/* stats card 8 */}
            <div className="bg-slate-900 border border-slate-850 p-4.5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Pendaftaran Bulan Ini</span>
                <span className="text-2xl font-black text-white mt-1 block">{stats.month}</span>
              </div>
              <div className="bg-slate-950 p-2 text-[#E85A1B] rounded-lg">
                <Clock className="w-5 h-5" />
              </div>
            </div>

          </div>

          {/* ================= SECTION 2: GRAPHICS (Recharts) ================= */}
          {activeRole !== 'SECURITY' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6 no-print">
              
              {/* Daily visit volume bar chart */}
              <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl lg:col-span-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 font-mono mb-4">
                  TREN VOLUME KUNJUNGAN HARIAN
                </h3>
                {records.length > 0 ? (
                  <div className="w-full h-64 text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getDailyVisitData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                        <XAxis dataKey="date" stroke="#94A3B8" />
                        <YAxis stroke="#94A3B8" />
                        <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B' }} />
                        <Bar dataKey="Kunjungan" fill="#1A4A8A" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-500 font-medium italic">
                    Belum ada data grafis kunjungan harian yang ditarik.
                  </div>
                )}
              </div>

              {/* Pie category distributions */}
              <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl flex flex-col justify-between lg:col-span-1">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 font-mono mb-4">
                    KATEGORISASI TARGET TAMU
                  </h3>
                  {records.length > 0 ? (
                    <div className="relative h-44 flex items-center justify-center text-xs">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={getPurposePieData()}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={70}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {getPurposePieData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-44 flex items-center justify-center text-slate-500 italic">
                      Data kategori kosong
                    </div>
                  )}
                </div>

                {/* Pie legend */}
                <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-850 text-[10px]">
                  {getPurposePieData().map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-1.5 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS_PIE[index % COLORS_PIE.length] }} />
                      <span className="text-slate-400 truncate">{entry.name}: <strong className="text-white">{entry.value}</strong></span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Department visit ranking container (NEW requirement solved) */}
              <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl flex flex-col justify-between lg:col-span-1">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 font-mono mb-4 flex items-center justify-between">
                    <span>DEPARTEMEN TERPOPULER</span>
                    <span className="text-[8px] bg-[#E85A1B]/20 text-[#E85A1B] px-1 rounded border border-[#E85A1B]/30 tracking-tight font-extrabold uppercase animate-pulse">RANKING</span>
                  </h3>
                  
                  {records.length > 0 ? (
                    <div className="space-y-3.5 pr-0.5 max-h-[200px] overflow-y-auto">
                      {getDepartmentStats().slice(0, 5).map((item, idx) => {
                        const total = records.length;
                        const pct = Math.round((item.value / total) * 100);
                        return (
                          <div key={item.name} className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-300 font-bold flex items-center gap-1.5 truncate">
                                <span className={`w-3.5 h-3.5 rounded-full text-[9px] flex items-center justify-center font-mono font-bold ${
                                  idx === 0 ? 'bg-[#E85A1B] text-white' : idx === 1 ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {idx + 1}
                                </span>
                                <span className="truncate max-w-[105px]" title={item.name}>{item.name}</span>
                              </span>
                              <span className="text-slate-450 font-mono text-[10px] shrink-0">
                                <strong className="text-slate-200">{item.value}</strong> x ({pct}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-850">
                              <div 
                                className={`h-full rounded-full ${
                                  idx === 0 ? 'bg-[#E85A1B]' : idx === 1 ? 'bg-sky-500' : 'bg-slate-650'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-44 flex items-center justify-center text-slate-550 italic text-xs">
                      Belum ada data tujuan departemen.
                    </div>
                  )}
                </div>
                
                <div className="mt-2.5 pt-2 border-t border-slate-850 text-[9.5px] text-slate-500 italic select-none">
                  * Kunjungan terbanyak berdasarkan statistik pic.
                </div>
              </div>

            </div>
          )}

          {/* ================= SECTION 3: ADVANCED DATA FILTER CONTROLS ================= */}
          <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl mb-6 shadow-md no-print">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#E85A1B] font-mono mb-4 flex items-center gap-1.5">
              <Filter className="w-4 h-4" />
              SISTEM REGULASI FILTER DATABASES
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              
              {/* Keyword text search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-500 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Cari Nama/Perusahaan/PIC..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 bg-slate-950 border border-slate-800 focus:border-[#E85A1B] text-slate-200 placeholder-slate-500 rounded-lg py-1.8 text-xs focus:outline-none transition-all"
                />
              </div>

              {/* Purpose Dropdown Filter */}
              <div>
                <select
                  value={filterPurpose}
                  onChange={(e) => setFilterPurpose(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-[#E85A1B] text-slate-350 rounded-lg py-1.8 px-2 text-xs focus:outline-none transition-all cursor-pointer"
                >
                  <option value="ALL">Semua Tujuan Kunjungan</option>
                  <option value="Meeting">Meeting / Rapat</option>
                  <option value="Audit">Audit</option>
                  <option value="Inspeksi">Inspeksi Lapangan</option>
                  <option value="Vendor">Vendor</option>
                  <option value="Pengiriman Barang">Pengiriman Logistik</option>
                  <option value="Survey">Survey</option>
                  <option value="Pemerintah">ESDM / Pemerintah</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              {/* Safety passing result Filter */}
              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-[#E85A1B] text-slate-350 rounded-lg py-1.8 px-2 text-xs focus:outline-none transition-all cursor-pointer"
                >
                  <option value="ALL">Semua Status Kelulusan</option>
                  <option value="LULUS">LUMPUS SAFETY INDUCTION</option>
                  <option value="GAGAL">GAGAL INDUKSI (REMEDIAL)</option>
                </select>
              </div>

              {/* Date Filter */}
              <div className="relative">
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-[#E85A1B] text-slate-350 rounded-lg py-1.5 px-2.5 text-xs focus:outline-none transition-all cursor-pointer"
                />
              </div>

              {/* Operations row: Export, Print, Admin Action dropdown */}
              <div className="flex gap-2">
                <button
                  onClick={handleExportCsv}
                  type="button"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 px-2 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Ekspor ke Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Excel
                </button>

                <button
                  onClick={handlePrintDashboard}
                  type="button"
                  className="bg-slate-800 hover:bg-slate-750 text-slate-200 py-1.5 px-3 rounded-lg text-xs transition-all flex items-center justify-center gap-1 border border-slate-750 cursor-pointer"
                  title="Cetak Laporan Utama"
                >
                  <Printer className="w-3.5 h-3.5 text-sky-400" />
                  Print
                </button>
              </div>

            </div>
          </div>

          {/* ================= SECTION 4: DATABASES TABLE ================= */}
          <div className="bg-slate-900 border border-slate-850 rounded-xl overflow-hidden shadow-2xl mb-6">
            <div className="px-5 py-4 border-b border-slate-850 flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 font-mono">
                MATRIKS PENDAFTARAN & KEPATUHAN K3 ({filteredRecords.length} DATA MATCHING)
              </h3>

              {/* Admin Database Control Box */}
              {activeRole === 'ADMIN' && (
                <div className="flex items-center gap-3 no-print">
                  {/* Backup download */}
                  <button
                    onClick={handleDownloadBackup}
                    type="button"
                    className="bg-slate-850 hover:bg-slate-800 text-slate-300 px-2.5 py-1.2 rounded text-[11px] font-bold border border-slate-750 flex items-center gap-1 transition-all cursor-pointer"
                    title="Simpan database lokal ke file"
                  >
                    <Database className="w-3 h-3 text-[#E85A1B]" />
                    Backup Data
                  </button>

                  {/* Restore file upload */}
                  <label className="bg-slate-850 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded text-[11px] font-bold border border-slate-750 flex items-center gap-1 transition-all cursor-pointer">
                    <RefreshCw className="w-3 h-3 text-emerald-400" />
                    Restore JSON
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleUploadBackup}
                      className="hidden"
                    />
                  </label>

                  {/* Clear databases */}
                  <button
                    onClick={() => {
                      if (confirm("⚠️ PERINGATAN KRITIS: Apakah Anda yakin ingin mengosongkan seluruh database log & tamu dari Local Storage? Tindakan ini tidak dapat dibatalkan.")) {
                        onClearAllRecords();
                        const newLog = logSecurityAction("DATABASE_WIPE", "ADMIN", "Mengosongkan semua data audit tamu dari sistem penyimpanan penyimpanan");
                        setLogs(prev => [newLog, ...prev]);
                      }
                    }}
                    type="button"
                    className="bg-red-950 hover:bg-red-900 border border-red-900 text-red-400 px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    Reset DB
                  </button>
                </div>
              )}
            </div>

            {/* Responsive table element */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-850 uppercase font-mono tracking-wider font-semibold">
                    <th className="py-3 px-4 text-[10px]">Tgl Kunjungan</th>
                    <th className="py-3 px-4 text-[10px]">ID Reg</th>
                    <th className="py-3 px-4 text-[10px]">Nama Tamu</th>
                    <th className="py-3 px-4 text-[10px]">Perusahaan</th>
                    <th className="py-3 px-4 text-[10px]">Tujuan (PIC)</th>
                    <th className="py-3 px-4 text-[10px] text-center">APD K3</th>
                    <th className="py-3 px-4 text-[10px] text-center">Ujian</th>
                    <th className="py-3 px-4 text-[10px] text-center">Status</th>
                    <th className="py-3 px-4 text-[10px] text-center">Masuk / Keluar</th>
                    <th className="py-3 px-4 text-[10px] text-center no-print">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-850/40 transition-colors">
                        
                        {/* Tanggal */}
                        <td className="py-3.5 px-4 font-mono select-all truncate max-w-[100px]">
                          {r.visitDate}
                        </td>

                        {/* ID */}
                        <td className="py-3.5 px-4 font-semibold text-slate-350 select-all font-mono">
                          {r.id}
                        </td>

                        {/* Nama Tamu */}
                        <td className="py-3.5 px-4 font-bold text-white select-all">
                          <div className="flex items-center gap-2">
                            {r.photo ? (
                              <img src={r.photo} alt={r.fullName} className="w-6 h-6 rounded-full object-cover shrink-0 border border-slate-700" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-slate-850 border border-slate-700 font-mono text-[9px] flex items-center justify-center shrink-0">V</div>
                            )}
                            <span className="truncate max-w-[120px]">{r.fullName}</span>
                          </div>
                        </td>

                        {/* Perusahaan */}
                        <td className="py-3.5 px-4 text-slate-300 truncate max-w-[110px]">
                          {r.company}
                        </td>

                        {/* PIC */}
                        <td className="py-3.5 px-4 text-slate-350">
                          <div className="truncate max-w-[140px] leading-snug">
                            <span className="font-semibold text-white block">{r.visitPurpose}</span>
                            <span className="text-[10px] text-slate-500 block">PIC: {r.picName} ({r.picDepartment.split(' ')[0]})</span>
                          </div>
                        </td>

                        {/* APD status */}
                        <td className="py-3.5 px-4 text-center">
                          {r.isPpeComplete ? (
                            <span className="inline-flex items-center bg-emerald-950/40 text-emerald-500 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded font-extrabold uppercase select-none">
                              Lengkap
                            </span>
                          ) : (
                            <span className="inline-flex items-center bg-red-950/40 text-red-400 border border-red-500/30 text-[10px] px-2 py-0.5 rounded font-extrabold uppercase select-none cursor-help" title="APD Penting Kurang Lengkap!">
                              ⚠️ Warning
                            </span>
                          )}
                        </td>

                        {/* Quiz Score */}
                        <td className="py-3.5 px-4 text-center font-mono font-bold">
                          {r.quizScore}%
                        </td>

                        {/* Pass Status */}
                        <td className="py-3.5 px-4 text-center">
                          {r.quizResult === 'LULUS' ? (
                            <span className="bg-green-950 text-green-400 border border-green-500/30 font-bold px-2.5 py-0.5 rounded text-[10px] tracking-wide select-none">
                              LULUS
                            </span>
                          ) : (
                            <span className="bg-red-950 text-red-400 border border-red-500/30 font-bold px-2 py-0.5 rounded text-[10px] tracking-wide select-none">
                              REMEDIAL
                            </span>
                          )}
                        </td>

                        {/* Check-in check-out times */}
                        <td className="py-3.5 px-4 text-center font-mono text-[11px]">
                          <div className="flex flex-col select-all">
                            <span>In: {r.entryTime || '--:--'}</span>
                            <span className={r.exitTime ? 'text-slate-500' : 'text-amber-500 font-bold'}>
                              Out: {r.exitTime || 'BELUM OUT'}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center no-print">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* View Pass modal Trigger */}
                            <button
                              onClick={() => setSelectedRecordForView(r)}
                              type="button"
                              className="bg-slate-800 hover:bg-[#E85A1B] hover:text-white text-slate-300 p-1.5 rounded transition-all cursor-pointer"
                              title="Tinjau Detail Tiket & Pass"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit - Available in Dashboard */}
                            <button
                              onClick={() => setEditingRecord(r)}
                              type="button"
                              className="bg-slate-800 hover:bg-[#E85A1B] hover:text-white text-slate-300 p-1.5 rounded transition-all cursor-pointer"
                              title="Edit Data Tamu K3LH"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {/* Overstay/Active checkout trigger */}
                            {!r.exitTime && r.quizResult === 'LULUS' && (
                              <button
                                onClick={() => {
                                  onCheckoutGuest(r.id);
                                  const newLog = logSecurityAction("CHECKOUT_FORCE", activeRole || "SECURITY", `Memproses check-out tamu manual: ${r.fullName} (${r.company})`);
                                  setLogs(prev => [newLog, ...prev]);
                                }}
                                type="button"
                                className="bg-amber-950 hover:bg-amber-600 text-amber-400 hover:text-white p-1.5 rounded border border-amber-900 transition-colors cursor-pointer"
                                title="Check Out Tamu Sekarang"
                              >
                                <Clock className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Delete - Available with ease for any authenticated dashboard officer */}
                            <button
                              onClick={() => {
                                if (confirm(`Yakin ingin menghapus secara permanen data pendaftaran ${r.fullName}? Tindakan ini tidak dapat dibatalkan.`)) {
                                  onDeleteRecord(r.id);
                                  const newLog = logSecurityAction("DATA_DELETE", activeRole || "SYSTEM", `Menghapus data kunjungan tamu: ID ${r.id} (${r.fullName})`);
                                  setLogs(prev => [newLog, ...prev]);
                                }
                              }}
                              type="button"
                              className="bg-red-950 hover:bg-rose-600 text-red-400 hover:text-white p-1.5 rounded border border-red-900 transition-colors cursor-pointer"
                              title="Hapus record permanen"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-500 font-medium italic">
                        Tidak ada data kunjungan yang cocok dengan parameter pencarian filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ================= SECTION 5: SECONDARY METADATA GRID (Security logs & reminders) ================= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 no-print">
            
            {/* Realtime Security Auditing log Activity */}
            <div className="bg-slate-900 border border-slate-850 p-4.5 rounded-xl">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 font-mono border-b border-slate-800 pb-2 mb-3.5">
                SECURITY LOG ACTIVITY (LOG AKTIVITAS KEDATANGAN)
              </h3>
              
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <div key={log.id} className="text-[11px] p-2 bg-slate-950 border border-slate-850 rounded flex gap-2">
                      <span className="text-slate-500 shrink-0 font-mono italic">{log.timestamp.split(' ')[1]}</span>
                      <span className={`font-mono text-[9px] px-1 py-0.2 rounded font-bold uppercase shrink-0 select-none ${
                        log.userRole === 'ADMIN' ? 'bg-red-950 text-red-400' : log.userRole === 'HSE_SUPER' ? 'bg-violet-950 text-violet-400' : log.userRole === 'SECURITY' ? 'bg-indigo-950 text-indigo-400' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {log.userRole}
                      </span>
                      <div className="min-w-0 flex-1 text-slate-300 select-all font-sans leading-normal">
                        <strong>[{log.action}]</strong> {log.details}
                      </div>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-slate-500">Log aktivitas kosong.</span>
                )}
              </div>
            </div>

            {/* Emergency and K3 Contacts guide block */}
            <div className="bg-slate-900 border border-slate-850 p-4.5 rounded-xl">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 font-mono border-b border-slate-800 pb-2 mb-3.5">
                PEDOMAN TANGGAP DARURAT TAMBANG PT. WPA
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs leading-relaxed">
                <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-lg">
                  <span className="font-bold text-red-400 block mb-1">MUSTER POINT UTAMA:</span>
                  <p className="text-slate-400 italic font-medium leading-normal text-[11px]">
                    Berada di depan Kantor Utama & Area Workshop Lapangan Guna Evakuasi Terpadu.
                  </p>
                </div>

                <div className="p-3 bg-indigo-950/20 border border-indigo-900/30 rounded-lg flex flex-col justify-between">
                  <div>
                    <span className="font-bold text-indigo-350 block mb-1 font-mono">MINE EMERGENCY RADIO:</span>
                    <span className="font-black text-white font-mono flex items-center gap-1 leading-none text-sm pt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                      CHANNEL 16 DEFAULT
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 italic block mt-2">
                    Frekuensi K3LH Terpadu
                  </span>
                </div>
              </div>

              <div className="mt-4 p-3.5 bg-slate-950 rounded-lg border border-slate-850 text-[11px] text-slate-500 leading-normal">
                Setiap pengunjung di kawasan tambang <strong>PT. WPA wajib memantau status darurat</strong> dan tidak diperbolehkan mendekati lereng pit atau alat hauling besar tanpa dampingan PIC.
              </div>
            </div>

          </div>

          {/* ================= GUEST DETAIL DISCLOSURE MODAL ================= */}
          {selectedRecordForView && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 no-print animate-fade-in">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
                
                {/* Modal close */}
                <button
                  type="button"
                  onClick={() => setSelectedRecordForView(null)}
                  className="absolute right-4 top-4 bg-slate-800 hover:bg-[#E85A1B] text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                >
                  &times; CLOSE
                </button>

                <h2 className="text-lg font-display font-black text-white uppercase tracking-tight border-b border-slate-800 pb-3 mb-5">
                  AUDIT PROFILE - GUEST COMPLIANCE SHEET
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                  
                  {/* Photo Box & Registration ID */}
                  <div className="flex flex-col items-center gap-3 bg-slate-950 p-4 rounded-xl border border-slate-850">
                    <div className="w-32 h-36 bg-slate-850 border border-slate-700 rounded overflow-hidden">
                      {selectedRecordForView.photo ? (
                        <img src={selectedRecordForView.photo} alt={selectedRecordForView.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">No Photo</div>
                      )}
                    </div>
                    <div className="text-center">
                      <span className="font-mono text-xs font-bold text-emerald-400 block">{selectedRecordForView.id}</span>
                      <span className="text-[10px] text-slate-500 block uppercase font-semibold font-mono tracking-wider">REGISTRATION ID</span>
                    </div>
                  </div>

                  {/* Core Details */}
                  <div className="space-y-2.5">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold leading-none">Nama Lengkap</span>
                      <strong className="text-white text-md font-display">{selectedRecordForView.fullName}</strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold leading-none">Perusahaan</span>
                      <strong className="text-slate-300 text-sm font-semibold">{selectedRecordForView.company} ({selectedRecordForView.position})</strong>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-semibold leading-none">ID KTP</span>
                        <span className="text-slate-350 font-mono select-all block">{selectedRecordForView.ktpNumber}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-semibold leading-none">Nomor HP</span>
                        <span className="text-slate-350 font-mono select-all block">{selectedRecordForView.phone}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold leading-none">Alamat Tamu</span>
                      <p className="text-slate-350 tracking-wide mt-0.5 max-h-16 overflow-y-auto leading-normal">
                        {selectedRecordForView.address}
                      </p>
                    </div>
                  </div>

                  {/* Visit Purpose Details */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3 md:col-span-2">
                    <span className="text-[10px] text-[#E85A1B] uppercase font-bold font-mono tracking-wider block">INFORMASI KELAYAKAN KUNJUNGAN (PIC)</span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase block font-semibold">Tujuan / Keperluan</span>
                        <strong className="text-slate-200">{selectedRecordForView.visitPurpose}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase block font-semibold">Nama PIC Internal</span>
                        <strong className="text-slate-200">{selectedRecordForView.picName}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase block font-semibold">Departemen & Lokasi</span>
                        <p className="text-slate-205 leading-tight">
                          {selectedRecordForView.picDepartment}<br />
                          {selectedRecordForView.picLocation}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-855">
                      <span className="text-[9px] text-slate-500 uppercase block font-semibold">Uraian Detail Kegiatan</span>
                      <p className="text-slate-350 italic mt-0.5 leading-relaxed text-[11px]">
                        "{selectedRecordForView.activityDescription || 'Tidak ada uraian detail tambahan.'}"
                      </p>
                    </div>
                  </div>

                  {/* APD Validation & Core Quiz outcome */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-850">
                    <span className="text-[10px] text-slate-450 uppercase font-bold font-mono tracking-wider block mb-2">APD CHECKLIST & KOREKTUR</span>
                    
                    <div className="grid grid-cols-2 gap-2 text-[11px] leading-relaxed">
                      {Object.entries(selectedRecordForView.ppeChecklist).map(([key, val]) => (
                        <div key={key} className="flex items-center gap-1.5 select-none">
                          <span className={`w-2.5 h-2.5 rounded-full ${val ? 'bg-green-500' : 'bg-slate-700'}`} />
                          <span className="text-slate-350 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Signature Draw */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-slate-450 uppercase font-bold font-mono tracking-wider block mb-1">E-SIGNATURE AUDIT SECURE</span>
                      <span className="text-[9px] text-slate-500">Nama Penjamin Kehadiran: <strong className="text-slate-300 font-mono">{selectedRecordForView.signatureName}</strong></span>
                    </div>

                    <div className="h-24 border border-slate-800 bg-slate-900 rounded-lg my-2 overflow-hidden flex items-center justify-center p-1.5 shrink-0">
                      {selectedRecordForView.signature ? (
                        <img src={selectedRecordForView.signature} alt="Guest signature graphic" className="h-full object-contain filter invert opacity-90 max-w-full" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-[10.5px] text-slate-600 font-mono italic">Signature unavailable (Mock)</span>
                      )}
                    </div>

                    <span className="text-[9px] text-slate-500 font-mono leading-none">
                      Audit Valid: {selectedRecordForView.visitDate} @ {selectedRecordForView.entryTime}
                    </span>
                  </div>

                </div>

                {/* Print individual record badge in modal */}
                <div className="mt-6 border-t border-slate-800 pt-4 text-right">
                  <button
                    onClick={() => {
                      setSelectedRecordForView(null);
                      window.print();
                    }}
                    type="button"
                    className="bg-[#E85A1B] hover:bg-[#E85A1B]/95 text-white font-bold py-2 px-4 rounded-lg text-xs tracking-wider transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    CETAK TIKET PASS TAMU
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* ================= GUEST EDIT REGISTRATION MODAL ================= */}
          {editingRecord && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 no-print overflow-y-auto animate-fade-in">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full my-8 shadow-2xl relative">
                
                {/* Modal close */}
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="absolute right-4 top-4 bg-slate-850 hover:bg-[#E85A1B] text-slate-400 hover:text-white p-1.5 rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1 border border-slate-800"
                >
                  <X className="w-3 h-3" /> BATAL
                </button>

                <h2 className="text-md font-display font-black text-white uppercase tracking-tight border-b border-slate-800 pb-3 mb-5 flex items-center gap-2">
                  <Edit className="w-5 h-5 text-[#E85A1B]" />
                  EDIT ADMINISTRASI DATA PENDAFTARAN K3LH
                </h2>

                <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
                  
                  {/* Row 1: Name and Company */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-400 font-bold uppercase mb-1.5 font-mono">Nama Lengkap Tamu</label>
                      <input
                        type="text"
                        required
                        value={editingRecord.fullName}
                        onChange={(e) => setEditingRecord({ ...editingRecord, fullName: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-[#E85A1B] text-slate-200 py-2 px-3 rounded-lg focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold uppercase mb-1.5 font-mono">Perusahaan / Instansi</label>
                      <input
                        type="text"
                        required
                        value={editingRecord.company}
                        onChange={(e) => setEditingRecord({ ...editingRecord, company: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-[#E85A1B] text-slate-200 py-2 px-3 rounded-lg focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Row 2: Position, Phone, KTP */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-slate-400 font-bold uppercase mb-1.5 font-mono">Jabatan</label>
                      <input
                        type="text"
                        required
                        value={editingRecord.position}
                        onChange={(e) => setEditingRecord({ ...editingRecord, position: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-[#E85A1B] text-slate-200 py-2 px-3 rounded-lg focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold uppercase mb-1.5 font-mono">Nomor HP</label>
                      <input
                        type="text"
                        required
                        value={editingRecord.phone}
                        onChange={(e) => setEditingRecord({ ...editingRecord, phone: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-[#E85A1B] text-slate-200 py-2 px-3 rounded-lg focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold uppercase mb-1.5 font-mono">Nomor KTP / Passport</label>
                      <input
                        type="text"
                        required
                        value={editingRecord.ktpNumber}
                        onChange={(e) => setEditingRecord({ ...editingRecord, ktpNumber: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-[#E85A1B] text-slate-200 py-2 px-3 rounded-lg focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  {/* Row 3: Destination PIC, Department, Location */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-slate-400 font-bold uppercase mb-1.5 font-mono">Tujuan Kunjungan</label>
                      <select
                        value={editingRecord.visitPurpose}
                        onChange={(e) => setEditingRecord({...editingRecord, visitPurpose: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-[#E85A1B] text-slate-300 py-2 px-2.5 rounded-lg focus:outline-none cursor-pointer"
                      >
                        <option value="Meeting">Meeting / Rapat</option>
                        <option value="Audit">Audit</option>
                        <option value="Inspeksi">Inspeksi Lapangan</option>
                        <option value="Vendor">Vendor</option>
                        <option value="Pengiriman Barang">Pengiriman Logistik</option>
                        <option value="Survey">Survey</option>
                        <option value="Pemerintah">ESDM / Pemerintah</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold uppercase mb-1.5 font-mono">Nama PIC Internal</label>
                      <input
                        type="text"
                        required
                        value={editingRecord.picName}
                        onChange={(e) => setEditingRecord({ ...editingRecord, picName: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-[#E85A1B] text-slate-200 py-2 px-3 rounded-lg focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold uppercase mb-1.5 font-mono">Departemen Internal</label>
                      <select
                        value={editingRecord.picDepartment}
                        onChange={(e) => setEditingRecord({...editingRecord, picDepartment: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-[#E85A1B] text-[#E85A1B] py-2 px-2.5 rounded-lg focus:outline-none cursor-pointer font-bold"
                      >
                        <option value="HSE (Health, Safety, & Environment)">HSE Department</option>
                        <option value="GA & HRD (General Affairs & Human Resources)">GA & HRD Department</option>
                        <option value="Engineering & Planning">Engineering & Planning Department</option>
                        <option value="Production (Operasional Tambang)">Production Department</option>
                        <option value="Logistics & Supply Chain">Logistics / Warehouse Department</option>
                        <option value="External Relations & CSR">External Relations Department</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 4: Location, Visit Date, Entry Time, Exit Time */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-slate-400 font-bold uppercase mb-1.5 font-mono">Lokasi Kerja Utama</label>
                      <select
                        value={editingRecord.picLocation}
                        onChange={(e) => setEditingRecord({...editingRecord, picLocation: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-[#E85A1B] text-slate-300 py-2 px-2 rounded-lg focus:outline-none cursor-pointer"
                      >
                        <option value="Area OFFICE JUBA">Area OFFICE JUBA</option>
                        <option value="Pit KSS">Pit KSS</option>
                        <option value="Pit JUBA 2">Pit JUBA 2</option>
                        <option value="Area Crushing KSS">Area Crushing KSS</option>
                        <option value="Area Crushing JUBA 2">Area Crushing JUBA 2</option>
                        <option value="Area Crushing DJP">Area Crushing DJP</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold uppercase mb-1.5 font-mono">Tanggal</label>
                      <input
                        type="date"
                        required
                        value={editingRecord.visitDate}
                        onChange={(e) => setEditingRecord({ ...editingRecord, visitDate: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-[#E85A1B] text-slate-200 py-1.8 px-2 rounded-lg focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold uppercase mb-1.5 font-mono">Jam Masuk (Time-In)</label>
                      <input
                        type="time"
                        required
                        value={editingRecord.entryTime}
                        onChange={(e) => setEditingRecord({ ...editingRecord, entryTime: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-[#E85A1B] text-slate-200 py-1.8 px-2 rounded-lg focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold uppercase mb-1.5 font-mono">Jam Keluar (Planned Out)</label>
                      <input
                        type="time"
                        value={editingRecord.exitTime || ''}
                        onChange={(e) => setEditingRecord({ ...editingRecord, exitTime: e.target.value || null })}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-[#E85A1B] text-slate-200 py-1.8 px-2 rounded-lg focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  {/* Row 5: Quiz score, PPE Checkbox */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-850">
                    <div>
                      <label className="block text-[#E85A1B] font-bold uppercase mb-1.5 font-mono">Nilai Ujian K3LH (%)</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="10"
                          required
                          value={editingRecord.quizScore}
                          onChange={(e) => setEditingRecord({ ...editingRecord, quizScore: Number(e.target.value) })}
                          className="w-24 bg-slate-900 border border-slate-800 text-center focus:border-[#E85A1B] text-white py-2 px-3 rounded-lg focus:outline-none font-mono font-bold"
                        />
                        <span className="text-[10px] text-slate-400 font-medium">
                          Induksi K3 minimum kelulusan lulus jika &ge; 80% (Remedial jika dibawah 80%)
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[#E85A1B] font-bold uppercase mb-1.5 font-mono">Kepatuhan Kelengkapan APD</label>
                      <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={editingRecord.isPpeComplete}
                          onChange={(e) => setEditingRecord({ ...editingRecord, isPpeComplete: e.target.checked })}
                          className="w-4 h-4 rounded text-[#E85A1B] focus:ring-slate-950 border-slate-700 bg-slate-950"
                        />
                        <span className="font-bold text-slate-200">Seluruh APD Telah Terverifikasi Lengkap</span>
                      </label>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="mt-6 border-t border-slate-800 pt-4 flex justify-end gap-3.5">
                    <button
                      onClick={() => setEditingRecord(null)}
                      type="button"
                      className="bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-350 font-bold py-2.5 px-5 rounded-lg border border-slate-800 transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-5 rounded-lg border border-emerald-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-lg"
                    >
                      <Save className="w-4 h-4" />
                      SIMPAN PERUBAHAN
                    </button>
                  </div>

                </form>

              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
