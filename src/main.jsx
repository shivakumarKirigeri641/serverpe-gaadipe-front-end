import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { SessionProvider } from './lib/session.jsx';
import { LanguageProvider } from './lib/i18n.jsx';
import LanguageGate from './components/LanguageGate.jsx';
import './index.css';

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
