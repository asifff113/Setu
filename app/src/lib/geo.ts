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
