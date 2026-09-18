import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useSession } from '../lib/session';
import { rupees, mobile as fmtMobile, date } from '../lib/format';
import Layout from '../components/Layout.jsx';
import { Banner, Field, Spinner, Modal } from '../components/ui.jsx';

/**
 * The account.
 *
 * DEACTIVATION IS OFFERED PLAINLY, and what it does is stated without softening:
 * monitoring stops, alerts stop, the session ends — and the tax invoices stay,
 * because the law requires them to. A page that implied everything was erased
 * would be making a promise the business cannot keep.
 */
export default function Profile() {
  const { me, setMe, signOut } = useSession();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [language, setLanguage] = useState('en');
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
      setLanguage(d.user.language || 'en');
    }).catch(setError);
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null); setSaved(false);
    try {
      const out = await api.saveMe({ name, email, language });
      setMe(out.user);
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
          <h1 className="text-2xl font-bold text-ink">Account deactivated</h1>
          <p className="mt-3 text-sm text-body">{done}</p>
          <button className="btn-primary mt-6" onClick={() => { signOut(); navigate('/'); }}>
            Close
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-ink">Profile</h1>
      <p className="mt-1 text-sm text-muted">Your number is your account. Everything else is optional.</p>

      {error && <Banner tone="wrong" className="mt-5">{error.message}</Banner>}
      {!data && !error && <Spinner />}

      {data && (
        <div className="mt-6 grid gap-5 lg:grid-cols-3 stagger">
          <div className="card p-5 lg:col-span-2">
            <form onSubmit={save} className="space-y-4">
              <Field label="Mobile number" hint="This cannot be changed — it is how GaadiPe knows you.">
                <input className="input tabular bg-shell" value={fmtMobile(me?.mobile)} readOnly />
              </Field>
              <Field label="Your name" hint="Shown on your invoices.">
                <input className="input" value={name} placeholder="Your name"
                  onChange={(e) => setName(e.target.value)} maxLength={80} />
              </Field>
              <Field label="Email" hint="Optional. Used only to send documents you ask for.">
                <input className="input" type="email" value={email} placeholder="you@example.com"
                  onChange={(e) => setEmail(e.target.value)} maxLength={160} />
              </Field>
              <Field label="Alert language" hint="The language of the WhatsApp alerts about your vehicles.">
                <select className="input" value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="en">English</option>
                  <option value="hi">हिंदी (Hindi)</option>
                </select>
              </Field>
              {saved && <Banner tone="good">Saved.</Banner>}
              <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
            </form>
          </div>

          <div className="space-y-4">
            <div className="card p-5">
              <div className="text-2xs font-semibold uppercase tracking-wider text-muted">Your account</div>
              <dl className="mt-3 space-y-2 text-sm">
                <Line k="Member since" v={date(data.user.joined_at)} />
                <Line k="Vehicles checked" v={data.totals.vehicles} />
                <Line k="Reports bought" v={data.totals.reports} />
                <Line k="Vehicles with alerts" v={data.totals.watching} />
                <Line k="Total paid" v={rupees(data.totals.paid_paise)} />
              </dl>
            </div>

            <div className="card p-5">
              <div className="text-2xs font-semibold uppercase tracking-wider text-muted">Session</div>
              <button className="btn-quiet mt-3 w-full" onClick={() => { signOut(); navigate('/'); }}>
                Sign out
              </button>
            </div>

            <div className="card border-wrong-500/25 p-5">
              <div className="text-2xs font-semibold uppercase tracking-wider text-wrong-700">
                Close my account
              </div>
              <p className="mt-2 text-sm text-body">
                Monitoring and alerts stop, and you are signed out. Your tax invoices are kept,
                as the law requires. You can sign in again any time with the same number.
              </p>
              <button className="btn-quiet mt-3 w-full border-wrong-500/30 text-wrong-700"
                onClick={() => setConfirming(true)}>
                Deactivate account
              </button>
            </div>
          </div>
        </div>
      )}

      {confirming && (
        <Modal title="Deactivate your account?" onClose={() => setConfirming(false)}
          footer={
            <>
              <button className="btn-quiet" onClick={() => setConfirming(false)}>Keep my account</button>
              <button className="btn-quiet border-wrong-500/30 text-wrong-700" disabled={busy}
                onClick={deactivate}>
                {busy ? 'Closing…' : 'Yes, deactivate'}
              </button>
            </>
          }>
          <p className="text-sm text-body">
            Monitoring for every vehicle stops immediately and you will receive no further alerts.
            Your invoices remain available to you and to us, because tax records must be kept.
          </p>
          <Field label="Anything you would like to tell us?" hint="Optional, and read by a person.">
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
