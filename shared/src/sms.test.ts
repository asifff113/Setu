import { describe, expect, it } from 'vitest';
import { findAreaByCode } from './areas.js';
import { createEvent, type NewEventInput } from './codec.js';
import { generateKeypair } from './crypto.js';
import {
  findLatestForName,
  formatConfirmReply,
  formatFindReply,
  normalizeBanglaDigits,
  parseSms,
  shortAgo,
  usageReply,
  type SmsCommand,
} from './sms.js';
import type { SetuEvent } from './types.js';

const kp = generateKeypair();
function ev(input: NewEventInput): SetuEvent {
  return createEvent(input, kp);
}

const mirpurGh = findAreaByCode('mirpur')!.gh;
const feniGh = findAreaByCode('feni')!.gh;

describe('normalizeBanglaDigits', () => {
  it('maps Bangla numerals to ASCII and leaves letters alone', () => {
    expect(normalizeBanglaDigits('বাড়ি ১২৩ Rahim')).toBe('বাড়ি 123 Rahim');
  });
});

describe('parseSms: SAFE', () => {
  it('parses SAFE <name> <area>', () => {
    expect(parseSms('SAFE Rahim Mirpur')).toEqual({
      kind: 'checkin',
      name: 'Rahim',
      area: expect.objectContaining({ code: 'mirpur' }),
    });
  });

  it('is case-insensitive on the keyword', () => {
    const cmd = parseSms('safe Rahim Mirpur');
    expect(cmd.kind).toBe('checkin');
  });

  it('keeps a multi-word name and peels a known trailing area', () => {
    const cmd = parseSms('SAFE Abdul Karim Feni');
    expect(cmd).toMatchObject({ kind: 'checkin', name: 'Abdul Karim' });
    expect(cmd.kind === 'checkin' && cmd.area?.code).toBe('feni');
  });

  it('leaves an unknown trailing word as part of the name (area undefined)', () => {
    const cmd = parseSms('SAFE Rahim Nowheresville');
    expect(cmd).toEqual({ kind: 'checkin', name: 'Rahim Nowheresville', area: undefined });
  });

  it('does not peel the only token as an area', () => {
    // "SAFE Feni" -> the person is named Feni; no name left otherwise.
    expect(parseSms('SAFE Feni')).toEqual({ kind: 'checkin', name: 'Feni', area: undefined });
  });

  it('SAFE with no name is unknown', () => {
    expect(parseSms('SAFE')).toEqual({ kind: 'unknown' });
  });
});

describe('parseSms: HELP', () => {
  it('parses category, name, area and a trailing message', () => {
    expect(parseSms('HELP WATER Rahim Mirpur - stuck on the roof')).toEqual({
      kind: 'help',
      name: 'Rahim',
      area: expect.objectContaining({ code: 'mirpur' }),
      cat: 'water',
      msg: 'stuck on the roof',
    });
  });

  it('defaults to category "other" when no category keyword is given', () => {
    expect(parseSms('HELP Rahim Mirpur')).toMatchObject({
      kind: 'help',
      name: 'Rahim',
      cat: 'other',
    });
  });

  it('maps every category keyword', () => {
    const cats: Array<[string, string]> = [
      ['MED', 'med'],
      ['RESCUE', 'rescue'],
      ['FOOD', 'food'],
      ['WATER', 'water'],
      ['SHELTER', 'shelter'],
    ];
    for (const [word, cat] of cats) {
      expect(parseSms(`HELP ${word} Rahim`)).toMatchObject({ kind: 'help', cat });
    }
  });

  it('does not split a hyphenated name that has no leading space before the dash', () => {
    const cmd = parseSms('HELP MED Abdul-Karim');
    expect(cmd).toMatchObject({ kind: 'help', name: 'Abdul-Karim', cat: 'med' });
    expect(cmd.kind === 'help' && cmd.msg).toBeUndefined();
  });
});

describe('parseSms: MISSING / FOUND', () => {
  it('parses MISSING <name> <area>', () => {
    expect(parseSms('MISSING Karim Feni')).toMatchObject({
      kind: 'person',
      name: 'Karim',
      pst: 'missing',
    });
  });

  it('parses FOUND <name> <area>', () => {
    expect(parseSms('found Karim feni')).toMatchObject({
      kind: 'person',
      name: 'Karim',
      pst: 'found',
    });
  });
});

describe('parseSms: FIND', () => {
  it('parses FIND <name> with the whole remainder as the name', () => {
    expect(parseSms('FIND Rahim')).toEqual({ kind: 'find', name: 'Rahim' });
  });

  it('tolerates Bangla digits and extra whitespace', () => {
    expect(parseSms('  find   Rahim ')).toEqual({ kind: 'find', name: 'Rahim' });
  });
});

describe('parseSms: DONE / OFFER', () => {
  it('parses a completion and a supply offer', () => {
    expect(parseSms('DONE Rahim')).toEqual({ kind: 'done', name: 'Rahim' });
    expect(parseSms('OFFER SHELTER Karim Feni - room for five')).toMatchObject({
      kind: 'offer',
      name: 'Karim',
      cat: 'shelter',
      msg: 'room for five',
    });
  });
});

describe('parseSms: unknown', () => {
  it('returns unknown for gibberish and empty input', () => {
    expect(parseSms('hello there')).toEqual({ kind: 'unknown' });
    expect(parseSms('')).toEqual({ kind: 'unknown' });
    expect(parseSms('   ')).toEqual({ kind: 'unknown' });
  });
});

describe('findLatestForName + formatFindReply', () => {
  it('finds the newest checkin by display name and formats a SAFE reply', () => {
    const now = 10_000;
    const old = ev({ t: 'checkin', ts: now - 500, gh: mirpurGh, n: 'Rahim', st: 'safe', src: 'sms' });
    const fresh = ev({ t: 'checkin', ts: now - 120, gh: mirpurGh, n: 'Rahim', st: 'safe', src: 'sms' });
    const match = findLatestForName([old, fresh], 'rahim');
    expect(match?.id).toBe(fresh.id);
    expect(formatFindReply(match, 'Rahim', now)).toBe('Rahim: SAFE, Mirpur, 2m ago');
  });

  it('formats a NEEDS HELP reply with category', () => {
    const now = 10_000;
    const help = ev({ t: 'help', ts: now - 3600, gh: feniGh, n: 'Karim', st: 'need', cat: 'rescue', src: 'sms' });
    expect(formatFindReply(findLatestForName([help], 'Karim', ), 'Karim', now)).toBe(
      'Karim: NEEDS HELP (rescue), Feni, 1h ago',
    );
  });

  it('finds a person by their missing/found report', () => {
    const now = 10_000;
    const missing = ev({ t: 'person', ts: now - 60, gh: feniGh, pn: 'Karim', pst: 'missing', src: 'sms' });
    expect(formatFindReply(findLatestForName([missing], 'karim'), 'Karim', now)).toBe(
      'Karim: MISSING, Feni, 1m ago',
    );
  });

  it('replies with a prompt when nobody matches', () => {
    expect(formatFindReply(undefined, 'Rahim', 10_000)).toBe(
      'No status yet for Rahim. Text: SAFE Rahim <area>',
    );
  });
});

describe('formatConfirmReply', () => {
  it('confirms a check-in with the area', () => {
    const cmd = parseSms('SAFE Rahim Mirpur') as SmsCommand;
    expect(formatConfirmReply(cmd)).toBe('Setu: recorded Rahim SAFE in Mirpur.');
  });

  it('has no confirmation for find or unknown', () => {
    expect(formatConfirmReply({ kind: 'find', name: 'X' })).toBeUndefined();
    expect(formatConfirmReply({ kind: 'unknown' })).toBeUndefined();
  });
});

describe('shortAgo + usageReply', () => {
  it('floors negative skew to "just now"', () => {
    expect(shortAgo(-30)).toBe('just now');
    expect(shortAgo(0)).toBe('just now');
  });

  it('usage help names every command', () => {
    const u = usageReply();
    for (const word of ['SAFE', 'HELP', 'MISSING', 'FOUND', 'FIND', 'DONE', 'OFFER']) {
      expect(u).toContain(word);
    }
  });
});
