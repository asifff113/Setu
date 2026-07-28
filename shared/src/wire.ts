/**
 * Relay sync wire protocol (Phase 4). These messages travel over a WebSocket
 * on the internet or a LAN, not over QR/SMS, so readable JSON keys are fine —
 * the size-critical payloads are the `SetuEvent`s themselves.
 *
 * Reconciliation is server-driven: a peer opens with `have` (all its live
 * event ids); the relay answers with the `events` that peer lacks and a `want`
 * for the ids the relay lacks. After the handshake, either side pushes new
 * `events` as they arrive. Every message is one of these three shapes.
 */
import type { SetuEvent } from './types.js';

export type SyncMessage =
  /** "Here are all the live event ids I hold." Sent on open + on resync. */
  | { type: 'have'; ids: string[] }
  /** "Send me the events with these ids." Reply to a `have`. */
  | { type: 'want'; ids: string[] }
  /** A batch of events: a reconciliation reply or a live push. */
  | { type: 'events'; events: SetuEvent[] };
