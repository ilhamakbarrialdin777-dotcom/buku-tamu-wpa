import QRCode from 'qrcode';
import { GuestRecord, SecurityLog } from './types';

// Standardized registration numbers: REG-YYYYMMDD-XXX
export function generateRegistrationId(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randNum = Math.floor(100 + Math.random() * 900); // 3 digit
  return `REG-${dateStr}-${randNum}`;
}

// Generate QR Code as Base64 Data URL
export async function generateQrCodeUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 200,
      margin: 1,
      color: {
        dark: '#0A1628', // Dark deep navy
        light: '#FFFFFF'
      }
    });
  } catch (err) {
    console.error('Failed to generate QR Code:', err);
    return '';
  }
}

// Export to CSV/Excel Helper
export function exportToCsv(records: GuestRecord[]): void {
  const headers = [
    'ID Registrasi',
    'Nama Lengkap',
    'Perusahaan',
    'Jabatan',
    'Email',
    'No HP',
    'No KTP',
    'Gender',
    'Tanggal Kunjungan',
    'Jam Masuk',
    'Jam Keluar',
    'Tujuan',
    'PIC',
    'Departemen PIC',
    'Lokasi Area',
    'Keterangan',
    'Status APD',
    'Nilai Induksi (%)',
    'Status Kelulusan',
    'Tanda Tangan',
    'Ambang Batas Nilai',
    'Lokasi GPS'
  ];

  const rows = records.map(r => {
    const gpsInfo = r.gpsLocation 
      ? `Lat: ${r.gpsLocation.latitude.toFixed(5)}, Lng: ${r.gpsLocation.longitude.toFixed(5)}`
      : 'Tidak Diizinkan';
      
    const ppeStatus = r.isPpeComplete ? 'LENGKAP' : 'TIDAK LENGKAP';
    
    return [
      r.id,
      r.fullName.replace(/"/g, '""'),
      r.company.replace(/"/g, '""'),
      r.position.replace(/"/g, '""'),
      r.email,
      r.phone,
      `'${r.ktpNumber}`, // Prepend apostrophe to prevent Excel from scientific notation
      r.gender,
      r.visitDate,
      r.entryTime,
      r.exitTime,
      r.visitPurpose,
      r.picName.replace(/"/g, '""'),
      r.picDepartment,
      r.picLocation,
      r.activityDescription.replace(/"/g, '""'),
      ppeStatus,
      `${r.quizScore}%`,
      r.quizResult,
      r.signature ? 'Signed' : 'Not Signed',
      '80%',
      gpsInfo
    ];
  });

  // Create CSV String. Use semicolon for Indonesian regional Excel compatibility, or typical comma.
  // We prepend the UTF-8 Byte Order Mark (BOM) to force Excel to read UTF-8 characters correctly (especially accents or special symbols).
  const csvContent = "\uFEFF" + [
    headers.join(','),
    ...rows.map(e => e.map(val => `"${String(val).replace(/\n/g, ' ')}"`).join(','))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `REKAP_KUNJUNGAN_E_INDUKSI_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Security logging helper
export function logSecurityAction(
  action: string,
  userRole: string,
  details: string
): SecurityLog {
  return {
    id: `LOG-${Math.floor(100000 + Math.random() * 900000)}`,
    timestamp: new Date().toLocaleString('id-ID'),
    userRole,
    action,
    details
  };
}

// Generate static sample data for realistic dashboard reporting
export const INITIAL_GUEST_RECORDS: GuestRecord[] = [
  {
    id: "REG-20260615-108",
    fullName: "Budi Santoso",
    company: "PT. United Tractors Tbk",
    position: "Service Engineer",
    phone: "081234567890",
    ktpNumber: "3273012345670001",
    address: "Jl. Mulawarman No. 45, Balikpapan",
    email: "budi.santoso@unitedtractors.com",
    gender: "Laki-laki",
    visitDate: "2026-06-15",
    entryTime: "08:00",
    exitTime: "17:00",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120",
    visitPurpose: "Vendor",
    picName: "Yudi Pratama",
    picDepartment: "Plant & Maintenance",
    picLocation: "Workshop & Warehouse",
    activityDescription: "Overhaul Hydraulic System Dump Truck Komatsu 785",
    ppeChecklist: {
      safetyHelmet: true,
      safetyShoes: true,
      safetyVest: true,
      safetyGlasses: true,
      gloves: true,
      mask: true,
      earPlug: true,
      fullBodyHarness: false
    },
    isPpeComplete: true,
    quizAnswers: {},
    quizScore: 90,
    quizResult: "LULUS",
    statementAccepted: true,
    signature: "MOCK_SIGNATURE_DATA",
    signatureName: "Budi Santoso",
    signatureDate: "2026-06-15",
    signatureTime: "07:45",
    gpsLocation: { latitude: -2.34567, longitude: 115.67891, accuracy: 5, error: null },
    createdAt: "2026-06-15T07:45:00.000Z"
  },
  {
    id: "REG-20260615-204",
    fullName: "Sarah Wijaya",
    company: "Kementerian ESDM RI",
    position: "Inspektur Tambang Pratama",
    phone: "085211223344",
    ktpNumber: "3171012345670005",
    address: "Jl. Merdeka Selatan No. 18, Jakarta",
    email: "sarah.wijaya@esdm.go.id",
    gender: "Perempuan",
    visitDate: "2026-06-15",
    entryTime: "09:30",
    exitTime: "15:00",
    photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120",
    visitPurpose: "Pemerintah",
    picName: "Arif Rahcmand",
    picDepartment: "HSE (Health, Safety, Environment)",
    picLocation: "Pit Area / Front Tambang",
    activityDescription: "Inspeksi Kepatuhan K3LH dan Pengawasan Lereng Tambang",
    ppeChecklist: {
      safetyHelmet: true,
      safetyShoes: true,
      safetyVest: true,
      safetyGlasses: true,
      gloves: true,
      mask: true,
      earPlug: false,
      fullBodyHarness: false
    },
    isPpeComplete: true,
    quizAnswers: {},
    quizScore: 100,
    quizResult: "LULUS",
    statementAccepted: true,
    signature: "MOCK_SIGNATURE_DATA",
    signatureName: "Sarah Wijaya",
    signatureDate: "2026-06-15",
    signatureTime: "09:12",
    gpsLocation: { latitude: -2.34591, longitude: 115.67845, accuracy: 6, error: null },
    createdAt: "2026-06-15T09:12:00.000Z"
  },
  {
    id: "REG-20260616-012",
    fullName: "Ahmad Hidayat",
    company: "PT. Surveyor Indonesia",
    position: "Senior Auditor K3",
    phone: "081199887766",
    ktpNumber: "3201012345670002",
    address: "Kav 56 Jl. Gatot Subroto, Jakarta",
    email: "ahmad.hidayat@surveyor.id",
    gender: "Laki-laki",
    visitDate: "2026-06-16",
    entryTime: "10:00",
    exitTime: "16:00",
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120",
    visitPurpose: "Audit",
    picName: "Arif Rahcmand",
    picDepartment: "HSE (Health, Safety, Environment)",
    picLocation: "Main Office / Kantor Pusat",
    activityDescription: "Surveillance Audit Sertifikasi SMK3 Tambang Tahap II",
    ppeChecklist: {
      safetyHelmet: true,
      safetyShoes: true,
      safetyVest: true,
      safetyGlasses: true,
      gloves: false,
      mask: false,
      earPlug: false,
      fullBodyHarness: false
    },
    isPpeComplete: true,
    quizAnswers: {},
    quizScore: 90,
    quizResult: "LULUS",
    statementAccepted: true,
    signature: "MOCK_SIGNATURE_DATA",
    signatureName: "Ahmad Hidayat",
    signatureDate: "2026-06-16",
    signatureTime: "09:41",
    gpsLocation: { latitude: -2.34567, longitude: 115.67891, accuracy: 4, error: null },
    createdAt: "2026-06-16T09:41:00.000Z"
  },
  {
    id: "REG-20260616-044",
    fullName: "Hendrik Wijaya",
    company: "PT. Hexindo Adiperkasa Kaltim",
    position: "Sales Representative",
    phone: "081345671122",
    ktpNumber: "6471012345670004",
    address: "Sepinggan Pratama Blok G/12, Balikpapan",
    email: "hendrik@hexindo-adp.co.id",
    gender: "Laki-laki",
    visitDate: "2026-06-16",
    entryTime: "13:00",
    exitTime: "15:30",
    photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=120",
    visitPurpose: "Meeting",
    picName: "Yudi Pratama",
    picDepartment: "Plant & Maintenance",
    picLocation: "Main Office / Kantor Pusat",
    activityDescription: "Presentasi Proposal Preventive Maintenance Excavator EX1200",
    ppeChecklist: {
      safetyHelmet: true,
      safetyShoes: true,
      safetyVest: true,
      safetyGlasses: false,
      gloves: false,
      mask: false,
      earPlug: false,
      fullBodyHarness: false
    },
    isPpeComplete: true,
    quizAnswers: {},
    quizScore: 60, // GAGAL karena tidak membaca induction dengan baik pada uji coba pertamanya
    quizResult: "GAGAL",
    statementAccepted: true,
    signature: "MOCK_SIGNATURE_DATA",
    signatureName: "Hendrik Wijaya",
    signatureDate: "2026-06-16",
    signatureTime: "12:45",
    gpsLocation: { latitude: -2.34567, longitude: 115.67891, accuracy: 5, error: null },
    createdAt: "2026-06-16T12:45:00.000Z"
  },
  {
    id: "REG-20260616-077",
    fullName: "Rudi Hermawan",
    company: "CV. Borneo Trans Logistik",
    position: "Driver Trailer",
    phone: "082155443322",
    ktpNumber: "6303012345670002",
    address: "Jl. Yani KM 5, Banjarmasin",
    email: "rudi.hermawan@borneotrans.com",
    gender: "Laki-laki",
    visitDate: "2026-06-16",
    entryTime: "14:00",
    exitTime: "18:00",
    photo: null,
    visitPurpose: "Pengiriman Barang",
    picName: "Arif Rahcmand",
    picDepartment: "Mining Operation",
    picLocation: "ROM Stockpile Area",
    activityDescription: "Mobilisasi sparepart dumpbody dari Workshop Balikpapan",
    ppeChecklist: {
      safetyHelmet: true,
      safetyShoes: true,
      safetyVest: true,
      safetyGlasses: true,
      gloves: true,
      mask: true,
      earPlug: false,
      fullBodyHarness: false
    },
    isPpeComplete: true,
    quizAnswers: {},
    quizScore: 80,
    quizResult: "LULUS",
    statementAccepted: true,
    signature: "MOCK_SIGNATURE_DATA",
    signatureName: "Rudi Hermawan",
    signatureDate: "2026-06-16",
    signatureTime: "13:50",
    gpsLocation: { latitude: -2.34512, longitude: 115.67899, accuracy: 12, error: null },
    createdAt: "2026-06-16T13:50:00.000Z"
  }
];

export const INITIAL_SECURITY_LOGS: SecurityLog[] = [
  {
    id: "LOG-000001",
    timestamp: "16-06-2026 08:30:11",
    userRole: "SECURITY",
    action: "LOGIN",
    details: "Petugas Pos Utama login ke Dashboard Monitoring HSE menggunakan PIN"
  },
  {
    id: "LOG-000002",
    timestamp: "16-06-2026 09:41:00",
    userRole: "VISITOR",
    action: "REGISTRATION_SUBMIT",
    details: "Induksi Berhasil: Ahmad Hidayat (PT. Surveyor Indonesia) mendaftar dengan nilai 90% (LULUS)"
  },
  {
    id: "LOG-000003",
    timestamp: "16-06-2026 12:45:00",
    userRole: "VISITOR",
    action: "REGISTRATION_FAIL",
    details: "Induksi Gagal: Hendrik Wijaya (PT. Hexindo Adiperkasa) memperoleh nilai 60% (GAGAL)"
  },
  {
    id: "LOG-000004",
    timestamp: "16-06-2026 13:50:15",
    userRole: "VISITOR",
    action: "REGISTRATION_SUBMIT",
    details: "Induksi Berhasil: Rudi Hermawan (CV. Borneo Trans) mendaftar dengan nilai 80% (LULUS)"
  },
  {
    id: "LOG-000005",
    timestamp: "16-06-2026 15:40:22",
    userRole: "HSE_OFFICER",
    action: "DATA_EXPORT",
    details: "HSE Supervisor melakukan ekspor rekapitulasi data kunjungan ke format Excel"
  }
];
