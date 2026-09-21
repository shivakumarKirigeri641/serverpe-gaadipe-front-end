import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { date, plate } from '../lib/format';
import { useLang } from '../lib/i18n.jsx';
import { useSession } from '../lib/session';
import Layout from '../components/Layout.jsx';
import { Banner, Chip, Spinner, Empty } from '../components/ui.jsx';

/**
 * REFER QUIZPE WITH YOUR OWN LINK, GET A FREE FULL REPORT (user, 2026-09-21).
 *
 * One personal link per customer, the same for everyone they share it with.
 * Joining needs one thing: the customer agrees that QuizPe may message them.
 * They forward the link themselves (WhatsApp, anywhere); a parent who taps it
 * lands in QuizPe's WhatsApp with a message ready and presses Send. GaadiPe and
 * QuizPe send nobody anything, and nobody's number is typed in here.
 */
export default function Refer() {
  const { t } = useLang();
  const { me, setMe } = useSession();
  const [params] = useSearchParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  // Name and email are required to join (user, 2026-09-21); pre-filled from the account.
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const load = useCallback(() => {
    api.referrals().then((d) => { setData(d); setName(d.name || ''); setEmail(d.email || ''); }).catch(setError);
  }, []);
  useEffect(load, [load]);

  const join = async () => {
    setBusy(true); setError(null);
    try {
      const out = await api.joinReferral({ name: name.trim(), email: email.trim() });
      setData({ ...data, ...out });
      if (out.user) setMe(out.user);
    } catch (e) { setError(e); } finally { setBusy(false); }
  };

  const link = data?.link;
  const message = link ? t('refer.msg', { link: link.url, me: (me?.name || '').split(' ')[0] || '' }) : '';
  const copy = async () => { try { await navigator.clipboard.writeText(message); setCopied(true); } catch { /* none */ } };
  const share = async () => { try { await navigator.share({ text: message }); } catch { /* dismissed */ } };
  const available = data?.available || 0;
  const back = params.get('reg');

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-ink">{t('refer.h')}</h1>
      <p className="mt-1 max-w-2xl text-sm text-body">{t('refer.sub', { cap: data?.monthly_cap ?? 10, days: data?.window_days ?? 30 })}</p>

      {available > 0 && (
        <Banner tone="good" className="mt-4">
          🎁 {t('refer.youHave', { n: available })}{' '}
          <Link className="font-semibold underline" to={back ? `/app/vehicle/${encodeURIComponent(back)}` : '/app'}>{t('refer.useNow')}</Link>
        </Banner>
      )}
      {data && !data.enabled && <Banner tone="watch" className="mt-4">{t('refer.paused')}</Banner>}
      {error && <Banner tone="wrong" className="mt-4">{error.message}</Banner>}
      {!data && !error && <Spinner label={t('common.loading')} />}

      {data && (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="card p-5">
            <h2 className="text-base font-semibold text-ink">{t('refer.how.h')}</h2>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-body">
              <li>{t('refer.how.1')}</li>
              <li>{t('refer.how.2')}</li>
              <li>{t('refer.how.3')}</li>
            </ol>
            <p className="mt-3 text-2xs text-muted">{t('refer.never')}</p>
          </div>

          <div className="card p-5">
            {!data.joined ? (
              <>
                <h2 className="text-base font-semibold text-ink">{t('refer.join.h')}</h2>
                <label className="mt-3 block">
                  <span className="label">{t('refer.join.name')}</span>
                  <input className="input" value={name} maxLength={80} autoComplete="name" onChange={(e) => setName(e.target.value)} />
                </label>
                <label className="mt-3 block">
                  <span className="label">{t('refer.join.email')}</span>
                  <input className="input" type="email" inputMode="email" autoComplete="email" value={email} maxLength={160}
                    placeholder="you@example.com" onChange={(e) => setEmail(e.target.value)} />
                </label>
                <label className={`mt-3 flex cursor-pointer gap-3 rounded-lg border p-3 transition ${agreed ? 'border-brand/40 bg-brand/5' : 'border-line bg-white'}`}>
                  <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-brand" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                  <span className="text-sm leading-relaxed text-body">{t('prof.quizpe.label')}</span>
                </label>
                <p className="mt-2 text-2xs text-muted">{t('refer.join.why')}</p>
                <button className="btn-primary mt-4 w-full" disabled={!agreed || busy || !data.enabled || name.trim().length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email.trim())} onClick={join}>
                  {busy ? t('common.loading') : t('refer.join.cta')}
                </button>
              </>
            ) : (
              <>
                <h2 className="text-base font-semibold text-ink">{t('refer.link.h')}</h2>
                {!link.active && <Banner tone="watch" className="mt-3">{t(`refer.inactive.${link.inactive_reason}`)}</Banner>}
                {!data.email_verified && <Banner tone="info" className="mt-3">{t('refer.confirmEmail', { email: data.email || '' })}</Banner>}
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-line bg-shell px-3 py-2">
                  <span className="min-w-0 flex-1 truncate font-mono text-sm text-ink">{link.url}</span>
                </div>
                <div className="mt-3 rounded-lg bg-shell p-3 text-sm whitespace-pre-wrap text-body">{message}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a className="btn-primary" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">{t('refer.link.wa')}</a>
                  {typeof navigator !== 'undefined' && navigator.share && <button className="btn-quiet" onClick={share}>{t('refer.share')}</button>}
                  <button className="btn-quiet" onClick={copy}>{copied ? t('refer.copied') : t('refer.copy')}</button>
                </div>
                <p className="mt-3 text-2xs text-muted">{t('refer.link.stats', { n: link.opened })}</p>
              </>
            )}
          </div>
        </div>
      )}

      {data?.joined && (
        <>
          <h2 className="mt-8 text-base font-semibold text-ink">{t('refer.list.h')}</h2>
          {!data.referrals.length ? <Empty>{t('refer.list.empty')}</Empty> : (
            <div className="mt-3 divide-y divide-line rounded-xl border border-line bg-white">
              {data.referrals.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <div className="tabular text-sm font-semibold text-ink">{r.mobile_masked}</div>
                    <div className="text-2xs text-muted">{t('refer.list.on', { date: date(r.tapped_at) })}
                      {r.status === 'pending' && ` · ${t('refer.list.until', { date: date(r.expires_at) })}`}</div>
                  </div>
                  <Chip tone={{ pending: 'watch', rewarded: 'good' }[r.status] || 'info'}>{t(`refer.status.${r.status}`)}</Chip>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {data?.credits?.length > 0 && (
        <>
          <h2 className="mt-8 text-base font-semibold text-ink">{t('refer.credits.h')}</h2>
          <div className="mt-3 divide-y divide-line rounded-xl border border-line bg-white">
            {data.credits.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="text-body">{c.state === 'used' ? t('refer.credits.used', { reg: plate(c.used_reg_no || '') })
                  : c.state === 'expired' ? t('refer.credits.expired') : t('refer.credits.available', { date: date(c.expires_at) })}</span>
                <Chip tone={c.state === 'available' ? 'good' : 'info'}>{t(`refer.credits.${c.state}Chip`)}</Chip>
              </div>
            ))}
          </div>
        </>
      )}
    </Layout>
  );
}
