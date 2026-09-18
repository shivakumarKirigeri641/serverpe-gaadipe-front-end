import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { rupees, date } from '../lib/format';
import { useLang, Rich } from '../lib/i18n.jsx';
import Layout from '../components/Layout.jsx';
import Vehicle from '../components/Vehicle.jsx';
import { Banner, Spinner } from '../components/ui.jsx';
import BuyDialog from '../components/BuyDialog.jsx';

/**
 * Check a vehicle, and buy its report.
 *
 * ONE SCREEN FOR BOTH JOBS, because they are one thought: somebody types a
 * number, reads what is free, and decides. Sending them to a second page to pay
 * loses half of them at the door.
 *
 * `/app/vehicle/:regNo` opens the same screen for a vehicle already checked —
 * that route does not spend a lookup where the cache still holds one.
 */
export default function Check() {
  const { t } = useLang();
  const { regNo } = useParams();
  const [params] = useSearchParams();
  const [reg, setReg] = useState(regNo || params.get('reg') || '');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const run = useCallback(async (plateNo, { existing = false } = {}) => {
    const value = String(plateNo || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length < 5) { setError(t('check.full')); return; }
    setBusy(true); setError(null); setResult(null);
    try {
      const out = existing ? await api.vehicle(value) : await api.check(value);
      if (out.error) { setError(out.message); return; }
      setResult(out);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }, [t]);

  /* Opened with a number already in hand — from the home page, or from the
     list of vehicles — so it runs without waiting to be asked twice. */
  useEffect(() => {
    const initial = regNo || params.get('reg');
    if (initial) run(initial, { existing: Boolean(regNo) });
    // Only when the vehicle changes, not when the language does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regNo, params]);

  // Paying always goes through the declaration first — see BuyDialog.
  const buy = () => setConfirming(true);
  const price = result ? rupees(result.price_paise) : '';

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-ink">{t('check.h')}</h1>
      <p className="mt-1 text-sm text-muted">{t('check.sub')}</p>

      <form className="mt-5 flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => { e.preventDefault(); run(reg); }}>
        <input className="input sm:max-w-xs" placeholder="KA01AB1234" value={reg}
          onChange={(e) => setReg(e.target.value)} aria-label={t('home.sticky.placeholder')} />
        <button className="btn-primary" disabled={busy}>{busy ? t('check.checking') : t('check.cta')}</button>
      </form>

      {error && <Banner tone="wrong" className="mt-5">{error}</Banner>}
      {busy && <Spinner label={t('check.reading')} />}

      {result?.vehicle && (
        <div className="mt-6 space-y-4">
          {result.report && (
            <Banner tone="brand">
              <Rich text={t('check.haveReport', { date: date(result.report.valid_until) })} />
            </Banner>
          )}

          <Vehicle v={result.vehicle} defaultOpen onBuy={result.can_buy ? buy : null} buying={false} />

          {result.can_buy && (
            <div className="card p-5 text-center">
              <div className="text-base font-semibold text-ink">{t('check.buy.h', { price })}</div>
              <p className="mx-auto mt-1.5 max-w-md text-sm text-body">{t('check.buy.b')}</p>
              <button className="btn-primary btn-big mt-4" onClick={buy}>{t('check.buy.cta', { price })}</button>
              <p className="mt-2 text-2xs text-muted">{t('check.buy.methods')}</p>
            </div>
          )}
        </div>
      )}

      {confirming && result?.vehicle && (
        <BuyDialog regNo={result.vehicle.reg_no} pricePaise={result.price_paise}
          onClose={() => setConfirming(false)}
          onAlreadyBought={() => run(result.vehicle.reg_no, { existing: true })} />
      )}
    </Layout>
  );
}
