import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLang } from '../lib/i18n.jsx';
import { waLink, CHECK_ON_WHATSAPP } from '../lib/api';

/**
 * THE CELEBRATION (user, 2026-10-16: "every increment of 100 customers, launch a celebration
 * animation" — "it must always trigger for any user when landing on that page, once").
 * The server sends the latest hundred reached (site/stats.js `milestone`: 100, 200, 300 …).
 * Every landing on the home page shows it once: confetti from both sides, the number counting
 * up, and a way in. It closes itself after a few seconds, or on a tap. With reduced motion,
 * the card alone, no confetti.
 */
const COLORS = ['#0f766e', '#14b8a6', '#facc15', '#f97316', '#22c55e', '#3b82f6', '#ec4899'];

function confetti(canvas) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const W = (canvas.width = window.innerWidth * dpr);
  const H = (canvas.height = window.innerHeight * dpr);
  const bits = [];
  // Two cannons, bottom-left and bottom-right, firing up and inward.
  for (const side of [0, 1]) {
    for (let i = 0; i < 110; i += 1) {
      const angle = (side ? 180 - (55 + Math.random() * 30) : 55 + Math.random() * 30) * (Math.PI / 180);
      const speed = (11 + Math.random() * 9) * dpr;
      bits.push({
        x: side ? W : 0, y: H * 0.92, vx: Math.cos(angle) * speed, vy: -Math.sin(angle) * speed,
        w: (6 + Math.random() * 6) * dpr, h: (8 + Math.random() * 8) * dpr,
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.35,
        color: COLORS[Math.floor(Math.random() * COLORS.length)], round: Math.random() < 0.3,
      });
    }
  }
  let frame = 0; let raf = 0;
  const tick = () => {
    frame += 1;
    ctx.clearRect(0, 0, W, H);
    for (const b of bits) {
      b.vy += 0.32 * dpr; b.vx *= 0.99; b.vy *= 0.99;
      b.x += b.vx; b.y += b.vy; b.rot += b.vr;
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot);
      ctx.globalAlpha = Math.max(0, 1 - frame / 260);
      ctx.fillStyle = b.color;
      if (b.round) { ctx.beginPath(); ctx.arc(0, 0, b.w / 2, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h * Math.abs(Math.cos(b.rot)) + 2);
      ctx.restore();
    }
    if (frame < 260) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

/* The number counting up to the milestone, quickly. */
function useCountUp(target, run) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return undefined;
    let raf = 0; const t0 = performance.now(); const dur = 1200;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      setN(Math.round(target * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, run]);
  return n;
}

/* `value` is the hundred reached (it decides whether to celebrate); `exact` is the real count
   shown — never "200+" (user, 2026-10-16: "show exact numbers"). */
export default function Milestone({ value, exact = null }) {
  const { t } = useLang();
  const [open, setOpen] = useState(Boolean(value));
  const canvas = useRef(null);
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const shown = exact && exact >= (value || 0) ? exact : value;
  const n = useCountUp(shown || 0, open && !reduced);

  useEffect(() => { setOpen(Boolean(value)); }, [value]);
  useEffect(() => {
    if (!open) return undefined;
    const stop = !reduced && canvas.current ? confetti(canvas.current) : () => {};
    const close = setTimeout(() => setOpen(false), 6500);
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', esc);
    return () => { stop(); clearTimeout(close); window.removeEventListener('keydown', esc); };
  }, [open, reduced]);

  if (!open || !value) return null;
  const href = CHECK_ON_WHATSAPP ? waLink('Hi') : '/chat';
  /* DRAWN ON THE PAGE ITSELF (user, 2026-10-16: "too far down on desktop, people get confused"):
     inside the stats section, an animated parent pinned the overlay to that section instead of
     the screen. A portal into <body> keeps it in the middle of the screen, wherever the visitor is. */
  return createPortal((
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-label={t('home.milestone.h', { n: shown })}
      onClick={() => setOpen(false)} data-test="milestone">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px] milestone-fade" />
      <canvas ref={canvas} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white p-6 text-center shadow-2xl milestone-pop" onClick={(e) => e.stopPropagation()}>
        <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-brand/10" />
        <div className="pointer-events-none absolute -bottom-12 -right-8 h-36 w-36 rounded-full" style={{ background: 'rgba(250, 204, 21, .2)' }} />
        <div className="relative text-5xl milestone-bounce" aria-hidden="true">🎉</div>
        <div className="relative mt-2 bg-gradient-to-r from-brand to-brand-deep bg-clip-text text-5xl font-black tabular-nums text-transparent">
          {reduced ? shown : n}
        </div>
        <h2 className="relative mt-1 text-xl font-extrabold text-ink">{t('home.milestone.h', { n: shown })}</h2>
        <p className="relative mt-2 text-sm text-body">{t('home.milestone.sub')}</p>
        <a href={href} className="btn-primary btn-big btn-arrow relative mt-5 w-full justify-center">
          {t('home.milestone.cta')} <span className="arrow">→</span>
        </a>
        <button type="button" className="relative mt-2 text-sm text-muted hover:text-ink" onClick={() => setOpen(false)}>{t('home.milestone.close')}</button>
      </div>
    </div>
  ), document.body);
}
