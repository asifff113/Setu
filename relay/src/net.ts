/** LAN address discovery + private-address classification, shared by sync.ts and index.ts. */
import { networkInterfaces } from 'node:os';

/** True for localhost / RFC-1918 / mDNS hosts — mirrors app/src/sync/wsurl.ts's isPrivateWsUrl. */
export function isPrivateHost(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
  if (/^10\./.test(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return true;
  if (/\.local$/i.test(hostname)) return true;
  return false;
}

/**
 * Best-guess LAN IPv4 for reaching this relay from a phone on the same Wi-Fi.
 * Prefers RFC-1918 private ranges (a hotspot hands these out) and falls back to
 * any external IPv4, or null if the host has none.
 */
export function lanIPv4(): string | null {
  const addrs: string[] = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const ni of list ?? []) {
      // Node reports family as 'IPv4' (older) or the number 4 (newer builds).
      const isV4 = ni.family === 'IPv4' || (ni.family as unknown) === 4;
      if (isV4 && !ni.internal) addrs.push(ni.address);
    }
  }
  const find = (re: RegExp): string | undefined => addrs.find((a) => re.test(a));
  return (
    find(/^192\.168\./) ??
    find(/^10\./) ??
    find(/^172\.(1[6-9]|2\d|3[01])\./) ??
    addrs[0] ??
    null
  );
}
