import { useLang } from '../lib/i18n.jsx';

/*
 * Where the data comes from, and what to do if it looks wrong (user,
 * 2026-09-18). Shown on the home page, the dashboard and before paying, in the
 * reader's language.
 *
 * Worded precisely: vehicle and challan records come from the Government's
 * Parivahan systems (VAHAN and e-Challan) and are shown as received. GaadiPe
 * cannot correct them — the RTO can — so a mismatch is referred to the RTO,
 * whose record prevails.
 */
export default function DataSourceNote({ compact = false, className = '' }) {
  const { t } = useLang();
  return (
    <div className={`flex items-start gap-2.5 rounded-lg border border-brand/20 bg-brand/5 ${compact ? 'px-3 py-2' : 'px-4 py-3'} ${className}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-deep" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6Z" /><path d="m9 12 2 2 4-4" />
      </svg>
      <p className={`${compact ? 'text-2xs' : 'text-xs'} leading-relaxed text-body`}>
        <b className="text-ink">{t('source.h')}</b> {t('source.body')}
      </p>
    </div>
  );
}
