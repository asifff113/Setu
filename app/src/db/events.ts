import { isExpired, isFutureDated, isValidEventShape, verifyEvent, type SetuEvent } from '@setu/shared';
import { db } from './schema';

/** Soft cap; older-expired-first pruning keeps IndexedDB bounded on cheap phones. */
export const MAX_EVENTS = 5000;

export interface IngestResult {
  /** newly stored */
  added: number;
  /** already present, ignored */
  known: number;
  /** failed signature/id verification, dropped */
  rejected: number;
  addedEvents: SetuEvent[];
}

/**
 * Verify and union-merge events into the store. Invalid signatures are
 * dropped; duplicates (by content id) are ignored. This is the single write
 * path every transport funnels through, so untrusted bytes can never enter the
 * store unverified.
 */
export async function ingestEvents(events: SetuEvent[]): Promise<IngestResult> {
  const result: IngestResult = { added: 0, known: 0, rejected: 0, addedEvents: [] };
  const valid: SetuEvent[] = [];
  const now = Math.floor(Date.now() / 1000);
  for (const event of events) {
    // Shape/size gate runs first (cheap, pre-crypto): drops malformed or
    // oversized events before they cost a signature verification.
    if (isValidEventShape(event) && !isExpired(event, now) && !isFutureDated(event, now) && verifyEvent(event)) valid.push(event);
    else result.rejected++;
  }
  if (valid.length === 0) return result;

  await db.transaction('rw', db.events, async () => {
    const rows = await db.events.bulkGet(valid.map((e) => e.id));
    const known = new Set<string>();
    for (const row of rows) if (row) known.add(row.id);

    const toAdd = valid.filter((e) => !known.has(e.id));
    result.known = valid.length - toAdd.length;
    if (toAdd.length > 0) await db.events.bulkPut(toAdd);
    result.added = toAdd.length;
    result.addedEvents = toAdd;
  });
  return result;
}

/** All non-expired events — the raw source that view selectors derive from. */
export async function liveEvents(
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<SetuEvent[]> {
  const all = await db.events.toArray();
  return all.filter((e) => !isExpired(e, nowSeconds));
}

/**
 * Drop expired events, then enforce MAX_EVENTS by removing the oldest.
 * Returns the number of events removed.
 */
export async function pruneEvents(
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<number> {
  let removed = 0;
  await db.transaction('rw', db.events, db.meta, async () => {
    const identity = await db.meta.get('identity');
    const ownAuthor = identity?.key === 'identity' ? identity.author : undefined;
    const expiredKeys = await db.events
      // Preserve this device's authored log as private history. It is excluded
      // from live views/sync after expiry, but remains available to the owner.
      .filter((e) => isExpired(e, nowSeconds) && e.au !== ownAuthor)
      .primaryKeys();
    if (expiredKeys.length > 0) {
      await db.events.bulkDelete(expiredKeys);
      removed += expiredKeys.length;
    }

    const count = await db.events.count();
    if (count > MAX_EVENTS) {
      const overflow = count - MAX_EVENTS;
      const oldest = await db.events
        .orderBy('ts')
        .limit(overflow)
        .primaryKeys();
      await db.events.bulkDelete(oldest);
      removed += oldest.length;
    }
  });
  return removed;
}
