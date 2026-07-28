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
  connOffline: { bn: 'অফলাইন — স্বাভাবিক, স্থানীয় ডেটা নিরাপদ', en: 'Offline — normal, your data is safe locally' },

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
