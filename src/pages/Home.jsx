import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, waLink, WHATSAPP_ENABLED } from '../lib/api';
import { rupees } from '../lib/format';
import Layout from '../components/Layout.jsx';
import Reveal from '../components/Reveal.jsx';
import useCountUp from '../lib/useCountUp';

/**
 * The landing page.
 *
 * THE VOICE IS THE ONE GAADIPE ALREADY HAS: "har gaadi ki kundli", "kharidne se
 * pehle, poori kundli". A kundli is a birth chart — the whole history of a
 * thing, read before a family commits to it. Nobody here needs that explained,
 * and no English sentence does the same work in the same number of words. The
 * English underneath carries the detail.
 *
 * IT LEADS WITH THE BUYER, because that is who pays. Somebody about to hand over
 * fifty thousand rupees for a used bike wants to know about a loan, a blacklist
 * entry and a pile of challans. An owner finds the monitoring further down, and
 * the founder's story at the end says why any of this exists.
 *
 * EVERY NUMBER COMES FROM THE SERVER. A price on a website that disagrees with
 * the one charged is the first thing produced in a dispute.
 */
export default function Home() {
  const [pricing, setPricing] = useState(null);
  const [reg, setReg] = useState('');
  const navigate = useNavigate();

  useEffect(() => { api.pricing().then(setPricing).catch(() => {}); }, []);
  const priceValue = useCountUp(pricing ? Math.round(pricing.price_paise / 100) : 0);
  const price = pricing ? rupees(pricing.price_paise) : '₹19';
  const days = pricing?.duration_days ?? 28;
  const validDays = pricing?.report_valid_days ?? 7;

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
      <section className="relative overflow-hidden border-b border-line bg-gradient-to-b from-brand/[0.07] via-white to-white">
        {/* Two soft washes of brand colour, drifting. Decorative only, and
            hidden from anything that reads the page aloud. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="drift absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand/10 blur-3xl" />
          <div className="drift absolute -right-16 top-20 h-80 w-80 rounded-full bg-brand-accent/10 blur-3xl"
            style={{ animationDelay: '-7s' }} />
        </div>

        <div className="wrap relative grid items-center gap-10 py-12 lg:grid-cols-[1.05fr_1fr] lg:py-20">
          <div>
            <span className="chip anim-up border-brand/20 bg-white text-brand-deep">
              All India · Every RTO · No app, no account
            </span>

            <h1 className="anim-up mt-4 text-3xl font-bold leading-[1.15] text-ink sm:text-[2.6rem]"
              style={{ animationDelay: '.06s' }}>
              Kharidne se pehle,<br className="hidden sm:block" /> poori kundli.
            </h1>

            <p className="anim-up mt-4 text-lg leading-relaxed text-body" style={{ animationDelay: '.14s' }}>
              Before you buy a used car or bike, read its whole record: is there a
              <b className="text-ink"> loan on it</b>, is it
              <b className="text-ink"> blacklisted</b>, how many
              <b className="text-ink"> challans are pending</b>, and are the insurance,
              PUC and tax still valid.
            </p>

            <form onSubmit={go} className="anim-up mt-6 flex flex-col gap-3 sm:flex-row"
              style={{ animationDelay: '.22s' }}>
              <input className="input sm:flex-1" placeholder="KA02EX1480" value={reg}
                onChange={(e) => setReg(e.target.value)} aria-label="Vehicle number" />
              <button className="btn-primary btn-big btn-arrow">
                Check this vehicle <span className="arrow">→</span>
              </button>
            </form>

            <p className="anim-up mt-3 text-sm text-muted" style={{ animationDelay: '.3s' }}>
              <b className="text-body">First check is free</b> — the vehicle and its document dates.
              The full report is <b className="text-body">{price}</b>, one time, any vehicle.
            </p>
          </div>

          {/* What a check actually looks like, rather than a promise that it
              will look like something. */}
          <div className="card anim-up p-5" style={{ animationDelay: '.12s' }}>
            <div className="flex items-center justify-between">
              <span className="text-2xs font-semibold uppercase tracking-wider text-muted">
                A real check, in seconds
              </span>
              <span className="chip border-good-500/25 bg-good-50 text-good-700">
                <span className="anim-ring h-1.5 w-1.5 rounded-full bg-good-500" />Free
              </span>
            </div>
            <div className="mt-3 space-y-2.5 stagger">
              <Line label="Manufacturer" value="Hero MotoCorp" />
              <Line label="Model & variant" value="Splendor Plus" />
              <Line label="Fuel · class" value="Petrol · Motorcycle" />
              <Line label="Status" value="PUC, road tax" note="expired" tone="wrong" />
            </div>

            <div className="sweep mt-3 rounded-lg border border-brand/25 bg-brand/5 p-3">
              <div className="text-2xs font-semibold uppercase tracking-wider text-brand-deep">
                In the {price} report
              </div>
              <div className="mt-2 space-y-1.5">
                <Locked label="Loan / hypothecation" />
                <Locked label="Blacklist & NOC status" />
                <Locked label="Every challan, with offence & place" />
                <Locked label="Insurance, PUC, tax & permit dates" />
              </div>
            </div>
            <p className="mt-3 text-2xs text-muted">An example, not a real vehicle.</p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- who it is for */}
      <section className="wrap py-14">
        <Reveal>
          <h2 className="text-2xl font-bold text-ink">Who checks a gaadi on GaadiPe</h2>
          <p className="mt-1.5 text-body">Four reasons people run a number through us.</p>
        </Reveal>
        <div className="mt-6 grid gap-4 stagger sm:grid-cols-2 lg:grid-cols-4">
          <Use title="Buying second-hand"
            body="See the loan, blacklist and challan position before you pay a rupee — not weeks later." />
          <Use title="Selling your vehicle"
            body="Show a clean record to a doubting buyer, and settle the price argument with a document." />
          <Use title="Your own gaadi"
            body="Know before insurance, PUC, tax or fitness runs out, instead of at a checkpoint." />
          <Use title="Checking a driver"
            body="Renting out, hiring a driver or booking a load — confirm the vehicle is what it claims to be." />
        </div>
      </section>

      {/* ----------------------------------------------------- what is inside */}
      <section id="report" className="border-y border-line bg-shell/60">
        <div className="wrap py-14">
          <Reveal>
            <h2 className="text-2xl font-bold text-ink">What the full report holds</h2>
            <p className="mt-1.5 max-w-2xl text-body">
              Assembled from Government sources into one clean PDF — no portals, no captchas,
              nothing to install.
            </p>
          </Reveal>

          <div className="mt-6 grid gap-4 stagger sm:grid-cols-2 lg:grid-cols-3">
            <Item title="Loan / hypothecation"
              body="Whether a financer is recorded against the vehicle — the first thing to know before buying." />
            <Item title="Blacklist & NOC"
              body="Blacklist entries and any No Objection Certificate on the record." />
            <Item title="Every challan"
              body="Pending and disposed, with date, offence, place, amount and what is still owed." />
            <Item title="Insurance"
              body="Insurer, policy reference and validity — is the cover live or lapsed?" />
            <Item title="PUC, tax, fitness, permit"
              body="Every expiry date that matters, including permit type for commercial vehicles." />
            <Item title="FASTag"
              body="Tag status and balance, for four-wheelers and above." />
            <Item title="RC & vehicle identity"
              body="Make, model, class, fuel, colour, RTO, registration date and how many owners it has had." />
            <Item title={`${days} days of alerts`}
              body="After you buy, we keep checking: a message if a new challan appears or a document is about to expire." />
            <Item title="GST invoice"
              body="A proper tax invoice with every payment, kept on your account for as long as the law requires." />
          </div>

          <Reveal className="mt-6">
            <p className="text-sm text-muted">
              <b className="text-body">What is never shown, to anybody:</b> the owner's name, the chassis
              number and the engine number. Government sources mask them, and so do we.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------ price */}
      <section id="price" className="wrap py-14">
        <div className="grid gap-8 lg:grid-cols-2">
          <Reveal>
            <h2 className="text-2xl font-bold text-ink">One flat price, any vehicle</h2>
            <p className="mt-3 text-body">
              Car, bike, scooter, auto, truck or bus — the price does not change with the vehicle.
              No subscription, no stored card, and nothing charged automatically, now or later.
            </p>
            <ul className="mt-5 space-y-2.5">
              <Tick>Free basic check first, so you know it is the right vehicle before you pay</Tick>
              <Tick>Full report as a PDF, yours to download for {validDays} days</Tick>
              <Tick>{days} days of alerts on new challans and expiring documents</Tick>
              <Tick>GST invoice on your account the moment you pay</Tick>
              <Tick>Works for vehicles registered in any state, across every RTO</Tick>
            </ul>
          </Reveal>

          <Reveal delay={80} className="card self-start p-6">
            <div className="text-2xs font-semibold uppercase tracking-wider text-muted">Full vehicle report</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="tabular text-5xl font-bold text-ink">₹{priceValue}</span>
              <span className="text-sm text-muted">one time, per vehicle</span>
            </div>
            <p className="mt-2 text-2xs text-muted">
              Inclusive of GST and payment charges — the amount shown is the amount you pay.
            </p>
            <a className="btn-primary btn-big btn-arrow mt-5 w-full" href="/app/check">
              Check a vehicle free <span className="arrow">→</span>
            </a>
            <a className="btn-quiet mt-2 w-full" href="/sample-report.pdf" target="_blank" rel="noopener">
              See a sample report
            </a>
            {WHATSAPP_ENABLED && (
              <a className="btn-quiet mt-2 w-full" href={waLink('Hi')}>Or use WhatsApp</a>
            )}
            <p className="mt-3 text-2xs text-muted">
              All sales are final — the report is delivered the moment you pay, which is why the
              check before it is free.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------- privacy */}
      <section className="border-y border-line bg-shell/60">
        <div className="wrap py-14">
          <Reveal>
            <h2 className="text-2xl font-bold text-ink">Private, secure, and yours to close</h2>
          </Reveal>
          <div className="mt-6 grid gap-4 stagger sm:grid-cols-2 lg:grid-cols-4">
            <Item title="No owner details, ever"
              body="We do not show who owns a vehicle. Not the name, not the address, not the phone number." />
            <Item title="We follow the DPDP Act, 2023"
              body="Your data is used to give you what you asked for, and nothing else. We never sell, rent or trade it." />
            <Item title="Razorpay handles payments"
              body="We never see or store your card or UPI details. Every payment happens on their secure page." />
            <Item title="Close your account any time"
              body="One tap in your profile stops all monitoring and signs you out. Only the tax invoices stay, as the law requires." />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ story */}
      <section className="wrap py-14">
        <Reveal className="card mx-auto max-w-3xl p-6 sm:p-8">
          <h2 className="text-xl font-bold text-ink">Built from a bill I didn't see coming.</h2>
          <div className="mt-4 space-y-3 text-body">
            <p>
              As a first-time buyer of a pre-owned car, I did what most people do — I bought
              through someone a friend knew, on trust.
            </p>
            <p>
              Weeks later the surprises arrived: pending dues, an unpaid traffic challan, and a
              PUC that had never been updated. I cleared every bit of it out of my own pocket.
            </p>
            <p>
              So I built GaadiPe — so that anyone buying or selling a vehicle can see its full
              record first, and never be caught out the way I was.
            </p>
          </div>
          <p className="mt-4 text-2xs text-muted">
            Shivakumar Kirigeri · ServerPe App Solutions, Karnataka
          </p>
        </Reveal>
      </section>

      {/* A phone should never have to scroll back up to act. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:hidden">
        <form onSubmit={go} className="flex gap-2">
          <input className="input !py-2.5 flex-1" placeholder="Vehicle number" value={reg}
            onChange={(e) => setReg(e.target.value)} aria-label="Vehicle number" />
          <button className="btn-primary !px-5">Check</button>
        </form>
      </div>
      <div className="h-20 sm:hidden" />

      {/* -------------------------------------------------------------- faq */}
      <section id="faq" className="border-t border-line bg-shell/60">
        <div className="wrap py-14">
          <Reveal><h2 className="text-2xl font-bold text-ink">Questions people ask</h2></Reveal>
          <div className="mt-6 space-y-3 stagger">
            <Faq q="Isn't this free on Vahan or Parivahan?">
              Parts of it are, across several portals, each with its own captcha and its own idea of a
              vehicle number — and none of them puts the loan status, the challan history and the
              document dates on one page. GaadiPe assembles the whole record into a single report you
              can keep, and then watches the vehicle for you afterwards.
            </Faq>
            <Faq q="Can I find out who owns a vehicle?">
              No. GaadiPe never shows an owner's name, address or phone number, and never will. If that
              is what you need, the RTO is the place to ask.
            </Faq>
            <Faq q="Where does the data come from?">
              From Government of India sources through the Unified Logistics Interface Platform — VAHAN
              for the RC, e-Challan for challans, NETC for FASTag. We reproduce those records as they
              stand; we do not create, alter or verify them, and we are not a Government body.
            </Faq>
            <Faq q="Which vehicles are covered?">
              Two, three and four wheelers and above, registered anywhere in India, across every state
              and RTO. FASTag details apply to four-wheelers and above.
            </Faq>
            <Faq q="Do I need to install an app?">
              No. Everything happens in your browser. You sign in with your mobile number and a one-time
              code — there is no password and nothing to download.
            </Faq>
            <Faq q="How current is it?">
              As current as the Government record. Challans usually appear within a day or two of being
              issued; insurance and PUC dates update when the RTO record does. Where anything differs
              from your papers, the RTO record is what counts.
            </Faq>
            <Faq q="What if the vehicle is not found?">
              Very new registrations can take a few weeks to appear in VAHAN. You are not charged for a
              vehicle we cannot find.
            </Faq>
            <Faq q="Will you charge me again?">
              No. There is no auto-renewal and no stored card. When the alerts end they simply stop, and
              nothing is taken from you unless you buy another report.
            </Faq>
          </div>

          <Reveal className="mt-8 text-center">
            <h3 className="text-xl font-bold text-ink">Check a vehicle before you commit to it.</h3>
            <p className="mt-1.5 text-body">The first check costs nothing.</p>
            <a className="btn-primary btn-big btn-arrow mt-4 inline-flex" href="/app/check">
              Check a vehicle <span className="arrow">→</span>
            </a>
          </Reveal>
        </div>
      </section>
    </Layout>
  );
}

/* ------------------------------------------------------------ the pieces */

const Line = ({ label, value, note, tone }) => (
  <div className="flex items-center justify-between gap-3 border-b border-line/70 pb-2">
    <span className="text-sm text-body">{label}</span>
    <span className="text-right">
      <span className="text-sm text-ink">{value}</span>
      <span className={`ml-2 text-2xs ${
        tone === 'wrong' ? 'text-wrong-700' : tone === 'watch' ? 'text-watch-700' : 'text-muted'}`}>
        {note}
      </span>
    </span>
  </div>
);

const Locked = ({ label }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-sm text-body">{label}</span>
    <span className="text-2xs text-brand-deep">🔒</span>
  </div>
);

const Use = ({ title, body }) => (
  <div className="card lift p-5">
    <h3 className="text-base font-semibold text-ink">{title}</h3>
    <p className="mt-1.5 text-sm text-body">{body}</p>
  </div>
);

const Item = ({ title, body }) => (
  <div className="card p-5">
    <h3 className="text-sm font-semibold text-ink">{title}</h3>
    <p className="mt-1.5 text-sm text-body">{body}</p>
  </div>
);

const Tick = ({ children }) => (
  <li className="flex gap-2.5 text-body">
    <span className="mt-0.5 shrink-0 text-brand">✓</span>{children}
  </li>
);

const Faq = ({ q, children }) => (
  <details className="card group px-5 py-4">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ink marker:hidden">
      {q}
      <span className="text-muted transition-transform duration-300 group-open:rotate-180">▾</span>
    </summary>
    <p className="anim-open mt-2 text-sm leading-relaxed text-body">{children}</p>
  </details>
);
