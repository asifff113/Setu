import type { SetuEvent } from './types.js';

export type SetuTransport = 'relay' | 'node' | 'file' | 'qr' | 'chirp' | 'sms';

/**
 * Explicit transport policy for each event family. Bytes referenced by `att`
 * never travel here—the tiny signed pointer may; the blob uses relay/node HTTP.
 */
export function canTransportEvent(event: SetuEvent, transport: SetuTransport): boolean {
  if (transport === 'relay' || transport === 'node' || transport === 'file') return true;
  if (transport === 'qr') return event.t !== 'chat';
  if (transport === 'sms') return event.src === 'sms';
  // The compact sound frame has a fixed four-type v1 wire enum and no bits for
  // references, media, severity, urgency, offers, or gateway attestations.
  return (
    event.src === undefined &&
    (event.t === 'checkin' || event.t === 'help' || event.t === 'bulletin' || event.t === 'person') &&
    event.st !== 'offer' &&
    event.att === undefined &&
    event.urg === undefined &&
    event.sev === undefined
  );
}
