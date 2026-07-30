import { createEvent, generateKeypair } from '@setu/shared';
import { describe, expect, it } from 'vitest';
import { dashboardPage, eventCsv } from './dashboard.js';

const keypair = generateKeypair();

describe('coordinator dashboard', () => {
  it('renders aggregate open-needs and offers without exposing event messages', () => {
    const need = createEvent(
      { t: 'help', ts: 1, gh: 'wh0r', st: 'need', cat: 'water', msg: 'private roof details' },
      keypair,
    );
    const offer = createEvent(
      { t: 'help', ts: 2, gh: 'wh0r', st: 'offer', cat: 'shelter' },
      keypair,
    );
    const html = dashboardPage([need, offer]);
    expect(html).toContain('1</div>Open needs');
    expect(html).toContain('1</div>Offers');
    expect(html).not.toContain('private roof details');
  });

  it('CSV-quotes user-controlled cells', () => {
    const event = createEvent(
      { t: 'bulletin', ts: 1, gh: 'wh0r', msg: 'Road "A", closed' },
      keypair,
    );
    const csv = eventCsv([event]);
    expect(csv).toContain('"Road ""A"", closed"');
  });
});
