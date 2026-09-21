import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { date, plate } from '../lib/format';
import { useLang } from '../lib/i18n.jsx';
import { useSession } from '../lib/session';
import Layout from '../components/Layout.jsx';
import { Banner, Chip, Spinner, Empty } from '../components/ui.jsx';

/**
 * REFER QUIZPE TO A PARENT, GET A FREE FULL REPORT (user, 2026-09-21).
 *
 * The customer enters the parent's name and number and ticks that the parent
 * agrees. The invitation is then sent by the CUSTOMER, from their own phone —
 * WhatsApp opens straight to the parent's chat with the message typed, or SMS,
 * or the phone's share sheet, or copy. GaadiPe and QuizPe send the parent
 * nothing; GaadiPe only checks, later, whether that number bought QuizPe premium.
 */
const QUIZPE_URL = (import.meta.env.VITE_QUIZPE_URL || 'https://quizpe.in') + '/?utm_source=gaadipe&utm_medium=referral';

export default function Refer() {
  const { t, lang } = useLang();
  const { me } = useSession();
  const [params] = useSearchParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);   // { name, mobile } just referred, to share
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => { api.referrals().then(setData).catch(setError); }, []);
  useEffect(load, [load]);

  const message = (parentName) => t('refer.msg', {
    name: parentName, link: QUIZPE_URL, me: (me?.name || '').split(' ')[0] || '',
  });
  const wa = (m, text) => `https://wa.me/91${m}?text=${encodeURIComponent(text)}`;
  const sms = (m, text) => `sms:+91${m}?body=${encodeURIComponent(text)}`;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const out = await api.createReferral({ name: name.trim(), mobile, consent: agreed });
      setCreated({ name: name.trim(), mobile: String(mobile).replace(/\D/g, '').slice(-10) });
      setName(''); setMobile(''); setAgreed(false);
      load();
      return out;
    } catch (err) { setError(err); } finally { setBusy(false); }
    return null;
  };

  const share = async () => {
    const text = message(created.name);
    try { await navigator.share({ text }); } catch { /* dismissed */ }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(message(created.name)); setCopied(true); } catch { /* no clipboard */ }
  };

  const mobileOk = /^[6-9]\d{9}$/.test(String(mobile).replace(/\D/g, '').slice(-10));
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
          {created ? (
            <div>
              <h2 className="text-base font-semibold text-ink">{t('refer.sendNow', { name: created.name })}</h2>
              <p className="mt-1 text-sm text-body">{t('refer.sendHint')}</p>
              <div className="mt-3 rounded-lg bg-shell p-3 text-sm whitespace-pre-wrap text-body">{message(created.name)}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <a className="btn-primary" href={wa(created.mobile, message(created.name))} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                <a className="btn-quiet" href={sms(created.mobile, message(created.name))}>SMS</a>
                {typeof navigator !== 'undefined' && navigator.share && <button className="btn-quiet" onClick={share}>{t('refer.share')}</button>}
                <button className="btn-quiet" onClick={copy}>{copied ? t('refer.copied') : t('refer.copy')}</button>
              </div>
              <button className="mt-4 text-sm font-semibold text-brand-deep underline" onClick={() => { setCreated(null); setCopied(false); }}>
                {t('refer.another')}
              </button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <h2 className="text-base font-semibold text-ink">{t('refer.form.h')}</h2>
              <label className="mt-3 block">
                <span className="label">{t('refer.form.name')}</span>
                <input className="input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder={t('refer.form.namePh')} />
              </label>
              <label className="mt-3 block">
                <span className="label">{t('refer.form.mobile')}</span>
                <input className="input" inputMode="numeric" value={mobile} maxLength={14}
                  onChange={(e) => setMobile(e.target.value)} placeholder="98XXXXXXXX" />
              </label>
              <label className={`mt-3 flex cursor-pointer gap-3 rounded-lg border p-3 transition ${agreed ? 'border-brand/40 bg-brand/5' : 'border-line bg-white'}`}>
                <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-brand" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                <span className="text-sm leading-relaxed text-body">{lang === 'hi' ? t('refer.form.consent') : (data?.consent_text || t('refer.form.consent'))}</span>
              </label>
              {error && <Banner tone="wrong" className="mt-3">{error.message}</Banner>}
              <button className="btn-primary mt-4 w-full" disabled={busy || !agreed || !mobileOk || name.trim().length < 2 || (data && !data.enabled)}>
                {busy ? t('common.loading') : t('refer.form.cta')}
              </button>
            </form>
          )}
        </div>
      </div>

      <h2 className="mt-8 text-base font-semibold text-ink">{t('refer.list.h')}</h2>
      {!data ? <Spinner label={t('common.loading')} /> : !data.referrals.length ? <Empty>{t('refer.list.empty')}</Empty> : (
        <div className="mt-3 divide-y divide-line rounded-xl border border-line bg-white">
          {data.referrals.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-ink">{r.name} <span className="tabular text-2xs font-normal text-muted">{r.mobile}</span></div>
                <div className="text-2xs text-muted">{t('refer.list.on', { date: date(r.created_at) })}
                  {r.status === 'pending' && ` · ${t('refer.list.until', { date: date(r.expires_at) })}`}</div>
              </div>
              <div className="flex items-center gap-2">
                <Chip tone={{ pending: 'watch', rewarded: 'good' }[r.status] || 'info'}>{t(`refer.status.${r.status}`)}</Chip>
                {r.status === 'pending' && r.share_to && (
                  <a className="btn-quiet !px-3 !py-1.5 text-2xs" href={wa(r.share_to, message(r.name))} target="_blank" rel="noopener noreferrer">
                    {t('refer.remind')}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
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
