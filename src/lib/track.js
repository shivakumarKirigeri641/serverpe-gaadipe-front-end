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

/* ────────────────────────── the live view (2026-10-07) ──
 * THE HEARTBEAT AND THE INTERACTIONS behind the web admin's Live users:
 *   journey({ step, section })   where the visitor is: a step of the journey and
 *                                what is on screen (a vehicle card, the full report…)
 *   interaction(kind, label)     a meaningful moment — tap | focus | error | search | open
 *   heartbeat                    every 20 s while the tab is visible, at once when it is
 *                                hidden or shown again: page, step, section, scroll depth
 * NOTHING TYPED IS EVER SENT. A focused field is named, never read; the sign-in
 * code field is only ever "a protected field". Labels are masked: an email
 * address or a long number in a button's text is replaced before it leaves.
 * If the server says monitoring is off for this visit, interactions stop
 * (the heartbeat keeps going: it is how the site knows the visit is alive).
 */
const URL_HB = `${BASE}/serverpe/platform/gaadipe/v1/public/users/hb`;
const state = { step: null, section: null, monitor: true, scroll: true, scrollEl: null };
const endedFns = new Set();
const maskLabel = (s) => String(s || '').replace(/\s+/g, ' ').trim()
  .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '[email]').replace(/\d{6,}/g, (d) => `${'•'.repeat(Math.max(0, d.length - 2))}${d.slice(-2)}`).slice(0, 80);

export function journey({ step, section } = {}) {
  let changed = false;
  if (step !== undefined && step !== state.step) { state.step = step; changed = true; }
  if (section !== undefined && section !== state.section) { state.section = section; changed = true; }
  if (changed) beatSoon();
}
/** The element whose scroll depth is reported (the chat's message list); the window if none. */
export const scrollSource = (el) => { state.scrollEl = el || null; };
export function interaction(kind, label, extra = {}) {
  if (!state.monitor) return;
  send('interaction', { kind, label: maskLabel(label), step: state.step, section: state.section, ...extra });
}
/*
 * THE LIVE REPLICA (user, 2026-10-08): the chat's conversation as it is on
 * screen, for the admin's visit view — sent after a change, at most every
 * 1.5 s. Only what is already on screen; never what is being typed. Stops with
 * the rest of the optional telemetry when monitoring is off for this visit.
 */
const URL_MR = `${BASE}/serverpe/platform/gaadipe/v1/public/users/mirror`;
let mirrorTimer = null; let mirrorNext = null; let mirrorLast = 0;
export function mirror(snapshot) {
  if (!state.monitor) return;
  mirrorNext = snapshot;
  if (mirrorTimer) return;
  const wait = Math.max(300, 1500 - (Date.now() - mirrorLast));
  mirrorTimer = setTimeout(async () => {
    mirrorTimer = null; mirrorLast = Date.now();
    const s = mirrorNext; mirrorNext = null;
    if (!s || !state.monitor) return;
    try {
      const res = await fetch(URL_MR, { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
        body: JSON.stringify({ visitor_id: visitorId(), session_id: sessionId(), page: location.pathname, ...s }) });
      const out = await res.json().catch(() => ({}));
      if (out.m === 'off') state.monitor = false;
    } catch { /* offline: the next change sends it again */ }
  }, wait);
}
/** Called when an admin ends this visit (the heartbeat says so): sign out. */
export const onEnded = (fn) => { endedFns.add(fn); return () => endedFns.delete(fn); };

function scrollPct() {
  try {
    const el = state.scrollEl;
    if (el) return el.scrollHeight <= el.clientHeight ? 100 : Math.round((100 * (el.scrollTop + el.clientHeight)) / el.scrollHeight);
    const h = document.documentElement;
    return h.scrollHeight <= innerHeight ? 100 : Math.round((100 * (scrollY + innerHeight)) / h.scrollHeight);
  } catch { return null; }
}
async function beat() {
  try {
    const res = await fetch(URL_HB, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ visitor_id: visitorId(), session_id: sessionId(), page: location.pathname + location.search,
        step: state.step, section: state.section, scroll: state.scroll ? scrollPct() : null, visible: document.visibilityState === 'visible',
        // The sign-in's own device id: lets support end exactly this browser's sign-in, nothing else.
        device_key: (() => { try { return localStorage.getItem('gaadipe.device') || undefined; } catch { return undefined; } })() }),
    });
    const out = await res.json().catch(() => ({}));
    state.monitor = out.m !== 'off';
    state.scroll = out.s !== 0;
    if (out.end) endedFns.forEach((fn) => { try { fn(); } catch { /* the page's own problem */ } });
  } catch { /* offline: try again on the next beat */ }
}
let soon = null;
const beatSoon = () => { clearTimeout(soon); soon = setTimeout(beat, 800); };
let started = false;
export function startHeartbeat() {
  if (started) return; started = true;
  beat();
  setInterval(() => { if (document.visibilityState === 'visible') beat(); }, 20000);
  document.addEventListener('visibilitychange', beat);
  addEventListener('pagehide', () => { try { navigator.sendBeacon?.(URL_HB, new Blob([JSON.stringify({ visitor_id: visitorId(), session_id: sessionId(), page: location.pathname, step: state.step, visible: false })], { type: 'application/json' })); } catch { /* gone */ } });

  // Every tap on a button or link, by its label — never what is typed.
  document.addEventListener('click', (e) => {
    const el = e.target?.closest?.('button, a, [role="button"], [role="switch"], [data-track]');
    if (!el || el.closest('[data-no-track]')) return;
    const label = el.getAttribute('data-track') || el.getAttribute('aria-label') || el.innerText || el.getAttribute('title') || '';
    if (label.trim()) interaction('tap', `Tapped “${maskLabel(label)}”`);
  }, true);
  // Which field has focus — its name only. The sign-in code is a protected field.
  document.addEventListener('focusin', (e) => {
    const f = e.target;
    if (!f || !/^(INPUT|TEXTAREA|SELECT)$/.test(f.tagName)) return;
    const protectedField = f.autocomplete === 'one-time-code' || f.type === 'password';
    const name = protectedField ? 'a protected field' : (f.getAttribute('data-field') || f.getAttribute('aria-label') || f.placeholder || f.name || 'a field');
    interaction('focus', `Interacting with ${protectedField ? name : `“${maskLabel(name)}”`}`);
  }, true);
}

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
