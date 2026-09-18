import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, waLink, WHATSAPP, WHATSAPP_ENABLED } from '../lib/api';
import { useSession } from '../lib/session';
import { mobile as fmtMobile } from '../lib/format';
import { useLang } from '../lib/i18n.jsx';
import Layout from '../components/Layout.jsx';

/**
 * Help, answered on the page wherever possible — in both languages.
 *
 * MOST "SUPPORT" IS ONE OF SEVEN QUESTIONS, and every one of them has a real
 * answer that can be given here rather than in a reply two days later. The
 * answers live beside each other per language because they are prose, not
 * labels: a sentence translated piecemeal through keys stops reading as one.
 */
const PAGE = {
  en: {
    h: 'Help',
    sub: 'Most questions are answered here. If yours is not, we usually reply the same day.',
    stuckH: 'Still stuck?',
    stuckB: 'Tell us the vehicle number and what happened. If it is about a payment, the invoice or report number helps us find it in seconds.',
    email: 'Email support@gaadipe.in',
    hours: 'We reply between 10am and 7pm IST, usually the same day.',
    grievH: 'Grievances',
    griev: 'If a complaint has not been resolved, write to the Grievance Officer at support@gaadipe.in with “Grievance” in the subject. We respond within the period set out in our',
    privacy: 'Privacy policy',
    answers: [
      ['I paid but nothing arrived', 'Open *My reports* and it will be there. If the Government records service was busy when you paid, the report is issued the moment you open that page. Your payment is never lost — every payment is checked against Razorpay automatically within a minute.'],
      ['I need my invoice', 'Every invoice is on your *Invoices* page, to view or save as a PDF. Invoices never expire, even if you close your account.'],
      ['My report will not download', 'A report can be downloaded for seven days. After that, check the vehicle again — a report shows the records as they were on the day it was issued, and an old one would be a wrong one.'],
      ['The details are wrong', 'GaadiPe reproduces the Government record exactly and cannot change it. If your insurance or PUC has been renewed but still shows as expired, the RTO record has not caught up yet — it usually does within a few days. Where anything differs from your papers, the RTO record is what counts.'],
      ['Stop messaging me', 'Deactivate your account from your *Profile* page. Alerts stop immediately. GaadiPe only messages people who bought a report, and only about the vehicle they bought it for.'],
      ['Can I have a refund?', 'A report is produced and sent the moment payment succeeds, so a completed purchase is final and is not refunded in whole or in part. The free check exists so that you see the vehicle before paying. The one exception is money taken with nothing delivered at all — a duplicate payment, or a failure on our side we cannot put right — which is returned in full.'],
      ['Remove my vehicle from GaadiPe', 'If you own a vehicle and do not want it checked here, write to support@gaadipe.in from the number registered against it and we will block that registration for everybody.'],
    ],
  },
  hi: {
    h: 'मदद',
    sub: 'ज़्यादातर सवालों के जवाब यहीं हैं। अगर आपका नहीं है, तो हम आमतौर पर उसी दिन जवाब देते हैं।',
    stuckH: 'अब भी दिक्कत है?',
    stuckB: 'हमें वाहन नंबर बताइए और क्या हुआ। अगर बात भुगतान की है, तो इनवॉइस या रिपोर्ट नंबर से हम उसे कुछ ही सेकंड में ढूँढ लेते हैं।',
    email: 'support@gaadipe.in पर ईमेल करें',
    hours: 'हम सुबह 10 से शाम 7 बजे (IST) के बीच जवाब देते हैं, आमतौर पर उसी दिन।',
    grievH: 'शिकायत',
    griev: 'अगर किसी शिकायत का समाधान नहीं हुआ है, तो विषय में “Grievance” लिखकर support@gaadipe.in पर शिकायत अधिकारी को लिखें। हम उस समय-सीमा में जवाब देते हैं जो हमारी',
    privacy: 'गोपनीयता नीति',
    answers: [
      ['मैंने भुगतान किया, पर कुछ नहीं मिला', '*मेरी रिपोर्ट* खोलिए, वह वहाँ होगी। अगर भुगतान के समय सरकारी रिकॉर्ड सेवा व्यस्त थी, तो वह पेज खोलते ही रिपोर्ट जारी हो जाती है। आपका पैसा कभी नहीं खोता — हर भुगतान एक मिनट के अंदर Razorpay से अपने आप मिलाया जाता है।'],
      ['मुझे अपना इनवॉइस चाहिए', 'हर इनवॉइस आपके *इनवॉइस* पेज पर है, PDF में देखने या सेव करने के लिए। इनवॉइस कभी समाप्त नहीं होते, अकाउंट बंद करने के बाद भी।'],
      ['मेरी रिपोर्ट डाउनलोड नहीं हो रही', 'रिपोर्ट सात दिन तक डाउनलोड की जा सकती है। उसके बाद वाहन फिर से चेक करें — रिपोर्ट उस दिन के रिकॉर्ड दिखाती है जिस दिन वह जारी हुई थी, और पुरानी रिपोर्ट ग़लत होगी।'],
      ['जानकारी ग़लत है', 'GaadiPe सरकारी रिकॉर्ड को जैसा है वैसा दिखाता है और उसे बदल नहीं सकता। अगर आपका बीमा या PUC रिन्यू हो गया है पर अब भी समाप्त दिख रहा है, तो RTO का रिकॉर्ड अभी अपडेट नहीं हुआ — आमतौर पर कुछ दिनों में हो जाता है। अगर कुछ आपके कागज़ों से अलग हो, तो RTO का रिकॉर्ड ही मान्य है।'],
      ['मुझे मैसेज भेजना बंद करें', 'अपने *प्रोफ़ाइल* पेज से अकाउंट बंद करें। अलर्ट तुरंत रुक जाते हैं। GaadiPe सिर्फ़ उन्हीं को मैसेज भेजता है जिन्होंने रिपोर्ट खरीदी है, और सिर्फ़ उसी वाहन के बारे में।'],
      ['क्या मुझे रिफ़ंड मिल सकता है?', 'भुगतान सफल होते ही रिपोर्ट बनकर भेज दी जाती है, इसलिए पूरी हुई खरीद अंतिम है और उसका पूरा या आंशिक रिफ़ंड नहीं होता। मुफ़्त चेक इसीलिए है ताकि भुगतान से पहले आप वाहन देख सकें। अपवाद सिर्फ़ एक है — अगर पैसा कटा और कुछ भी नहीं मिला, जैसे दोहरा भुगतान या हमारी तरफ़ की कोई ऐसी गड़बड़ी जिसे हम ठीक न कर सकें — तो पूरा पैसा लौटाया जाता है।'],
      ['मेरा वाहन GaadiPe से हटाएँ', 'अगर वाहन आपका है और आप नहीं चाहते कि उसे यहाँ चेक किया जाए, तो उसके साथ दर्ज नंबर से support@gaadipe.in पर लिखें, और हम उस पंजीकरण को सबके लिए ब्लॉक कर देंगे।'],
    ],
  },
};

/*
 * CONTACT US (user, 2026-09-18). Anyone may write, signed in or not; the
 * message is stored and emailed to the team. A hidden "website" field catches
 * robots — people never see it, robots fill it in.
 */
const FORM = {
  en: {
    h: 'Write to us', sub: 'We usually reply the same day. Give an email or a mobile number so we can answer you.',
    name: 'Your name', mobile: 'Mobile number', email: 'Email', reg: 'Vehicle number (if it is about one)',
    subject: 'Subject', message: 'Your message', send: 'Send message', sending: 'Sending…',
    subjects: ['A payment or refund', 'My report or invoice', 'The details look wrong', 'Remove my vehicle', 'Something else'],
  },
  hi: {
    h: 'हमें लिखें', sub: 'हम आमतौर पर उसी दिन जवाब देते हैं। जवाब के लिए ईमेल या मोबाइल नंबर दें।',
    name: 'आपका नाम', mobile: 'मोबाइल नंबर', email: 'ईमेल', reg: 'वाहन नंबर (अगर किसी वाहन के बारे में है)',
    subject: 'विषय', message: 'आपका संदेश', send: 'संदेश भेजें', sending: 'भेजा जा रहा है…',
    subjects: ['भुगतान या रिफ़ंड', 'मेरी रिपोर्ट या इनवॉइस', 'जानकारी ग़लत लगती है', 'मेरा वाहन हटाएँ', 'कुछ और'],
  },
};

function ContactForm({ lang }) {
  const f = FORM[lang] || FORM.en;
  const { me } = useSession();
  const [form, setForm] = useState({ name: '', mobile: '', email: '', reg_no: '', subject: f.subjects[0], message: '', website: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (me) setForm((x) => ({ ...x, name: x.name || me.name || '', mobile: x.mobile || me.mobile || '', email: x.email || me.email || '' }));
  }, [me]);
  const set = (k) => (e) => setForm((x) => ({ ...x, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const out = await api.contact({ ...form, language: lang });
      setDone(out.message);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  if (done) {
    return (
      <div className="card anim-up mt-6 border-good-500/30 bg-good-50 p-5">
        <div className="text-base font-semibold text-good-700">✓ {done}</div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card mt-6 space-y-3 p-5">
      <div>
        <h2 className="text-base font-semibold text-ink">{f.h}</h2>
        <p className="mt-1 text-sm text-muted">{f.sub}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="label">{f.name}</span>
          <input className="input" value={form.name} onChange={set('name')} maxLength={80} required /></label>
        <label className="block"><span className="label">{f.mobile}</span>
          <input className="input tabular" inputMode="numeric" value={form.mobile} onChange={set('mobile')} maxLength={14} placeholder="98765 43210" /></label>
        <label className="block"><span className="label">{f.email}</span>
          <input className="input" type="email" value={form.email} onChange={set('email')} maxLength={160} placeholder="you@example.com" /></label>
        <label className="block"><span className="label">{f.reg}</span>
          <input className="input uppercase" value={form.reg_no} onChange={set('reg_no')} maxLength={14} placeholder="KA01AB1234" /></label>
      </div>
      <label className="block"><span className="label">{f.subject}</span>
        <select className="input" value={form.subject} onChange={set('subject')}>
          {f.subjects.map((s) => <option key={s} value={s}>{s}</option>)}
        </select></label>
      <label className="block"><span className="label">{f.message}</span>
        <textarea className="input min-h-[120px]" value={form.message} onChange={set('message')} maxLength={3000} required /></label>
      {/* For robots only. */}
      <input type="text" name="website" value={form.website} onChange={set('website')} tabIndex={-1} autoComplete="off"
        aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
      {error && <p className="rounded-lg border border-wrong-500/25 bg-wrong-50 px-3 py-2 text-sm text-wrong-700">{error}</p>}
      <button className="btn-primary w-full sm:w-auto" disabled={busy}>{busy ? f.sending : f.send}</button>
    </form>
  );
}

export default function Support() {
  const { lang } = useLang();
  const p = PAGE[lang] || PAGE.en;
  const [open, setOpen] = useState(0);

  return (
    <Layout>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-ink">{p.h}</h1>
        <p className="mt-1.5 text-sm text-muted">{p.sub}</p>

        <div className="mt-6 space-y-2 stagger">
          {p.answers.map(([q, a], i) => (
            <div key={q} className="card overflow-hidden">
              <button className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-shell/60"
                onClick={() => setOpen(open === i ? -1 : i)}>
                <span className="text-sm font-semibold text-ink">{q}</span>
                <span className={'text-muted transition-transform duration-300 ' + (open === i ? 'rotate-180' : '')}>▾</span>
              </button>
              {open === i && (
                <p className="anim-open border-t border-line px-5 py-4 text-sm leading-relaxed text-body">
                  {a.split('*').map((part, j) => (j % 2 ? <b key={j}>{part}</b> : part))}
                </p>
              )}
            </div>
          ))}
        </div>

        <ContactForm lang={lang} />

        <div className="card mt-6 p-5">
          <h2 className="text-base font-semibold text-ink">{p.stuckH}</h2>
          <p className="mt-1.5 text-sm text-body">{p.stuckB}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a className="btn-primary" href="mailto:support@gaadipe.in">{p.email}</a>
            {WHATSAPP_ENABLED && (
              <a className="btn-quiet" href={waLink('Hi, I need help with ')}>WhatsApp</a>
            )}
          </div>
          <p className="mt-3 text-2xs text-muted">
            {WHATSAPP_ENABLED ? `WhatsApp: +${WHATSAPP.slice(0, 2)} ${fmtMobile(WHATSAPP)} · ` : ''}{p.hours}
          </p>
        </div>

        <div className="mt-6 rounded-lg border border-line bg-shell/60 p-5">
          <h2 className="text-sm font-semibold text-ink">{p.grievH}</h2>
          <p className="mt-1.5 text-sm text-body">
            {p.griev} <Link className="underline" to="/privacy">{p.privacy}</Link>.
          </p>
        </div>
      </div>
    </Layout>
  );
}
