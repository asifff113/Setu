import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { tryDemo } from './lib/demoTrigger';
import { BoardScreen } from './screens/BoardScreen';
import { HomeScreen } from './screens/HomeScreen';
import { InfoScreen } from './screens/InfoScreen';
import { MapScreen } from './screens/MapScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { PublishScreen } from './screens/PublishScreen';
import { SyncScreen } from './screens/SyncScreen';
import { useAppStore } from './store/appStore';

export default function App() {
  const ready = useAppStore((s) => s.ready);
  const onboarded = useAppStore((s) => s.settings?.onboarded ?? false);

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

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center bg-bg">
        <span className="text-2xl font-bold text-white">সেতু</span>
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
          <Route path="map" element={<MapScreen />} />
          <Route path="sync" element={<SyncScreen />} />
          <Route path="info" element={<InfoScreen />} />
        </Route>
        {/* Hidden: not in the tab bar, reached only by typing the URL. */}
        <Route path="publish" element={<PublishScreen />} />
      </Routes>
    </BrowserRouter>
  );
}
