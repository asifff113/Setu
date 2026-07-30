/**
 * One-shot geolocation read for the "attach my location" checkbox. Must be
 * triggered from a user gesture (checkbox toggle) — never on mount — since
 * browsers gate the permission prompt on that. Resolves to null on denial,
 * timeout, or when geolocation isn't available, so callers can degrade
 * silently instead of blocking the check-in flow.
 */
export async function getCurrentLocation(): Promise<[number, number] | null> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return null;
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 60_000,
      });
    });
    const lat = Math.round(pos.coords.latitude * 1000) / 1000;
    const lng = Math.round(pos.coords.longitude * 1000) / 1000;
    return [lat, lng];
  } catch {
    return null;
  }
}

/** Great-circle distance in kilometres between two [lat,lng] points. */
export function distanceKm(a: [number, number], b: [number, number]): number {
  const toRad = (degrees: number) => degrees * Math.PI / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
