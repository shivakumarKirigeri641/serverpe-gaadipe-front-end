/**
 * src/lib/vault.js — THE SIGN-IN, KEPT ENCRYPTED ON THE DEVICE (user,
 * 2026-10-07: "next time they arrive or tap a notification, open their chat —
 * with the saved session encrypted highly").
 *
 * The session token is never written in plain text. It is sealed with
 * AES-256-GCM under a key the browser generates as NON-EXTRACTABLE and keeps
 * in IndexedDB: page code can ask the browser to use the key, but can never
 * read or copy it, so a copied localStorage (a backup, a synced profile, a
 * snooping extension reading storage) holds only ciphertext that is useless
 * anywhere else. On the server the token is stored only as a hash, expires
 * after site_session_days of no use, and ends at sign-out.
 *
 *   vault.ready          resolves once the saved token (if any) is unsealed
 *   vault.get()          the token, from memory (synchronous)
 *   vault.set(token|null) keep it (sealed) or forget it
 *
 * A browser without IndexedDB or Web Crypto (some private modes) keeps the
 * token in memory only: signed in for this visit, asked again next time —
 * never a plain-text fallback.
 */

const DB = 'gaadipe-vault';
const STORE = 'keys';
const SEALED = 'gaadipe.site.token.sealed';
const LEGACY = 'gaadipe.site.token';            // the old plain-text place, migrated and removed

let token = null;

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
const idb = async (mode, fn) => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => { db.close(); resolve(req?.result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
};

let keyPromise = null;
/** The device's own key: made once, never extractable. */
function deviceKey() {
  if (!keyPromise) {
    keyPromise = (async () => {
      const found = await idb('readonly', (s) => s.get('k1'));
      if (found) return found;
      const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
      await idb('readwrite', (s) => s.put(key, 'k1'));
      return key;
    })();
  }
  return keyPromise;
}

const usable = () => typeof indexedDB !== 'undefined' && typeof crypto !== 'undefined' && crypto.subtle;

async function seal(value) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(location.host) },
    await deviceKey(), new TextEncoder().encode(value));
  return `v1.${b64(iv)}.${b64(ct)}`;
}
async function unseal(sealed) {
  const [v, iv, ct] = String(sealed || '').split('.');
  if (v !== 'v1' || !iv || !ct) return null;
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv), additionalData: new TextEncoder().encode(location.host) },
    await deviceKey(), unb64(ct));
  return new TextDecoder().decode(pt);
}

const ls = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* private mode */ } },
};

/** Unseal the saved sign-in once, at start; move an old plain-text token into the vault. */
const ready = (async () => {
  try {
    const legacy = ls.get(LEGACY);
    if (!usable()) { token = legacy || null; ls.set(LEGACY, null); return; }
    if (legacy) {
      token = legacy;
      ls.set(SEALED, await seal(legacy));
      ls.set(LEGACY, null);
      return;
    }
    const sealed = ls.get(SEALED);
    token = sealed ? await unseal(sealed) : null;
  } catch {
    // A key that no longer matches (cleared site data) means signing in again.
    token = null; ls.set(SEALED, null);
  }
})();

function set(value) {
  token = value || null;
  ls.set(LEGACY, null);
  if (!token) { ls.set(SEALED, null); return; }
  if (!usable()) return;                        // memory only
  seal(token).then((s) => { if (token === value) ls.set(SEALED, s); }).catch(() => {});
}

export const vault = { ready, get: () => token, set };
