export interface GuestRecord {
  id: string; // REG-YYYYMMDD-XXX
  fullName: string;
  company: string;
  position: string;
  phone: string;
  ktpNumber: string;
  address: string;
  email: string;
  gender: 'Laki-laki' | 'Perempuan';
  visitDate: string;
  entryTime: string;
  exitTime: string;
  photo: string | null; // Base64 data URL
  
  // Tujuan Kunjungan
  visitPurpose: 'Meeting' | 'Audit' | 'Inspeksi' | 'Vendor' | 'Pengiriman Barang' | 'Survey' | 'Pemerintah' | 'Lainnya';
  picName: string;
  picDepartment: string;
  picLocation: string;
  activityDescription: string;
  
  // Pemeriksaan APD
  ppeChecklist: {
    safetyHelmet: boolean;
    safetyShoes: boolean;
    safetyVest: boolean;
    safetyGlasses: boolean;
    gloves: boolean;
    mask: boolean;
    earPlug: boolean;
    fullBodyHarness: boolean;
  };
  isPpeComplete: boolean;

  // Quiz
  quizAnswers: Record<number, number>; // questionIndex -> selectedOptionIndex
  quizScore: number;
  quizResult: 'LULUS' | 'GAGAL';
  
  // Pernyataan & Tanda Tangan
  statementAccepted: boolean;
  signature: string | null; // Base64 Canvas Data URL
  signatureName: string;
  signatureDate: string;
  signatureTime: string;
  gpsLocation: {
    latitude: number;
    longitude: number;
    accuracy: number;
    error: string | null;
  } | null;

  // State metadata
  createdAt: string;
}

export interface SecurityLog {
  id: string;
  timestamp: string;
  userRole: string;
  action: string;
  details: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}
