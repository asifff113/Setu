/**
 * SMS bridge grammar (Phase 7). Pure, dependency-free parsing + reply
 * formatting so it runs identically in tests and on the relay. The relay turns
 * a parsed {@link SmsCommand} into a signed `src:'sms'` SetuEvent (or an SMS
 * reply); nothing here touches the network or the keypair.
 *
 * Grammar (keyword case-insensitive, Bangla digits tolerated):
 *
 *   SAFE <name> [area]
 *   HELP <MED|RESCUE|FOOD|WATER|SHELTER> <name> [area] [- <message>]
 *   MISSING <name> [area]
 *   FOUND <name> [area]
 *   DONE <name>                        → resolves latest open SMS help case
 *   OFFER <category> <name> [area] [- <message>]
 *   FIND <name>                       → query, no event; relay replies by SMS
 *   (anything else)                   → usage help reply
 *
 * The `[area]` is greedy-from-the-right: a trailing token (or last two tokens)
 * is peeled off as the area only if it resolves to a known Bangladeshi area AND
 * at least one token is left for the name. Unknown trailing words stay part of
 * the name rather than being silently dropped, and `gh:''` (unknown) is used.
 */
import { type Area, matchAreaLoose, findAreaByGh } from './areas.js';
import type { SetuCategory, SetuEvent } from './types.js';

/** A parsed SMS command. `unknown` triggers the usage-help reply. */
export type SmsCommand =
  | { kind: 'checkin'; name: string; area?: Area }
  | { kind: 'help'; name: string; area?: Area; cat: SetuCategory; msg?: string }
  | { kind: 'person'; name: string; area?: Area; pst: 'missing' | 'found' }
  | { kind: 'done'; name: string }
  | { kind: 'offer'; name: string; area?: Area; cat: SetuCategory; msg?: string }
  | { kind: 'find'; name: string }
  | { kind: 'unknown' };

const BN_DIGITS: Record<string, string> = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
};

/** Map Bangla numerals (০-৯) to ASCII digits; leaves everything else intact. */
export function normalizeBanglaDigits(text: string): string {
  return text.replace(/[০-৯]/g, (d) => BN_DIGITS[d] ?? d);
}

const CATEGORIES: Record<string, SetuCategory> = {
  MED: 'med',
  RESCUE: 'rescue',
  FOOD: 'food',
  WATER: 'water',
  SHELTER: 'shelter',
  OTHER: 'other',
};

function tokenize(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

/**
 * Split trailing "- message" off a HELP body. Only a dash with whitespace
 * before it delimits the message, so hyphenated names ("Abdul-Karim") survive.
 */
function splitMessage(rest: string): { head: string; msg?: string } {
  const m = rest.match(/\s-\s?([\s\S]*)$/);
  if (m && m.index !== undefined) {
    const msg = (m[1] ?? '').trim();
    return { head: rest.slice(0, m.index).trim(), msg: msg || undefined };
  }
  return { head: rest.trim() };
}

/**
 * Split "<name> [area]" tokens: peel the last one or two tokens as the area if
 * they resolve to a known area and leave at least one token for the name.
 */
function splitNameArea(tokens: string[]): { name: string; area?: Area } {
  if (tokens.length >= 3) {
    const two = matchAreaLoose(tokens.slice(-2).join(' '));
    if (two) return { name: tokens.slice(0, -2).join(' '), area: two };
  }
  if (tokens.length >= 2) {
    const last = tokens[tokens.length - 1];
    const one = last ? matchAreaLoose(last) : undefined;
    if (one) return { name: tokens.slice(0, -1).join(' '), area: one };
  }
  return { name: tokens.join(' ') };
}

/** Parse one inbound SMS body into a command. Never throws. */
export function parseSms(input: string): SmsCommand {
  const text = normalizeBanglaDigits(input).trim();
  if (!text) return { kind: 'unknown' };

  const sp = text.search(/\s/);
  const keyword = (sp === -1 ? text : text.slice(0, sp)).toUpperCase();
  const rest = sp === -1 ? '' : text.slice(sp + 1).trim();

  switch (keyword) {
    case 'SAFE': {
      const { name, area } = splitNameArea(tokenize(rest));
      return name ? { kind: 'checkin', name, area } : { kind: 'unknown' };
    }
    case 'HELP':
    case 'OFFER': {
      const { head, msg } = splitMessage(rest);
      const tokens = tokenize(head);
      // Category is optional-friendly: consume a leading category keyword if
      // present, otherwise default to 'other' so a panicked "HELP Rahim" still
      // registers as a request for help rather than falling through to usage.
      let cat: SetuCategory = 'other';
      const first = tokens[0];
      if (first && CATEGORIES[first.toUpperCase()]) {
        cat = CATEGORIES[first.toUpperCase()]!;
        tokens.shift();
      }
      const { name, area } = splitNameArea(tokens);
      return name
        ? { kind: keyword === 'OFFER' ? 'offer' : 'help', name, area, cat, msg }
        : { kind: 'unknown' };
    }
    case 'MISSING':
    case 'FOUND': {
      const { name, area } = splitNameArea(tokenize(rest));
      const pst = keyword === 'MISSING' ? 'missing' : 'found';
      return name ? { kind: 'person', name, area, pst } : { kind: 'unknown' };
    }
    case 'FIND': {
      const name = rest.trim();
      return name ? { kind: 'find', name } : { kind: 'unknown' };
    }
    case 'DONE': {
      const name = rest.trim();
      return name ? { kind: 'done', name } : { kind: 'unknown' };
    }
    default:
      return { kind: 'unknown' };
  }
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Latest known event for a person by display name, across their own check-ins
 * (`n`) and any missing/found reports about them (`pn`). Newest by `ts`, with
 * the content-hash id as a stable tie-break — used to answer `FIND`.
 */
export function findLatestForName(
  events: readonly SetuEvent[],
  name: string,
): SetuEvent | undefined {
  const q = normalizeName(name);
  if (!q) return undefined;
  let best: SetuEvent | undefined;
  for (const e of events) {
    const hit =
      ((e.t === 'checkin' || e.t === 'help') && normalizeName(e.n ?? '') === q) ||
      (e.t === 'person' && normalizeName(e.pn ?? '') === q);
    if (!hit) continue;
    if (!best || e.ts > best.ts || (e.ts === best.ts && e.id > best.id)) best = e;
  }
  return best;
}

/** Compact English "N ago" for SMS replies (ASCII, one segment friendly). */
export function shortAgo(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/** Human status line for a `FIND` reply, or a "not found" prompt. */
export function formatFindReply(
  match: SetuEvent | undefined,
  queryName: string,
  now: number,
): string {
  const name = queryName.trim();
  if (!match) return `No status yet for ${name}. Text: SAFE ${name} <area>`;

  const area = findAreaByGh(match.gh);
  const where = area ? area.name : match.gh ? 'area unknown' : 'area not given';
  let state: string;
  if (match.t === 'checkin') state = match.st === 'need' ? 'NEEDS HELP' : 'SAFE';
  else if (match.t === 'help') state = `NEEDS HELP${match.cat ? ` (${match.cat})` : ''}`;
  else state = (match.pst ?? 'missing').toUpperCase();

  const who = match.n ?? match.pn ?? name;
  return `${who}: ${state}, ${where}, ${shortAgo(now - match.ts)}`;
}

/** Short confirmation for a recorded command, or undefined for find/unknown. */
export function formatConfirmReply(cmd: SmsCommand): string | undefined {
  const at = (a?: Area): string => (a ? ` in ${a.name}` : '');
  switch (cmd.kind) {
    case 'checkin':
      return `Setu: recorded ${cmd.name} SAFE${at(cmd.area)}.`;
    case 'help':
      return `Setu: HELP request logged for ${cmd.name}${at(cmd.area)} (${cmd.cat}). Hold on.`;
    case 'offer':
      return `Setu: OFFER logged for ${cmd.name}${at(cmd.area)} (${cmd.cat}).`;
    case 'done':
      return `Setu: marked ${cmd.name}'s latest help request done.`;
    case 'person':
      return `Setu: recorded ${cmd.name} ${cmd.pst.toUpperCase()}${at(cmd.area)}.`;
    default:
      return undefined;
  }
}

/** Usage help, sent when an inbound message matches no command. */
export function usageReply(): string {
  return (
    'Setu SMS commands: SAFE <name> <area> | ' +
    'HELP <MED/RESCUE/FOOD/WATER/SHELTER> <name> <area> - note | ' +
    'OFFER <category> <name> <area> - note | DONE <name> | ' +
    'MISSING <name> <area> | FOUND <name> <area> | FIND <name>'
  );
}
