import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { date, ago, plate, titleCase, human, isCommercial, rupees } from '../lib/format';
import Layout from '../components/Layout.jsx';
import { Spinner, Empty, Chip, Banner } from '../components/ui.jsx';
import BuyDialog from '../components/BuyDialog.jsx';

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
  const [price, setPrice] = useState(null);

  useEffect(() => { api.pricing().then((p) => setPrice(p.price_paise)).catch(() => {}); }, []);

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
          {rows.map((v) => <Row key={v.reg_no} v={v} price={price} onError={setError} />)}
        </div>
      )}
    </Layout>
  );
}

/**
 * A vehicle, with the way to buy its report on the card itself.
 *
 * The card opens the vehicle; the button buys it. They are separate targets on
 * purpose — somebody who has already decided should not have to open a page to
 * find the button, and somebody browsing should not buy by tapping the card.
 */
function Row({ v, price, onError }) {
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);

  // The card links to the vehicle; the button must not follow that link.
  const buy = (e) => { e.preventDefault(); e.stopPropagation(); setConfirming(true); };

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

      {/* Unpaid: the server sends which documents lapsed, never when. */}
      {!hasReport && v.expired?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-2.5">
          {v.expired.map((label) => <Chip key={label} tone="wrong">{label} — expired</Chip>)}
        </div>
      )}

      {hasReport && worst && (
        <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5">
          <span className="text-sm text-body">{worst.label}</span>
          <span className={`text-sm ${worst.days < 0 ? 'text-wrong-700' : worst.days <= 30 ? 'text-watch-700' : 'text-muted'}`}>
            {date(worst.d)} · {human(worst.days)}
          </span>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-2xs text-muted">
          Checked {v.check_count} time{v.check_count === 1 ? '' : 's'} · last {ago(v.last_checked_at)}
        </span>
        {!hasReport && price && (
          <button className="btn-primary !px-3 !py-1.5 text-2xs" onClick={buy}>
            Pay now {rupees(price)}
          </button>
        )}
      </div>

      {confirming && (
        <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          <BuyDialog regNo={v.reg_no} pricePaise={price}
            onClose={() => setConfirming(false)}
            onAlreadyBought={() => navigate(`/app/vehicle/${v.reg_no}`)} />
        </span>
      )}
    </Link>
  );
}
