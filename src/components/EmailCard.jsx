import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n.jsx';
import { useSession } from '../lib/session';
import { Modal } from './ui.jsx';

/**
 * ASK FOR THE EMAIL, RIGHT AFTER SIGN-IN (user, 2026-09-21).
 *
 * A popup on the account pages whenever the account has no email, or has one
 * that is not confirmed yet — vehicle updates only go to a confirmed address.
 * "Not now" hides it until the next sign-in (this tab's session), never for
 * good: without an email a customer gets no updates at all.
 */
const KEY = 'gaadipe.emailPrompt.dismissed';
const dismissedNow = () => { try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; } };
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

export default function EmailPrompt() {
  const { t } = useLang();
  const { me, setMe } = useSession();
  const { pathname } = useLocation();
  const [email, setEmail] = useState('');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [sentTo, setSentTo] = useState(null);
  const [resent, setResent] = useState(false);
  const [hidden, setHidden] = useState(dismissedNow);

  // Every sign-in starts fresh: this component lives for the whole visit, so
  // "Not now" or a finished step must not carry over to the next account session.
  const signedIn = Boolean(me);
  useEffect(() => {
    if (!signedIn) return;
    setHidden(dismissedNow()); setSentTo(null); setEditing(false); setResent(false); setError(null);
  }, [signedIn]);

  if (!me || hidden || !pathname.startsWith('/app')) return null;
  const pending = Boolean(me.email) && !me.email_verified && !me.email_unsubscribed;
  if (!sentTo && me.email && !pending) return null;

  const close = () => { try { sessionStorage.setItem(KEY, '1'); } catch { /* private mode */ } setHidden(true); };
  const ok = EMAIL_RE.test(email.trim());

  const save = async (e) => {
    e.preventDefault();
    if (!ok) return;
    setBusy(true); setError(null);
    try {
      const out = await api.saveMe({ email: email.trim() });
      setSentTo(email.trim()); setEditing(false);
      setMe(out.user);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const resend = async () => {
    setBusy(true); setError(null);
    try { await api.resendEmail(); setResent(true); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  // Sent a link: say where, and stop asking.
  if (sentTo) {
    return (
      <Modal title={t('email.pop.checkH')} onClose={close}
        footer={<button className="btn-primary" onClick={close}>{t('email.pop.ok')}</button>}>
        <p className="text-sm text-body">✉️ {t('email.card.sent', { email: sentTo })}</p>
      </Modal>
    );
  }

  // An address on file, not yet confirmed: resend, or change it.
  if (pending && !editing) {
    return (
      <Modal title={t('email.pop.pendingH')} onClose={close}
        footer={
          <>
            <button className="btn-quiet" onClick={close}>{t('email.card.later')}</button>
            <button className="btn-quiet" onClick={() => { setEditing(true); setEmail(me.email); }}>{t('email.change')}</button>
            <button className="btn-primary" onClick={resend} disabled={busy || resent}>
              {resent ? t('email.resent') : t('email.resend')}
            </button>
          </>
        }>
        <p className="text-sm text-body">{t('email.pop.pendingP', { email: me.email })}</p>
        {error && <p className="mt-2 text-2xs text-wrong-700">{error}</p>}
      </Modal>
    );
  }

  return (
    <Modal title={t('email.card.h')} onClose={close}
      footer={
        <>
          <button className="btn-quiet" onClick={close}>{t('email.card.later')}</button>
          <button className="btn-primary" form="email-prompt" disabled={!ok || busy}>{t('email.card.save')}</button>
        </>
      }>
      <form id="email-prompt" onSubmit={save}>
        <p className="text-sm text-body">{t('email.card.p')}</p>
        <input className="input mt-3" type="email" inputMode="email" autoComplete="email" autoFocus
          value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" maxLength={160} />
        {error && <p className="mt-2 text-2xs text-wrong-700">{error}</p>}
      </form>
    </Modal>
  );
}
