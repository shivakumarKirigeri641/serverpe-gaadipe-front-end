import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useSession } from '../lib/session';
import Layout from '../components/Layout.jsx';
import { Banner, Field } from '../components/ui.jsx';

/**
 * Sign in with a code sent by SMS.
 *
 * NO PASSWORD, and no "create an account" either: the mobile number already
 * identifies the customer everywhere else in GaadiPe, so signing in proves they
 * hold it and nothing more. Somebody who has only ever used WhatsApp finds
 * their own vehicles waiting here.
 *
 * Where they were going is remembered (`next`), so signing in from a checked
 * vehicle returns to that vehicle rather than dumping them on a dashboard.
 */
export default function Login() {
  const { signIn, me } = useSession();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = params.get('next') || '/app';

  const [step, setStep] = useState('mobile');
  const [mobile, setMobile] = useState('9886122415');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [wait, setWait] = useState(0);

  useEffect(() => { if (me) navigate(next, { replace: true }); }, [me, next, navigate]);

  /* The resend counter runs down visibly: a button that does nothing for a
     minute, with no explanation, gets pressed five more times. */
  useEffect(() => {
    if (!wait) return undefined;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const ask = async (e) => {
    e?.preventDefault();
    const m = mobile.replace(/\D/g, '').slice(-10);
    if (m.length !== 10) { setError('Please enter your ten-digit mobile number.'); return; }
    setBusy(true); setError(null);
    try {
      const out = await api.requestCode(m);
      if (!out.ok) {
        setError(out.message);
        if (out.retryAfter) setWait(out.retryAfter);
        return;
      }
      setNote(`We have sent a code to ${m}. It is valid for a few minutes.`);
      setWait(60);
      setStep('code');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const verify = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const out = await api.verifyCode(mobile.replace(/\D/g, '').slice(-10), code);
      if (!out.ok) { setError(out.message); return; }
      await signIn(out.token, out.user);
      navigate(next, { replace: true });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-md py-6">
        <h1 className="text-2xl font-bold text-ink">Sign in</h1>
        <p className="mt-1.5 text-sm text-muted">
          With the mobile number you use for GaadiPe. No password.
        </p>

        <div className="card mt-6 p-5">
          {step === 'mobile' ? (
            <form onSubmit={ask} className="space-y-4">
              <Field label="Mobile number" hint="We send a one-time code by SMS.">
                <input className="input tabular" inputMode="numeric" autoFocus autoComplete="tel"
                  placeholder="98765 43210" value={mobile}
                  onChange={(e) => setMobile(e.target.value)} />
              </Field>
              {error && <Banner tone="wrong">{error}</Banner>}
              <button className="btn-primary w-full">{busy ? 'Sending…' : 'Send me a code'}</button>
            </form>
          ) : (
            <form onSubmit={verify} className="space-y-4">
              <Field label="Enter the code" hint={note}>
                <input className="input tabular tracking-[0.4em]" inputMode="numeric" autoFocus
                  maxLength={6} placeholder="••••••" value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
              </Field>
              {error && <Banner tone="wrong">{error}</Banner>}
              <button className="btn-primary w-full" disabled={busy || code.length < 4}>
                {busy ? 'Checking…' : 'Sign in'}
              </button>
              <div className="flex items-center justify-between text-2xs">
                <button type="button" className="text-muted underline underline-offset-2"
                  onClick={() => { setStep('mobile'); setCode(''); setError(null); }}>
                  Change number
                </button>
                <button type="button" className="text-brand disabled:text-muted" disabled={wait > 0 || busy}
                  onClick={ask}>
                  {wait > 0 ? `Resend in ${wait}s` : 'Resend code'}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="mt-4 text-2xs text-muted">
          By signing in you accept our <Link className="underline" to="/terms">Terms</Link>,{' '}
          <Link className="underline" to="/privacy">Privacy policy</Link> and{' '}
          <Link className="underline" to="/refund">Refund policy</Link>.
        </p>
      </div>
    </Layout>
  );
}
