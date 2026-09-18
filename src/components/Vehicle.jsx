import { useState } from 'react';
import { rupees, date, human, humanHi, plate, titleCase, isCommercial } from '../lib/format';
import { useLang } from '../lib/i18n.jsx';
import { Chip } from './ui.jsx';

/**
 * A vehicle, opening on a tap.
 *
 * WHAT IS SHOWN FREE AND WHAT IS NOT is decided by the server, which sends
 * either the basic shape or the full one. This component never holds a value it
 * is hiding: the locked rows are labels, so "view source" reveals nothing that
 * was not paid for.
 *
 * Values from the Government record (make, model, place, offence) stay as the
 * record has them; the words around them follow the reader's language.
 */
export default function Vehicle({ v, open: openProp, onBuy, buying, defaultOpen = false }) {
  const { t, lang, doc } = useLang();
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = openProp === undefined ? open : openProp;
  const id = v.identity || {};
  const say = (days) => (lang === 'hi' ? humanHi(days) : human(days));

  /* Paid checks know the detail; free ones know only which documents lapsed. */
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

  const names = (list) => `${list.slice(0, 2).map(doc).join(', ')}${list.length > 2 ? ` +${list.length - 2}` : ''}`;
  const summary = bad ? t('veh.expiredN', { list: names(expiredList) })
    : due ? t('veh.dueN', { list: names(dueList) })
    : pending ? t('veh.pendingN', { n: pending })
    : t('veh.nothing');

  return (
    <div className="card overflow-hidden">
      <button className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left transition hover:bg-shell/60"
        onClick={() => setOpen(!isOpen)}>
        <div className="min-w-0">
          <span className={`board ${isCommercial(id.vehicle_class) ? 'board-commercial' : ''}`}>{plate(v.reg_no)}</span>
          <div className="mt-2 text-sm font-medium text-ink">
            {[titleCase(id.maker), titleCase(id.model)].filter(Boolean).join(' ') || '—'}
          </div>
          <div className="mt-0.5 text-2xs text-muted">
            {[titleCase(id.fuel), titleCase(id.vehicle_class), id.manufactured].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Chip tone={bad ? 'wrong' : due || pending ? 'watch' : 'good'}>{summary}</Chip>
          <span className="flex items-center gap-1 text-2xs text-muted">
            {isOpen ? t('veh.hideDetails') : t('veh.seeDetails')}
            <span className={'transition-transform duration-300 ' + (isOpen ? 'rotate-180' : '')}>▾</span>
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="anim-open border-t border-line px-4 py-4">
          {!v.paid && (
            <>
              <Section title={t('veh.section.vehicle')}>
                <Grid rows={[
                  [t('veh.maker'), titleCase(id.maker)],
                  [t('veh.model'), titleCase(id.model)],
                  [t('veh.fuel'), titleCase(id.fuel)],
                  [t('veh.class'), titleCase(id.vehicle_class)],
                ]} />
                <p className="mt-2 text-2xs text-muted">{t('veh.identityNote')}</p>
              </Section>

              <Section title={t('veh.section.status')}>
                <div className="flex flex-wrap gap-2">
                  {expiredList.map((label) => <Chip key={label} tone="wrong">{t('veh.expired', { label: doc(label) })}</Chip>)}
                  {dueList.map((label) => <Chip key={label} tone="watch">{t('veh.due', { label: doc(label) })}</Chip>)}
                  {pending > 0 && <Chip tone="watch">{t('veh.pending', { n: pending })}</Chip>}
                  {!bad && !due && !pending && <Chip tone="good">{t('veh.nothingFlagged')}</Chip>}
                </div>
                <p className="mt-2 text-2xs text-muted">{t('veh.statusNote')}</p>
              </Section>
            </>
          )}

          {v.paid && (
            <>
              <Section title={t('veh.section.documents')}>
                <div className="divide-y divide-line/70">
                  {(v.documents || []).map((d) => (
                    <div key={d.label} className="flex items-center justify-between gap-3 py-2">
                      <span className="text-sm text-body">{doc(d.label)}</span>
                      <span className="text-right">
                        <span className="text-sm text-ink">{date(d.valid_until)}</span>
                        <span className={`ml-2 text-2xs ${d.state === 'expired' ? 'text-wrong-700'
                          : d.state === 'due' ? 'text-watch-700' : 'text-muted'}`}>{say(d.days)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title={t('veh.section.vehicle')}>
                <Grid rows={[
                  ['RTO', titleCase(String(id.registered_at || '').replace(/\s+/g, ' ').trim())],
                  ['RC', titleCase(id.rc_status)],
                  [t('veh.maker'), titleCase(id.maker)],
                  [t('veh.model'), titleCase(id.model)],
                  [t('veh.fuel'), titleCase(id.fuel)],
                  [t('veh.class'), titleCase(id.vehicle_class)],
                ]} />
              </Section>

              <Section title={t('veh.section.challans')}>
                {pending > 0 ? (
                  <p className="text-sm">
                    <b className="text-wrong-700">{t('veh.pending', { n: pending })}</b>
                    {v.challans.pending_amount_paise != null && <> · {rupees(v.challans.pending_amount_paise)}</>}
                  </p>
                ) : <p className="text-sm text-good-700">{t('veh.noChallans')}</p>}

                {v.challans?.pending?.length > 0 && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[520px] text-sm">
                      <tbody className="divide-y divide-line/70">
                        {v.challans.pending.slice(0, 30).map((c, i) => (
                          <tr key={c.challan_no || i}>
                            <td className="py-2 align-top text-2xs text-muted">{date(c.date)}</td>
                            <td className="py-2 align-top">
                              <div>{c.offence || '—'}</div>
                              <div className="text-2xs text-muted">{c.place}</div>
                              <div className="font-mono text-2xs text-muted">{c.challan_no}</div>
                            </td>
                            <td className="py-2 text-right align-top tabular">{rupees(c.amount_paise)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>

              <Section title={t('veh.section.ownership')}>
                <Grid rows={[
                  [t('home.lock.loan'), v.ownership?.financer ? titleCase(v.ownership.financer) : '—'],
                  ['Blacklist', v.ownership?.blacklist_status || '—'],
                  ['NOC', v.ownership?.noc_details || '—'],
                ]} />
              </Section>

              <Section title={t('veh.section.refs')}>
                <Grid rows={[
                  [doc('Insurance'), [titleCase(v.references?.insurance_company), v.references?.insurance_policy].filter(Boolean).join(' · ')],
                  ['PUC', v.references?.pucc_number],
                  [doc('Permit'), [v.references?.permit_number, v.references?.permit_type].filter(Boolean).join(' · ')],
                ]} />
              </Section>

              {v.fastag && (
                <Section title="FASTag">
                  <p className="text-sm">
                    {v.fastag.active ? 'Active' : 'Inactive'}
                    {v.fastag.balance != null && <> · ₹{v.fastag.balance}</>}
                  </p>
                </Section>
              )}
            </>
          )}

          {!v.paid && <Locked onBuy={onBuy} buying={buying} />}

          <p className="mt-4 text-2xs text-muted">{t('veh.source', { date: date(v.checked_at) })}</p>
        </div>
      )}
    </div>
  );
}

/**
 * What paying adds — named, and answered nowhere. The labels are the client's
 * own, in the reader's language; the server sends no values to hide.
 */
function Locked({ onBuy, buying }) {
  const { t } = useLang();
  const keys = ['loan', 'blacklist', 'docs', 'challans', 'refs', 'fastag', 'rto'];
  return (
    <div className="mt-4 rounded-lg border border-brand/25 bg-brand/5 p-4">
      <div className="text-sm font-semibold text-brand-deep">{t('veh.inReport')}</div>
      <div className="mt-2 divide-y divide-brand/10">
        {keys.map((k) => (
          <div key={k} className="flex items-center justify-between gap-3 py-1.5">
            <span className="text-sm text-body">{t(`veh.locked.${k}`)}</span>
            <span className="text-2xs text-brand-deep">🔒</span>
          </div>
        ))}
      </div>
      {onBuy && (
        <button className="btn-primary mt-4 w-full" onClick={onBuy} disabled={buying}>{t('veh.getReport')}</button>
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
    {rows.filter(([, val]) => val).map(([k, val]) => (
      <div key={k} className="flex justify-between gap-3 border-b border-line/70 py-1.5">
        <span className="text-2xs uppercase tracking-wider text-muted">{k}</span>
        <span className="text-right text-sm text-ink">{val}</span>
      </div>
    ))}
  </div>
);
