import { describe, expect, it } from 'vitest';
import { createEvent } from './codec.js';
import { generateKeypair } from './crypto.js';
import { canTransportEvent } from './transport.js';

const keypair = generateKeypair();

describe('event transport policy', () => {
  it('keeps area chat off QR/chirp while allowing file and relay transfer', () => {
    const chat = createEvent({ t: 'chat', ts: 1, gh: 'wh0r', msg: 'hello' }, keypair);
    expect(canTransportEvent(chat, 'qr')).toBe(false);
    expect(canTransportEvent(chat, 'chirp')).toBe(false);
    expect(canTransportEvent(chat, 'file')).toBe(true);
    expect(canTransportEvent(chat, 'relay')).toBe(true);
  });

  it('allows media pointers on QR but not the compact sound wire format', () => {
    const help = createEvent(
      {
        t: 'help',
        ts: 1,
        gh: 'wh0r',
        st: 'need',
        att: { h: 'A'.repeat(43), k: 'img', sz: 1000 },
      },
      keypair,
    );
    expect(canTransportEvent(help, 'qr')).toBe(true);
    expect(canTransportEvent(help, 'chirp')).toBe(false);
  });
});
