/**
 * Seed data for `?demo=1` / the onboarding "Try the demo" button — ~16
 * realistic events so first-time (often anonymous, Facebook-referred)
 * visitors land on a living board instead of an empty one.
 *
 * All but one event are signed here, on the visitor's own device, with
 * throwaway keypairs generated on the spot — exactly like any other Setu
 * event, just synthetic. The one verified bulletin is a fixed, pre-signed
 * literal: it must be signed by the real pinned demo-publisher key
 * (see shared/src/publishers.ts) so it renders the ✓ badge, and that secret
 * must never ship in application code. It carries a 5-year ttl so the
 * pre-baked timestamp never goes stale.
 */
import {
  createEvent,
  findAreaByCode,
  generateKeypair,
  type NewEventInput,
  type SetuEvent,
} from '@setu/shared';

const MIRPUR = findAreaByCode('mirpur')!;
const FENI = findAreaByCode('feni')!;
const SYLHET = findAreaByCode('sylhet')!;

/** Pre-signed by the real pinned demo-publisher key; id doubles as the idempotency marker below. */
const VERIFIED_BULLETIN: SetuEvent = {
  v: 1,
  t: 'bulletin',
  ts: 1785278940,
  ttl: 157680000, // 5 years
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

function signed(nowSec: number, ageSec: number, input: Omit<NewEventInput, 'ts'>): SetuEvent {
  return createEvent({ ...input, ts: nowSec - ageSec }, generateKeypair());
}

const HOUR = 3600;
const MIN = 60;

/** Build the full demo event set, timestamped relative to `nowSec`. */
export function buildDemoEvents(nowSec: number = Math.floor(Date.now() / 1000)): SetuEvent[] {
  return [
    VERIFIED_BULLETIN,

    signed(nowSec, 30 * MIN, {
      t: 'bulletin',
      gh: FENI.gh,
      n: 'উদ্বিগ্ন প্রতিবেশী',
      msg: 'শোনা যাচ্ছে ফেনীতে বাঁধ ভেঙে গেছে — এখনো নিশ্চিত তথ্য নেই, যাচাই করা হচ্ছে।',
      src: 'app',
    }),

    signed(nowSec, 2 * HOUR, {
      t: 'checkin', gh: MIRPUR.gh, n: 'রহিম উদ্দিন', st: 'safe', src: 'app',
    }),
    signed(nowSec, 5 * HOUR, {
      t: 'checkin', gh: MIRPUR.gh, n: 'করিম মোল্লা', st: 'safe', src: 'app',
    }),
    signed(nowSec, 40 * MIN, {
      t: 'help', gh: MIRPUR.gh, n: 'আয়েশা বেগম', st: 'need', cat: 'water',
      msg: 'খাবার পানি ফুরিয়ে গেছে।', src: 'app',
    }),
    signed(nowSec, 3 * HOUR, {
      t: 'help', gh: MIRPUR.gh, n: 'নাজমুল হক', st: 'need', cat: 'shelter',
      msg: 'ঘর ক্ষতিগ্রস্ত হয়েছে, আশ্রয় দরকার।', src: 'app',
    }),

    signed(nowSec, 1 * HOUR, {
      t: 'checkin', gh: FENI.gh, n: 'সালমা খাতুন', st: 'safe', src: 'app',
    }),
    signed(nowSec, 20 * MIN, {
      t: 'help', gh: FENI.gh, n: 'জসিম উদ্দিন', st: 'need', cat: 'rescue',
      msg: 'পানি বাড়ছে, দ্রুত উদ্ধার দরকার।',
      loc: [Number(FENI.lat.toFixed(3)), Number(FENI.lng.toFixed(3))],
      src: 'app',
    }),
    signed(nowSec, 4 * HOUR, {
      t: 'help', gh: FENI.gh, n: 'শরিফুল ইসলাম', st: 'need', cat: 'food', src: 'app',
    }),

    signed(nowSec, 6 * HOUR, {
      t: 'checkin', gh: SYLHET.gh, n: 'নাসরিন আক্তার', st: 'safe', src: 'app',
    }),
    signed(nowSec, 50 * MIN, {
      t: 'help', gh: SYLHET.gh, n: 'হাবিবুর রহমান', st: 'need', cat: 'med',
      msg: 'ওষুধ দরকার, বয়স্ক ব্যক্তি অসুস্থ।', src: 'app',
    }),
    signed(nowSec, 8 * HOUR, {
      t: 'checkin', gh: SYLHET.gh, n: 'ফরিদা ইয়াসমিন', st: 'safe', src: 'app',
    }),
    signed(nowSec, 3 * HOUR, {
      t: 'checkin', gh: SYLHET.gh, n: 'রুপা চৌধুরী', st: 'safe', src: 'app',
    }),

    // Gateway-attested: reads exactly like a real SMS check-in from a button phone.
    signed(nowSec, 1 * HOUR, {
      t: 'checkin', gh: MIRPUR.gh, n: 'আব্দুল করিম', st: 'safe', src: 'sms',
    }),

    signed(nowSec, 7 * HOUR, {
      t: 'person', gh: FENI.gh, pn: 'মিতু আক্তার', pst: 'missing',
      msg: 'গতকাল থেকে খোঁজ পাওয়া যাচ্ছে না।', src: 'app',
    }),
    signed(nowSec, 2 * HOUR, {
      t: 'person', gh: SYLHET.gh, pn: 'জাহাঙ্গীর আলম', pst: 'found',
      msg: 'নিরাপদে পাওয়া গেছে, পরিবারের সাথে আছেন।', src: 'app',
    }),
  ];
}

/** True when this store already holds the demo seed (avoids re-injecting on repeat visits). */
export function hasDemoSeed(events: readonly SetuEvent[]): boolean {
  return events.some((e) => e.id === DEMO_BULLETIN_ID);
}
