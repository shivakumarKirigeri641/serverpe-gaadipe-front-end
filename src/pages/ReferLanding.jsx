import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, waLink, WEB_LOGIN } from '../lib/api';
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
        /*
         * STRAIGHT INTO THE CHAT once GaadiPe has a number of its own: the code
         * travels in the message, so they press Send and are in the product —
         * no sign-in, no form, no app. The page below is what they see while
         * there is no number, and if the browser refuses the redirect.
         */
        if (out.ok && out.wa_url) { window.location.replace(out.wa_url); return; }
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
        <Door to="/app/refer" text="Hi" className="btn-primary btn-arrow mt-4 w-full text-center">
          {t('refl.myLink')} <span className="arrow">→</span>
        </Door>
      </Splash>
    );
  }

  if (!state.ok) {
    return (
      <Splash>
        <Banner tone="watch">{t('refl.bad')}</Banner>
        <Door to="/app/check" text="Hi" className="btn-primary btn-arrow mt-4 w-full text-center">
          {t('refl.anyway')} <span className="arrow">→</span>
        </Door>
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
      <Door to={me ? '/app/check' : '/login'} text={`Hi GaadiPe (ref ${state.code || code})`}
        className="btn-primary btn-arrow mt-5 w-full text-center">
        {t('refl.cta')} <span className="arrow">→</span>
      </Door>
      <p className="mt-3 text-2xs text-muted">{t('refl.note')}</p>
    </Splash>
  );
}

/**
 * A button that goes into the web account, or — with no web account — into the
 * WhatsApp chat with `text` typed. The referral code rides in that text: the
 * bot reads "(ref CODE)" from the first message.
 */
const Door = ({ to, text, className, children }) => (WEB_LOGIN
  ? <Link className={className} to={to}>{children}</Link>
  : <a className={className} href={waLink(text)} rel="noopener">{children}</a>);

const Splash = ({ children }) => (
  <div className="mx-auto max-w-md px-4 py-10">
    <div className="mb-6 text-center">
      <div className="text-2xl font-extrabold tracking-tight text-brand-deep">GaadiPe</div>
      <div className="text-2xs text-muted">Har gaadi ki kundli.</div>
    </div>
    <div className="card p-5">{children}</div>
  </div>
);
