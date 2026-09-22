import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { rupees, plate } from '../lib/format';
import { useLang } from '../lib/i18n.jsx';
import { Modal, Banner } from './ui.jsx';
import DataSourceNote from './DataSourceNote.jsx';

/**
 * HOW A FULL REPORT IS UNLOCKED (user, 2026-09-21), in one card:
 *
 *   a free report to use   "Use my free report"            (referral reward)
 *   can_buy                "Pay Rs.19"                     (report_unlock pay | both)
 *   can_refer              "Get it free: refer QuizPe"     (report_unlock both | refer)
 *
 * The server decides which of these apply; the card only shows them.
 */
export default function UnlockCard({ result, onBuy, onUnlocked }) {
  const { t } = useLang();
  const [usingFree, setUsingFree] = useState(false);
  if (!result?.vehicle || result.vehicle.paid) return null;
  const { can_buy: canBuy, can_refer: canRefer, free_credits: credits = 0 } = result;
  if (!canBuy && !canRefer && !credits) return null;
  const price = rupees(result.price_paise);
  const reg = result.vehicle.reg_no;

  return (
    <div className="card p-5 text-center">
      {credits > 0 ? (
        <>
          <div className="text-base font-semibold text-ink">🎁 {t('unlock.free.h')}</div>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-body">{t('unlock.free.b', { n: credits })}</p>
          <button className="btn-primary btn-big mt-4" onClick={() => setUsingFree(true)}>{t('unlock.free.cta')}</button>
        </>
      ) : (
        <>
          <div className="text-base font-semibold text-ink">
            {result.reduced ? <>🎁 {t('unlock.reduced.h', { price })}</> : canBuy ? t('check.buy.h', { price }) : t('unlock.refer.h')}
          </div>
          {result.reduced && result.list_price_paise && (
            <p className="mt-1 text-sm text-body">{t('unlock.reduced.b', { price, list: rupees(result.list_price_paise) })}</p>
          )}
          <p className="mx-auto mt-1.5 max-w-md text-sm text-body">{t('check.buy.b')}</p>
        </>
      )}

      <div className="mt-4 flex flex-col items-center gap-2">
        {canBuy && (
          <button className={credits > 0 ? 'btn-quiet' : 'btn-primary btn-big'} onClick={onBuy}>
            {t('check.buy.cta', { price })}
          </button>
        )}
        {canBuy && !credits && <p className="text-2xs text-muted">{t('check.buy.methods')}</p>}
        {canRefer && (
          <Link to={`/app/refer?reg=${encodeURIComponent(reg)}`}
            className={canBuy || credits > 0 ? 'text-sm font-semibold text-brand-deep underline' : 'btn-primary btn-big'}>
            {canBuy || credits > 0 ? t('unlock.refer.or') : t('unlock.refer.cta')}
          </Link>
        )}
      </div>

      {usingFree && <FreeReportDialog regNo={reg} onClose={() => setUsingFree(false)}
        onDone={() => { setUsingFree(false); onUnlocked?.(); }} />}
    </div>
  );
}

/** Spend a free report: the same declaration a purchase asks for, then the report. */
export function FreeReportDialog({ regNo, onClose, onDone }) {
  const { t, lang } = useLang();
  const [text, setText] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { api.declaration(lang).then((d) => setText(d?.text || '')).catch(() => {}); }, [lang]);

  const go = async () => {
    setBusy(true); setError(null);
    try { await api.useCredit(regNo, lang); onDone(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <Modal title={t('unlock.free.title', { reg: plate(regNo) })} onClose={() => !busy && onClose()}
      footer={
        <>
          <button className="btn-quiet" onClick={onClose} disabled={busy}>{t('buy.notNow')}</button>
          <button className="btn-primary" onClick={go} disabled={!agreed || !text || busy}>
            {busy ? t('unlock.free.working') : t('unlock.free.cta')}
          </button>
        </>
      }>
      <p className="text-sm text-body">{t('unlock.free.explain')}</p>
      <DataSourceNote compact />
      <label className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition ${
        agreed ? 'border-brand/40 bg-brand/5' : 'border-line bg-white'}`}>
        <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-brand"
          checked={agreed} onChange={(e) => setAgreed(e.target.checked)} disabled={!text} />
        <span className="text-sm leading-relaxed text-body">{text || t('common.loading')}</span>
      </label>
      {error && <Banner tone="wrong">{error}</Banner>}
    </Modal>
  );
}
