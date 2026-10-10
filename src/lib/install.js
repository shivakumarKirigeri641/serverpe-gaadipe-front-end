/**
 * src/lib/install.js — "Install the app" (user, 2026-10-10: the browser's own install
 * pop-up shows rarely — never on iPhone, and not again for months once closed — so
 * GaadiPe offers it itself, after sign-in and in the menu).
 *
 *   Android / Chrome   the browser's install offer is caught when it fires
 *                      (beforeinstallprompt) and opened by our button: the real
 *                      "Install GaadiPe" dialog, even after the browser's bar was closed.
 *   iPhone / iPad      Apple allows no pop-up: we show Share → "Add to Home Screen".
 *   installed          never offered (opened from the home screen, or just installed).
 *   "Not now"          not offered again for 14 days on this device.
 *
 * capture() must run once, early (main.jsx), before the browser fires its event.
 */

const LATER = 'gp.install.later';
const DONE = 'gp.install.done';
const LATER_DAYS = 14;

let deferred = null;
const listeners = new Set();
const changed = () => listeners.forEach((fn) => { try { fn(); } catch { /* the page's own problem */ } });

export function capture() {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();          // our button opens it, at a moment that makes sense
    deferred = e;
    changed();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    try { localStorage.setItem(DONE, '1'); } catch { /* private mode */ }
    changed();
  });
  /* Already installed, opened in the browser instead (user, 2026-10-10: "if already
     installed, no need to show"): Chrome on Android says so through the manifest's
     related_applications — remembered, so the offer is never shown here again. */
  try {
    navigator.getInstalledRelatedApps?.().then((apps) => {
      if (apps && apps.length) { try { localStorage.setItem(DONE, '1'); } catch { /* private mode */ } changed(); }
    }).catch(() => {});
  } catch { /* not supported */ }
}

/** Re-render when the browser's offer arrives or the app gets installed. */
export const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export const standalone = () => {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  } catch { return false; }
};
export const ios = () => /iPhone|iPad|iPod/i.test(navigator.userAgent || '')
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const installed = () => { try { return standalone() || localStorage.getItem(DONE) === '1'; } catch { return standalone(); } };
const laterActive = () => {
  try { const t = Number(localStorage.getItem(LATER) || 0); return t && Date.now() - t < LATER_DAYS * 86400e3; } catch { return false; }
};

/** 'prompt' (Android/Chrome can open the dialog), 'ios' (show the steps), or null (nothing to offer). */
export function mode() {
  if (installed()) return null;
  if (deferred) return 'prompt';
  if (ios()) return 'ios';
  return null;
}
/** Worth offering on its own (after sign-in): something to offer, and not put off recently. */
export const shouldOffer = () => Boolean(mode()) && !laterActive();

/** Opens the browser's install dialog. Resolves 'accepted' | 'dismissed' | 'unavailable'. */
export async function promptInstall() {
  if (!deferred) return 'unavailable';
  const e = deferred;
  deferred = null;               // a caught offer can be used once
  try {
    await e.prompt();
    const { outcome } = await e.userChoice;
    if (outcome === 'accepted') { try { localStorage.setItem(DONE, '1'); } catch { /* private mode */ } }
    changed();
    return outcome;
  } catch { changed(); return 'unavailable'; }
}
export function later() { try { localStorage.setItem(LATER, String(Date.now())); } catch { /* private mode */ } changed(); }
