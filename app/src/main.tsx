import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { useAppStore } from './store/appStore';
import { useEventsStore } from './store/eventsStore';
import './index.css';

// Generate/persist the device keypair, load settings, and load the local
// event log before first paint. Fire-and-forget: screens read from the
// stores once their `ready` flags flip true.
void useAppStore.getState().hydrate();
void useEventsStore.getState().hydrate();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
