import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { date, ago, plate, titleCase, human, humanHi, isCommercial, rupees } from '../lib/format';
import { useLang } from '../lib/i18n.jsx';
import Layout from '../components/Layout.jsx';
import DataSourceNote from '../components/DataSourceNote.jsx';
import { Spinner, Empty, Chip, Banner } from '../components/ui.jsx';
import BuyDialog from '../components/BuyDialog.jsx';

/**
 * My vehicles.
 *
 * The list is built from what GaadiPe already holds, so it costs nothing to
 * show. Unpaid vehicles carry only which documents have lapsed, by name — the
 * server sends no dates for them — and paid ones the date that matters most.
 */
export default function Dashboard() {
  const { t } = useLang();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [price, setPrice] = useState(null);

  const [freeReports, setFreeReports] = useState(0);
  // In referral-only mode there is no price to pay: the card offers "Unlock free".
  const [referOnly, setReferOnly] = useState(false);
  useEffect(() => {
    Promise.all([api.pricing(), api.referrals().catch(() => null)]).then(([p, r]) => {
      const reduced = r?.reduced_price_paise || null;
      setPrice(reduced ? Math.min(reduced, p.price_paise) : p.price_paise);
      // A reduced price is a referral reward: payable even in referral-only mode.
      setReferOnly(p.unlock === 'refer' && !reduced);
      setFreeReports(r?.available || 0);
    }).catch(() => {});
  }, []);

  const load = useCallback(() => {
    api.vehicles().then((d) => setRows(d.rows)).catch(setError);
  }, []);
  useEffect(load, [load]);

  return (
    <Layout>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">{t('dash.h')}</h1>
          <p className="mt-1 text-sm text-muted">{t('dash.sub')}</p>
        </div>
        <Link className="btn-primary" to="/app/check">{t('common.checkVehicle')}</Link>
      </div>
      <DataSourceNote compact className="mt-4" />
      {freeReports > 0 && <Banner tone="good" className="mt-4">🎁 {t('dash.freeBanner', { n: freeReports })}</Banner>}

      {error && <Banner tone="wrong" className="mt-5">{error.message}</Banner>}
      {!rows && !error && <Spinner label={t('common.loading')} />}

      {rows && !rows.length && (
        <div className="mt-6">
          <Empty action={<Link className="btn-primary" to="/app/check">{t('dash.emptyCta')}</Link>}>
            {t('dash.empty')}
          </Empty>
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="mt-6 grid gap-3 stagger sm:grid-cols-2">
          {rows.map((v) => <Row key={v.reg_no} v={v} price={price} referOnly={referOnly} />)}
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
function Row({ v, price, referOnly }) {
  const { t, lang, doc } = useLang();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const hasReport = Boolean(v.report_id);

  const docs = [
    ['Insurance', v.insurance_upto], ['PUC', v.pucc_upto], ['Fitness', v.fitness_upto],
    ['Road tax', v.tax_upto], ['Permit', v.permit_upto], ['Registration', v.reg_upto],
  ].filter(([, d]) => d).map(([label, d]) => {
    const days = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
    return { label, d, days };
  }).sort((a, b) => a.days - b.days);
  const worst = docs[0];

  // The card links to the vehicle; the button must not follow that link.
  const buy = (e) => { e.preventDefault(); e.stopPropagation(); setConfirming(true); };

  return (
    <Link to={`/app/vehicle/${v.reg_no}`} className="card lift block p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className={`board ${isCommercial(v.vehicle_class) ? 'board-commercial' : ''}`}>{plate(v.reg_no)}</span>
          <div className="mt-2 text-sm font-medium text-ink">
            {[titleCase(v.maker), titleCase(v.model)].filter(Boolean).join(' ') || '—'}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {hasReport && <Chip tone="brand">{t('dash.reportUntil', { date: date(v.report_until) })}</Chip>}
          {v.watched && <Chip tone="good">{t('dash.alertsOn')}</Chip>}
        </div>
      </div>

      {!hasReport && v.expired?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-2.5">
          {v.expired.map((label) => <Chip key={label} tone="wrong">{t('veh.expired', { label: doc(label) })}</Chip>)}
        </div>
      )}

      {hasReport && worst && (
        <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5">
          <span className="text-sm text-body">{doc(worst.label)}</span>
          <span className={`text-sm ${worst.days < 0 ? 'text-wrong-700' : worst.days <= 30 ? 'text-watch-700' : 'text-muted'}`}>
            {date(worst.d)} · {lang === 'hi' ? humanHi(worst.days) : human(worst.days)}
          </span>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-2xs text-muted">{t('dash.checked', { n: v.check_count, ago: ago(v.last_checked_at) })}</span>
        {!hasReport && referOnly && (
          <span className="btn-primary !px-3 !py-1.5 text-2xs">{t('dash.unlockFree')}</span>
        )}
        {!hasReport && price && !referOnly && (
          <button className="btn-primary !px-3 !py-1.5 text-2xs" onClick={buy}>
            {t('dash.payNow', { price: rupees(price) })}
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
