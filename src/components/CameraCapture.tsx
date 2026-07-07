import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, AlertTriangle, Check, Upload } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (photoBase64: string) => void;
  savedPhoto: string | null;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, savedPhoto }) => {
  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize camera directly
  const startCamera = async () => {
    setCameraError(null);
    try {
      const constraints = {
        video: { facingMode: "user" },
        audio: false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreamActive(true);
      }
    } catch (err: any) {
      console.warn("Camera with facingMode failed, trying generic video constraints:", err);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setStreamActive(true);
        }
      } catch (err2: any) {
        console.error("Camera access failed completely:", err2);
        setCameraError(
          "Akses webcam diblokir atau tidak didukung di peramban ini. Anda dapat mengklik tombol 'Unggah Foto / Kamera HP' di samping untuk melampirkan foto secara langsung."
        );
        setStreamActive(false);
      }
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

  // Capture Photo from webcam video element
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
        const photoDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        onCapture(photoDataUrl);
        stopCamera();
      }
    }
  };

  // Handle native file input or mobile camera capture
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        onCapture(base64String);
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
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
                <div className="absolute bottom-3 left-3 bg-emerald-500 text-white rounded-full p-1 border-2 border-slate-950 animate-bounce">
                  <Check className="w-4 h-4" />
                </div>
                <div className="absolute bottom-3 right-3 bg-slate-900/95 text-slate-300 text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded border border-emerald-500/30">
                  Foto Tersimpan Otomatis
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
                  Kamera belum aktif atau akses webcam dibatasi.
                </p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="bg-slate-800 hover:bg-[#E85A1B] hover:text-white text-slate-300 px-3 py-1.5 rounded text-xs px-4 font-semibold transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Aktifkan Kamera
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
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3 rounded text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                Ambil Foto
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 px-3 rounded text-sm font-semibold transition-all cursor-pointer"
              >
                Batal
              </button>
            </div>
          )}

          {!streamActive && savedPhoto && (
            <div className="mt-3 flex gap-2 w-full max-w-[320px] justify-center">
              <button
                type="button"
                onClick={startCamera}
                className="bg-slate-850 hover:bg-slate-800 text-slate-300 py-1.5 px-3 rounded text-xs border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#E85A1B]" />
                Ambil Ulang Foto
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Clean Instructions & Standalone Alternative Camera Upload */}
        <div className="flex-1 flex flex-col justify-between">
          <div className="space-y-4">
            {cameraError && (
              <div className="bg-amber-950/30 border border-amber-500/30 p-3.5 rounded-lg flex gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                  {cameraError}
                </p>
              </div>
            )}

            {/* Guideline card */}
            <div className="bg-slate-950 border border-slate-850 p-4 rounded-lg">
              <span className="text-[11px] font-bold text-[#E85A1B] uppercase tracking-wide flex items-center gap-1.5 mb-2.5 font-mono">
                📋 PETUNJUK CAPTURE FOTO K3LH
              </span>
              <ul className="text-[11px] text-slate-400 space-y-2 list-decimal pl-4 leading-relaxed font-medium">
                <li>Posisikan wajah lurus menghadap kamera / layar.</li>
                <li>Pastikan pencahayaan ruangan mencukupi (tidak terlalu gelap/silau).</li>
                <li>Harap melepas masker atau kacamata hitam jika sedang menggunakannya.</li>
                <li>Foto ini tersimpan otomatis secara aman untuk kartu akses E-Safety Pass Anda.</li>
              </ul>
            </div>

            {/* Direct File Input / Phone Camera Access */}
            <div className="bg-slate-950 border border-slate-850 p-4 rounded-lg flex flex-col items-center justify-center text-center">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2 font-mono">
                ATAU GUNAKAN KAMERA HANDPHONE / FILE
              </span>
              <p className="text-[10px] text-slate-500 mb-3 px-2 leading-normal">
                Klik tombol di bawah untuk mengambil foto langsung dari kamera HP Anda atau memilih file gambar dari galeri perangkat.
              </p>
              
              {/* Hidden native input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={triggerFileInput}
                className="bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-indigo-800 hover:border-indigo-600 px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer w-full justify-center shadow-md uppercase font-mono"
              >
                <Upload className="w-4 h-4 text-indigo-400" />
                Unggah Foto / Ambil Kamera HP
              </button>
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
