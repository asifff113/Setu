import 'fake-indexeddb/auto';

import { createEvent, generateKeypair, pubkeyToAuthor } from '@setu/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './schema';
import { pruneEvents } from './events';

const now = 1_700_000_000;

beforeEach(async () => {
  await Promise.all([db.events.clear(), db.meta.clear(), db.blobs.clear(), db.circles.clear()]);
});

describe('local event retention', () => {
  it('keeps this device authored expired events as private history while pruning remote ones', async () => {
    const own = generateKeypair();
    const remote = generateKeypair();
    await db.meta.put({
      key: 'identity',
      secretKey: own.secretKey,
      publicKey: own.publicKey,
      author: pubkeyToAuthor(own.publicKey),
      createdAt: now - 1000,
    });
    const ownExpired = createEvent(
      { t: 'help', ts: now - 100, ttl: 10, gh: 'wh0r', st: 'need' },
      own,
    );
    const remoteExpired = createEvent(
      { t: 'help', ts: now - 100, ttl: 10, gh: 'wh0r', st: 'need' },
      remote,
    );
    await db.events.bulkPut([ownExpired, remoteExpired]);

    expect(await pruneEvents(now)).toBe(1);
    expect(await db.events.get(ownExpired.id)).toBeDefined();
    expect(await db.events.get(remoteExpired.id)).toBeUndefined();
  });
});
