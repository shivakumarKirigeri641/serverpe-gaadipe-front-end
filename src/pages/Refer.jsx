import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { date, rupees } from '../lib/format';
import { useLang } from '../lib/i18n.jsx';
import Layout from '../components/Layout.jsx';
import { Banner, Chip, Spinner, Empty } from '../components/ui.jsx';

/**
 * REFER SOMEONE WHO ALSO HAS A VEHICLE (user, 2026-09-23).
 *
 * One personal link, shared anywhere. When somebody buys their first report
 * through it, the referrer's next report is free.
 *
 * NOTHING IS EARNED FOR A TAP OR A SIGN-UP, only for a payment that actually
 * landed — so the page says that plainly rather than showing a number that
 * later goes down. Each person appears with the stage they reached, because a
 * referrer who can see "signed in, not bought yet" nudges them himself.
 *
 * This replaced the QuizPe referral, which asked a scooter owner to recruit a
 * school parent into a quiz app to earn a vehicle report — two funnels
 * multiplied, tapped zero times. Everyone your customer knows has a vehicle.
 */
const TONE = { rewarded: 'good', signed_up: 'watch', tapped: 'info', expired: 'info', not_eligible: 'wrong' };

export default function Refer() {
  const { t } = useLang();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => { api.referral().then(setData).catch(setError); }, []);
  useEffect(load, [load]);

  const share = async () => {
    const text = t('ref.shareText', { url: data.url });
    // The phone's own share sheet where there is one: it reaches WhatsApp,
    // Telegram and SMS without GaadiPe having to know about any of them.
    if (navigator.share) {
      try { await navigator.share({ text }); return; } catch { /* dismissed */ }
    }
    try {
      await navigator.clipboard.writeText(data.url);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard refused */ }
  };

  if (error) return <Layout><Banner tone="wrong">{error.message || String(error)}</Banner></Layout>;
  if (!data) return <Layout><Spinner /></Layout>;
  if (!data.enabled) {
    return <Layout><Banner tone="info">{t('ref.off')}</Banner></Layout>;
  }

  const price = data.price_paise ? rupees(data.price_paise) : '₹19';

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-ink">{t('ref.h')}</h1>
      <p className="mt-1 text-sm text-muted">{t('ref.sub', { price })}</p>

      {data.available > 0 && (
        <Banner tone="good" className="mt-5">
          <b>{t('ref.have', { n: data.available })}</b> {t('ref.haveB')}
        </Banner>
      )}

      {/* The link, and one button that does the right thing on a phone. */}
      <div className="card mt-5 p-5">
        <div className="label">{t('ref.yourLink')}</div>
        <div className="mt-1 break-all rounded-lg border border-line bg-shell px-3 py-2.5 text-sm font-semibold text-ink">
          {data.url}
        </div>
        <button className="btn-primary btn-arrow mt-3 w-full" onClick={share}>
          {copied ? t('ref.copied') : t('ref.share')} <span className="arrow">→</span>
        </button>
        <p className="mt-3 text-2xs text-muted">{t('ref.rule', { price, days: data.credit_valid_days })}</p>
      </div>

      {/* How it works, in three lines, because a referrer explains it to others. */}
      <div className="card mt-4 p-5">
        <div className="text-sm font-semibold text-ink">{t('ref.howH')}</div>
        <ol className="mt-2 space-y-1.5 text-sm text-body">
          <li>1. {t('ref.how1')}</li>
          <li>2. {t('ref.how2', { price })}</li>
          <li>3. {t('ref.how3')}</li>
        </ol>
      </div>

      {/* Who came, and how far they got. */}
      <div className="card mt-4">
        <div className="border-b border-line px-5 py-3 text-sm font-semibold text-ink">
          {t('ref.peopleH')} {data.joined > 0 && <span className="text-muted">· {data.joined}</span>}
        </div>
        {data.people.length === 0
          ? <Empty>{t('ref.none')}</Empty>
          : (
            <ul className="divide-y divide-line">
              {data.people.map((p, i) => (
                <li key={i} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <div className="text-sm font-semibold text-ink">{p.mobile_masked}</div>
                    <div className="text-2xs text-muted">
                      {p.rewarded_at ? t('ref.onDate', { date: date(p.rewarded_at) })
                        : p.signed_up_at ? t('ref.joinedOn', { date: date(p.signed_up_at) }) : ''}
                    </div>
                  </div>
                  <Chip tone={TONE[p.status] || 'info'}>{t(`ref.state.${p.status}`)}</Chip>
                </li>
              ))}
            </ul>
          )}
      </div>

      {/* The free reports earned, and when each one lapses. */}
      {data.credits.length > 0 && (
        <div className="card mt-4">
          <div className="border-b border-line px-5 py-3 text-sm font-semibold text-ink">{t('ref.creditsH')}</div>
          <ul className="divide-y divide-line">
            {data.credits.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <span className="text-body">
                  {c.used_at ? t('ref.used', { reg: c.used_reg_no || '—' }) : t('ref.unused')}
                </span>
                <span className="text-2xs text-muted">
                  {c.used_at ? date(c.used_at) : t('ref.until', { date: date(c.expires_at) })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-2xs text-muted">{t('ref.small', { cap: data.monthly_cap })}</p>
    </Layout>
  );
}
