import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import { MissingCard, PersonStatusCard } from '../components/BoardCards';
import { useI18n } from '../i18n';
import { areaLabel } from '../lib/area';
import { areaCounts, buildMapMarkers, type MapMarker } from '../lib/mapMarkers';
import { useEventsStore } from '../store/eventsStore';

const BANGLADESH_CENTER: [number, number] = [23.685, 90.3563];
const DEFAULT_ZOOM = 7;

// Mirror the Tailwind theme tokens (index.css `@theme`) — Leaflet's SVG
// renderer sets these as literal path attributes, not through the cascade,
// so a CSS var() reference here wouldn't resolve.
const SAFE_COLOR = '#2fb344';
const NEED_COLOR = '#e5322d';

/** `navigator.onLine`, kept live via the online/offline events. */
function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);
  return online;
}

/** Refits the view to the current markers whenever the plotted set changes, without fighting the user's own pan/zoom in between. */
function FitBounds({ markers }: { markers: MapMarker[] }) {
  const map = useMap();
  const key = markers.map((m) => m.id).join('|');

  useEffect(() => {
    if (markers.length === 0) return;
    if (markers.length === 1) {
      map.setView([markers[0]!.lat, markers[0]!.lng], 12);
      return;
    }
    const bounds = markers.map((m): [number, number] => [m.lat, m.lng]);
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 13 });
    // Intentionally keyed on the marker-id set, not `markers`/`map` — refit
    // only when who's plotted changes, not on every position/store update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
}

export function MapScreen() {
  const { t, lang } = useI18n();
  const events = useEventsStore((s) => s.events);
  const online = useOnlineStatus();

  // `navigator.onLine` only reports link state, not tile reachability: behind a
  // captive portal or a dead-but-connected Wi-Fi it stays true while every tile
  // 404s, leaving a blank map. Watch the TileLayer's own load/error events and
  // fall back to the area list when tiles are clearly unreachable.
  const [tilesFailed, setTilesFailed] = useState(false);
  const tileStats = useRef({ loaded: 0, errored: 0 });

  // Regaining connectivity earns tiles a fresh attempt.
  useEffect(() => {
    if (online) {
      tileStats.current = { loaded: 0, errored: 0 };
      setTilesFailed(false);
    }
  }, [online]);

  useEffect(() => {
    if (!online || tilesFailed) return;
    const timer = window.setTimeout(() => {
      if (tileStats.current.loaded === 0) setTilesFailed(true);
    }, 10_000);
    return () => window.clearTimeout(timer);
  }, [online, tilesFailed]);

  const tileHandlers = useMemo(
    () => ({
      tileload: () => {
        tileStats.current.loaded += 1;
      },
      tileerror: () => {
        const stats = tileStats.current;
        stats.errored += 1;
        // Several tiles failed and not one has ever loaded → the tile server is
        // unreachable despite `online`. Swap to the fallback.
        if (stats.loaded === 0 && stats.errored >= 3) setTilesFailed(true);
      },
    }),
    [],
  );

  const markers = useMemo(() => buildMapMarkers(events), [events]);
  const counts = useMemo(() => areaCounts(events), [events]);
  const showMap = online && !tilesFailed;

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-6">
      <h1 className="text-xl font-bold text-white">{t('mapTitle')}</h1>

      {showMap ? (
        <>
          <div className="h-[60vh] min-h-[320px] w-full overflow-hidden rounded-2xl">
            <MapContainer
              center={BANGLADESH_CENTER}
              zoom={DEFAULT_ZOOM}
              scrollWheelZoom
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                eventHandlers={tileHandlers}
              />
              <FitBounds markers={markers} />
              {markers.map((marker) => (
                <CircleMarker
                  key={marker.id}
                  center={[marker.lat, marker.lng]}
                  radius={9}
                  pathOptions={{
                    color: '#0b0b0c',
                    weight: 2,
                    fillColor: marker.color === 'safe' ? SAFE_COLOR : NEED_COLOR,
                    fillOpacity: 0.9,
                  }}
                >
                  <Popup minWidth={240}>
                    {marker.event.t === 'person' ? (
                      <MissingCard event={marker.event} />
                    ) : (
                      <PersonStatusCard event={marker.event} />
                    )}
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>

          <div className="flex items-center gap-4 text-xs text-white/60">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: SAFE_COLOR }} />
              {t('mapLegendSafe')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: NEED_COLOR }} />
              {t('mapLegendNeed')}
            </span>
          </div>

          {markers.length === 0 && <p className="pt-2 text-center text-sm text-white/40">{t('mapNoData')}</p>}
        </>
      ) : (
        <div className="flex flex-col gap-4 rounded-2xl bg-surface p-4">
          <div>
            <p className="text-sm font-medium text-white/80">{t('mapOfflineTitle')}</p>
            <p className="mt-1 text-xs text-white/40">{t('mapOfflineHint')}</p>
          </div>

          {counts.length === 0 ? (
            <p className="pt-2 text-center text-sm text-white/40">{t('mapNoData')}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {counts.map(({ gh, count }) => (
                <div
                  key={gh || 'unknown'}
                  className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3"
                >
                  <span className="text-sm text-white">{gh ? areaLabel(gh, lang) : t('unknownArea')}</span>
                  <span className="text-sm font-semibold text-white/70">
                    {count} {t('mapReportsSuffix')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
