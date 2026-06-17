import { QuizQuestion } from './types';

export const SAFETY_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: "Apa warna helm keselamatan (Safety Helmet) standard yang wajib digunakan oleh Pengunjung / Tamu (Visitor) di area tambang PT. Watu Perkasa Abadi?",
    options: [
      "Kuning (untuk Pekerja Umum / Operator)",
      "Merah (untuk Safety Officer / Pemadam Kebakaran)",
      "Putih (untuk Tamu, Staff Kantor, atau Management)",
      "Biru (untuk Pekerja Kelistrikan / Supervisor)"
    ],
    correctAnswerIndex: 2,
    explanation: "Helm warna putih digunakan untuk tamu, pengawas tamu, staff kantor, atau perwakilan management guna identifikasi cepat pihak eksternal."
  },
  {
    id: 2,
    question: "Berapakah batas kecepatan maksimal (Maximum Speed) kendaraan ringan (LV) yang diizinkan saat melintasi Hauling Road atau area aktif tambang?",
    options: [
      "10 KM/JAM",
      "20 KM/JAM",
      "30 KM/JAM",
      "50 KM/JAM"
    ],
    correctAnswerIndex: 2,
    explanation: "Batas kecepatan maksimal di area aktif pertambangan adalah 30 KM/JAM (30 KM/H) demi mencegah kecelakaan tabrakan atau hilangnya kendali kendaraan."
  },
  {
    id: 3,
    question: "Apakah yang dimaksud dengan istilah 'Blind Spot' pada alat-alat berat tambang (seperti Dump Truck Caterpillar/Komatsu)?",
    options: [
      "Area bebas hambatan di sekitar alat berat",
      "Lampu sorot utama alat berat saat malam hari",
      "Area di sekitar alat berat di mana sudut pandang operator terhalang (tidak terlihat sama sekali)",
      "Kamera pemantau posisi belakang truk raksasa"
    ],
    correctAnswerIndex: 2,
    explanation: "Blind spot adalah area sekeliling alat berat yang tidak dapat dilihat langsung oleh operator demi keselamatan, pastikan Anda berada jauh dari zona ini."
  },
  {
    id: 4,
    question: "Tindakan wajib apa yang harus dilakukan sebelum Anda memasuki zona aktif operasional tambang terkait penggunaan APD?",
    options: [
      "APD baru dipakai ketika mendekati alat berat saja",
      "APD wajib dipakai secara lengkap dan benar (Helm, Sepatu Safety, & Rompi Reflektif) sejak melewati Pos Utama / Gate terdepan",
      "Boleh tidak mengenakan APD jika hanya berada di dalam kendaraan tertutup",
      "Cukup membawa helm tanpa perlu dipakai di kepala"
    ],
    correctAnswerIndex: 1,
    explanation: "Semua personel tanpa kecuali wajib menggunakan APD lengkap (Helm, Sepatu Safety, Rompi Reflektif) sejak memasuki gerbang tambang."
  },
  {
    id: 5,
    question: "Bagaimanakah prosedur mendahului (overtaking) alat berat yang aman di jalan tambang (Hauling Road)?",
    options: [
      "Langsung klakson panjang dan mendahului seketika dari sisi kiri",
      "Menyalip dengan sangat cepat dari sebelah kanan tanpa memberi aba-aba",
      "Membangun komunikasi dua arah via radio (Radio Check) dan mendahului setelah mendapat izin eksplisit serta konfirmasi visual dari operator alat berat tersebut",
      "Membuntuti dengan jarak di bawah 2 meter agar operator menyadari keberadaan kita"
    ],
    correctAnswerIndex: 2,
    explanation: "Komunikasi radio dua arah sangat krusial di jalur hauling tambang untuk meminta izin menyalip guna menghindari tabrakan akibat blind spot."
  },
  {
    id: 6,
    question: "Apabila sirine tanda darurat (Emergency Alarm) berbunyi terus-menerus di area operasional tambang, apakah tindakan pertama Anda yang benar?",
    options: [
      "Mengambil dokumentasi foto dan video untuk dilunaskan ke tim HSE",
      "Hentikan semua aktivitas pekerjaan, tetap tenang, dan segera evakuasi menuju ke Muster Point (Titik Kumpul) terdekat sesuai petunjuk jalur evakuasi",
      "Segera pulang ke rumah masing-masing menggunakan rute pribadi",
      "Menghampiri pusat sirine untuk mengetahui kerusakan apa yang terjadi"
    ],
    correctAnswerIndex: 1,
    explanation: "Muster Point (Titik Kumpul) adalah tujuan evakuasi aman tunggal saat sirine darurat diaktifkan. Jangan panik, lari, atau mengambil foto."
  },
  {
    id: 7,
    question: "Mengapa penggunaan Rompi Keselamatan Reflektif (Safety Vest) wajib dikenakan oleh siapa pun di area pertambangan aktif?",
    options: [
      "Sebagai tanda pengenal pangkat atau jabatan pengunjung",
      "Untuk melindungi tubuh dari terpaan debu dan hujan deras",
      "Agar tubuh mudah terlihat oleh operator alat berat dan kendaraan lain secara visual jarak jauh, terutama saat minim cahaya atau berkabut",
      "Untuk memenuhi nilai estetika dan keseragaman fashion pertambangan"
    ],
    correctAnswerIndex: 2,
    explanation: "Reflektor pada safety vest memantulkan cahaya kendaraan secara efektif, sehingga menyelamatkan jiwa dengan memastikan Anda terlihat jelas di area gelap/berdebu."
  },
  {
    id: 8,
    question: "Siapakah satu-satunya pihak yang berwenang memasang dan melepaskan sistem penguncian LOTO (Lock Out Tag Out) pada peralatan di tambang?",
    options: [
      "Semua pengunjung atau tamu yang melihat kendala mesin",
      "Pengawas K3 / HSE secara sepihak tanpa memberitahu operator",
      "Pekerja bersertifikasi dan berwenang yang bertugas langsung melakukan servis pada unit tersebut (pemilik gembok keselamatan)",
      "Petugas keamanan (Security Guard) yang berjaga di gerbang terdekat"
    ],
    correctAnswerIndex: 2,
    explanation: "Sistem LOTO hanya boleh dikelola oleh teknisi authorized dan kompeten yang melakukan perbaikan langsung di bawah gembok pengunci fisik mereka."
  },
  {
    id: 9,
    question: "Di area operasional tambang, manakah lokasi yang diperbolehkan untuk merokok?",
    options: [
      "Di dalam kabin unit alat berat tertutup",
      "Di mana saja selama rekan kerja di samping mengizinkan",
      "Hanya di area khusus berlabel resmi 'SMOKING AREA' yang dilengkapi asbak dan fasilitas pemadam api portable",
      "Di bengkel perbaikan (Workshop) di dekat genangan oli"
    ],
    correctAnswerIndex: 2,
    explanation: "Merokok dilarang keras di wilayah tambang kecuali di area merokok resmi yang terisolasi dari material mudah terbakar atau berledak."
  },
  {
    id: 10,
    question: "Berapakah jarak aman minimal (Safe Distance) yang harus dijaga kendaraan ringan (LV) saat berkendara di belakang Dump Truck bermuatan besar di jalan tambang?",
    options: [
      "Minimal 5 meter",
      "Minimal 15 meter",
      "Minimal 30 meter - 50 meter",
      "Minimal 2 meter"
    ],
    correctAnswerIndex: 2,
    explanation: "Menjaga jarak aman minimal 30 meter hingga 50 meter krusial karena debu tebal, potensi material jatuh dari bak belakang, dan waktu reaksi rem dump truck."
  }
];

export const VISIT_PURPOSE_OPTIONS = [
  { value: 'Meeting', label: 'Rapat / Meeting Dinas' },
  { value: 'Audit', label: 'Audit Kepatuhan / QHSE' },
  { value: 'Inspeksi', label: 'Inspeksi K3 / Lapangan' },
  { value: 'Vendor', label: 'Vendor / Demo Alat' },
  { value: 'Pengiriman Barang', label: 'Pengiriman Logistik / Barang' },
  { value: 'Survey', label: 'Survey Kelayakan / Geologi' },
  { value: 'Pemerintah', label: 'Kunjungan Dinas Pemerintah / ESDM' },
  { value: 'Lainnya', label: 'Lain-lain / Keperluan Lainnya' }
];

export const DEPARTMENTS = [
  'HSE (Health, Safety, Environment)',
  'Mining Operation',
  'Engineering & Surveying',
  'Production & Hauling',
  'Plant & Maintenance',
  'External Relations & CSR',
  'HRD & General Affairs',
  'Security & Emergency Response Team',
  'Finance & Accounting',
  'Information Technology & Digitalization'
];

export const LOCATIONS = [
  'Area OFFICE JUBA',
  'Pit KSS',
  'Pit JUBA 2',
  'Area Crushing KSS',
  'Area Crushing JUBA 2',
  'Area Crushing DJP',
  'Hauling Road Corridor',
  'Workshop & Warehouse',
  'ROM Stockpile Area',
  'Port / Jetty Loading Area',
  'Water Treatment Facility'
];

export const EMERGENCY_CONTACTS = {
  emergencyNumber: "+62 811-1234-911 (Emergency Center)",
  fireTeam: "+62 811-1234-912 (Rescue & Fire Desk)",
  hseOfficer: "+62 859-2442-7507 (HSE Hot Line)",
  hrdOfficer: "+62 822-1819-4422 (HRD GA Desk)",
  miningExpert: "+62 852-1515-4042 (Mining Expert)",
  clinic: "+62 811-1234-914 (Mine Clinic 24/7)",
  security: "+62 811-1234-915 (Main Security Gate)"
};
