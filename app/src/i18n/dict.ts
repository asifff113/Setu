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
  tryDemo: { bn: 'দেখে নিন — ডেমো চালু করুন', en: 'Try the demo' },
  tryDemoHint: {
    bn: '১৬টি নমুনা ইভেন্ট দিয়ে অ্যাপটি ঘুরে দেখুন — কোনো সেটআপ ছাড়াই',
    en: 'Explore the app with 16 sample events — no setup needed',
  },

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

  // Sync — Chirp (sound) card
  syncChirpTitle: { bn: '🔊 চির্প (শব্দ)', en: '🔊 Chirp (sound)' },
  syncChirpHint: {
    bn: 'ইন্টারনেট বা ক্যামেরা ছাড়াই — শব্দের মাধ্যমে আপনার সর্বশেষ অবস্থা পাঠান।',
    en: 'No internet or camera — send your latest status over sound.',
  },
  syncChirpSend: { bn: 'বাজান', en: 'Play' },
  syncChirpListen: { bn: 'শুনুন', en: 'Listen' },

  // Chirp — send
  chirpSendTitle: { bn: 'শব্দে পাঠান', en: 'Send by sound' },
  chirpEmpty: {
    bn: 'পাঠানোর মতো কোনো চেক-ইন নেই। প্রথমে চেক-ইন করুন।',
    en: 'No check-in to send yet. Check in first.',
  },
  chirpTooBig: {
    bn: 'এই আপডেটটি শব্দে পাঠানোর জন্য বড়। QR বিম ব্যবহার করুন।',
    en: 'This update is too large to send by sound — use QR Beam instead.',
  },
  chirpUnsupported: { bn: 'এই ডিভাইসে শব্দ চালানো যাচ্ছে না।', en: "This device can't play the sound." },
  chirpStart: { bn: '📢 শব্দ বাজান', en: '📢 Play sound' },
  chirpPlaying: {
    bn: 'শব্দ বাজছে — অন্য ফোনকে কাছে ধরে রাখুন',
    en: 'Playing — hold the other phone close',
  },
  chirpAim: {
    bn: 'ফোন দুটি কাছাকাছি রাখুন, চারপাশ শান্ত রাখুন',
    en: 'Keep the phones close and the surroundings quiet',
  },
  chirpLoopHint: {
    bn: 'অন্য ফোন একবার পরিষ্কারভাবে না পাওয়া পর্যন্ত বারবার বাজবে।',
    en: 'It repeats until the other phone gets one clean read.',
  },
  chirpBytes: { bn: 'বাইট', en: 'bytes' },
  chirpQuicker: { bn: '⚡ দ্রুত (কম নির্ভরযোগ্য)', en: '⚡ Quicker (less reliable)' },
  chirpReliable: { bn: '🛡️ বেশি নির্ভরযোগ্য', en: '🛡️ More reliable' },

  // Chirp — listen / receive
  chirpListenTitle: { bn: 'শব্দ শুনুন', en: 'Listen for sound' },
  chirpListenStart: { bn: '🎧 শোনা শুরু করুন', en: '🎧 Start listening' },
  chirpListening: { bn: 'শব্দ শোনা হচ্ছে… স্থির রাখুন', en: 'Listening… hold steady' },
  chirpListenHint: {
    bn: 'অন্য ফোনের স্পিকারের কাছে ধরে রাখুন',
    en: "Hold near the other phone's speaker",
  },
  chirpNoMic: { bn: 'কোনো মাইক্রোফোন পাওয়া যায়নি।', en: 'No microphone found.' },
  chirpMicDenied: {
    bn: 'মাইক্রোফোনের অনুমতি দেওয়া হয়নি। ব্রাউজার সেটিংসে মাইক চালু করুন।',
    en: 'Microphone permission was denied. Enable the mic in browser settings.',
  },
  chirpInsecure: {
    bn: 'মাইক্রোফোন কেবল HTTPS বা localhost-এ চলে।',
    en: 'The microphone needs HTTPS or localhost.',
  },
  chirpAudioFailed: { bn: 'শব্দ চালু করা যায়নি।', en: "Couldn't start audio." },

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

  // Map
  mapTitle: { bn: 'ম্যাপ', en: 'Map' },
  mapLegendSafe: { bn: 'নিরাপদ / পাওয়া গেছে', en: 'Safe / found' },
  mapLegendNeed: { bn: 'সাহায্য দরকার / নিখোঁজ', en: 'Need help / missing' },
  mapNoData: { bn: 'এখনও কোনো অবস্থান-ভিত্তিক রিপোর্ট নেই।', en: 'No location-based reports yet.' },
  mapOfflineTitle: {
    bn: '🗺️ অফলাইনে ম্যাপ পাওয়া যাচ্ছে না — এলাকা অনুযায়ী দেখানো হচ্ছে',
    en: 'No map available offline — showing areas',
  },
  mapOfflineHint: {
    bn: 'নেটওয়ার্ক ফিরলে সম্পূর্ণ ম্যাপ আবার দেখা যাবে।',
    en: 'The full map comes back once you have a connection.',
  },
  mapReportsSuffix: { bn: 'টি রিপোর্ট', en: 'reports' },

  // /publish — hidden bulletin composer
  publishTitle: { bn: 'বুলেটিন প্রকাশ করুন', en: 'Publish bulletin' },
  publishHiddenNote: {
    bn: 'এটি একটি লুকানো পরিচালনা স্ক্রিন — সাধারণ ব্যবহারকারীদের জন্য নয়।',
    en: 'This is a hidden admin screen — not for regular users.',
  },
  publishBack: { bn: '← অ্যাপে ফিরুন', en: '← Back to app' },
  publishSecretLabel: { bn: 'প্রকাশকের সিক্রেট কী', en: 'Publisher secret key' },
  publishSecretPlaceholder: { bn: 'base64url সিক্রেট কী পেস্ট করুন', en: 'Paste your base64url secret key' },
  publishSecretHint: {
    bn: 'এই কী কখনো সংরক্ষণ করা হয় না — শুধু এই সেশনে মেমোরিতে ব্যবহৃত হয়।',
    en: 'This key is never stored — used only in memory for this session.',
  },
  publishSecretInvalid: {
    bn: 'সিক্রেট কী সঠিক নয় — এটি ৩২ বাইটের base64url স্ট্রিং হতে হবে।',
    en: "That doesn't look like a valid secret key — it should be a 32-byte base64url string.",
  },
  publishDerivedPublic: { bn: 'প্রকাশকের পাবলিক কী', en: 'Publisher public key' },
  publishPinnedYes: { bn: '✓ পিন করা প্রকাশক — যাচাইকৃত দেখাবে', en: '✓ Pinned publisher — will show verified' },
  publishPinnedNo: { bn: '⚠ পিন করা নয় — অযাচাইকৃত দেখাবে', en: '⚠ Not pinned — will show as unverified' },
  publishAreaLabel: { bn: 'এলাকা (ঐচ্ছিক)', en: 'Area (optional)' },
  publishMessageLabel: { bn: 'বুলেটিনের বার্তা', en: 'Bulletin message' },
  publishMessagePlaceholder: {
    bn: 'যেমনঃ মিরপুরে আশ্রয়কেন্দ্র খোলা হয়েছে...',
    en: 'e.g. Shelter opened in Mirpur...',
  },
  publishSubmit: { bn: 'প্রকাশ করুন', en: 'Publish' },
  publishSuccess: { bn: '✅ বুলেটিন প্রকাশিত হয়েছে', en: '✅ Bulletin published' },
  publishViewBoard: { bn: 'বোর্ডে দেখুন', en: 'View on Board' },
  publishAnother: { bn: 'আরেকটি লিখুন', en: 'Write another' },

  // Info
  infoWhatTitle: { bn: 'সেতু কী?', en: 'What is Setu?' },
  infoWhatBody: {
    bn: 'সেতু একটি অফলাইন-প্রথম অ্যাপ — বিপর্যয় বা ইন্টারনেট বন্ধের সময় নিরাপদ/সাহায্য দরকার হিসেবে চেক-ইন করুন, আপনার ডিভাইস যাদের চেনে তাদের একটি বোর্ড দেখুন, আর ডিজিটালি স্বাক্ষরিত বুলেটিন ও অযাচাইকৃত গুজবের মধ্যে পার্থক্য বুঝুন। কোনো অ্যাকাউন্ট নেই, কোনো কেন্দ্রীয় সার্ভার নেই — প্রতিটি ইভেন্ট আপনার ডিভাইসে তৈরি, স্বাক্ষরিত ও সংরক্ষিত থাকে, এবং যেকোনো মাধ্যমে অন্য ডিভাইসের সাথে মিলিত (sync) হয়।',
    en: "Setu is offline-first: check in as safe or needing help during a disaster or internet shutdown, see a board of everyone your device knows about, and tell cryptographically signed bulletins apart from unverified rumors. No accounts, no central server — every event is created, signed, and stored on your own device, and merges with any other device over whatever transport is available.",
  },

  infoLadderTitle: { bn: 'যেভাবে সিঙ্ক হয় — সবচেয়ে ভালো থেকে শেষ উপায় পর্যন্ত', en: 'How it syncs — best case down to the last resort' },
  infoLadder1Title: { bn: '🌐 ইন্টারনেট', en: '🌐 Internet' },
  infoLadder1Desc: {
    bn: 'ক্লাউড রিলের সাথে সরাসরি লাইভ সিঙ্ক।',
    en: 'Live sync straight to the cloud relay.',
  },
  infoLadder2Title: { bn: '📶 স্থানীয় ওয়াই-ফাই', en: '📶 Local Wi-Fi' },
  infoLadder2Desc: {
    bn: 'ইন্টারনেট না থাকলেও একই ওয়াই-ফাই/হটস্পটে থাকা ল্যাপটপ রিলে নোড দিয়ে সিঙ্ক হয়।',
    en: 'No internet? A laptop running the same relay on your Wi-Fi/hotspot syncs everyone on it.',
  },
  infoLadder3Title: { bn: '🔦 QR বিম', en: '🔦 QR Beam' },
  infoLadder3Desc: {
    bn: 'কোনো নেটওয়ার্কই নেই? দুই ফোনের স্ক্রিন ও ক্যামেরা দিয়ে সরাসরি ইভেন্ট আদান-প্রদান।',
    en: 'No network at all? Two phones exchange events directly, screen to camera.',
  },
  infoLadder4Title: { bn: '🔊 চির্প (শব্দ)', en: '🔊 Chirp (sound)' },
  infoLadder4Desc: {
    bn: 'ক্যামেরা কাজ না করলে, শব্দের মাধ্যমে একটি সর্বশেষ চেক-ইন পাঠানো যায়।',
    en: "Camera not working? Send one latest check-in as an audible tone instead.",
  },
  infoLadder5Title: { bn: '📟 এসএমএস', en: '📟 SMS' },
  infoLadder5Desc: {
    bn: 'স্মার্টফোন নেই? যেকোনো বাটন ফোন থেকে এসএমএস দিয়ে চেক-ইন করা যায় — নিচে দেখুন।',
    en: 'No smartphone at all? Any button phone can check in by text — see below.',
  },

  infoSmsTitle: { bn: 'বাটন ফোনের জন্য: এসএমএস', en: 'For button phones: SMS' },
  infoSmsBody: {
    bn: 'ইন্টারনেট নেই, স্মার্টফোনও নেই? একটি সাধারণ এসএমএস দিয়েও সেতুতে অংশ নেওয়া যায় — একটি গেটওয়ে ফোন সেই বার্তা পড়ে সিস্টেমে যোগ করে। ডিপ্লয়মেন্টের সময় স্থানীয় সমন্বয়কারী কোন নম্বরে পাঠাতে হবে তা জানিয়ে দেবেন। বার্তার ধরন:',
    en: "No internet, no smartphone? A plain SMS still gets you into Setu — a gateway phone reads the text and adds it to the system. Whoever runs your local deployment announces which number to text. Message formats:",
  },
  infoSmsSafe: { bn: 'নিরাপদ জানাতে', en: "To report you're safe" },
  infoSmsHelp: { bn: 'সাহায্য চাইতে', en: 'To ask for help' },
  infoSmsMissing: { bn: 'নিখোঁজ রিপোর্ট করতে', en: 'To report someone missing' },
  infoSmsFound: { bn: 'পাওয়া গেছে জানাতে', en: 'To report someone found' },
  infoSmsFind: { bn: 'কারো খবর জানতে', en: "To ask for someone's status" },
  infoSmsTry: {
    bn: 'ফোন ছাড়াই ব্রাউজারে পরীক্ষা করতে চান? রিলের /sms-sim পাতা দেখুন।',
    en: 'Want to try it without a phone? See the relay’s /sms-sim page.',
  },

  infoTrustTitle: { bn: 'ব্যাজ কী বোঝায়', en: 'What the badges mean' },
  infoTrustVerified: {
    bn: 'যাচাইকৃত প্রকাশকের ডিজিটাল স্বাক্ষর — সবচেয়ে বেশি বিশ্বাসযোগ্য।',
    en: "A pinned, trusted publisher's digital signature — the highest trust level.",
  },
  infoTrustUnverified: {
    bn: 'স্বাক্ষর সঠিক, কিন্তু প্রকাশক পিন করা নয় — সতর্কতার সাথে বিশ্বাস করুন।',
    en: 'Signed correctly, but not from a pinned publisher — trust with caution.',
  },
  infoTrustSms: {
    bn: 'এসএমএস গেটওয়ে থেকে এসেছে, ডিভাইস দ্বারা স্বাক্ষরিত নয়।',
    en: 'Came in through the SMS gateway, not signed by a device.',
  },
  infoTrustSigned: {
    bn: 'ডিভাইস দ্বারা স্বাক্ষরিত — জাল স্বাক্ষরযুক্ত ইভেন্ট গ্রহণই করা হয় না।',
    en: "Signed by a device — anything with a forged signature is never accepted in the first place.",
  },

  infoSourceTitle: { bn: 'ওপেন সোর্স', en: 'Open source' },
  infoSourceBody: {
    bn: 'সেতুর পুরো কোড MIT লাইসেন্সে প্রকাশিত। কোড দেখুন, চালান বা নিজের এলাকায় নিজের রিলে চালান।',
    en: "Setu's full source is published under the MIT license. Read the code, run it yourself, or stand up your own relay for your area.",
  },
  infoSourceLink: { bn: 'GitHub-এ দেখুন', en: 'View on GitHub' },
  infoLicense: { bn: 'লাইসেন্সঃ MIT', en: 'License: MIT' },
  infoBuiltFor: {
    bn: 'জুলাই হ্যাকাথন ২০২৬-এ তৈরি, ২০২৪ সালের ইন্টারনেট বন্ধের অভিজ্ঞতাকে স্মরণ করে।',
    en: 'Built during the July Hackathon 2026, in honor of the 2024 internet-shutdown experience.',
  },

  // Time
  justNow: { bn: 'এইমাত্র', en: 'just now' },
} as const satisfies Record<string, Entry>;

export type DictKey = keyof typeof dict;
