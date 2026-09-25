/**
 * src/lib/track.js — anonymous website events for the admin command center
 * (user, 2026-09-25).
 *
 * The site signs nobody in any more, so without this the back end sees no
 * visitor at all. It records, for every visitor (signed in or not):
 *
 *   session_started       once per tab: the landing page, the referrer, UTM tags
 *   page_view             each page
 *   whatsapp_cta_clicked  each tap on a link into WhatsApp
 *
 * and gives every WhatsApp link the visitor's five-character code — "Hi #K7Q2M"
 * — which the bot reads to join this visit to the chat that follows. A wa.me
 * link can carry nothing but visible text, so this is the only way.
 *
 * Nothing typed is ever read. No cookies. Sent with fetch keepalive, so a tap
 * that leaves the page for WhatsApp is still recorded; failures are ignored —
 * the site must never wait on, or break because of, its own analytics.
 */

const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
const URL_T = `${BASE}/serverpe/platform/gaadipe/v1/public/users/t`;
const VID_KEY = 'gp.vid';
const SID_KEY = 'gp.sid';
const CODE_KEY = 'gp.wacode';

const rand = (n) => {
  const a = new Uint8Array(n);
  (window.crypto || {}).getRandomValues?.(a);
  return Array.from(a, (b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
};
const store = (s, k, make) => {
  try { let v = s.getItem(k); if (!v) { v = make(); s.setItem(k, v); } return v; } catch { return make(); }
};

export const visitorId = () => store(localStorage, VID_KEY, () => `v_${rand(20)}`);
const sessionId = () => store(sessionStorage, SID_KEY, () => `s_${rand(20)}`);

/*
 * The WhatsApp code: the same five characters the back end derives from the
 * visitor id (src/events/track.js codeFor) — SHA-256, first five bytes, over an
 * alphabet without look-alikes. Worked out here so links can carry it before
 * any request returns; cached so it is instant on the next visit.
 */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
let code = (() => { try { return localStorage.getItem(CODE_KEY) || null; } catch { return null; } })();
async function computeCode() {
  if (!window.crypto?.subtle) return null;
  const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(visitorId()));
  const b = new Uint8Array(buf);
  let out = '';
  for (let i = 0; i < 5; i++) out += ALPHABET[b[i] % ALPHABET.length];
  try { localStorage.setItem(CODE_KEY, out); } catch { /* private mode */ }
  return out;
}
computeCode().then((c) => { if (c) code = c; }).catch(() => {});

/** "Hi" -> "Hi #K7Q2M" once the code is known; unchanged before. */
export const withCode = (text) => (code && !/#[2-9A-HJKMNP-Z]{5}\b/.test(text || '') ? `${text || 'Hi'} #${code}` : text);

let seq = 0;
function send(name, extra = {}) {
  try {
    const body = JSON.stringify({
      name,
      visitor_id: visitorId(),
      session_id: sessionId(),
      event_id: `e_${Date.now().toString(36)}_${(seq += 1)}_${rand(6)}`,
      page: location.pathname + location.search,
      ...extra,
    });
    fetch(URL_T, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true })
      .catch(() => {});
  } catch { /* never break the page */ }
}

const utmOf = () => {
  const q = new URLSearchParams(location.search);
  const u = {};
  for (const k of ['source', 'medium', 'campaign', 'term', 'content']) {
    const v = q.get(`utm_${k}`);
    if (v) u[k] = v.slice(0, 120);
  }
  return u;
};

/** Once per tab: where this visit came from. */
export function startSession() {
  try {
    if (sessionStorage.getItem('gp.started')) return;
    sessionStorage.setItem('gp.started', '1');
  } catch { /* private mode: record it anyway */ }
  send('session_started', {
    landing: location.pathname + location.search,
    referrer: document.referrer || '',
    utm: utmOf(),
  });
}

export const pageView = () => send('page_view', { utm: utmOf() });

/*
 * Every tap on a link into WhatsApp, wherever it is on the site: recorded,
 * and — if the link was drawn before the code was ready — given the code on
 * the way out. Listening in the capture phase lets the href change before the
 * browser follows it.
 */
export function watchWhatsAppLinks() {
  document.addEventListener('click', (e) => {
    const a = e.target?.closest?.('a[href*="wa.me/"], a[href*="api.whatsapp.com"]');
    if (!a) return;
    try {
      const u = new URL(a.href);
      const text = u.searchParams.get('text') || 'Hi';
      const coded = withCode(text);
      if (coded !== text) { u.searchParams.set('text', coded); a.href = u.toString(); }
    } catch { /* leave the link as it is */ }
    send('whatsapp_cta_clicked', { label: (a.innerText || a.getAttribute('aria-label') || '').trim().slice(0, 80) });
  }, true);
}
