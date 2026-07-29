import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { useAppStore } from './store/appStore';
import { useEventsStore } from './store/eventsStore';
import { useSyncStore } from './store/syncStore';
import './index.css';

// Generate/persist the device keypair, load settings, and load the local
// event log before first paint. Fire-and-forget: screens read from the
// stores once their `ready` flags flip true.
void useAppStore.getState().hydrate().catch((error: unknown) => {
  const root = document.getElementById('root');
  if (root) root.textContent = error instanceof Error ? `Setu could not start: ${error.message}` : 'Setu could not start';
});
void useEventsStore.getState().hydrate();

// Start relay sync (reconnecting; safe when there's no relay to reach — that
// simply reads as 🔴 offline, which is a normal state for Setu).
useSyncStore.getState().init();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
