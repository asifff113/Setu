/**
 * Relay event store, backed by SQLite (better-sqlite3, synchronous).
 *
 * The relay is not a server of record — it is a store-and-forward cache of the
 * same immutable, signed `SetuEvent`s the phones hold. Every event is verified
 * on the way in (`verifyEvent`) so a malicious client can't poison the cache,
 * and expired events are never stored or served. Blobs are kept as JSON text
 * because that's exactly what goes back out over the WebSocket.
 */
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { isExpired, isFutureDated, isValidEventShape, verifyEvent, type SetuEvent } from '@setu/shared';

interface BlobRow {
  blob: string;
}

export class EventStore {
  private db: Database.Database;
  private stmtHas: Database.Statement;
  private stmtInsert: Database.Statement;
  private stmtGet: Database.Statement;
  private stmtAllLive: Database.Statement;
  private stmtLiveIds: Database.Statement;
  private stmtPrune: Database.Statement;
  private stmtCount: Database.Statement;

  /** `dataDir` persists SQLite to disk; omit it for an in-memory relay. */
  constructor(dataDir?: string) {
    let file = ':memory:';
    if (dataDir && dataDir.trim()) {
      mkdirSync(dataDir, { recursive: true });
      file = join(dataDir, 'setu.sqlite');
    }
    this.db = new Database(file);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(
      `CREATE TABLE IF NOT EXISTS events (
        id   TEXT PRIMARY KEY,
        gh   TEXT NOT NULL,
        ts   INTEGER NOT NULL,
        ttl  INTEGER NOT NULL,
        blob TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_events_ts ON events (ts);`,
    );

    this.stmtHas = this.db.prepare('SELECT 1 FROM events WHERE id = ?');
    this.stmtInsert = this.db.prepare(
      'INSERT OR IGNORE INTO events (id, gh, ts, ttl, blob) VALUES (?, ?, ?, ?, ?)',
    );
    this.stmtGet = this.db.prepare(
      'SELECT blob FROM events WHERE id = ? AND (ts + ttl) >= ?',
    );
    this.stmtAllLive = this.db.prepare('SELECT blob FROM events WHERE (ts + ttl) >= ?');
    this.stmtLiveIds = this.db.prepare('SELECT id FROM events WHERE (ts + ttl) >= ?');
    this.stmtPrune = this.db.prepare('DELETE FROM events WHERE (ts + ttl) < ?');
    this.stmtCount = this.db.prepare('SELECT COUNT(*) AS n FROM events');
  }

  /**
   * Verify and store a batch. Skips events that are expired, already known, or
   * fail signature/id verification. Returns exactly the events that were newly
   * stored, so the caller can broadcast just those to other peers.
   */
  ingest(events: SetuEvent[], now: number): SetuEvent[] {
    const added: SetuEvent[] = [];
    const run = this.db.transaction((list: SetuEvent[]) => {
      for (const ev of list) {
        if (!isValidEventShape(ev)) continue; // malformed / oversized (cheap, pre-crypto)
        if (isExpired(ev, now) || isFutureDated(ev, now)) continue;
        if (this.stmtHas.get(ev.id)) continue; // already known
        if (!verifyEvent(ev)) continue; // untrusted / tampered
        this.stmtInsert.run(ev.id, ev.gh, ev.ts, ev.ttl, JSON.stringify(ev));
        added.push(ev);
      }
    });
    run(events);
    return added;
  }

  /** All live event ids — the relay's side of a `have` advertisement. */
  liveIds(now: number): string[] {
    return (this.stmtLiveIds.all(now) as { id: string }[]).map((r) => r.id);
  }

  /** All live events. */
  allLive(now: number): SetuEvent[] {
    return (this.stmtAllLive.all(now) as BlobRow[]).map(
      (r) => JSON.parse(r.blob) as SetuEvent,
    );
  }

  /** Fetch specific live events by id (answering a peer's `want`). */
  getByIds(ids: string[], now: number): SetuEvent[] {
    const out: SetuEvent[] = [];
    for (const id of ids) {
      const row = this.stmtGet.get(id, now) as BlobRow | undefined;
      if (row) out.push(JSON.parse(row.blob) as SetuEvent);
    }
    return out;
  }

  /**
   * Server-driven reconciliation against a peer's full live id set:
   *   missing = events we hold that the peer lacks (push these to it)
   *   want    = ids the peer holds that we lack (ask it for these)
   */
  reconcile(peerIds: string[], now: number): { missing: SetuEvent[]; want: string[] } {
    const peer = new Set(peerIds);
    const mine = new Set<string>();
    const missing: SetuEvent[] = [];
    for (const ev of this.allLive(now)) {
      mine.add(ev.id);
      if (!peer.has(ev.id)) missing.push(ev);
    }
    const want = peerIds.filter((id) => !mine.has(id));
    return { missing, want };
  }

  /** Delete expired events. Returns the number removed. */
  prune(now: number): number {
    return this.stmtPrune.run(now).changes;
  }

  /** Total rows (live + not-yet-pruned). */
  count(): number {
    return (this.stmtCount.get() as { n: number }).n;
  }
}
