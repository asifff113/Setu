/**
 * RelayWS — the WebSocket sync transport (Phase 4).
 *
 * Framework-agnostic: it owns one reconnecting socket and speaks the wire
 * protocol (see shared/wire.ts). All app-specific work — reading local ids,
 * fetching events, ingesting, surfacing status — is injected as hooks, so this
 * class has no dependency on Dexie, Zustand, or React and stays testable.
 *
 * Lifecycle: `start()` opens and keeps the socket alive with exponential
 * backoff; `resync()` re-advertises (or forces an immediate reconnect) when the
 * app foregrounds; `push()` broadcasts freshly-created local events; `stop()`
 * closes for good with no further reconnects.
 */
import type { SetuEvent, SyncMessage } from '@setu/shared';

export type RelayStatus = 'connecting' | 'connected' | 'offline';

export interface RelayWSHooks {
  /** All live event ids this device holds (for the `have` advertisement). */
  getLocalIds(): Promise<string[]>;
  /** Fetch specific local events by id (answering the relay's `want`). */
  getLocalEvents(ids: string[]): Promise<SetuEvent[]>;
  /** Ingest incoming events (verify + store + refresh views). */
  onEvents(events: SetuEvent[]): Promise<void>;
  /** Connection state changed. */
  onStatus(status: RelayStatus): void;
  /** A reconciliation/live batch was received (bump "last sync" time). */
  onSynced(): void;
}

const MAX_BACKOFF_MS = 30_000;

export class RelayWS {
  private readonly url: string;
  private readonly hooks: RelayWSHooks;
  private ws: WebSocket | null = null;
  private closed = false;
  private retry = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  // Explicit field assignment (not constructor parameter properties) because
  // the app compiles with `erasableSyntaxOnly`.
  constructor(url: string, hooks: RelayWSHooks) {
    this.url = url;
    this.hooks = hooks;
  }

  /** Open the socket and keep it alive until `stop()`. */
  start(): void {
    this.closed = false;
    this.open();
  }

  /** Close permanently; cancels any pending reconnect. */
  stop(): void {
    this.closed = true;
    this.clearTimer();
    const ws = this.ws;
    this.ws = null;
    if (ws) {
      ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null;
      try {
        ws.close();
      } catch {
        /* already closing */
      }
    }
    this.hooks.onStatus('offline');
  }

  /** Push newly-created local events to the relay (no-op if not connected). */
  push(events: SetuEvent[]): void {
    if (events.length && this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: 'events', events });
    }
  }

  /**
   * Opportunistic re-sync (call on foreground / `online`): re-advertise if
   * connected, or reconnect immediately if we were backing off.
   */
  resync(): void {
    if (this.closed) return;
    if (this.ws?.readyState === WebSocket.OPEN) {
      void this.sendHave();
    } else if (this.ws?.readyState !== WebSocket.CONNECTING) {
      this.clearTimer();
      this.retry = 0;
      this.open();
    }
  }

  private open(): void {
    this.hooks.onStatus('connecting');
    let ws: WebSocket;
    try {
      ws = new WebSocket(this.url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      this.retry = 0;
      this.hooks.onStatus('connected');
      void this.sendHave();
    };
    ws.onmessage = (ev: MessageEvent) => {
      void this.onMessage(ev.data);
    };
    ws.onclose = () => {
      this.ws = null;
      if (this.closed) this.hooks.onStatus('offline');
      else this.scheduleReconnect();
    };
    ws.onerror = () => {
      // Browsers fire error then close; reconnect is handled in onclose.
    };
  }

  private async sendHave(): Promise<void> {
    const ids = await this.hooks.getLocalIds();
    this.send({ type: 'have', ids });
  }

  private async onMessage(data: unknown): Promise<void> {
    let text: string;
    if (typeof data === 'string') text = data;
    else if (data instanceof Blob) text = await data.text();
    else return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return;
    }
    // Guard against non-object JSON (null/number/array): reading `.type` off it
    // would throw and reject this handler's promise. Cheap to ignore instead.
    if (!parsed || typeof parsed !== 'object') return;
    const msg = parsed as SyncMessage;

    if (msg.type === 'events' && Array.isArray(msg.events)) {
      await this.hooks.onEvents(msg.events);
      this.hooks.onSynced();
    } else if (msg.type === 'want' && Array.isArray(msg.ids)) {
      const events = await this.hooks.getLocalEvents(msg.ids);
      if (events.length) this.send({ type: 'events', events });
    }
    // A client ignores incoming `have`: reconciliation is server-driven.
  }

  private send(msg: SyncMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private scheduleReconnect(): void {
    this.hooks.onStatus('offline');
    if (this.closed) return;
    const backoff = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** this.retry);
    const jitter = Math.random() * 500;
    this.retry++;
    this.clearTimer();
    this.reconnectTimer = setTimeout(() => {
      if (!this.closed) this.open();
    }, backoff + jitter);
  }

  private clearTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
