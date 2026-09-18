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
  verifyCode: async (mobile, code) => call('/session/verify', { method: 'POST', auth: false, body: { mobile, code, client: await clientInfo() } })
    .catch((e) => { if (e.body && e.status === 401) return e.body; throw e; }),
  // Public: anyone may write, signed in or not; a token, if present, ties it to the account.
  contact: (message) => call('/contact', { method: 'POST', body: message }),
  session: () => call('/session'),
  signOut: async () => call('/session', { method: 'DELETE', body: { client: await clientInfo() } }),

  /* The account */
  me: () => call('/me'),
  saveMe: (body) => call('/me', { method: 'PUT', body }),
  deactivate: (reason) => call('/me/deactivate', { method: 'POST', body: { reason } }),

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
};
