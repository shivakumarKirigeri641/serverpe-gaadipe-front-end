import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import VehicleArt from '../components/VehicleArt.jsx';
import { api, CHECK_ON_WHATSAPP, waLink } from '../lib/api';

/**
 * gaadipe.in/s/<token> — A SHARED REPORT'S SUMMARY (user, 2026-10-15: "shareable report").
 * What a buyer, seller or family member sees when a GaadiPe customer forwards their report:
 * yes/no results only (server site/shares.js) — never the owner, a date, an amount or the PDF —
 * and the date it was checked. Both buttons lead into GaadiPe: WhatsApp with "Hi" while
 * GaadiPe is WhatsApp-first, else the website's chat; arriving here marks the visitor's source
 * as "a shared report".
 */
const day = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const TONE = {
  ok: 'bg-good-50 text-good-700 border-good-500/20',
  warn: 'bg-watch-50 text-watch-700 border-watch-500/20',
  bad: 'bg-wrong-50 text-wrong-700 border-wrong-500/20',
  info: 'bg-shell text-body border-line',
};

function Row({ icon, label, value, tone }) {
  return (
    <li className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${TONE[tone]}`}>
      <span className="flex items-center gap-2 text-sm font-semibold"><span aria-hidden="true">{icon}</span>{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </li>
  );
}

export default function ShareReport() {
  const { token } = useParams();
  const [s, setS] = useState(undefined);
  useEffect(() => {
    api.share(String(token || '').toUpperCase()).then((r) => setS(r?.share || null)).catch(() => setS(null));
  }, [token]);

  const go = (reg) => (CHECK_ON_WHATSAPP ? waLink('Hi') : `/chat${reg ? `?reg=${encodeURIComponent(reg)}` : ''}`);

  if (s === undefined) return <Layout><div className="mx-auto max-w-md"><div className="card h-80 skeleton" /></div></Layout>;
  if (!s) {
    return (
      <Layout>
        <div className="mx-auto max-w-md card p-6 text-center">
          <div className="text-3xl" aria-hidden="true">🔗</div>
          <h1 className="mt-2 text-xl font-bold text-ink">This shared report has ended</h1>
          <p className="mt-2 text-sm text-body">A shared summary works for a few days after the report was bought, or until its owner switches it off.</p>
          <a className="btn-primary btn-big mt-5 inline-flex" href={go(null)}>Check any vehicle free on GaadiPe →</a>
        </div>
      </Layout>
    );
  }

  const docTone = (st) => (st === 'expired' ? 'bad' : st === 'due' ? 'warn' : 'ok');
  const docText = (st) => (st === 'expired' ? '❌ Expired' : st === 'due' ? '⚠️ Due soon' : '✅ Valid');
  return (
    <Layout>
      <div className="mx-auto max-w-md" data-test="share-report">
        <p className="mb-2 text-center text-2xs font-semibold uppercase tracking-wider text-muted">Shared from a GaadiPe full report</p>
        <div className="card overflow-hidden">
          <div className="bg-gradient-to-br from-[#0f766e] to-[#0a4f49] p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <span className="inline-block rounded-md border-2 border-black bg-white px-2.5 py-0.5 font-mono text-[17px] font-black tracking-[2px] text-black shadow">{s.reg_no}</span>
                {s.vehicle && <div className="mt-2 text-[15px] font-bold">{s.vehicle}</div>}
                {s.detail && <div className="text-[12px] text-white/80">{s.detail}</div>}
              </div>
              <VehicleArt kind={s.kind} tone="dark" className="h-14 w-[104px] shrink-0" />
            </div>
          </div>
          <ul className="space-y-2 p-4">
            {s.documents.map((d) => <Row key={d.label} icon="📄" label={d.name} value={docText(d.state)} tone={docTone(d.state)} />)}
            {s.challans_pending != null && (
              <Row icon="🚨" label="Pending challans" value={s.challans_pending ? `⚠️ ${s.challans_pending} pending` : '✅ None'} tone={s.challans_pending ? 'warn' : 'ok'} />
            )}
            <Row icon="🏦" label="Loan / hypothecation" value={s.loan ? '⚠️ On record' : '✅ None on record'} tone={s.loan ? 'warn' : 'ok'} />
            {s.blacklisted && <Row icon="⛔" label="Blacklist" value="❌ Record found" tone="bad" />}
            {s.owner_serial && <Row icon="👤" label="Owner" value={`${s.owner_serial}${['st', 'nd', 'rd'][s.owner_serial - 1] || 'th'} owner`} tone="info" />}
            {s.rc_active === false && <Row icon="🪪" label="RC status" value="⚠️ Not active" tone="warn" />}
          </ul>
          <p className="border-t border-line px-4 py-3 text-2xs text-muted">
            Checked on GaadiPe on <b className="text-ink">{day(s.checked_at)}</b> from vehicle records. A summary only —
            the owner&apos;s details are never shared, and the full report (dates, amounts, each challan) stays with the person who bought it.
          </p>
        </div>

        <div className="mt-5 grid gap-2">
          <a className="btn-primary btn-big btn-arrow justify-center text-center" href={go(s.reg_no)} data-test="share-check-this">
            Check {s.reg_no} yourself <span className="arrow">→</span>
          </a>
          <a className="btn-quiet justify-center text-center" href={go(null)} data-test="share-check-any">Check any vehicle free on GaadiPe</a>
          {CHECK_ON_WHATSAPP && (
            <p className="text-center text-2xs text-muted">Opens WhatsApp with “Hi” — then send <b className="text-ink">{s.reg_no}</b> or any vehicle number.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
