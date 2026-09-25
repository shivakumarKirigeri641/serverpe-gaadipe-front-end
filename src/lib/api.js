import { clientInfo } from './device';
import { available as secureAvailable, secureCall } from './secure';
/**
 * api.js — every call gaadipe.in makes.
 *
 * Two sets of calls: the public ones (policies, pricing, sign-in) and the
 * customer's own. Both go through `call`, so a session that has ended is
 * handled in one place rather than on every screen.
 */

const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
/** A gateway page (checkout, report download) on the same origin the API calls use. */
export const gatewayUrl = (path) => `${BASE}${path}`;
const SITE = `${BASE}/site/api`;
const PUBLIC = `${BASE}/serverpe/platform/gaadipe/v1/public/users`;
const KEY = 'gaadipe.site.token';

export const WHATSAPP = import.meta.env.VITE_WHATSAPP || '916363271302';

/**
 * Is WhatsApp offered as a way in?
 *
 * Off while the browser journey is being watched on its own: every WhatsApp
 * link is a fork in the funnel, and a customer who leaves for WhatsApp is a
 * customer whose behaviour on the site cannot be read. The bot keeps running —
 * this hides the doors to it, it does not close them.
 */
export const WHATSAPP_ENABLED = import.meta.env.VITE_WHATSAPP_ENABLED === '1';

/**
 * Is there a web account at all? (user, 2026-09-25)
 *
 * GaadiPe moved onto WhatsApp: checking, paying and the report all happen in
 * the chat. With this off the site is the front door to that chat — no sign-in,
 * no /app — and every button opens WhatsApp. The pages are hidden, not deleted:
 * VITE_WEB_LOGIN=1 brings the whole browser journey back unchanged.
 *
 * Only honoured while WhatsApp is on; with neither there would be no way in.
 */
export const WEB_LOGIN = !WHATSAPP_ENABLED || import.meta.env.VITE_WEB_LOGIN !== '0';

/**
 * Is the QuizPe cross-sell shown?
 *
 * Off since 2026-09-23. Asking a scooter owner to recruit a school parent into
 * a quiz app, in order to earn a vehicle report, is two funnels multiplied by
 * each other — it was tapped zero times, and it competed for attention with
 * GaadiPe's own referral, which is one step and an obvious match. The backend,
 * the tables and the credits already earned all stay; this hides the doors.
 */
export const QUIZPE_ENABLED = import.meta.env.VITE_QUIZPE_ENABLED === '1';
export const waLink = (text) =>
  `https://wa.me/${WHATSAPP}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

export const getToken = () => { try { return localStorage.getItem(KEY) || null; } catch { return null; } };
export const setToken = (t) => {
  try { t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY); } catch { /* private mode */ }
};

const listeners = new Set();
export const onSignedOut = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const signedOut = () => { setToken(null); listeners.forEach((fn) => fn()); };

export class ApiError extends Error {
  constructor(message, { code = 'error', status = 0, body = null } = {}) {
    super(message);
    this.code = code; this.status = status; this.body = body;
  }
}

async function call(path, { method = 'GET', body, auth = true, base = SITE, timeoutMs = 45000 } = {}) {
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  /* The site's own API goes through the encrypted tunnel (lib/secure.js):
     the Network tab shows ciphertext only. The public policy pages do not. */
  let res; let data;
  try {
    if (base === SITE && secureAvailable()) {
      const out = await secureCall(SITE, {
        method, path, body, timeoutMs,
        headers: headers.Authorization ? { Authorization: headers.Authorization } : {},
      });
      res = { status: out.status, ok: out.ok };
      data = out.data || {};
    } else {
      res = await fetch(`${base}${path}`, {
        method, headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
      });
    }
  } catch (e) {
    throw new ApiError(e.name === 'TimeoutError'
      ? 'This is taking longer than usual. Please try again.'
      : 'We could not reach GaadiPe. Please check your connection.', { code: 'offline' });
  }

  if (data === undefined) data = await res.json().catch(() => ({}));

  if (res.status === 401 && auth) {
    signedOut();
    throw new ApiError(data.message || 'Please sign in again.', { code: 'signed_out', status: 401 });
  }
  if (!res.ok) {
    throw new ApiError(data.message || 'Something went wrong. Please try again.',
      { code: data.error || 'error', status: res.status, body: data });
  }
  return data;
}

/** A PDF the customer owns, fetched with their token rather than a plain link. */
async function pdf(path, download) {
  const token = getToken();
  const res = await fetch(`${SITE}${path}${download ? '?download=1' : ''}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (res.status === 401) { signedOut(); throw new ApiError('Please sign in again.', { code: 'signed_out' }); }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.message || 'That document is not available.', { status: res.status });
  }
  const disposition = res.headers.get('Content-Disposition') || '';
  const filename = (/filename="([^"]+)"/.exec(disposition) || [])[1] || 'document.pdf';
  return { blob: await res.blob(), filename };
}

export const api = {
  /* Public */
  pricing: () => call('/pricing', { auth: false }),
  policies: () => call('/policies', { auth: false, base: PUBLIC }),

  /* Signing in */
  /* Each sign-in step carries what the browser says about itself (lib/device.js). */
  requestCode: async (mobile) => call('/session/otp', { method: 'POST', auth: false, body: { mobile, client: await clientInfo() } })
    .catch((e) => { if (e.body && (e.status === 429 || e.status === 400)) return e.body; throw e; }),
  verifyCode: async (mobile, code, quizpeConsent = false) => call('/session/verify', { method: 'POST', auth: false, body: { mobile, code, quizpe_consent: quizpeConsent === true, client: await clientInfo() } })
    .catch((e) => { if (e.body && e.status === 401) return e.body; throw e; }),
  // Public: anyone may write, signed in or not; a token, if present, ties it to the account.
  contact: (message) => call('/contact', { method: 'POST', body: message }),
  session: () => call('/session'),
  signOut: async () => call('/session', { method: 'DELETE', body: { client: await clientInfo() } }),

  /* The account */
  me: () => call('/me'),
  saveMe: (body) => call('/me', { method: 'PUT', body }),
  deactivate: (reason) => call('/me/deactivate', { method: 'POST', body: { reason } }),
  resendEmail: () => call('/me/email/resend', { method: 'POST', body: {} }),
  setQuizpeConsent: (agree) => call('/me/consents', { method: 'PUT', body: { quizpe: agree === true } }),

  /* Support, opened from a WhatsApp link. Public: the token is the identity. */
  supportWho: (token) => fetch(`${PUBLIC}/support/${encodeURIComponent(token)}`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error('link_expired')))),
  supportSend: (token, body) => fetch(`${PUBLIC}/support/${encodeURIComponent(token)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }).then((r) => r.json()),

  /* GaadiPe referrals: refer someone who buys, your next report is free. */
  referral: () => call('/referral'),
  attachReferral: (code) => call('/referral/attach', { method: 'POST', body: { code } }),
  // Public: the page a referral link lands on (a signed-in owner is told it is their own).
  resolveReferralLink: (code) => call(`/r/${encodeURIComponent(code)}`),

  /* QuizPe referrals — switched off, kept for anyone holding an old credit. */
  referrals: () => call('/referrals'),
  joinReferral: ({ name, email }) => call('/referrals/join', { method: 'POST', body: { consent: true, name, email } }),
  // Public: the page a referral link lands on (a signed-in owner is told it is their own).
  resolveReferral: (code) => call(`/q/${encodeURIComponent(code)}`),
  useCredit: (regNo, language = 'en') => call('/credits/use', { method: 'POST', body: { reg_no: regNo, declared: true, language } }),

  /* Vehicles */
  vehicles: () => call('/vehicles'),
  vehicle: (regNo) => call(`/vehicles/${encodeURIComponent(regNo)}`),
  check: (regNo) => call('/check', { method: 'POST', body: { reg_no: regNo } })
    .catch((e) => { if (e.body && (e.status === 404 || e.status === 429 || e.status === 403)) return e.body; throw e; }),
  // The language travels with the purchase, so the declaration on file is the
  // one the customer actually read.
  buy: (regNo, declared, language = 'en', buyer = {}) =>
    call('/buy', { method: 'POST', body: { reg_no: regNo, declared: declared === true, language, ...buyer } }),
  declaration: (lang = 'en') => call(`/declaration?lang=${lang}`, { auth: false }),

  /* Documents */
  reports: () => call('/reports'),
  invoices: () => call('/invoices'),
  reportPdf: (id, download) => pdf(`/reports/${id}/file`, download),
  invoicePdf: (id, download) => pdf(`/invoices/${id}/file`, download),

  /* Where the customer is, for the Live screen. Signed in only; never fails a page. */
  /* Clicks, in a batch (components/ClickTracker.jsx). Signed in only; never fails a page. */
  trackBatch: (events) => (getToken() && events.length
    ? call('/activity', { method: 'POST', body: { events } }).catch(() => null)
    : Promise.resolve(null)),
  track: (event) => (getToken()
    ? call('/activity', { method: 'POST', body: event }).catch(() => null)
    : Promise.resolve(null)),
};
