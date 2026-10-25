import { useEffect, useState } from 'react';
import { api, gatewayUrl } from '../lib/api';
import { rupees, plate } from '../lib/format';
import { useLang } from '../lib/i18n.jsx';
import { Linked } from '../pages/Login.jsx';
import { Modal, Banner } from './ui.jsx';
import { useSession } from '../lib/session';
import { STATES } from '../lib/states';
import DataSourceNote from './DataSourceNote.jsx';
import EmailVerify from './EmailVerify.jsx';

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
  const { me, setMe } = useSession();
  const [text, setText] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  /* WHO IS BUYING, FOR THE INVOICE (user, 2026-09-18): the name under "Billed
     to", and the state or union territory — the place of supply, which decides
     CGST + SGST or IGST. Filled from the last purchase; asked before Pay. */
  const [name, setName] = useState(me?.name || '');
  const [stateCode, setStateCode] = useState(me?.state_code || '');
  /* THE EMAIL, REQUIRED (user, 2026-09-21): the report's daily updates go there. */
  const [email, setEmail] = useState(me?.email || '');
  /* …AND CONFIRMED (user, 2026-10-07): the report, invoice and alerts go there, so
     Pay waits until the address has been confirmed with its code. */
  /* ₹11 ONCE OR ₹19 WITH ALERTS (user, 2026-10-25): the one-time report beside the full one, when the server
     sells it (/pricing one_time_paise). The ₹19 is chosen to start — "Best value", just ₹8 more. */
  const [oneTimePaise, setOneTimePaise] = useState(null);
  const [alertsDays, setAlertsDays] = useState(28);
  const [oneTime, setOneTime] = useState(false);
  useEffect(() => {
    api.pricing().then((p) => { setOneTimePaise(p?.one_time_paise || null); if (p?.duration_days) setAlertsDays(p.duration_days); })
      .catch(() => {});
  }, []);
  const verified = me?.email_verified ? me.email : null;
  const emailOk = Boolean(verified) && email.trim().toLowerCase() === String(verified).toLowerCase();
  const ready = agreed && termsAgreed && text && name.trim().length >= 2 && stateCode && emailOk;

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
      const out = await api.buy(regNo, true, lang, { name: name.trim(), state_code: stateCode, email: email.trim(), terms_accepted: termsAgreed,
        ...(oneTime && oneTimePaise ? { one_time: true } : {}) });
      if (out.pay_path || out.pay_url) {
        // Same tab: a payment page opened in a new tab that the browser blocks
        // is a payment that never happens. Opened through the site's own API
        // origin, so checkout never depends on a tunnel being up.
        // ?go=1: the details were just given here, so the payment page opens
        // Razorpay at once instead of asking for them a second time (2026-10-07).
        const target = out.pay_path ? gatewayUrl(out.pay_path) : out.pay_url;
        window.location.href = `${target}${target.includes('?') ? '&' : '?'}go=1`;
        return;
      }
      if (out.already) { onAlreadyBought?.(); onClose(); }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const price = rupees(oneTime && oneTimePaise ? oneTimePaise : pricePaise);
  const link = (to, label) => `<${to}|${label}>`;
  const hi = lang === 'hi';
  const more = oneTimePaise && pricePaise > oneTimePaise ? Math.round((pricePaise - oneTimePaise) / 100) : null;
  const choice = (on, title, sub, amount, tag) => (
    <button type="button" onClick={() => setOneTime(on)} data-test={on ? 'buy-once' : 'buy-alerts'}
      className={`relative rounded-xl border-2 p-3 text-left transition ${oneTime === on ? 'border-brand bg-brand/5' : 'border-line bg-white'}`}>
      {tag && <span className="absolute -top-2.5 right-2 rounded-full bg-[#ffd84d] px-2 py-0.5 text-[10px] font-black text-[#0a4f49]">{tag}</span>}
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-bold text-body">{title}</span>
        <span className="text-base font-black text-brand">{rupees(amount)}</span>
      </span>
      <span className="mt-1 block text-2xs leading-snug text-muted">{sub}</span>
    </button>
  );

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
      {oneTimePaise && (
        <div className="grid gap-3 sm:grid-cols-2" data-test="buy-choice">
          {choice(true,
            hi ? 'पूरी रिपोर्ट · एक बार' : 'Full report · one time',
            hi ? 'पूरी PDF रिपोर्ट। कोई अलर्ट नहीं — गाड़ी खरीदने से पहले एक बार जाँच के लिए।' : 'The complete PDF report. No alerts — for checking a vehicle once, before you buy.',
            oneTimePaise)}
          {choice(false,
            hi ? `पूरी रिपोर्ट + ${alertsDays} दिन अलर्ट` : `Full report + ${alertsDays} days of alerts`,
            hi ? 'वही रिपोर्ट, साथ में नए चालान के अलर्ट और इंश्योरेंस, PUC, टैक्स, फिटनेस खत्म होने से पहले चेतावनी।'
              : 'The same report, plus new-challan alerts and a warning before insurance, PUC, road tax or fitness expires.',
            pricePaise,
            more ? (hi ? `सबसे फ़ायदेमंद · सिर्फ़ ₹${more} ज़्यादा` : `Best value · just ₹${more} more`) : (hi ? 'सबसे फ़ायदेमंद' : 'Best value'))}
        </div>
      )}
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

      <div className="block">
        <span className="label">{t('buy.email')} *</span>
        <EmailVerify email={email} onEmail={setEmail} verifiedEmail={verified} onVerified={(u) => setMe?.(u)} dataTest="buy" />
        <span className="mt-1 block text-2xs text-muted">{emailOk ? t('buy.emailNote') : (lang === 'hi' ? 'भुगतान से पहले ईमेल की पुष्टि ज़रूरी है — रिपोर्ट, इनवॉइस और अलर्ट वहीं आते हैं।' : 'Confirm your email before paying — your report, invoice and alerts are sent there.')}</span>
      </div>

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
        <li className="font-semibold text-body">ℹ️ {t('buy.l4')}</li>
      </ul>

      {/* THE POLICIES, TICKED (user, 2026-10-08): never pre-ticked, required to pay. */}
      <label className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition ${
        termsAgreed ? 'border-brand/40 bg-brand/5' : 'border-line bg-white'}`}>
        <input type="checkbox" data-test="buy-terms" className="mt-0.5 h-5 w-5 shrink-0 accent-brand"
          checked={termsAgreed} onChange={(e) => setTermsAgreed(e.target.checked)} />
        <span className="text-sm leading-relaxed text-body">
          <Linked text={lang === 'hi'
            ? `मैंने ${link('/terms', t('footer.terms'))}, ${link('/refund', t('footer.refund'))} और ${link('/privacy', t('footer.privacy'))} पढ़ ली हैं और मैं उनसे सहमत हूँ।`
            : `I have read and agree to the ${link('/terms', t('footer.terms'))}, ${link('/refund', t('footer.refund'))} and ${link('/privacy', t('footer.privacy'))}.`} />
        </span>
      </label>

      {error && <Banner tone="wrong">{error}</Banner>}
    </Modal>
  );
}
