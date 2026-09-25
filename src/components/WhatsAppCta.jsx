import { waLink, WHATSAPP } from '../lib/api';
import { useLang } from '../lib/i18n.jsx';

/**
 * The one button the site is for, now that GaadiPe lives on WhatsApp: open the
 * chat with "Hi" typed, so the only thing left to do is press Send.
 *
 * `text` overrides the message — a referral carries its code this way, since
 * the bot reads "(ref CODE)" from the very first message.
 */
export default function WhatsAppCta({ text = 'Hi', big = true, className = '', label, showNumber = false }) {
  const { t } = useLang();
  return (
    <span className={`inline-flex flex-col ${className}`}>
      <a className={`btn-primary btn-arrow ${big ? 'btn-big' : ''} w-full justify-center gap-2 text-center`}
        href={waLink(text)} rel="noopener">
        <WaIcon /> {label || t('wa.cta')} <span className="arrow">→</span>
      </a>
      {showNumber && (
        <span className="mt-1.5 text-center text-2xs text-muted">
          {t('wa.number', { number: `+${WHATSAPP.slice(0, 2)} ${WHATSAPP.slice(2, 7)} ${WHATSAPP.slice(7)}` })}
        </span>
      )}
    </span>
  );
}

/** A plain speech bubble — not WhatsApp's mark, which is theirs to use. */
const WaIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5z" />
  </svg>
);
