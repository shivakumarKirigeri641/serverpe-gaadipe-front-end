import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api, waLink, WHATSAPP, WHATSAPP_ENABLED, WHATSAPP_TRY } from '../lib/api';

/**
 * gaadipe.in/wa — INTO THE WHATSAPP APP (user, 2026-10-13: Jio TrueConnect would not
 * whitelist a wa.me link for the DLT SMS, so the SMS carries this address on GaadiPe's
 * own domain).
 *
 * WHY A TAP (user, 2026-10-13: "link not opening WhatsApp"): phones only open another app
 * from a real tap. A page that jumps by itself to wa.me lands on WhatsApp's web page, and
 * Android then blocks the jump into the app. So: one automatic try (works where it is
 * allowed), and a big button whose tap opens the app directly — an intent on Android
 * (falling back to wa.me if WhatsApp is missing), whatsapp:// on iPhone, wa.me elsewhere.
 * waLink adds the visitor's code, so the chat is tied to this visit.
 */
export default function GoWhatsApp() {
  /* WHICH NUMBER (user, 2026-10-24: "can we put gaadipe.in/wa" in the promo SMS). While the site is web-first,
     the "Try in WhatsApp" number (VITE_WHATSAPP_TRY) — but only while the server's switch says so
     (site_whatsapp_try, scripts/wa-button.js; the failsafe turns it off on a ban). Otherwise, as before
     (2026-10-14), the link opens the website's own chat instead of a number that cannot answer. */
  const [number, setNumber] = useState(WHATSAPP_ENABLED ? WHATSAPP : (WHATSAPP_TRY ? null : ''));
  useEffect(() => {
    if (number !== null) return;
    api.notice().then((n) => setNumber(n?.whatsapp_try === true ? WHATSAPP_TRY : '')).catch(() => setNumber(''));
  }, [number]);
  if (number === null) return <div style={{ minHeight: '100vh', background: '#0a4f49' }} />;
  if (!number) return <Navigate to="/chat" replace />;
  return <GoWhatsAppApp number={number} />;
}

function GoWhatsAppApp({ number }) {
  const web = waLink('Hi', number);
  const { app, name } = useMemo(() => {
    const ua = navigator.userAgent || '';
    const text = new URL(web).searchParams.get('text') || 'Hi';
    const q = `phone=${number}&text=${encodeURIComponent(text)}`;
    if (/android/i.test(ua)) {
      return { name: 'android', app: `intent://send/?${q}#Intent;scheme=whatsapp;package=com.whatsapp;S.browser_fallback_url=${encodeURIComponent(web)};end` };
    }
    if (/iphone|ipad|ipod/i.test(ua)) return { name: 'ios', app: `whatsapp://send?${q}` };
    return { name: 'other', app: web };
  }, [web, number]);

  useEffect(() => {
    // The automatic try: allowed on some phones and browsers; the button covers the rest.
    const t = setTimeout(() => { window.location.href = app; }, 300);
    return () => clearTimeout(t);
  }, [app]);

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0a4f49', color: '#fff', fontFamily: 'system-ui, sans-serif', padding: 24, textAlign: 'center' }}>
      <div style={{ maxWidth: 360 }}>
        <div style={{ fontSize: 44 }}>💬</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: '12px 0 6px' }}>GaadiPe on WhatsApp</h1>
        <p style={{ opacity: 0.9, margin: '0 0 22px' }}>Tap the button — WhatsApp opens with “Hi” typed. Just press Send.</p>
        <a href={app} data-test="open-whatsapp"
          style={{ display: 'block', background: '#25d366', color: '#fff', fontWeight: 800, fontSize: 18, padding: '16px 26px', borderRadius: 16, textDecoration: 'none', boxShadow: '0 10px 24px rgba(0,0,0,.25)' }}>
          Open WhatsApp
        </a>
        {name !== 'other' && (
          <a href={web} style={{ display: 'inline-block', color: '#ffd84d', marginTop: 16, fontSize: 14 }}>Not opening? Try this link</a>
        )}
        <p style={{ opacity: 0.75, fontSize: 13, marginTop: 14 }}>or save +{number.slice(0, 2)} {number.slice(2, 7)} {number.slice(7)} and send “Hi”</p>
        <a href="/chat" style={{ display: 'inline-block', color: '#fff', opacity: 0.8, marginTop: 18, fontSize: 13 }}>No WhatsApp? Continue on the website</a>
      </div>
    </div>
  );
}
