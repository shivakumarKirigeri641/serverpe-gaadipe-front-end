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
  const reg = await registration();
  const { key } = await api.pushKey();
  const sub = (await reg.pushManager.getSubscription())
    || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) });
  await api.pushSubscribe(sub.toJSON());
  // Shown by this browser itself, to show what they will look like — nothing is sent from the server.
  await reg.showNotification(title, { body, icon: '/icon-192.png', badge: '/icon-192.png', data: { url: '/chat' }, tag: 'gp-on' }).catch(() => {});
  return 'on';
}

export async function disable() {
  if (!supported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = reg && await reg.pushManager.getSubscription();
  if (!sub) return;
  await api.pushUnsubscribe(sub.endpoint).catch(() => {});
  await sub.unsubscribe().catch(() => {});
}
