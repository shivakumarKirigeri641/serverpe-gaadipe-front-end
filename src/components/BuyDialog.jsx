import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { rupees, plate } from '../lib/format';
import { Modal, Banner } from './ui.jsx';

/**
 * The last step before paying: the declaration, then the payment page.
 *
 * ONE COMPONENT, EVERY BUY BUTTON. The vehicle page and the dashboard both open
 * this, so there is exactly one place where the declaration is shown and one
 * place where it could go wrong.
 *
 * THE BOX STARTS UNTICKED and the pay button stays disabled until it is ticked.
 * A pre-ticked box is not consent; it is our assumption dressed up as theirs.
 * The server refuses the purchase without it as well, so this is the courtesy
 * and the server is the rule.
 */
const FALLBACK = 'I confirm this vehicle is mine, or that its owner is known to me, and that '
  + 'I am requesting its details for a lawful purpose. I take responsibility for how I use them.';

export default function BuyDialog({ regNo, pricePaise, onClose, onAlreadyBought }) {
  const [text, setText] = useState(FALLBACK);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // The words come from the server, so what is shown is exactly what is recorded.
  useEffect(() => { api.declaration().then((d) => d?.text && setText(d.text)).catch(() => {}); }, []);

  const pay = async () => {
    setBusy(true); setError(null);
    try {
      const out = await api.buy(regNo, true);
      if (out.pay_url) {
        // Same tab: a payment page opened in a new tab that the browser blocks
        // is a payment that never happens.
        window.location.href = out.pay_url;
        return;
      }
      if (out.already) { onAlreadyBought?.(); onClose(); }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Full report — ${plate(regNo)}`} onClose={() => !busy && onClose()}
      footer={
        <>
          <button className="btn-quiet" onClick={onClose} disabled={busy}>Not now</button>
          <button className="btn-primary" onClick={pay} disabled={!agreed || busy}>
            {busy ? 'Opening payment…' : `Pay ${rupees(pricePaise)} securely`}
          </button>
        </>
      }>
      <label className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition ${
        agreed ? 'border-brand/40 bg-brand/5' : 'border-line bg-white'}`}>
        <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-brand"
          checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        <span className="text-sm leading-relaxed text-body">{text}</span>
      </label>

      <ul className="space-y-1.5 text-2xs text-muted">
        <li>· {rupees(pricePaise)} one time, inclusive of GST. Nothing renews automatically.</li>
        <li>· The report is delivered the moment you pay, so the purchase is final.</li>
        <li>· Your confirmation is recorded with the time and printed on the report.</li>
      </ul>

      <p className="text-2xs text-muted">
        By paying you accept the <Link className="underline" to="/terms">Terms</Link>,{' '}
        <Link className="underline" to="/refund">Refund policy</Link> and{' '}
        <Link className="underline" to="/privacy">Privacy policy</Link>.
      </p>

      {error && <Banner tone="wrong">{error}</Banner>}
    </Modal>
  );
}
