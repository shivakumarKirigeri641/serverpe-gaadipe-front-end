import { useEffect, useState } from 'react';
import { api, gatewayUrl } from '../lib/api';
import { rupees, plate } from '../lib/format';
import { useLang } from '../lib/i18n.jsx';
import { Linked } from '../pages/Login.jsx';
import { Modal, Banner } from './ui.jsx';
import { useSession } from '../lib/session';
import { STATES } from '../lib/states';
import DataSourceNote from './DataSourceNote.jsx';

/**
 * The last step before paying: the declaration, then the payment page.
 *
 * ONE COMPONENT, EVERY BUY BUTTON, so there is exactly one place where the
 * declaration is shown and one place where it could go wrong.
 *
 * THE BOX STARTS UNTICKED and the pay button stays disabled until it is ticked.
 * A pre-ticked box is not consent; it is our assumption dressed up as theirs.
 *
 * IN THE READER'S LANGUAGE, AND RECORDED IN IT. The words come from the server
 * in the language chosen, and the purchase names that language — so what is on
 * file is exactly what was read and ticked, not a translation of it.
 */
export default function BuyDialog({ regNo, pricePaise, onClose, onAlreadyBought }) {
  const { t, lang } = useLang();
  const { me } = useSession();
  const [text, setText] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  /* WHO IS BUYING, FOR THE INVOICE (user, 2026-09-18): the name under "Billed
     to", and the state or union territory — the place of supply, which decides
     CGST + SGST or IGST. Filled from the last purchase; asked before Pay. */
  const [name, setName] = useState(me?.name || '');
  const [stateCode, setStateCode] = useState(me?.state_code || '');
  /* THE EMAIL, REQUIRED (user, 2026-09-21): the report's daily updates go there. */
  const [email, setEmail] = useState(me?.email || '');
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email.trim());
  const ready = agreed && text && name.trim().length >= 2 && stateCode && emailOk;

  /* Opening the dialog, and leaving it, are part of the trail the Live screen shows. */
  useEffect(() => {
    api.track({ action: 'buy_open', reg_no: regNo, page: window.location.pathname });
    return () => { api.track({ action: 'buy_close', reg_no: regNo, page: window.location.pathname }); };
  }, [regNo]);

  useEffect(() => {
    api.declaration(lang).then((d) => setText(d?.text || '')).catch(() => {});
  }, [lang]);

  const pay = async () => {
    setBusy(true); setError(null);
    try {
      const out = await api.buy(regNo, true, lang, { name: name.trim(), state_code: stateCode, email: email.trim() });
      if (out.pay_path || out.pay_url) {
        // Same tab: a payment page opened in a new tab that the browser blocks
        // is a payment that never happens. Opened through the site's own API
        // origin, so checkout never depends on a tunnel being up.
        window.location.href = out.pay_path ? gatewayUrl(out.pay_path) : out.pay_url;
        return;
      }
      if (out.already) { onAlreadyBought?.(); onClose(); }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const price = rupees(pricePaise);
  const link = (to, label) => `<${to}|${label}>`;

  return (
    <Modal title={t('buy.title', { reg: plate(regNo) })} onClose={() => !busy && onClose()}
      footer={
        <>
          <button className="btn-quiet" onClick={onClose} disabled={busy}>{t('buy.notNow')}</button>
          <button className="btn-primary" onClick={pay} disabled={!ready || busy}>
            {busy ? t('buy.opening') : t('buy.pay', { price })}
          </button>
        </>
      }>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">{t('buy.name')}</span>
          <input className="input" value={name} maxLength={80} autoComplete="name"
            onChange={(e) => setName(e.target.value)} placeholder={t('buy.namePh')} />
        </label>
        <label className="block">
          <span className="label">{t('buy.state')}</span>
          <select className="input" value={stateCode} onChange={(e) => setStateCode(e.target.value)}>
            <option value="">{t('buy.statePick')}</option>
            {STATES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
        </label>
      </div>
      <p className="-mt-1 text-2xs text-muted">{t('buy.invoiceNote')}</p>

      <label className="block">
        <span className="label">{t('buy.email')}</span>
        <input className="input" type="email" inputMode="email" autoComplete="email" value={email} maxLength={160}
          onChange={(e) => setEmail(e.target.value)} placeholder={t('buy.emailPh')} />
        <span className="mt-1 block text-2xs text-muted">{t('buy.emailNote')}</span>
      </label>

      <DataSourceNote compact />

      <label className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition ${
        agreed ? 'border-brand/40 bg-brand/5' : 'border-line bg-white'}`}>
        <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-brand"
          checked={agreed} onChange={(e) => setAgreed(e.target.checked)} disabled={!text} />
        <span className="text-sm leading-relaxed text-body">{text || t('common.loading')}</span>
      </label>

      <ul className="space-y-1.5 text-2xs text-muted">
        <li>· {t('buy.l1', { price })}</li>
        <li>· {t('buy.l2')}</li>
        <li>· {t('buy.l3')}</li>
      </ul>

      <p className="text-2xs text-muted">
        <Linked text={t('buy.accept', {
          terms: link('/terms', t('footer.terms')),
          refund: link('/refund', t('footer.refund')),
          privacy: link('/privacy', t('footer.privacy')),
        })} />
      </p>

      {error && <Banner tone="wrong">{error}</Banner>}
    </Modal>
  );
}
