/**
 * WebSocket URL helpers for the relay transport.
 *
 * Two ways a device reaches a relay:
 *   - Auto: the origin it loaded the app from. A public host means the cloud
 *     relay (🟢); a private/LAN host means the app is being served by a laptop
 *     node (🟡).
 *   - Manual: a `ws://192.168.x.x:8787` typed or scanned on the Connect screen.
 *
 * Note (platform reality): a browser blocks `ws://` from an `https://` page as
 * mixed content, so the manual-node flow works when the app is loaded over
 * http (from the node itself, or localhost) — which is exactly the offline
 * hotspot demo path. See README "Sync".
 */

const DEFAULT_NODE_PORT = '8787';

/** Relay WS url derived from the page origin, or null for non-http(s) origins. */
export function deriveAutoWsUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const { protocol, host } = window.location;
  if (protocol === 'https:') return `wss://${host}/ws`;
  if (protocol === 'http:') return `ws://${host}/ws`;
  return null; // file:// or similar — no relay to reach
}

/**
 * Normalize a hand-typed or scanned local-node address to `ws[s]://host[:port]/ws`,
 * or null if it can't be parsed. Accepts bare hosts/IPs, host:port, and full
 * ws:// / http:// urls; defaults the port to 8787 for plain ws.
 */
export function normalizeNodeUrl(raw: string): string | null {
  let s = raw.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) s = s.replace(/^http/i, 'ws');
  if (!/^wss?:\/\//i.test(s)) s = `ws://${s}`;

  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  if (u.protocol !== 'ws:' && u.protocol !== 'wss:') return null;
  if (!u.hostname) return null;

  const port = u.port || (u.protocol === 'ws:' ? DEFAULT_NODE_PORT : '');
  const host = port ? `${u.hostname}:${port}` : u.hostname;
  return `${u.protocol}//${host}/ws`;
}

/** True when a ws url points at localhost or an RFC-1918 / .local LAN host. */
export function isPrivateWsUrl(url: string | null): boolean {
  if (!url) return false;
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return false;
  }
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
  if (/\.local$/i.test(host)) return true;
  return false;
}

/** Append the area's 2-char geohash prefix as the room hint `?gh=`. */
/** Append the area's 2-char geohash prefix as the room hint `?gh=`. */
export function withGh(url: string, gh: string): string {
  const prefix = gh.slice(0, 2);
  return prefix ? `${url}?gh=${encodeURIComponent(prefix)}` : url;
}

/** Convert a local node WebSocket URL to its corresponding HTTP landing page URL for NFC/browsers. */
export function nodeWsToHttpUrl(wsUrl: string): string {
  return wsUrl.replace(/^ws:/i, 'http:').replace(/^wss:/i, 'https:').replace(/\/ws(\?.*)?$/i, '');
}
