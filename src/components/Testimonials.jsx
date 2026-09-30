import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n.jsx';

/**
 * WHAT CUSTOMERS SAY (user, 2026-09-30) — feedback an admin approved, with the
 * words and name they chose. Nothing here is written by hand.
 *
 * Three or more: an endless, slow ribbon of cards that pauses under a finger or
 * the pointer. One or two: they rise in, side by side. Each card's stars light
 * up one after another the first time it is seen. With reduced motion asked
 * for, the cards simply sit in a row you can swipe. No approved feedback yet:
 * the section is not shown at all.
 */
const WORDS = {
  en: { h: 'What customers say', sub: 'Real words from people who used GaadiPe, shown with their permission.' },
  hi: { h: 'ग्राहक क्या कहते हैं', sub: 'GaadiPe इस्तेमाल करने वालों के असली शब्द, उनकी अनुमति से।' },
};
const GRADIENTS = [
  'linear-gradient(135deg,#0f766e,#14b8a6)', 'linear-gradient(135deg,#e08700,#f5c542)',
  'linear-gradient(135deg,#6d28d9,#a78bfa)', 'linear-gradient(135deg,#be123c,#fb7185)',
  'linear-gradient(135deg,#1d4ed8,#60a5fa)', 'linear-gradient(135deg,#047857,#34d399)',
];

export default function Testimonials() {
  const { lang } = useLang();
  const w = WORDS[lang] || WORDS.en;
  const [list, setList] = useState(null);
  const [seen, setSeen] = useState(false);
  const ref = useRef(null);
  useEffect(() => { api.testimonials().then((r) => setList(r?.testimonials || [])).catch(() => setList([])); }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return undefined;
    if (!('IntersectionObserver' in window)) { setSeen(true); return undefined; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [list, seen]);
  if (!list || !list.length) return null;

  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const ribbon = list.length >= 3 && !reduced;
  // Long enough to fill a wide screen, then doubled so the loop has no seam.
  const base = ribbon ? Array.from({ length: Math.max(1, Math.ceil(6 / list.length)) }, () => list).flat() : list;
  const secs = Math.max(30, base.length * 7);

  return (
    <section ref={ref} className="relative overflow-hidden border-y border-line bg-gradient-to-b from-white via-brand/[0.04] to-white py-14">
      <style>{`
        @keyframes gp-ribbon { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        @keyframes gp-rise { from { opacity: 0; transform: translateY(18px) scale(.98) } to { opacity: 1; transform: none } }
        @keyframes gp-star { 0% { transform: scale(.2) rotate(-40deg); opacity: 0 } 70% { transform: scale(1.3) rotate(8deg); opacity: 1 } 100% { transform: scale(1) rotate(0) } }
        @keyframes gp-glow { 0%,100% { opacity: .55 } 50% { opacity: 1 } }
        .gp-ribbon { animation: gp-ribbon ${secs}s linear infinite; }
        .gp-ribbon-wrap:hover .gp-ribbon, .gp-ribbon-wrap:active .gp-ribbon { animation-play-state: paused; }
      `}</style>
      <div aria-hidden="true" className="pointer-events-none absolute -left-20 top-10 h-60 w-60 rounded-full bg-brand/10 blur-3xl" style={{ animation: 'gp-glow 6s ease-in-out infinite' }} />
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-amber-300/20 blur-3xl" style={{ animation: 'gp-glow 7s ease-in-out infinite', animationDelay: '-3s' }} />

      <div className="wrap relative text-center">
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">{w.h}</h2>
        <p className="mx-auto mt-1.5 max-w-xl text-sm text-body">{w.sub}</p>
      </div>

      {ribbon ? (
        <div className="gp-ribbon-wrap relative mt-8"
          style={{ WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)', maskImage: 'linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)' }}>
          <div className="gp-ribbon flex w-max gap-4 px-2 sm:gap-6" style={{ animationPlayState: seen ? 'running' : 'paused' }}>
            {[...base, ...base].map((t, i) => <Card key={`${t.id}-${i}`} t={t} i={i % list.length} lit={seen} hidden={i >= base.length} />)}
          </div>
        </div>
      ) : (
        <div className={`wrap relative mt-8 flex gap-4 sm:justify-center ${reduced ? 'snap-x overflow-x-auto pb-2' : 'flex-wrap justify-center'}`}>
          {list.map((t, i) => (
            <div key={t.id} className="snap-start" style={seen && !reduced ? { animation: `gp-rise .7s cubic-bezier(.2,.8,.2,1) ${i * 0.12}s both` } : { opacity: seen || reduced ? 1 : 0 }}>
              <Card t={t} i={i} lit={seen || reduced} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Card({ t, i, lit, hidden = false }) {
  // No name given: the admin's stand-in ("Verified GaadiPe customer") gets a
  // tick instead of a letter, and the line under it does not repeat itself.
  const anonymous = /^verified\b|^anonymous\b/i.test(String(t.name || ''));
  const initial = anonymous ? '✓' : (String(t.name || '?').trim()[0] || '?').toUpperCase();
  return (
    <figure aria-hidden={hidden || undefined}
      className="relative flex w-[280px] shrink-0 flex-col rounded-2xl border border-line bg-white p-5 text-left shadow-card transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg sm:w-[330px]">
      <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1 select-none font-serif text-7xl leading-none"
        style={{ background: GRADIENTS[i % GRADIENTS.length], WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', opacity: 0.25 }}>”</span>
      <div className="flex gap-0.5 text-lg" aria-label={`${t.rating} out of 5`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} style={{
            color: n <= t.rating ? '#f5a623' : '#dfe6e4',
            display: 'inline-block',
            animation: lit && n <= t.rating ? `gp-star .5s cubic-bezier(.2,.9,.3,1.3) ${0.15 + n * 0.12}s both` : 'none',
            textShadow: n <= t.rating ? '0 1px 6px rgba(245,166,35,.35)' : 'none',
          }}>★</span>
        ))}
      </div>
      <blockquote className="mt-3 flex-1 text-[15px] leading-relaxed text-ink">“{t.text}”</blockquote>
      <figcaption className="mt-4 flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white shadow-md"
          style={{ background: GRADIENTS[i % GRADIENTS.length] }} aria-hidden="true">{initial}</span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-ink">{t.name}</span>
          <span className="block text-2xs text-muted">{anonymous ? t.month : `✔ GaadiPe customer · ${t.month}`}</span>
        </span>
      </figcaption>
    </figure>
  );
}
