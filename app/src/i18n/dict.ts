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
  refresh: { bn: 'নতুন তথ্য আনুন', en: 'Refresh updates' },
  errorGeneric: {
    bn: 'কিছু একটা ভুল হয়েছে — আবার চেষ্টা করুন।',
    en: 'Something went wrong — please try again.',
  },
  errorDemo: {
    bn: 'ডেমো লোড করা যায়নি — আবার চেষ্টা করুন।',
    en: "Couldn't load the demo — please try again.",
  },

  // Tab bar
  tabHome: { bn: 'হোম', en: 'Home' },
  tabBoard: { bn: 'অনুরোধ', en: 'Requests' },
  tabMap: { bn: 'ম্যাপ', en: 'Map' },
  tabSync: { bn: 'সিঙ্ক', en: 'Sync' },
  tabInfo: { bn: 'তথ্য', en: 'Info' },
  tabChat: { bn: 'চ্যাট', en: 'Chats' },
  tabAlerts: { bn: 'সতর্কতা', en: 'Alerts' },
  tabMore: { bn: 'আরও', en: 'More' },

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
  areaClear: { bn: 'বাদ দিন', en: 'Clear' },
  areaClearSearch: { bn: 'খোঁজা মুছুন', en: 'Clear search' },
  onboardLanguageLabel: { bn: 'ভাষা', en: 'Language' },
  onboardGetStarted: { bn: 'শুরু করুন', en: 'Get started' },
  onboardSkip: { bn: 'এড়িয়ে যান', en: 'Skip for now' },
  tryDemo: { bn: 'দেখে নিন — ডেমো চালু করুন', en: 'Try the demo' },
  tryDemoHint: {
    bn: '১৬টি নমুনা ইভেন্ট দিয়ে অ্যাপটি ঘুরে দেখুন — কোনো সেটআপ ছাড়াই',
    en: 'Explore the app with 16 sample events — no setup needed',
  },
  onboardSlide1Title: { bn: 'একবার “আমি নিরাপদ” চাপুন', en: 'Press “I’m safe” once' },
  onboardSlide1Body: { bn: 'পরিবার ও কাছের মানুষ আপনার সর্বশেষ নিরাপদ খবর দেখতে পারবে।', en: 'Family and nearby people can see your latest safety update.' },
  onboardSlide2Title: { bn: 'সাহায্য চান, তারপর একসাথে কাজ করুন', en: 'Ask for help, then coordinate' },
  onboardSlide2Body: { bn: 'উদ্ধারকারীরা অনুরোধ, ছবি ও এলাকা দেখবে; একই কার্ডে কথা বলা ও কাজ শেষ করা যাবে।', en: 'Responders see the request, media, and area; everyone coordinates and closes it on one card.' },
  onboardSlide3Title: { bn: 'ইন্টারনেট না থাকলেও চলে', en: 'Works without internet' },
  onboardSlide3Body: { bn: 'ফোনগুলো QR, শব্দ, ফাইল, স্থানীয় Wi-Fi ও SMS দিয়ে খবর আদান-প্রদান করে। সবকিছু ৭২ ঘণ্টা পরে মিলিয়ে যায়।', en: 'Phones exchange updates by QR, sound, file, local Wi-Fi, and SMS. Everything fades after 72 hours.' },
  onboardNext: { bn: 'পরবর্তী', en: 'Next' },
  onboardSetProfile: { bn: 'নাম ও এলাকা দিন', en: 'Set name & area' },

  // Home
  statusCardTitle: { bn: 'আমার সর্বশেষ অবস্থা', en: 'My latest status' },
  statusNone: { bn: 'এখনও কোনো আপডেট নেই', en: 'No update yet' },
  statusSafe: { bn: 'নিরাপদ', en: 'Safe' },
  statusNeed: { bn: 'সাহায্য দরকার', en: 'Needs help' },
  btnSafe: { bn: 'আমি নিরাপদ', en: "I'm safe" },
  btnHelp: { bn: 'সাহায্য দরকার', en: 'Need help' },
  btnReportPerson: { bn: 'নিখোঁজ / পাওয়া গেছে রিপোর্ট করুন', en: 'Report missing / found person' },
  btnReportPersonHint: {
    bn: 'কাউকে খুঁজে পাচ্ছেন না, বা পেয়েছেন',
    en: 'Someone missing, or now found',
  },
  btnOffer: { bn: 'আমি সাহায্য দিতে পারি', en: 'I can offer help' },
  btnOfferHint: {
    bn: 'খাবার, পানি, আশ্রয় বা পরিবহন',
    en: 'Food, water, shelter, or transport',
  },
  homeSafeNudge: { bn: 'একবার “আমি নিরাপদ” চাপুন, যাতে পরিবার আপনাকে এখানে খুঁজে পায়। পরে যেকোনো সময় আপডেট করতে পারবেন।', en: 'Tap “I’m safe” once so family can find you here. You can update it anytime.' },
  homeStatusSafeTitle: { bn: 'আপনি নিরাপদ হিসেবে চিহ্নিত', en: "You're marked safe" },
  homeStatusNeedTitle: { bn: 'আপনার সাহায্যের অনুরোধ চালু আছে', en: 'Your help request is live' },
  homeStatusOfferTitle: { bn: 'আপনার সহায়তার প্রস্তাব চালু আছে', en: 'Your offer to help is live' },
  homeQuickTitle: { bn: 'দ্রুত কাজ', en: 'Quick actions' },
  homeGlanceTitle: { bn: 'এখন যা চলছে', en: 'Live right now' },
  homeGlanceAll: { bn: 'সব এলাকা', en: 'All areas' },
  homeGlanceNeeds: { bn: 'খোলা অনুরোধ', en: 'Open requests' },
  homeGlanceSafe: { bn: 'নিরাপদ জানিয়েছে', en: 'Marked safe' },
  homeGlanceAlerts: { bn: 'সতর্কতা', en: 'Alerts' },

  helpSheetTitle: { bn: 'কী ধরনের সাহায্য দরকার?', en: 'What kind of help is needed?' },
  offerSheetTitle: { bn: 'আপনি কী ধরনের সাহায্য দিতে পারেন?', en: 'What help can you offer?' },
  categoryLabel: { bn: 'ধরন', en: 'Category' },
  noteLabel: { bn: 'বার্তা (ঐচ্ছিক)', en: 'Message (optional)' },
  notePlaceholder: { bn: 'বিস্তারিত লিখুন...', en: 'Add details...' },
  urgencyLabel: { bn: 'জরুরিতা', en: 'Urgency' },
  urgencyNormal: { bn: 'সাধারণ', en: 'Normal' },
  urgencyUrgent: { bn: 'জরুরি', en: 'Urgent' },
  urgencyCritical: { bn: 'জীবন-ঝুঁকি', en: 'Life-threatening' },
  urgencySelfReported: { bn: 'জরুরিতা অনুরোধকারীর নিজের মূল্যায়ন।', en: 'Urgency is self-reported by the requester.' },
  duplicateHelpWarning: { bn: 'এই এলাকায় একই ধরনের একটি সক্রিয় অনুরোধ আছে। সম্ভব হলে আগে সেটি খুলে সাড়া দিন—তবুও আপনার প্রয়োজন আলাদা হলে পাঠাতে পারেন।', en: 'A similar active request exists in this area. Respond there if it is the same need, or continue if yours is separate.' },
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
  connectionExplainedTitle: { bn: 'আপনার আপডেট কোথায় পৌঁছাবে', en: 'Where your updates will reach' },
  connectionRelayPlain: {
    bn: 'ইন্টারনেটের মাধ্যমে যুক্ত আছেন — খবর সবার কাছে পৌঁছাতে পারে।',
    en: 'Connected through the internet — updates can reach everyone.',
  },
  connectionNodePlain: {
    bn: 'শুধু স্থানীয় হটস্পট/ওয়াই-ফাই — এই নেটওয়ার্কের ফোনগুলো খবর পাবে।',
    en: 'Local hotspot or Wi-Fi only — updates reach phones on this network.',
  },
  connectionConnectingPlain: { bn: 'সংযোগের চেষ্টা চলছে। আপনার আপডেট এই ফোনে নিরাপদে আছে।', en: 'Connecting. Your updates are saved safely on this phone.' },
  connectionOfflinePlain: { bn: 'অফলাইন — আপডেট এই ফোনে রাখা আছে এবং সংযোগ হলে নিজে থেকে পাঠাবে।', en: 'Offline — updates are saved here and will send automatically when connected.' },
  connectionOpen: { bn: 'সংযোগ ও অফলাইন শেয়ারিং খুলুন', en: 'Open connection & offline sharing' },

  // Sync screen
  syncTitle: { bn: 'সংযোগ ও অফলাইন শেয়ার', en: 'Connection & offline sharing' },
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
  syncNodeInsecureWarning: {
    bn: '⚠ এই ঠিকানাটি লোকাল নেটওয়ার্কের বাইরে এবং এনক্রিপ্ট করা নয় — নাম ও অবস্থান খোলা নেটওয়ার্কে যেতে পারে।',
    en: '⚠ This address is outside your local network and unencrypted — names and locations would travel in the clear.',
  },
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
  tabOffers: { bn: 'সহায়তার প্রস্তাব', en: 'Offers' },
  requestsTitle: { bn: 'অনুরোধ ও আপডেট', en: 'Requests & updates' },
  requestsHint: { bn: 'একটি কার্ডে চাপ দিয়ে কথা বলুন বা সাড়া দিন', en: 'Tap a card to coordinate or respond' },
  coachRequests: { bn: 'এই ফোনটি যেসব ফোনের সাথে কখনও তথ্য বদল করেছে, তাদের কার্ড এখানে দেখা যায়।', en: 'Cards here come from every phone this device has ever exchanged updates with.' },
  coachConnect: { bn: 'ইন্টারনেট নেই? দুই ফোন QR বা শব্দ দিয়ে সরাসরি খবর বদল করতে পারে।', en: 'No internet? Two phones can trade updates directly by QR or sound.' },
  searchPlaceholder: { bn: 'নাম বা এলাকা দিয়ে খুঁজুন...', en: 'Search by name or area...' },
  filterMyArea: { bn: 'আমার এলাকা', en: 'My area' },
  filterAll: { bn: 'সব', en: 'All' },
  filterCircle: { bn: 'আমার সার্কেল', en: 'My Circle' },
  sortLabel: { bn: 'সাজানোর ধরন', en: 'Sort requests' },
  sortNewest: { bn: 'জরুরি ও নতুন', en: 'Urgent & newest' },
  sortWaiting: { bn: 'সবচেয়ে বেশি অপেক্ষা', en: 'Oldest waiting' },
  sortNearest: { bn: 'সবচেয়ে কাছে', en: 'Nearest' },
  resolvedSection: { bn: 'সমাধান হয়েছে', en: 'Resolved' },
  shareSetu: { bn: 'সেতু শেয়ার করুন', en: 'Share Setu' },
  kioskHint: { bn: 'শেল্টার বোর্ড · প্রতি ১০ সেকেন্ডে নিজে থেকে বদলাবে', en: 'Shelter board · cycles automatically every 10 seconds' },
  emptyPeople: { bn: 'এখনও কোনো চেক-ইন নেই।', en: 'No check-ins yet.' },
  emptyHelp: { bn: 'এই মুহূর্তে কারো সাহায্য দরকার নেই।', en: 'Nobody currently needs help.' },
  emptyOffers: { bn: 'এখনও কেউ সহায়তার প্রস্তাব দেননি।', en: 'No offers of help yet.' },
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
  mapPins: { bn: 'পিন', en: 'Pins' },
  mapAreas: { bn: 'এলাকার চাহিদা', en: 'Needs by area' },
  mapAreasTitle: { bn: 'এলাকাভিত্তিক সক্রিয় রিপোর্ট', en: 'Active reports by area' },
  mapAreasHint: { bn: 'সবচেয়ে বেশি রিপোর্টের এলাকা আগে দেখানো হয়েছে।', en: 'Areas with the most active reports appear first.' },
  coachMap: { bn: 'শুধু যেসব আপডেটে এলাকা বা অবস্থান আছে সেগুলো এখানে দেখা যায়।', en: 'Only updates with an area or shared location appear here.' },
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
  mapClusterReports: { bn: 'টি কাছাকাছি রিপোর্ট', en: 'reports nearby' },
  mapClusterHint: {
    bn: 'আলাদা রিপোর্ট খুলতে ম্যাপ বড় করুন।',
    en: 'Zoom in to open individual cases.',
  },

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
  infoProfileTitle: { bn: 'আমার প্রোফাইল', en: 'My profile' },
  infoProfileEdit: { bn: 'পরিবর্তন করুন', en: 'Edit profile' },
  infoProfileNoName: { bn: 'নাম দেওয়া হয়নি', en: 'No name set' },
  infoProfileNoArea: { bn: 'এলাকা নির্বাচন করা হয়নি', en: 'No area selected' },
  infoProfileDistrict: { bn: 'জেলা', en: 'District' },
  infoProfileChooseDistrict: { bn: '৬৪টি জেলা থেকে নির্বাচন করুন', en: 'Choose from 64 districts' },
  infoProfileLocality: { bn: 'থানা / পাড়া / মহল্লা (ঐচ্ছিক)', en: 'Thana / neighborhood (optional)' },
  infoProfileLocalityPlaceholder: { bn: 'যেমন: সাভার, আশুলিয়া', en: 'e.g. Savar, Ashulia' },
  infoProfileAreaHint: {
    bn: '“আমার এলাকা” ফিল্টার জেলার ভিত্তিতে কাজ করে; স্থানীয় নামটি অতিরিক্ত পরিচিতির জন্য রাখা হয়।',
    en: '“My area” filtering uses the selected district; the local name is saved as extra profile detail.',
  },
  infoProfileSaving: { bn: 'সংরক্ষণ হচ্ছে…', en: 'Saving…' },
  infoProfileSaved: { bn: '✓ প্রোফাইল সংরক্ষণ করা হয়েছে', en: '✓ Profile saved' },
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
  infoSmsDone: { bn: 'সাহায্যের কাজ শেষ জানাতে', en: 'To mark a help request done' },
  infoSmsOffer: { bn: 'সহায়তার প্রস্তাব দিতে', en: 'To offer help' },
  infoSmsTry: {
    bn: 'ফোন ছাড়াই ব্রাউজারে পরীক্ষা করতে চান? রিলের /sms-sim পাতা দেখুন।',
    en: 'Want to try it without a phone? See the relay’s /sms-sim page.',
  },
  infoSmsShare: { bn: 'এসএমএস নির্দেশনা শেয়ার করুন', en: 'Share SMS instruction' },
  faqTitle: { bn: 'সাধারণ প্রশ্ন', en: 'Common questions' },
  faqOfflineQ: { bn: 'ইন্টারনেট ছাড়া কি কাজ করে?', en: 'Does it work without internet?' },
  faqOfflineA: { bn: 'হ্যাঁ। আপডেট প্রথমে এই ফোনে থাকে। পরে QR, শব্দ, ফাইল, স্থানীয় Wi-Fi, SMS বা রিলে দিয়ে অন্য ফোনে যায়।', en: 'Yes. Updates stay on this phone first, then move by QR, sound, file, local Wi-Fi, SMS, or relay.' },
  faqNameQ: { bn: 'আমার নাম কে দেখতে পাবে?', en: 'Who can see my name?' },
  faqNameA: { bn: 'আপনার আপডেট পাওয়া যেকোনো Setu ডিভাইস নামটি দেখতে পারে। প্রয়োজন হলে ডাকনাম ব্যবহার করুন; সঠিক বাড়ির ঠিকানা লিখবেন না।', en: 'Any Setu device that receives your update can see the name. Use a nickname if needed and avoid an exact home address.' },
  faqDeleteQ: { bn: 'কিছু কীভাবে মুছব?', en: 'How do I delete something?' },
  faqDeleteA: { bn: 'নিজের কার্ড খুলে মুছুন চাপুন। একটি স্বাক্ষরিত প্রত্যাহার পাঠানো হবে। আগে সিঙ্ক করা অফলাইন ফোনে মেয়াদ শেষ হওয়া পর্যন্ত কপি থাকতে পারে।', en: 'Open your card and tap Delete. Setu sends a signed retraction; offline devices that already synced it may retain a copy until expiry.' },
  faqBadgesQ: { bn: '✓ এবং ⚠ কী বোঝায়?', en: 'What do ✓ and ⚠ mean?' },
  faqBadgesA: { bn: '✓ পিন করা যাচাইকৃত প্রকাশক বা সঠিক ডিভাইস স্বাক্ষর বোঝায়। ⚠ স্বাক্ষর সঠিক হলেও প্রকাশক যাচাইকৃত নয়—সতর্ক থাকুন।', en: '✓ indicates a pinned publisher or valid device signature. ⚠ means the signature is valid but the publisher is not verified—use caution.' },
  faqResolveQ: { bn: '“সমাধান হয়েছে” মানে কি মুছে গেছে?', en: 'Does “Resolved” mean deleted?' },
  faqResolveA: { bn: 'না। এটি অনুরোধটিকে সম্পন্ন বিভাগে রাখে যাতে অন্যরা অযথা সাড়া না দেয়। ৭২ ঘণ্টার মেয়াদ শেষে এটি বোর্ড থেকে মিলিয়ে যায়।', en: 'No. It moves the case into Done so responders do not duplicate work. It fades from boards when its 72-hour lifetime ends.' },

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
  infoCredit: {
    bn: 'তৈরি করেছেন আসিফ ইশতিয়াক',
    en: 'Built by Asif Istiaque',
  },
  moreGuide: { bn: 'জরুরি গাইড', en: 'Emergency guide' },
  moreHistory: { bn: 'আমার ইতিহাস', en: 'My history' },
  moreCircle: { bn: 'আমার সার্কেল', en: 'My Circle' },
  moreShare: { bn: 'সেতু শেয়ার', en: 'Share Setu' },
  moreConnect: { bn: 'সংযোগ ও অফলাইন শেয়ার', en: 'Connection & offline sharing' },
  moreMedia: { bn: 'ছবি ও ভয়েস স্টোরেজ', en: 'Media storage' },
  settingsDisplay: { bn: 'অ্যাক্সেসিবিলিটি ও ডেটা', en: 'Accessibility & data' },
  settingsDark: { bn: 'ডার্ক মোড', en: 'Dark mode' },
  settingsBattery: { bn: 'ব্যাটারি সেভার', en: 'Battery saver' },
  settingsLargeText: { bn: 'বড় লেখা', en: 'Large text' },
  settingsAutoMedia: { bn: 'সংযুক্ত থাকলে ছবি নিজে থেকে নামান', en: 'Auto-download media when connected' },
  settingsResponder: { bn: 'রেসপন্ডার মোড', en: 'Responder mode' },
  mediaStorageTitle: { bn: 'ছবি ও ভয়েস স্টোরেজ', en: 'Photo & voice storage' },
  mediaStorageHint: { bn: 'ক্যাশ করা মিডিয়া এই ফোন থেকে মুছলে স্বাক্ষরিত কথোপকথনটি থাকবে, কিন্তু ফাইলটি আর অফলাইনে খুলবে না।', en: 'Deleting cached media keeps the signed conversation, but the file will no longer open offline.' },
  mediaStorageFiles: { bn: 'টি ফাইল', en: 'files' },
  mediaStorageDeleteAll: { bn: 'সব স্থানীয় মিডিয়া মুছুন', en: 'Delete all local media' },
  mediaStorageDeleteConfirm: { bn: 'এই ফোনে রাখা সব ছবি ও ভয়েস নোট মুছবেন?', en: 'Delete all photos and voice notes stored on this phone?' },
  publishSeverity: { bn: 'সতর্কতার মাত্রা', en: 'Alert severity' },
  publishSeverityInfo: { bn: 'তথ্য', en: 'Info' },
  publishSeverityWarning: { bn: 'সতর্কতা', en: 'Warning' },
  publishSeverityDanger: { bn: 'বিপদ', en: 'Danger' },

  // Request details and immutable lifecycle
  detailTitle: { bn: 'আপডেটের বিস্তারিত', en: 'Update details' },
  detailResponding: { bn: 'জন সাড়া দিচ্ছেন', en: 'responding' },
  detailResolved: { bn: 'সমাধান হয়েছে', en: 'Resolved' },
  detailViewMap: { bn: 'ম্যাপে দেখুন', en: 'View on map' },
  detailOnIt: { bn: 'আমি আসছি', en: "I'm on this" },
  detailReceivedHelp: { bn: 'আমি সাহায্য পেয়েছি', en: 'I received the help' },
  detailMarkDone: { bn: 'কাজ শেষ', en: 'Mark done' },
  detailDoneConfirm: {
    bn: 'প্রয়োজনটি সত্যিই পূরণ হলেই শেষ হিসেবে চিহ্নিত করুন। চালিয়ে যাবেন?',
    en: 'Only mark this done if the need was actually met. Continue?',
  },
  detailSeen: { bn: 'আমি এই ব্যক্তিকে দেখেছি', en: 'I have seen this person' },
  detailMatchingOffers: { bn: 'টি কাছাকাছি মিলযুক্ত সহায়তার প্রস্তাব আছে', en: 'matching nearby offers' },
  detailWatch: { bn: 'খবর রাখুন', en: 'Watch' },
  detailWatching: { bn: 'খবর রাখা হচ্ছে', en: 'Watching' },
  detailMute: { bn: 'এই লেখককে মিউট করুন', en: 'Mute author' },
  detailUnmute: { bn: 'মিউট খুলুন', en: 'Unmute' },
  detailDelete: { bn: 'মুছুন', en: 'Delete' },
  detailDeleteHonest: {
    bn: 'এটি বোর্ড থেকে সরাবে। আগে সিঙ্ক করা ডিভাইসে মেয়াদ শেষ না হওয়া পর্যন্ত একটি কপি থাকতে পারে।',
    en: 'This removes it from boards. Devices that already synced it may keep a copy until it expires.',
  },
  detailConversation: { bn: 'কথোপকথন', en: 'Conversation' },
  detailNoReplies: { bn: 'এখনও কোনো উত্তর নেই।', en: 'No replies yet.' },
  detailReplyPlaceholder: { bn: 'একটি উত্তর লিখুন…', en: 'Write a reply…' },
  detailSendReply: { bn: 'উত্তর পাঠান', en: 'Send reply' },
  detailReplySent: { bn: 'উত্তর পাঠানো হয়েছে', en: 'Reply sent' },
  detailAckSent: { bn: 'সাড়া পাঠানো হয়েছে', en: 'Response sent' },

  // Area chat
  chatNeedsArea: { bn: 'চ্যাটের জন্য এলাকা বেছে নিন', en: 'Choose an area to use chat' },
  chatNeedsAreaHint: { bn: 'প্রতিটি জেলা বা এলাকার একটি খোলা ২৪ ঘণ্টার চ্যানেল আছে।', en: 'Each district or area has one open 24-hour channel.' },
  chatSetArea: { bn: 'প্রোফাইলে এলাকা দিন', en: 'Set area in profile' },
  chatExpiry: { bn: 'পুরোনো বার্তা ২৪ ঘণ্টা পরে নিজে থেকে মুছে যায় ⏳', en: 'Older messages expire automatically after 24 hours ⏳' },
  chatEmpty: { bn: 'এই এলাকায় এখনও কোনো বার্তা নেই।', en: 'No messages in this area yet.' },
  chatEmptyHint: { bn: 'রাস্তা, আশ্রয় বা সাহায্যের খবর শেয়ার করুন।', en: 'Share a road, shelter, or coordination update.' },
  chatPlaceholder: { bn: 'এলাকার জন্য একটি বার্তা লিখুন…', en: 'Write a message for your area…' },

  // Private local history
  historyTitle: { bn: 'আমার ইতিহাস', en: 'My history' },
  historyHint: { bn: 'মেয়াদ শেষ হলেও আপনার নিজের আপডেট শুধু এই ফোনে থাকে।', en: 'Your own updates remain on this phone after they expire.' },
  historyEmpty: { bn: 'আপনি এখনও কোনো আপডেট দেননি।', en: "You haven't posted an update yet." },
  historyRetracted: { bn: 'মুছে দেওয়া', en: 'Retracted' },
  historyExpired: { bn: 'মেয়াদ শেষ', en: 'Expired' },
  historyActive: { bn: 'সক্রিয়', en: 'Active' },
  historyRepublish: { bn: 'আবার প্রকাশ করুন', en: 'Publish again' },

  // Emergency guide
  guideTitle: { bn: 'অফলাইন জরুরি গাইড', en: 'Offline emergency guide' },
  guideOffline: { bn: 'এই পাতাটি আগে থেকেই ফোনে রাখা থাকে এবং বিমান মোডেও খুলবে।', en: 'This page is precached on your phone and works in airplane mode.' },
  guideDisclaimer: {
    bn: 'এটি সংক্ষিপ্ত প্রস্তুতি তথ্য, পেশাদার চিকিৎসার বিকল্প নয়। নিরাপদ হলে প্রশিক্ষিত উদ্ধারকর্মী বা চিকিৎসকের সাহায্য নিন।',
    en: 'This is brief preparedness information, not a substitute for professional care. Seek trained responders or medical help when safe.',
  },

  // Distribution
  shareTitle: { bn: 'সেতু ছড়িয়ে দিন', en: 'Share Setu' },
  shareInstallHint: { bn: 'ব্রাউজার থেকে ইনস্টল হয়, তারপর ইন্টারনেট ছাড়াই কাজ করে।', en: 'Installs from the browser, then works without internet.' },
  shareButton: { bn: 'লিংক শেয়ার করুন', en: 'Share the link' },
  shareDone: { bn: 'শেয়ার করার জন্য প্রস্তুত', en: 'Ready to share' },
  shareIos: { bn: 'iPhone-এ Safari-এর Share বোতাম চাপুন, তারপর “Add to Home Screen” বেছে নিন।', en: 'On iPhone, tap Safari’s Share button, then choose “Add to Home Screen”.' },

  // My Circle
  circleTitle: { bn: 'আমার সার্কেল', en: 'My Circle' },
  circleHint: { bn: 'সামনাসামনি QR বদলে পরিবার ও কাছের মানুষকে এই ফোনে রাখুন—কোনো অ্যাকাউন্ট নেই।', en: 'Exchange QR codes in person to keep family and close contacts on this phone—no accounts.' },
  circleMyCode: { bn: 'অন্য ফোনকে এই কোডটি স্ক্যান করতে দিন', en: 'Let the other phone scan this code' },
  circleScan: { bn: 'অন্যের QR স্ক্যান করুন', en: "Scan someone's QR" },
  circleScanHint: { bn: 'অন্য ফোনের My Circle কোডটি ফ্রেমে ধরুন।', en: "Hold the other phone's My Circle code in the frame." },
  circleMembers: { bn: 'সার্কেলের মানুষ', en: 'Circle members' },
  circleEmpty: { bn: 'এখনও কাউকে যোগ করা হয়নি। সামনাসামনি QR বদল করুন।', en: 'No one added yet. Exchange QR codes in person.' },
  circleNoStatus: { bn: 'এখনও কোনো খবর নেই', en: 'No status yet' },
  circleRemove: { bn: 'সার্কেল থেকে সরান', en: 'Remove from circle' },
  circleAdded: { bn: 'সার্কেলে যোগ হয়েছে', en: 'Added to your circle' },
  circleInvalid: { bn: 'এটি সঠিক Setu Circle QR নয়।', en: "That isn't a valid Setu Circle QR." },
  circleManage: { bn: 'পরিচালনা', en: 'Manage' },

  // Time
  justNow: { bn: 'এইমাত্র', en: 'just now' },

  // How-to-use manual
  moreManual: { bn: 'ব্যবহার নির্দেশিকা', en: 'How to use Setu' },
  coachManual: {
    bn: 'নতুন এখানে? পুরো অ্যাপ কীভাবে ব্যবহার করবেন তার ধাপে ধাপে নির্দেশিকা আছে —',
    en: "New here? There's a step-by-step guide to using the whole app —",
  },
  manualTitle: { bn: 'সেতু যেভাবে ব্যবহার করবেন', en: 'How to use Setu' },
  manualIntro: {
    bn: 'নতুন কিছু আপডেট হলেও অ্যাপ ব্যবহার করা সহজ থাকে — নিচের যেকোনো বিষয়ে চাপুন।',
    en: 'Even as new features are added, using Setu stays simple — tap any topic below.',
  },
  manualOffline: {
    bn: 'এই নির্দেশিকাটি আগে থেকেই ফোনে রাখা থাকে এবং ইন্টারনেট বা বিমান মোডেও খোলে।',
    en: 'This guide is precached on your phone and opens even offline or in airplane mode.',
  },

  manualStartTitle: { bn: '১. দ্রুত চেক-ইন করুন', en: '1. Quick check-in' },
  manualStartBody: {
    bn: 'হোম ট্যাবে গিয়ে “আমি নিরাপদ” চাপুন — এটিই সবচেয়ে জরুরি প্রথম কাজ।\nসাহায্য দরকার হলে “সাহায্য দরকার” চাপুন, ধরন (ওষুধ/উদ্ধার/খাবার/পানি/আশ্রয়/অন্যান্য) ও জরুরিতা বেছে নিন, চাইলে অবস্থান যুক্ত করুন।\nকাউকে খুঁজে না পেলে বা কাউকে খুঁজে পেলে “নিখোঁজ/পাওয়া গেছে রিপোর্ট করুন” ব্যবহার করুন।\nসাহায্য করতে পারলে “আমি সাহায্য দিতে পারি” চেপে প্রস্তাব পাঠান।\nযেকোনো সময় বোতাম আবার চেপে অবস্থা হালনাগাদ করা যায় — পুরোনোটা মুছে যায় না, শুধু “আমার ইতিহাসে” সরে যায়।',
    en: 'Open the Home tab and tap “I\'m safe” first — the single most useful thing to do.\nNeed help? Tap “Need help”, pick a category (medical/rescue/food/water/shelter/other) and urgency, and attach your location if you can.\nUse “Report missing / found person” when someone can\'t be found, or has been found.\nCan you help someone? Tap “I can offer help” to publish an offer.\nYou can update your status anytime by tapping a button again — nothing is overwritten, the old post just moves into “My history”.',
  },

  manualBoardTitle: { bn: '২. বোর্ড দেখা ও সাড়া দেওয়া', en: '2. Reading and responding on the Board' },
  manualBoardBody: {
    bn: 'রিকোয়েস্ট ট্যাবে মানুষ, সাহায্য, নিখোঁজ, সহায়তার প্রস্তাব ও বুলেটিন — আলাদা তালিকায় দেখা যায়।\nওপরের ফিল্টার দিয়ে “আমার এলাকা”, “আমার সার্কেল” বা “সব” বেছে নিন; নাম বা এলাকা দিয়েও খোঁজা যায়।\n“জরুরি ও নতুন”, “সবচেয়ে বেশি অপেক্ষা” বা “সবচেয়ে কাছে” — এই তিন ধরনে সাজানো যায়।\nযেকোনো কার্ডে চাপ দিলে বিস্তারিত, কথোপকথন ও “আমি আসছি” / “কাজ শেষ”-এর মতো বোতাম দেখা যায়।\nপ্রয়োজন সত্যিই পূরণ হলেই “কাজ শেষ” চাপুন — এটি সমাধান হয়েছে অংশে সরায়, মুছে ফেলে না।\nরিকোয়েস্ট ট্যাবের ওপরে 🗺 বোতাম চেপে সব রিপোর্ট ম্যাপে বা এলাকাভিত্তিক তালিকায় দেখা যায়।',
    en: 'The Requests tab shows People, Help, Missing, Offers, and Bulletins as separate lists.\nUse the filters at the top for “My area”, “My Circle”, or “All”; you can also search by name or area.\nSort by “Urgent & newest”, “Oldest waiting”, or “Nearest”.\nTap any card to see details, the conversation, and buttons like “I\'m on this” / “Mark done”.\nOnly tap “Mark done” once the need is actually met — it moves the case to Resolved, it doesn\'t delete it.\nTap the 🗺 button above the Requests tab to see every report on a map or grouped by area.',
  },

  manualChatTitle: { bn: '৩. এলাকার চ্যাট', en: '3. Area chat' },
  manualChatBody: {
    bn: 'চ্যাট খুলতে আগে প্রোফাইলে একটি জেলা/এলাকা বেছে নিতে হবে — “আরও → আমার প্রোফাইল” থেকে করা যায়।\nপ্রতিটি এলাকার একটি খোলা চ্যানেল আছে, যেখানে রাস্তা বন্ধ, আশ্রয়কেন্দ্র বা সমন্বয়ের খবর শেয়ার করা যায়।\nপুরোনো বার্তা ২৪ ঘণ্টা পর নিজে থেকেই মুছে যায়, তাই এখানে ব্যক্তিগত তথ্য না দেওয়াই ভালো।',
    en: 'Chat needs an area first — set your district/area under “More → My profile”.\nEach area has one open channel for sharing road closures, shelter info, or coordination updates.\nOlder messages expire automatically after 24 hours, so avoid sharing private details there.',
  },

  manualAlertsTitle: { bn: '৪. সতর্কতা ও বিশ্বাসযোগ্যতা', en: '4. Alerts and trust badges' },
  manualAlertsBody: {
    bn: 'সতর্কতা ট্যাবে সংস্থার বুলেটিন দেখা যায় — তথ্য, সতর্কতা বা বিপদ, এই তিন মাত্রায়।\n✓ চিহ্ন মানে যাচাইকৃত প্রকাশকের স্বাক্ষর; ⚠ মানে স্বাক্ষর ঠিক আছে কিন্তু প্রকাশক পিন করা নয় — এমন খবর সতর্কতার সাথে বিশ্বাস করুন।\n📟 চিহ্নযুক্ত আপডেট এসএমএস গেটওয়ে থেকে এসেছে, কোনো ডিভাইসের স্বাক্ষর নেই।',
    en: 'The Alerts tab shows official bulletins at three severities: info, warning, or danger.\n✓ means a verified publisher\'s signature; ⚠ means the signature is valid but the publisher isn\'t pinned — trust those with caution.\n📟 marks an update that came through the SMS gateway, not signed by any device.',
  },

  manualSyncTitle: { bn: '৫. ইন্টারনেট না থাকলেও সিঙ্ক করা', en: '5. Staying in sync without internet' },
  manualSyncBody: {
    bn: 'ইন্টারনেট থাকলে অ্যাপ নিজে থেকেই ক্লাউড রিলের সাথে যুক্ত হয় ও লাইভ সিঙ্ক করে — কিছু করতে হয় না।\nএকই ওয়াই-ফাই/হটস্পটে ল্যাপটপ থাকলে “সংযোগ ও অফলাইন শেয়ার → স্থানীয় নোডে যুক্ত হোন”-এ ঠিকানা টাইপ করুন বা QR স্ক্যান করুন।\nকোনো নেটওয়ার্কই না থাকলে 🔦 বিম (QR) দিয়ে দুই ফোনের ক্যামেরা ও স্ক্রিন মুখোমুখি ধরে সরাসরি ইভেন্ট আদান-প্রদান করুন।\nক্যামেরা কাজ না করলে 🔊 চির্প দিয়ে শব্দের মাধ্যমে সর্বশেষ চেক-ইন পাঠান বা শুনুন।\n📄 ফাইল কার্ড দিয়ে ইভেন্ট একটি .setu ফাইলে রপ্তানি করে ব্লুটুথ/USB/মেসেজিং অ্যাপে পাঠানো যায়, অন্য ফোনে আমদানি করা যায়।\nস্মার্টফোন নেই এমন কারো জন্য — “আরও” পাতায় SAFE, HELP, MISSING, FOUND, FIND, OFFER-এর মতো এসএমএস কমান্ডের তালিকা আছে।',
    en: 'With internet, the app connects to the cloud relay and live-syncs automatically — nothing to do.\nIf a laptop is running on the same Wi-Fi/hotspot, go to “Connection & offline sharing → Connect to local node”, then type its address or scan its QR.\nNo network at all? Use 🔦 Beam (QR) — hold two phones\' camera and screen facing each other to exchange events directly.\nCamera not working? Use 🔊 Chirp to send or listen for the latest check-in as sound.\nThe 📄 File card exports events to a .setu file you can send over Bluetooth, USB, or any messaging app, and import on another phone.\nFor anyone without a smartphone, the More page lists SMS commands like SAFE, HELP, MISSING, FOUND, FIND, and OFFER.',
  },

  manualCircleTitle: { bn: '৬. আমার সার্কেল তৈরি করুন', en: '6. Build your Circle' },
  manualCircleBody: {
    bn: 'সামনাসামনি দেখা হলে “আমার সার্কেল”-এ গিয়ে একে অপরের QR কোড স্ক্যান করুন — কোনো অ্যাকাউন্ট বা ফোন নম্বর লাগে না।\nসার্কেলে থাকা মানুষদের সর্বশেষ অবস্থা হোম স্ক্রিনে ও বোর্ডের “আমার সার্কেল” ফিল্টারে আলাদাভাবে দেখা যায়।\nযেকোনো সময় তালিকা থেকে কাউকে সরিয়ে দেওয়া যায়।',
    en: 'When you meet someone in person, open “My Circle” and scan each other\'s QR code — no account or phone number needed.\nCircle members\' latest status shows on the Home screen and in the Board\'s “My Circle” filter.\nYou can remove anyone from the list at any time.',
  },

  manualHistoryTitle: { bn: '৭. আমার ইতিহাস', en: '7. My history' },
  manualHistoryBody: {
    bn: '“আমার ইতিহাস”-এ আপনার পাঠানো প্রতিটি চেক-ইন, অনুরোধ ও রিপোর্ট থাকে — মেয়াদ শেষ হওয়ার পরেও।\nমেয়াদ শেষ হওয়া বা সমাধান হওয়া কোনো পোস্ট এখনো প্রাসঙ্গিক হলে “আবার প্রকাশ করুন” চেপে নতুন করে পাঠানো যায়।',
    en: '“My history” keeps every check-in, request, and report you\'ve ever sent — even after it expires.\nIf an expired or resolved post is still relevant, tap “Publish again” to send it fresh.',
  },

  manualMediaTitle: { bn: '৮. ছবি ও ভয়েস স্টোরেজ সামলানো', en: '8. Managing photo & voice storage' },
  manualMediaBody: {
    bn: 'ছবি ও ভয়েস নোট এই ফোনে ক্যাশ হিসেবে জমা থাকে যাতে অফলাইনেও খোলা যায়।\n“ছবি ও ভয়েস স্টোরেজ”-এ কতগুলো ফাইল কতটা জায়গা নিচ্ছে তা দেখা যায় এবং প্রয়োজনে সব একসাথে মুছে ফেলা যায়।\nক্যাশ মুছলেও স্বাক্ষরিত কথোপকথন ও ইতিহাস থেকে যায় — শুধু ফাইলটি আর অফলাইনে খোলা যাবে না।',
    en: 'Photos and voice notes are cached on this phone so they still open offline.\n“Media storage” shows how many files and how much space they use, and lets you delete them all at once.\nClearing the cache keeps the signed conversation and history — the file just won\'t open offline anymore.',
  },

  manualShareTitle: { bn: '৯. অন্যদের কাছে সেতু পৌঁছে দিন', en: '9. Install and share Setu' },
  manualShareBody: {
    bn: 'ব্রাউজারের ঠিকানা বারের ইনস্টল আইকনে চাপুন, অথবা “আরও → সেতু শেয়ার” থেকে লিংক পাঠান, যাতে অন্যরাও হোম স্ক্রিনে যোগ করতে পারে।\nএকবার ইনস্টল হয়ে গেলে অ্যাপটি ইন্টারনেট ছাড়াও খোলে ও কাজ করে — বারবার ডাউনলোডের দরকার হয় না।\nআইফোনে Safari-এর Share বোতাম চেপে “Add to Home Screen” বেছে নিতে হবে।',
    en: 'Tap the install icon in the browser address bar, or send the link from “More → Share Setu”, so others can add it to their home screen too.\nOnce installed, the app opens and works without internet — no repeated downloads needed.\nOn iPhone, tap Safari\'s Share button and choose “Add to Home Screen”.',
  },

  manualSettingsTitle: { bn: '১০. প্রোফাইল ও অ্যাক্সেসিবিলিটি', en: '10. Profile and accessibility' },
  manualSettingsBody: {
    bn: '“আরও → আমার প্রোফাইল”-এ গিয়ে নাম, জেলা ও এলাকা যেকোনো সময় বদলানো যায়।\nভাষা বদলাতে ওপরের ডান কোণের বাংলা/English বোতাম চাপুন।\nডার্ক মোড, ব্যাটারি সেভার, বড় লেখা ও রেসপন্ডার মোড — এই সবই “আরও” পাতার নিচের দিকে চালু/বন্ধ করা যায়।',
    en: 'Go to “More → My profile” to change your name, district, or area anytime.\nTap the বাংলা/English button in the top-right corner to switch language.\nDark mode, battery saver, large text, and responder mode all live near the bottom of the More page.',
  },

  manualMoreHint: {
    bn: 'আরও প্রশ্ন থাকলে “আরও” পাতার “সাধারণ প্রশ্ন” অংশ দেখুন, আর বিপর্যয়ের সময়ের করণীয় জানতে “জরুরি গাইড” খুলুন।',
    en: 'More questions? See “Common questions” on the More page, and open “Emergency guide” for what to do during a disaster.',
  },

  // Feature E - Storage persistence
  storageProtected: { bn: 'সংরক্ষণাগার: সুরক্ষিত (ব্রাউজার ডেটা মুছবে না)', en: 'Storage: protected' },
  storageBestEffort: { bn: 'সংরক্ষণাগার: সাধারণ (ব্রাউজার ডেটা মুছতে পারে)', en: 'Storage: best-effort (browser may reclaim it)' },

  // Feature B - Bluetooth / Quick share
  syncExportBluetoothHint: {
    bn: 'শেয়ার শিটের মাধ্যমে এটি ইন্টারনেট ছাড়াই পাঠানো যাবে — অন্য ফোনের অ্যান্ড্রয়েডে ব্লুটুথ বা Quick Share বেছে নিন।',
    en: "The share sheet can send this with no internet — choose Bluetooth or Quick Share on the other phone's Android.",
  },
  manualNoInternetTitle: { bn: 'ইন্টারনেট ছাড়া বোর্ড পাঠানো', en: 'Sending the board without internet' },
  manualNoInternetBody: {
    bn: '১. সিঙ্ক স্ক্রিনে গিয়ে ফাইল অংশে “রপ্তানি” চাপুন।\n২. শেয়ার অপশন থেকে Bluetooth বা Quick Share নির্বাচন করুন।\n৩. গ্রহণকারী ফাইলটি পেয়ে সেতুর মাধ্যমে খুলবেন বা সেতুতে শেয়ার করবেন।',
    en: '1. Go to Sync screen and tap file “Export”.\n2. Select Bluetooth or Quick Share from the share sheet.\n3. The receiver opens the file in Setu or shares the file to Setu.',
  },
  manualNoInternetStep1: { bn: '১. সিঙ্ক স্ক্রিনে গিয়ে ফাইল অংশে “রপ্তানি” চাপুন।', en: '1. Go to Sync screen and tap file “Export”.' },
  manualNoInternetStep2: { bn: '২. শেয়ার অপশন থেকে Bluetooth বা Quick Share নির্বাচন করুন।', en: '2. Select Bluetooth or Quick Share from the share sheet.' },
  manualNoInternetStep3: { bn: '৩. গ্রহণকারী ফাইলটি পেয়ে সেতুর মাধ্যমে খুলবেন বা সেতুতে শেয়ার করবেন।', en: '3. The receiver opens the file in Setu or shares the file to Setu.' },

  // Feature C - Courier model
  manualCourierTitle: { bn: 'আপনার ফোনই খবর পৌঁছে দেয়', en: 'Your phone carries the news' },
  manualCourierBody: {
    bn: 'কারো সাথে সিঙ্ক (QR বিম, শব্দ বা ফাইল) করলে সম্পূর্ণ বোর্ডের খবর আদান-প্রদান হয়। এক এলাকা থেকে অন্য এলাকায় হেঁটে সিঙ্ক করলেই সব খবর আপনার সাথে চলে যাবে — সরাসরি ইন্টারনেট বা যোগাযোগের প্রয়োজন নেই।',
    en: "Syncing with anyone — QR Beam, chirp, or file share — exchanges the whole board, both directions, so walking between two neighborhoods and syncing in each moves everyone's status with you; you do not need internet or a direct meeting between the two people.",
  },
  manualCourierExample: {
    bn: 'উদাহরণঃ সকালে ক খ-কে বিম করল; বিকালে নদী পার হয়ে খ গ-কে বিম করল; এখন গ জেনে গেল ক নিরাপদ আছে।',
    en: 'Example: A beams to B in the morning; B beams to C across the river in the evening; C now knows A is safe.',
  },
  manualCourierEncourage: { bn: 'অভ্যাসটি তৈরি করুন: যাদের পাশ দিয়ে যাবেন তাদের সাথে সিঙ্ক করুন।', en: 'Encourage the habit: sync with anyone you pass.' },
  syncCourierHint: { bn: 'প্রতিটি সিঙ্ক সবার নতুন তথ্য বহন করে — আপনিই নেটওয়ার্ক।', en: "Every sync carries everyone's updates — you are the network." },

  // Feature L - Loudspeaker broadcast
  chirpLoudspeakerTitle: { bn: '📢 মাইক/লাউডস্পিকার ব্রডকাস্ট', en: '📢 Loudspeaker broadcast' },
  chirpLoudspeakerHint: {
    bn: 'ফোনটি মাইকের সামনে ধরুন এবং ক্রমাগত শব্দ বাজিয়ে এলাকার সবার ফোনে আপডেট ছড়িয়ে দিন।',
    en: 'Hold phone to the PA microphone to broadcast updates to nearby phones.',
  },
  chirpLoudspeakerInstruction: {
    bn: 'প্রথমে ঘোষণা দিন যে মানুষ যেন সেতু -> সিঙ্ক -> চির্প -> শুনতে থাকুন খুলবেন। তারপর শব্দ বাজান।',
    en: 'Announce first that people should open Setu → Sync → Chirp → Listen. Then play continuous sound.',
  },
  manualLoudspeakerTitle: { bn: 'মাইক বা লাউডস্পিকারে শব্দ সম্প্রচার', en: 'Loudspeaker chirp broadcast' },
  manualLoudspeakerBody: {
    bn: 'মাইক বা লাউডস্পিকার দিয়ে শব্দ বাজিয়ে এক সাথে বহু ফোনে তথ্য পাঠানো যায়। প্রথমে সবাইকে সেতু অ্যাপ খুলে সিঙ্ক -> চির্প -> শুনতে বলুন। তারপর লাউডস্পিকার মোডে শব্দ বাজান।',
    en: 'Village PA systems and loudspeakers can broadcast chirps to many listening phones. Announce first that people should open Setu → Sync → Chirp → Listen, then play in loudspeaker mode.',
  },
  manualLoudspeakerCaveat: {
    bn: 'দ্রষ্টব্যঃ প্রবল বৃষ্টি, বাতাস বা জেনারেটরের প্রচণ্ড শব্দে সংযোগ ব্যাহত হতে পারে।',
    en: 'Note: Heavy rain, wind, or generator noise can defeat acoustic broadcast.',
  },

  // Feature H - Panic Mode
  panicTitle: { bn: 'জরুরি প্যানিক মোড', en: 'Panic Mode' },
  panicSubtitle: { bn: 'এক হাতে স্পর্শ করে আপনার অবস্থা আপডেট করুন', en: 'One-hand status update for emergencies' },
  panicSafe: { bn: 'নিরাপদ (SAFE)', en: 'SAFE' },
  panicHelp: { bn: 'সাহায্য চান (HELP)', en: 'NEED HELP' },
  panicMissing: { bn: 'নিখোঁজ ব্যক্তি (MISSING)', en: 'MISSING PERSON' },
  panicHoldToConfirm: { bn: 'নিশ্চিত করতে ধরে রাখুন', en: 'Hold to confirm' },
  panicSuccessMessage: { bn: 'অবস্থা সফলভাবে পাঠানো হয়েছে!', en: 'Status reported successfully!' },
  panicShortcutSafe: { bn: 'আমি নিরাপদ (প্যানিক)', en: "I'm SAFE (Panic)" },
  panicShortcutHelp: { bn: 'সাহায্য (প্যানিক)', en: 'Help (Panic)' },

  // Feature A - Web Share Target
  syncSharedReceived: { bn: 'শেয়ার মারফত গৃহীত', en: 'Received via share' },

  // Feature D - Printable Poster QR
  posterTitle: { bn: '🖨️ প্রিন্টযোগ্য পোস্টার (QR)', en: '🖨️ Printable Poster (QR)' },
  posterHint: { bn: 'একটি এলাকায় টাঙানোর জন্য পোস্টার প্রিন্ট করুন; যে কেউ স্ক্যান করে ইভেন্ট পাবে।', en: 'Print a static QR poster to tape on shelter walls; anyone scans it to ingest events.' },
  posterPrintButton: { bn: 'পোস্টার প্রিন্ট করুন', en: 'Print poster' },
  posterScanInstruction: { bn: 'সেতু অ্যাপ খুলুন → সিঙ্ক → বিম/স্ক্যান চাপুন', en: 'Open Setu app → Sync → Beam/Scan' },
  posterEventCount: { bn: 'এই পোস্টারে ইভেন্ট সংখ্যা:', en: 'Events on this poster:' },
  posterGeneratedAt: { bn: 'তৈরির সময়:', en: 'Generated at:' },

  // Feature J & K - Link Beam & Lifeboat
  linkBeamShareAction: { bn: 'লিংক হিসেবে শেয়ার করুন', en: 'Share as link' },
  linkBeamTitle: { bn: 'লিংক বিম (ইভেন্ট ইন লিংক)', en: 'Link Beam' },
  linkBeamIngesting: { bn: 'ইভেন্ট প্রক্রিয়া করা হচ্ছে...', en: 'Ingesting event...' },
  linkBeamSuccess: { bn: 'ইভেন্ট সফলভাবে গ্রহণ করা হয়েছে!', en: 'Event ingested successfully!' },
  linkBeamError: { bn: 'লিংকের ডেটা সঠিক নয় বা বিকৃত।', en: 'Link payload invalid or corrupted.' },
  lifeboatTitle: { bn: 'ব্যাটারি শেষ পর্যায় — আপনার স্থিতি হস্তান্তর করুন', en: 'Battery critical — hand off your status now' },
  lifeboatBody: { bn: 'ফোন বন্ধ হওয়ার আগে আপনার সর্বশেষ অবস্থা কাছের অন্য ফোনে হস্তান্তর করুন।', en: 'Before your battery runs out, show or share this QR code to a nearby phone.' },
  lifeboatDismiss: { bn: 'পরবর্তীতে', en: 'Dismiss' },

  // Feature I - Guest Identity
  guestModeActiveBanner: { bn: 'মেহমান মোড:', en: 'Guest:' },
  guestModeSwitchBack: { bn: 'মালিক মোডে ফিরুন', en: 'tap to switch back' },
  guestModeLendPhone: { bn: 'কারো কাছে ফোন ধার দিন (মেহমান মোড)', en: 'Lend this phone (Guest mode)' },
  guestModeHint: { bn: 'মেহমানের জন্য সাময়িক কি-পেয়ার তৈরি করবে যা মূল প্রোফাইলকে পরিবর্তন করবে না।', en: 'Generates a fresh temporary keypair for the borrower without altering your primary identity.' },

  // Feature F - NFC Tag Writer
  nfcWriteButton: { bn: 'NFC ট্যাগে নোড ঠিকানা লিখুন', en: 'Write node address to NFC tag' },
  nfcWritingPrompt: { bn: 'ফোনের পেছনে NFC ট্যাগ ধরুন...', en: 'Hold an NFC tag to the phone...' },
  nfcWriteSuccess: { bn: 'NFC ট্যাগে ঠিকানা সফলভাবে লেখা হয়েছে!', en: 'Node URL written to NFC tag successfully!' },
  nfcWriteFailure: { bn: 'NFC ট্যাগে লিখতে ব্যর্থ হয়েছে।', en: 'Failed to write to NFC tag.' },

  // Feature G - WebRTC Hotspot Sync
  webrtcSyncTitle: { bn: 'সরাসরি WebRTC সিঙ্ক (হটস্পট)', en: 'Direct WebRTC sync (Hotspot)' },
  webrtcSyncHint: { bn: 'একই হটস্পটে থাকা দুই ফোনের মধ্যে কোনো ল্যাপটপ ছাড়াই সিঙ্ক করুন।', en: 'Sync two phones directly over one hotspot with no laptop.' },
  webrtcShowOffer: { bn: 'অফার QR দেখান', en: 'Show offer QR' },
  webrtcScanOffer: { bn: 'অফার QR স্ক্যান করুন', en: 'Scan offer QR' },
  webrtcShowAnswer: { bn: 'উত্তর QR দেখান', en: 'Show answer QR' },
  webrtcScanAnswer: { bn: 'উত্তর QR স্ক্যান করুন', en: 'Scan answer QR' },
} as const satisfies Record<string, Entry>;

export type DictKey = keyof typeof dict;
