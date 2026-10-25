/**
 * src/lib/devguard.js — deterrents for the browser's developer tools (user, 2026-10-25: "prevent the console
 * fetching data or calling the API … only tech people will try, 99% just want the info").
 *
 * NOT THE PROTECTION. Nothing in a page can stop the person who owns the browser: DevTools also opens from the
 * browser menu, and JavaScript can be switched off. The data is protected on the server - sign-in, payment
 * checks, masking, limits, the encrypted channel that refuses hand-made calls (security/tunnel.js), and the
 * alert-and-block for repeated direct calls (security/guard.js). This only makes curiosity unrewarding:
 *
 *   A  a plain warning in the console, as Facebook prints - always
 *   C  the page pauses with a notice while DevTools is open (site_devtools_pause, on) - ordinary customers
 *      never open them, so only the curious ever see it
 *   B  F12, Ctrl+Shift+I/J/C, Ctrl+U and right-click do nothing (site_devtools_block_keys, OFF by default):
 *      it touches ordinary customers too, so it is the admin's choice. Right-click stays inside text boxes,
 *      so pasting a number still works.
 *
 * Read from /notice, so the admin switches them without a rebuild.
 */
import { api } from './api';

function warn() {
  try {
    /* eslint-disable no-console */
    console.log('%cStop!', 'color:#d32f2f;font-size:44px;font-weight:900;');
    console.log('%cThis part of the browser is for developers. Calling GaadiPe’s systems directly is refused, '
      + 'logged and blocked, and is against our Terms of use. If someone asked you to paste something here, '
      + 'it is a scam - close this window.', 'font-size:15px;line-height:1.5;');
  } catch { /* a console that cannot style is fine */ }
}

/* ── C: pause while DevTools is open ───────────────────────────────────── */

let overlay = null;
function showPause(on) {
  if (on && !overlay) {
    overlay = document.createElement('div');
    overlay.setAttribute('role', 'alertdialog');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#0b1f1c;color:#fff;display:grid;'
      + 'place-items:center;padding:24px;text-align:center;font:600 17px/1.5 system-ui,sans-serif';
    overlay.innerHTML = '<div style="max-width:420px"><div style="font-size:44px">🔒</div>'
      + '<p style="font-size:22px;font-weight:800;margin:12px 0 6px">Developer tools are open</p>'
      + '<p style="opacity:.85;margin:0">For the safety of our customers’ data, GaadiPe pauses while they are open. '
      + 'Close them to continue.</p></div>';
    document.body.appendChild(overlay);
    warn();
  } else if (!on && overlay) {
    overlay.remove();
    overlay = null;
  }
}

/*
 * A `debugger` statement costs nothing with DevTools closed and stops the clock with them open - the one signal
 * that works in every browser and both docked and undocked. Built with Function so a build step that strips
 * `debugger` from source cannot remove it. Two slow ticks in a row before pausing, so one busy moment on a
 * slow phone never flashes the notice at a customer.
 */
function watchDevtools() {
  const probe = new Function('debugger'); // eslint-disable-line no-new-func
  let slow = 0;
  setInterval(() => {
    const t = performance.now();
    probe();
    const opened = performance.now() - t > 120;
    slow = opened ? slow + 1 : 0;
    if (slow >= 2) showPause(true);
    else if (!opened) showPause(false);
  }, 1000);
}

/* ── B: the keys and right-click (only when switched on) ───────────────── */

function blockKeys() {
  window.addEventListener('keydown', (e) => {
    const k = String(e.key || '').toLowerCase();
    const ctrl = e.ctrlKey || e.metaKey;
    const devtools = k === 'f12'
      || (ctrl && e.shiftKey && ['i', 'j', 'c', 'k'].includes(k))
      || (e.metaKey && e.altKey && ['i', 'j', 'c'].includes(k))
      || (ctrl && k === 'u');
    if (devtools) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  window.addEventListener('contextmenu', (e) => {
    const el = e.target;
    const typing = el && (el.closest?.('input, textarea, [contenteditable="true"]'));
    if (!typing) e.preventDefault();
  }, true);
}

export function startDevGuard() {
  if (typeof window === 'undefined') return;
  warn();
  api.notice().then((n) => {
    const d = n?.devtools || {};
    if (d.pause !== false) watchDevtools();
    if (d.block_keys === true) blockKeys();
  }).catch(() => watchDevtools());
}
