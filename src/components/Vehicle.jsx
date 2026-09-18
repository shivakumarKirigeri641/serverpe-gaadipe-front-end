import { useState } from 'react';
import { rupees, date, human, plate, titleCase, isCommercial } from '../lib/format';
import { Chip } from './ui.jsx';

/**
 * A vehicle, opening on a tap.
 *
 * WHAT IS SHOWN FREE AND WHAT IS NOT is decided by the server, which sends
 * either the basic shape or the full one. This component never holds a value it
 * is hiding: the locked rows below are placeholders, so "view source" reveals
 * nothing that was not paid for. Anything else is a paywall in appearance only.
 *
 * The summary line is the reason to open it: what needs attention, in words,
 * before anything is expanded.
 */
export default function Vehicle({ v, open: openProp, onBuy, buying, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = openProp === undefined ? open : openProp;
  const id = v.identity || {};

  /* Paid checks know the detail; free ones know only how much there is. */
  const found = v.found || {};
  const expiredList = v.paid
    ? (v.documents || []).filter(d => d.state === 'expired').map(d => d.label)
    : (found.expired || []);
  const dueList = v.paid
    ? (v.documents || []).filter(d => d.state === 'due').map(d => d.label)
    : (found.due_soon || []);
  const bad = expiredList.length;
  const due = dueList.length;
  const pending = (v.paid ? v.challans?.pending_count : found.challans_pending) || 0;

  /* Name what is wrong. "Insurance expired" is worth reading; "1 document
     expired" makes the reader open the card to find out which. */
  const summary = bad ? `${expiredList.slice(0, 2).join(', ')} expired${bad > 2 ? ` +${bad - 2}` : ''}`
    : due ? `${dueList.slice(0, 2).join(', ')} expiring soon`
    : pending ? `${pending} pending challan${pending === 1 ? '' : 's'}`
    : 'Nothing flagged';

  return (
    <div className="card overflow-hidden">
      <button className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left transition hover:bg-shell/60"
        onClick={() => setOpen(!isOpen)}>
        <div className="min-w-0">
          <span className={`board ${isCommercial(id.vehicle_class) ? 'board-commercial' : ''}`}>
            {plate(v.reg_no)}
          </span>
          <div className="mt-2 text-sm font-medium text-ink">
            {[titleCase(id.maker), titleCase(id.model)].filter(Boolean).join(' ') || 'Vehicle'}
          </div>
          <div className="mt-0.5 text-2xs text-muted">
            {[titleCase(id.fuel), titleCase(id.vehicle_class), id.manufactured].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Chip tone={bad ? 'wrong' : due || pending ? 'watch' : 'good'}>{summary}</Chip>
          <span className="flex items-center gap-1 text-2xs text-muted">
            {isOpen ? 'Hide details' : 'See details'}
            <span className={'transition-transform duration-300 ' + (isOpen ? 'rotate-180' : '')}>▾</span>
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="anim-open border-t border-line px-4 py-4">
          {!v.paid && (
            <>
              <Section title="The vehicle">
                <Grid rows={[
                  ['Manufacturer', titleCase(id.maker)],
                  ['Model & variant', titleCase(id.model)],
                  ['Fuel', titleCase(id.fuel)],
                  ['Class', titleCase(id.vehicle_class)],
                ]} />
                <p className="mt-2 text-2xs text-muted">
                  Enough to be sure this is the vehicle you are looking at.
                </p>
              </Section>

              <Section title="Status">
                <div className="flex flex-wrap gap-2">
                  {expiredList.map((label) => (
                    <Chip key={label} tone="wrong">{label} — expired</Chip>
                  ))}
                  {dueList.map((label) => (
                    <Chip key={label} tone="watch">{label} — expiring soon</Chip>
                  ))}
                  {pending > 0 && (
                    <Chip tone="watch">{pending} pending challan{pending === 1 ? '' : 's'}</Chip>
                  )}
                  {!bad && !due && !pending && (
                    <Chip tone="good">Nothing flagged on this vehicle</Chip>
                  )}
                </div>
                <p className="mt-2 text-2xs text-muted">
                  The dates, the amounts and the rest of the record are in the full report.
                </p>
              </Section>
            </>
          )}

          {v.paid && <Section title="Documents">
            <div className="divide-y divide-line/70">
              {(v.documents || []).length === 0 && (
                <p className="py-2 text-sm text-muted">No dates in the Government record.</p>
              )}
              {(v.documents || []).map((d) => (
                <div key={d.label} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-sm text-body">{d.label}</span>
                  <span className="text-right">
                    <span className="text-sm text-ink">{date(d.valid_until)}</span>
                    <span className={`ml-2 text-2xs ${
                      d.state === 'expired' ? 'text-wrong-700'
                        : d.state === 'due' ? 'text-watch-700' : 'text-muted'}`}>
                      {human(d.days)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </Section>}

          {v.paid && <Section title="The vehicle">
            <Grid rows={[
              ['Registered', date(id.reg_date)],
              ['RTO', titleCase(String(id.registered_at || '').replace(/\s+/g, ' ').trim())],
              ['RC status', titleCase(id.rc_status)],
              ['Owner number', id.owner_serial ? `${id.owner_serial}` : null],
              ['Colour', titleCase(id.colour)],
              ['Engine', id.cubic_capacity ? `${id.cubic_capacity} cc` : null],
              ['Seats', id.seats ? `${id.seats}` : null],
              ['Norms', id.norms],
            ]} />
          </Section>}

          {v.paid && <Section title="Challans">
            {pending > 0 ? (
              <p className="text-sm">
                <b className="text-wrong-700">{pending} pending</b>
                {v.challans.pending_amount_paise != null && (
                  <> · {rupees(v.challans.pending_amount_paise)} to pay</>
                )}
                {v.challans.disposed_count ? <> · {v.challans.disposed_count} already paid</> : null}
              </p>
            ) : (
              <p className="text-sm text-good-700">No pending challans.</p>
            )}

            {v.paid && v.challans?.pending?.length > 0 && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-line text-2xs uppercase tracking-wider text-muted">
                      <th className="py-2 text-left font-semibold">Date</th>
                      <th className="py-2 text-left font-semibold">Offence &amp; place</th>
                      <th className="py-2 text-right font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/70">
                    {v.challans.pending.slice(0, 30).map((c, i) => (
                      <tr key={c.challan_no || i}>
                        <td className="py-2 align-top text-2xs text-muted">{date(c.date)}</td>
                        <td className="py-2 align-top">
                          <div>{c.offence || '—'}</div>
                          <div className="text-2xs text-muted">
                            {[c.place, c.status !== 'Pending' ? c.status : null].filter(Boolean).join(' · ')}
                          </div>
                          <div className="font-mono text-2xs text-muted">{c.challan_no}</div>
                        </td>
                        <td className="py-2 text-right align-top tabular">{rupees(c.amount_paise)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {v.challans.pending.length > 30 && (
                  <p className="mt-2 text-2xs text-muted">
                    Showing 30 of {v.challans.pending.length}. The full list is in the PDF report.
                  </p>
                )}
              </div>
            )}
          </Section>}

          {v.paid && v.fastag && (
            <Section title="FASTag">
              <p className="text-sm">
                {v.fastag.active ? <span className="text-good-700">Active</span> : <span className="text-watch-700">Not active</span>}
                {v.fastag.balance != null && <> · balance ₹{v.fastag.balance}</>}
              </p>
            </Section>
          )}

          {v.paid ? (
            <>
              <Section title="Ownership &amp; finance">
                <Grid rows={[
                  ['Loan / hypothecation', v.ownership?.financer ? titleCase(v.ownership.financer) : 'No loan recorded'],
                  ['Blacklist', v.ownership?.blacklist_status || 'None recorded'],
                  ['NOC', v.ownership?.noc_details || 'None recorded'],
                  ['Owner type', titleCase(v.ownership?.owner_type)],
                ]} />
              </Section>
              <Section title="Policy &amp; certificate numbers">
                <Grid rows={[
                  ['Insurer', titleCase(v.references?.insurance_company)],
                  ['Policy number', v.references?.insurance_policy],
                  ['PUC number', v.references?.pucc_number],
                  ['Permit', [v.references?.permit_number, v.references?.permit_type].filter(Boolean).join(' · ')],
                ]} />
                <p className="mt-2 text-2xs text-muted">
                  Numbers are shown with only the last few characters, which is enough to quote when renewing.
                </p>
              </Section>
            </>
          ) : (
            <Locked v={v} onBuy={onBuy} buying={buying} />
          )}

          <p className="mt-4 text-2xs text-muted">
            From Government records (VAHAN, e-Challan, NETC FASTag) as at {date(v.checked_at)}.
            Owner name, chassis and engine numbers are never shown.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * What paying adds — named, and answered nowhere.
 *
 * NO VALUES, AND NO HINTS AT VALUES. An earlier version said "a financer is
 * recorded", which is the single fact the report is bought for: read it free
 * and there is nothing left to pay for. The list names what is inside and
 * stops there, and the server sends nothing more than these labels.
 */
function Locked({ v, onBuy, buying }) {
  const lines = Array.isArray(v.locked) ? v.locked : [];

  return (
    <div className="mt-4 rounded-lg border border-brand/25 bg-brand/5 p-4">
      <div className="text-sm font-semibold text-brand-deep">In the full report</div>
      <div className="mt-2 divide-y divide-brand/10">
        {lines.map((label) => (
          <div key={label} className="flex items-center justify-between gap-3 py-1.5">
            <span className="text-sm text-body">{label}</span>
            <span className="text-2xs text-brand-deep">🔒</span>
          </div>
        ))}
      </div>
      {onBuy && (
        <button className="btn-primary mt-4 w-full" onClick={onBuy} disabled={buying}>
          {buying ? 'Opening payment…' : 'Get the full report'}
        </button>
      )}
    </div>
  );
}

const Section = ({ title, children }) => (
  <div className="mb-4 last:mb-0">
    <h3 className="mb-1.5 text-2xs font-semibold uppercase tracking-wider text-muted">{title}</h3>
    {children}
  </div>
);

const Grid = ({ rows }) => (
  <div className="grid gap-x-6 sm:grid-cols-2">
    {rows.filter(([, v]) => v).map(([k, val]) => (
      <div key={k} className="flex justify-between gap-3 border-b border-line/70 py-1.5">
        <span className="text-2xs uppercase tracking-wider text-muted">{k}</span>
        <span className="text-right text-sm text-ink">{val}</span>
      </div>
    ))}
  </div>
);
