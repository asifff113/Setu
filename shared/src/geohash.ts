const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/**
 * Standard geohash encoder. `areas.ts` calls this at precision 6 (~1.2km x
 * 0.6km cells) for the `Area.gh` "area" key — precision 4 (~39km x 20km) is
 * too coarse to separate Bangladesh's closely-clustered city thanas (several
 * Dhaka neighborhoods collapse to one cell at precision 4-5). `precision` is
 * required (no default) so a bare call can't silently produce a too-coarse hash.
 */
export function geohashEncode(lat: number, lon: number, precision: number): string {
  let latMin = -90;
  let latMax = 90;
  let lonMin = -180;
  let lonMax = 180;
  let isEven = true;
  let bit = 0;
  let ch = 0;
  let geohash = '';

  while (geohash.length < precision) {
    if (isEven) {
      const mid = (lonMin + lonMax) / 2;
      if (lon > mid) {
        ch |= 1 << (4 - bit);
        lonMin = mid;
      } else {
        lonMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat > mid) {
        ch |= 1 << (4 - bit);
        latMin = mid;
      } else {
        latMax = mid;
      }
    }
    isEven = !isEven;
    if (bit < 4) {
      bit++;
    } else {
      geohash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return geohash;
}
