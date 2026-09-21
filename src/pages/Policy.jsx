import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { date } from '../lib/format';
import Layout from '../components/Layout.jsx';
import { Spinner, Banner } from '../components/ui.jsx';
import { useLang } from '../lib/i18n.jsx';

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
  email: 'Email policy',
};

const TITLES_HI = {
  terms: 'सेवा की शर्तें',
  privacy: 'गोपनीयता नीति',
  refund: 'रिफ़ंड नीति',
  liability: 'दायित्व',
  consent: 'सहमति',
  cancellation: 'रद्द करने की नीति',
  delivery: 'डिलीवरी नीति',
  'data-deletion': 'डेटा हटाना',
  partner: 'पार्टनर नीति',
  email: 'ईमेल नीति',
};

export default function Policy() {
  /* Each document has its own readable URL (/terms, /privacy), and one generic
     route (/policy/:slug) for anything added later — so the slug comes from
     whichever of the two brought the reader here. */
  const { slug: param } = useParams();
  const { pathname } = useLocation();
  const slug = param || pathname.split('/').filter(Boolean)[0] || 'terms';
  const { t, lang } = useLang();
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
        <h1 className="text-2xl font-bold text-ink">{(lang === 'hi' ? TITLES_HI[slug] : TITLES[slug]) || TITLES[slug] || 'Policy'}</h1>
        {version && (
          <p className="mt-1 text-2xs text-muted">
            {lang === 'hi'
              ? `संस्करण ${version.version} · ${date(version.effective_from)} से लागू`
              : `Version ${version.version} · in effect from ${date(version.effective_from)}`}
          </p>
        )}

        {lang === 'hi' && <Banner tone="info" className="mt-4">{t('policy.english')}</Banner>}
        {error && <Banner tone="wrong" className="mt-5">{error.message}</Banner>}
        {!data && !error && <Spinner />}

        {data && !clauses.length && (
          <Banner tone="info" className="mt-5">{lang === 'hi' ? 'यह दस्तावेज़ अभी प्रकाशित नहीं हुआ है।' : 'This document is not published yet.'}</Banner>
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
