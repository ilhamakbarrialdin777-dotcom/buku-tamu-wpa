import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, AlertTriangle, Check, UserPlus } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (photoBase64: string) => void;
  savedPhoto: string | null;
}

// Preset fallbacks for sandbox preview environments where physical camera might be blocked
const fallbackAvatars = [
  {
    name: 'HSE Auditor (Male)',
    url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=150',
    tag: 'Auditor'
  },
  {
    name: 'Service Expert (Male)',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
    tag: 'Contractor'
  },
  {
    name: 'Regulatory Inspector (Female)',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150',
    tag: 'Inspector'
  },
  {
    name: 'Technical Representative (Female)',
    url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
    tag: 'Vendor'
  },
];

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, savedPhoto }) => {
  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [useSimulator, setUseSimulator] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize camera
  const startCamera = async () => {
    setCameraError(null);
    setUseSimulator(false);
    try {
      const constraints = {
        video: { width: 320, height: 240, facingMode: "user" },
        audio: false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreamActive(true);
      }
    } catch (err: any) {
      console.warn("Camera init failed, switching to sandbox simulator:", err);
      // Fallback automatically to simulator
      setCameraError("Izin kamera diblokir atau tidak didukung pada browser/iframe ini. Simulator Profil diaktifkan.");
      setUseSimulator(true);
      setStreamActive(false);
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setStreamActive(false);
    }
  };

  // Automatically start camera on mount if photo is not already set
  useEffect(() => {
    if (!savedPhoto) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, []);

  // Set up 3 seconds countdown auto-snapshot once stream is live
  useEffect(() => {
    if (streamActive && !savedPhoto) {
      setCountdown(3);
    } else {
      setCountdown(null);
    }
  }, [streamActive, savedPhoto]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      captureSnapshot();
      setCountdown(null);
      return;
    }
    const timer = setTimeout(() => {
      setCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Capture Photo
  const captureSnapshot = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 240;
        
        // Draw the video frame to the canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to base64
        const photoDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        onCapture(photoDataUrl);
        stopCamera();
      }
    } else if (useSimulator) {
      // In case we are on simulator and countdown ends, pick the first fallback automatically
      onCapture(fallbackAvatars[0].url);
    }
  };

  // Handle simulation selection
  const selectFallback = (url: string) => {
    // Generate base64 or just pass the Unsplash URL as photostate
    onCapture(url);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 glow-blue h-full">
      <div className="flex items-center justify-between mb-4">
        <label className="block text-sm font-semibold tracking-wide text-slate-300 uppercase">
          FOTO CAPTURE TAMU <span className="text-[#E85A1B] font-bold">*</span>
        </label>
        <span className="text-xs bg-[#E85A1B]/15 text-[#E85A1B] px-2 py-0.5 rounded border border-[#E85A1B]/30 font-mono tracking-tight font-semibold">
          CAMERA ID: CAM-01
        </span>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Side: Camera Preview or Render */}
        <div className="flex-1 flex flex-col items-center">
          <div className="relative w-full max-w-[320px] aspect-[4/3] bg-slate-950 rounded-lg overflow-hidden border border-slate-700 flex flex-col items-center justify-center group">
            {/* Visual targeting grid lines for tactical military/industrial vibe */}
            <div className="absolute inset-4 border border-dashed border-slate-700/50 pointer-events-none rounded transition-all group-hover:border-[#E85A1B]/30" />
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#E85A1B] pointer-events-none" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#E85A1B] pointer-events-none" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#E85A1B] pointer-events-none" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#E85A1B] pointer-events-none" />

            {/* If has saved photo */}
            {savedPhoto && !streamActive ? (
              <div className="relative w-full h-full flex flex-col items-center justify-center">
                <img
                  src={savedPhoto}
                  alt="Captured visitor avatar"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute bottom-3 left-3 bg-emerald-500 text-white rounded-full p-1 border-2 border-slate-950">
                  <Check className="w-4 h-4" />
                </div>
                <div className="absolute bottom-3 right-3 bg-slate-900/95 text-slate-300 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded border border-emerald-505/30">
                  Foto Terpilih
                </div>
              </div>
            ) : streamActive ? (
              <div className="relative w-full h-full">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover transform scale-x-[-1]"
                  autoPlay
                  playsInline
                  muted
                />
                {countdown !== null && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-center z-10 pointer-events-none animate-fade-in">
                    <span className="text-[10px] text-[#E85A1B] font-black tracking-widest uppercase font-mono mb-1 animate-pulse">
                      Seketika Auto-Snapshot...
                    </span>
                    <span className="text-6xl font-display font-black text-white drop-shadow-md">
                      {countdown}
                    </span>
                    <span className="text-[9px] text-slate-350 mt-2 font-mono">
                      Harap menghadap lurus ke kamera
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-4 text-center">
                <Camera className="w-12 h-12 text-slate-500 mb-2 group-hover:text-[#E85A1B] transition-colors" />
                <p className="text-xs text-slate-400 font-medium px-4 mb-2">
                  Kamera belum aktif. Klik tombol di bawah untuk mengaktifkan webcam.
                </p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="bg-slate-800 hover:bg-[#E85A1B] hover:text-white text-slate-300 px-3 py-1.5 rounded text-xs px-4 font-semibold transition-all border border-slate-700 flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Aktifkan Webcam
                </button>
              </div>
            )}

            {/* Hidden canvas used to draw photo snap */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Live blinking record indicator */}
            {streamActive && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-950/80 border border-red-500 px-2 py-0.5 rounded">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 hazard-blink" />
                <span className="text-[10px] text-red-400 font-bold tracking-widest font-mono">LIVE CAM</span>
              </div>
            )}
          </div>

          {/* Camera Actions */}
          {streamActive && (
            <div className="mt-3 flex gap-2 w-full max-w-[320px]">
              <button
                type="button"
                onClick={captureSnapshot}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3 rounded text-sm transition-all shadow-md flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" />
                Ambil Foto
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 px-3 rounded text-sm font-semibold transition-all"
              >
                Batal
              </button>
            </div>
          )}

          {!streamActive && savedPhoto && (
            <button
              type="button"
              onClick={startCamera}
              className="mt-3 bg-slate-850 hover:bg-slate-800 text-slate-300 py-1.5 px-4 rounded text-xs border border-slate-700 flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Ambil Ulang Foto
            </button>
          )}
        </div>

        {/* Right Side: Simulator fallbacks & Warnings */}
        <div className="flex-1 flex flex-col justify-between">
          <div className="space-y-4">
            {cameraError && (
              <div className="bg-amber-950/40 border border-amber-500/40 p-3.5 rounded-lg flex gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <h6 className="text-xs font-bold text-amber-400 leading-tight uppercase mb-0.5">FALLBACK SIMULATOR K3</h6>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Aplikasi mendeteksi browser membatasi akses input video kamera fisik Anda. Jangan khawatir, Anda tetap dapat mensimulasikan foto tamu menggunakan pilihan avatar profesional di bawah ini.
                  </p>
                </div>
              </div>
            )}

            <div className="bg-slate-950 border border-slate-850 p-4 rounded-lg">
              <span className="text-[11px] font-bold text-[#E85A1B] uppercase tracking-wide flex items-center gap-1.5 mb-2.5">
                <UserPlus className="w-3.5 h-3.5" />
                Pilih Profil Simulator (Alternatif Cepat)
              </span>
              <div className="grid grid-cols-2 gap-3">
                {fallbackAvatars.map((av, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectFallback(av.url)}
                    className={`flex items-center gap-3 p-1.5 rounded-md border text-left transition-all ${
                      savedPhoto === av.url
                        ? 'bg-[#E85A1B]/15 border-[#E85A1B] ring-1 ring-[#E85A1B]'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                    }`}
                  >
                    <img
                      src={av.url}
                      alt={av.name}
                      className="w-10 h-10 rounded object-cover border border-slate-800"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-slate-300 font-bold truncate leading-tight">
                        {av.name}
                      </p>
                      <span className="text-[8px] px-1 py-0.2 bg-slate-800 text-slate-400 font-semibold border border-slate-700/60 rounded uppercase font-mono tracking-wide mt-1 inline-block">
                        {av.tag}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-850 pt-3 text-[10px] text-slate-500 leading-relaxed italic">
            * Seluruh file foto tamu hanya disimpan secara steril di lingkungan Local Storage peramban Anda untuk kepatuhan tata kelola data industri pertambangan.
          </div>
        </div>
      </div>
    </div>
  );
};
