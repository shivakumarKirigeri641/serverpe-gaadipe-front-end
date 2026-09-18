import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { rupees, date, plate } from '../lib/format';
import Layout from '../components/Layout.jsx';
import { Spinner, Empty, Banner, Chip, saveBlob, openBlob } from '../components/ui.jsx';

/**
 * Reports and invoices — the same screen twice, because they differ in exactly
 * one rule and it is worth stating plainly on the page:
 *
 *   a REPORT can be downloaded again while it is valid; after that the vehicle
 *   is checked again, because a stale report is a wrong report
 *
 *   an INVOICE is the customer's own tax record and never expires. It stays
 *   available even after the account is deactivated.
 */
export default function Documents({ kind }) {
  const isReports = kind === 'reports';
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    setRows(null);
    (isReports ? api.reports() : api.invoices()).then((d) => setRows(d.rows)).catch(setError);
  }, [isReports]);

  const get = async (id, download) => {
    setBusy(id);
    try {
      const { blob, filename } = isReports
        ? await api.reportPdf(id, download) : await api.invoicePdf(id, download);
      download ? saveBlob(blob, filename) : openBlob(blob);
    } catch (e) { setError(e); } finally { setBusy(null); }
  };

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-ink">{isReports ? 'My reports' : 'My invoices'}</h1>
      <p className="mt-1 text-sm text-muted">
        {isReports
          ? 'Each report can be viewed or saved again while it is valid.'
          : 'Your GST invoices. These are kept for you and never expire.'}
      </p>

      {error && <Banner tone="wrong" className="mt-5">{error.message}</Banner>}
      {!rows && !error && <Spinner />}

      {rows && !rows.length && (
        <div className="mt-6">
          <Empty action={<Link className="btn-primary" to="/app/check">Check a vehicle</Link>}>
            {isReports
              ? 'No reports yet. Check a vehicle, and the full report is issued when you buy it.'
              : 'No invoices yet. An invoice is issued the moment a payment succeeds.'}
          </Empty>
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="mt-6 space-y-3 stagger">
          {rows.map((r) => (
            <div key={r.id} className="card lift flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="font-mono text-sm font-semibold text-ink">
                  {isReports ? r.report_number : r.invoice_number}
                </div>
                <div className="mt-1 text-2xs text-muted">
                  {isReports ? (
                    <>
                      <span className="plate">{plate(r.reg_no)}</span> · issued {date(r.created_at)}
                    </>
                  ) : (
                    <>
                      {date(r.invoice_date)}
                      {r.reg_no && <> · <span className="plate">{plate(r.reg_no)}</span></>}
                      {' · '}{rupees(r.base_paise, { decimals: true })} + GST{' '}
                      {rupees(r.total_paise - r.base_paise, { decimals: true })}
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isReports ? (
                  r.downloadable
                    ? <Chip tone="good">Until {date(r.valid_until)}</Chip>
                    : <Chip tone="info">Download period ended</Chip>
                ) : (
                  <span className="tabular text-base font-semibold text-ink">
                    {rupees(r.total_paise, { decimals: true })}
                  </span>
                )}
                <button className="btn-quiet !py-2" disabled={!r.downloadable || busy === r.id}
                  onClick={() => get(r.id, false)}>
                  {busy === r.id ? '…' : 'View'}
                </button>
                <button className="btn-quiet !py-2" disabled={!r.downloadable || busy === r.id}
                  onClick={() => get(r.id, true)}>Save</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isReports && rows?.some((r) => !r.downloadable) && (
        <p className="mt-4 text-2xs text-muted">
          A report shows the records as they were on the day it was issued. Once its download period ends,
          check the vehicle again for today's position.
        </p>
      )}
    </Layout>
  );
}
