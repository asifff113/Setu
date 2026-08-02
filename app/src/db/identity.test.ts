import { describe, expect, it } from 'vitest';
import {
  createGuestIdentity,
  getActiveIdentity,
  loadOrCreateIdentity,
  switchToPrimaryIdentity,
} from './identity';
import 'fake-indexeddb/auto';

describe('identity management & guest mode', () => {
  it('creates and returns primary identity', async () => {
    const primary = await loadOrCreateIdentity();
    expect(primary.author).toBeDefined();
    expect(primary.secretKey.length).toBe(32);

    const active = await getActiveIdentity();
    expect(active.isGuest).toBe(false);
    expect(active.row.author).toBe(primary.author);
  });

  it('switches to guest identity with fresh keypair and switches back', async () => {
    const primary = await loadOrCreateIdentity();
    const guest = await createGuestIdentity('Test Guest');

    expect(guest.author).not.toBe(primary.author);
    expect(guest.name).toBe('Test Guest');

    const active = await getActiveIdentity();
    expect(active.isGuest).toBe(true);
    expect(active.row.author).toBe(guest.author);

    const backToPrimary = await switchToPrimaryIdentity();
    expect(backToPrimary.author).toBe(primary.author);

    const activePrimary = await getActiveIdentity();
    expect(activePrimary.isGuest).toBe(false);
    expect(activePrimary.row.author).toBe(primary.author);
  });
});
