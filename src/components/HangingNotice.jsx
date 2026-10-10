import { useEffect, useState } from 'react';
import { useLang } from '../lib/i18n.jsx';

/*
 * THE HANGING NOTICE (user, 2026-10-10: "a hanging label saying GaadiPe is now serving on
 * the web, with browser notifications, mail and SMS alerts, because the WhatsApp account
 * was disabled"). A small sign hanging on two strings below the header, on every page —
 * the chat too. It swings in, then sways; ✕ folds it to a "📢" tag for 3 days, and a tap
 * on the tag hangs it again.
 */
const KEY = 'gp.hang.folded';
const DAYS = 3;
// Shown for a month (user, 2026-10-10: "give for month"), then it takes itself down.
const UNTIL = new Date('2026-11-10T23:59:59+05:30');
const TEXT = {
  en: {
    title: 'GaadiPe is now on the web',
    body: 'Our WhatsApp account was disabled, so GaadiPe now serves you right here — with alerts by browser notifications, email and SMS.',
    tag: 'Notice', fold: 'Fold the notice',
  },
  hi: {
    title: 'GaadiPe अब वेब पर है',
    body: 'हमारा WhatsApp अकाउंट बंद कर दिया गया, इसलिए GaadiPe अब यहीं आपकी सेवा करता है — अलर्ट ब्राउज़र नोटिफ़िकेशन, ईमेल और SMS से।',
    tag: 'सूचना', fold: 'सूचना बंद करें',
  },
};

/*
 * The nail sits on the header's bottom edge, wherever that is: below the top bar on the
 * home page, at the top once the page scrolls (the header is sticky), under the chat's bar.
 * So the sign never covers the header's buttons.
 */
export function useNailY(fallback) {
  const [y, setY] = useState(fallback);
  useEffect(() => {
    const place = () => {
      const h = document.querySelector('header');
      setY(h ? Math.max(0, Math.round(h.getBoundingClientRect().bottom) - 4) : fallback);
    };
    place();
    const late = [setTimeout(place, 400), setTimeout(place, 1500)];   // after the top bar loads
    window.addEventListener('scroll', place, { passive: true });
    window.addEventListener('resize', place);
    return () => { late.forEach(clearTimeout); window.removeEventListener('scroll', place); window.removeEventListener('resize', place); };
  }, [fallback]);
  return y;
}

const foldedNow = () => {
  try { return Date.now() - Number(localStorage.getItem(KEY) || 0) < DAYS * 864e5; } catch { return false; }
};

export default function HangingNotice() {
  const { lang } = useLang();
  const t = TEXT[lang === 'hi' ? 'hi' : 'en'];
  const [folded, setFolded] = useState(foldedNow);
  const nailY = useNailY(58);
  const fold = () => { try { localStorage.setItem(KEY, String(Date.now())); } catch { /* private mode */ } setFolded(true); };
  const unfold = () => { try { localStorage.removeItem(KEY); } catch { /* private mode */ } setFolded(false); };
  if (Date.now() > UNTIL.getTime()) return null;
  return (
    <div className="pointer-events-none fixed right-3 z-40" style={{ top: `${nailY}px` }} data-test="hanging-notice">
      <div className={`hang-sign pointer-events-auto relative pt-4 ${folded ? 'hang-sway' : 'hang-swing'}`} key={folded ? 'tag' : 'sign'}>
        {/* the strings and the nail */}
        <span aria-hidden="true" className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#0a4f49]" />
        <span aria-hidden="true" className="absolute top-0.5 h-[1.15rem] w-px origin-top bg-[#0a4f49]/60" style={{ left: '50%', transform: 'rotate(38deg)' }} />
        <span aria-hidden="true" className="absolute top-0.5 h-[1.15rem] w-px origin-top bg-[#0a4f49]/60" style={{ left: '50%', transform: 'rotate(-38deg)' }} />
        {folded ? (
          <button type="button" onClick={unfold} data-test="hanging-open"
            className="rounded-full border-2 border-[#0a4f49] bg-[#ffd84d] px-3 py-1 text-[12px] font-black text-[#0a4f49] shadow-md">
            📢 {t.tag}
          </button>
        ) : (
          <div role="status" className="w-[17.5rem] max-w-[calc(100vw-1.5rem)] rounded-2xl border-2 border-[#0a4f49] bg-[#ffd84d] px-3.5 pb-3 pt-2.5 text-[#0a4f49] shadow-xl">
            <div className="flex items-start gap-2">
              <div className="text-[13.5px] font-black leading-snug">📢 {t.title}</div>
              <button type="button" onClick={fold} aria-label={t.fold} data-test="hanging-fold"
                className="-mr-1 ml-auto shrink-0 rounded-full px-1.5 text-[15px] font-black leading-none text-[#0a4f49]/70 hover:text-[#0a4f49]">✕</button>
            </div>
            <p className="mt-1 text-[12.5px] font-semibold leading-snug">{t.body}</p>
          </div>
        )}
      </div>
    </div>
  );
}
