import {
  bulletinEvents,
  bulletinTrust,
  latestPersonEvents,
  latestStatusEvents,
  verifyEvent,
} from '@setu/shared';
import { describe, expect, it } from 'vitest';
import { buildDemoEvents, DEMO_BULLETIN_ID, hasDemoSeed } from './demoSeed.js';

describe('demo seed', () => {
  it('builds ~16 events, every one verifiable', () => {
    const events = buildDemoEvents();
    expect(events.length).toBe(16);
    for (const event of events) {
      expect(verifyEvent(event)).toBe(true);
    }
    // ids are content hashes; a duplicate id would mean two events collapsed
    // into one on ingest.
    expect(new Set(events.map((e) => e.id)).size).toBe(events.length);
  });

  it('includes exactly one ✓ verified bulletin and one ⚠ unverified bulletin', () => {
    const bulletins = bulletinEvents(buildDemoEvents());
    expect(bulletins).toHaveLength(2);
    const trusts = bulletins.map(bulletinTrust).sort();
    expect(trusts).toEqual(['unverified', 'verified']);
    expect(bulletins.find((b) => b.id === DEMO_BULLETIN_ID)).toBeDefined();
    expect(bulletinTrust(bulletins.find((b) => b.id === DEMO_BULLETIN_ID)!)).toBe('verified');
  });

  it('produces distinct people, one SMS-sourced, and a missing + a found person', () => {
    const events = buildDemoEvents();
    const statuses = latestStatusEvents(events);
    expect(statuses.length).toBe(12); // 10 named + 1 rumor author is a bulletin, not status; 12 checkin/help
    expect(statuses.some((e) => e.src === 'sms')).toBe(true);

    const people = latestPersonEvents(events);
    expect(people).toHaveLength(2);
    expect(people.some((e) => e.pst === 'missing')).toBe(true);
    expect(people.some((e) => e.pst === 'found')).toBe(true);
  });

  it('is idempotent via hasDemoSeed', () => {
    const events = buildDemoEvents();
    expect(hasDemoSeed(events)).toBe(true);
    expect(hasDemoSeed([])).toBe(false);
  });
});
