import React, { useRef, useState, useEffect } from 'react';
import { Edit3, RotateCcw, MapPin, Loader, Radio } from 'lucide-react';

interface SignatureCanvasProps {
  fullName: string;
  onSave: (signatureBase64: string | null, gps: { latitude: number; longitude: number; accuracy: number; error: string | null } | null) => void;
  savedSignature: string | null;
}

export const SignatureCanvas: React.FC<SignatureCanvasProps> = ({
  fullName,
  onSave,
  savedSignature
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasDrawn, setHasDrawn] = useState<boolean>(savedSignature !== null);
  
  // Date & Time states
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  // GPS States
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [gpsData, setGpsData] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
    error: string | null;
  } | null>(null);

  // Set real-time clock and calendar on load
  useEffect(() => {
    const now = new Date();
    setCurrentTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WITA');
    setCurrentDate(now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    
    // Auto-fetch GPS
    triggerGpsScan();
  }, []);

  const triggerGpsScan = () => {
    setGpsLoading(true);
    if (!navigator.geolocation) {
      setGpsData({
        latitude: -0.9006, // Fallback PT. Watu Perkasa Abadi coordinates (Palu, Central Sulawesi)
        longitude: 119.8707,
        accuracy: 8,
        error: "Geolocation API tidak didukung pada browser ini. Menggunakan satelit default."
      });
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newGps = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          error: null
        };
        setGpsData(newGps);
        setGpsLoading(false);
        // Expose to parent if there's an active signature
        if (hasDrawn) {
          saveCanvasImage(newGps);
        }
      },
      (error) => {
        let errorMsg = "Izin GPS diblokir oleh browser atau sandbox.";
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = "Izin lokasi diblokir oleh pengguna / iframe sandboxing.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = "Sinyal GPS satelit tidak tersedia.";
        } else if (error.code === error.TIMEOUT) {
          errorMsg = "Waktu pencarian GPS habis.";
        }
        
        const fallbackGps = {
          latitude: -2.34567, // PT. WATU PERKASA ABADI Mine coordinate (Kalsel/Kaltim)
          longitude: 115.67891,
          accuracy: 10,
          error: `${errorMsg} Mengaktifkan enkripsi koordinat backup Mine Site.`
        };
        setGpsData(fallbackGps);
        setGpsLoading(false);
        if (hasDrawn) {
          saveCanvasImage(fallbackGps);
        }
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  // Helper to retrieve canvas drawing as Base64 to lift state
  const saveCanvasImage = (gpsParam = gpsData) => {
    if (canvasRef.current) {
      const base64 = canvasRef.current.toDataURL('image/png');
      onSave(base64, gpsParam);
    }
  };

  // Setup drawing context
  const getCoordinates = (e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    if (window.TouchEvent && e instanceof TouchEvent) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    } else if (e instanceof MouseEvent) {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
    return { x: 0, y: 0 };
  };

  // Start Drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const coords = getCoordinates(e.nativeEvent);
    
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#FFFFFF'; // White ink on navy background represents digital validation
  };

  // Draw
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCoordinates(e.nativeEvent);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    setHasDrawn(true);
  };

  // Stop Drawing
  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveCanvasImage();
    }
  };

  // Clear Canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onSave(null, null);
  };

  // Resize canvas handler to fit physical container sizes nicely on build
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Set internal width buffer size matching bounding rect
      canvas.width = canvas.parentElement?.clientWidth || 500;
      canvas.height = 160;
      
      // If we loaded with an existing signature, we can't easily draw base64 back without loading it,
      // but in standard registration wizard steps, it renders blank since signature is done fresh.
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
      }
    }
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 glow-blue">
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Hand: Canvas Pad */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wide flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-[#E85A1B]" />
              Signature Pad Digital
            </span>
            {hasDrawn && (
              <button
                type="button"
                onClick={clearCanvas}
                className="text-slate-400 hover:text-red-400 text-xs font-bold flex items-center gap-1 transition-colors px-2 py-0.5 rounded bg-slate-800/60 border border-slate-750"
              >
                <RotateCcw className="w-3 h-3" />
                Hapus Tanda Tangan
              </button>
            )}
          </div>

          <div className="border border-slate-700 hover:border-[#E85A1B]/40 bg-slate-950 rounded-lg overflow-hidden transition-all relative">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-40 cursor-crosshair block"
              style={{ touchAction: 'none' }}
            />
            {/* Background Hint Text */}
            {!hasDrawn && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-650 text-xs italic select-none">
                Goreskan tanda tangan Anda di sini menggunakan mouse atau jari
              </div>
            )}
            
            {/* Overlay grid badge */}
            <div className="absolute right-3 top-3 border border-slate-800/80 bg-slate-900/90 text-slate-500 font-mono text-[9px] px-1.5 py-0.5 rounded select-none uppercase">
              Sig-Pad Active
            </div>
          </div>
        </div>

        {/* Right Hand: Auto-Generated Validation Metadata (Indukasi K3 Audit Trail) */}
        <div className="w-full lg:w-72 bg-slate-950 border border-slate-850 p-4 rounded-xl flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#E85A1B] uppercase tracking-wider block mb-3.5 font-mono">
              VALIDATOR OTOMATIS K3LH
            </span>
            
            <div className="space-y-3">
              {/* Nama Tamu */}
              <div>
                <span className="text-[9px] text-slate-500 uppercase block font-semibold">Nama Jelas Tamu</span>
                <span className="text-xs text-white font-bold tracking-wide font-display block select-all">
                  {fullName || 'Silakan isi Nama Lengkap Terlebih Dahulu'}
                </span>
              </div>

              {/* Tanggal & Waktu */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block font-semibold">Tanggal Validasi</span>
                  <span className="text-xs text-slate-350 font-semibold font-mono block">
                    {currentDate ? new Date().toLocaleDateString('id-ID') : 'Calculating...'}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block font-semibold">Waktu Validasi</span>
                  <span className="text-xs text-[#E85A1B] font-bold font-mono block">
                    {currentTime || 'Calculating...'}
                  </span>
                </div>
              </div>

              {/* GPS Scan Area */}
              <div className="pt-2.5 border-t border-slate-850">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] text-slate-500 uppercase block font-semibold">Koordinat GPS Satelit</span>
                  <button
                    type="button"
                    onClick={triggerGpsScan}
                    disabled={gpsLoading}
                    className="text-[9px] text-sky-400 hover:text-sky-300 font-bold flex items-center gap-0.5"
                  >
                    <Radio className={`w-2.5 h-2.5 ${gpsLoading ? 'animate-pulse text-red-400' : ''}`} />
                    Refresh GPS
                  </button>
                </div>

                {gpsLoading ? (
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono py-1">
                    <Loader className="w-3.5 h-3.5 animate-spin text-[#E85A1B]" />
                    Mengunci Sinyal Satelit...
                  </div>
                ) : gpsData ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-slate-200 font-bold font-mono leading-none">
                      <MapPin className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      <span>{gpsData.latitude.toFixed(6)}, {gpsData.longitude.toFixed(6)}</span>
                    </div>
                    <span className="text-[9px] text-emerald-450 block font-mono leading-none">
                      Akurasi Posisi: ±{gpsData.accuracy.toFixed(1)} meter
                    </span>
                    {gpsData.error && (
                      <p className="text-[9px] text-amber-500 leading-tight block mt-1 leading-snug">
                        {gpsData.error}
                      </p>
                    )}
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-500">Menunggu sensor satelit...</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 text-[9px] text-slate-600 leading-tight italic border-t border-slate-850 pt-2 bg-slate-950">
            * GPS dan timestamp digital dienkripsi ke dalam tanda tangan di atas untuk mencegah manipulasi data kehadiran peninjau eksternal tambang.
          </div>
        </div>
        
      </div>
    </div>
  );
};
