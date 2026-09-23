import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useSession } from '../lib/session';
import { takeReferral } from './ReferLanding.jsx';
import { QUIZPE_ENABLED } from '../lib/api';
import { useLang } from '../lib/i18n.jsx';
import Layout from '../components/Layout.jsx';
import { Banner, Field } from '../components/ui.jsx';

/**
 * Sign in with a code sent by SMS.
 *
 * NO PASSWORD, and no "create an account" either: the mobile number already
 * identifies the customer everywhere else in GaadiPe, so signing in proves they
 * hold it and nothing more.
 *
 * Where they were going is remembered (`next`), so signing in from a checked
 * vehicle returns to that vehicle rather than dumping them on a dashboard.
 */
export default function Login() {
  const { signIn, me } = useSession();
  const { t } = useLang();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = params.get('next') || '/app';

  const [step, setStep] = useState('mobile');
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [wait, setWait] = useState(0);
  // QuizPe may message me — OPTIONAL and never pre-ticked (DPDP); sign-in works either way.
  const [quizpe, setQuizpe] = useState(false);

  useEffect(() => { if (me) navigate(next, { replace: true }); }, [me, next, navigate]);

  /* The resend counter runs down visibly: a button that does nothing for a
     minute, with no explanation, gets pressed five more times. */
  useEffect(() => {
    if (!wait) return undefined;
    const timer = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const ask = async (e) => {
    e?.preventDefault();
    const m = mobile.replace(/\D/g, '').slice(-10);
    if (m.length !== 10) { setError(t('login.bad')); return; }
    setBusy(true); setError(null);
    try {
      const out = await api.requestCode(m);
      if (!out.ok) {
        setError(out.message);
        if (out.retryAfter) setWait(out.retryAfter);
        return;
      }
      setNote(t('login.sent', { mobile: m }));
      setWait(60);
      setStep('code');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const verify = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const out = await api.verifyCode(mobile.replace(/\D/g, '').slice(-10), code, quizpe);
      if (!out.ok) { setError(out.message); return; }
      await signIn(out.token, out.user);
      /*
       * IF THEY ARRIVED THROUGH SOMEBODY'S LINK, claim it now — this is the
       * first moment there is an account to attach it to. Sent once and then
       * forgotten, and every refusal (their own link, already referred, already
       * a customer) is the server's to make, so nothing is decided here.
       *
       * Never allowed to block the sign-in: a referral that cannot be attached
       * is a lost reward, a sign-in that hangs is a lost customer.
       */
      const referral = takeReferral();
      if (referral) await api.attachReferral(referral).catch(() => {});
      navigate(next, { replace: true });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const link = (to, label) => `<${to}|${label}>`;
  const accept = t('login.accept', {
    terms: link('/terms', t('footer.terms')),
    privacy: link('/privacy', t('footer.privacy')),
    refund: link('/refund', t('footer.refund')),
  });

  return (
    <Layout>
      <div className="mx-auto max-w-md py-6">
        <h1 className="text-2xl font-bold text-ink">{t('login.h')}</h1>
        <p className="mt-1.5 text-sm text-muted">{t('login.sub')}</p>

        <div className="card mt-6 p-5">
          {step === 'mobile' ? (
            <form onSubmit={ask} className="space-y-4">
              <Field label={t('login.mobile')} hint={t('login.mobileHint')}>
                <input className="input tabular" inputMode="numeric" autoFocus autoComplete="tel"
                  placeholder="98765 43210" value={mobile}
                  onChange={(e) => setMobile(e.target.value)} />
              </Field>
              {error && <Banner tone="wrong">{error}</Banner>}
              <button className="btn-primary w-full">{busy ? t('login.sending') : t('login.send')}</button>
            </form>
          ) : (
            <form onSubmit={verify} className="space-y-4">
              <Field label={t('login.code')} hint={note}>
                <input className="input tabular tracking-[0.4em]" inputMode="numeric" autoFocus
                  maxLength={6} placeholder="••••••" value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
              </Field>
              {QUIZPE_ENABLED && (
                <label className="flex cursor-pointer gap-3 rounded-lg border border-line bg-shell/60 p-3">
                  <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-brand" checked={quizpe}
                    onChange={(e) => setQuizpe(e.target.checked)} />
                  <span className="text-2xs leading-relaxed text-body">
                    <b className="text-ink">{t('login.quizpe.h')}</b> {t('login.quizpe.b')}
                  </span>
                </label>
              )}
              {error && <Banner tone="wrong">{error}</Banner>}
              <button className="btn-primary w-full" disabled={busy || code.length < 4}>
                {busy ? t('login.checking') : t('login.verify')}
              </button>
              <div className="flex items-center justify-between text-2xs">
                <button type="button" className="text-muted underline underline-offset-2"
                  onClick={() => { setStep('mobile'); setCode(''); setError(null); }}>
                  {t('login.change')}
                </button>
                <button type="button" className="text-brand disabled:text-muted" disabled={wait > 0 || busy}
                  onClick={ask}>
                  {wait > 0 ? t('login.resendIn', { s: wait }) : t('login.resend')}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="mt-4 text-2xs text-muted"><Linked text={accept} /></p>
      </div>
    </Layout>
  );
}

/* "<\/terms|Terms>" inside a translated sentence becomes a link, so the
   sentence can be ordered naturally in each language.

   THE POLICY OPENS IN A NEW TAB. These links sit inside the sign-in form and
   the pay dialog; followed in place, the page changed underneath a dialog that
   stayed open — it looked as if the link did nothing — and the purchase in
   progress was lost. Reading the terms should never cost the reader their place. */
export function Linked({ text }) {
  const parts = String(text).split(/(<[^|>]+\|[^>]+>)/g);
  return parts.map((p, i) => {
    const m = /^<([^|>]+)\|([^>]+)>$/.exec(p);
    return m
      ? <Link key={i} className="underline" to={m[1]} target="_blank" rel="noopener">{m[2]}</Link>
      : <span key={i}>{p}</span>;
  });
}
