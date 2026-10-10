import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { SessionProvider } from './lib/session.jsx';
import { LanguageProvider } from './lib/i18n.jsx';
import LanguageGate from './components/LanguageGate.jsx';
import './index.css';
import { capture as installCapture } from './lib/install';

/* The app shell (public/sw.js, 2026-10-07): installable, and a notification tap
   opens the chat. It caches nothing, so registering it cannot serve stale pages. */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
}
// The browser's install offer, caught before it fires, for our own "Install the app" (lib/install.js).
installCapture();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <SessionProvider>
          <App />
          <LanguageGate />
        </SessionProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
