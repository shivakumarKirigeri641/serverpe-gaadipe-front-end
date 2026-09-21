import { Link } from 'react-router-dom';
import { useLang } from '../lib/i18n.jsx';
import { useSession } from '../lib/session';

/**
 * QUIZPE, FROM THE SAME MAKERS (user, 2026-09-21). QuizPe is ServerPe App
 * Solutions' education product for school students: a short daily quiz on
 * WhatsApp, matched to the child's board and grade. Facts here are QuizPe's own
 * published ones (boards, grades, medium) — nothing promised that it does not do.
 * The referral offer is mentioned, and links to the Refer page when signed in.
 */
export default function SisterQuizpe() {
  const { t } = useLang();
  const { me } = useSession();
  const points = ['p1', 'p2', 'p3', 'p4'];
  return (
    <section id="quizpe" className="wrap py-14">
      <div className="card grid gap-6 p-6 sm:p-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="text-2xs font-semibold uppercase tracking-wider text-brand-deep">{t('qp.kicker')}</div>
          <h2 className="mt-1 text-2xl font-bold text-ink">{t('qp.h')}</h2>
          <p className="mt-2 text-sm leading-relaxed text-body">{t('qp.b')}</p>
          <ul className="mt-4 space-y-1.5 text-sm text-body">
            {points.map((p) => <li key={p}>✓ {t(`qp.${p}`)}</li>)}
          </ul>
          <a className="btn-primary mt-5 inline-block" href="https://quizpe.in/?utm_source=gaadipe&utm_medium=site" target="_blank" rel="noopener noreferrer">
            {t('qp.cta')}
          </a>
        </div>
        <div className="rounded-xl border border-brand/20 bg-brand/5 p-5 lg:col-span-2">
          <div className="text-base font-semibold text-ink">🎁 {t('qp.offer.h')}</div>
          <p className="mt-1.5 text-sm text-body">{t('qp.offer.b')}</p>
          <Link className="btn-quiet mt-4 inline-block" to={me ? '/app/refer' : '/login?next=%2Fapp%2Frefer'}>{t('qp.offer.cta')}</Link>
          <p className="mt-3 text-2xs text-muted">{t('qp.offer.fine')}</p>
        </div>
      </div>
    </section>
  );
}
