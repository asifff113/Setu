/**
 * Relay event store, backed by SQLite (better-sqlite3, synchronous).
 *
 * The relay is not a server of record — it is a store-and-forward cache of the
 * same immutable, signed `SetuEvent`s the phones hold. Every event is verified
 * on the way in (`verifyEvent`) so a malicious client can't poison the cache,
 * and expired events are never stored or served. Blobs are kept as JSON text
 * because that's exactly what goes back out over the WebSocket.
 *
 * Storage is bounded two ways so signing valid-but-worthless events can't fill
 * the disk: a global row cap (oldest-first eviction) and a per-author cap
 * (an attacker can mint fresh keypairs, so this alone doesn't stop a
 * determined Sybil, but it stops one key from hoarding the whole store).
 */
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  DEMO_BULLETIN_ID,
  isDemoAuthor,
  isExpired,
  isFutureDated,
  isValidEventShape,
  verifyEvent,
  type SetuEvent,
} from '@setu/shared';

interface BlobRow {
  blob: string;
}

/** Global cap on stored rows; oldest events are evicted first once exceeded. */
export const DEFAULT_MAX_ROWS = 50_000;
/** Per-author cap; keeps one signing key from hoarding the whole store. */
export const DEFAULT_MAX_PER_AUTHOR = 500;

export interface EventStoreLimits {
  maxRows?: number;
  maxPerAuthor?: number;
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
  private stmtCountByAuthor: Database.Statement;
  private stmtEvictOldest: Database.Statement;
  private stmtEvictOldestByAuthor: Database.Statement;
  private readonly maxRows: number;
  private readonly maxPerAuthor: number;

  /** `dataDir` persists SQLite to disk; omit it for an in-memory relay. */
  constructor(dataDir?: string, limits: EventStoreLimits = {}) {
    this.maxRows = limits.maxRows ?? DEFAULT_MAX_ROWS;
    this.maxPerAuthor = limits.maxPerAuthor ?? DEFAULT_MAX_PER_AUTHOR;
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
        au   TEXT NOT NULL DEFAULT '',
        ts   INTEGER NOT NULL,
        ttl  INTEGER NOT NULL,
        blob TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_events_ts ON events (ts);
      CREATE INDEX IF NOT EXISTS idx_events_au ON events (au);`,
    );
    // Migration for a store.sqlite created before the `au` column existed.
    const columns = this.db.prepare('PRAGMA table_info(events)').all() as { name: string }[];
    if (!columns.some((c) => c.name === 'au')) {
      this.db.exec("ALTER TABLE events ADD COLUMN au TEXT NOT NULL DEFAULT ''");
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_events_au ON events (au)');
    }

    this.stmtHas = this.db.prepare('SELECT 1 FROM events WHERE id = ?');
    this.stmtInsert = this.db.prepare(
      'INSERT OR IGNORE INTO events (id, gh, au, ts, ttl, blob) VALUES (?, ?, ?, ?, ?, ?)',
    );
    this.stmtGet = this.db.prepare(
      'SELECT blob FROM events WHERE id = ? AND (ts + ttl) >= ?',
    );
    this.stmtAllLive = this.db.prepare('SELECT blob FROM events WHERE (ts + ttl) >= ?');
    this.stmtLiveIds = this.db.prepare('SELECT id FROM events WHERE (ts + ttl) >= ?');
    this.stmtPrune = this.db.prepare('DELETE FROM events WHERE (ts + ttl) < ?');
    this.stmtCount = this.db.prepare('SELECT COUNT(*) AS n FROM events');
    this.stmtCountByAuthor = this.db.prepare('SELECT COUNT(*) AS n FROM events WHERE au = ?');
    this.stmtEvictOldest = this.db.prepare(
      'DELETE FROM events WHERE id IN (SELECT id FROM events ORDER BY ts ASC LIMIT ?)',
    );
    this.stmtEvictOldestByAuthor = this.db.prepare(
      'DELETE FROM events WHERE id IN (SELECT id FROM events WHERE au = ? ORDER BY ts ASC LIMIT ?)',
    );
  }

  /**
   * Verify and store a batch. Skips events that are expired, already known,
   * demo-only (see shared/demo.ts — a public demo URL must never land on a
   * real shared board), or fail signature/id verification. Returns exactly
   * the events that were newly stored, so the caller can broadcast just those
   * to other peers. Enforces the row/author caps once per batch afterward.
   */
  ingest(events: SetuEvent[], now: number): SetuEvent[] {
    const added: SetuEvent[] = [];
    const run = this.db.transaction((list: SetuEvent[]) => {
      for (const ev of list) {
        if (!isValidEventShape(ev)) continue; // malformed / oversized (cheap, pre-crypto)
        if (isDemoAuthor(ev.au) || ev.id === DEMO_BULLETIN_ID) continue; // synthetic demo data
        if (isExpired(ev, now) || isFutureDated(ev, now)) continue;
        if (this.stmtHas.get(ev.id)) continue; // already known
        if (!verifyEvent(ev)) continue; // untrusted / tampered
        this.stmtInsert.run(ev.id, ev.gh, ev.au, ev.ts, ev.ttl, JSON.stringify(ev));
        added.push(ev);
      }
      if (added.length) this.enforceLimits(added);
    });
    run(events);
    return added;
  }

  /**
   * Oldest-first eviction so storage stays bounded regardless of how many
   * valid-but-worthless events get signed and pushed. Only touches authors
   * that actually grew in this batch (cheap indexed lookups) plus one global
   * count check, rather than scanning the whole table on every ingest.
   */
  private enforceLimits(added: SetuEvent[]): void {
    const authors = new Set(added.map((e) => e.au));
    for (const au of authors) {
      const { n } = this.stmtCountByAuthor.get(au) as { n: number };
      if (n > this.maxPerAuthor) this.stmtEvictOldestByAuthor.run(au, n - this.maxPerAuthor);
    }
    const total = this.count();
    if (total > this.maxRows) this.stmtEvictOldest.run(total - this.maxRows);
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
   *
   * Only fetches (and JSON-parses) the blobs the peer is actually missing —
   * the id scan itself never touches the `blob` column — so a peer that's
   * already fully synced costs an id-only query, not a full-table parse.
   */
  reconcile(peerIds: string[], now: number): { missing: SetuEvent[]; want: string[] } {
    const peer = new Set(peerIds);
    const mine = new Set<string>();
    const missingIds: string[] = [];
    for (const { id } of this.stmtLiveIds.all(now) as { id: string }[]) {
      mine.add(id);
      if (!peer.has(id)) missingIds.push(id);
    }
    const want = peerIds.filter((id) => !mine.has(id));
    return { missing: this.getByIds(missingIds, now), want };
  }

  /** Delete expired events. Returns the number removed. */
  prune(now: number): number {
    return this.stmtPrune.run(now).changes;
  }

  /** Total rows (live + not-yet-pruned). */
  count(): number {
    return (this.stmtCount.get() as { n: number }).n;
  }

  /** True if the store can currently be written to (used by /healthz). */
  isWritable(): boolean {
    try {
      this.db.prepare('SELECT 1').get();
      return this.db.open && !this.db.readonly;
    } catch {
      return false;
    }
  }

  /** Close the underlying SQLite handle (graceful shutdown). */
  close(): void {
    this.db.close();
  }
}
