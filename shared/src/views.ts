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

function latestByKey(
  events: readonly SetuEvent[],
  keyOf: (event: SetuEvent) => string,
): SetuEvent[] {
  const byKey = new Map<string, SetuEvent>();
  for (const event of events) {
    const key = keyOf(event);
    const current = byKey.get(key);
    if (!current || event.ts > current.ts) byKey.set(key, event);
  }
  return [...byKey.values()].sort((a, b) => b.ts - a.ts);
}

/** One card per person: their latest checkin/help event, newest first. */
export function latestStatusEvents(events: readonly SetuEvent[]): SetuEvent[] {
  return latestByKey(
    events.filter((e) => e.t === 'checkin' || e.t === 'help'),
    personKey,
  );
}

/** One card per missing/found person: their latest person event, newest first. */
export function latestPersonEvents(events: readonly SetuEvent[]): SetuEvent[] {
  return latestByKey(
    events.filter((e) => e.t === 'person'),
    missingPersonKey,
  );
}

/** All bulletins, newest first (ungrouped; trust is per-event). */
export function bulletinEvents(events: readonly SetuEvent[]): SetuEvent[] {
  return events.filter((e) => e.t === 'bulletin').sort((a, b) => b.ts - a.ts);
}
