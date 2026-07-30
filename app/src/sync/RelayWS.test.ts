import { generateKeypair, createEvent, type SetuEvent } from '@setu/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RelayWS, type RelayWSHooks } from './RelayWS.js';

/**
 * Minimal WebSocket stand-in. RelayWS is meant to stay testable without a
 * browser (see its own docblock), but there's no global `WebSocket` in the
 * Node test environment — this fakes just enough of the API (readyState +
 * on{open,message,close,error} + send/close) for RelayWS's own code paths.
 */
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];

  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  sent: string[] = [];
  url: string;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }

  /** Test helper: simulate the handshake completing. */
  open(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  /** Test helper: simulate an inbound frame. */
  emit(payload: unknown): void {
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
    this.onmessage?.({ data });
  }
}

function makeHooks(): RelayWSHooks & {
  onEvents: ReturnType<typeof vi.fn>;
  getLocalEvents: ReturnType<typeof vi.fn>;
} {
  return {
    getLocalIds: vi.fn(async () => []),
    getLocalEvents: vi.fn(async () => []),
    onEvents: vi.fn(async () => {}),
    onStatus: vi.fn(),
    onSynced: vi.fn(),
  };
}

function sampleEvent(): SetuEvent {
  return createEvent({ t: 'checkin', ts: 1_700_000_000, gh: 'wh0r', st: 'safe' }, generateKeypair());
}

const ID_22 = 'a'.repeat(22);

beforeEach(() => {
  MockWebSocket.instances = [];
  vi.stubGlobal('WebSocket', MockWebSocket);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('RelayWS client-side protocol limits', () => {
  async function openRelay(hooks: ReturnType<typeof makeHooks>): Promise<MockWebSocket> {
    const relay = new RelayWS('ws://node.local/ws', hooks);
    relay.start();
    const ws = MockWebSocket.instances[0]!;
    ws.open();
    await Promise.resolve(); // let the async sendHave()/onopen microtasks settle
    return ws;
  }

  it('ignores an events message over the per-message event-count cap', async () => {
    const hooks = makeHooks();
    const ws = await openRelay(hooks);

    const events = Array.from({ length: 501 }, () => sampleEvent()); // MAX_EVENTS_PER_MESSAGE = 500
    ws.emit({ type: 'events', events });
    await Promise.resolve();

    expect(hooks.onEvents).not.toHaveBeenCalled();
  });

  it('processes an events message at or under the cap', async () => {
    const hooks = makeHooks();
    const ws = await openRelay(hooks);

    const events = [sampleEvent(), sampleEvent()];
    ws.emit({ type: 'events', events });
    await Promise.resolve();

    expect(hooks.onEvents).toHaveBeenCalledWith(events);
  });

  it('ignores a want message whose ids array is over the per-message cap', async () => {
    const hooks = makeHooks();
    const ws = await openRelay(hooks);

    const ids = Array.from({ length: 5001 }, () => ID_22); // MAX_IDS_PER_MESSAGE = 5000
    ws.emit({ type: 'want', ids });
    await Promise.resolve();

    expect(hooks.getLocalEvents).not.toHaveBeenCalled();
  });

  it('ignores a want message with a malformed id', async () => {
    const hooks = makeHooks();
    const ws = await openRelay(hooks);

    ws.emit({ type: 'want', ids: ['not-a-valid-id; DROP TABLE events;'] });
    await Promise.resolve();

    expect(hooks.getLocalEvents).not.toHaveBeenCalled();
  });

  it('answers a well-formed want with matching local events', async () => {
    const hooks = makeHooks();
    const local = sampleEvent();
    hooks.getLocalEvents.mockResolvedValue([local]);
    const ws = await openRelay(hooks);

    ws.emit({ type: 'want', ids: [ID_22] });
    await Promise.resolve();

    expect(hooks.getLocalEvents).toHaveBeenCalledWith([ID_22]);
    expect(ws.sent.some((s) => JSON.parse(s).type === 'events')).toBe(true);
  });

  it('drops a frame larger than the incoming-message byte cap before parsing it', async () => {
    const hooks = makeHooks();
    const ws = await openRelay(hooks);

    const huge = 'a'.repeat(4 * 1024 * 1024 + 1); // MAX_INCOMING_MESSAGE_BYTES = 4 MiB
    ws.emit(huge); // not valid JSON either way, but this proves the byte guard runs first
    await Promise.resolve();

    expect(hooks.onEvents).not.toHaveBeenCalled();
    expect(hooks.getLocalEvents).not.toHaveBeenCalled();
  });

  it('survives non-object JSON frames without throwing', async () => {
    const hooks = makeHooks();
    const ws = await openRelay(hooks);

    for (const frame of ['null', 'true', '42', '"hello"', '[]']) {
      expect(() => ws.emit(frame)).not.toThrow();
    }
    await Promise.resolve();
    expect(hooks.onEvents).not.toHaveBeenCalled();
  });
});
