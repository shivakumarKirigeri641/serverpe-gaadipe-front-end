import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSession } from './lib/session';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Policy from './pages/Policy.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Check from './pages/Check.jsx';
import Documents from './pages/Documents.jsx';
import Profile from './pages/Profile.jsx';
import Support from './pages/Support.jsx';

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

export default function App() {
  return (
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

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
