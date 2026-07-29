/**
 * Seed data for `?demo=1` / the onboarding "Try the demo" button — ~16
 * realistic events so first-time (often anonymous, Facebook-referred)
 * visitors land on a living board instead of an empty one.
 *
 * All but one event are signed here, on the visitor's own device, with a pool
 * of fixed demo keypairs — exactly like any other Setu event, just synthetic.
 * Each synthetic event gets its *own* key so the per-author board dedup (see
 * views.ts personKey) still shows them as distinct people; deriving the pool
 * from fixed seeds just makes the author set known (DEMO_AUTHORS), which lets
 * the sync layer recognize demo events and keep them strictly on-device (see
 * isDemoEvent + the syncStore hooks) — a public demo URL must never push
 * per-visitor demo noise onto the shared relay. The one verified bulletin is a
 * fixed, pre-signed literal signed by the real pinned demo-publisher key (see
 * shared/src/publishers.ts) so it renders the ✓ badge; that secret must never
 * ship in application code. It carries a 5-year ttl so the pre-baked timestamp
 * never goes stale, and isDemoEvent matches it by id.
 */
import {
  createEvent,
  findAreaByCode,
  publicKeyFromSecret,
  pubkeyToAuthor,
  sha256Bytes,
  type Keypair,
  type NewEventInput,
  type SetuEvent,
} from '@setu/shared';

// A pool of distinct, deterministic demo keypairs — one per synthetic event.
// Throwaway data with no security role: each demo "person" needs its own author
// key so views.ts groups them as separate cards (exactly as unique per-event
// throwaway keys did before), while deriving from fixed seeds makes the author
// set stable and enumerable so sync can exclude it. A hashed label yields a
// valid 32-byte ed25519 seed per index.
function demoKeypair(index: number): Keypair {
  const secretKey = sha256Bytes(new TextEncoder().encode(`setu-demo-seed-v1:${index}`));
  return { secretKey, publicKey: publicKeyFromSecret(secretKey) };
}
const DEMO_KEYPAIRS: Keypair[] = Array.from({ length: 16 }, (_, i) => demoKeypair(i));

/** Author keys of every synthetic demo event (never a real user's key). */
export const DEMO_AUTHORS: ReadonlySet<string> = new Set(
  DEMO_KEYPAIRS.map((kp) => pubkeyToAuthor(kp.publicKey)),
);

const MIRPUR = findAreaByCode('mirpur')!;
const FENI = findAreaByCode('feni')!;
const SYLHET = findAreaByCode('sylhet')!;

/** Pre-signed by the real pinned demo-publisher key; id doubles as the idempotency marker below. */
const VERIFIED_BULLETIN: SetuEvent = {
  v: 1,
  t: 'bulletin',
  ts: 1785278940,
  ttl: 157680000, // Synthetic local fixture; never reaches an ingest trust boundary.
  gh: MIRPUR.gh,
  n: 'Setu Emergency Coordination',
  msg: 'মিরপুরে অস্থায়ী আশ্রয়কেন্দ্র খোলা হয়েছে — মিরপুর ১০ নং গোল চত্বরে। খাবার ও বিশুদ্ধ পানি সরবরাহ চলছে।',
  src: 'app',
  au: 'uxqNicQzfR99CtZR4A1kVcn9bTkQAnuoZMEry0E1AYs',
  id: 'drNkEdIEOz7mEEvoyLbPEA',
  sig: 'iVA2ARsZjPa6h-cmUVGfxZZIvkNnW6OumwhQ4k62JITVJmIRy-jx05i1db45TG-GUdzz0ggSs1xHFawqwV37AQ',
};

/** Marker used to detect a demo seed already loaded in the local store. */
export const DEMO_BULLETIN_ID = VERIFIED_BULLETIN.id;

const HOUR = 3600;
const MIN = 60;

/** Build the full demo event set, timestamped relative to `nowSec`. */
export function buildDemoEvents(nowSec: number = Math.floor(Date.now() / 1000)): SetuEvent[] {
  // Hand each synthetic event the next key in the fixed pool, so authors are
  // distinct (separate board cards) yet stable across calls and devices.
  let next = 0;
  const signed = (ageSec: number, input: Omit<NewEventInput, 'ts'>): SetuEvent =>
    createEvent({ ...input, ts: nowSec - ageSec }, DEMO_KEYPAIRS[next++]!);

  return [
    VERIFIED_BULLETIN,

    signed(30 * MIN, {
      t: 'bulletin',
      gh: FENI.gh,
      n: 'উদ্বিগ্ন প্রতিবেশী',
      msg: 'শোনা যাচ্ছে ফেনীতে বাঁধ ভেঙে গেছে — এখনো নিশ্চিত তথ্য নেই, যাচাই করা হচ্ছে।',
      src: 'app',
    }),

    signed(2 * HOUR, {
      t: 'checkin', gh: MIRPUR.gh, n: 'রহিম উদ্দিন', st: 'safe', src: 'app',
    }),
    signed(5 * HOUR, {
      t: 'checkin', gh: MIRPUR.gh, n: 'করিম মোল্লা', st: 'safe', src: 'app',
    }),
    signed(40 * MIN, {
      t: 'help', gh: MIRPUR.gh, n: 'আয়েশা বেগম', st: 'need', cat: 'water',
      msg: 'খাবার পানি ফুরিয়ে গেছে।', src: 'app',
    }),
    signed(3 * HOUR, {
      t: 'help', gh: MIRPUR.gh, n: 'নাজমুল হক', st: 'need', cat: 'shelter',
      msg: 'ঘর ক্ষতিগ্রস্ত হয়েছে, আশ্রয় দরকার।', src: 'app',
    }),

    signed(1 * HOUR, {
      t: 'checkin', gh: FENI.gh, n: 'সালমা খাতুন', st: 'safe', src: 'app',
    }),
    signed(20 * MIN, {
      t: 'help', gh: FENI.gh, n: 'জসিম উদ্দিন', st: 'need', cat: 'rescue',
      msg: 'পানি বাড়ছে, দ্রুত উদ্ধার দরকার।',
      loc: [Number(FENI.lat.toFixed(3)), Number(FENI.lng.toFixed(3))],
      src: 'app',
    }),
    signed(4 * HOUR, {
      t: 'help', gh: FENI.gh, n: 'শরিফুল ইসলাম', st: 'need', cat: 'food', src: 'app',
    }),

    signed(6 * HOUR, {
      t: 'checkin', gh: SYLHET.gh, n: 'নাসরিন আক্তার', st: 'safe', src: 'app',
    }),
    signed(50 * MIN, {
      t: 'help', gh: SYLHET.gh, n: 'হাবিবুর রহমান', st: 'need', cat: 'med',
      msg: 'ওষুধ দরকার, বয়স্ক ব্যক্তি অসুস্থ।', src: 'app',
    }),
    signed(8 * HOUR, {
      t: 'checkin', gh: SYLHET.gh, n: 'ফরিদা ইয়াসমিন', st: 'safe', src: 'app',
    }),
    signed(3 * HOUR, {
      t: 'checkin', gh: SYLHET.gh, n: 'রুপা চৌধুরী', st: 'safe', src: 'app',
    }),

    // Gateway-attested: reads exactly like a real SMS check-in from a button phone.
    signed(1 * HOUR, {
      t: 'checkin', gh: MIRPUR.gh, n: 'আব্দুল করিম', st: 'safe', src: 'sms',
    }),

    signed(7 * HOUR, {
      t: 'person', gh: FENI.gh, pn: 'মিতু আক্তার', pst: 'missing',
      msg: 'গতকাল থেকে খোঁজ পাওয়া যাচ্ছে না।', src: 'app',
    }),
    signed(2 * HOUR, {
      t: 'person', gh: SYLHET.gh, pn: 'জাহাঙ্গীর আলম', pst: 'found',
      msg: 'নিরাপদে পাওয়া গেছে, পরিবারের সাথে আছেন।', src: 'app',
    }),
  ];
}

/** True when this store already holds the demo seed (avoids re-injecting on repeat visits). */
export function hasDemoSeed(events: readonly SetuEvent[]): boolean {
  return events.some((e) => e.id === DEMO_BULLETIN_ID);
}

/**
 * True for any event that belongs to the local demo seed — either a synthetic
 * event signed by one of the pooled demo keys, or the pre-signed verified
 * bulletin (matched by its fixed id, since it carries the real publisher key).
 * The sync layer excludes these so demo content stays on-device and never
 * advertises to, uploads onto, or broadcasts through the shared relay. A real
 * bulletin signed by the same publisher key has a different id and syncs
 * normally.
 */
export function isDemoEvent(event: SetuEvent): boolean {
  return DEMO_AUTHORS.has(event.au) || event.id === DEMO_BULLETIN_ID;
}
