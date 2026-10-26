import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../lib/session.jsx';
import { api, waLink, WHATSAPP_ENABLED, WEB_LOGIN, CHECK_ON_WHATSAPP, WHATSAPP_TRY } from '../lib/api';
import WhatsAppCta from '../components/WhatsAppCta.jsx';
import { rupees } from '../lib/format';
import { useLang, Rich } from '../lib/i18n.jsx';
import Layout from '../components/Layout.jsx';
import DataSourceNote from '../components/DataSourceNote.jsx';
import SisterQuizpe from '../components/SisterQuizpe.jsx';
import { QUIZPE_ENABLED } from '../lib/api';
import Reveal from '../components/Reveal.jsx';
import Testimonials from '../components/Testimonials.jsx';
import Milestone from '../components/Milestone.jsx';

/**
 * The landing page, in English and Hindi.
 *
 * THE VOICE IS THE ONE GAADIPE ALREADY HAS: "gaadi ki chamak pe mat jao, gaadi ki kundli
 * dekho" (2026-10-10; before it, "kharidne se pehle, poori kundli").
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
  const { t, lang } = useLang();
  const [pricing, setPricing] = useState(null);
  const [reg, setReg] = useState('');
  /* "Try in WhatsApp" follows the server's switch (site_whatsapp_try, scripts/wa-button.js): hidden until the
     server says yes, so a WhatsApp outage hides it at once without a new build. */
  const [tryWa, setTryWa] = useState(false);
  useEffect(() => { api.notice().then((n) => setTryWa(n?.whatsapp_try === true)).catch(() => setTryWa(false)); }, []);
  const navigate = useNavigate();

  /* gaadipe.in IS the home page, on a phone too (user, 2026-10-08: "you are
     redirecting gaadipe.in to /chat — change that"). Sending every phone and
     every one-time chat visitor straight into the chat meant a cold visitor
     from an ad never learned what GaadiPe is before being asked for a mobile.
     Only someone already signed in — a customer — goes on to their chat;
     ?home=1 (the chat's Home link) always shows this page. */
  const { me, ready } = useSession();
  useEffect(() => {
    // Only while the website is the main door (VITE_WEB_LOGIN): WhatsApp-first (2026-10-09)
    // keeps /chat as a quiet backup that nobody is sent to.
    if (WEB_LOGIN && ready && me && !new URLSearchParams(window.location.search).has('home')) navigate(`/chat${window.location.search}`, { replace: true });
  }, [ready, me, navigate]);

  useEffect(() => { api.pricing().then(setPricing).catch(() => {}); }, []);
  // What a free check gives away, so the example card matches it (free_view_detail).
  const detail = pricing?.free_view_detail || 'count';
  // The price rolls on the pump drums when its card comes into view (user, 2026-09-30).
  const priceRef = useRef(null);
  const priceSeen = useSeen(priceRef, Boolean(pricing));
  const price = pricing ? rupees(pricing.price_paise) : '₹19';
  // The one-time report, no alerts (2026-10-25, REPORT11): shown only when the server sells it.
  const oncePrice = pricing?.one_time_paise ? rupees(pricing.one_time_paise) : null;
  // The renewal price as set in admin (2026-10-14), not typed into the text.
  const renew = pricing?.renewal_paise ? rupees(pricing.renewal_paise) : '₹15';
  // Replace vehicle (2026-10-20): its price and window from /pricing; hidden until they arrive.
  const replacePrice = pricing?.replace_paise ? rupees(pricing.replace_paise) : null;
  const replaceDays = pricing?.replace_window_days ?? 7;
  const days = pricing?.duration_days ?? 28;
  const validDays = pricing?.report_valid_days ?? 7;
  // WhatsApp on: every check door on this page opens the WhatsApp chat with "Hi" (2026-10-12).
  const wa = CHECK_ON_WHATSAPP;

  const go = (e) => {
    e.preventDefault();
    const plate = reg.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (plate.length < 5) return;
    // WhatsApp on: straight into the WhatsApp chat with "Hi" (2026-10-12).
    if (CHECK_ON_WHATSAPP) { window.location.href = waLink('Hi'); return; }
    // The free check needs no account (2026-10-07): it runs in the chat at once.
    navigate(`/chat?reg=${plate}`);
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

        <div className="wrap relative grid items-start gap-10 py-8 lg:grid-cols-[1.05fr_1fr] lg:py-16">
          <div>
            {/* The "All India · No app" chip was here; the badges under the box say it now (2026-10-25). */}
            {wa && <span className="chip anim-up border-brand/20 bg-white text-brand-deep">{t('home.chip.wa')}</span>}

            {/* ACTION FIRST (user, 2026-10-25: "the hero content is not attractive" — 25 of 31 ad visitors left
                from the first screen, with the number box below a long headline, a paragraph and the offer card).
                Now: a short promise, one line of what and how much, the number box with both buttons, and three
                badges — all on a phone's first screen. The tagline, the story and the offer follow for readers. */}
            <h1 className="anim-up mt-4 text-[2rem] font-extrabold leading-[1.1] tracking-tight text-ink sm:text-5xl"
              style={{ animationDelay: '.06s' }}>
              {t('home.quick.h')}
            </h1>
            <p className="anim-up mt-3 text-base font-semibold leading-snug text-body sm:text-lg" style={{ animationDelay: '.1s' }}>
              {t('home.quick.sub', { price: oncePrice || price })}
            </p>

            {wa ? (
              /* WhatsApp-first (user, 2026-09-25): the chat is the product now.
                 One button, "Hi" already typed; the number underneath for
                 anyone who would rather save it. */
              <div className="anim-up mt-5" style={{ animationDelay: '.14s' }}>
                <WhatsAppCta className="w-full sm:w-auto" showNumber />
              </div>
            ) : (
              <form onSubmit={go} className="anim-up mt-5 grid gap-3 sm:max-w-xl"
                style={{ animationDelay: '.14s' }}>
                <input className="input !py-3.5 text-lg font-semibold tracking-wide" placeholder="KA01AB1234" value={reg}
                  onChange={(e) => setReg(e.target.value)} aria-label={t('home.sticky.placeholder')} />
                {/* The two ways in, side by side (user, 2026-10-25: "let the user choose"). */}
                <CheckPair tryWa={tryWa} test="home-try-wa"
                  check={<button className={CHECK_BTN}>{t('common.checkVehicle')} <span className="arrow">→</span></button>} />
              </form>
            )}
            {/* Typing and sending a number is agreeing (user, 2026-10-14). */}
            {!wa && (
              <p className="mt-2 text-2xs text-muted" data-test="home-send-terms">
                {String(t('home.sendAgree')).split(/(\[[^\]]+\]\([^)]+\))/).map((part, i) => {
                  const m = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
                  return m ? <a key={i} href={m[2]} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink">{m[1]}</a> : part;
                })}
              </p>
            )}
            <div className="anim-up mt-3 flex flex-wrap gap-2" style={{ animationDelay: '.18s' }} data-test="home-badges">
              {['b1', 'b2', 'b3'].map((k) => (
                <span key={k} className="chip border-brand/20 bg-white text-[12.5px] font-semibold text-brand-deep">✓ {t(`home.quick.${k}`)}</span>
              ))}
            </div>

            {/* The tagline and the story, for those who read on. */}
            <p className="anim-up mt-7 text-xl font-bold leading-snug text-ink sm:text-2xl" style={{ animationDelay: '.22s' }}>
              {t('home.h1a')} {t('home.h1b')}
            </p>
            {/* The same line in plain English, small (2026-10-10) — for Kerala, Tamil Nadu and beyond. */}
            <p className="mt-1 text-sm font-semibold text-brand-deep" lang="en">
              {t('home.h1en')}
            </p>
            <p className="mt-3 text-base leading-relaxed text-body">
              <Rich text={t('home.lead')} />
            </p>

            {/* The offer, said plainly (user, 2026-09-18): what is bought, for how
                long, and the price — read from the server, like every price here. */}
            <div className="anim-up sweep relative mt-5 overflow-hidden rounded-2xl border border-brand/25 bg-white/80 p-4 shadow-card backdrop-blur-sm sm:p-5"
              style={{ animationDelay: '.18s' }}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="flex items-start gap-2 text-base font-semibold leading-snug text-ink sm:text-lg">
                  <span aria-hidden="true" className="text-xl leading-none">🚗</span>
                  <span>{t('home.offer.title', { days })}</span>
                </p>
                <p className="shrink-0 whitespace-nowrap">
                  <span className="text-sm text-muted">{t('home.offer.only')} </span>
                  <span className="text-3xl font-extrabold tabular text-brand-deep">{price}</span>
                </p>
              </div>
              <div className="mt-2 grid gap-1 text-sm text-body">
                <span className="flex items-center gap-1.5"><span className="text-good-700">✓</span>{t('home.offer.l1')}</span>
                <span className="flex items-center gap-1.5"><span className="text-good-700">✓</span>{t('home.offer.l2', { days })}</span>
                {oncePrice && (
                  <span className="flex items-center gap-1.5 font-semibold text-brand-deep" data-test="offer-once">
                    <span aria-hidden="true">📋</span>{t('home.offer.once', { price: oncePrice })}</span>
                )}
              </div>
              {/* A reassurance, not a warning (user, 2026-10-01): personal details are masked. */}
              <p className="mt-2.5 flex items-start gap-1.5 border-t border-line pt-2.5 text-2xs font-medium leading-snug text-body">
                <span aria-hidden="true">🔒</span>{t('home.offer.law')}
              </p>
            </div>

            <p className="anim-up mt-3 text-sm text-muted" style={{ animationDelay: '.3s' }}>
              <Rich text={t(wa ? 'home.freeLine.wa' : 'home.freeLine', { price, renew, perDay: pricing?.free_checks_per_day ?? 6,
                // The check pack as set in admin (2026-10-26, /pricing check_pack).
                packChecks: pricing?.check_pack?.checks ?? 5, packDays: pricing?.check_pack?.days ?? 30,
                packPrice: `₹${Math.round((pricing?.check_pack?.price_paise ?? 2500) / 100)}` })} />
            </p>

            {/* Why pay at all (user, 2026-09-30): what the other way costs — up
                top, where the decision is made. Compact, so the button stays high. */}
            <div className="anim-up mt-4 rounded-xl border border-watch-500/30 bg-watch-50 px-4 py-3" style={{ animationDelay: '.34s' }}>
              <p className="text-base font-bold text-ink">{t('home.why.h', { price })}</p>
              <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm font-medium text-body">
                {['time', 'fuel', 'calls'].map((k) => <span key={k} className="whitespace-nowrap">{t(`home.why.${k}.s`)}</span>)}
              </p>
            </div>
            <DataSourceNote compact className="anim-up mt-4" />
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
              {/* The example says exactly what a real free check says (free_view_detail). */}
              {detail === 'labels'
                ? <Line label={t('home.row.status')} value={t('home.row.statusValue')} note={t('home.row.statusNote')} tone="wrong" />
                : detail === 'count'
                ? <Line label={t('home.row.status')} value={t('home.row.statusCount')} tone="watch" />
                : <Line label={t('home.row.status')} value={t('home.row.statusLocked')} tone="watch" />}
            </div>

            <div className="sweep mt-3 rounded-lg border border-brand/25 bg-brand/5 p-3">
              <div className="text-2xs font-semibold uppercase tracking-wider text-brand-deep">
                {/* "from ₹11" while the one-time report is sold (2026-10-25), so the page tells one story. */}
                {t('home.inReport', { price: oncePrice ? `${lang === 'hi' ? '' : 'from '}${oncePrice}${lang === 'hi' ? ' से' : ''}` : price })}
              </div>
              <div className="mt-2 space-y-1.5">
                <Locked label={t('home.lock.loan')} />
                <Locked label={t('home.lock.blacklist')} />
                <Locked label={t('home.lock.challans')} />
                <Locked label={t('home.lock.dates')} />
              </div>
              <a className="btn-primary btn-arrow mt-3 w-full text-center" href={wa ? waLink('Hi') : '/chat'}>
                {oncePrice ? (lang === 'hi' ? `पूरी रिपोर्ट सिर्फ़ ${oncePrice} से` : `Get the full report from ${oncePrice}`) : t('home.lock.cta', { price })} <span className="arrow">→</span>
              </a>
            </div>
            <p className="mt-3 text-2xs text-muted">{t('common.example')}</p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ GaadiPe so far */}
      <SoFar />

      {/* ------------------------------------------ what customers say (approved) */}
      <Testimonials />

      {/* ------------------------------------------------ how it works, in chat */}
      {wa && (
        <section className="wrap py-14">
          <Reveal>
            <h2 className="text-2xl font-bold text-ink">{t('home.how.h')}</h2>
            <p className="mt-1.5 text-body">{t('home.how.sub')}</p>
          </Reveal>
          <ol className="mt-6 grid gap-4 stagger sm:grid-cols-3">
            {['1', '2', '3'].map((k) => (
              <li key={k} className="card lift p-5">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-sm font-bold text-white">{k}</span>
                <h3 className="mt-3 text-base font-semibold text-ink">{t(`home.how.${k}.t`, { price })}</h3>
                <p className="mt-1 text-sm text-body">{t(`home.how.${k}.b`, { price, days })}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

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
            {['verdict', 'loan', 'blacklist', 'challans', 'insurance', 'docs', 'fastag', 'rc', 'alerts', 'gst'].map((k) => (
              <Item key={k} title={t(`home.item.${k}.t`, { days })} body={t(`home.item.${k}.b`)} />
            ))}
          </div>
          <Reveal className="mt-6">
            <p className="text-sm text-muted"><Rich text={t('home.never')} /></p>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------ price */}
      {/* TWO PRICES, ONE TABLE (user, 2026-10-25: "put a grid table for 11 & 19, it is confusing"): what each
          buys, row by row. Shown while the server sells the one-time report; the single-price card otherwise. */}
      {oncePrice ? (
        <PriceTable lang={lang} once={oncePrice} full={price} renew={renew} days={days} validDays={validDays}
          wa={wa} tryWa={tryWa} replacePrice={replacePrice} replaceDays={replaceDays} t={t} pack={pricing?.check_pack || null} />
      ) : (
      <section id="price" className="wrap py-14">
        <div className="grid gap-8 lg:grid-cols-2">
          <Reveal>
            <h2 className="text-2xl font-bold text-ink">{t('home.price.h')}</h2>
            <p className="mt-3 text-body">{t('home.price.sub', { renew, days })}</p>
            <ul className="mt-5 space-y-2.5">
              {['t1', 't2', 't3', 't4', 't5'].map((k) => (
                <Tick key={k}>{t(`home.price.${k}${wa && (k === 't2' || k === 't4') ? '.wa' : ''}`, { days, validDays })}</Tick>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={80} className="card self-start p-6">
            <div className="text-2xs font-semibold uppercase tracking-wider text-muted">{t('home.price.card')}</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span ref={priceRef} className="tabular text-5xl font-bold text-ink">₹{pricing ? <Odometer value={Math.round(pricing.price_paise / 100)} go={priceSeen} ms={1300} /> : '—'}</span>
              <span className="text-sm text-muted">{t('home.price.per')}</span>
            </div>
            <p className="mt-2 text-2xs text-muted">{t('home.price.incl')}</p>
            {wa ? (
              <WhatsAppCta className="mt-5 w-full" />
            ) : (
              <a className="btn-primary btn-big btn-arrow mt-5 w-full" href="/chat">
                {t('home.price.cta')} <span className="arrow">→</span>
              </a>
            )}
            <a className="btn-quiet mt-2 w-full" href={lang === 'hi' ? '/sample-report-hi.pdf' : '/sample-report.pdf'} target="_blank" rel="noopener">
              {t('home.price.sample')}
            </a>
            {WHATSAPP_ENABLED && !wa && (
              <a className="btn-quiet mt-2 w-full" href={waLink('Hi')}>WhatsApp</a>
            )}
            <p className="mt-3 text-2xs text-muted">{t('home.price.final')}</p>
            {/* RENEW AND REPLACE (user, 2026-10-20: "update marketing site that we give renewal &
                replace"): what a buyer can do later, at the prices set in admin. */}
            <div className="mt-4 border-t border-line pt-4" data-test="price-after">
              <div className="text-2xs font-semibold uppercase tracking-wider text-muted">{t('home.price.after')}</div>
              <div className="mt-2 space-y-2.5 text-sm">
                <div className="flex gap-2.5">
                  <span aria-hidden="true">🔄</span>
                  <div><b className="text-ink">{t('home.price.renew.t')} · {renew}</b>
                    <div className="text-2xs text-muted">{t('home.price.renew.b', { renew, days })}</div></div>
                </div>
                {replacePrice && (
                  <div className="flex gap-2.5">
                    <span aria-hidden="true">🔁</span>
                    <div><b className="text-ink">{t('home.price.replace.t')} · {replacePrice}</b>
                      <div className="text-2xs text-muted">{t('home.price.replace.b', { replace: replacePrice,
                        window: replaceDays > 0 ? t('home.price.replace.window', { n: replaceDays }) : t('home.price.replace.any') })}</div></div>
                  </div>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </section>
      )}

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
        {wa ? (
          <WhatsAppCta big={false} className="w-full" />
        ) : (
          <form onSubmit={go} className="flex gap-2">
            <input className="input !py-2.5 flex-1" placeholder={t('home.sticky.placeholder')} value={reg}
              onChange={(e) => setReg(e.target.value)} aria-label={t('home.sticky.placeholder')} />
            <button className="btn-primary !px-5">{t('home.sticky.cta')}</button>
            {/* WhatsApp beside it, icon only on the phone's bottom bar (2026-10-25); hidden with the switch. */}
            {tryWa && <TryWa iconOnly test="sticky-try-wa" />}
          </form>
        )}
      </div>
      <div className="h-20 sm:hidden" />

      {/* ------------------------------------------ QuizPe, same makers */}
      {QUIZPE_ENABLED && <SisterQuizpe />}

      {/* -------------------------------------------------------------- faq */}
      <section id="faq" className="border-t border-line bg-shell/60">
        <div className="wrap py-14">
          <Reveal><h2 className="text-2xl font-bold text-ink">{t('home.faq.h')}</h2></Reveal>
          <div className="mt-6 space-y-3 stagger">
            {['vahan', 'owner', 'source', 'cover', 'rc', 'app', 'current', 'notfound', 'again'].map((k) => (
              <Faq key={k} q={t(`home.faq.${k}.q`)}>{t(`home.faq.${k}.a${wa && k === 'app' ? '.wa' : ''}`)}</Faq>
            ))}
          </div>

          <Reveal className="mt-8 text-center">
            <h3 className="text-xl font-bold text-ink">{t('home.final.h')}</h3>
            <p className="mt-1.5 text-body">{t('home.final.sub')}</p>
            {wa ? (
              <WhatsAppCta className="mt-4" />
            ) : (
              <CheckPair tryWa={tryWa} test="final-try-wa" className="mx-auto mt-4 sm:max-w-xl"
                check={<a className={CHECK_BTN} href="/chat">{t('common.checkVehicle')} <span className="arrow">→</span></a>} />
            )}
          </Reveal>
        </div>
      </section>
    </Layout>
  );
}

/* ------------------------------------------------------------ the pieces */

/*
 * GAADIPE SO FAR (user, 2026-09-30): real totals from the server. A figure the
 * server does not send — too small yet, or the section switched off — is simply
 * not shown; nothing here is typed in by hand.
 */
const STATS = [
  ['customers', '👥'], ['vehicles', '🚗'], ['checks', '🔍'], ['records_fetched', '🏛️'],
  ['reports_bought', '📄'], ['watching', '🔔'], ['expired_found', '⚠️'], ['challans_found', '🧾'], ['states', '🗺️'],
];

function SoFar() {
  const { t } = useLang();
  const [s, setS] = useState(null);
  const ref = useRef(null);
  useEffect(() => { api.stats().then((r) => setS(r?.stats || null)).catch(() => {}); }, []);
  // The numbers roll when the visitor reaches them (user, 2026-09-30), once —
  // not on load, when they may still be below the fold and the roll is missed.
  const seen = useSeen(ref, Boolean(s));
  const shown = s ? STATS.filter(([k]) => s[k] != null) : [];
  // Every 100 customers, celebrated on each landing (user, 2026-10-16; components/Milestone.jsx).
  const party = <Milestone value={s?.milestone || null} exact={s?.customers || null} />;
  if (!shown.length) return party;
  return (
    <section ref={ref} className="border-b border-line bg-shell/60">
      {party}
      <div className="wrap py-12">
        <Reveal>
          <h2 className="text-2xl font-bold text-ink">{t('home.stats.h')}</h2>
          <p className="mt-1.5 text-sm text-body">{t('home.stats.sub')}</p>
        </Reveal>
        <div className="mt-6 grid grid-cols-2 gap-3 stagger sm:grid-cols-3 lg:grid-cols-4">
          {shown.map(([k, icon], i) => <Stat key={k} icon={icon} value={s[k]} label={t(`home.stats.${k}`)} go={seen} delay={i * 90} />)}
        </div>
      </div>
    </section>
  );
}

function Stat({ icon, value, label, go, delay }) {
  return (
    <div className="card lift p-4 sm:p-5">
      <div className="text-xl" aria-hidden="true">{icon}</div>
      <div className="mt-1 text-2xl font-extrabold text-brand-deep sm:text-3xl">
        <Odometer value={value} go={go} delay={delay} />
      </div>
      <div className="mt-0.5 text-sm leading-snug text-body">{label}</div>
    </div>
  );
}

/*
 * THE PETROL-PUMP READING (user, 2026-09-30), the same as the admin panel's:
 * each digit is a mechanical drum of 0–9 that only turns forward. The units
 * drum whirls three extra turns, the tens two, the hundreds one — and all of
 * them stop together, the way a 1980s fuel pump settles on the amount. The
 * top and bottom of each window fade, like a drum turning out of sight. With
 * reduced motion asked for, the number is simply there.
 */
const DRUM_H = 1.15; // em
const DRUM = Array.from({ length: 50 }, (_, i) => i % 10);
function Odometer({ value, go, delay = 0, ms = 1500 }) {
  const text = Number(value).toLocaleString('en-IN');
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return <span className="tabular">{text}</span>;
  const chars = [...text];
  const digits = chars.filter((c) => /\d/.test(c)).length;
  let seenDigits = 0;
  const mask = 'linear-gradient(transparent, #000 22%, #000 78%, transparent)';
  return (
    <span className="tabular inline-flex overflow-hidden align-bottom" style={{ height: `${DRUM_H}em`, lineHeight: `${DRUM_H}em` }}
      aria-label={text} role="text">
      {chars.map((c, i) => {
        if (!/\d/.test(c)) return <span key={i} aria-hidden="true">{c}</span>;
        const place = digits - seenDigits++; // 1 = units
        const extra = Math.max(0, 4 - place); // units 3, tens 2, hundreds 1
        const target = go ? 10 * extra + Number(c) : 0;
        return (
          <span key={i} aria-hidden="true" className="relative inline-block overflow-hidden"
            style={{ height: `${DRUM_H}em`, WebkitMaskImage: mask, maskImage: mask }}>
            <span className="block"
              style={{
                transform: `translateY(-${target * DRUM_H}em)`,
                transition: go ? `transform ${ms}ms cubic-bezier(.3,.1,.2,1) ${delay}ms` : 'none',
              }}>
              {DRUM.map((d, k) => <span key={k} className="block text-center" style={{ height: `${DRUM_H}em`, lineHeight: `${DRUM_H}em` }}>{d}</span>)}
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** True once the element has come into view (a third of it), and stays true. */
function useSeen(ref, ready = true) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!ready || !el || seen) return undefined;
    if (!('IntersectionObserver' in window)) { setSeen(true); return undefined; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, ready, seen]);
  return seen;
}

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

/*
 * "CHECK IN WHATSAPP" BESIDE EVERY CHECK BUTTON (user, 2026-10-23 and 2026-10-25: two buttons — "check vehicle" and
 * "check in WhatsApp", the second hidden if Meta disables WhatsApp). GaadiPe's WhatsApp number (VITE_WHATSAPP_TRY)
 * with "Hi" typed; shown only while the server's switch says so (site_whatsapp_try — the failsafe turns it off).
 */
const WA_ICON = <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="#25d366" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6-.3.4c-.1.1-.3.3-.1.6.2.3.7 1.2 1.6 2 1.1.9 2 1.2 2.3 1.4.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.2z" /></svg>;
function TryWa({ className = '', style, iconOnly = false, test }) {
  const { lang } = useLang();
  if (!WHATSAPP_TRY) return null;
  const href = `https://wa.me/${WHATSAPP_TRY}?text=${encodeURIComponent('Hi')}`;
  const label = lang === 'hi' ? 'WhatsApp पर जाँचें' : 'Check in WhatsApp';
  if (iconOnly) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" data-test={test} aria-label={label}
        className="grid shrink-0 place-items-center rounded-xl border-2 border-[#25d366] bg-white px-3">{WA_ICON}</a>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" data-test={test} style={style}
      className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#25d366] bg-white px-5 py-3 text-[15px] font-bold text-[#128c4a] transition hover:bg-[#f0fdf4] sm:w-auto ${className}`}>
      {WA_ICON}{label}
    </a>
  );
}

/* "Check a vehicle" and "Check in WhatsApp" as two equal buttons, side by side even on a phone (user, 2026-10-25:
   "let the user choose whatever they want"). Without WhatsApp (the switch off), the check button takes the row. */
const CHECK_BTN = 'btn-primary btn-arrow w-full justify-center whitespace-nowrap !px-2 !py-3 text-[12.5px] min-[380px]:text-[13.5px] sm:text-base';
function CheckPair({ check, tryWa, test, className = '' }) {
  const both = tryWa && WHATSAPP_TRY;
  return (
    <div className={`grid gap-2 ${both ? 'grid-cols-2' : 'grid-cols-1'} ${className}`}>
      {check}
      {both ? <TryWa test={test} className="!w-full !gap-1 whitespace-nowrap !px-1.5 !py-3 !text-[12.5px] min-[380px]:!gap-1.5 min-[380px]:!text-[13.5px] sm:!text-base" /> : null}
    </div>
  );
}

/*
 * ₹11 ONCE OR ₹19 WITH ALERTS, SIDE BY SIDE (user, 2026-10-25: "a grid table for 11 & 19, it is confusing").
 * One row per thing bought, a tick or a cross under each price — readable on a phone (two narrow price
 * columns, the feature text wraps). The prices come from /pricing like every price on this page.
 */
function PriceTable({ lang, once, full, renew, days, validDays, wa, tryWa, replacePrice, replaceDays, t, pack = null }) {
  const hi = lang === 'hi';
  /* CHECK PACKS (user, 2026-10-26; /pricing check_pack): the first check free, then a pack - said under the
     table, and the report's "extra checks" row names how long they last. */
  const packRupees = pack ? `₹${Math.round(pack.price_paise / 100)}` : null;
  const packLine = !pack ? null : hi
    ? `🔢 आपकी पहली जाँच मुफ़्त है। और गाड़ियाँ जाँचनी हैं? ${pack.checks} जाँच ${packRupees} में (GST सहित), ${pack.days} दिन तक — और हर रिपोर्ट के साथ ${pack.per_report} जाँच मुफ़्त। पहले जाँची हुई गाड़ी दोबारा कभी भी मुफ़्त — सिर्फ़ नई गाड़ी पर जाँच लगती है।`
    : `🔢 Your first check is free. Want to check more vehicles? ${pack.checks} checks for ${packRupees} (GST included), valid ${pack.days} days — and every report adds ${pack.per_report} more. Vehicles you already checked are free to check again, any time — only a new vehicle uses a check.`;
  const W = hi ? {
    h: 'दो आसान दाम, कोई भी गाड़ी', sub: 'कार, बाइक, स्कूटर, ऑटो, ट्रक या बस — दाम वही। पहले मुफ़्त बेसिक जाँच, फिर चुनें। कोई सब्सक्रिप्शन नहीं, कुछ भी अपने आप चार्ज नहीं।',
    what: 'आपको क्या मिलता है', once: 'पूरी रिपोर्ट', onceSub: 'एक बार', full: 'रिपोर्ट + अलर्ट', fullSub: `${days} दिन`, best: 'सबसे फ़ायदेमंद',
    rows: [
      'गाड़ी की पूरी जानकारी — हर वैधता तारीख़ (इंश्योरेंस, PUC, टैक्स, फिटनेस, परमिट)',
      'लोन / हाइपोथिकेशन, ब्लैकलिस्ट और NOC',
      'हर चालान — अपराध, जगह और रकम',
      'मालिकों की संख्या, बीमा कंपनी और पॉलिसी, FASTag',
      `PDF रिपोर्ट + GST इनवॉइस (${validDays} दिन तक दोबारा डाउनलोड)`,
      pack ? `${pack.per_report} और गाड़ी जाँच (${pack.days} दिन तक)` : 'उस महीने 5 और मुफ़्त जाँच',
      `${days} दिन तक नए चालान का अलर्ट`,
      'इंश्योरेंस, PUC, टैक्स, फिटनेस, परमिट खत्म होने से पहले चेतावनी',
      `बाद में ${renew} में अलर्ट रिन्यू करें`,
    ],
    forOnce: 'गाड़ी खरीदने से पहले — एक बार जाँच', forFull: 'अपनी गाड़ी — हमेशा अपडेट', bestFor: 'किसके लिए',
    incl: 'दोनों दाम GST सहित — जो दिखता है, वही आप देते हैं।',
  } : {
    h: 'Two simple prices, any vehicle', sub: 'Car, bike, scooter, auto, truck or bus — the price does not change. Free basic check first, then choose. No subscription, nothing charged automatically.',
    what: 'What you get', once: 'Full report', onceSub: 'one time', full: 'Report + alerts', fullSub: `${days} days`, best: 'Best value',
    rows: [
      'Full vehicle details — every validity date (insurance, PUC, road tax, fitness, permit)',
      'Loan / hypothecation, blacklist and NOC',
      'Every challan — offence, place and amount',
      'Number of owners, insurer and policy, FASTag',
      `PDF report + GST invoice (download again for ${validDays} days)`,
      pack ? `${pack.per_report} extra vehicle checks (valid ${pack.days} days)` : '5 extra free checks that month',
      `New-challan alerts for ${days} days`,
      'Warning before insurance, PUC, road tax, fitness or permit expires',
      `Renew the alerts later for ${renew}`,
    ],
    forOnce: 'Buying a used vehicle — check it once', forFull: 'Your own vehicle — stay on top of it', bestFor: 'Best for',
    incl: 'Both prices include GST — the amount shown is the amount you pay.',
  };
  const both = 6;                     // the first six rows come with both
  const mark = (yes) => (yes
    ? <span className="text-lg font-bold text-good-700" aria-label="yes">✓</span>
    : <span className="text-lg font-bold text-black/25" aria-label="no">✕</span>);
  return (
    <section id="price" className="wrap py-14" data-test="price-table">
      <Reveal>
        <h2 className="text-2xl font-bold text-ink">{W.h}</h2>
        <p className="mt-3 max-w-2xl text-body">{W.sub}</p>
      </Reveal>
      <Reveal delay={80} className="card mt-6 overflow-hidden p-0">
        <table className="w-full table-fixed border-collapse text-sm">
          <colgroup><col /><col className="w-[86px] sm:w-[150px]" /><col className="w-[96px] sm:w-[170px]" /></colgroup>
          <thead>
            <tr className="border-b border-line align-bottom">
              <th className="p-3 text-left text-2xs font-semibold uppercase tracking-wider text-muted sm:p-4">{W.what}</th>
              <th className="p-2 text-center sm:p-4">
                <div className="text-2xs font-semibold text-muted sm:text-xs">{W.once}</div>
                <div className="text-2xl font-extrabold tabular text-ink sm:text-3xl">{once}</div>
                <div className="text-2xs text-muted">{W.onceSub}</div>
              </th>
              <th className="relative bg-brand/5 p-2 text-center sm:p-4">
                <span className="mb-1 inline-block whitespace-nowrap rounded-full bg-[#ffd84d] px-1.5 py-0.5 text-[9.5px] font-black text-[#0a4f49] sm:px-2 sm:text-[10px]">⭐ {W.best}</span>
                <div className="text-2xs font-semibold text-muted sm:text-xs">{W.full}</div>
                <div className="text-2xl font-extrabold tabular text-brand-deep sm:text-3xl">{full}</div>
                <div className="text-2xs text-muted">{W.fullSub}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {W.rows.map((r, i) => (
              <tr key={i} className="border-b border-line/70">
                <td className="p-3 leading-snug text-body sm:px-4">{r}</td>
                <td className="p-2 text-center">{mark(i < both)}</td>
                <td className="bg-brand/5 p-2 text-center">{mark(true)}</td>
              </tr>
            ))}
            <tr>
              <td className="p-3 text-2xs font-semibold uppercase tracking-wider text-muted sm:px-4">{W.bestFor}</td>
              <td className="p-2 text-center text-2xs font-semibold leading-snug text-ink">{W.forOnce}</td>
              <td className="bg-brand/5 p-2 text-center text-2xs font-semibold leading-snug text-brand-deep">{W.forFull}</td>
            </tr>
          </tbody>
        </table>
      </Reveal>
      <p className="mt-3 text-2xs text-muted">{W.incl}</p>
      {packLine ? <p className="mt-2 max-w-2xl rounded-xl bg-brand/5 px-3 py-2 text-sm text-ink" data-test="price-pack">{packLine}</p> : null}
      <div className="mt-5 grid gap-2 sm:max-w-xl">
        {wa ? <WhatsAppCta className="w-full sm:w-auto" /> : (
          <CheckPair tryWa={tryWa} test="price-try-wa"
            check={<a className={CHECK_BTN} href="/chat">{t('common.checkVehicle')} <span className="arrow">→</span></a>} />
        )}
        <a className="btn-quiet w-full" href={hi ? '/sample-report-hi.pdf' : '/sample-report.pdf'} target="_blank" rel="noopener">
          {t('home.price.sample')}
        </a>
      </div>
      {replacePrice && (
        <p className="mt-4 text-2xs text-muted" data-test="price-after">
          🔁 {t('home.price.replace.t')} · {replacePrice} — {t('home.price.replace.b', { replace: replacePrice,
            window: replaceDays > 0 ? t('home.price.replace.window', { n: replaceDays }) : t('home.price.replace.any') })}
        </p>
      )}
    </section>
  );
}

const Faq = ({ q, children }) => (
  <details className="card group px-5 py-4">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ink marker:hidden">
      {q}
      <span className="text-muted transition-transform duration-300 group-open:rotate-180">▾</span>
    </summary>
    <p className="anim-open mt-2 text-sm leading-relaxed text-body">{children}</p>
  </details>
);
