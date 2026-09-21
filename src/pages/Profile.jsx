import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useSession } from '../lib/session';
import { useLang } from '../lib/i18n.jsx';
import { rupees, mobile as fmtMobile, date } from '../lib/format';
import Layout from '../components/Layout.jsx';
import { Banner, Field, Spinner, Modal } from '../components/ui.jsx';

/**
 * The account.
 *
 * THE LANGUAGE HERE IS THE LANGUAGE EVERYWHERE: choosing it changes the site
 * immediately and is saved to the account, which is what the WhatsApp alerts
 * read. One choice, not two that can disagree.
 *
 * DEACTIVATION IS OFFERED PLAINLY, and what it does is stated without softening:
 * monitoring stops, alerts stop, the session ends — and the tax invoices stay,
 * because the law requires them to.
 */
export default function Profile() {
  const { me, setMe, signOut } = useSession();
  const { t, lang, setLang } = useLang();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');
  const [done, setDone] = useState(null);

  useEffect(() => {
    api.me().then((d) => {
      setData(d);
      setName(d.user.name || '');
      setEmail(d.user.email || '');
    }).catch(setError);
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null); setSaved(false);
    try {
      const out = await api.saveMe({ name, email, language: lang });
      setMe(out.user);
      setData((d) => (d ? { ...d, user: out.user } : d));
      setSaved(true);
    } catch (err) { setError(err); } finally { setBusy(false); }
  };

  const deactivate = async () => {
    setBusy(true);
    try {
      const out = await api.deactivate(reason);
      setDone(out.message);
      setConfirming(false);
    } catch (err) { setError(err); setConfirming(false); } finally { setBusy(false); }
  };

  if (done) {
    return (
      <Layout>
        <div className="mx-auto max-w-md py-8 text-center">
          <h1 className="text-2xl font-bold text-ink">{t('prof.doneH')}</h1>
          <p className="mt-3 text-sm text-body">{done}</p>
          <button className="btn-primary mt-6" onClick={() => { signOut(); navigate('/'); }}>{t('common.close')}</button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-ink">{t('prof.h')}</h1>
      <p className="mt-1 text-sm text-muted">{t('prof.sub')}</p>

      {error && <Banner tone="wrong" className="mt-5">{error.message}</Banner>}
      {!data && !error && <Spinner label={t('common.loading')} />}

      {data && (
        <div className="mt-6 grid gap-5 lg:grid-cols-3 stagger">
          <div className="card p-5 lg:col-span-2">
            <form onSubmit={save} className="space-y-4">
              <Field label={t('prof.mobile')} hint={t('prof.mobileHint')}>
                <input className="input tabular bg-shell" value={fmtMobile(me?.mobile)} readOnly />
              </Field>
              <Field label={t('prof.name')} hint={t('prof.nameHint')}>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
              </Field>
              <Field label={t('prof.email')} hint={t('prof.emailHint')}>
                <input className="input" type="email" value={email} placeholder="you@example.com"
                  onChange={(e) => setEmail(e.target.value)} maxLength={160} />
                <EmailStatus user={data?.user} typed={email} />
              </Field>
              <Field label={t('prof.language')} hint={t('prof.languageHint')}>
                <select className="input" value={lang} onChange={(e) => setLang(e.target.value)}>
                  <option value="en">English</option>
                  <option value="hi">हिंदी (Hindi)</option>
                </select>
              </Field>
              {saved && <Banner tone="good">{t('prof.saved')}</Banner>}
              <button className="btn-primary" disabled={busy}>{busy ? t('prof.saving') : t('prof.save')}</button>
            </form>
          </div>

          <div className="space-y-4">
            <div className="card p-5">
              <div className="text-2xs font-semibold uppercase tracking-wider text-muted">{t('prof.account')}</div>
              <dl className="mt-3 space-y-2 text-sm">
                <Line k={t('prof.since')} v={date(data.user.joined_at)} />
                <Line k={t('prof.vehicles')} v={data.totals.vehicles} />
                <Line k={t('prof.reports')} v={data.totals.reports} />
                <Line k={t('prof.watching')} v={data.totals.watching} />
                <Line k={t('prof.paid')} v={rupees(data.totals.paid_paise)} />
              </dl>
            </div>

            <QuizpeConsent user={data.user} onChange={(u) => setData((d) => ({ ...d, user: u }))} />

            <div className="card p-5">
              <div className="text-2xs font-semibold uppercase tracking-wider text-muted">{t('prof.session')}</div>
              <button className="btn-quiet mt-3 w-full" onClick={() => { signOut(); navigate('/'); }}>{t('common.signOut')}</button>
            </div>

            <div className="card border-wrong-500/25 p-5">
              <div className="text-2xs font-semibold uppercase tracking-wider text-wrong-700">{t('prof.close')}</div>
              <p className="mt-2 text-sm text-body">{t('prof.closeBody')}</p>
              <button className="btn-quiet mt-3 w-full border-wrong-500/30 text-wrong-700" onClick={() => setConfirming(true)}>
                {t('prof.deactivate')}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirming && (
        <Modal title={t('prof.confirmH')} onClose={() => setConfirming(false)}
          footer={
            <>
              <button className="btn-quiet" onClick={() => setConfirming(false)}>{t('prof.keep')}</button>
              <button className="btn-quiet border-wrong-500/30 text-wrong-700" disabled={busy} onClick={deactivate}>
                {busy ? t('prof.closing') : t('prof.yes')}
              </button>
            </>
          }>
          <p className="text-sm text-body">{t('prof.confirmBody')}</p>
          <Field label={t('prof.reason')} hint={t('prof.reasonHint')}>
            <textarea className="input min-h-[80px]" value={reason} maxLength={500}
              onChange={(e) => setReason(e.target.value)} />
          </Field>
        </Modal>
      )}
    </Layout>
  );
}

const Line = ({ k, v }) => (
  <div className="flex justify-between gap-3 border-b border-line/70 pb-1.5">
    <dt className="text-muted">{k}</dt>
    <dd className="font-medium text-ink">{v}</dd>
  </div>
);

/* Whether the address on file is confirmed, with a way to send the link again. */
function EmailStatus({ user, typed }) {
  const { t } = useLang();
  const [state, setState] = useState('');
  if (!user?.email || typed.trim().toLowerCase() !== String(user.email).toLowerCase()) return null;
  if (user.email_unsubscribed) return <span className="mt-1 block text-2xs text-muted">{t('email.unsubscribed')}</span>;
  if (user.email_verified) return <span className="mt-1 block text-2xs text-good-700">✓ {t('email.confirmed')}</span>;
  const resend = async () => {
    try { await api.resendEmail(); setState('sent'); } catch (e) { setState(e.message); }
  };
  return (
    <span className="mt-1 block text-2xs text-watch-700">
      {t('email.pending')}{' '}
      {state === 'sent' ? <b>{t('email.resent')}</b>
        : <button type="button" className="font-semibold underline" onClick={resend}>{t('email.resend')}</button>}
      {state && state !== 'sent' && <span className="block text-wrong-700">{state}</span>}
    </span>
  );
}

/*
 * MESSAGES FROM QUIZPE — a separate, optional consent (user, 2026-09-21; DPDP).
 * Never ticked for the customer, not needed for anything on GaadiPe, and
 * withdrawn by unticking. The server records the exact words and the time.
 */
function QuizpeConsent({ user, onChange }) {
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  // Ticks at once; put back if the server did not save it.
  const [checked, setChecked] = useState(Boolean(user?.quizpe_consent));
  const toggle = async (e) => {
    const agree = e.target.checked;
    setChecked(agree); setBusy(true); setMsg(null);
    try { const out = await api.setQuizpeConsent(agree); onChange(out.user); setMsg(t('prof.quizpe.saved')); }
    catch (err) { setChecked(!agree); setMsg(err.message); } finally { setBusy(false); }
  };
  return (
    <div className="card p-5">
      <div className="text-2xs font-semibold uppercase tracking-wider text-muted">{t('prof.quizpe.h')}</div>
      <label className="mt-3 flex cursor-pointer gap-3">
        <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-brand"
          checked={checked} onChange={toggle} disabled={busy} />
        <span className="text-sm leading-relaxed text-body">{t('prof.quizpe.label')}</span>
      </label>
      {msg && <p className="mt-2 text-2xs text-muted">{msg}</p>}
    </div>
  );
}
