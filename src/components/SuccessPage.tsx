import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle2, Sliders, Smartphone, ArrowRight, Printer, RefreshCw, Home, Compass } from 'lucide-react';
import { GuestRecord } from '../types';
import { generateQrCodeUrl } from '../utils';

interface SuccessPageProps {
  record: GuestRecord;
  onReset: () => void;
  onNavigateToDashboard: () => void;
}

export const SuccessPage: React.FC<SuccessPageProps> = ({
  record,
  onReset,
  onNavigateToDashboard
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  
  // Compile QR Code data
  useEffect(() => {
    const compileQrData = async () => {
      // Encode key data fields in QR
      const rawText = `ID: ${record.id}\nNama: ${record.fullName}\nPerusahaan: ${record.company}\nTujuan: ${record.visitPurpose}\nStatus K3: LULUS INDUKSI\nDate: ${record.visitDate}`;
      const url = await generateQrCodeUrl(rawText);
      setQrCodeDataUrl(url);
    };
    compileQrData();
  }, [record]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      
      {/* SUCCESS BANNER SECTION */}
      <div className="text-center mb-8 no-print animate-fade-in">
        <div className="inline-flex items-center justify-center bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-full mb-4 animate-bounce">
          <CheckCircle2 className="w-16 h-16" />
        </div>
        
        <h1 className="text-3xl md:text-4xl font-display font-extrabold tracking-tight text-white mb-2 uppercase">
          E-SAFETY INDUCTION BERHASIL
        </h1>
        <p className="text-emerald-400 font-bold uppercase text-sm tracking-widest flex items-center justify-center gap-1.5 font-mono mb-4">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          REGISTRASI RESMI CO-Kepatuhan Tambang
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <span className="bg-slate-900 border border-slate-800 text-slate-300 font-mono text-sm px-4 py-1.5 rounded-lg select-all font-semibold">
            REG ID: <span className="text-white font-bold">{record.id}</span>
          </span>
          <span className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 font-bold px-3 py-1 rounded text-xs tracking-wider uppercase font-mono">
            STATUS: LULUS SAFETY INDUCTION
          </span>
        </div>
      </div>

      {/* THREE COLUMN GRID: Badge Preview (left/middle) & Admin Checklist (right) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Printable Pass Badge */}
        <div className="md:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative p-6 glow-blue">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-[#E85A1B]" />
          
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 font-mono no-print">
            PREVIEW VISITOR BADGE (SIAP CETAK)
          </h2>

          {/* VISITOR BADGE PHYSICAL CARD (Optimized for Printer scaling) */}
          <div id="visitor-pass-badge" className="bg-white text-slate-950 rounded-xl p-5 border-2 border-slate-950 shadow-md flex flex-col justify-between aspect-[3/4.5] max-w-[320px] mx-auto print-badge-container">
            {/* Badge Header representing the PT company */}
            <div className="border-b-2 border-slate-900 pb-2.5 mb-3 flex items-center justify-between">
              <div>
                <p className="font-extrabold font-display leading-none text-md text-[#0D2240] tracking-tight uppercase">
                  Watu Perkasa Abadi
                </p>
                <span className="text-[7.5px] font-bold text-[#E85A1B] uppercase tracking-widest font-mono block mt-0.5">
                  PT. WATU PERKASA ABADI
                </span>
                <span className="text-[7px] text-slate-500 block font-semibold leading-none">
                  Safety Induction Visitor Pass
                </span>
              </div>
              <div className="bg-[#0D2240] text-white p-1 rounded font-black text-center text-xs w-8 h-8 flex items-center justify-center leading-none">
                {record.visitPurpose.slice(0, 3).toUpperCase()}
              </div>
            </div>

            {/* Badge Core Body: Photo, Entry No, and QR */}
            <div className="flex gap-4">
              {/* Left inside body: Avatar photo & stamp */}
              <div className="flex-1 flex flex-col items-center">
                <div className="w-24 h-28 bg-slate-100 rounded border border-slate-900 overflow-hidden relative shadow-inner">
                  {record.photo ? (
                    <img
                      src={record.photo}
                      alt={record.fullName}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100 text-xs text-center font-bold">
                      NO PHOTO
                    </div>
                  )}
                  {/* Digital green ink stamp overlay */}
                  <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded text-[7px] font-bold py-0.5 px-1 uppercase tracking-wider border border-white">
                    VERIFIED
                  </div>
                </div>
              </div>

              {/* Right inside body: QR Code and Registration text */}
              <div className="flex-shrink-0 flex flex-col items-center justify-center">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="Visitor QR Signature"
                    className="w-24 h-24 border border-slate-900 rounded"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-24 h-24 bg-slate-200 rounded flex items-center justify-center text-[8px] text-slate-500">
                    QR loading...
                  </div>
                )}
                <span className="text-[7.5px] font-mono font-bold text-slate-550 mt-1 select-all">
                  {record.id}
                </span>
              </div>
            </div>

            {/* Badge Footer: Name, Company, PIC and safety parameters */}
            <div className="mt-4 border-t border-slate-350 pt-2 text-left">
              <div>
                <span className="text-[7px] text-slate-500 font-bold block uppercase leading-none">NAMA LENGKAP VISIT</span>
                <span className="text-xs font-black font-display text-slate-900 leading-tight uppercase block truncate">
                  {record.fullName}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 mt-2">
                <div>
                  <span className="text-[7px] text-slate-500 font-bold block leading-none">PERUSAHAAN</span>
                  <span className="text-[9.5px] font-extrabold text-slate-800 uppercase block truncate">
                    {record.company}
                  </span>
                </div>
                <div>
                  <span className="text-[7px] text-slate-500 font-bold block leading-none">TANGGAL KUNJUNGAN</span>
                  <span className="text-[9.5px] font-bold font-mono text-slate-800 uppercase block">
                    {record.visitDate}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                <div>
                  <span className="text-[7px] text-slate-500 font-bold block leading-none">PIC TUJUAN</span>
                  <span className="text-[9px] font-bold text-slate-850 uppercase block truncate">
                    {record.picName} ({record.picDepartment.split(' ')[0]})
                  </span>
                </div>
                <div>
                  <span className="text-[7px] text-slate-500 font-bold block leading-none">LOKASI AREA</span>
                  <span className="text-[9px] font-bold text-slate-850 uppercase block truncate">
                    {record.picLocation.split(' / ')[0]}
                  </span>
                </div>
              </div>
            </div>

            {/* Safety Warning Ribbon (bottom) */}
            <div className="mt-3.5 bg-slate-950 text-white p-1 rounded-md text-center text-[7.5px] font-black tracking-widest uppercase flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              INDUCTION OK &bull; WAJIB APD LENGKAP
            </div>
          </div>

          {/* Cetak visitor pass button and notice */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3 no-print">
            <button
              onClick={handlePrint}
              type="button"
              className="flex-1 bg-slate-800 hover:bg-[#E85A1B] text-white font-bold py-2.5 px-4 rounded-xl border border-slate-700 hover:border-transparent transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <Printer className="w-5 h-5 text-[#E85A1B] group-hover:text-white transition-colors animate-pulse" />
              Cetak Visitor Pass (PDF)
            </button>
          </div>
        </div>

        {/* Right Info: K3 Audit Log & Action buttons */}
        <div className="md:col-span-5 flex flex-col gap-6 no-print">
          
          {/* Safety validation checklist Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 font-mono border-b border-slate-800 pb-2.5 mb-4">
              REFORMAT DEPARTEMEN HSE
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-850/50">
                <span className="text-slate-400 font-medium">Nilai Hasil Ujian:</span>
                <span className="font-mono font-bold text-[#E85A1B] text-sm">{record.quizScore}%</span>
              </div>
              
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-850/50">
                <span className="text-slate-400 font-medium">Batas Minimum Kelulusan:</span>
                <span className="font-mono text-slate-300">80%</span>
              </div>

              <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-850/50">
                <span className="text-slate-400 font-medium">Pemeriksaan APD K3:</span>
                <span className="text-emerald-400 font-extrabold flex items-center gap-1 select-none">
                  LENGKAP
                </span>
              </div>

              <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-850/50">
                <span className="text-slate-400 font-medium">Pernyataan Keselamatan:</span>
                <span className="text-emerald-400 font-bold uppercase font-mono">Disetujui</span>
              </div>

              <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-850/50">
                <span className="text-slate-400 font-medium">Digital Signature:</span>
                <span className="text-slate-250 font-mono truncate max-w-[120px] bg-slate-950 px-1 py-0.2 rounded border border-slate-850">
                  Signed (Canvas-ID)
                </span>
              </div>

              {record.gpsLocation && (
                <div className="flex flex-col gap-1 text-xs pt-1.5">
                  <span className="text-slate-400 font-medium">Lokasi Geospasial:</span>
                  <span className="font-mono text-[10.5px] bg-slate-950 border border-slate-850 p-2 rounded text-slate-300 leading-normal">
                    Lat: {record.gpsLocation.latitude.toFixed(6)}<br />
                    Lng: {record.gpsLocation.longitude.toFixed(6)}<br />
                    Akurasi: &plusmn;{record.gpsLocation.accuracy} meter
                  </span>
                </div>
              )}
            </div>

            <div className="mt-5 p-3.5 rounded-lg border border-sky-900/30 bg-sky-950/15">
              <p className="text-[10.5px] text-sky-400 leading-normal">
                <strong>Sistem Notifikasi Industri Terpadu:</strong> Salinan pdf induksi digital & data biometrik tamu otomatis dikirimkan ke <strong>HSE Dept Head</strong>, <strong>Security Guard Post 1</strong>, dan PIC Tujuan: <strong>{record.picName} ({record.picDepartment.split(' ')[0]})</strong>.
              </p>
            </div>
          </div>

          {/* Primary Operations Buttons */}
          <div className="space-y-3">
            <button
              onClick={onReset}
              type="button"
              className="w-full bg-[#E85A1B] hover:bg-[#E85A1B]/90 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <Home className="w-5 h-5" />
              Selesai & Daftar Tamu Baru
            </button>

            <button
              onClick={onNavigateToDashboard}
              type="button"
              className="w-full bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-bold py-3.5 px-4 rounded-xl border border-slate-705/80 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Compass className="w-5 h-5 text-sky-400" />
              Buka Dashboard Monitoring HSE
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
