import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { tryDemo } from './lib/demoTrigger';
import { BoardScreen } from './screens/BoardScreen';
import { HomeScreen } from './screens/HomeScreen';
import { InfoScreen } from './screens/InfoScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { PublishScreen } from './screens/PublishScreen';
import { SyncScreen } from './screens/SyncScreen';
import { ChatScreen } from './screens/ChatScreen';
import { GuideScreen } from './screens/GuideScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { ShareScreen } from './screens/ShareScreen';
import { CircleScreen } from './screens/CircleScreen';
import { MediaStorageScreen } from './screens/MediaStorageScreen';
import { useAppStore } from './store/appStore';

// Leaflet + react-leaflet are the app's heaviest dependency and only the Map
// screen needs them, so they load as their own chunk on first visit to /map.
// vite-plugin-pwa precaches every built JS chunk, so this stays offline-safe.
const MapScreen = lazy(() => import('./screens/MapScreen').then((m) => ({ default: m.MapScreen })));

function ScreenFallback() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <span className="text-lg font-semibold text-muted">সেতু</span>
    </div>
  );
}

export default function App() {
  const ready = useAppStore((s) => s.ready);
  const onboarded = useAppStore((s) => s.settings?.onboarded ?? false);
  const appearance = useAppStore((state) => state.settings);

  // `?demo=1` (used for screenshots/video and shared links) loads the demo
  // seed the same way the onboarding "Try the demo" button does. Strip the
  // param afterward so reloading doesn't repeat the navigation.
  useEffect(() => {
    if (!ready) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('demo') !== '1') return;
    url.searchParams.delete('demo');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    void tryDemo();
  }, [ready]);

  useEffect(() => {
    if (!appearance) return;
    document.documentElement.dataset.theme = appearance.batterySaver ? 'dark' : appearance.theme;
    document.documentElement.classList.toggle('battery-saver', appearance.batterySaver);
    document.documentElement.classList.toggle('large-text', appearance.largeText);
  }, [appearance]);

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center bg-bg">
        <span className="text-2xl font-bold text-ink">সেতু</span>
      </div>
    );
  }

  if (!onboarded) return <OnboardingScreen />;

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomeScreen />} />
          <Route path="board" element={<BoardScreen />} />
          <Route path="chat" element={<ChatScreen />} />
          <Route path="alerts" element={<BoardScreen initialTab="bulletins" />} />
          <Route
            path="map"
            element={
              <Suspense fallback={<ScreenFallback />}>
                <MapScreen />
              </Suspense>
            }
          />
          <Route path="connect" element={<SyncScreen />} />
          <Route path="more" element={<InfoScreen />} />
          <Route path="guide" element={<GuideScreen />} />
          <Route path="history" element={<HistoryScreen />} />
          <Route path="share" element={<ShareScreen />} />
          <Route path="circle" element={<CircleScreen />} />
          <Route path="media" element={<MediaStorageScreen />} />
          <Route path="sync" element={<Navigate to="/connect" replace />} />
          <Route path="info" element={<Navigate to="/more" replace />} />
        </Route>
        {/* Hidden: not in the tab bar, reached only by typing the URL. */}
        <Route path="publish" element={<PublishScreen />} />
      </Routes>
    </BrowserRouter>
  );
}
