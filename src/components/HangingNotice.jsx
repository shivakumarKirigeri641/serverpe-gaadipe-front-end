import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useLang } from '../lib/i18n.jsx';
import { WHATSAPP_ENABLED, WHATSAPP, waLink } from '../lib/api';

/*
 * THE HANGING NOTICE (user, 2026-10-10: "a hanging label saying GaadiPe is now serving on
 * the web, with browser notifications, mail and SMS alerts, because the WhatsApp account
 * was disabled"). A small sign hanging on two strings below the header, on every page —
 * now only on the landing page and on the first chat visit (see below). It swings in; ✕ closes it for good.
 */
// A new key per notice, so visitors who folded the earlier one see the new one.
const KEY = WHATSAPP_ENABLED ? 'gp.hang.folded.newnumber' : 'gp.hang.folded.web';
// Takes itself down at the end of January — long enough for every old WhatsApp customer to see it.
const UNTIL = new Date('2027-01-31T23:59:59+05:30');
// "+91 73531 22415" from the build's number (VITE_WHATSAPP).
const W = String(WHATSAPP);
const NEW_NO = `+${W.slice(0, 2)} ${W.slice(2, 7)} ${W.slice(7)}`;
const OLD_NO = '+91 97396 22631';
/* THE NEW NUMBER (user, 2026-10-20: "back to WhatsApp based now — tell to delete the old number and
   say Hi to the new number"). On the WhatsApp-first build: the new number, the old one to delete,
   and a "Say Hi" button that opens the new chat. */
const NEW_TEXT = {
  en: {
    title: 'New WhatsApp number',
    body: `GaadiPe has a new WhatsApp number: ${NEW_NO}. Please delete the old number (${OLD_NO}) from your contacts, save the new one, and say Hi to continue — your vehicles, reports and alerts are all still here.`,
    cta: 'Say Hi on WhatsApp',
    tag: 'New number', fold: 'Fold the notice',
  },
  hi: {
    title: 'नया WhatsApp नंबर',
    body: `GaadiPe का नया WhatsApp नंबर: ${NEW_NO}। कृपया पुराना नंबर (${OLD_NO}) अपने कॉन्टैक्ट से हटाएँ, नया नंबर सेव करें और जारी रखने के लिए Hi भेजें — आपकी गाड़ियाँ, रिपोर्ट और अलर्ट सब यहीं हैं।`,
    cta: 'WhatsApp पर Hi भेजें',
    tag: 'नया नंबर', fold: 'सूचना बंद करें',
  },
};
/* PERMANENTLY ON THE WEB (user, 2026-10-21: "modify the marketing site that we are permanently moved to
   the web platform as Meta disabled our WhatsApp account"). Why, what still works, where their things
   are — and that a WhatsApp message claiming to be GaadiPe is not from us. */
const TEXT = {
  en: {
    title: 'GaadiPe is now fully on the web',
    body: 'Meta has closed GaadiPe’s WhatsApp account, so we have moved permanently to this website. Check vehicles, buy reports and get alerts by browser notification, email and SMS — your vehicles, reports and payments are all here. GaadiPe will not message you on WhatsApp any more.',
    tag: 'We moved', fold: 'Fold the notice',
  },
  hi: {
    title: 'GaadiPe अब पूरी तरह वेब पर है',
    body: 'Meta ने GaadiPe का WhatsApp अकाउंट बंद कर दिया है, इसलिए हम हमेशा के लिए इस वेबसाइट पर आ गए हैं। गाड़ी जाँचें, रिपोर्ट खरीदें और अलर्ट पाएँ ब्राउज़र नोटिफ़िकेशन, ईमेल और SMS से — आपकी गाड़ियाँ, रिपोर्ट और भुगतान सब यहीं हैं। GaadiPe अब आपको WhatsApp पर मैसेज नहीं करेगा।',
    tag: 'हम अब वेब पर', fold: 'सूचना बंद करें',
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

/*
 * WHERE AND HOW OFTEN (user, 2026-10-21: "show it on the landing page, or once the user has seen it in the
 * chat — showing it again and again is annoying"): only on the landing page (/) and the chat (/chat).
 *   ✕ closes it for good — no tag left behind.
 *   In the chat it shows on the first visit only: once it has been shown there, it is not shown again.
 */
const CLOSED_KEY = `${KEY}.closed`;
const CHAT_SEEN_KEY = `${KEY}.chat-seen`;
const flag = (k) => { try { return Boolean(localStorage.getItem(k)); } catch { return false; } };
const setFlag = (k) => { try { localStorage.setItem(k, String(Date.now())); } catch { /* private mode */ } };

export default function HangingNotice() {
  const { lang } = useLang();
  // WhatsApp-first build: the new number; web-first build: where GaadiPe works now.
  const t = (WHATSAPP_ENABLED ? NEW_TEXT : TEXT)[lang === 'hi' ? 'hi' : 'en'];
  const { pathname } = useLocation();
  const onHome = pathname === '/';
  const onChat = pathname.startsWith('/chat');
  // Decided once per page: in the chat, shown only if it was never shown there before.
  const [show, setShow] = useState(() => !flag(CLOSED_KEY) && (onHome || (onChat && !flag(CHAT_SEEN_KEY))));
  useEffect(() => { setShow(!flag(CLOSED_KEY) && (onHome || (onChat && !flag(CHAT_SEEN_KEY)))); }, [onHome, onChat]);
  // Seen in the chat now: not again on a later chat visit.
  useEffect(() => { if (show && onChat) setFlag(CHAT_SEEN_KEY); }, [show, onChat]);
  const nailY = useNailY(58);
  const fold = () => { setFlag(CLOSED_KEY); setShow(false); };
  if (Date.now() > UNTIL.getTime() || !show || (!onHome && !onChat)) return null;
  return (
    <div className="pointer-events-none fixed right-3 z-40" style={{ top: `${nailY}px` }} data-test="hanging-notice">
      <div className="hang-sign hang-swing pointer-events-auto relative pt-4">
        {/* the strings and the nail */}
        <span aria-hidden="true" className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#0a4f49]" />
        <span aria-hidden="true" className="absolute top-0.5 h-[1.15rem] w-px origin-top bg-[#0a4f49]/60" style={{ left: '50%', transform: 'rotate(38deg)' }} />
        <span aria-hidden="true" className="absolute top-0.5 h-[1.15rem] w-px origin-top bg-[#0a4f49]/60" style={{ left: '50%', transform: 'rotate(-38deg)' }} />
        {(
          <div role="status" className="w-[17.5rem] max-w-[calc(100vw-1.5rem)] rounded-2xl border-2 border-[#0a4f49] bg-[#ffd84d] px-3.5 pb-3 pt-2.5 text-[#0a4f49] shadow-xl">
            <div className="flex items-start gap-2">
              <div className="text-[13.5px] font-black leading-snug">📢 {t.title}</div>
              <button type="button" onClick={fold} aria-label={t.fold} data-test="hanging-fold"
                className="-mr-1 ml-auto shrink-0 rounded-full px-1.5 text-[15px] font-black leading-none text-[#0a4f49]/70 hover:text-[#0a4f49]">✕</button>
            </div>
            <p className="mt-1 text-[12.5px] font-semibold leading-snug">{t.body}</p>
            {t.cta && (
              <a href={waLink('Hi')} target="_blank" rel="noopener noreferrer" data-test="hanging-wa"
                className="mt-2 inline-block rounded-full bg-[#0a4f49] px-3 py-1.5 text-[12px] font-black text-white">
                💬 {t.cta}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
