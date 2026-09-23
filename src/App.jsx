import { useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSession } from './lib/session';
import { api } from './lib/api';
import EmailPrompt from './components/EmailCard.jsx';
import ClickTracker from './components/ClickTracker.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Policy from './pages/Policy.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Check from './pages/Check.jsx';
import Documents from './pages/Documents.jsx';
import Profile from './pages/Profile.jsx';
import Support from './pages/Support.jsx';
import Refer from './pages/Refer.jsx';
import ReferLanding from './pages/ReferLanding.jsx';
import ReferralLanding from './pages/ReferralLanding.jsx';

/**
 * The public pages render for anybody. The account area waits until the panel
 * knows whether there is a session, then either shows it or sends the visitor
 * to sign in — carrying where they were going, so they arrive where they meant
 * to rather than on a dashboard.
 */
function Private({ children }) {
  const { me, ready } = useSession();
  const { pathname, search } = useLocation();
  if (!ready) return <div className="grid min-h-screen place-items-center text-sm text-muted">Loading…</div>;
  if (!me) return <Navigate to={`/login?next=${encodeURIComponent(pathname + search)}`} replace />;
  return children;
}

/*
 * GOOGLE ANALYTICS ON EVERY PAGE (user, 2026-09-18). The Google tag in
 * index.html counts the first page. This site changes pages without reloading,
 * so every later page is sent here — otherwise a whole visit looks like one
 * page. The first render is skipped: the tag has already counted it.
 */
function PageViews() {
  const { pathname, search } = useLocation();
  const first = useRef(true);
  const { me } = useSession();
  /* Also recorded for the Live screen (user, 2026-09-21): which page a
     signed-in customer is on. Re-sent when they sign in on the same page. */
  useEffect(() => {
    if (!me) return undefined;
    const t = setTimeout(() => api.track({ kind: 'page', page: pathname + search, title: document.title }), 0);
    return () => clearTimeout(t);
  }, [pathname, search, me ? me.mobile || true : null]);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (typeof window.gtag !== 'function') return;
    // After the new page has set its title.
    const t = setTimeout(() => window.gtag('event', 'page_view', {
      page_path: pathname + search,
      page_location: window.location.href,
      page_title: document.title,
    }), 0);
    return () => clearTimeout(t);
  }, [pathname, search]);
  return null;
}

export default function App() {
  return (
    <>
    <PageViews />
    <EmailPrompt />
    <ClickTracker />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/help" element={<Support />} />

      {/* The legal documents, all served from the one published source. */}
      <Route path="/terms" element={<Policy />} />
      <Route path="/privacy" element={<Policy />} />
      <Route path="/refund" element={<Policy />} />
      <Route path="/liability" element={<Policy />} />
      <Route path="/consent" element={<Policy />} />
      <Route path="/cancellation" element={<Policy />} />
      <Route path="/delivery" element={<Policy />} />
      <Route path="/data-deletion" element={<Policy />} />
      <Route path="/partner" element={<Policy />} />
      <Route path="/policy/:slug" element={<Policy />} />

      <Route path="/app" element={<Private><Dashboard /></Private>} />
      <Route path="/app/check" element={<Private><Check /></Private>} />
      <Route path="/app/vehicle/:regNo" element={<Private><Check /></Private>} />
      <Route path="/app/reports" element={<Private><Documents kind="reports" /></Private>} />
      <Route path="/app/invoices" element={<Private><Documents kind="invoices" /></Private>} />
      <Route path="/app/profile" element={<Private><Profile /></Private>} />
      <Route path="/app/refer" element={<Private><Refer /></Private>} />
      {/* A referral link: public, because whoever taps it is not a customer yet. */}
      <Route path="/r/:code" element={<ReferLanding />} />
      <Route path="/q/:code" element={<ReferralLanding />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
