import { useState } from 'react';
import { Link } from 'react-router-dom';
import { waLink, WHATSAPP, WHATSAPP_ENABLED } from '../lib/api';
import { mobile as fmtMobile } from '../lib/format';
import Layout from '../components/Layout.jsx';

/**
 * Support, answered on the page wherever possible.
 *
 * MOST "SUPPORT" IS ONE OF SIX QUESTIONS, and every one of them has a real
 * answer that can be given here rather than in a reply two days later. The
 * contact details come last, for the cases the page genuinely cannot settle.
 *
 * There is no contact FORM. A form promises a reply from a system that does not
 * yet chase its own queue; WhatsApp and email both land somewhere a person
 * actually looks.
 */
const ANSWERS = [
  {
    q: 'I paid but nothing arrived',
    a: 'Open *My reports* and it will be there. If the Government records service was busy when you paid, '
      + 'the report is issued the moment you open that page. Your payment is never lost — every payment is '
      + 'checked against Razorpay automatically within a minute.',
  },
  {
    q: 'I need my invoice',
    a: 'Every invoice is on your *Invoices* page, to view or save as a PDF. Invoices never expire, even if '
      + 'you close your account.',
  },
  {
    q: 'My report will not download',
    a: 'A report can be downloaded for seven days. After that, check the vehicle again — a report shows the '
      + 'records as they were on the day it was issued, and an old one would be a wrong one.',
  },
  {
    q: 'The details are wrong',
    a: 'GaadiPe reproduces the Government record exactly and cannot change it. If your insurance or PUC has '
      + 'been renewed but still shows as expired, the RTO record has not caught up yet — it usually does '
      + 'within a few days. Where anything differs from your papers, the RTO record is what counts.',
  },
  {
    q: 'Stop messaging me',
    a: 'Deactivate your account from your *Profile* page. Alerts stop immediately. GaadiPe only messages '
      + 'people who bought a report, and only about the vehicle they bought it for.',
  },
  {
    q: 'Can I have a refund?',
    a: 'A report is produced and sent the moment payment succeeds, so a completed purchase is final and '
      + 'is not refunded in whole or in part. The free check exists so that you see the vehicle, and what '
      + 'the report adds, before paying. The one exception is money taken with nothing delivered at all — '
      + 'a duplicate payment, or a failure on our side we cannot put right — which is returned in full.',
  },
  {
    q: 'Remove my vehicle from GaadiPe',
    a: 'If you own a vehicle and do not want it checked here, write to support@gaadipe.in from the number '
      + 'registered against it and we will block that registration for everybody.',
  },
];

export default function Support() {
  const [open, setOpen] = useState(0);

  return (
    <Layout>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-ink">Help</h1>
        <p className="mt-1.5 text-sm text-muted">
          Most questions are answered here. If yours is not, we usually reply the same day.
        </p>

        <div className="mt-6 space-y-2 stagger">
          {ANSWERS.map((item, i) => (
            <div key={item.q} className="card overflow-hidden">
              <button className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-shell/60"
                onClick={() => setOpen(open === i ? -1 : i)}>
                <span className="text-sm font-semibold text-ink">{item.q}</span>
                <span className={'text-muted transition-transform duration-300 ' + (open === i ? 'rotate-180' : '')}>▾</span>
              </button>
              {open === i && (
                <p className="anim-open border-t border-line px-5 py-4 text-sm leading-relaxed text-body">
                  {item.a.split('*').map((part, j) => (j % 2 ? <b key={j}>{part}</b> : part))}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="card mt-6 p-5">
          <h2 className="text-base font-semibold text-ink">Still stuck?</h2>
          <p className="mt-1.5 text-sm text-body">
            Tell us the vehicle number and what happened. If it is about a payment, the invoice
            or report number helps us find it in seconds.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a className="btn-primary" href="mailto:support@gaadipe.in">Email support@gaadipe.in</a>
            {WHATSAPP_ENABLED && (
              <a className="btn-quiet" href={waLink('Hi, I need help with ')}>Message us on WhatsApp</a>
            )}
          </div>
          <p className="mt-3 text-2xs text-muted">
            {WHATSAPP_ENABLED
              ? 'WhatsApp: +' + WHATSAPP.slice(0, 2) + ' ' + fmtMobile(WHATSAPP) + ' · we reply between 10am and 7pm IST.'
              : 'We reply between 10am and 7pm IST, usually the same day.'}
          </p>
        </div>

        <div className="mt-6 rounded-lg border border-line bg-shell/60 p-5">
          <h2 className="text-sm font-semibold text-ink">Grievances</h2>
          <p className="mt-1.5 text-sm text-body">
            If a complaint has not been resolved, write to the Grievance Officer at
            {' '}<a className="underline" href="mailto:support@gaadipe.in">support@gaadipe.in</a> with
            “Grievance” in the subject. We respond within the period set out in our
            {' '}<Link className="underline" to="/privacy">Privacy policy</Link>.
          </p>
        </div>
      </div>
    </Layout>
  );
}
