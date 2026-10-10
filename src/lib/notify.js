/**
 * src/lib/notify.js — browser notifications for the signed-in customer
 * (user, 2026-10-07: "after sign in, ask for browser notifications").
 *
 *   supported()   this browser can do it here (needs https, or localhost)
 *   state()       'on' | 'off' | 'blocked' | 'unsupported'
 *   enable()      ask (must follow a tap), subscribe, tell GaadiPe, show a "they're on" note
 *   disable()     unsubscribe here and at GaadiPe (sign-out, deactivation, switched off)
 *
 * Tapping a notification opens the chat (public/sw.js).
 */
import { api } from './api';

export const supported = () => typeof window !== 'undefined' && window.isSecureContext
  && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const keyBytes = (b64) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

async function registration() {
  const reg = await navigator.serviceWorker.register('/sw.js');
  return navigator.serviceWorker.ready.then(() => reg);
}

export async function state() {
  if (!supported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  if (Notification.permission !== 'granted') return 'off';
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = reg && await reg.pushManager.getSubscription();
  return sub ? 'on' : 'off';
}

export async function enable({ title = '🔔 GaadiPe alerts are on', body = 'We’ll tell you here about your vehicles — new challans, expiring insurance or PUC, and your reports.' } = {}) {
  if (!supported()) return 'unsupported';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off';
  setOff(false);
  const reg = await registration();
  const { key } = await api.pushKey();
  const sub = (await reg.pushManager.getSubscription())
    || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) });
  await api.pushSubscribe(sub.toJSON());
  // Shown by this browser itself, to show what they will look like — nothing is sent from the server.
  await reg.showNotification(title, { body, icon: '/icon-192.png', badge: '/icon-192.png', data: { url: '/chat' }, tag: 'gp-on' }).catch(() => {});
  return 'on';
}

/* Turned off here (the "Turn off" button, sign-out, deactivation): remembered, so
   resume() never switches them back on by itself. */
const OFF = 'gp.notify.off';
function setOff(v) { try { if (v) localStorage.setItem(OFF, '1'); else localStorage.removeItem(OFF); } catch { /* private mode */ } }
function isOff() { try { return localStorage.getItem(OFF) === '1'; } catch { return false; } }

/**
 * "Are they on?" from the Notifications menu (user, 2026-10-10: "if already on,
 * say it's already on"). The phone already said yes (permission granted) and it
 * was never turned off here: the subscription is made sure of — re-made if the
 * browser dropped it, and told to GaadiPe again (an upsert) — without asking again
 * and without a sample notification. Otherwise just the state.
 */
export async function resume() {
  if (!supported()) return 'unsupported';
  if (Notification.permission !== 'granted' || isOff()) return state();
  try {
    const reg = await registration();
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const { key } = await api.pushKey();
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) });
    }
    await api.pushSubscribe(sub.toJSON());
    return 'on';
  } catch { return state(); }
}

export async function disable() {
  if (!supported()) return;
  setOff(true);
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = reg && await reg.pushManager.getSubscription();
  if (!sub) return;
  await api.pushUnsubscribe(sub.endpoint).catch(() => {});
  await sub.unsubscribe().catch(() => {});
}
