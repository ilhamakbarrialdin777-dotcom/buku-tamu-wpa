import React, { useState, useEffect, useRef } from 'react';
import {
  Shield, Users, ClipboardCheck, ArrowLeft, ArrowRight, Check, AlertOctagon, AlertTriangle, BookOpen, Clock, HeartHandshake, PhoneCall, HelpCircle, FileCheck, Send, Compass, RefreshCw,
  Bell, UserPlus, LogOut, Volume2, X
} from 'lucide-react';
import { GuestRecord, SecurityLog } from './types';
import {
  generateRegistrationId,
  INITIAL_GUEST_RECORDS,
  INITIAL_SECURITY_LOGS,
  logSecurityAction
} from './utils';
import { SAFETY_QUIZ_QUESTIONS, DEPARTMENTS, LOCATIONS, EMERGENCY_CONTACTS, VISIT_PURPOSE_OPTIONS } from './constants';
import { MiningLogo } from './components/MiningLogo';
import { CameraCapture } from './components/CameraCapture';
import { SignatureCanvas } from './components/SignatureCanvas';
import { SuccessPage } from './components/SuccessPage';
import { HseDashboard } from './components/HseDashboard';

export interface LiveNotification {
  id: string;
  type: 'TAMU_DRAFT' | 'TAMU_BARU' | 'TAMU_SELESAI' | 'TAMU_CHECKOUT' | 'SYSTEM';
  message: string;
  timestamp: string;
}

// Browser native AudioContext synthesizer for real-time notification sound
const playBeep = (freq = 587.33) => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {
    // blocked or not supported, ignore gracefully
  }
};

type ViewMode = 'PORTAL' | 'WIZARD' | 'SUCCESS' | 'DASHBOARD';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('PORTAL');
  const [records, setRecords] = useState<GuestRecord[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  
  // Active state for just-completed visitor registration
  const [recentRecord, setRecentRecord] = useState<GuestRecord | null>(null);

  // Real-time toast notification list
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);
  const isInitialLoadRef = useRef<boolean>(true);
  const viewModeRef = useRef<ViewMode>(viewMode);
  const activeRegIdRef = useRef<string | null>(null);

  const showNotification = (type: LiveNotification['type'], message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newNotif: LiveNotification = {
      id,
      type,
      message,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    
    setNotifications(prev => [newNotif, ...prev].slice(0, 5));
    
    // Play sound based on notification type
    if (type === 'TAMU_BARU' || type === 'TAMU_SELESAI') {
      playBeep(659.25); // E5
      setTimeout(() => playBeep(783.99), 110); // G5
    } else if (type === 'TAMU_DRAFT') {
      playBeep(523.25); // C5
    } else if (type === 'TAMU_CHECKOUT') {
      playBeep(392.00); // G4
    } else {
      playBeep(440.00); // A4
    }

    // Auto-dismiss after 6 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 6000);
  };

  // --- WIZARD FORM STATES ---
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [fullName, setFullName] = useState<string>('');
  const [company, setCompany] = useState<string>('');
  const [position, setPosition] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [ktpNumber, setKtpNumber] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [gender, setGender] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [visitDate, setVisitDate] = useState<string>('');
  const [entryTime, setEntryTime] = useState<string>('');
  const [exitTime, setExitTime] = useState<string>('');
  const [photo, setPhoto] = useState<string | null>(null);

  // Purpose details
  const [visitPurpose, setVisitPurpose] = useState<any>('Meeting');
  const [picName, setPicName] = useState<string>('');
  const [picDepartment, setPicDepartment] = useState<string>('');
  const [picLocation, setPicLocation] = useState<string>('');
  const [activityDescription, setActivityDescription] = useState<string>('');

  // APD Checklist
  const [ppeChecklist, setPpeChecklist] = useState({
    safetyHelmet: false,
    safetyShoes: false,
    safetyVest: false,
    safetyGlasses: false,
    gloves: false,
    mask: false,
    earPlug: false,
    fullBodyHarness: false
  });

  // Quiz details
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizScore, setQuizScore] = useState<number>(0);
  const [quizResult, setQuizResult] = useState<'LULUS' | 'GAGAL' | null>(null);
  const [quizAlertMessage, setQuizAlertMessage] = useState<string | null>(null);

  // Statements
  const [statementAccepted, setStatementAccepted] = useState<boolean>(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [signatureName, setSignatureName] = useState<string>('');
  const [signatureDate, setSignatureDate] = useState<string>('');
  const [signatureTime, setSignatureTime] = useState<string>('');
  const [gpsLocation, setGpsLocation] = useState<any>(null);

  // Form submission / simulation states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitProgress, setSubmitProgress] = useState<string>('');
  const [activeRegId, setActiveRegId] = useState<string | null>(null);

  // Sync refs during render to avoid dependency-array closure staleness
  viewModeRef.current = viewMode;
  activeRegIdRef.current = activeRegId;

  // Auto-seed and load server/local database with real-time polling
  useEffect(() => {
    let recordsLoaded = false;
    let logsLoaded = false;

    const checkInitialLoadComplete = () => {
      if (recordsLoaded && logsLoaded) {
        // Allow a tiny delay for state application before enabling live alert toasts
        setTimeout(() => {
          isInitialLoadRef.current = false;
        }, 300);
      }
    };

    // 1. Fetch records from server, fallback to localStorage if offline
    fetch('/api/records')
      .then(res => {
        if (!res.ok) throw new Error("Server error");
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setRecords(data);
          localStorage.setItem('MINING_GUEST_RECORDS', JSON.stringify(data));
        }
        recordsLoaded = true;
        checkInitialLoadComplete();
      })
      .catch(err => {
        console.warn("Using local records fallback because server is offline:", err);
        const storedRecords = localStorage.getItem('MINING_GUEST_RECORDS');
        setRecords(storedRecords ? JSON.parse(storedRecords) : INITIAL_GUEST_RECORDS);
        recordsLoaded = true;
        checkInitialLoadComplete();
      });

    // 2. Fetch logs from server, fallback to localStorage if offline
    fetch('/api/logs')
      .then(res => {
        if (!res.ok) throw new Error("Server error");
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setSecurityLogs(data);
          localStorage.setItem('MINING_SECURITY_LOGS', JSON.stringify(data));
        }
        logsLoaded = true;
        checkInitialLoadComplete();
      })
      .catch(err => {
        console.warn("Using local logs fallback because server is offline:", err);
        const storedLogs = localStorage.getItem('MINING_SECURITY_LOGS');
        setSecurityLogs(storedLogs ? JSON.parse(storedLogs) : INITIAL_SECURITY_LOGS);
        logsLoaded = true;
        checkInitialLoadComplete();
      });

    // Set today date & standard times
    const now = new Date();
    setVisitDate(now.toISOString().split('T')[0]);
    setEntryTime(now.toTimeString().slice(0, 5));
    
    // Set typical checkout time to now + 4 hours
    const exitDate = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    setExitTime(exitDate.toTimeString().slice(0, 5));
    
    // Set default standard options
    setPicDepartment(DEPARTMENTS[0]);
    setPicLocation(LOCATIONS[0]);
  }, []);

  // Helper to fetch full records and logs from server (Single Source of Truth synchronization)
  const fetchFullSync = () => {
    if (!navigator.onLine) return;
    
    console.log("[SYNC] Memulai sinkronisasi penuh dari server...");
    fetch('/api/records')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setRecords(prev => {
            // Find our active local draft to preserve it
            const activeId = activeRegIdRef.current;
            const localDraft = (viewModeRef.current === 'WIZARD' && activeId) 
              ? prev.find(r => r.id === activeId) 
              : null;

            // Reconcile pending offline writes (excluding the active draft which is handled separately)
            const pending = prev.filter(r => r.isPendingSync && r.id !== activeId);
            
            // Build the next set of records starting with server data
            let next = [...data];
            
            // Merge pending offline records
            pending.forEach(pend => {
              const idx = next.findIndex(m => m.id === pend.id);
              if (idx !== -1) {
                const serverTime = next[idx].updatedAt ? new Date(next[idx].updatedAt).getTime() : 0;
                const localTime = pend.updatedAt ? new Date(pend.updatedAt).getTime() : 0;
                if (localTime > serverTime) {
                  next[idx] = pend;
                }
              } else {
                next.unshift(pend);
              }
            });

            // Restore/preserve active local draft so typing is never interrupted
            if (localDraft) {
              const idx = next.findIndex(r => r.id === activeId);
              if (idx !== -1) {
                next[idx] = localDraft;
              } else {
                next.unshift(localDraft);
              }
            }

            localStorage.setItem('MINING_GUEST_RECORDS', JSON.stringify(next));
            return next;
          });
        }
      })
      .catch(err => console.warn("Failed to fetch records during sync:", err));

    fetch('/api/logs')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setSecurityLogs(data);
          localStorage.setItem('MINING_SECURITY_LOGS', JSON.stringify(data));
        }
      })
      .catch(err => console.warn("Failed to fetch logs during sync:", err));
  };

  // Real-time EventSource connection with fallback reconnection and offline handler
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;
    let watchdogTimer: any = null;

    const resetWatchdog = () => {
      if (watchdogTimer) clearTimeout(watchdogTimer);
      watchdogTimer = setTimeout(() => {
        console.warn("[SSE] Watchdog Timeout: Tidak menerima aktivitas selama 35 detik. Menutup paksa koneksi mati dan menyambungkan kembali...");
        if (eventSource) {
          eventSource.close();
        }
        connectSSE();
      }, 35000);
    };

    const connectSSE = () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      console.log("[SSE] Menghubungkan ke real-time stream...");
      eventSource = new EventSource("/api/updates/stream");
      resetWatchdog();

      eventSource.onopen = () => {
        console.log("[SSE] Koneksi real-time terjalin.");
        fetchFullSync();
        resetWatchdog();
      };

      eventSource.addEventListener("heartbeat", () => {
        resetWatchdog();
      });

      eventSource.addEventListener("record_upserted", (event: any) => {
        try {
          resetWatchdog();
          const payload = JSON.parse(event.data);
          const newRec = payload.data;
          
          setRecords(prev => {
            // If we are currently in WIZARD editing this record, do not overwrite to prevent cursor jumps
            if (viewModeRef.current === 'WIZARD' && activeRegIdRef.current === newRec.id) {
              return prev;
            }

            const existing = prev.find(r => r.id === newRec.id);
            if (existing) {
              const existingTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
              const incomingTime = newRec.updatedAt ? new Date(newRec.updatedAt).getTime() : 0;
              const existingVersion = existing.version || 1;
              const incomingVersion = newRec.version || 1;

              // If our local is newer (like a pending offline write), do not overwrite yet
              if (existingTime > incomingTime || (existingTime === incomingTime && existingVersion > incomingVersion)) {
                return prev;
              }
            }

            // Real-time toaster alerting for other devices
            if (!isInitialLoadRef.current) {
              if (!existing) {
                const isDraft = newRec.quizResult === 'DRAFT' || !newRec.signature;
                if (isDraft) {
                  showNotification('TAMU_DRAFT', `Tamu sedang mengisi form (Draft): ${newRec.fullName || 'Tamu Baru'} dari ${newRec.company || 'Tanpa Instansi'}`);
                } else {
                  showNotification('TAMU_BARU', `Tamu baru masuk & terdaftar: ${newRec.fullName} dari ${newRec.company}`);
                }
              } else {
                const wasDraft = existing.quizResult === 'DRAFT' || !existing.signature;
                const isNowComplete = newRec.quizResult === 'LULUS' && newRec.signature;
                if (wasDraft && isNowComplete) {
                  showNotification('TAMU_SELESAI', `Pendaftaran Selesai & Lulus K3: ${newRec.fullName} dari ${newRec.company}`);
                }
                if (!existing.exitTime && newRec.exitTime) {
                  showNotification('TAMU_CHECKOUT', `Tamu telah Checkout (Keluar): ${newRec.fullName} dari ${newRec.company}`);
                }
              }
            }

            const exists = prev.some(r => r.id === newRec.id);
            let next: GuestRecord[];
            if (exists) {
              next = prev.map(r => r.id === newRec.id ? newRec : r);
            } else {
              next = [newRec, ...prev];
            }
            localStorage.setItem('MINING_GUEST_RECORDS', JSON.stringify(next));

            // Sync the recent record state if it was updated on another device (e.g. checkout from dashboard)
            setRecentRecord(prevRecent => {
              if (prevRecent && prevRecent.id === newRec.id) {
                return newRec;
              }
              return prevRecent;
            });

            return next;
          });
        } catch (e) {
          console.error("[SSE] Gagal mengolah event record_upserted:", e);
        }
      });

      eventSource.addEventListener("record_deleted", (event: any) => {
        try {
          resetWatchdog();
          const payload = JSON.parse(event.data);
          const id = payload.data;
          setRecords(prev => {
            const next = prev.filter(r => r.id !== id);
            localStorage.setItem('MINING_GUEST_RECORDS', JSON.stringify(next));
            return next;
          });
        } catch (e) {
          console.error("[SSE] Gagal mengolah event record_deleted:", e);
        }
      });

      eventSource.addEventListener("database_cleared", () => {
        resetWatchdog();
        setRecords([]);
        localStorage.setItem('MINING_GUEST_RECORDS', JSON.stringify([]));
      });

      eventSource.addEventListener("log_upserted", (event: any) => {
        try {
          resetWatchdog();
          const payload = JSON.parse(event.data);
          const newLog = payload.data;
          setSecurityLogs(prev => {
            const exists = prev.some(l => l.id === newLog.id);
            let next: SecurityLog[];
            if (exists) {
              next = prev.map(l => l.id === newLog.id ? newLog : l);
            } else {
              next = [newLog, ...prev];
            }
            localStorage.setItem('MINING_SECURITY_LOGS', JSON.stringify(next));
            return next;
          });
        } catch (e) {
          console.error("[SSE] Gagal mengolah event log_upserted:", e);
        }
      });

      eventSource.addEventListener("sync_records", (event: any) => {
        try {
          resetWatchdog();
          const payload = JSON.parse(event.data);
          const recordsData = payload.data;
          if (Array.isArray(recordsData)) {
            setRecords(recordsData);
            localStorage.setItem('MINING_GUEST_RECORDS', JSON.stringify(recordsData));
          }
        } catch (e) {
          console.error("[SSE] Gagal mengolah event sync_records:", e);
        }
      });

      eventSource.addEventListener("sync_logs", (event: any) => {
        try {
          resetWatchdog();
          const payload = JSON.parse(event.data);
          const logsData = payload.data;
          if (Array.isArray(logsData)) {
            setSecurityLogs(logsData);
            localStorage.setItem('MINING_SECURITY_LOGS', JSON.stringify(logsData));
          }
        } catch (e) {
          console.error("[SSE] Gagal mengolah event sync_logs:", e);
        }
      });

      eventSource.onerror = (err) => {
        if (eventSource && eventSource.readyState === EventSource.CLOSED) {
          console.warn("[SSE] Koneksi terputus total. Mencoba menghubungkan kembali dalam 3 detik...");
          eventSource.close();
          reconnectTimeout = setTimeout(connectSSE, 3000);
        } else {
          // It's in CONNECTING state, let the browser handle automatic reconnection silently
          console.log("[SSE] Koneksi terputus sementara. Menghubungkan ulang secara otomatis oleh browser...");
        }
      };
    };

    if (isOnline) {
      connectSSE();
    }

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (watchdogTimer) clearTimeout(watchdogTimer);
    };
  }, [isOnline]);

  // Periodic background synchronization loop (Single Source of Truth backup)
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (isOnline) {
        fetchFullSync();
      }
    }, 4000);
    return () => clearInterval(syncInterval);
  }, [isOnline]);

  // Offline pending sync algorithm
  const syncPendingRecords = () => {
    const stored = localStorage.getItem('MINING_GUEST_RECORDS');
    if (!stored) return;
    try {
      const parsed: GuestRecord[] = JSON.parse(stored);
      const pending = parsed.filter(r => r.isPendingSync);
      if (pending.length === 0) return;

      console.log(`[SYNC] Sinkronisasi ${pending.length} data tertunda (offline) ke server...`);
      
      Promise.all(
        pending.map(record => {
          const { isPendingSync, ...cleanRecord } = record;
          return fetch('/api/records/upsert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cleanRecord)
          })
          .then(res => res.json())
          .then(data => {
            if (data.success && data.record) {
              setRecords(prev => {
                const next = prev.map(r => r.id === record.id ? { ...data.record, isPendingSync: false } : r);
                localStorage.setItem('MINING_GUEST_RECORDS', JSON.stringify(next));
                return next;
              });

              // Register successful sync activity
              const logDesc = `Sinkronisasi Otomatis Sukses (Mode Offline): ${record.fullName} dari ${record.company}`;
              const newLog = logSecurityAction("OFFLINE_SYNC_SUCCESS", "SYSTEM", logDesc);
              upsertLogToDb(newLog);
            }
          })
          .catch(err => {
            console.error(`[SYNC] Gagal mensinkronkan record ${record.id}:`, err);
          });
        })
      ).then(() => {
        showNotification('SYSTEM', 'Semua data offline berhasil disinkronisasikan ke server.');
      });
    } catch (e) {
      console.error("[SYNC] Gagal mengolah syncPendingRecords:", e);
    }
  };

  // Monitor internet connection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showNotification('SYSTEM', 'Koneksi internet terdeteksi kembali. Melakukan sinkronisasi data otomatis...');
      syncPendingRecords();
    };

    const handleOffline = () => {
      setIsOnline(false);
      showNotification('SYSTEM', 'Koneksi terputus. Sistem beralih ke Mode Offline secara aman.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (navigator.onLine) {
      syncPendingRecords();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync state modifications back to localstorage and server (bulk restore)
  const saveRecordsToDb = (newRecords: GuestRecord[]) => {
    localStorage.setItem('MINING_GUEST_RECORDS', JSON.stringify(newRecords));
    setRecords(newRecords);
    if (isOnline) {
      fetch('/api/records/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecords)
      }).catch(err => console.error("Error saving records to server:", err));
    }
  };

  const saveLogsToDb = (newLogs: SecurityLog[]) => {
    localStorage.setItem('MINING_SECURITY_LOGS', JSON.stringify(newLogs));
    setSecurityLogs(newLogs);
    if (isOnline) {
      fetch('/api/logs/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLogs)
      }).catch(err => console.error("Error saving logs to server:", err));
    }
  };

  // Smart single record upsert with offline-awareness
  const upsertRecordToDb = (record: GuestRecord) => {
    const payload = {
      ...record,
      version: record.version || 1,
      updatedAt: record.updatedAt || new Date().toISOString()
    };

    setRecords(prev => {
      const exists = prev.some(r => r.id === payload.id);
      let next: GuestRecord[];
      const localRecord = { ...payload, isPendingSync: !isOnline };
      if (exists) {
        next = prev.map(r => r.id === payload.id ? localRecord : r);
      } else {
        next = [localRecord, ...prev];
      }
      localStorage.setItem('MINING_GUEST_RECORDS', JSON.stringify(next));
      return next;
    });

    if (isOnline) {
      fetch('/api/records/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.record) {
          setRecords(prev => {
            const next = prev.map(r => r.id === payload.id ? { ...data.record, isPendingSync: false } : r);
            localStorage.setItem('MINING_GUEST_RECORDS', JSON.stringify(next));
            return next;
          });
        }
      })
      .catch(err => {
        console.warn("[UPSERT] Gagal upsert ke server. Tersimpan offline.");
        setRecords(prev => {
          const next = prev.map(r => r.id === payload.id ? { ...r, isPendingSync: true } : r);
          localStorage.setItem('MINING_GUEST_RECORDS', JSON.stringify(next));
          return next;
        });
      });
    }
  };

  const upsertLogToDb = (log: SecurityLog) => {
    setSecurityLogs(prev => {
      const exists = prev.some(l => l.id === log.id);
      let next: SecurityLog[];
      if (exists) {
        next = prev.map(l => l.id === log.id ? log : l);
      } else {
        next = [log, ...prev];
      }
      localStorage.setItem('MINING_SECURITY_LOGS', JSON.stringify(next));
      return next;
    });

    if (isOnline) {
      fetch('/api/logs/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log)
      }).catch(err => console.error("Error upserting log on server:", err));
    }
  };

  // Check if critical APD is filled
  const isPpeComplete = ppeChecklist.safetyHelmet && ppeChecklist.safetyShoes && ppeChecklist.safetyVest;

  // Real-time automatic draft saving of visitor data with 1-second debounce to prevent out-of-order race conditions
  useEffect(() => {
    // Only save draft if we are in the WIZARD and have at least some basic personal info entered
    if (viewMode === 'WIZARD' && (fullName.trim() || company.trim() || phone.trim() || ktpNumber.trim())) {
      let currentId = activeRegId;
      if (!currentId) {
        currentId = generateRegistrationId();
        setActiveRegId(currentId);
      }

      const existingRecord = records.find(r => r.id === currentId);
      const version = existingRecord?.version || 1;

      const draftRecord: GuestRecord = {
        id: currentId,
        fullName,
        company,
        position,
        phone,
        ktpNumber,
        address,
        email,
        gender,
        visitDate,
        entryTime,
        exitTime,
        photo,
        visitPurpose,
        picName,
        picDepartment,
        picLocation,
        activityDescription,
        ppeChecklist,
        isPpeComplete,
        quizAnswers,
        quizScore,
        quizResult: quizResult || 'DRAFT', // 'DRAFT' indicates it's currently in progress
        statementAccepted,
        signature,
        signatureName: fullName,
        signatureDate: new Date().toLocaleDateString('id-ID'),
        signatureTime: new Date().toLocaleTimeString('id-ID') + ' WITA',
        gpsLocation: gpsLocation || { latitude: -0.9006, longitude: 119.8707, accuracy: 10, error: "Palu Site Location" }, // PT Watu Perkasa Abadi Palu coordinates
        createdAt: existingRecord?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version,
        isPendingSync: !isOnline
      };

      // 1. Immediately update local state so the current visitor sees no lag
      setRecords(prev => {
        const exists = prev.some(r => r.id === currentId);
        let next: GuestRecord[];
        if (exists) {
          next = prev.map(r => r.id === currentId ? draftRecord : r);
        } else {
          next = [draftRecord, ...prev];
        }
        localStorage.setItem('MINING_GUEST_RECORDS', JSON.stringify(next));
        return next;
      });

      // 2. Debounce the network request to the server so we only write the absolute final state when typing pauses
      const syncTimeout = setTimeout(() => {
        if (!isOnline) {
          console.log("[WIZARD DRAFT] Mode Offline: Draf disimpan secara lokal.");
          return;
        }

        fetch('/api/records/upsert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draftRecord)
        })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.record) {
            setRecords(prev => {
              const next = prev.map(r => r.id === currentId ? { ...data.record, isPendingSync: false } : r);
              localStorage.setItem('MINING_GUEST_RECORDS', JSON.stringify(next));
              return next;
            });
          }
        })
        .catch(err => {
          console.warn("[WIZARD DRAFT] Gagal upsert draf otomatis ke server. Tersimpan offline.");
          setRecords(prev => {
            const next = prev.map(r => r.id === currentId ? { ...r, isPendingSync: true } : r);
            localStorage.setItem('MINING_GUEST_RECORDS', JSON.stringify(next));
            return next;
          });
        });
      }, 1000);

      return () => clearTimeout(syncTimeout);
    }
  }, [
    viewMode,
    fullName,
    company,
    position,
    phone,
    ktpNumber,
    address,
    email,
    gender,
    visitDate,
    entryTime,
    exitTime,
    photo,
    visitPurpose,
    picName,
    picDepartment,
    picLocation,
    activityDescription,
    ppeChecklist,
    isPpeComplete,
    quizAnswers,
    quizScore,
    quizResult,
    statementAccepted,
    signature,
    gpsLocation,
    activeRegId
  ]);

  // --- COMPONENT HANDLERS ---
  const handlePpeToggle = (key: string) => {
    setPpeChecklist(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev]
    }));
  };

  // Evaluate Safety Quiz
  const evaluateQuiz = () => {
    let correctCount = 0;
    SAFETY_QUIZ_QUESTIONS.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correctAnswerIndex) {
        correctCount++;
      }
    });

    const scorePercent = (correctCount / SAFETY_QUIZ_QUESTIONS.length) * 100;
    setQuizScore(scorePercent);

    if (scorePercent >= 80) {
      setQuizResult('LULUS');
      setQuizAlertMessage('Selamat! Anda LULUS Induksi Keselamatan. Score Anda melampaui batas minimum KOS Kepatuhan pertambangan (80%).');
    } else {
      setQuizResult('GAGAL');
      setQuizAlertMessage('Maaf, Anda BELUM LULUS induksi (Score di bawah 80%). Mohon tinjau ulang modul keselamatan pada Section 4 lalu coba ulangi pengerjaan ujian.');
    }
  };

  // Submit the registration wizard
  const handleSubmitRegistration = async () => {
    if (!fullName || !company || !position || !phone || !ktpNumber || !email) {
      alert("Harap lengkapi seluruh Data Pribadi Tamu di Section 1.");
      setCurrentStep(1);
      return;
    }

    if (!photo) {
      alert("Anda wajib mengambil capture foto data wajah tamu di Section 1 guna audit biometrik.");
      setCurrentStep(1);
      return;
    }

    if (!picName || !activityDescription) {
      alert("Harap lengkapi Informasi PIC dan Deskripsi Kegiatan Kunjungan di Section 2.");
      setCurrentStep(2);
      return;
    }

    if (!isPpeComplete) {
      alert("Akses Masuk Tidak Diizinkan. Setiap orang wajib melengkapi APD Utama (Helm, Sepatu, dan Rompi) di Section 3.");
      setCurrentStep(3);
      return;
    }

    if (quizResult !== 'LULUS') {
      alert("Ujian materi K3 wajib LULUS setidaknya minimal 80% di Section 5 untuk mendapatkan izin masuk tambang.");
      setCurrentStep(5);
      return;
    }

    if (!statementAccepted) {
      alert("Anda wajib menyetujui Pernyataan Keselamatan di Section 6.");
      setCurrentStep(6);
      return;
    }

    if (!signature) {
      alert("Silakan tanda tangani Canvas Digital Signature Anda di Section 7.");
      setCurrentStep(7);
      return;
    }

    // Begin simulated submission progress with real-time UI logging
    setIsSubmitting(true);
    setSubmitProgress("Menghubungkan ke satelit komunikasi server K3LH...");
    await new Promise(r => setTimeout(r, 600));

    setSubmitProgress("Mengenkripsi koordinat geo-spasial, biometrik wajah, dan tanda tangan digital...");
    await new Promise(r => setTimeout(r, 600));

    setSubmitProgress("Mengirim salinan digital sertifikat E-Safety Pass secara otomatis ke Security Post 1...");
    await new Promise(r => setTimeout(r, 500));

    setSubmitProgress("Menyinkronkan notifikasi persetujuan PIC Departemen...");
    await new Promise(r => setTimeout(r, 500));

    // Save Guest Record (reuse draft ID to prevent duplicates)
    const regId = activeRegId || generateRegistrationId();
    const existingRecord = records.find(r => r.id === regId);
    const version = (existingRecord?.version || 1) + 1;

    const newRecord: GuestRecord = {
      id: regId,
      fullName,
      company,
      position,
      phone,
      ktpNumber,
      address,
      email,
      gender,
      visitDate,
      entryTime,
      exitTime,
      photo,
      visitPurpose,
      picName,
      picDepartment,
      picLocation,
      activityDescription,
      ppeChecklist,
      isPpeComplete,
      quizAnswers,
      quizScore,
      quizResult: 'LULUS',
      statementAccepted,
      signature,
      signatureName: fullName,
      signatureDate: new Date().toLocaleDateString('id-ID'),
      signatureTime: new Date().toLocaleTimeString('id-ID') + ' WITA',
      gpsLocation: gpsLocation || { latitude: -0.9006, longitude: 119.8707, accuracy: 10, error: "Palu Site Location" }, // PT Watu Perkasa Abadi Palu coordinates
      createdAt: existingRecord?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version
    };

    // Upsert the single final submitted record to the server
    upsertRecordToDb(newRecord);

    // Append Security log
    const logDesc = `Registrasi Tamu Baru Berhasil: ${newRecord.fullName} dari ${newRecord.company} - PIC: ${newRecord.picName}`;
    const newLog = logSecurityAction("REGISTRATION_SUBMIT", "VISITOR", logDesc);
    upsertLogToDb(newLog);

    // Save recent state
    setRecentRecord(newRecord);
    
    // Smooth reset form
    resetWizardInputs();
    
    setIsSubmitting(false);
    setViewMode('SUCCESS');
  };

  const resetWizardInputs = () => {
    setCurrentStep(1);
    setFullName('');
    setCompany('');
    setPosition('');
    setPhone('');
    setKtpNumber('');
    setAddress('');
    setPhoto(null);
    setPpeChecklist({
      safetyHelmet: false,
      safetyShoes: false,
      safetyVest: false,
      safetyGlasses: false,
      gloves: false,
      mask: false,
      earPlug: false,
      fullBodyHarness: false
    });
    setQuizAnswers({});
    setQuizResult(null);
    setQuizScore(0);
    setQuizAlertMessage(null);
    setStatementAccepted(false);
    setSignature(null);
    setGpsLocation(null);
    setActiveRegId(null);
  };

  // Dashboard operations with real-time server replication
  const handleDeleteRecord = (id: string) => {
    setRecords(prev => {
      const next = prev.filter(r => r.id !== id);
      localStorage.setItem('MINING_GUEST_RECORDS', JSON.stringify(next));
      return next;
    });
    fetch(`/api/records/${id}`, { method: 'DELETE' })
      .catch(err => console.error("Error deleting record on server:", err));
  };

  const handleUpdateRecord = (updated: GuestRecord) => {
    const bumped = {
      ...updated,
      version: (updated.version || 1) + 1,
      updatedAt: new Date().toISOString()
    };
    upsertRecordToDb(bumped);
    // If the edited record is the one we recently registered, synchronize it to prevent stale state on recent pass page
    if (recentRecord && recentRecord.id === updated.id) {
      setRecentRecord(bumped);
    }
  };

  const handleClearAllDb = () => {
    setRecords([]);
    localStorage.setItem('MINING_GUEST_RECORDS', JSON.stringify([]));
    fetch('/api/records/clear', { method: 'POST' })
      .catch(err => console.error("Error clearing database on server:", err));
  };

  const handleRestoreFromBackup = (imported: GuestRecord[]) => {
    saveRecordsToDb(imported);
  };

  // Perform manual checkout on live visitors
  const handleCheckoutGuest = (id: string) => {
    const nowTimeStr = new Date().toTimeString().slice(0, 5);
    const match = records.find(r => r.id === id);
    if (match) {
      const updated = { 
        ...match, 
        exitTime: nowTimeStr,
        version: (match.version || 1) + 1,
        updatedAt: new Date().toISOString()
      };
      upsertRecordToDb(updated);

      const txt = `Checkout manual berhasil diproses untuk tamu: ${updated.fullName}`;
      const newLog = logSecurityAction("CHECKOUT_FORCE", "SECURITY", txt);
      upsertLogToDb(newLog);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A1628] font-sans antialiased text-slate-100 flex flex-col justify-between">
      
      {/* ================= GLOBAL FLOATING APPHEADER ================= */}
      <header className="bg-[#0D2240] border-b border-slate-800 shadow-lg py-4 px-6 no-print">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <button onClick={() => setViewMode('PORTAL')} className="cursor-pointer">
            <MiningLogo light />
          </button>

          {/* Status Koneksi Realtime */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10.5px] font-mono font-bold uppercase transition-all ${
              isOnline 
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400' 
                : 'bg-rose-950/20 border-rose-500/30 text-rose-400 animate-pulse'
            }`}>
              <span className="h-2 w-2 rounded-full relative flex">
                {isOnline && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              </span>
              {isOnline ? 'ONLINE (SINKRON)' : 'OFFLINE MODE'}
            </div>

            {records.some(r => r.isPendingSync) && (
              <div className="bg-amber-950/30 border border-amber-500/30 text-amber-400 px-3 py-1.5 rounded-lg text-[10.5px] font-mono font-bold uppercase animate-pulse flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                {records.filter(r => r.isPendingSync).length} DATA TERTUNDA
              </div>
            )}
          </div>

          {/* Navigation Area */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                resetWizardInputs();
                setViewMode('WIZARD');
              }}
              className="bg-slate-900 border border-slate-850 hover:bg-[#E85A1B] text-slate-350 hover:text-white px-3.5 py-1.8 rounded-lg text-xs font-bold tracking-wide transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ClipboardCheck className="w-4 h-4 text-[#E85A1B] hover:text-white" />
              Sertifikasi Induksi Baru
            </button>

            <button
              onClick={() => setViewMode('DASHBOARD')}
              className="bg-slate-900 border border-[#E85A1B]/30 hover:border-[#E85A1B] text-[#E85A1B] px-3.5 py-1.8 rounded-lg text-xs font-bold tracking-wide transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Compass className="w-4 h-4" />
              Control Panel HSE
            </button>
          </div>
        </div>
      </header>

      {/* ================= MAIN ROUTER PORTAL ================= */}
      <main className="flex-grow flex flex-col justify-center">
        
        {/* VIEW 1: PORTAL CENTRAL CHANNELS */}
        {viewMode === 'PORTAL' && (
          <div className="max-w-5xl mx-auto px-6 py-12 text-center animate-fade-in no-print">
            
            {/* Tagline */}
            <span className="bg-[#E85A1B]/15 border border-[#E85A1B]/40 text-[#E85A1B] font-mono text-[11px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest inline-block mb-4">
              Integrated Mine Work Safety System
            </span>

            <h1 className="text-4xl md:text-5xl font-display font-black tracking-tight text-white mb-4 leading-tight uppercase">
              BUKU TAMU & E-SAFETY INDUCTION
            </h1>
            <p className="text-sm md:text-md text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed mb-10">
              Selamat datang di portal kepatuhan K3LH PT. Watu Perkasa Abadi. Setiap tamu, kontraktor, dan vendor eksternal yang akan memasuki wilayah kerja operasional tambang wajib melewati sertifikasi induksi keselamatan mandiri di bawah ini.
            </p>

            {/* Two Channels Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              
              {/* Channel A: Induction registration */}
              <div
                onClick={() => {
                  resetWizardInputs();
                  setViewMode('WIZARD');
                }}
                className="bg-[#0D2240] hover:bg-[#112B50] border border-slate-800 hover:border-[#E85A1B]/35 rounded-2xl p-8 cursor-pointer transition-all hover:-translate-y-1.5 group flex flex-col justify-between text-left relative overflow-hidden"
              >
                {/* Visual hazard stripe bar on left hover */}
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#E85A1B]" />
                
                <div>
                  <div className="bg-[#E85A1B]/10 group-hover:bg-[#E85A1B]/20 text-[#E85A1B] p-4.5 rounded-2xl inline-block mb-6 transition-colors">
                    <ClipboardCheck className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-display font-extrabold text-white uppercase tracking-tight mb-2">
                    E-INDUKSI TAMU BARU
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Registrasi kedatangan tamu, kontraktor, atau otoritas dinas baru, pengerjaan kuis keselamatan 10 modul K3 pertambangan, dan penandatanganan digital.
                  </p>
                </div>

                <span className="text-xs text-[#E85A1B] font-extrabold tracking-wider mt-6 inline-flex items-center gap-1 group-hover:gap-2 transition-all uppercase">
                  Mulai Pendaftaran
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>

              {/* Channel B: Officer Dashboard Panel */}
              <div
                onClick={() => setViewMode('DASHBOARD')}
                className="bg-[#0D2240] hover:bg-[#112B50] border border-slate-800 hover:border-[#1A4A8A]/45 rounded-2xl p-8 cursor-pointer transition-all hover:-translate-y-1.5 group flex flex-col justify-between text-left relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#1A4A8A]" />
                
                <div>
                  <div className="bg-[#1A4A8A]/10 group-hover:bg-[#1A4A8A]/20 text-[#1A4A8A] p-4.5 rounded-2xl inline-block mb-6 transition-colors">
                    <Shield className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-display font-extrabold text-white uppercase tracking-tight mb-2">
                    RUANG KONTROL HSE
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Khusus petugas Pos Keamanan, HSE Superintendent dan Administrator untuk memantau data tamu real-time, verifikasi biometrik, cek overstay, dan ekspor laporan.
                  </p>
                </div>

                <span className="text-xs text-[#1A4A8A] font-extrabold tracking-wider mt-6 inline-flex items-center gap-1 group-hover:gap-2 transition-all uppercase">
                  Masuk Sistem Aman / PIN
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>

            </div>

            {/* Warning advisory stripe */}
            <div className="mt-14 bg-amber-950/15 border border-amber-900/30 p-4.5 rounded-xl max-w-3xl mx-auto flex gap-3 text-left">
              <AlertTriangle className="w-6 h-6 text-[#E85A1B] shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-amber-500 uppercase font-mono tracking-wider">HIMBAUAN KEPATUHAN K3:</span>
                <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                  Setiap personil eksternal berkewajiban menggunakan Alat Pelindung Diri (APD) standar tingkat tinggi yang tersertifikasi sebelum melewati Pos Pemeriksaan Utama. Izin masuk area tambang aktif terikat sepenuhnya pada verifikasi induksi ini.
                </p>
              </div>
            </div>

          </div>
        )}

        {/* VIEW 2: STEPPED SAFETY REGISTRY FORM WIZARD */}
        {viewMode === 'WIZARD' && (
          <div className="max-w-4xl mx-auto px-4 py-8 w-full animate-fade-in no-print">
            
            {/* Progress Track Header */}
            <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl mb-6 shadow-md">
              <div className="flex items-center justify-between gap-4 mb-3">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider font-mono">
                  Sertifikasi Kemajuan Registrasi:
                </span>
                <span className="text-xs bg-[#E85A1B] text-white font-extrabold px-3 py-1 rounded-md font-mono">
                  SECTION {currentStep} / 7
                </span>
              </div>

              {/* Multi-step progress bar */}
              <div className="h-2 bg-slate-950 rounded-full overflow-hidden flex">
                {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                  <div
                    key={num}
                    className={`flex-1 border-r border-slate-900 first:rounded-l-full last:rounded-r-full transition-all ${
                      num <= currentStep ? 'bg-[#E85A1B]' : 'bg-slate-850'
                    }`}
                  />
                ))}
              </div>

              {/* Progress Labels Header Icons Row */}
              <div className="hidden sm:grid grid-cols-7 gap-1 text-[9px] font-black uppercase text-center mt-3 text-slate-400">
                <span className={currentStep === 1 ? 'text-white' : ''}>1. Profil</span>
                <span className={currentStep === 2 ? 'text-white' : ''}>2. PIC</span>
                <span className={currentStep === 3 ? 'text-white' : ''}>3. APD</span>
                <span className={currentStep === 4 ? 'text-white' : ''}>4. Materi</span>
                <span className={currentStep === 5 ? 'text-white' : ''}>5. Ujian</span>
                <span className={currentStep === 6 ? 'text-white' : ''}>6. Pernyataan</span>
                <span className={currentStep === 7 ? 'text-white' : ''}>7. Validasi</span>
              </div>
            </div>

            {/* ================= STEP CONTENT CONTROLLER ================= */}
            <div className="bg-[#0D2240] border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl">
              
              {/* --- SECTION 1: DATA PRIBADI TAMU --- */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="border-b border-slate-850 pb-3">
                    <h2 className="text-xl font-display font-black tracking-tight text-white uppercase">
                      SECTION 1: DATA PRIBADI PENINJAU
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Harap lengkapi isian data identitas sipil secara benar guna pemetaan otoritas keselamatan.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Nama */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nama Lengkap <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Masukkan nama lengkap sesuai KTP"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-[#E85A1B] text-slate-200 placeholder-slate-600 rounded-lg p-2.5 text-xs focus:outline-none transition-all"
                      />
                    </div>

                    {/* Perusahaan */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nama Perusahaan / Dinas <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Contoh: PT. United Tractors Tbk / ESDM"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-[#E85A1B] text-slate-200 placeholder-slate-600 rounded-lg p-2.5 text-xs focus:outline-none transition-all"
                      />
                    </div>

                    {/* Jabatan */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Jabatan <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={position}
                        onChange={(e) => setPosition(e.target.value)}
                        placeholder="Contoh: Senior Auditor / Service Engineer"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-[#E85A1B] text-slate-200 placeholder-slate-600 rounded-lg p-2.5 text-xs focus:outline-none transition-all"
                      />
                    </div>

                    {/* Gender */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-semibold">Jenis Kelamin</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setGender('Laki-laki')}
                          className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                            gender === 'Laki-laki'
                              ? 'bg-[#E85A1B]/15 border-[#E85A1B] text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-750'
                          }`}
                        >
                          Laki-laki
                        </button>
                        <button
                          type="button"
                          onClick={() => setGender('Perempuan')}
                          className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                            gender === 'Perempuan'
                              ? 'bg-[#E85A1B]/15 border-[#E85A1B] text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-750'
                          }`}
                        >
                          Perempuan
                        </button>
                      </div>
                    </div>

                    {/* Nomer KTP */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nomor KTP (NIK) <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={ktpNumber}
                        onChange={(e) => setKtpNumber(e.target.value.replace(/\D/g, ''))}
                        maxLength={16}
                        placeholder="Masukkan 16 digit NIK"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-[#E85A1B] text-slate-200 placeholder-slate-600 rounded-lg p-2.5 text-xs focus:outline-none transition-all font-mono"
                      />
                    </div>

                    {/* Nomer HP */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nomor HP / WhatsApp <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Contoh: 081234567xxx"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-[#E85A1B] text-slate-200 placeholder-slate-600 rounded-lg p-2.5 text-xs focus:outline-none transition-all font-mono"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Alamat Email <span className="text-red-500">*</span></label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Contoh: name@company.com"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-[#E85A1B] text-slate-200 placeholder-slate-600 rounded-lg p-2.5 text-xs focus:outline-none transition-all"
                      />
                    </div>

                    {/* Tanggal Kunjungan */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Tanggal Kunjungan</label>
                      <input
                        type="date"
                        value={visitDate}
                        onChange={(e) => setVisitDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-[#E85A1B] text-slate-350 rounded-lg p-2.5 text-xs focus:outline-none transition-all cursor-pointer"
                      />
                    </div>

                    {/* Jam Masuk */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Jam Masuk (Izin Masuk)</label>
                      <input
                        type="time"
                        value={entryTime}
                        onChange={(e) => setEntryTime(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-[#E85A1B] text-slate-350 rounded-lg p-2.5 text-xs focus:outline-none transition-all cursor-pointer font-mono"
                      />
                    </div>

                    {/* Jam Keluar */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Perkiraan Jam Keluar (Izin Keluar)</label>
                      <input
                        type="time"
                        value={exitTime}
                        onChange={(e) => setExitTime(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-[#E85A1B] text-slate-350 rounded-lg p-2.5 text-xs focus:outline-none transition-all cursor-pointer font-mono"
                      />
                    </div>

                    {/* Alamat Rumah */}
                    <div className="md:col-span-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Alamat Domisili Sesuai KTP</label>
                      <textarea
                        rows={2}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Tulis alamat tempat tinggal"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-[#E85A1B] text-slate-200 placeholder-slate-650 rounded-lg p-2.5 text-xs focus:outline-none transition-all"
                      />
                    </div>

                  </div>

                  {/* CAMERA CAPTURE SECTION INJECT */}
                  <CameraCapture onCapture={(b64) => setPhoto(b64)} savedPhoto={photo} />

                </div>
              )}

              {/* --- SECTION 2: TUJUAN KUNJUNGAN --- */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="border-b border-slate-850 pb-3">
                    <h2 className="text-xl font-display font-black tracking-tight text-white uppercase">
                      SECTION 2: TUJUAN & KEPERLUAN TAMU
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Deklarasikan departemen PIC dan lokasi area penugasan guna penjagaan ketat batas zonasi.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
                    {/* Keperluan */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Tujuan Utama Kunjungan <span className="text-red-500">*</span></label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {VISIT_PURPOSE_OPTIONS.map((val) => (
                          <button
                            key={val.value}
                            type="button"
                            onClick={() => setVisitPurpose(val.value)}
                            className={`py-2 px-3 rounded-lg text-xs font-semibold border text-left transition-all ${
                              visitPurpose === val.value
                                ? 'bg-[#E85A1B]/15 border-[#E85A1B] text-white font-bold'
                                : 'bg-slate-950 border-slate-850 text-slate-450 hover:border-slate-750 hover:text-slate-300'
                            }`}
                          >
                            {val.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Nama PIC */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nama PIC Karyawan Internal <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={picName}
                          onChange={(e) => setPicName(e.target.value)}
                          placeholder="Siapa PIC yang mendampingi kunjungan Anda?"
                          className="w-full bg-slate-950 border border-slate-800 focus:border-[#E85A1B] text-slate-200 placeholder-slate-650 rounded-lg p-2.5 text-xs focus:outline-none transition-all"
                        />
                      </div>

                      {/* Departemen PIC */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Departemen PIC Internal</label>
                        <select
                          value={picDepartment}
                          onChange={(e) => setPicDepartment(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-[#E85A1B] text-slate-350 rounded-lg p-2.5 text-xs focus:outline-none transition-all cursor-pointer"
                        >
                          {DEPARTMENTS.map((dept) => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                      </div>

                      {/* Lokasi Tujuan */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Lokasi Kerja Tujuan Utama</label>
                        <select
                          value={picLocation}
                          onChange={(e) => setPicLocation(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-[#E85A1B] text-slate-350 rounded-lg p-2.5 text-xs focus:outline-none transition-all cursor-pointer"
                        >
                          {LOCATIONS.map((loc) => (
                            <option key={loc} value={loc}>{loc}</option>
                          ))}
                        </select>
                      </div>

                    </div>

                    {/* Deskripsi Kegiatan */}
                    <div className="md:col-span-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Uraian Deskripsi Kegiatan <span className="text-red-500">*</span></label>
                      <textarea
                        rows={3}
                        value={activityDescription}
                        onChange={(e) => setActivityDescription(e.target.value)}
                        placeholder="Sebutkan aktivitas detail peninjauan Anda di lapangan tambang secara terperinci..."
                        className="w-full bg-slate-950 border border-slate-800 focus:border-[#E85A1B] text-slate-200 placeholder-slate-650 rounded-lg p-2.5 text-xs focus:outline-none transition-all"
                      />
                    </div>

                  </div>
                </div>
              )}

              {/* --- SECTION 3: APD PEMERIKSAAN --- */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="border-b border-slate-850 pb-3">
                    <h2 className="text-xl font-display font-black tracking-tight text-white uppercase flex items-center gap-2">
                      SECTION 3: PEMERIKSAAN KELENGKAPAN APD
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Setiap pekerja wajib membawa APD personal yang teruji demi mengurangi paparan cedera fatal tambang.
                    </p>
                  </div>

                  {/* Warning Danger banner if incomplete */}
                  {!isPpeComplete ? (
                    <div className="bg-red-950/60 border border-red-500 p-4 rounded-xl flex items-center gap-3 hazard-blink select-none">
                      <AlertOctagon className="w-8 h-8 text-red-500 animate-pulse shrink-0" />
                      <div>
                        <span className="text-xs font-black text-red-400 uppercase font-mono tracking-wider">AKSES DIKUNCI / BLOCKED ACCESS:</span>
                        <p className="text-[11.5px] text-slate-300 font-semibold leading-normal mt-0.5">
                          "Akses Tidak Diizinkan Sebelum APD Lengkap". Wajib mencentang APD Utama (Helmet, Shoes, & Safety Vest).
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-950/40 border border-emerald-500/30 p-4 rounded-xl flex items-center gap-2.5 text-emerald-400">
                      <Check className="w-6 h-6 bg-emerald-900 border border-emerald-500 rounded-full shrink-0" />
                      <div className="text-xs font-semibold">
                        Kepatuhan APD lengkap terkonfirmasi! Anda diperbolehkan lanjut ke training safety induction.
                      </div>
                    </div>
                  )}

                  {/* Grid Checkboxes APD */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 text-left">
                    {[
                      { key: 'safetyHelmet', name: 'Safety Helmet (Putih)', hint: 'Pelindung Kepala', required: true },
                      { key: 'safetyShoes', name: 'Safety Shoes', hint: 'Perlindung Kaki', required: true },
                      { key: 'safetyVest', name: 'Safety Vest Reflektif', hint: 'Visibilitas Jauh', required: true },
                      { key: 'safetyGlasses', name: 'Safety Glasses', hint: 'Proteksi Mata', required: false },
                      { key: 'gloves', name: 'Hand Gloves', hint: 'Melindungi Jari', required: false },
                      { key: 'mask', name: 'Dust Mask', hint: 'Pencegah Debu Batubara', required: false },
                      { key: 'earPlug', name: 'Ear Plugs / Muffs', hint: 'Proteksi Pendengaran', required: false },
                      { key: 'fullBodyHarness', name: 'Full Body Harness', hint: 'Ketinggian > 1.8m', required: false }
                    ].map((item) => {
                      const active = ppeChecklist[item.key as keyof typeof ppeChecklist];
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => handlePpeToggle(item.key)}
                          className={`p-4 rounded-xl border text-left flex flex-col justify-between h-28 transition-all relative cursor-pointer ${
                            active
                              ? 'bg-[#E85A1B]/15 border-[#E85A1B] ring-1 ring-[#E85A1B]'
                              : 'bg-slate-950 border-slate-850 hover:border-slate-800 text-slate-500 hover:text-slate-400'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-[10px] font-bold font-mono text-[#E85A1B] uppercase">
                              {item.required ? 'MANDATORY *' : 'FACULTATIVE'}
                            </span>
                            <div className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition-colors ${
                              active ? 'bg-[#E85A1B] border-[#E85A1B]' : 'bg-slate-900 border-slate-800'
                            }`}>
                              {active && <Check className="w-3 h-3 text-white" />}
                            </div>
                          </div>

                          <div className="mt-2 text-left">
                            <span className="text-xs font-bold text-slate-200 block truncate leading-tight">
                              {item.name}
                            </span>
                            <span className="text-[9px] text-slate-500 block leading-none mt-1 uppercase">
                              {item.hint}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                </div>
              )}

              {/* --- SECTION 4: E-SAFETY INDUCTION TRAINING --- */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  
                  <div className="border-b border-slate-850 pb-3">
                    <h2 className="text-xl font-display font-black tracking-tight text-white uppercase flex items-center gap-1.5">
                      <BookOpen className="w-5 h-5 text-[#E85A1B]" />
                      SECTION 4: KURSUS ORIENTASI TATA KELOLA K3
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Pelajari 3 pilar wajib keselamatan tambang sebelum Anda mengisi kuesioner evaluasi.
                    </p>
                  </div>

                  {/* Training Material Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                    
                    {/* Pilar 1 */}
                    <div className="bg-slate-950 border border-slate-850 p-4.5 rounded-xl flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-[#E85A1B] uppercase tracking-wider block font-mono mb-2">PILAR 01</span>
                        <h4 className="text-md font-extrabold text-white mb-2 uppercase leading-snug">Bahaya Operasional Tambang</h4>
                        <ul className="text-xs text-slate-400 space-y-2 list-disc pl-4 leading-normal">
                          <li><strong>Alat Berat Bergerak & Blind spot:</strong> Dump truck berukuran raksasa memiliki jarak pandang terbatas dari operator kabin.</li>
                          <li><strong>Hauling road:</strong> Jalan angkutan berdebu tebal dan licin, wajib memberikan prioritas mutlak ke unit bermuatan.</li>
                          <li><strong>Material Jatuh & Lereng:</strong> Bahaya longsoran tebing batubara dan jatuhan batu pit.</li>
                        </ul>
                      </div>

                      {/* Speed limit banner */}
                      <div className="mt-4 border-2 border-red-500 rounded-lg p-2 bg-white text-slate-950 text-center select-none shadow-md">
                        <span className="text-[9px] font-black text-red-500 font-mono block tracking-tight">SPEED LIMIT</span>
                        <span className="text-3xl font-black font-display tracking-normal block leading-none mt-0.5">30 KM/H</span>
                        <span className="text-[8px] font-bold text-slate-600 block uppercase leading-none mt-1">MAXIMUM VEHICLE SPEED</span>
                      </div>
                    </div>

                    {/* Pilar 2 */}
                    <div className="bg-slate-950 border border-slate-850 p-4.5 rounded-xl">
                      <span className="text-[10px] font-bold text-[#E85A1B] uppercase tracking-wider block font-mono mb-2">PILAR 02</span>
                      <h4 className="text-md font-extrabold text-white mb-2 uppercase leading-snug">Larangan & Ketentuan Tegas</h4>
                      <ul className="text-xs text-slate-400 space-y-2.5 list-disc pl-4 leading-relaxed">
                        <li><strong>Akses Tanpa Izin:</strong> Dilarang keras memasuki wilayah di luar perizinan induksi atau PIC pendamping.</li>
                        <li><strong>No Smoking Spot:</strong> Dilarang merokok sembarangan selain di Smoking Area resmi untuk mencegah risiko kebakaran.</li>
                        <li><strong>Dilarang Memotret:</strong> Dilarang keras memotret instalasi keselamatan, stockpile, atau pit tanpa seizin K3LH Dept.</li>
                        <li><strong>Larangan Lepas APD:</strong> Dilarang melepaskan helmet atau sepatu selama di luar koridor kantor.</li>
                      </ul>
                    </div>

                    {/* Pilar 3 */}
                    <div className="bg-slate-950 border border-slate-850 p-4.5 rounded-xl flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-[#E85A1B] uppercase tracking-wider block font-mono mb-2">PILAR 03</span>
                        <h4 className="text-md font-extrabold text-white mb-2 uppercase leading-snug">Sistem Tanggap Darurat</h4>
                        <p className="text-xs text-slate-400 leading-normal">
                          Apabila sirine berbunyi panjang 1 kali atau berulang, segera matikan kegiatan, amankan posisi, lalu berjalan menuju <strong>MUSTER POINT (Titik Kumpul)</strong> terdekat.
                        </p>

                        {/* Note command for guest */}
                        <div className="mt-3 bg-[#E85A1B]/15 border border-[#E85A1B]/30 rounded-lg p-2.5 text-center">
                          <span className="font-black text-[#E85A1B] text-[9.5px] tracking-wider block font-mono uppercase animate-pulse">⚠️ PENTING: HARAP DICATAT!</span>
                          <p className="text-slate-300 text-[9px] leading-relaxed mt-1 font-medium">
                            Silakan catat dan simpan nomor kontak darurat resmi di bawah ini untuk memudahkan koordinasi dan keselamatan Anda selama di area tambang.
                          </p>
                        </div>
                      </div>

                      {/* Contacts list */}
                      <div className="mt-4 space-y-1.5 pt-3 border-t border-slate-850 text-[10px]">
                        <span className="font-bold text-[#E85A1B] text-[9.5px] uppercase tracking-wider block mb-1 font-mono">EMERGENCY PHONE LISTS:</span>
                        <div className="flex justify-between font-mono"><span className="text-slate-400 font-medium font-mono">HSE Hot Line:</span><span className="text-[#E85A1B] select-all font-bold font-mono">+62 859-2442-7507</span></div>
                        <div className="flex justify-between font-mono"><span className="text-slate-400 font-medium font-mono">HRD GA Desk:</span><span className="text-[#E85A1B] select-all font-bold font-mono">+62 822-1819-4422</span></div>
                        <div className="flex justify-between font-mono"><span className="text-slate-400 font-medium font-mono">Pakar Pertambangan:</span><span className="text-[#E85A1B] select-all font-bold font-mono">+62 852-1515-4042</span></div>
                        <div className="flex justify-between font-mono"><span className="text-slate-400">Emergency Center:</span><span className="text-white select-all font-semibold font-mono">+62 811-1234-911</span></div>
                        <div className="flex justify-between font-mono"><span className="text-slate-400">Rescue Fire Desk:</span><span className="text-white select-all font-semibold font-mono">+62 811-1234-912</span></div>
                        <div className="flex justify-between font-mono"><span className="text-slate-400">Main Security:</span><span className="text-white select-all font-semibold font-mono">+62 811-1234-915</span></div>
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* --- SECTION 5: SAFETY QUIZ --- */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  
                  <div className="border-b border-slate-850 pb-3">
                    <h2 className="text-xl font-display font-black tracking-tight text-white uppercase flex items-center gap-1.5">
                      <ClipboardCheck className="w-5 h-5 text-[#E85A1B]" />
                      SECTION 5: EVALUASI SAFETIES INDUCTION (MINIMAL 80%)
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Ujian kepatuhan K3LH mandiri terdiri atas 10 soal pilihan berganda. Nilai kelulusan minimal adalah 80% (Benar minimal 8 soal).
                    </p>
                  </div>

                  {/* Quiz results status overview if done */}
                  {quizResult && (
                    <div className={`p-4 rounded-xl border flex items-start gap-3 select-none ${
                      quizResult === 'LULUS'
                        ? 'bg-green-950/40 border-green-500/30 text-green-400'
                        : 'bg-red-950/40 border-red-500/30 text-rose-400'
                    }`}>
                      <FileCheck className="w-8 h-8 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-black uppercase font-mono tracking-widest block">
                          HASIL PENILAIAN UJIAN K3: Score {quizScore}%
                        </span>
                        <p className="text-xs leading-normal mt-1 text-slate-300 font-medium">
                          {quizAlertMessage}
                        </p>
                        {quizResult === 'GAGAL' && (
                          <button
                            type="button"
                            onClick={() => {
                              setQuizAnswers({});
                              setQuizResult(null);
                            }}
                            className="bg-red-650 hover:bg-red-550 text-white font-extrabold px-4 py-1.5 rounded text-[11px] mt-3 uppercase tracking-wider transition-all cursor-pointer inline-block"
                          >
                            Ulangi Safety Induction
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 10 Core Questions Loop */}
                  {!quizResult && (
                    <div className="space-y-6">
                      {SAFETY_QUIZ_QUESTIONS.map((q, qIdx) => (
                        <div key={q.id} className="bg-slate-950 p-4.5 rounded-xl border border-slate-850 text-left">
                          <span className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-widest block mb-1">PERTANYAAN {qIdx + 1}</span>
                          <h4 className="text-xs leading-relaxed font-bold text-white mb-3">
                            {q.question}
                          </h4>
                          
                          <div className="space-y-2 text-xs">
                            {q.options.map((opt, optIdx) => (
                              <label
                                key={optIdx}
                                className={`flex items-start gap-3 p-3.5 rounded-lg border transition-all cursor-pointer ${
                                  quizAnswers[qIdx] === optIdx
                                    ? 'bg-[#E85A1B]/15 border-[#E85A1B] text-slate-200'
                                    : 'bg-slate-900 border-slate-850 text-slate-400 hover:border-slate-805 hover:bg-slate-850/50'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`question-${qIdx}`}
                                  checked={quizAnswers[qIdx] === optIdx}
                                  onChange={() => setQuizAnswers(prev => ({ ...prev, [qIdx]: optIdx }))}
                                  className="w-4 h-4 text-[#E85A1B] focus:ring-[#E85A1B] border-slate-700 bg-slate-900 mt-0.5 shrink-0"
                                />
                                <span className="leading-snug">{opt}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}

                      {/* Evaluate trigger button */}
                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          disabled={Object.keys(quizAnswers).length < SAFETY_QUIZ_QUESTIONS.length}
                          onClick={evaluateQuiz}
                          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer"
                        >
                          <FileCheck className="w-5 h-5" />
                          Evaluasi & Koreksi Jawaban
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* --- SECTION 6: PERNYATAAN PESERTA --- */}
              {currentStep === 6 && (
                <div className="space-y-6">
                  
                  <div className="border-b border-slate-850 pb-3">
                    <h2 className="text-xl font-display font-black tracking-tight text-white uppercase flex items-center gap-2">
                      <HeartHandshake className="w-5 h-5 text-[#E85A1B]" />
                      SECTION 6: PERNYATAAN & KOMITMEN KEPATUHAN TAMU (K3)
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Deklarasikan komitmen penuh Anda dalam menjaga keselamatan bersama sebelum memperoleh izin masuk lapangan.
                    </p>
                  </div>

                  {/* Statement box */}
                  <div className="bg-slate-950 border border-slate-850 p-6 rounded-2xl relative text-left">
                    <div className="absolute top-2 right-3 border border-slate-800 bg-slate-900 font-mono text-[9px] px-1.5 py-0.5 rounded text-slate-500 uppercase">
                      Code of miners conduct
                    </div>
                    
                    <h4 className="text-sm font-extrabold text-[#E85A1B] uppercase tracking-wide mb-3">MATRIKS TATA TERTIB UTAMA PESERTA KUNJUNGAN:</h4>
                    
                    <p className="text-slate-300 text-xs leading-relaxed mb-4">
                      Saya secara sadar menyatakan bahwa seluruh materi orientasi induksi K3 PT. WPA telah saya baca, pahami, dan kuasai sepenuhnya. Saya mengikatkan diri dengan kerangka peraturan keselamatan pertambangan, penggunaan APD yang benar, kepatuhan batas kecepatan, serta kesediaan dievakuasi di bawah komando tim ERT jika terjadi bencana darurat lapangan.
                    </p>

                    <label className="flex items-start gap-3 p-4 bg-slate-900 border border-slate-850 rounded-xl transition-colors cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={statementAccepted}
                        onChange={() => setStatementAccepted(!statementAccepted)}
                        className="w-5 h-5 text-[#E85A1B] focus:ring-[#E85A1B] border-slate-800 bg-slate-950 mt-0.5 shrink-0 rounded"
                      />
                      <span className="text-xs font-bold text-white leading-normal">
                        "Saya telah memahami seluruh materi keselamatan dan bersedia mematuhi seluruh peraturan perusahaan PT. Watu Perkasa Abadi secara mutlak."
                      </span>
                    </label>
                  </div>

                </div>
              )}

              {/* --- SECTION 7: TANDA TANGAN DIGITAL SIGNATURE --- */}
              {currentStep === 7 && (
                <div className="space-y-6">
                  
                  <div className="border-b border-slate-850 pb-3">
                    <h2 className="text-xl font-display font-black tracking-tight text-white uppercase">
                      SECTION 7: TANDA TANGAN DIGITAL VALIDATOR SECURE
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Bubuhkan tanda tangan basah digital Anda pada signature pad sebagai arsip keandalan hukum.
                    </p>
                  </div>

                  {/* SIGNATURE PAD INSTANCE INJECTION */}
                  <SignatureCanvas
                    fullName={fullName}
                    onSave={(sigBase64, gps) => {
                      setSignature(sigBase64);
                      setGpsLocation(gps);
                    }}
                    savedSignature={signature}
                  />

                  {/* Submit System Action Widget */}
                  <div className="pt-4 border-t border-slate-850">
                    <button
                      onClick={handleSubmitRegistration}
                      disabled={isSubmitting || !signature || !statementAccepted}
                      type="button"
                      className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-extrabold py-4 rounded-xl shadow-xl transition-all uppercase tracking-wide flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          Memproses Pengajuan K3...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5 animate-bounce" />
                          Kirim Pengajuan Buku Tamu & E-Induksi Now (Submit)
                        </>
                      )}
                    </button>
                    {isSubmitting && (
                      <p className="text-xs text-emerald-400 font-mono mt-3 animate-pulse text-center">
                        {submitProgress}
                      </p>
                    )}
                  </div>

                </div>
              )}

              {/* ================= STEPPER CONTROL ROW ================= */}
              <div className="mt-8 pt-5 border-t border-slate-850 flex items-center justify-between no-print">
                <button
                  type="button"
                  disabled={currentStep === 1}
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  className="bg-slate-900 border border-slate-800 disabled:opacity-30 hover:bg-slate-850 text-slate-350 hover:text-white px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  KEMBALI
                </button>

                {currentStep < 7 ? (
                  <button
                    type="button"
                    // Step progress blocking logic based on validations
                    disabled={
                      (currentStep === 1 && (!fullName || !company || !position || !phone || !ktpNumber || !email || !photo)) ||
                      (currentStep === 2 && (!picName || !activityDescription)) ||
                      (currentStep === 3 && !isPpeComplete) ||
                      (currentStep === 5 && quizResult !== 'LULUS') ||
                      (currentStep === 6 && !statementAccepted)
                    }
                    onClick={() => setCurrentStep(prev => prev + 1)}
                    className="bg-[#E85A1B] disabled:opacity-30 hover:bg-[#E85A1B]/90 text-white font-extrabold px-6 py-2 rounded-lg text-xs tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    LANJUTKAN
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <span className="text-xs text-emerald-400 font-bold font-mono tracking-wide flex items-center gap-1">
                    <Check className="w-4 h-4 bg-emerald-950 border border-emerald-500 rounded-full" />
                    Validasi Lengkap
                  </span>
                )}
              </div>

            </div>
          </div>
        )}

        {/* VIEW 3: SUCCESS AND INDUCTION OK BADGE PAGE */}
        {viewMode === 'SUCCESS' && recentRecord && (
          <SuccessPage
            record={recentRecord}
            onReset={() => {
              resetWizardInputs();
              setViewMode('WIZARD');
            }}
            onNavigateToDashboard={() => {
              setViewMode('DASHBOARD');
            }}
          />
        )}

        {/* VIEW 4: SEURE HSE CONTROLLER DASHBOARD BOARD */}
        {viewMode === 'DASHBOARD' && (
          <HseDashboard
            records={records}
            securityLogs={securityLogs}
            onDeleteRecord={handleDeleteRecord}
            onClearAllRecords={handleClearAllDb}
            onRestoreBackup={handleRestoreFromBackup}
            onCheckoutGuest={handleCheckoutGuest}
            onUpdateRecord={handleUpdateRecord}
          />
        )}

      </main>

      {/* ================= REAL-TIME FLOATING ALERT NOTIFICATION SYSTEM ================= */}
      {notifications.length > 0 && (
        <div className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full space-y-3 no-print">
          <div className="flex items-center justify-between bg-[#0B1E36] border border-slate-700/60 px-4 py-2 rounded-t-xl text-xs font-mono font-bold tracking-wider text-slate-300 shadow-md">
            <span className="flex items-center gap-1.5 text-orange-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
              </span>
              MONITOR REAL-TIME AKTIF
            </span>
            <button 
              onClick={() => setNotifications([])} 
              className="text-slate-400 hover:text-white text-[10px] transition-colors cursor-pointer"
            >
              BERSIHKAN ALL
            </button>
          </div>
          <div className="space-y-2 bg-[#081525]/95 border-x border-b border-slate-800 rounded-b-xl p-3 shadow-2xl max-h-[350px] overflow-y-auto">
            {notifications.map((notif) => {
              // Custom styles & icons based on type
              let IconComp = Bell;
              let iconColor = 'text-blue-400';
              let bgColor = 'bg-blue-950/45 border-blue-500/20';
              let badgeText = 'SYSTEM';

              if (notif.type === 'TAMU_DRAFT') {
                IconComp = ClipboardCheck;
                iconColor = 'text-amber-400';
                bgColor = 'bg-amber-950/40 border-amber-500/20';
                badgeText = 'SEDANG MENGISI';
              } else if (notif.type === 'TAMU_BARU') {
                IconComp = UserPlus;
                iconColor = 'text-emerald-400';
                bgColor = 'bg-emerald-950/40 border-emerald-500/20';
                badgeText = 'TAMU MASUK';
              } else if (notif.type === 'TAMU_SELESAI') {
                IconComp = Shield;
                iconColor = 'text-teal-400';
                bgColor = 'bg-teal-950/40 border-teal-500/20';
                badgeText = 'LULUS K3';
              } else if (notif.type === 'TAMU_CHECKOUT') {
                IconComp = LogOut;
                iconColor = 'text-rose-400';
                bgColor = 'bg-rose-950/40 border-rose-500/20';
                badgeText = 'CHECKOUT';
              }

              return (
                <div 
                  key={notif.id} 
                  className={`p-3.5 rounded-lg border flex items-start gap-3 transition-all hover:scale-[1.01] ${bgColor}`}
                >
                  <div className={`p-2 rounded-lg bg-slate-900 border border-slate-800 mt-0.5 shrink-0 ${iconColor}`}>
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div className="flex-grow min-w-0 text-left">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono text-[9px] font-bold bg-slate-900 border border-slate-800 text-slate-400 px-1.5 py-0.5 rounded tracking-wider uppercase">
                        {badgeText}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400">
                        {notif.timestamp}
                      </span>
                    </div>
                    <p className="text-xs font-semibold leading-normal text-slate-200">
                      {notif.message}
                    </p>
                  </div>
                  <button 
                    onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
                    className="text-slate-500 hover:text-slate-200 p-0.5 mt-0.5 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= GLOBAL FOOTER COMPANY TAGS ================= */}
      <footer className="bg-[#07101C] border-t border-slate-900/60 py-4 px-6 text-center text-[10.5px] text-slate-550 select-none font-mono tracking-widest no-print">
        &copy; {new Date().getFullYear()} PT. WATU PERKASA ABADI. ALL RIGHTS RESERVED &bull; INTEGRATED DIGITAL MINING SAFETY SYSTEMS (K3) &bull; PORT 3000 SYSTEM STATUS: SECURE
      </footer>

    </div>
  );
}
