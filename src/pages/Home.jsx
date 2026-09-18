import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, waLink, WHATSAPP_ENABLED } from '../lib/api';
import { rupees } from '../lib/format';
import { useLang, Rich } from '../lib/i18n.jsx';
import Layout from '../components/Layout.jsx';
import Reveal from '../components/Reveal.jsx';
import useCountUp from '../lib/useCountUp';

/**
 * The landing page, in English and Hindi.
 *
 * THE VOICE IS THE ONE GAADIPE ALREADY HAS: "kharidne se pehle, poori kundli".
 * A kundli is a birth chart — the whole history of a thing, read before a
 * family commits to it. In Hindi the line is simply the line; in English the
 * Hinglish is kept, because it is the brand, and the detail underneath does
 * the explaining.
 *
 * IT LEADS WITH THE BUYER, because that is who pays, and every number on it
 * comes from the server: a price on a website that disagrees with the one
 * charged is the first thing produced in a dispute.
 */
export default function Home() {
  const { t } = useLang();
  const [pricing, setPricing] = useState(null);
  const [reg, setReg] = useState('');
  const navigate = useNavigate();

  useEffect(() => { api.pricing().then(setPricing).catch(() => {}); }, []);
  const priceValue = useCountUp(pricing ? Math.round(pricing.price_paise / 100) : 0);
  const price = pricing ? rupees(pricing.price_paise) : '₹19';
  const days = pricing?.duration_days ?? 28;
  const validDays = pricing?.report_valid_days ?? 7;

  const go = (e) => {
    e.preventDefault();
    const plate = reg.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (plate.length < 5) return;
    // The check itself needs an account, so the plate travels to the sign-in
    // screen and the check runs the moment they are in.
    navigate(`/app/check?reg=${plate}`);
  };

  return (
    <Layout wide>
      {/* ---------------------------------------------------------- hero */}
      <section className="relative overflow-hidden border-b border-line bg-gradient-to-b from-brand/[0.07] via-white to-white">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="drift absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand/10 blur-3xl" />
          <div className="drift absolute -right-16 top-20 h-80 w-80 rounded-full bg-brand-accent/10 blur-3xl"
            style={{ animationDelay: '-7s' }} />
        </div>

        <div className="wrap relative grid items-center gap-10 py-12 lg:grid-cols-[1.05fr_1fr] lg:py-20">
          <div>
            <span className="chip anim-up border-brand/20 bg-white text-brand-deep">{t('home.chip')}</span>

            <h1 className="anim-up mt-4 text-3xl font-bold leading-[1.2] text-ink sm:text-[2.6rem]"
              style={{ animationDelay: '.06s' }}>
              {t('home.h1a')}<br className="hidden sm:block" /> {t('home.h1b')}
            </h1>

            <p className="anim-up mt-4 text-lg leading-relaxed text-body" style={{ animationDelay: '.14s' }}>
              <Rich text={t('home.lead')} />
            </p>

            <form onSubmit={go} className="anim-up mt-6 flex flex-col gap-3 sm:flex-row"
              style={{ animationDelay: '.22s' }}>
              <input className="input sm:flex-1" placeholder="KA02EX1480" value={reg}
                onChange={(e) => setReg(e.target.value)} aria-label={t('home.sticky.placeholder')} />
              <button className="btn-primary btn-big btn-arrow">
                {t('home.cta')} <span className="arrow">→</span>
              </button>
            </form>

            <p className="anim-up mt-3 text-sm text-muted" style={{ animationDelay: '.3s' }}>
              <Rich text={t('home.freeLine', { price })} />
            </p>
          </div>

          <div className="card anim-up p-5" style={{ animationDelay: '.12s' }}>
            <div className="flex items-center justify-between">
              <span className="text-2xs font-semibold uppercase tracking-wider text-muted">{t('home.cardTitle')}</span>
              <span className="chip border-good-500/25 bg-good-50 text-good-700">
                <span className="anim-ring h-1.5 w-1.5 rounded-full bg-good-500" />{t('home.free')}
              </span>
            </div>
            <div className="mt-3 space-y-2.5 stagger">
              <Line label={t('home.row.maker')} value="Hero MotoCorp" />
              <Line label={t('home.row.model')} value="Splendor Plus" />
              <Line label={t('home.row.fuel')} value="Petrol · Motorcycle" />
              <Line label={t('home.row.status')} value={t('home.row.statusValue')} note={t('home.row.statusNote')} tone="wrong" />
            </div>

            <div className="sweep mt-3 rounded-lg border border-brand/25 bg-brand/5 p-3">
              <div className="text-2xs font-semibold uppercase tracking-wider text-brand-deep">
                {t('home.inReport', { price })}
              </div>
              <div className="mt-2 space-y-1.5">
                <Locked label={t('home.lock.loan')} />
                <Locked label={t('home.lock.blacklist')} />
                <Locked label={t('home.lock.challans')} />
                <Locked label={t('home.lock.dates')} />
              </div>
            </div>
            <p className="mt-3 text-2xs text-muted">{t('common.example')}</p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- who it is for */}
      <section className="wrap py-14">
        <Reveal>
          <h2 className="text-2xl font-bold text-ink">{t('home.who.h')}</h2>
          <p className="mt-1.5 text-body">{t('home.who.sub')}</p>
        </Reveal>
        <div className="mt-6 grid gap-4 stagger sm:grid-cols-2 lg:grid-cols-4">
          {['buy', 'sell', 'own', 'driver'].map((k) => (
            <Use key={k} title={t(`home.who.${k}.t`)} body={t(`home.who.${k}.b`)} />
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------- what is inside */}
      <section id="report" className="border-y border-line bg-shell/60">
        <div className="wrap py-14">
          <Reveal>
            <h2 className="text-2xl font-bold text-ink">{t('home.report.h')}</h2>
            <p className="mt-1.5 max-w-2xl text-body">{t('home.report.sub')}</p>
          </Reveal>
          <div className="mt-6 grid gap-4 stagger sm:grid-cols-2 lg:grid-cols-3">
            {['loan', 'blacklist', 'challans', 'insurance', 'docs', 'fastag', 'rc', 'alerts', 'gst'].map((k) => (
              <Item key={k} title={t(`home.item.${k}.t`, { days })} body={t(`home.item.${k}.b`)} />
            ))}
          </div>
          <Reveal className="mt-6">
            <p className="text-sm text-muted"><Rich text={t('home.never')} /></p>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------ price */}
      <section id="price" className="wrap py-14">
        <div className="grid gap-8 lg:grid-cols-2">
          <Reveal>
            <h2 className="text-2xl font-bold text-ink">{t('home.price.h')}</h2>
            <p className="mt-3 text-body">{t('home.price.sub')}</p>
            <ul className="mt-5 space-y-2.5">
              {['t1', 't2', 't3', 't4', 't5'].map((k) => (
                <Tick key={k}>{t(`home.price.${k}`, { days, validDays })}</Tick>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={80} className="card self-start p-6">
            <div className="text-2xs font-semibold uppercase tracking-wider text-muted">{t('home.price.card')}</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="tabular text-5xl font-bold text-ink">₹{priceValue}</span>
              <span className="text-sm text-muted">{t('home.price.per')}</span>
            </div>
            <p className="mt-2 text-2xs text-muted">{t('home.price.incl')}</p>
            <a className="btn-primary btn-big btn-arrow mt-5 w-full" href="/app/check">
              {t('home.price.cta')} <span className="arrow">→</span>
            </a>
            <a className="btn-quiet mt-2 w-full" href="/sample-report.pdf" target="_blank" rel="noopener">
              {t('home.price.sample')}
            </a>
            {WHATSAPP_ENABLED && (
              <a className="btn-quiet mt-2 w-full" href={waLink('Hi')}>WhatsApp</a>
            )}
            <p className="mt-3 text-2xs text-muted">{t('home.price.final')}</p>
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------- privacy */}
      <section className="border-y border-line bg-shell/60">
        <div className="wrap py-14">
          <Reveal><h2 className="text-2xl font-bold text-ink">{t('home.privacy.h')}</h2></Reveal>
          <div className="mt-6 grid gap-4 stagger sm:grid-cols-2 lg:grid-cols-4">
            {['owner', 'dpdp', 'pay', 'close'].map((k) => (
              <Item key={k} title={t(`home.privacy.${k}.t`)} body={t(`home.privacy.${k}.b`)} />
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ story */}
      <section className="wrap py-14">
        <Reveal className="card mx-auto max-w-3xl p-6 sm:p-8">
          <h2 className="text-xl font-bold text-ink">{t('home.story.h')}</h2>
          <div className="mt-4 space-y-3 text-body">
            <p>{t('home.story.p1')}</p>
            <p>{t('home.story.p2')}</p>
            <p>{t('home.story.p3')}</p>
          </div>
          <p className="mt-4 text-2xs text-muted">Shivakumar Kirigeri · ServerPe App Solutions, Karnataka</p>
        </Reveal>
      </section>

      {/* A phone should never have to scroll back up to act. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:hidden">
        <form onSubmit={go} className="flex gap-2">
          <input className="input !py-2.5 flex-1" placeholder={t('home.sticky.placeholder')} value={reg}
            onChange={(e) => setReg(e.target.value)} aria-label={t('home.sticky.placeholder')} />
          <button className="btn-primary !px-5">{t('home.sticky.cta')}</button>
        </form>
      </div>
      <div className="h-20 sm:hidden" />

      {/* -------------------------------------------------------------- faq */}
      <section id="faq" className="border-t border-line bg-shell/60">
        <div className="wrap py-14">
          <Reveal><h2 className="text-2xl font-bold text-ink">{t('home.faq.h')}</h2></Reveal>
          <div className="mt-6 space-y-3 stagger">
            {['vahan', 'owner', 'source', 'cover', 'app', 'current', 'notfound', 'again'].map((k) => (
              <Faq key={k} q={t(`home.faq.${k}.q`)}>{t(`home.faq.${k}.a`)}</Faq>
            ))}
          </div>

          <Reveal className="mt-8 text-center">
            <h3 className="text-xl font-bold text-ink">{t('home.final.h')}</h3>
            <p className="mt-1.5 text-body">{t('home.final.sub')}</p>
            <a className="btn-primary btn-big btn-arrow mt-4 inline-flex" href="/app/check">
              {t('common.checkVehicle')} <span className="arrow">→</span>
            </a>
          </Reveal>
        </div>
      </section>
    </Layout>
  );
}

/* ------------------------------------------------------------ the pieces */

const Line = ({ label, value, note, tone }) => (
  <div className="flex items-center justify-between gap-3 border-b border-line/70 pb-2">
    <span className="text-sm text-body">{label}</span>
    <span className="text-right">
      <span className="text-sm text-ink">{value}</span>
      {note && (
        <span className={`ml-2 text-2xs ${tone === 'wrong' ? 'text-wrong-700' : 'text-muted'}`}>{note}</span>
      )}
    </span>
  </div>
);

const Locked = ({ label }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-sm text-body">{label}</span>
    <span className="text-2xs text-brand-deep">🔒</span>
  </div>
);

const Use = ({ title, body }) => (
  <div className="card lift p-5">
    <h3 className="text-base font-semibold text-ink">{title}</h3>
    <p className="mt-1.5 text-sm text-body">{body}</p>
  </div>
);

const Item = ({ title, body }) => (
  <div className="card p-5">
    <h3 className="text-sm font-semibold text-ink">{title}</h3>
    <p className="mt-1.5 text-sm text-body">{body}</p>
  </div>
);

const Tick = ({ children }) => (
  <li className="flex gap-2.5 text-body">
    <span className="mt-0.5 shrink-0 text-brand">✓</span>{children}
  </li>
);

const Faq = ({ q, children }) => (
  <details className="card group px-5 py-4">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ink marker:hidden">
      {q}
      <span className="text-muted transition-transform duration-300 group-open:rotate-180">▾</span>
    </summary>
    <p className="anim-open mt-2 text-sm leading-relaxed text-body">{children}</p>
  </details>
);
