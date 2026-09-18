import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, waLink, WHATSAPP_ENABLED } from '../lib/api';
import { rupees } from '../lib/format';
import Layout from '../components/Layout.jsx';
import Reveal from '../components/Reveal.jsx';

/**
 * The landing page.
 *
 * IT LEADS WITH THE BUYER'S QUESTION, not with a feature list. The person most
 * willing to pay is about to hand over ₹50,000 for a used bike and wants to
 * know whether there is a loan, a blacklist entry or a pile of challans on it.
 * An owner reading the same page finds the monitoring further down.
 *
 * The price comes from the server, so a change in the admin panel changes this
 * page too — a price on a website that disagrees with the one charged is the
 * first thing produced in a dispute.
 */
export default function Home() {
  const [pricing, setPricing] = useState(null);
  const [reg, setReg] = useState('');
  const navigate = useNavigate();

  useEffect(() => { api.pricing().then(setPricing).catch(() => {}); }, []);
  const price = pricing ? rupees(pricing.price_paise) : '₹19';
  const days = pricing?.duration_days ?? 28;

  const go = (e) => {
    e.preventDefault();
    const plate = reg.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (plate.length < 5) return;
    // The check itself needs an account, so the plate travels to the sign-in
    // screen and the check runs the moment they are in.
    navigate(`/app/check?reg=${plate}`);
  };

  return (
    <Layout wide>
      {/* ---------------------------------------------------------- hero */}
      <section className="border-b border-line bg-gradient-to-b from-brand/5 to-white">
        <div className="wrap grid items-center gap-10 py-14 lg:grid-cols-2 lg:py-20">
          <div className="anim-up">
            <span className="chip border-brand/20 bg-white text-brand-deep">Government records · VAHAN · e-Challan · FASTag</span>
            <h1 className="mt-4 text-3xl font-bold leading-tight text-ink sm:text-4xl">
              Before you buy that vehicle, see what the RTO knows about it.
            </h1>
            <p className="mt-4 text-lg text-body">
              Loan or hypothecation, blacklist and NOC status, pending challans with
              offence and place, insurance and PUC validity — for any Indian
              registration number.
            </p>

            <form onSubmit={go} className="mt-6 flex flex-col gap-3 sm:flex-row">
              <input className="input sm:flex-1" placeholder="KA02EX1480" value={reg}
                onChange={(e) => setReg(e.target.value)} aria-label="Vehicle number" />
              <button className="btn-primary btn-big">Check this vehicle</button>
            </form>
            <p className="mt-2 text-2xs text-muted">
              Free check shows the vehicle and its document dates. The full report is {price}, one-time.
            </p>
          </div>

          <div className="card anim-up p-5" style={{ animationDelay: '.12s' }}>
            <div className="text-2xs font-semibold uppercase tracking-wider text-muted">What a check looks like</div>
            <div className="mt-3 space-y-2.5">
              <SampleRow label="Insurance" value="06 Nov 2026" tone="good" note="2 months left" />
              <SampleRow label="PUC" value="13 Mar 2026" tone="wrong" note="expired 6 months ago" />
              <SampleRow label="Road tax" value="30 Jun 2027" tone="good" note="10 months left" />
              <SampleRow label="Pending challans" value="3" tone="watch" note="₹4,500 to pay" />
              <div className="rounded-lg border border-brand/25 bg-brand/5 px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-body">Loan / hypothecation</span>
                  <span className="text-2xs font-semibold text-brand-deep">🔒 A financer is recorded</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm text-body">Blacklist &amp; NOC</span>
                  <span className="text-2xs font-semibold text-brand-deep">🔒 In the full report</span>
                </div>
              </div>
            </div>
            <p className="mt-3 text-2xs text-muted">
              An example, not a real vehicle.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ how it works */}
      <section id="how" className="wrap py-14">
        <Reveal><h2 className="text-2xl font-bold text-ink">How it works</h2></Reveal>
        <div className="mt-6 grid gap-5 stagger sm:grid-cols-3">
          <Step n="1" title="Send the number"
            body="Type any Indian registration number. Sign in with your mobile number the first time — no password, just a code." />
          <Step n="2" title="See the basics free"
            body="The vehicle, its RTO, and when insurance, PUC, road tax, fitness and permit run out — plus how many challans are pending." />
          <Step n={`3`} title={`Get the full report for ${price}`}
            body={`Loan, blacklist, NOC, every challan with its offence and place, and the policy numbers. A PDF you keep, and ${days} days of alerts if anything changes.`} />
        </div>
      </section>

      {/* ------------------------------------------------------------ price */}
      <section id="price" className="border-y border-line bg-shell/60">
        <div className="wrap grid gap-8 py-14 lg:grid-cols-2">
          <Reveal>
            <h2 className="text-2xl font-bold text-ink">One price. Nothing renews.</h2>
            <p className="mt-3 text-body">
              GaadiPe does not sell a subscription, does not store your card and
              never charges you automatically. You pay once, for one vehicle.
            </p>
            <ul className="mt-5 space-y-2.5">
              <Tick>Full report as a PDF, yours to download and keep</Tick>
              <Tick>Loan / hypothecation, blacklist and NOC status</Tick>
              <Tick>Every pending challan with offence, place and amount</Tick>
              <Tick>Insurer, policy and PUC references</Tick>
              <Tick>{days} days of alerts: new challans, and documents about to expire</Tick>
              <Tick>GST invoice, on your account the moment you pay</Tick>
            </ul>
          </Reveal>
          <Reveal delay={80} className="card self-start p-6">
            <div className="text-2xs font-semibold uppercase tracking-wider text-muted">Full vehicle report</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-4xl font-bold text-ink">{price}</span>
              <span className="text-sm text-muted">one-time, per vehicle</span>
            </div>
            <p className="mt-2 text-2xs text-muted">
              Inclusive of GST and payment charges — the amount shown is the amount you pay.
            </p>
            <a className="btn-primary btn-big mt-5 w-full" href="/app/check">Check a vehicle</a>
            <a className="btn-quiet mt-2 w-full" href="/sample-report.pdf" target="_blank" rel="noopener">
              See a sample report
            </a>
            {WHATSAPP_ENABLED && (
              <a className="btn-quiet mt-2 w-full" href={waLink('Hi')}>Or use WhatsApp</a>
            )}
            <p className="mt-3 text-2xs text-muted">
              All sales are final — the report is delivered the moment you pay, which is why the check
              before it is free.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------ trust */}
      <section className="wrap py-14">
        <Reveal><h2 className="text-2xl font-bold text-ink">What GaadiPe will never show</h2></Reveal>
        <div className="mt-5 grid gap-5 stagger sm:grid-cols-3">
          <Card title="No owner name">
            The registered owner's name is never displayed, to anyone, on any screen or report.
          </Card>
          <Card title="No chassis or engine number">
            These identify the vehicle itself and are never shown. Government sources mask them, and so do we.
          </Card>
          <Card title="No tracking">
            We do not show where a vehicle has been. Challan locations appear in your own report only,
            because that is what makes a challan recognisable to its owner.
          </Card>
        </div>
        <p className="mt-5 text-sm text-muted">
          Records come from the Government of India's Unified Logistics Interface Platform — VAHAN for the
          RC, e-Challan for challans, NETC for FASTag. GaadiPe reproduces them and does not alter them.
        </p>
      </section>

      {/* A phone should never have to scroll back up to act. Desk screens
          already have the button in view, so this is small-screen only. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:hidden">
        <form onSubmit={go} className="flex gap-2">
          <input className="input !py-2.5 flex-1" placeholder="Vehicle number" value={reg}
            onChange={(e) => setReg(e.target.value)} aria-label="Vehicle number" />
          <button className="btn-primary !px-5">Check</button>
        </form>
      </div>
      {/* Clear of the bar above. */}
      <div className="h-20 sm:hidden" />

      {/* -------------------------------------------------------------- faq */}
      <section id="faq" className="border-t border-line bg-shell/60">
        <div className="wrap py-14">
          <Reveal><h2 className="text-2xl font-bold text-ink">Questions people ask</h2></Reveal>
          <div className="mt-6 space-y-3 stagger">
            <Faq q="Is this legal?">
              Yes. The data is published by Government sources through ULIP for exactly this kind of use, and
              personal details — owner name, chassis, engine — are masked at source and never shown here.
            </Faq>
            <Faq q="Can I find out who owns a vehicle?">
              No. GaadiPe does not show the owner's name, address or phone number, and never will. If that is
              what you need, the RTO is the place to ask.
            </Faq>
            <Faq q="How current is it?">
              As current as the Government record. Challans appear within a day or two of being issued;
              insurance and PUC dates update when the RTO record does.
            </Faq>
            <Faq q="What if the vehicle is not found?">
              Very new registrations can take a few weeks to appear in VAHAN. You are not charged for a
              vehicle we cannot find.
            </Faq>
            <Faq q="Will you charge me again?">
              No. There is no auto-renewal and no stored card. When the alerts end, they simply stop.
            </Faq>
            <Faq q="Can I get a refund?">
              No. A report is produced and delivered the moment you pay, so a completed purchase is final.
              That is why the check is free: you see the vehicle, and exactly what the report adds, before
              paying anything. If money is taken and no report reaches you at all, write to
              support@gaadipe.in and it is returned.
            </Faq>
          </div>
        </div>
      </section>
    </Layout>
  );
}

const SampleRow = ({ label, value, note, tone }) => (
  <div className="flex items-center justify-between gap-3 border-b border-line/70 pb-2">
    <span className="text-sm text-body">{label}</span>
    <span className="text-right">
      <span className="text-sm text-ink">{value}</span>
      <span className={`ml-2 text-2xs ${
        tone === 'wrong' ? 'text-wrong-700' : tone === 'watch' ? 'text-watch-700' : 'text-muted'}`}>{note}</span>
    </span>
  </div>
);

const Step = ({ n, title, body }) => (
  <div className="card p-5">
    <span className="grid h-8 w-8 place-items-center rounded-full bg-brand/10 text-sm font-bold text-brand-deep">{n}</span>
    <h3 className="mt-3 text-base font-semibold text-ink">{title}</h3>
    <p className="mt-1.5 text-sm text-body">{body}</p>
  </div>
);

const Card = ({ title, children }) => (
  <div className="card p-5">
    <h3 className="text-base font-semibold text-ink">{title}</h3>
    <p className="mt-1.5 text-sm text-body">{children}</p>
  </div>
);

const Tick = ({ children }) => (
  <li className="flex gap-2.5 text-sm text-body">
    <span className="mt-0.5 text-brand">✓</span>{children}
  </li>
);

const Faq = ({ q, children }) => (
  <details className="card group px-5 py-4">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ink marker:hidden">
      {q}
      <span className="text-muted transition-transform duration-300 group-open:rotate-180">▾</span>
    </summary>
    <p className="anim-open mt-2 text-sm text-body">{children}</p>
  </details>
);
