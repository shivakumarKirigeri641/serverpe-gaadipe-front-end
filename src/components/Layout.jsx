import { Link, NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useSession } from '../lib/session';
import { waLink, WHATSAPP_ENABLED } from '../lib/api';

/**
 * The frame the site sits in.
 *
 * The header says the same thing to everyone except in one place: a stranger is
 * offered "Sign in", a customer their own vehicles. Everything else — what the
 * product is, what it costs, what is never shown — is the same for both,
 * because a site that hides its terms behind a login is not trusted with money.
 */
export default function Layout({ children, wide = false }) {
  const { me, signOut } = useSession();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const inApp = pathname.startsWith('/app');

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="wrap flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-sm font-bold text-white">GP</span>
            <span className="leading-tight">
              <span className="block text-base font-semibold text-ink">GaadiPe</span>
              <span className="block text-2xs text-muted">Har gaadi ki kundli.</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {inApp ? (
              <>
                <Tab to="/app">My vehicles</Tab>
                <Tab to="/app/check">Check a vehicle</Tab>
                <Tab to="/app/reports">Reports</Tab>
                <Tab to="/app/invoices">Invoices</Tab>
                <Tab to="/app/profile">Profile</Tab>
              </>
            ) : (
              <>
                <a href="/#report" className="text-sm text-body hover:text-ink">What you get</a>
                <a href="/#price" className="text-sm text-body hover:text-ink">What it costs</a>
                <a href="/#faq" className="text-sm text-body hover:text-ink">Questions</a>
              </>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {me ? (
              <>
                {!inApp && <Link className="btn-quiet !py-2" to="/app">My vehicles</Link>}
                {inApp && <button className="btn-quiet !py-2 hidden sm:inline-flex" onClick={signOut}>Sign out</button>}
              </>
            ) : (
              <Link className="btn-primary !py-2" to="/login">Sign in</Link>
            )}
            <button className="btn-quiet !px-2.5 !py-2 md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">☰</button>
          </div>
        </div>

        {open && (
          <div className="anim-open border-t border-line bg-white md:hidden">
            <div className="wrap flex flex-col py-2">
              {(inApp
                ? [['/app', 'My vehicles'], ['/app/check', 'Check a vehicle'], ['/app/reports', 'Reports'],
                   ['/app/invoices', 'Invoices'], ['/app/profile', 'Profile']]
                : [['/login', 'Sign in'], ['/terms', 'Terms'], ['/privacy', 'Privacy'], ['/refund', 'Refunds']]
              ).map(([to, label]) => (
                <Link key={to} to={to} className="py-2.5 text-sm text-body" onClick={() => setOpen(false)}>{label}</Link>
              ))}
              {me && <button className="py-2.5 text-left text-sm text-body" onClick={signOut}>Sign out</button>}
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
            <p className="mt-2 text-2xs text-muted">
              Government vehicle records{WHATSAPP_ENABLED ? ' on WhatsApp and on the web' : ' for any Indian vehicle'}.
              A product of ServerPe App Solutions, Karnataka. GSTIN 29BSMPK7696H1ZT.
            </p>
          </div>
          <div>
            <div className="text-2xs font-semibold uppercase tracking-wider text-muted">Product</div>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li><Link className="text-body hover:text-ink" to="/app/check">Check a vehicle</Link></li>
              {WHATSAPP_ENABLED && (
                <li><a className="text-body hover:text-ink" href={waLink('Hi')}>GaadiPe on WhatsApp</a></li>
              )}
              <li><Link className="text-body hover:text-ink" to="/login">Sign in</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-2xs font-semibold uppercase tracking-wider text-muted">Legal</div>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li><Link className="text-body hover:text-ink" to="/terms">Terms of service</Link></li>
              <li><Link className="text-body hover:text-ink" to="/privacy">Privacy policy</Link></li>
              <li><Link className="text-body hover:text-ink" to="/refund">Refund policy</Link></li>
              <li><Link className="text-body hover:text-ink" to="/data-deletion">Data deletion</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-2xs font-semibold uppercase tracking-wider text-muted">Support</div>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li><Link className="text-body hover:text-ink" to="/help">Help &amp; common questions</Link></li>
              <li><a className="text-body hover:text-ink" href="mailto:support@gaadipe.in">support@gaadipe.in</a></li>
              {WHATSAPP_ENABLED && (
                <li><a className="text-body hover:text-ink" href={waLink('I need help with')}>Message us on WhatsApp</a></li>
              )}
            </ul>
          </div>
        </div>
        <div className="border-t border-line py-4">
          <p className="wrap text-2xs text-muted">
            GaadiPe shows Government-sourced records as they are and does not create, alter or verify them.
            Where anything differs from your papers, the RTO record prevails.
          </p>
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
