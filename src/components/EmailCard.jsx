import { useState } from 'react';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n.jsx';
import { useSession } from '../lib/session';

/**
 * ASK FOR THE EMAIL, ONCE (user, 2026-09-21). Shown on the dashboard to a
 * signed-in customer with no email on file, until they give one or say "not
 * now" (remembered in this browser). Never a wall: the account works without it.
 */
const KEY = 'gaadipe.emailCard.dismissed';
const dismissed = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };

export default function EmailCard({ className = '' }) {
  const { t } = useLang();
  const { me, setMe } = useSession();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [sentTo, setSentTo] = useState(null);
  const [hidden, setHidden] = useState(dismissed);

  if (!me || (me.email && !sentTo) || hidden) return null;

  const ok = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email.trim());
  const save = async (e) => {
    e.preventDefault();
    if (!ok) return;
    setBusy(true); setError(null);
    try {
      const out = await api.saveMe({ email: email.trim() });
      setSentTo(email.trim());
      setMe(out.user);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const later = () => { try { localStorage.setItem(KEY, '1'); } catch { /* private mode */ } setHidden(true); };

  return (
    <div className={`card border-brand/25 bg-brand/5 px-4 py-4 ${className}`}>
      {sentTo ? (
        <p className="text-sm text-ink">✉️ {t('email.card.sent', { email: sentTo })}</p>
      ) : (
        <form onSubmit={save}>
          <h2 className="text-base font-semibold text-ink">{t('email.card.h')}</h2>
          <p className="mt-1 text-sm text-body">{t('email.card.p')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input className="input min-w-0 flex-1 sm:max-w-xs" type="email" inputMode="email" autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" maxLength={160} />
            <button className="btn-primary" disabled={!ok || busy}>{t('email.card.save')}</button>
            <button type="button" className="btn-quiet" onClick={later}>{t('email.card.later')}</button>
          </div>
          {error && <p className="mt-2 text-2xs text-wrong-700">{error}</p>}
        </form>
      )}
    </div>
  );
}
