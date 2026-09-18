import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { rupees } from '../lib/format';
import Layout from '../components/Layout.jsx';
import Vehicle from '../components/Vehicle.jsx';
import { Banner, Spinner } from '../components/ui.jsx';

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
  const { regNo } = useParams();
  const [params] = useSearchParams();
  const [reg, setReg] = useState(regNo || params.get('reg') || '');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [buying, setBuying] = useState(false);

  const run = useCallback(async (plate, { existing = false } = {}) => {
    const value = String(plate || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length < 5) { setError('Please enter a full vehicle number.'); return; }
    setBusy(true); setError(null); setResult(null);
    try {
      const out = existing ? await api.vehicle(value) : await api.check(value);
      if (out.error) { setError(out.message); return; }
      setResult(out);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }, []);

  /* Opened with a number already in hand — from the home page, or from the
     list of vehicles — so it runs without waiting to be asked twice. */
  useEffect(() => {
    const initial = regNo || params.get('reg');
    if (initial) run(initial, { existing: Boolean(regNo) });
  }, [regNo, params, run]);

  const buy = async () => {
    setBuying(true);
    try {
      const out = await api.buy(result.vehicle.reg_no);
      if (out.pay_url) {
        // Razorpay's own page, opened here rather than in a new tab: a payment
        // that opens in a tab a browser then blocks is a payment that never
        // happens.
        window.location.href = out.pay_url;
        return;
      }
      if (out.already) await run(result.vehicle.reg_no, { existing: true });
    } catch (e) { setError(e.message); } finally { setBuying(false); }
  };

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-ink">Check a vehicle</h1>
      <p className="mt-1 text-sm text-muted">
        Any Indian registration number. The basics are free.
      </p>

      <form className="mt-5 flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => { e.preventDefault(); run(reg); }}>
        <input className="input sm:max-w-xs" placeholder="KA02EX1480" value={reg}
          onChange={(e) => setReg(e.target.value)} aria-label="Vehicle number" />
        <button className="btn-primary" disabled={busy}>{busy ? 'Checking…' : 'Check'}</button>
      </form>

      {error && <Banner tone="wrong" className="mt-5">{error}</Banner>}
      {busy && <Spinner label="Reading the Government records…" />}

      {result?.vehicle && (
        <div className="mt-6 space-y-4">
          {result.report && (
            <Banner tone="brand">
              You have the full report for this vehicle. It can be downloaded until{' '}
              <b>{new Date(result.report.valid_until).toLocaleDateString('en-IN')}</b>.
            </Banner>
          )}

          <Vehicle v={result.vehicle} defaultOpen
            onBuy={result.can_buy ? buy : null} buying={buying} />

          {result.can_buy && (
            <div className="card p-5 text-center">
              <div className="text-base font-semibold text-ink">
                Full report — {rupees(result.price_paise)}
              </div>
              <p className="mx-auto mt-1.5 max-w-md text-sm text-body">
                Loan and blacklist status, every challan with its offence and place, policy numbers,
                a PDF you keep, and 28 days of alerts. One payment, nothing renews.
              </p>
              <button className="btn-primary btn-big mt-4" onClick={buy} disabled={buying}>
                {buying ? 'Opening payment…' : `Pay ${rupees(result.price_paise)} securely`}
              </button>
              <p className="mt-2 text-2xs text-muted">UPI, card or netbanking · GST invoice included</p>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
