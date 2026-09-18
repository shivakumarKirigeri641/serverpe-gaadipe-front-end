import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { date } from '../lib/format';
import Layout from '../components/Layout.jsx';
import { Spinner, Banner } from '../components/ui.jsx';

/**
 * The published legal text, read from the same endpoint the WhatsApp bot links
 * to. ONE SOURCE: an edit in the admin panel changes the site, the bot's links
 * and this page together — a policy that exists in two places is a policy that
 * eventually says two things.
 */
const TITLES = {
  terms: 'Terms of service',
  privacy: 'Privacy policy',
  refund: 'Refund policy',
  liability: 'Liability',
  consent: 'Consent',
  cancellation: 'Cancellation policy',
  delivery: 'Delivery policy',
  'data-deletion': 'Data deletion',
  partner: 'Partner policy',
};

export default function Policy() {
  /* Each document has its own readable URL (/terms, /privacy), and one generic
     route (/policy/:slug) for anything added later — so the slug comes from
     whichever of the two brought the reader here. */
  const { slug: param } = useParams();
  const { pathname } = useLocation();
  const slug = param || pathname.split('/').filter(Boolean)[0] || 'terms';
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setData(null);
    api.policies().then(setData).catch(setError);
  }, [slug]);

  const clauses = data?.policies?.[slug] || [];
  const version = data?.versions?.[slug];

  return (
    <Layout>
      <article className="mx-auto max-w-3xl py-2">
        <h1 className="text-2xl font-bold text-ink">{TITLES[slug] || 'Policy'}</h1>
        {version && (
          <p className="mt-1 text-2xs text-muted">
            Version {version.version} · in effect from {date(version.effective_from)}
          </p>
        )}

        {error && <Banner tone="wrong" className="mt-5">{error.message}</Banner>}
        {!data && !error && <Spinner />}

        {data && !clauses.length && (
          <Banner tone="info" className="mt-5">This document is not published yet.</Banner>
        )}

        <div className="mt-6 space-y-6">
          {clauses.map((c, i) => (
            <section key={i}>
              <h2 className="text-base font-semibold text-ink">{c.title}</h2>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-body">{c.description}</p>
            </section>
          ))}
        </div>

        {data?.business && (
          <div className="mt-10 rounded-lg border border-line bg-shell/60 p-4 text-2xs text-muted">
            <div className="font-semibold text-ink">{data.business.business_name || 'ServerPe App Solutions'}</div>
            {data.business.address && <div>{data.business.address}</div>}
            {data.business.gstin && <div>GSTIN {data.business.gstin}</div>}
            <div>support@gaadipe.in</div>
          </div>
        )}
      </article>
    </Layout>
  );
}
