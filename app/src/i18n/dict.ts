/**
 * Flat bn/en string dictionary. Bangla-first: `bn` is always the first key
 * written and read; `en` is the toggle target. No i18n framework — just a
 * lookup table consumed through `useI18n()` (./index.ts).
 */
export type Entry = { bn: string; en: string };

export const dict = {
  // Shell
  appName: { bn: 'সেতু', en: 'Setu' },
  appTagline: { bn: 'সংকটে যোগাযোগের সেতু', en: 'A bridge for crisis communication' },
  cancel: { bn: 'বাতিল', en: 'Cancel' },
  save: { bn: 'সংরক্ষণ করুন', en: 'Save' },
  send: { bn: 'পাঠান', en: 'Send' },
  close: { bn: 'বন্ধ করুন', en: 'Close' },
  search: { bn: 'খুঁজুন', en: 'Search' },

  // Tab bar
  tabHome: { bn: 'হোম', en: 'Home' },
  tabBoard: { bn: 'বোর্ড', en: 'Board' },
  tabMap: { bn: 'ম্যাপ', en: 'Map' },
  tabSync: { bn: 'সিঙ্ক', en: 'Sync' },
  tabInfo: { bn: 'তথ্য', en: 'Info' },

  // Onboarding
  onboardTitle: { bn: 'সেতুতে স্বাগতম', en: 'Welcome to Setu' },
  onboardSubtitle: {
    bn: 'বিপর্যয়ের সময় নিরাপদ থাকুন ও যোগাযোগ রাখুন — ইন্টারনেট ছাড়াও।',
    en: 'Stay safe and connected during a crisis — even without internet.',
  },
  onboardNameLabel: { bn: 'আপনার নাম', en: 'Your name' },
  onboardNamePlaceholder: { bn: 'যেমনঃ রহিম উদ্দিন', en: 'e.g. Rahim Uddin' },
  onboardAreaLabel: { bn: 'আপনার এলাকা', en: 'Your area' },
  onboardAreaSearchPlaceholder: { bn: 'এলাকার নাম লিখুন...', en: 'Type an area name...' },
  onboardAreaNone: { bn: 'নির্বাচন করা হয়নি', en: 'Not selected' },
  onboardLanguageLabel: { bn: 'ভাষা', en: 'Language' },
  onboardGetStarted: { bn: 'শুরু করুন', en: 'Get started' },
  onboardSkip: { bn: 'এড়িয়ে যান', en: 'Skip for now' },

  // Home
  statusCardTitle: { bn: 'আমার সর্বশেষ অবস্থা', en: 'My latest status' },
  statusNone: { bn: 'এখনও কোনো আপডেট নেই', en: 'No update yet' },
  statusSafe: { bn: 'নিরাপদ', en: 'Safe' },
  statusNeed: { bn: 'সাহায্য দরকার', en: 'Needs help' },
  btnSafe: { bn: 'আমি নিরাপদ', en: "I'm safe" },
  btnHelp: { bn: 'সাহায্য দরকার', en: 'Need help' },
  btnReportPerson: { bn: 'নিখোঁজ / পাওয়া গেছে রিপোর্ট করুন', en: 'Report missing / found person' },

  helpSheetTitle: { bn: 'কী ধরনের সাহায্য দরকার?', en: 'What kind of help is needed?' },
  categoryLabel: { bn: 'ধরন', en: 'Category' },
  noteLabel: { bn: 'বার্তা (ঐচ্ছিক)', en: 'Message (optional)' },
  notePlaceholder: { bn: 'বিস্তারিত লিখুন...', en: 'Add details...' },
  attachLocation: { bn: 'আমার অবস্থান যুক্ত করুন', en: 'Attach my location' },
  locationAttached: { bn: 'অবস্থান যুক্ত হয়েছে', en: 'Location attached' },
  locationUnavailable: {
    bn: 'অবস্থান পাওয়া যায়নি — অনুমতি দেখুন',
    en: 'Location unavailable — check permission',
  },
  locationFetching: { bn: 'অবস্থান খোঁজা হচ্ছে...', en: 'Finding location...' },

  personSheetTitle: { bn: 'নিখোঁজ / পাওয়া গেছে ব্যক্তির তথ্য', en: 'Missing / found person details' },
  personNameLabel: { bn: 'ব্যক্তির নাম', en: "Person's name" },
  personNamePlaceholder: { bn: 'পূর্ণ নাম লিখুন', en: 'Full name' },
  personAreaLabel: { bn: 'শেষ জানা এলাকা', en: 'Last known area' },
  personStatusLabel: { bn: 'অবস্থা', en: 'Status' },
  personNoteLabel: { bn: 'বিস্তারিত (ঐচ্ছিক)', en: 'Details (optional)' },

  submittedSafe: { bn: '✅ আপনার নিরাপদ অবস্থা পাঠানো হয়েছে', en: '✅ Your safe status was sent' },
  submittedHelp: { bn: '🆘 সাহায্যের অনুরোধ পাঠানো হয়েছে', en: '🆘 Your help request was sent' },
  submittedPerson: { bn: '📋 রিপোর্ট পাঠানো হয়েছে', en: '📋 Report sent' },

  connOnline: { bn: 'অনলাইন', en: 'Online' },
  connOffline: { bn: 'অফলাইন — স্বাভাবিক, ডেটা নিরাপদ', en: 'Offline — normal, data is safe' },
  connRelay: { bn: 'রিলে যুক্ত', en: 'Relay connected' },
  connNode: { bn: 'স্থানীয় নোড', en: 'Local node' },
  connConnecting: { bn: 'সংযোগ হচ্ছে…', en: 'Connecting…' },

  // Sync screen
  syncTitle: { bn: 'সিঙ্ক', en: 'Sync' },
  syncRelayTitle: { bn: 'রিলে সংযোগ', en: 'Relay connection' },
  syncRelayHint: {
    bn: 'ইন্টারনেট থাকলে ক্লাউড রিলে, একই ওয়াই-ফাইতে ল্যাপটপ নোড — স্বয়ংক্রিয়ভাবে সংযোগ ও লাইভ সিঙ্ক হয়।',
    en: 'Cloud relay when online, a laptop node on the same Wi-Fi — connects and live-syncs automatically.',
  },
  syncLastSync: { bn: 'শেষ সিঙ্ক', en: 'Last sync' },
  syncNever: { bn: 'এখনও হয়নি', en: 'not yet' },
  syncStatusRelay: { bn: 'রিলে যুক্ত', en: 'Relay connected' },
  syncStatusNode: { bn: 'স্থানীয় নোড যুক্ত', en: 'Local node connected' },
  syncStatusConnecting: { bn: 'সংযোগ হচ্ছে…', en: 'Connecting…' },
  syncStatusOffline: { bn: 'অফলাইন — স্বাভাবিক', en: 'Offline — normal' },

  syncNodeTitle: { bn: '💻 স্থানীয় নোডে যুক্ত হোন', en: '💻 Connect to local node' },
  syncNodeHint: {
    bn: 'ল্যাপটপের ঠিকানা টাইপ করুন বা /node-qr স্ক্যান করুন। যেমনঃ 192.168.0.5:8787',
    en: 'Type the laptop address or scan its /node-qr. e.g. 192.168.0.5:8787',
  },
  syncNodePlaceholder: { bn: '192.168.0.5:8787', en: '192.168.0.5:8787' },
  syncNodeScan: { bn: 'স্ক্যান', en: 'Scan' },
  syncNodeConnect: { bn: 'যুক্ত হোন', en: 'Connect' },
  syncNodeDisconnect: { bn: 'স্থানীয় নোড বন্ধ করুন', en: 'Disconnect local node' },
  syncNodeScanTitle: { bn: 'নোড QR স্ক্যান করুন', en: 'Scan node QR' },
  syncNodeScanHint: {
    bn: 'ল্যাপটপের স্ক্রিনে থাকা /node-qr কোডের দিকে ক্যামেরা ধরুন।',
    en: "Point the camera at the /node-qr code on the laptop's screen.",
  },
  nodeUrlInvalid: { bn: 'ঠিকানা সঠিক নয়', en: "That address doesn't look right" },

  syncStatsTitle: { bn: 'স্থানীয় সঞ্চয়', en: 'Local storage' },
  syncEventCount: { bn: 'ইভেন্ট', en: 'events' },
  syncStorageUsed: { bn: 'ব্যবহৃত', en: 'used' },

  // Sync — QR Beam card
  syncBeamTitle: { bn: '🔦 বিম (QR)', en: '🔦 Beam (QR)' },
  syncBeamHint: {
    bn: 'ইন্টারনেট ছাড়াই দুই ফোনের স্ক্রিন ও ক্যামেরা দিয়ে ইভেন্ট আদান-প্রদান করুন।',
    en: 'Exchange events between two phones using only screen + camera — no network.',
  },
  syncBeamSend: { bn: 'পাঠান', en: 'Send' },
  syncBeamScan: { bn: 'স্ক্যান', en: 'Scan' },

  // Sync — file export/import card
  syncFileTitle: { bn: '📄 ফাইল', en: '📄 File' },
  syncFileHint: {
    bn: 'একটি .setu ফাইলে ইভেন্ট রপ্তানি করুন বা কারো পাঠানো ফাইল আমদানি করুন।',
    en: 'Export events to a .setu file, or import a file someone shared.',
  },
  syncExport: { bn: 'রপ্তানি', en: 'Export' },
  syncImport: { bn: 'আমদানি', en: 'Import' },
  syncExportFilterAll: { bn: 'সব', en: 'All' },
  syncExportFilterArea: { bn: 'আমার এলাকা', en: 'My area' },
  syncExportFilterDay: { bn: '২৪ ঘণ্টা', en: 'Last 24h' },
  syncExportEmpty: { bn: 'রপ্তানি করার মতো কিছু নেই।', en: 'Nothing to export.' },
  syncImportDone: { bn: 'আমদানি সম্পন্ন', en: 'Import complete' },
  syncFileFailed: { bn: 'ফাইলটি পড়া যায়নি।', en: "Couldn't read that file." },

  // QR Beam — send
  beamSendTitle: { bn: 'বিম পাঠান', en: 'Beam send' },
  beamStop: { bn: 'বন্ধ', en: 'Stop' },
  beamEmpty: {
    bn: 'পাঠানোর মতো কোনো ইভেন্ট নেই। প্রথমে চেক-ইন করুন।',
    en: 'No events to beam yet. Check in first.',
  },
  beamBuilding: { bn: 'প্রস্তুত হচ্ছে…', en: 'Preparing…' },
  beamAim: {
    bn: 'অন্য ফোনের ক্যামেরা এই কোডের দিকে ধরুন',
    en: "Point the other phone's camera at this code",
  },
  beamDistance: { bn: 'ফোন দুটি ২০–৩০ সেমি দূরে রাখুন', en: 'Keep phones 20–30 cm apart' },
  beamEventsSending: { bn: 'পাঠানো হচ্ছে', en: 'Sending' },
  beamFrame: { bn: 'ফ্রেম', en: 'Frame' },
  beamChunks: { bn: 'অংশ', en: 'chunks' },
  beamSlower: { bn: 'সমস্যা হচ্ছে? ধীরে ও ছোট করুন', en: 'Trouble? Slower & smaller' },
  beamFaster: { bn: 'দ্রুত গতিতে ফিরুন', en: 'Back to faster' },

  // QR Beam — scan / receive
  beamScanTitle: { bn: 'বিম স্ক্যান', en: 'Beam scan' },
  beamSearching: {
    bn: 'বিম খোঁজা হচ্ছে — অন্য ফোনের স্ক্রিনের দিকে ধরুন',
    en: "Searching for a beam — point at the other phone's screen",
  },
  beamFramesSeen: { bn: 'ফ্রেম পাওয়া গেছে', en: 'frames seen' },
  beamHoldSteady: { bn: 'স্থির রাখুন — সম্পূর্ণ না হওয়া পর্যন্ত', en: 'Hold steady until complete' },
  beamDoneTitle: { bn: 'গ্রহণ সম্পন্ন', en: 'Received' },
  beamNew: { bn: 'নতুন', en: 'new' },
  beamKnown: { bn: 'আগে থেকেই ছিল', en: 'already known' },
  beamRejected: { bn: 'বাতিল', en: 'rejected' },
  beamFailed: {
    bn: 'ডিকোড করা যায়নি। আবার চেষ্টা করুন।',
    en: "Couldn't decode the beam. Please try again.",
  },

  // QR scanner
  scanTitle: { bn: 'QR স্ক্যান', en: 'Scan QR' },
  scanCancel: { bn: 'বাতিল', en: 'Cancel' },
  scanHint: { bn: 'কোডটি ফ্রেমের ভেতরে রাখুন', en: 'Hold the code inside the frame' },
  scanInsecure: {
    bn: 'ক্যামেরা কেবল HTTPS বা localhost-এ চলে। স্থানীয় নোডের http ঠিকানা থেকে অ্যাপটি খুলুন, অথবা ঠিকানা টাইপ করুন।',
    en: 'Camera needs HTTPS or localhost. Open the app from the node’s http address, or type the address instead.',
  },
  scanDenied: {
    bn: 'ক্যামেরার অনুমতি দেওয়া হয়নি। ব্রাউজার সেটিংসে ক্যামেরা চালু করুন, অথবা ঠিকানা টাইপ করুন।',
    en: 'Camera permission was denied. Enable the camera in browser settings, or type the address instead.',
  },
  scanNoCamera: { bn: 'কোনো ক্যামেরা পাওয়া যায়নি।', en: 'No camera found.' },
  scanUnknown: { bn: 'ক্যামেরা চালু করা যায়নি।', en: "Couldn't start the camera." },

  // Board
  boardTitle: { bn: 'বোর্ড', en: 'Board' },
  tabPeople: { bn: 'মানুষ', en: 'People' },
  tabHelpList: { bn: 'সাহায্য', en: 'Help' },
  tabMissing: { bn: 'নিখোঁজ', en: 'Missing' },
  tabBulletins: { bn: 'বুলেটিন', en: 'Bulletins' },
  searchPlaceholder: { bn: 'নাম বা এলাকা দিয়ে খুঁজুন...', en: 'Search by name or area...' },
  filterMyArea: { bn: 'আমার এলাকা', en: 'My area' },
  filterAll: { bn: 'সব', en: 'All' },
  emptyPeople: { bn: 'এখনও কোনো চেক-ইন নেই।', en: 'No check-ins yet.' },
  emptyHelp: { bn: 'এই মুহূর্তে কারো সাহায্য দরকার নেই।', en: 'Nobody currently needs help.' },
  emptyMissing: { bn: 'নিখোঁজ/পাওয়া গেছের কোনো রিপোর্ট নেই।', en: 'No missing/found reports.' },
  emptyBulletins: { bn: 'এখনও কোনো বুলেটিন নেই।', en: 'No bulletins yet.' },
  noSearchResults: { bn: 'কিছু পাওয়া যায়নি।', en: 'Nothing matches your search.' },
  unknownArea: { bn: 'অজানা এলাকা', en: 'Unknown area' },
  unknownName: { bn: 'নাম নেই', en: 'No name' },
  badgeVerified: { bn: 'যাচাইকৃত প্রকাশক', en: 'Verified publisher' },
  badgeUnverified: { bn: 'অযাচাইকৃত — সতর্কতার সাথে বিশ্বাস করুন', en: 'Unverified — trust with caution' },
  badgeSms: { bn: 'এসএমএস এর মাধ্যমে', en: 'Via SMS' },
  badgeSigned: { bn: 'ডিভাইস দ্বারা স্বাক্ষরিত', en: 'Signed by device' },

  // Time
  justNow: { bn: 'এইমাত্র', en: 'just now' },
} as const satisfies Record<string, Entry>;

export type DictKey = keyof typeof dict;
