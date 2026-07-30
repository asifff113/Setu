/**
 * Board/view derivation over a flat event log. Pure functions of an event
 * array so they run identically in the app (Dexie-backed) and, later, the
 * relay's server-rendered `/lite` board.
 *
 * Rules (per the data model):
 *   - checkin/help: latest event per person wins by ts. "Person" is the
 *     author pubkey, except for sms-sourced events (relay-signed on behalf
 *     of a phone number) which have no meaningful author key, so those group
 *     by normalized display name + area instead.
 *   - person (missing/found/seen): latest event per normalized name + area
 *     wins by ts — a newer found/seen naturally supersedes an older missing.
 *   - bulletin: no grouping, every event is its own card; trust is judged
 *     separately (see publishers.ts).
 * Nothing here mutates or drops from the underlying log — callers that want
 * history keep reading the full event array.
 */
import type { SetuEvent } from './types.js';

export interface SetuEventView extends SetuEvent {
  resolved: boolean;
  responders: number;
  replies: number;
  retracted: boolean;
}

function normalizeName(name: string | undefined): string {
  return (name ?? '').trim().toLowerCase();
}

/** Grouping key for checkin/help events: author key, or name+area for SMS. */
export function personKey(event: SetuEvent): string {
  if (event.src === 'sms') return `sms:${normalizeName(event.n)}|${event.gh}`;
  return `au:${event.au}`;
}

/** Grouping key for person (missing/found/seen) events: normalized name+area. */
export function missingPersonKey(event: SetuEvent): string {
  return `pn:${normalizeName(event.pn)}|${event.gh}`;
}

/**
 * `ts` has whole-second resolution, so same-author events created within one
 * second are common (a quick double-tap; two events replayed off a merge).
 * The winner must be the same on every device regardless of the order
 * events happen to iterate in locally, or peers holding an identical event
 * set could converge on different "latest" views. Tie-break on `id` (a
 * content hash, so already stable and identical everywhere) to make the
 * choice a pure function of the event set, not of iteration order.
 */
function wins(candidate: SetuEvent, current: SetuEvent): boolean {
  if (candidate.ts !== current.ts) return candidate.ts > current.ts;
  return candidate.id > current.id;
}

function latestByKey(
  events: readonly SetuEvent[],
  keyOf: (event: SetuEvent) => string,
): SetuEvent[] {
  const byKey = new Map<string, SetuEvent>();
  for (const event of events) {
    const key = keyOf(event);
    const current = byKey.get(key);
    if (!current || wins(event, current)) byKey.set(key, event);
  }
  return [...byKey.values()].sort((a, b) => b.ts - a.ts);
}

/** Retractions are valid only when the tombstone signer owns the target. */
export function validRetractionIds(events: readonly SetuEvent[]): Set<string> {
  const byId = new Map(events.map((event) => [event.id, event]));
  const ids = new Set<string>();
  for (const event of events) {
    if (event.t !== 'retract' || !event.re) continue;
    const target = byId.get(event.re);
    if (target && target.au === event.au) ids.add(target.id);
  }
  return ids;
}

export function isRetracted(events: readonly SetuEvent[], id: string): boolean {
  return validRetractionIds(events).has(id);
}

/** Replies and acknowledgements for one parent, oldest first. */
export function threadFor(events: readonly SetuEvent[], id: string): SetuEvent[] {
  const retracted = validRetractionIds(events);
  const parent = events.find((event) => event.id === id);
  return events
    .filter((event) =>
      (event.t === 'reply' || event.t === 'ack') &&
      event.re === id &&
      !retracted.has(event.id) &&
      (event.t !== 'ack' ||
        !parent ||
        (event.ak === 'seen' ? parent.t === 'person' : parent.t === 'help')))
    .sort((a, b) => a.ts - b.ts || a.id.localeCompare(b.id));
}

/** Derived badges/workflow state for a top-level event. */
export function eventView(events: readonly SetuEvent[], event: SetuEvent): SetuEventView {
  const thread = threadFor(events, event.id);
  const responders = new Set(
    thread.filter((child) => child.t === 'ack' && child.ak === 'onit').map((child) => child.au),
  ).size;
  return {
    ...event,
    resolved: thread.some((child) => child.t === 'ack' && child.ak === 'done'),
    responders,
    replies: thread.filter((child) => child.t === 'reply').length,
    retracted: isRetracted(events, event.id),
  };
}

/**
 * Latest check-in per person plus every independent help/offer case.
 *
 * Help requests used to be collapsed by author alongside check-ins, which
 * meant posting a second need (or an offer) silently hid the first unresolved
 * case. Once help becomes actionable/threaded, each signed help event is its
 * own case and remains visible until its own lifecycle closes.
 */
export function latestStatusEvents(events: readonly SetuEvent[]): SetuEventView[] {
  const retracted = validRetractionIds(events);
  const checkins = latestByKey(
    events.filter((event) => event.t === 'checkin' && !retracted.has(event.id)),
    personKey,
  );
  const cases = events.filter((event) => event.t === 'help' && !retracted.has(event.id));
  return [...checkins, ...cases]
    .sort((a, b) => b.ts - a.ts || b.id.localeCompare(a.id))
    .map((event) => eventView(events, event));
}

/** One card per missing/found person: their latest person event, newest first. */
export function latestPersonEvents(events: readonly SetuEvent[]): SetuEventView[] {
  const retracted = validRetractionIds(events);
  return latestByKey(
    events.filter((e) => e.t === 'person' && !retracted.has(e.id)),
    missingPersonKey,
  ).map((event) => eventView(events, event));
}

/** All bulletins, newest first (ungrouped; trust is per-event). */
export function bulletinEvents(events: readonly SetuEvent[]): SetuEventView[] {
  const retracted = validRetractionIds(events);
  return events
    .filter((e) => e.t === 'bulletin' && !retracted.has(e.id))
    .sort((a, b) => b.ts - a.ts)
    .map((event) => eventView(events, event));
}

/** Area-channel messages, newest last for conversation rendering. */
export function chatEvents(events: readonly SetuEvent[], gh?: string): SetuEvent[] {
  const retracted = validRetractionIds(events);
  return events
    .filter((event) => event.t === 'chat' && !retracted.has(event.id) && (!gh || event.gh === gh))
    .sort((a, b) => a.ts - b.ts || a.id.localeCompare(b.id));
}

/** Offers remain help-shaped events so all existing transports degrade safely. */
export function offerEvents(events: readonly SetuEvent[]): SetuEventView[] {
  const retracted = validRetractionIds(events);
  return events
    .filter((event) => event.t === 'help' && event.st === 'offer' && !retracted.has(event.id))
    .sort((a, b) => b.ts - a.ts)
    .map((event) => eventView(events, event));
}
