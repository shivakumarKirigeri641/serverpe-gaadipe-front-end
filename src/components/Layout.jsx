import { Link, NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useSession } from '../lib/session';
import { api, waLink, WHATSAPP_ENABLED, QUIZPE_ENABLED, WEB_LOGIN } from '../lib/api';
import { useLang } from '../lib/i18n.jsx';

/**
 * The frame the site sits in.
 *
 * The header says the same thing to everyone except in one place: a stranger is
 * offered "Sign in", a customer their own vehicles. Everything else — what the
 * product is, what it costs, what is never shown — is the same for both,
 * because a site that hides its terms behind a login is not trusted with money.
 *
 * THE LANGUAGE FOLLOWS THE PERSON. Switching it here, while signed in, also
 * saves it to the account, so the WhatsApp alerts about their vehicles arrive
 * in the language they chose to read the site in.
 */
export default function Layout({ children, wide = false }) {
  const { me, setMe, signOut } = useSession();
  const { t, lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const inApp = pathname.startsWith('/app');
  // The notice from the admin panel (2026-10-07: WhatsApp unavailable). Read
  // once per visit; a failure simply shows nothing.
  const [notice, setNotice] = useState(null);
  useEffect(() => { api.notice().then((n) => setNotice(n?.on ? n : null)).catch(() => {}); }, []);
  const noticeText = notice && ((lang === 'hi' && notice.hi) || notice.en);

  useEffect(() => {
    if (!me || me.language === lang) return;
    api.saveMe({ language: lang }).then((out) => setMe?.(out.user)).catch(() => {});
  }, [me, lang, setMe]);

  const appLinks = [
    ['/app', t('common.myVehicles')], ['/app/check', t('common.checkVehicle')],
    ['/app/reports', t('nav.reports')], ['/app/invoices', t('nav.invoices')],
    // Refer & earn is hidden while referral rewards are off (2026-10-08).
    ['/app/profile', t('nav.profile')],
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#f4faf8]">
      {noticeText && (notice.tone === 'good' ? (
        // Good news (2026-10-09: WhatsApp is back) — green, with the way in.
        <div role="status" className="border-b border-good-500/25 bg-good-50 px-4 py-2.5 text-center text-sm font-medium text-good-700">
          ✅ {noticeText}
          {WHATSAPP_ENABLED && (
            <a href={waLink('Hi')} target="_blank" rel="noopener noreferrer"
              className="ml-2 inline-block rounded-full bg-good-500 px-3 py-0.5 text-xs font-semibold text-white hover:bg-good-700">
              {lang === 'hi' ? 'WhatsApp खोलें' : 'Open WhatsApp'}
            </a>
          )}
        </div>
      ) : (
        <div role="status" className="border-b border-watch-500/25 bg-watch-50 px-4 py-2.5 text-center text-sm font-medium text-watch-700">
          ⚠️ {noticeText}
        </div>
      ))}
      <header className="sticky top-0 z-30 border-b border-line/80 bg-white/90 shadow-[0_8px_24px_rgba(11,31,28,.04)] backdrop-blur-xl" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="wrap flex min-h-16 items-center justify-between gap-3 py-2 sm:gap-4">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-deep text-sm font-bold text-white shadow-md">GP</span>
            <span className="leading-tight">
              <span className="block text-base font-semibold text-ink">GaadiPe</span>
              <span className="block text-2xs text-muted">{lang === 'hi' ? 'हर गाड़ी की कुंडली।' : 'Har gaadi ki kundli.'}</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {inApp ? appLinks.map(([to, label]) => <Tab key={to} to={to}>{label}</Tab>) : (
              <>
                <a href="/#report" className="text-sm text-body hover:text-ink">{t('nav.whatYouGet')}</a>
                <a href="/#price" className="text-sm text-body hover:text-ink">{t('nav.price')}</a>
                <a href="/#faq" className="text-sm text-body hover:text-ink">{t('nav.faq')}</a>
              </>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {/* The switch shows the OTHER language, in that language — the one
                word a reader of it will recognise. */}
            <button className="btn-quiet !px-2.5 !py-2 text-2xs" onClick={() => setLang(lang === 'hi' ? 'en' : 'hi')}
              aria-label="Change language / भाषा बदलें">
              {lang === 'hi' ? 'English' : 'हिंदी'}
            </button>
            {!WEB_LOGIN ? (
              <a className="btn-primary !py-2" href={waLink('Hi')} rel="noopener">{t('wa.short')}</a>
            ) : me ? (
              <>
                {!inApp && <Link className="btn-quiet !py-2" to="/chat">{t('common.myVehicles')}</Link>}
                {inApp && <button className="btn-quiet !py-2 hidden sm:inline-flex" onClick={signOut}>{t('common.signOut')}</button>}
              </>
            ) : (
              /* "Check vehicle", not "Sign in" (user, 2026-10-08): the free check
                 needs no sign-in, and it is what a visitor came for. */
              <Link className="btn-primary !py-2" to="/chat">{t('common.checkVehicle')}</Link>
            )}
            <button className="btn-quiet !px-2.5 !py-2 md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">☰</button>
          </div>
        </div>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-ink/35 backdrop-blur-[2px]" />
          <div className="gp-sheet absolute inset-x-0 bottom-0 rounded-t-3xl bg-white px-4 pb-8 pt-3 shadow-2xl" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-black/15" aria-hidden="true" />
            <div className="flex flex-col">
            {(inApp ? appLinks
              : [['/#price', t('nav.price')],
                 WEB_LOGIN ? ['/chat', me ? t('common.myVehicles') : t('common.checkVehicle')] : [waLink('Hi'), t('wa.short')],
                 ['/help', t('footer.help')], ['/feedback?src=menu', lang === 'hi' ? '⭐ फ़ीडबैक' : '⭐ Feedback'],
                 ['/terms', t('nav.terms')], ['/privacy', t('nav.privacy')], ['/refund', t('nav.refunds')]]
            ).map(([to, label]) => (
              to.startsWith('/#') || to.startsWith('https:')
                ? <a key={to} href={to} className="gp-menu-row rounded-xl px-3 text-[15px] font-semibold text-ink" onClick={() => setOpen(false)}>{label}</a>
                : <Link key={to} to={to} className="gp-menu-row rounded-xl px-3 text-[15px] font-semibold text-ink" onClick={() => setOpen(false)}>{label}</Link>
            ))}
            {me && WEB_LOGIN && <button className="gp-menu-row rounded-xl px-3 text-left text-[15px] font-semibold text-ink" onClick={signOut}>{t('common.signOut')}</button>}
            </div>
          </div>
        </div>
      )}

      {/* Keyed on the path so React replays the animation on every navigation. */}
      <main key={pathname} className={`page-in flex-1 ${wide ? '' : 'wrap py-6 sm:py-8 lg:py-10'}`}>{children}</main>

      <footer className="border-t border-line bg-white/80 backdrop-blur">
        <div className="wrap grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-sm font-semibold text-ink">GaadiPe</div>
            <p className="mt-2 text-2xs text-muted">{t('footer.about')}</p>
          </div>
          <div>
            <div className="text-2xs font-semibold uppercase tracking-wider text-muted">{t('footer.product')}</div>
            <ul className="mt-2 space-y-1.5 text-sm">
              {WEB_LOGIN
                ? <li><Link className="text-body hover:text-ink" to="/chat">{t('common.checkVehicle')}</Link></li>
                : <li><a className="text-body hover:text-ink" href={waLink('Hi')}>{t('common.checkVehicle')}</a></li>}
              {WHATSAPP_ENABLED && <li><a className="text-body hover:text-ink" href={waLink('Hi')}>GaadiPe on WhatsApp</a></li>}
              {WEB_LOGIN && !me && <li><Link className="text-body hover:text-ink" to="/chat?signin=1">{t('common.signIn')}</Link></li>}
              {QUIZPE_ENABLED && <li><a className="text-body hover:text-ink" href="https://quizpe.in/?utm_source=gaadipe&utm_medium=footer" target="_blank" rel="noopener noreferrer">{t('footer.quizpe')}</a></li>}
            </ul>
          </div>
          <div>
            <div className="text-2xs font-semibold uppercase tracking-wider text-muted">{t('footer.legal')}</div>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li><Link className="text-body hover:text-ink" to="/terms">{t('footer.terms')}</Link></li>
              <li><Link className="text-body hover:text-ink" to="/privacy">{t('footer.privacy')}</Link></li>
              <li><Link className="text-body hover:text-ink" to="/refund">{t('footer.refund')}</Link></li>
              <li><Link className="text-body hover:text-ink" to="/data-deletion">{t('footer.deletion')}</Link></li>
              <li><Link className="text-body hover:text-ink" to="/policy/email">{t('footer.email')}</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-2xs font-semibold uppercase tracking-wider text-muted">{t('footer.support')}</div>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li><Link className="text-body hover:text-ink" to="/help">{t('footer.help')}</Link></li>
              <li><Link className="text-body hover:text-ink" to="/feedback?src=footer">{lang === 'hi' ? '⭐ फ़ीडबैक दें' : '⭐ Give feedback'}</Link></li>
              <li><a className="text-body hover:text-ink" href="mailto:support@gaadipe.in">support@gaadipe.in</a></li>
              {WHATSAPP_ENABLED && (
                <li><a className="text-body hover:text-ink" href={waLink('I need help with')}>WhatsApp</a></li>
              )}
            </ul>
          </div>
        </div>
        <div className="border-t border-line py-4">
          <p className="wrap text-2xs text-muted">{t('footer.disclaimer')}</p>
        </div>
      </footer>
    </div>
  );
}

const Tab = ({ to, children }) => (
  <NavLink to={to} end={to === '/app'}
    className={({ isActive }) => `text-sm ${isActive ? 'font-semibold text-brand-deep' : 'text-body hover:text-ink'}`}>
    {children}
  </NavLink>
);
