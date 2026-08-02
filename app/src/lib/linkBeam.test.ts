import { createEvent, generateKeypair, verifyEvent, type SetuEvent } from '@setu/shared';
import { describe, expect, it } from 'vitest';
import { decodeLinkBeamPayload, encodeLinkBeamUrl } from './linkBeam';

const kp = generateKeypair();

function sampleCheckin(): SetuEvent {
  return createEvent(
    {
      t: 'checkin',
      ts: 1_700_000_000,
      gh: 'wh0r',
      st: 'safe',
      n: 'Rahim',
    },
    kp,
  );
}

describe('linkBeam codec', () => {
  it('encodes an event into a URL and decodes it back', () => {
    const event = sampleCheckin();
    const url = encodeLinkBeamUrl(event, 'https://setu.app');

    expect(url.startsWith('https://setu.app/b#')).toBe(true);

    const decoded = decodeLinkBeamPayload(url);
    expect(decoded).toEqual(event);
    expect(verifyEvent(decoded)).toBe(true);
  });

  it('decodes raw hash fragment payload', () => {
    const event = sampleCheckin();
    const url = encodeLinkBeamUrl(event);
    const hash = url.split('#')[1]!;

    const decoded = decodeLinkBeamPayload(hash);
    expect(decoded).toEqual(event);
  });

  it('throws for corrupted payload', () => {
    expect(() => decodeLinkBeamPayload('invalid-hash')).toThrow();
  });
});
