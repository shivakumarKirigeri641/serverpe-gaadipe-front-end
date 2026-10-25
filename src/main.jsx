import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { SessionProvider } from './lib/session.jsx';
import { LanguageProvider } from './lib/i18n.jsx';
import './index.css';
import { capture as installCapture } from './lib/install';
import { startDevGuard } from './lib/devguard';

/* The app shell (public/sw.js, 2026-10-07): installable, and a notification tap
   opens the chat. It caches nothing, so registering it cannot serve stale pages. */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
}
// The browser's install offer, caught before it fires, for our own "Install the app" (lib/install.js).
installCapture();
// Developer-tools deterrents (lib/devguard.js, 2026-10-25) - the live site only, so local development stays debuggable.
if (import.meta.env.PROD) startDevGuard();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <SessionProvider>
          <App />
        </SessionProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
