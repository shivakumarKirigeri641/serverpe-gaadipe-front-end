import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { date, ago, plate, titleCase, human, isCommercial } from '../lib/format';
import Layout from '../components/Layout.jsx';
import { Spinner, Empty, Chip, Banner } from '../components/ui.jsx';

/**
 * My vehicles.
 *
 * The list is built from what GaadiPe already holds, so it costs nothing to
 * show: every vehicle this person has ever checked, with the date that matters
 * most about each. Opening one fetches the vehicle itself — the whole record if
 * they have paid for it, the basics if not.
 */
export default function Dashboard() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    api.vehicles().then((d) => setRows(d.rows)).catch(setError);
  }, []);
  useEffect(load, [load]);

  return (
    <Layout>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">My vehicles</h1>
          <p className="mt-1 text-sm text-muted">Everything you have checked, and what needs attention.</p>
        </div>
        <Link className="btn-primary" to="/app/check">Check a vehicle</Link>
      </div>

      {error && <Banner tone="wrong" className="mt-5">{error.message}</Banner>}
      {!rows && !error && <Spinner />}

      {rows && !rows.length && (
        <div className="mt-6">
          <Empty action={<Link className="btn-primary" to="/app/check">Check your first vehicle</Link>}>
            No vehicles yet. Check any registration number to see its documents, challans and FASTag.
          </Empty>
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="mt-6 grid gap-3 stagger sm:grid-cols-2">
          {rows.map((v) => <Row key={v.reg_no} v={v} />)}
        </div>
      )}
    </Layout>
  );
}

function Row({ v }) {
  const docs = [
    ['Insurance', v.insurance_upto], ['PUC', v.pucc_upto], ['Fitness', v.fitness_upto],
    ['Road tax', v.tax_upto], ['Permit', v.permit_upto],
  ].filter(([, d]) => d).map(([label, d]) => {
    const days = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
    return { label, d, days };
  }).sort((a, b) => a.days - b.days);

  const worst = docs[0];
  const hasReport = Boolean(v.report_id);

  return (
    <Link to={`/app/vehicle/${v.reg_no}`} className="card lift block p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className={`board ${isCommercial(v.vehicle_class) ? 'board-commercial' : ''}`}>
            {plate(v.reg_no)}
          </span>
          <div className="mt-2 text-sm font-medium text-ink">
            {[titleCase(v.maker), titleCase(v.model)].filter(Boolean).join(' ') || 'Vehicle'}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {hasReport && <Chip tone="brand">Report until {date(v.report_until)}</Chip>}
          {v.watched && <Chip tone="good">Alerts on</Chip>}
        </div>
      </div>

      {worst && (
        <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5">
          <span className="text-sm text-body">{worst.label}</span>
          <span className={`text-sm ${worst.days < 0 ? 'text-wrong-700' : worst.days <= 30 ? 'text-watch-700' : 'text-muted'}`}>
            {date(worst.d)} · {human(worst.days)}
          </span>
        </div>
      )}

      <div className="mt-2 text-2xs text-muted">
        Checked {v.check_count} time{v.check_count === 1 ? '' : 's'} · last {ago(v.last_checked_at)}
      </div>
    </Link>
  );
}
