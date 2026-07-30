import { geohashEncode } from './geohash.js';

export type Area = {
  /** stable slug, used in URLs and as a match key */
  code: string;
  /** English name */
  name: string;
  /** Bangla name */
  bn: string;
  lat: number;
  lng: number;
  /** precomputed geohash prefix, precision 6 */
  gh: string;
};

type AreaSeed = Omit<Area, 'gh'>;

// The 64 districts of Bangladesh, plus a handful of well-known Dhaka/Chattogram
// thanas that show up constantly in disaster reporting (so "Mirpur" resolves to
// something more specific than all of Dhaka). Coordinates are district/thana HQ
// approximations -- fine for a precision-6 geohash "area" bucket. (Precision 4
// looked like the natural choice for a ~20km "area" cell, but several of these
// city thanas sit only a few km apart and collapsed onto the same precision-4/5
// cell -- e.g. mirpur/uttara/gulshan/dhanmondi/mohammadpur/badda/khilgaon/
// rampura/motijheel all shared one precision-4 cell. Precision 6 (~1.2km x
// 0.6km) is the coarsest precision with zero collisions across this table.)
const SEEDS: AreaSeed[] = [
  // Dhaka division
  { code: 'dhaka', name: 'Dhaka', bn: 'ঢাকা', lat: 23.7104, lng: 90.4074 },
  { code: 'faridpur', name: 'Faridpur', bn: 'ফরিদপুর', lat: 23.6070, lng: 89.8429 },
  { code: 'gazipur', name: 'Gazipur', bn: 'গাজীপুর', lat: 23.9999, lng: 90.4203 },
  { code: 'gopalganj', name: 'Gopalganj', bn: 'গোপালগঞ্জ', lat: 23.0050, lng: 89.8266 },
  { code: 'kishoreganj', name: 'Kishoreganj', bn: 'কিশোরগঞ্জ', lat: 24.4449, lng: 90.7766 },
  { code: 'madaripur', name: 'Madaripur', bn: 'মাদারীপুর', lat: 23.1641, lng: 90.1897 },
  { code: 'manikganj', name: 'Manikganj', bn: 'মানিকগঞ্জ', lat: 23.8644, lng: 90.0047 },
  { code: 'munshiganj', name: 'Munshiganj', bn: 'মুন্সিগঞ্জ', lat: 23.5422, lng: 90.5305 },
  { code: 'narayanganj', name: 'Narayanganj', bn: 'নারায়ণগঞ্জ', lat: 23.6238, lng: 90.5000 },
  { code: 'narsingdi', name: 'Narsingdi', bn: 'নরসিংদী', lat: 23.9322, lng: 90.7150 },
  { code: 'rajbari', name: 'Rajbari', bn: 'রাজবাড়ী', lat: 23.7574, lng: 89.6444 },
  { code: 'shariatpur', name: 'Shariatpur', bn: 'শরীয়তপুর', lat: 23.2423, lng: 90.4348 },
  { code: 'tangail', name: 'Tangail', bn: 'টাঙ্গাইল', lat: 24.2513, lng: 89.9167 },

  // Chattogram division
  { code: 'bandarban', name: 'Bandarban', bn: 'বান্দরবান', lat: 22.1953, lng: 92.2184 },
  { code: 'brahmanbaria', name: 'Brahmanbaria', bn: 'ব্রাহ্মণবাড়িয়া', lat: 23.9571, lng: 91.1119 },
  { code: 'chandpur', name: 'Chandpur', bn: 'চাঁদপুর', lat: 23.2332, lng: 90.6712 },
  { code: 'chattogram', name: 'Chattogram', bn: 'চট্টগ্রাম', lat: 22.3569, lng: 91.7832 },
  { code: 'cumilla', name: 'Cumilla', bn: 'কুমিল্লা', lat: 23.4607, lng: 91.1809 },
  { code: 'coxsbazar', name: "Cox's Bazar", bn: 'কক্সবাজার', lat: 21.4272, lng: 92.0058 },
  { code: 'feni', name: 'Feni', bn: 'ফেনী', lat: 23.0159, lng: 91.3976 },
  { code: 'khagrachhari', name: 'Khagrachhari', bn: 'খাগড়াছড়ি', lat: 23.1193, lng: 91.9847 },
  { code: 'lakshmipur', name: 'Lakshmipur', bn: 'লক্ষ্মীপুর', lat: 22.9426, lng: 90.8281 },
  { code: 'noakhali', name: 'Noakhali', bn: 'নোয়াখালী', lat: 22.8696, lng: 91.0995 },
  { code: 'rangamati', name: 'Rangamati', bn: 'রাঙ্গামাটি', lat: 22.7324, lng: 92.2985 },

  // Rajshahi division
  { code: 'bogura', name: 'Bogura', bn: 'বগুড়া', lat: 24.8465, lng: 89.3773 },
  { code: 'joypurhat', name: 'Joypurhat', bn: 'জয়পুরহাট', lat: 25.0968, lng: 89.0227 },
  { code: 'naogaon', name: 'Naogaon', bn: 'নওগাঁ', lat: 24.7936, lng: 88.9318 },
  { code: 'natore', name: 'Natore', bn: 'নাটোর', lat: 24.4206, lng: 88.9954 },
  { code: 'chapainawabganj', name: 'Chapainawabganj', bn: 'চাঁপাইনবাবগঞ্জ', lat: 24.5965, lng: 88.2775 },
  { code: 'pabna', name: 'Pabna', bn: 'পাবনা', lat: 23.9985, lng: 89.2372 },
  { code: 'rajshahi', name: 'Rajshahi', bn: 'রাজশাহী', lat: 24.3745, lng: 88.6042 },
  { code: 'sirajganj', name: 'Sirajganj', bn: 'সিরাজগঞ্জ', lat: 24.4533, lng: 89.7006 },

  // Khulna division
  { code: 'bagerhat', name: 'Bagerhat', bn: 'বাগেরহাট', lat: 22.6602, lng: 89.7895 },
  { code: 'chuadanga', name: 'Chuadanga', bn: 'চুয়াডাঙ্গা', lat: 23.6402, lng: 88.8412 },
  { code: 'jashore', name: 'Jashore', bn: 'যশোর', lat: 23.1667, lng: 89.2167 },
  { code: 'jhenaidah', name: 'Jhenaidah', bn: 'ঝিনাইদহ', lat: 23.5450, lng: 89.1539 },
  { code: 'khulna', name: 'Khulna', bn: 'খুলনা', lat: 22.8456, lng: 89.5403 },
  { code: 'kushtia', name: 'Kushtia', bn: 'কুষ্টিয়া', lat: 23.9013, lng: 89.1206 },
  { code: 'magura', name: 'Magura', bn: 'মাগুরা', lat: 23.4873, lng: 89.4198 },
  { code: 'meherpur', name: 'Meherpur', bn: 'মেহেরপুর', lat: 23.7622, lng: 88.6318 },
  { code: 'narail', name: 'Narail', bn: 'নড়াইল', lat: 23.1725, lng: 89.5126 },
  { code: 'satkhira', name: 'Satkhira', bn: 'সাতক্ষীরা', lat: 22.7085, lng: 89.0714 },

  // Barisal division
  { code: 'barguna', name: 'Barguna', bn: 'বরগুনা', lat: 22.0953, lng: 90.1121 },
  { code: 'barisal', name: 'Barisal', bn: 'বরিশাল', lat: 22.7010, lng: 90.3535 },
  { code: 'bhola', name: 'Bhola', bn: 'ভোলা', lat: 22.6859, lng: 90.6482 },
  { code: 'jhalokati', name: 'Jhalokati', bn: 'ঝালকাঠি', lat: 22.6406, lng: 90.1987 },
  { code: 'patuakhali', name: 'Patuakhali', bn: 'পটুয়াখালী', lat: 22.3596, lng: 90.3296 },
  { code: 'pirojpur', name: 'Pirojpur', bn: 'পিরোজপুর', lat: 22.5841, lng: 89.9720 },

  // Sylhet division
  { code: 'habiganj', name: 'Habiganj', bn: 'হবিগঞ্জ', lat: 24.3745, lng: 91.4155 },
  { code: 'moulvibazar', name: 'Moulvibazar', bn: 'মৌলভীবাজার', lat: 24.4829, lng: 91.7774 },
  { code: 'sunamganj', name: 'Sunamganj', bn: 'সুনামগঞ্জ', lat: 25.0658, lng: 91.3950 },
  { code: 'sylhet', name: 'Sylhet', bn: 'সিলেট', lat: 24.8949, lng: 91.8687 },

  // Rangpur division
  { code: 'dinajpur', name: 'Dinajpur', bn: 'দিনাজপুর', lat: 25.6217, lng: 88.6354 },
  { code: 'gaibandha', name: 'Gaibandha', bn: 'গাইবান্ধা', lat: 25.3288, lng: 89.5285 },
  { code: 'kurigram', name: 'Kurigram', bn: 'কুড়িগ্রাম', lat: 25.8054, lng: 89.6362 },
  { code: 'lalmonirhat', name: 'Lalmonirhat', bn: 'লালমনিরহাট', lat: 25.9923, lng: 89.2847 },
  { code: 'nilphamari', name: 'Nilphamari', bn: 'নীলফামারী', lat: 25.9317, lng: 88.8560 },
  { code: 'panchagarh', name: 'Panchagarh', bn: 'পঞ্চগড়', lat: 26.3411, lng: 88.5541 },
  { code: 'rangpur', name: 'Rangpur', bn: 'রংপুর', lat: 25.7439, lng: 89.2752 },
  { code: 'thakurgaon', name: 'Thakurgaon', bn: 'ঠাকুরগাঁও', lat: 26.0336, lng: 88.4616 },

  // Mymensingh division
  { code: 'jamalpur', name: 'Jamalpur', bn: 'জামালপুর', lat: 24.9375, lng: 89.9372 },
  { code: 'mymensingh', name: 'Mymensingh', bn: 'ময়মনসিংহ', lat: 24.7471, lng: 90.4203 },
  { code: 'netrokona', name: 'Netrokona', bn: 'নেত্রকোনা', lat: 24.8709, lng: 90.7276 },
  { code: 'sherpur', name: 'Sherpur', bn: 'শেরপুর', lat: 25.0204, lng: 90.0153 },

  // Dhaka city thanas (frequent in crisis reporting, so they get their own geohash)
  { code: 'mirpur', name: 'Mirpur', bn: 'মিরপুর', lat: 23.8223, lng: 90.3654 },
  { code: 'uttara', name: 'Uttara', bn: 'উত্তরা', lat: 23.8759, lng: 90.3795 },
  { code: 'gulshan', name: 'Gulshan', bn: 'গুলশান', lat: 23.7925, lng: 90.4078 },
  { code: 'dhanmondi', name: 'Dhanmondi', bn: 'ধানমন্ডি', lat: 23.7461, lng: 90.3742 },
  { code: 'mohammadpur', name: 'Mohammadpur', bn: 'মোহাম্মদপুর', lat: 23.7656, lng: 90.3587 },
  { code: 'jatrabari', name: 'Jatrabari', bn: 'যাত্রাবাড়ী', lat: 23.7104, lng: 90.4331 },
  { code: 'badda', name: 'Badda', bn: 'বাড্ডা', lat: 23.7809, lng: 90.4265 },
  { code: 'khilgaon', name: 'Khilgaon', bn: 'খিলগাঁও', lat: 23.7529, lng: 90.4257 },
  { code: 'rampura', name: 'Rampura', bn: 'রামপুরা', lat: 23.7580, lng: 90.4256 },
  { code: 'lalbagh', name: 'Lalbagh', bn: 'লালবাগ', lat: 23.7188, lng: 90.3888 },
  { code: 'motijheel', name: 'Motijheel', bn: 'মতিঝিল', lat: 23.7333, lng: 90.4172 },

  // Chattogram city thanas
  { code: 'pahartali', name: 'Pahartali', bn: 'পাহাড়তলী', lat: 22.3667, lng: 91.8000 },
  { code: 'kotwali-ctg', name: 'Kotwali (Ctg)', bn: 'কোতোয়ালী', lat: 22.3350, lng: 91.8320 },
  { code: 'agrabad', name: 'Agrabad', bn: 'আগ্রাবাদ', lat: 22.3260, lng: 91.8130 },
];

export const AREAS: Area[] = SEEDS.map((s) => ({ ...s, gh: geohashEncode(s.lat, s.lng, 6) }));

/** Bangladesh's 64 administrative districts (city/thana entries follow them in AREAS). */
export const DISTRICTS: readonly Area[] = AREAS.slice(0, 64);

const BY_CODE = new Map(AREAS.map((a) => [a.code, a]));

export function findAreaByCode(code: string): Area | undefined {
  return BY_CODE.get(code);
}

const BY_GH = new Map(AREAS.map((a) => [a.gh, a]));

/** Exact reverse lookup: the seed area whose precomputed geohash matches an event's `gh`. */
export function findAreaByGh(gh: string): Area | undefined {
  return gh ? BY_GH.get(gh) : undefined;
}

/** Case/diacritic-loose search across English name, Bangla name, and code. */
export function searchAreas(query: string): Area[] {
  const q = query.trim().toLowerCase();
  if (!q) return AREAS;
  return AREAS.filter(
    (a) => a.name.toLowerCase().includes(q) || a.bn.includes(query.trim()) || a.code.includes(q),
  );
}

/**
 * Best-effort free-text area match, used by SMS parsing where the sender
 * typed a bare word after a name (e.g. "SAFE Rahim Mirpur"). Matches on
 * exact/prefix of English name, Bangla name, or code. Returns '' (unknown)
 * geohash when nothing matches.
 */
export function matchAreaLoose(text: string): Area | undefined {
  const q = text.trim().toLowerCase();
  if (!q) return undefined;
  return (
    AREAS.find((a) => a.name.toLowerCase() === q || a.code === q || a.bn === text.trim()) ??
    AREAS.find((a) => a.name.toLowerCase().startsWith(q) || a.code.startsWith(q))
  );
}
