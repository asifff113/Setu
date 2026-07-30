/**
 * Core Setu data model. Fields are kept short — packets travel over QR and SMS.
 */
export type SetuEventType =
  | 'checkin'
  | 'help'
  | 'bulletin'
  | 'person'
  | 'reply'
  | 'ack'
  | 'retract'
  | 'chat';
export type SetuStatus = 'safe' | 'need' | 'offer';
export type SetuCategory = 'med' | 'rescue' | 'food' | 'water' | 'shelter' | 'other';
export type SetuPersonStatus = 'missing' | 'found' | 'seen';
export type SetuSource = 'app' | 'sms';
export type SetuAckKind = 'onit' | 'done' | 'seen';
export type SetuAttachmentKind = 'img' | 'aud';
export type SetuUrgency = 'normal' | 'urgent' | 'critical';
export type SetuSeverity = 'info' | 'warning' | 'danger';

/** Tiny, signed pointer to bytes that travel only over an HTTP-capable link. */
export interface SetuAttachment {
  /** base64url SHA-256 of the attachment bytes (32 bytes / 43 chars). */
  h: string;
  k: SetuAttachmentKind;
  sz: number;
  /** Image width after privacy-preserving re-encoding. */
  w?: number;
  /** Optional BlurHash-style compact placeholder. */
  hh?: string;
}

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
  re?: string; // referenced parent event id (reply/ack/retract)
  ak?: SetuAckKind; // ack events only
  att?: SetuAttachment; // hash-referenced image/audio bytes
  urg?: SetuUrgency; // help events: self-reported urgency
  sev?: SetuSeverity; // bulletin events
  src?: SetuSource; // sms = gateway-attested, not author-signed
  x?: string; // opaque transport nonce, used by gateways to avoid id collisions
  sig: string; // base64url ed25519 signature over canonical body bytes
};

export const DEFAULT_TTL_SECONDS = 259200; // 72h
export const CHAT_TTL_SECONDS = 86400; // 24h
export const MAX_TTL_SECONDS = 604800; // 7 days
export const MAX_FUTURE_SKEW_SECONDS = 900; // 15 minutes

/** Body of a SetuEvent with the signature stripped, used for signing/hashing. */
export type SetuEventBody = Omit<SetuEvent, 'sig'>;
