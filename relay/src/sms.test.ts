import { findAreaByCode, verifyEvent, type SetuEvent } from '@setu/shared';
import { describe, expect, it } from 'vitest';
import { loadRelayIdentity } from './identity.js';
import {
  buildSmsEvent,
  extractInbound,
  gatewayFromEnv,
  handleInboundSms,
  type SmsDeps,
} from './sms.js';
import { EventStore } from './store.js';

const identity = loadRelayIdentity(); // ephemeral in-memory key

/** A store + a captured "broadcast" list, standing in for the sync hub. */
function makeDeps(now: number): { deps: SmsDeps; broadcast: SetuEvent[] } {
  const store = new EventStore(); // :memory:
  const broadcast: SetuEvent[] = [];
  const deps: SmsDeps = {
    identity,
    store,
    publish: (events) => {
      const added = store.ingest(events, now);
      broadcast.push(...added);
      return added;
    },
    gateway: gatewayFromEnv({}), // no GATEWAY_URL -> replies logged only
    now: () => now,
  };
  return { deps, broadcast };
}

describe('extractInbound', () => {
  it('reads the android-sms-gateway (capcom6) shape', () => {
    expect(
      extractInbound({ event: 'sms:received', payload: { message: 'SAFE Rahim Mirpur', phoneNumber: '+8801711000001' } }),
    ).toEqual({ text: 'SAFE Rahim Mirpur', from: '+8801711000001' });
  });

  it('reads the httpSMS (CloudEvents) shape', () => {
    expect(
      extractInbound({ event: 'message.phone.received', data: { contents: 'FIND Rahim', from: '+8801711000002' } }),
    ).toEqual({ text: 'FIND Rahim', from: '+8801711000002' });
  });

  it('reads the simple simulator/curl shape', () => {
    expect(extractInbound({ message: 'HELP FOOD Karim', from: '+880000' })).toEqual({
      text: 'HELP FOOD Karim',
      from: '+880000',
    });
  });

  it('returns null for an unrecognized payload', () => {
    expect(extractInbound({ foo: 'bar' })).toBeNull();
    expect(extractInbound(null)).toBeNull();
    expect(extractInbound('nope')).toBeNull();
  });
});

describe('gatewayFromEnv', () => {
  it('infers httpsms from the URL and keeps android as the default', () => {
    expect(gatewayFromEnv({ GATEWAY_URL: 'https://api.httpsms.com/v1/messages/send' }).kind).toBe('httpsms');
    expect(gatewayFromEnv({ GATEWAY_URL: 'http://192.168.0.5:8080/message' }).kind).toBe('android');
  });

  it('honors an explicit GATEWAY_KIND override', () => {
    expect(gatewayFromEnv({ GATEWAY_URL: 'http://x/message', GATEWAY_KIND: 'httpsms' }).kind).toBe('httpsms');
  });
});

describe('buildSmsEvent', () => {
  it('produces a verifiable, relay-signed, sms-sourced event for a check-in', () => {
    const cmd = { kind: 'checkin', name: 'Rahim', area: findAreaByCode('mirpur') } as const;
    const ev = buildSmsEvent(cmd, identity, 1000)!;
    expect(ev.t).toBe('checkin');
    expect(ev.src).toBe('sms');
    expect(ev.st).toBe('safe');
    expect(ev.n).toBe('Rahim');
    expect(ev.gh).toBe(findAreaByCode('mirpur')!.gh);
    expect(ev.au).toBe(identity.author); // attested by the relay key
    expect(verifyEvent(ev)).toBe(true);
  });

  it('returns null for find/unknown', () => {
    expect(buildSmsEvent({ kind: 'find', name: 'x' }, identity, 1)).toBeNull();
    expect(buildSmsEvent({ kind: 'unknown' }, identity, 1)).toBeNull();
  });
});

describe('handleInboundSms — acceptance path', () => {
  it('stores + broadcasts a real "SAFE Rahim Mirpur" so it reaches synced devices', async () => {
    const now = 1_700_000_000;
    const { deps, broadcast } = makeDeps(now);

    const res = await handleInboundSms(
      { payload: { message: 'SAFE Rahim Mirpur', phoneNumber: '+8801711000001' } },
      deps,
    );

    expect(res.status).toBe(200);
    expect(res.json.stored).toBe(1);
    // Broadcast to peers == the event the relay would push over /ws.
    expect(broadcast).toHaveLength(1);
    const ev = broadcast[0]!;
    expect(ev).toMatchObject({ t: 'checkin', st: 'safe', n: 'Rahim', src: 'sms' });
    expect(ev.gh).toBe(findAreaByCode('mirpur')!.gh);
    expect(verifyEvent(ev)).toBe(true);
    // The store now holds it (what a newly-connecting device reconciles against).
    expect(deps.store.allLive(now)).toHaveLength(1);
  });

  it('answers FIND Rahim with his correct latest status', async () => {
    const now = 1_700_000_000;
    const { deps } = makeDeps(now);

    await handleInboundSms({ message: 'SAFE Rahim Mirpur', from: '+880111' }, deps);

    const find = await handleInboundSms(
      { data: { contents: 'FIND Rahim', from: '+880999' } },
      { ...deps, now: () => now + 120 },
    );
    expect(find.json.reply).toBe('Rahim: SAFE, Mirpur, 2m ago');
    expect(find.json.stored).toBe(0); // a query never stores
  });

  it('supersedes a MISSING with a later FOUND when answering FIND', async () => {
    const now = 1_700_000_000;
    const { deps } = makeDeps(now);
    await handleInboundSms({ message: 'MISSING Fatima Sylhet', from: '+1' }, { ...deps, now: () => now });
    await handleInboundSms({ message: 'FOUND Fatima Sylhet', from: '+2' }, { ...deps, now: () => now + 300 });

    const find = await handleInboundSms(
      { message: 'FIND Fatima', from: '+3' },
      { ...deps, now: () => now + 600 },
    );
    expect(find.json.reply).toContain('Fatima: FOUND, Sylhet');
  });

  it('replies with usage help for an unrecognized message and stores nothing', async () => {
    const now = 1_700_000_000;
    const { deps, broadcast } = makeDeps(now);
    const res = await handleInboundSms({ message: 'hello there', from: '+880' }, deps);
    expect(res.json.stored).toBe(0);
    expect(res.json.reply).toContain('SAFE <name>');
    expect(broadcast).toHaveLength(0);
  });

  it('rejects a payload with no readable text field', async () => {
    const { deps } = makeDeps(1);
    const res = await handleInboundSms({ nope: true }, deps);
    expect(res.status).toBe(400);
    expect(res.json.ok).toBe(false);
  });
});
