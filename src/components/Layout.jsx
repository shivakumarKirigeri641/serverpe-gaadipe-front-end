import { Link, NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useSession } from '../lib/session';
import { api, waLink, WHATSAPP_ENABLED } from '../lib/api';
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

  useEffect(() => {
    if (!me || me.language === lang) return;
    api.saveMe({ language: lang }).then((out) => setMe?.(out.user)).catch(() => {});
  }, [me, lang, setMe]);

  const appLinks = [
    ['/app', t('common.myVehicles')], ['/app/check', t('common.checkVehicle')],
    ['/app/reports', t('nav.reports')], ['/app/invoices', t('nav.invoices')],
    ['/app/profile', t('nav.profile')],
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="wrap flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-sm font-bold text-white">GP</span>
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
            {me ? (
              <>
                {!inApp && <Link className="btn-quiet !py-2" to="/app">{t('common.myVehicles')}</Link>}
                {inApp && <button className="btn-quiet !py-2 hidden sm:inline-flex" onClick={signOut}>{t('common.signOut')}</button>}
              </>
            ) : (
              <Link className="btn-primary !py-2" to="/login">{t('common.signIn')}</Link>
            )}
            <button className="btn-quiet !px-2.5 !py-2 md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">☰</button>
          </div>
        </div>

        {open && (
          <div className="anim-open border-t border-line bg-white md:hidden">
            <div className="wrap flex flex-col py-2">
              {(inApp ? appLinks
                : [['/login', t('common.signIn')], ['/terms', t('nav.terms')], ['/privacy', t('nav.privacy')], ['/refund', t('nav.refunds')]]
              ).map(([to, label]) => (
                <Link key={to} to={to} className="py-2.5 text-sm text-body" onClick={() => setOpen(false)}>{label}</Link>
              ))}
              {me && <button className="py-2.5 text-left text-sm text-body" onClick={signOut}>{t('common.signOut')}</button>}
            </div>
          </div>
        )}
      </header>

      {/* Keyed on the path so React replays the animation on every navigation. */}
      <main key={pathname} className={`page-in flex-1 ${wide ? '' : 'wrap py-8'}`}>{children}</main>

      <footer className="border-t border-line bg-shell/60">
        <div className="wrap grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-sm font-semibold text-ink">GaadiPe</div>
            <p className="mt-2 text-2xs text-muted">{t('footer.about')}</p>
          </div>
          <div>
            <div className="text-2xs font-semibold uppercase tracking-wider text-muted">{t('footer.product')}</div>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li><Link className="text-body hover:text-ink" to="/app/check">{t('common.checkVehicle')}</Link></li>
              {WHATSAPP_ENABLED && <li><a className="text-body hover:text-ink" href={waLink('Hi')}>GaadiPe on WhatsApp</a></li>}
              <li><Link className="text-body hover:text-ink" to="/login">{t('common.signIn')}</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-2xs font-semibold uppercase tracking-wider text-muted">{t('footer.legal')}</div>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li><Link className="text-body hover:text-ink" to="/terms">{t('footer.terms')}</Link></li>
              <li><Link className="text-body hover:text-ink" to="/privacy">{t('footer.privacy')}</Link></li>
              <li><Link className="text-body hover:text-ink" to="/refund">{t('footer.refund')}</Link></li>
              <li><Link className="text-body hover:text-ink" to="/data-deletion">{t('footer.deletion')}</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-2xs font-semibold uppercase tracking-wider text-muted">{t('footer.support')}</div>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li><Link className="text-body hover:text-ink" to="/help">{t('footer.help')}</Link></li>
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
