/*
 * GaadiPe's service worker (2026-10-07). Deliberately small: it does NOT cache
 * pages (a stale screen is worse than a slow one). It exists so that
 *   - gaadipe.in can be installed as an app, and
 *   - tapping a GaadiPe notification opens the chat — focusing a GaadiPe tab
 *     that is already open, or opening a new one. The sign-in is kept sealed
 *     on the device (src/lib/vault.js), so the chat opens signed in.
 * A notification may carry data.url (a path on gaadipe.in, e.g. /chat?open=KA01AB1234).
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const wanted = (() => {
    try {
      const u = new URL(event.notification.data?.url || '/chat', self.location.origin);
      return u.origin === self.location.origin ? u.href : `${self.location.origin}/chat`;
    } catch { return `${self.location.origin}/chat`; }
  })();
  event.waitUntil((async () => {
    const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const tab = tabs.find((c) => new URL(c.url).origin === self.location.origin);
    if (tab) { await tab.focus(); if ('navigate' in tab) await tab.navigate(wanted).catch(() => {}); return; }
    await self.clients.openWindow(wanted);
  })());
});

/* Push messages (when switched on later) arrive as { title, body, url }. */
self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { body: event.data && event.data.text() }; }
  event.waitUntil(self.registration.showNotification(d.title || 'GaadiPe', {
    body: d.body || '', icon: '/icon-192.png', badge: '/icon-192.png',
    data: { url: d.url || '/chat' }, tag: d.tag || undefined,
  }));
});
