/**
 * Core Setu data model. Fields are kept short — packets travel over QR and SMS.
 */
export type SetuEventType = 'checkin' | 'help' | 'bulletin' | 'person';
export type SetuStatus = 'safe' | 'need';
export type SetuCategory = 'med' | 'rescue' | 'food' | 'water' | 'shelter' | 'other';
export type SetuPersonStatus = 'missing' | 'found' | 'seen';
export type SetuSource = 'app' | 'sms';

export type SetuEvent = {
  v: 1;
  t: SetuEventType;
  id: string; // base64url( sha256(canonical CBOR of body-without-sig)[0..16] )
  ts: number; // unix seconds, device clock
  ttl: number; // seconds; default 259200 (72h)
  gh: string; // geohash prefix precision 6 (area), '' if unknown
  au: string; // author pubkey, base64url (32 bytes)
  n?: string; // display name <= 32 chars
  st?: SetuStatus; // for checkin/help
  cat?: SetuCategory;
  msg?: string; // <= 280 chars
  loc?: [number, number]; // lat,lng rounded to 3 decimals, optional
  pn?: string; // person events: the missing/found person's name <= 48 chars
  pst?: SetuPersonStatus; // person events only
  src?: SetuSource; // sms = gateway-attested, not author-signed
  x?: string; // opaque transport nonce, used by gateways to avoid id collisions
  sig: string; // base64url ed25519 signature over canonical body bytes
};

export const DEFAULT_TTL_SECONDS = 259200; // 72h
export const MAX_TTL_SECONDS = 604800; // 7 days
export const MAX_FUTURE_SKEW_SECONDS = 900; // 15 minutes

/** Body of a SetuEvent with the signature stripped, used for signing/hashing. */
export type SetuEventBody = Omit<SetuEvent, 'sig'>;
