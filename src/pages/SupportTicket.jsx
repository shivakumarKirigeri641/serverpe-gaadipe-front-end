import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n.jsx';
import { Banner, Spinner } from '../components/ui.jsx';

/**
 * The support form a WhatsApp message links to (user, 2026-09-23).
 *
 * NOBODY SIGNS IN. The token in the link says who is writing — they proved it
 * by messaging from their own number — so the form opens already knowing them
 * and asks only what it does not have. Signing in here would mean an OTP to
 * read a form, which is how a complaint becomes an abandoned complaint.
 *
 * ONE SCREEN. Everything at once: what it is about, what happened, and how to
 * reach them. The same questions over WhatsApp buttons would be six round
 * trips and would lose most people before the end.
 *
 * The link is spent when the form is SENT, not when it is opened, so someone
 * interrupted halfway can come back and finish.
 */
const TOPICS = [
  'Payment or invoice',
  'Report is wrong or missing',
  'Monitoring and alerts',
  'Refund',
  'Something else',
];

export default function SupportTicket() {
  const { token } = useParams();
  const { t } = useLang();
  const [who, setWho] = useState(null);
  const [gone, setGone] = useState(false);
  const [done, setDone] = useState(null);

  const [subject, setSubject] = useState(TOPICS[0]);
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [regNo, setRegNo] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.supportWho(token)
      .then((out) => {
        setWho(out);
        setName(out.name || '');
        setEmail(out.email || '');
        setRegNo(out.reg_no || '');
      })
      .catch(() => setGone(true));
  }, [token]);

  const send = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const out = await api.supportSend(token, { subject, message, name, email, reg_no: regNo });
      if (!out.ok) { setError(out.message || t('sup.failed')); return; }
      setDone(out.ticket_no);
    } catch (err) {
      setError(err.message);
    } finally { setBusy(false); }
  };

  if (gone) {
    return (
      <Splash>
        <Banner tone="watch">{t('sup.expired')}</Banner>
        <p className="mt-3 text-sm text-body">{t('sup.expiredB')}</p>
      </Splash>
    );
  }
  if (done) {
    return (
      <Splash>
        <Banner tone="good">
          <b>{t('sup.sent')}</b>
        </Banner>
        <div className="mt-4 rounded-lg border border-line bg-shell px-4 py-3 text-center">
          <div className="text-2xs uppercase tracking-wider text-muted">{t('sup.ticket')}</div>
          <div className="mt-1 text-lg font-bold text-ink">{done}</div>
        </div>
        <p className="mt-3 text-sm text-body">{t('sup.sentB')}</p>
        <Link className="btn-quiet mt-4 w-full text-center" to="/">{t('sup.home')}</Link>
      </Splash>
    );
  }
  if (!who) return <Splash><Spinner /></Splash>;

  const ready = message.trim().length >= 10 && agreed;

  return (
    <Splash>
      <h1 className="text-xl font-bold text-ink">{t('sup.h')}</h1>
      <p className="mt-1 text-sm text-muted">{t('sup.sub', { mobile: who.mobile_masked })}</p>

      <form className="mt-5 space-y-4" onSubmit={send}>
        <label className="block">
          <span className="label">{t('sup.topic')}</span>
          <select className="input" value={subject} onChange={(e) => setSubject(e.target.value)}>
            {TOPICS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="label">{t('sup.message')}</span>
          <textarea className="input min-h-32" value={message} maxLength={4000}
            onChange={(e) => setMessage(e.target.value)} placeholder={t('sup.messagePh')} />
          <span className="mt-1 block text-2xs text-muted">{t('sup.messageNote')}</span>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">{t('sup.name')}</span>
            <input className="input" value={name} maxLength={80} autoComplete="name"
              onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block">
            <span className="label">{t('sup.vehicle')}</span>
            <input className="input" value={regNo} maxLength={12}
              onChange={(e) => setRegNo(e.target.value.toUpperCase())} placeholder="KA01AB1234" />
          </label>
        </div>

        <label className="block">
          <span className="label">{t('sup.email')}</span>
          <input className="input" type="email" inputMode="email" value={email} maxLength={160}
            autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
          <span className="mt-1 block text-2xs text-muted">{t('sup.emailNote')}</span>
        </label>

        <label className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition ${
          agreed ? 'border-brand/40 bg-brand/5' : 'border-line bg-white'}`}>
          <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-brand"
            checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span className="text-2xs leading-relaxed text-body">{t('sup.agree')}</span>
        </label>

        {error && <Banner tone="wrong">{error}</Banner>}

        <button className="btn-primary w-full" disabled={!ready || busy}>
          {busy ? t('sup.sending') : t('sup.send')}
        </button>
      </form>
    </Splash>
  );
}

const Splash = ({ children }) => (
  <div className="mx-auto max-w-lg px-4 py-10">
    <div className="mb-6 text-center">
      <div className="text-2xl font-extrabold tracking-tight text-brand-deep">GaadiPe</div>
      <div className="text-2xs text-muted">Har gaadi ki kundli.</div>
    </div>
    <div className="card p-5">{children}</div>
  </div>
);
