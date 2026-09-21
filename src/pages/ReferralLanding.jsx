import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n.jsx';

/**
 * gaadipe.in/q/<code> — where a referral link lands (user, 2026-09-21).
 *
 * An active link opens QuizPe's WhatsApp with "Hi QuizPe 👋 (GaadiPe ref
 * GP-<code>)" typed; the parent presses Send — nothing is sent for them. The
 * link's owner, signed in on this browser, is told it is their own link
 * instead; an inactive link says so, with QuizPe's site as the way on.
 */
export default function ReferralLanding() {
  const { code } = useParams();
  const { t } = useLang();
  const [out, setOut] = useState(null);

  useEffect(() => {
    api.resolveReferral(code).then((r) => {
      setOut(r);
      if (r.ok && r.wa_url) setTimeout(() => window.location.replace(r.wa_url), 600);
    }).catch(() => setOut({ ok: false, reason: 'error' }));
  }, [code]);

  return (
    <div className="grid min-h-screen place-items-center bg-shell px-4">
      <div className="card w-full max-w-md p-6 text-center">
        <div className="text-lg font-bold text-ink">QuizPe</div>
        <p className="mt-1 text-2xs text-muted">{t('q.by')}</p>
        {!out ? <p className="mt-6 text-sm text-body">{t('common.loading')}</p>
          : out.ok ? (
            <>
              <p className="mt-5 text-sm text-body">{t('q.opening')}</p>
              <a className="btn-primary mt-4 inline-block" href={out.wa_url}>{t('q.open')}</a>
              <p className="mt-3 text-2xs text-muted">{t('q.press')}</p>
            </>
          ) : out.reason === 'own_link' ? (
            <>
              <p className="mt-5 text-sm font-semibold text-ink">{t('q.own.h')}</p>
              <p className="mt-1 text-sm text-body">{t('q.own.b')}</p>
              <Link className="btn-primary mt-4 inline-block" to="/app/refer">{t('q.own.cta')}</Link>
            </>
          ) : (
            <>
              <p className="mt-5 text-sm text-body">{t('q.inactive')}</p>
              <a className="btn-primary mt-4 inline-block" href="https://quizpe.in">quizpe.in</a>
            </>
          )}
      </div>
    </div>
  );
}
