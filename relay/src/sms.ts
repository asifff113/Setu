/**
 * SMS bridge orchestration (Phase 7). The pure grammar lives in
 * `@setu/shared` (sms.ts); this module is the relay-side glue: it normalizes
 * the two gateway webhook shapes, turns a parsed command into a relay-signed
 * `src:'sms'` event, answers `FIND` from the store, and sends the reply back
 * out (best-effort — logs only when no gateway is configured).
 *
 * SMS events carry no author key of their own, so the relay attests them with
 * its own identity (`src:'sms'` → 📟 badge in the app). They sync to every
 * peer exactly like app-authored events.
 */
import {
  createEvent,
  findLatestForName,
  formatConfirmReply,
  formatFindReply,
  parseSms,
  usageReply,
  type SetuEvent,
} from '@setu/shared';
import type { RelayIdentity } from './identity.js';
import type { EventStore } from './store.js';

/** Outbound gateway wiring, from env. When `url` is unset, replies are logged. */
export interface GatewayConfig {
  url?: string;
  key?: string;
  /** Which send API to speak. Inferred from the URL, overridable via env. */
  kind: 'android' | 'httpsms';
  /** Sender number, required by httpSMS' send API. */
  from?: string;
}

type Env = Record<string, string | undefined>;

/** Build a {@link GatewayConfig} from process env (GATEWAY_URL/KEY/KIND/FROM). */
export function gatewayFromEnv(env: Env): GatewayConfig {
  const url = env.GATEWAY_URL?.trim() || undefined;
  const explicit = env.GATEWAY_KIND?.trim().toLowerCase();
  const kind: GatewayConfig['kind'] =
    explicit === 'httpsms' || explicit === 'android'
      ? explicit
      : url && /httpsms/i.test(url)
        ? 'httpsms'
        : 'android';
  return { url, key: env.GATEWAY_KEY?.trim() || undefined, kind, from: env.GATEWAY_FROM?.trim() || undefined };
}

/** A normalized inbound SMS: the message text and the sender's number. */
export interface InboundSms {
  text: string;
  from: string;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
}

function asStr(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/**
 * Normalize the webhook body of the supported gateways into {@link InboundSms}.
 * Detected by field shape, most specific first:
 *   - android-sms-gateway (capcom6): { payload: { message, phoneNumber } }
 *   - httpSMS (CloudEvents):          { data: { contents, from } }
 *   - simple (our /sms-sim + curl):   { message|text|contents, from|phoneNumber }
 * Returns null when no text field can be found.
 */
export function extractInbound(body: unknown): InboundSms | null {
  const b = asRecord(body);
  if (!b) return null;

  const payload = asRecord(b.payload);
  if (payload && asStr(payload.message) !== undefined) {
    return { text: asStr(payload.message)!, from: asStr(payload.phoneNumber) ?? '' };
  }

  const data = asRecord(b.data);
  if (data && asStr(data.contents) !== undefined) {
    return { text: asStr(data.contents)!, from: asStr(data.from) ?? '' };
  }

  const text = asStr(b.message) ?? asStr(b.text) ?? asStr(b.contents);
  if (text !== undefined) {
    return { text, from: asStr(b.from) ?? asStr(b.phoneNumber) ?? '' };
  }
  return null;
}

/** Build the signed `src:'sms'` event for a storable command (null otherwise). */
export function buildSmsEvent(
  cmd: ReturnType<typeof parseSms>,
  identity: RelayIdentity,
  now: number,
): SetuEvent | null {
  const kp = { secretKey: identity.secretKey, publicKey: identity.publicKey };
  switch (cmd.kind) {
    case 'checkin':
      return createEvent(
        { t: 'checkin', ts: now, gh: cmd.area?.gh ?? '', n: cmd.name.slice(0, 32), st: 'safe', src: 'sms' },
        kp,
      );
    case 'help':
      return createEvent(
        {
          t: 'help',
          ts: now,
          gh: cmd.area?.gh ?? '',
          n: cmd.name.slice(0, 32),
          st: 'need',
          cat: cmd.cat,
          msg: cmd.msg?.slice(0, 280),
          src: 'sms',
        },
        kp,
      );
    case 'person':
      return createEvent(
        { t: 'person', ts: now, gh: cmd.area?.gh ?? '', pn: cmd.name.slice(0, 48), pst: cmd.pst, src: 'sms' },
        kp,
      );
    default:
      return null;
  }
}

/** Everything the inbound handler needs, injected so it stays unit-testable. */
export interface SmsDeps {
  identity: RelayIdentity;
  store: EventStore;
  /** Ingest externally-produced events and push new ones to peers; returns the new ones. */
  publish: (events: SetuEvent[]) => SetuEvent[];
  gateway: GatewayConfig;
  now?: () => number;
  log?: (msg: string) => void;
}

/** Result of processing one inbound SMS — shaped for the JSON webhook response. */
export interface SmsResult {
  status: number;
  json: {
    ok: boolean;
    error?: string;
    reply?: string;
    /** How many new events were stored (0 for find/unknown/duplicates). */
    stored?: number;
    to?: string;
    /** Whether the reply was handed to a gateway (false = logged only). */
    delivered?: boolean;
  };
}

/**
 * Send a reply through the configured gateway. Best-effort: returns false
 * (and logs) when no gateway is set or the request fails, so the inbound flow
 * never depends on outbound success.
 */
async function sendReply(to: string, text: string, deps: SmsDeps): Promise<boolean> {
  const { gateway, log } = deps;
  if (!gateway.url || !to) {
    log?.(`reply (not sent, no gateway/number) -> ${to || '?'}: ${text}`);
    return false;
  }
  try {
    let res: Response;
    if (gateway.kind === 'httpsms') {
      res = await fetch(gateway.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(gateway.key ? { 'x-api-key': gateway.key } : {}) },
        body: JSON.stringify({ content: text, from: gateway.from ?? '', to }),
      });
    } else {
      // android-sms-gateway (capcom6): Basic-auth, { message, phoneNumbers[] }.
      const headers: Record<string, string> = { 'content-type': 'application/json' };
      if (gateway.key) {
        headers.authorization = /^(basic|bearer)\s/i.test(gateway.key) ? gateway.key : `Basic ${gateway.key}`;
      }
      res = await fetch(gateway.url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: text, phoneNumbers: [to] }),
      });
    }
    if (!res.ok) log?.(`gateway send failed (${res.status}) -> ${to}`);
    return res.ok;
  } catch (err) {
    log?.(`gateway send error -> ${to}: ${String(err)}`);
    return false;
  }
}

/**
 * Process one inbound SMS end to end: parse, store (or query for FIND), reply.
 * The reply text is always returned in the JSON so /sms-sim can display it even
 * with no real gateway, and is additionally pushed to the gateway when set.
 */
export async function handleInboundSms(body: unknown, deps: SmsDeps): Promise<SmsResult> {
  const inbound = extractInbound(body);
  if (!inbound) {
    return { status: 400, json: { ok: false, error: 'unrecognized SMS webhook payload' } };
  }

  const now = (deps.now ?? (() => Math.floor(Date.now() / 1000)))();
  const cmd = parseSms(inbound.text);

  let stored = 0;
  let reply: string;

  if (cmd.kind === 'find') {
    reply = formatFindReply(findLatestForName(deps.store.allLive(now), cmd.name), cmd.name, now);
  } else if (cmd.kind === 'unknown') {
    reply = usageReply();
  } else {
    const event = buildSmsEvent(cmd, deps.identity, now);
    if (event) stored = deps.publish([event]).length;
    reply = formatConfirmReply(cmd) ?? usageReply();
  }

  const delivered = await sendReply(inbound.from, reply, deps);
  return { status: 200, json: { ok: true, reply, stored, to: inbound.from, delivered } };
}
