import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { useSession } from '../lib/session';

/**
 * EVERY CLICK, RECORDED (user, 2026-09-21) — for signed-in customers only.
 *
 * One listener for the whole site. For each click on something clickable it
 * sends WHAT was clicked — its label ("Get the full report"), its kind
 * (button / link / tab / checkbox…) and where a link goes — and the page it
 * was on. It never reads what was typed: an input's value is not touched.
 * Clicks are collected and sent in small batches every few seconds, and when
 * the page is hidden, so tracking never slows a tap down.
 */
const CLICKABLE = 'a,button,[role="button"],[role="tab"],[role="menuitem"],input[type="checkbox"],input[type="radio"],input[type="submit"],select,summary';
const FLUSH_MS = 4000;
const MAX_BATCH = 50;

function describe(el) {
  const tag = el.tagName.toLowerCase();
  const type = (el.getAttribute('type') || '').toLowerCase();
  const kind = tag === 'a' ? 'link'
    : el.getAttribute('role') === 'tab' ? 'tab'
    : type === 'checkbox' ? 'checkbox' : type === 'radio' ? 'radio'
    : tag === 'select' ? 'select'
    : el.getAttribute('role') === 'menuitem' ? 'menu' : 'button';
  // The words a person sees on it — never a value they typed.
  let label = el.getAttribute('aria-label') || el.getAttribute('title') || '';
  if (!label && (type === 'checkbox' || type === 'radio')) label = el.closest('label')?.innerText || '';
  if (!label && tag === 'select') label = el.closest('label')?.querySelector('.label, span')?.innerText || el.getAttribute('name') || 'dropdown';
  if (!label && tag !== 'select' && tag !== 'input') label = el.innerText || el.querySelector('img')?.getAttribute('alt') || '';
  label = String(label).replace(/\s+/g, ' ').trim().slice(0, 80);
  return { el: kind, label, href: tag === 'a' ? el.getAttribute('href') : null };
}

export default function ClickTracker() {
  const { me } = useSession();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!me) return undefined;
    let queue = [];
    const flush = () => {
      if (!queue.length) return;
      const events = queue.slice(0, MAX_BATCH);
      queue = queue.slice(MAX_BATCH);
      api.trackBatch(events);
    };
    const onClick = (e) => {
      const el = e.target?.closest?.(CLICKABLE);
      if (!el) return;
      const d = describe(el);
      if (!d.label && !d.href) return;
      queue.push({ kind: 'click', page: window.location.pathname + window.location.search, ...d });
      // A link that leaves the page: send now, before the page goes.
      if (d.el === 'link' || queue.length >= MAX_BATCH) flush();
    };
    const onHide = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('click', onClick, true);
    document.addEventListener('visibilitychange', onHide);
    const timer = setInterval(flush, FLUSH_MS);
    return () => {
      flush();
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('visibilitychange', onHide);
      clearInterval(timer);
    };
  }, [me ? me.mobile || true : null]);

  // Nothing to draw. (pathname is read so a route change re-renders cheaply.)
  void pathname;
  return null;
}
