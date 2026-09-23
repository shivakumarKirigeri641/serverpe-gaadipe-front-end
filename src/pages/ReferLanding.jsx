import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n.jsx';
import { useSession } from '../lib/session';
import { Banner, Spinner } from '../components/ui.jsx';

/**
 * Where a referral link lands: gaadipe.in/r/<code> (user, 2026-09-23).
 *
 * THE CODE IS REMEMBERED HERE, NOT CLAIMED HERE. Whoever taps this is usually
 * not signed in and often not a customer at all, so nothing is written to the
 * database yet — a tap is not a referral. The code is kept in this browser and
 * sent once, after they sign in, by rememberedReferral() below.
 *
 * It survives the sign-in round trip precisely because it lives in
 * localStorage: the OTP screen, a reload, and a switch to another tab all lose
 * React state, and losing it would quietly cost the referrer their reward.
 */
const KEY = 'gaadipe.referral';

/** Keep a code for later. Overwrites an older one: the last link tapped wins. */
export const rememberReferral = (code) => {
  try { localStorage.setItem(KEY, String(code).toUpperCase()); } catch { /* private mode */ }
};
export const takeReferral = () => {
  try {
    const code = localStorage.getItem(KEY);
    if (code) localStorage.removeItem(KEY);
    return code;
  } catch { return null; }
};

export default function ReferLanding() {
  const { code } = useParams();
  const { t } = useLang();
  const { me } = useSession();
  const [state, setState] = useState(null);

  useEffect(() => {
    api.resolveReferralLink(code)
      .then((out) => {
        if (out.ok) rememberReferral(out.code);
        setState(out);
      })
      .catch(() => setState({ ok: false, reason: 'unknown' }));
  }, [code]);

  if (!state) return <Splash><Spinner /></Splash>;

  /* Their own link, in their own browser. Saying so is kinder than a shrug. */
  if (state.reason === 'own_link') {
    return (
      <Splash>
        <Banner tone="info">{t('refl.own')}</Banner>
        <Link className="btn-primary btn-arrow mt-4 w-full text-center" to="/app/refer">
          {t('refl.myLink')} <span className="arrow">→</span>
        </Link>
      </Splash>
    );
  }

  if (!state.ok) {
    return (
      <Splash>
        <Banner tone="watch">{t('refl.bad')}</Banner>
        <Link className="btn-primary btn-arrow mt-4 w-full text-center" to="/app/check">
          {t('refl.anyway')} <span className="arrow">→</span>
        </Link>
      </Splash>
    );
  }

  return (
    <Splash>
      <h1 className="text-xl font-bold text-ink">
        {state.from ? t('refl.hFrom', { name: state.from }) : t('refl.h')}
      </h1>
      <p className="mt-2 text-sm text-body">{t('refl.b')}</p>
      <ul className="mt-4 space-y-2 text-sm text-body">
        <li>· {t('refl.l1')}</li>
        <li>· {t('refl.l2')}</li>
        <li>· {t('refl.l3')}</li>
      </ul>
      <Link className="btn-primary btn-arrow mt-5 w-full text-center" to={me ? '/app/check' : '/login'}>
        {t('refl.cta')} <span className="arrow">→</span>
      </Link>
      <p className="mt-3 text-2xs text-muted">{t('refl.note')}</p>
    </Splash>
  );
}

const Splash = ({ children }) => (
  <div className="mx-auto max-w-md px-4 py-10">
    <div className="mb-6 text-center">
      <div className="text-2xl font-extrabold tracking-tight text-brand-deep">GaadiPe</div>
      <div className="text-2xs text-muted">Har gaadi ki kundli.</div>
    </div>
    <div className="card p-5">{children}</div>
  </div>
);
