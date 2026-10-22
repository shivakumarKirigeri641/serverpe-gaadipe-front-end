import { useEffect, useMemo, useRef, useState } from 'react';
import { Routes, Route, NavLink, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { useSession } from '../lib/session';
import { useLang } from '../lib/i18n.jsx';
import { journey, interaction } from '../lib/track';
import { pixelChecked, pixelCodeAsked, pixelSignedIn } from '../lib/pixel';
import * as notify from '../lib/notify';
import { saveBlob } from '../components/ui.jsx';
import BuyDialog from '../components/BuyDialog.jsx';
import './go.css';

/**
 * THE GAADIPE APP — gaadipe.in/go (user, 2026-10-22: "go ahead as you recommend; fully responsive for
 * every mobile size; must look exactly like an app"). Not a chat: a car's dashboard.
 *
 *   /go            Check   — the number plate is the input; four warning lights show what is read
 *   /go/v/:reg     the dashboard for one vehicle — the health score on a speedometer, a warning light
 *                  for each document and the challans, then Full report ₹19 or Watch free
 *   /go/garage     Garage  — your vehicles, each with its score (signed in)
 *   /go/reports    Reports — the ₹19 reports bought, as PDFs (signed in)
 *   /go/me         Me      — account, notifications, language, help, sign out
 *
 * The same back end as the chat: the free check (chatCheck), the signed-in check, sign-in by SMS code,
 * the ₹19 checkout (BuyDialog), free monitoring, the reports. The full report itself still opens in
 * the chat (/chat?reg=…), which already shows every detail and the PDF. No dates before the report:
 * the free view says each document's state and the health score only (back end, vehicleView.statusOf).
 */

const T = {
  en: {
    h1a: 'Any ', h1b: 'warning lights', h1c: 'on your vehicle?',
    sub: 'Insurance, PUC, road tax and challans — read like your car’s dashboard, in seconds.',
    lights: ['Insurance', 'PUC', 'Road tax', 'Challans'],
    placeholder: 'KA01AB1234', start: 'START CHECK — FREE', checking: 'CHECKING…',
    bad: 'Please type a number like KA01AB1234',
    terms: ['By checking, you agree to GaadiPe’s', 'Terms', 'Privacy', 'Refund policy'],
    tryOne: 'Try one:', ticks: ['No app', 'No sign-up', 'All India'],
    steps: ['Registration found', 'Reading the vehicle', 'Checking insurance & PUC', 'Looking for challans', 'Building the dashboard'],
    fact: ['Did you know?', 'Driving with an expired PUC can mean a fine of up to ₹10,000. GaadiPe tells you before it runs out.'],
    score: 'HEALTH SCORE', band: { good: 'GOOD', attention: 'NEEDS ATTENTION', act: 'ACT NOW' },
    docs: { Insurance: 'Insurance', PUC: 'PUC', Registration: 'Registration', 'Road tax': 'Road tax', Fitness: 'Fitness', Permit: 'Permit' },
    st: { valid: 'VALID', due_soon: 'DUE SOON', expired: 'EXPIRED' },
    challans: 'Challans', pending: (n) => (n ? `${n} PENDING` : 'NONE'), unknown: 'NOT READ',
    locked: 'Loan · Blacklist · Owners', inReport: 'IN REPORT',
    remind: { expired: (d) => `${d} has expired. Renew it soon — a road check can mean a fine.`, due: (d) => `${d} is due soon. Renew before it runs out.`,
      challans: (n) => `${n} challan${n > 1 ? 's are' : ' is'} pending. See where and how much in the full report.`, clear: 'All clear. Watch it free and we’ll tell you before anything runs out.' },
    full: 'Full report', fullSub: 'loan · blacklist · PDF', watch: '🔔 Watch free', watchSub: '14 days of alerts',
    open: 'Open full report', openSub: 'every detail + PDF', pdf: '⬇ PDF', pdfSub: 'download',
    notFound: 'No vehicle record was found for this number. Please check it — very new vehicles can take a few weeks to appear.',
    signInH: 'Sign in — it’s free', signInP: 'Your mobile number, then the 6-digit code we SMS you. No password.',
    mobile: 'Mobile number', getCode: 'Send code', code: 'Code', verify: 'Verify & continue', codeSent: (m) => `Code sent to ${m}.`,
    signTerms: 'By signing in, you agree to the Terms, Privacy and Refund policy.', cancel: 'Not now', badMobile: 'Please type a 10-digit mobile number',
    tabs: ['Check', 'Garage', 'Reports', 'Me'],
    garage: 'My garage', garageSub: (n) => `${n} vehicle${n === 1 ? '' : 's'}`, garageEmpty: ['No vehicles yet', 'Check a vehicle and it appears here, with its score.'],
    watched: 'WATCHED', reportOk: 'REPORT', scoreLbl: 'score', addOne: '＋ Check a vehicle',
    reports: 'Reports', reportsEmpty: ['No reports yet', 'A ₹19 full report shows the loan, blacklist, every challan and comes as a PDF.'],
    validTill: 'valid till', download: 'Download',
    me: 'Me', notif: 'Notifications', notifOn: 'On', notifOff: 'Turn on', lang: 'Language', langNow: 'English → हिंदी',
    more: 'More settings (email, monitoring, invoices)', help: 'Help & support', policies: 'Terms & policies', signOut: 'Sign out',
    signInFor: 'Sign in to see your garage, reports and alerts.', signInBtn: 'Sign in',
    watchStarted: (r, d) => `Watching ${r} free till ${d}. We’ll alert you here, by SMS and email.`,
    fromRecord: 'From your saved record — no check used.', refresh: 'Check again (uses 1 check)',
  },
  hi: {
    h1a: 'आपकी गाड़ी पर ', h1b: 'कोई चेतावनी', h1c: 'तो नहीं?',
    sub: 'बीमा, PUC, रोड टैक्स और चालान — कार के डैशबोर्ड की तरह, सेकंडों में।',
    lights: ['बीमा', 'PUC', 'रोड टैक्स', 'चालान'],
    placeholder: 'KA01AB1234', start: 'मुफ़्त जाँच शुरू करें', checking: 'जाँच हो रही है…',
    bad: 'कृपया KA01AB1234 जैसा नंबर लिखें',
    terms: ['जाँच करके आप GaadiPe की', 'शर्तें', 'गोपनीयता', 'रिफ़ंड नीति'],
    tryOne: 'आज़माएँ:', ticks: ['कोई ऐप नहीं', 'साइन-अप नहीं', 'पूरे भारत में'],
    steps: ['पंजीकरण मिला', 'गाड़ी पढ़ी जा रही है', 'बीमा और PUC जाँच', 'चालान खोजे जा रहे हैं', 'डैशबोर्ड बन रहा है'],
    fact: ['क्या आप जानते हैं?', 'ख़त्म PUC के साथ गाड़ी चलाने पर ₹10,000 तक जुर्माना हो सकता है। GaadiPe पहले बता देता है।'],
    score: 'हेल्थ स्कोर', band: { good: 'अच्छा', attention: 'ध्यान दें', act: 'अभी करें' },
    docs: { Insurance: 'बीमा', PUC: 'PUC', Registration: 'पंजीकरण', 'Road tax': 'रोड टैक्स', Fitness: 'फ़िटनेस', Permit: 'परमिट' },
    st: { valid: 'वैध', due_soon: 'जल्द ख़त्म', expired: 'ख़त्म' },
    challans: 'चालान', pending: (n) => (n ? `${n} बकाया` : 'कोई नहीं'), unknown: 'पढ़ा नहीं गया',
    locked: 'लोन · ब्लैकलिस्ट · मालिक', inReport: 'रिपोर्ट में',
    remind: { expired: (d) => `${d} ख़त्म हो गया है। जल्द रिन्यू करें — जाँच में जुर्माना हो सकता है।`, due: (d) => `${d} जल्द ख़त्म होगा। समय पर रिन्यू करें।`,
      challans: (n) => `${n} चालान बकाया है। कहाँ और कितना — पूरी रिपोर्ट में।`, clear: 'सब ठीक है। मुफ़्त निगरानी लें — कुछ ख़त्म होने से पहले बताएँगे।' },
    full: 'पूरी रिपोर्ट', fullSub: 'लोन · ब्लैकलिस्ट · PDF', watch: '🔔 मुफ़्त निगरानी', watchSub: '14 दिन अलर्ट',
    open: 'पूरी रिपोर्ट खोलें', openSub: 'हर जानकारी + PDF', pdf: '⬇ PDF', pdfSub: 'डाउनलोड',
    notFound: 'इस नंबर का कोई रिकॉर्ड नहीं मिला। कृपया नंबर जाँचें — नई गाड़ियाँ कुछ हफ़्तों में दिखती हैं।',
    signInH: 'साइन इन करें — मुफ़्त', signInP: 'अपना मोबाइल नंबर, फिर SMS से आया 6 अंकों का कोड। कोई पासवर्ड नहीं।',
    mobile: 'मोबाइल नंबर', getCode: 'कोड भेजें', code: 'कोड', verify: 'जाँचें और आगे बढ़ें', codeSent: (m) => `${m} पर कोड भेजा गया।`,
    signTerms: 'साइन इन करके आप शर्तों, गोपनीयता और रिफ़ंड नीति से सहमत होते हैं।', cancel: 'अभी नहीं', badMobile: 'कृपया 10 अंकों का मोबाइल नंबर लिखें',
    tabs: ['जाँच', 'गैराज', 'रिपोर्ट', 'मैं'],
    garage: 'मेरा गैराज', garageSub: (n) => `${n} गाड़ियाँ`, garageEmpty: ['अभी कोई गाड़ी नहीं', 'कोई गाड़ी जाँचें — वह यहाँ अपने स्कोर के साथ दिखेगी।'],
    watched: 'निगरानी में', reportOk: 'रिपोर्ट', scoreLbl: 'स्कोर', addOne: '＋ गाड़ी जाँचें',
    reports: 'रिपोर्ट', reportsEmpty: ['अभी कोई रिपोर्ट नहीं', '₹19 की पूरी रिपोर्ट में लोन, ब्लैकलिस्ट, हर चालान और PDF मिलता है।'],
    validTill: 'वैध', download: 'डाउनलोड',
    me: 'मैं', notif: 'नोटिफ़िकेशन', notifOn: 'चालू', notifOff: 'चालू करें', lang: 'भाषा', langNow: 'हिंदी → English',
    more: 'और सेटिंग (ईमेल, निगरानी, इनवॉइस)', help: 'मदद', policies: 'शर्तें और नीतियाँ', signOut: 'साइन आउट',
    signInFor: 'अपना गैराज, रिपोर्ट और अलर्ट देखने के लिए साइन इन करें।', signInBtn: 'साइन इन',
    watchStarted: (r, d) => `${r} की ${d} तक मुफ़्त निगरानी शुरू। अलर्ट यहाँ, SMS और ईमेल पर।`,
    fromRecord: 'आपके सेव रिकॉर्ड से — कोई जाँच ख़र्च नहीं।', refresh: 'फिर से जाँचें (1 जाँच)',
  },
};

const clean = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const looksLikePlate = (s) => /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{3,4}$/.test(clean(s)) || /^\d{2}BH\d{4}[A-Z]{1,2}$/.test(clean(s));
const KIND_ART = { bike: '🏍️', scooter: '🛵', suv: '🚙', car: '🚗', hatchback: '🚗', truck: '🚚', bus: '🚌', auto: '🛺', tractor: '🚜' };
const ICON = { Insurance: '🛡️', PUC: '💨', Registration: '📇', 'Road tax': '🧾', Fitness: '🔧', Permit: '📜' };
const TONE = { valid: 'g', due_soon: 'a', expired: 'r' };
const TEXT_TONE = { valid: 't-g', due_soon: 't-a', expired: 't-r' };
const BAND_COLOUR = { good: '#34d399', attention: '#ffb020', act: '#ff5a4e' };
const title = (s) => String(s || '').toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase());
const day = (v) => { try { return new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; } };

function useT() {
  const { lang, setLang } = useLang();
  return { L: T[lang === 'hi' ? 'hi' : 'en'], lang, setLang };
}

function Logo({ to = '/go' }) {
  return <Link to={to} className="go-brand" aria-label="GaadiPe"><img src="/icon-192.png" alt="" />GaadiPe</Link>;
}

function LangChip() {
  const { lang, setLang } = useT();
  return <button type="button" className="go-chip" onClick={() => setLang(lang === 'hi' ? 'en' : 'hi')}>{lang === 'hi' ? 'English' : 'हिंदी'}</button>;
}

/* ─────────────── the speedometer ─────────────── */
function Dial({ score }) {
  const s = Math.max(0, Math.min(100, Number(score) || 0));
  const a = Math.PI * (1 - s / 100);            // 180° (0) … 0° (100)
  const x = 150 + 92 * Math.cos(a);
  const y = 150 - 92 * Math.sin(a);
  const ticks = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const t = Math.PI * (1 - i / 6);
    return <line key={i} x1={150 + 106 * Math.cos(t)} y1={150 - 106 * Math.sin(t)} x2={150 + 96 * Math.cos(t)} y2={150 - 96 * Math.sin(t)} />;
  });
  return (
    <div className="go-dial" aria-hidden="true">
      <svg viewBox="0 0 300 168">
        <defs>
          <linearGradient id="go-arc" x1="0" x2="1"><stop offset="0" stopColor="#ff5a4e" /><stop offset=".5" stopColor="#ffb020" /><stop offset="1" stopColor="#34d399" /></linearGradient>
          <filter id="go-glow"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <path d="M30 150 A120 120 0 0 1 270 150" stroke="#1b2730" strokeWidth="18" fill="none" strokeLinecap="round" />
        <path d="M30 150 A120 120 0 0 1 270 150" stroke="url(#go-arc)" strokeWidth="12" fill="none" strokeLinecap="round" filter="url(#go-glow)" />
        <g stroke="#7f95a2" strokeWidth="2">{ticks}</g>
        <g fill="#7f95a2" fontFamily="Orbitron, Inter" fontSize="11" fontWeight="800" textAnchor="middle">
          <text x="62" y="166">0</text><text x="238" y="166">100</text>
        </g>
        <line x1="150" y1="150" x2={x} y2={y} stroke="#fff" strokeWidth="4" strokeLinecap="round" filter="url(#go-glow)" />
        <circle cx="150" cy="150" r="12" fill="#fff" /><circle cx="150" cy="150" r="5" fill={BAND_COLOUR[s >= 80 ? 'good' : s >= 50 ? 'attention' : 'act']} />
      </svg>
    </div>
  );
}

/* ─────────────── sign in, as a sheet ─────────────── */
function SignInSheet({ reason, onDone, onClose }) {
  const { L } = useT();
  const { signIn } = useSession();
  const [step, setStep] = useState('mobile');
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState(reason || '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, [step]);

  const send = async (e) => {
    e.preventDefault();
    const m = mobile.replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(m)) { setErr(L.badMobile); return; }
    setBusy(true); setErr('');
    try {
      const out = await api.requestCode(m);
      if (!out.ok) { setErr(out.message || 'Please try again.'); return; }
      pixelCodeAsked(); interaction('typed', `Typed a mobile number ${m.slice(0, 2)}••••••${m.slice(-2)}`);
      setMobile(m); setStep('code'); setMsg(L.codeSent(`${m.slice(0, 5)} ${m.slice(5)}`));
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  const verify = async (e) => {
    e.preventDefault();
    const c = code.replace(/\D/g, '');
    if (c.length < 4) return;
    setBusy(true); setErr('');
    try {
      const out = await api.verifyCode(mobile, c, false, false, true);
      if (!out.ok) { setErr(out.message || 'That code did not match.'); return; }
      await signIn(out.token, out.user);
      pixelSignedIn();
      onDone?.(out.user);
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };

  return (
    <div className="go-sheet-bg" onClick={onClose}>
      <form className="go-sheet" onClick={(e) => e.stopPropagation()} onSubmit={step === 'mobile' ? send : verify} data-test="go-signin">
        <div className="grab" />
        <h3>🔐 {L.signInH}</h3>
        <p>{msg || L.signInP}</p>
        {step === 'mobile' ? (
          <label className="go-field"><span>+91</span>
            <input ref={ref} value={mobile} onChange={(e) => setMobile(e.target.value.replace(/[^\d ]/g, '').slice(0, 11))} inputMode="numeric" autoComplete="tel" placeholder="98765 43210" aria-label={L.mobile} data-test="go-mobile" />
          </label>
        ) : (
          <label className="go-field"><span>🔑</span>
            <input ref={ref} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="••••••" aria-label={L.code} data-test="go-code" />
          </label>
        )}
        {err ? <div className="go-err">{err}</div> : null}
        <button type="submit" className="go-start" disabled={busy} style={{ marginTop: 16 }}>{step === 'mobile' ? L.getCode : L.verify}</button>
        <div className="go-terms">{L.signTerms}</div>
        <button type="button" className="go-btn line" style={{ width: '100%', marginTop: 10, height: 46 }} onClick={onClose}>{L.cancel}</button>
      </form>
    </div>
  );
}

/* ─────────────── /go — the plate ─────────────── */
function CheckScreen() {
  const { L } = useT();
  const nav = useNavigate();
  const [plate, setPlate] = useState('');
  const [bad, setBad] = useState(false);
  useEffect(() => { journey({ step: 'go_home', section: null }); }, []);
  const go = (e, value = plate) => {
    e?.preventDefault();
    if (!looksLikePlate(value)) { setBad(true); interaction('error', 'Number did not look like a vehicle number'); return; }
    nav(`/go/v/${clean(value)}`, { state: { fresh: true } });
  };
  return (
    <>
      <header className="go-top"><Logo /><LangChip /></header>
      <main className="go-main">
        <h1 className="go-h1">{L.h1a}<em>{L.h1b}</em><br />{L.h1c}</h1>
        <p className="go-sub">{L.sub}</p>
        <div className="go-strip" aria-hidden="true">
          <div className="go-lights"><div className="go-lt g">🛡️</div><div className="go-lt r blink">💨</div><div className="go-lt a">🧾</div><div className="go-lt r blink">🚨</div></div>
          <div className="go-ltl">{L.lights.map((l) => <span key={l}>{l}</span>)}</div>
        </div>
        <form onSubmit={go}>
          <label className={`go-plate ${bad ? 'bad' : ''}`}>
            <span className="ind"><i />IND</span>
            <input value={plate} onChange={(e) => { setPlate(clean(e.target.value).slice(0, 11)); setBad(false); }} placeholder={L.placeholder}
              autoComplete="off" autoCapitalize="characters" spellCheck={false} enterKeyHint="go" aria-label="Vehicle number" data-test="go-plate" />
          </label>
          {bad ? <div className="go-err">{L.bad}</div> : null}
          <button type="submit" className="go-start" data-test="go-start"><i>⏻</i>{L.start}</button>
        </form>
        <div className="go-terms">{L.terms[0]} <a href="/terms" target="_blank" rel="noopener noreferrer">{L.terms[1]}</a>, <a href="/privacy" target="_blank" rel="noopener noreferrer">{L.terms[2]}</a> &amp; <a href="/refund" target="_blank" rel="noopener noreferrer">{L.terms[3]}</a>.</div>
        <div className="go-try">{L.tryOne}<br />{['MH12XY4321', 'DL8CAF5031', 'KA01AB1234'].map((p) => (
          <button key={p} type="button" onClick={() => { setPlate(p); go(null, p); }}>{p}</button>))}</div>
        <div className="go-ticks">{L.ticks.map((t) => <span key={t}><b>✓</b> {t}</span>)}</div>
      </main>
    </>
  );
}

/* ─────────────── /go/v/:reg — reading, then the dashboard ─────────────── */
function VehicleScreen({ askSignIn, toast }) {
  const { L, lang } = useT();
  const { reg: raw } = useParams();
  const reg = clean(raw);
  const { me } = useSession();
  const loc = useLocation();
  const nav = useNavigate();
  const fromGarage = loc.state?.row || null;
  const [phase, setPhase] = useState(fromGarage ? 'done' : 'reading');
  const [stepN, setStepN] = useState(0);
  const [out, setOut] = useState(fromGarage ? { garage: fromGarage } : null);
  const [buying, setBuying] = useState(null);
  const started = useRef(false);

  // signedIn: true right after signing in from this screen (`me` here is still the moment before).
  const run = async ({ signedIn = Boolean(me) } = {}) => {
    setPhase('reading'); setStepN(0); setOut(null);
    const t0 = Date.now();
    const timer = setInterval(() => setStepN((n) => Math.min(n + 1, 4)), 650);
    interaction('search', `Searched ${reg}${signedIn ? '' : ' — free check'}`, { reg_no: reg });
    journey({ step: 'checking', section: `app check · ${reg}` });
    let res;
    try {
      res = signedIn ? await api.check(reg)
        : await api.chatCheck(reg, { agreed: true, method: 'entered_vehicle_number', words: `${L.terms[0]} ${L.terms[1]}, ${L.terms[2]} & ${L.terms[3]}.`, language: lang === 'hi' ? 'hi' : 'en' });
    } catch (e) { res = { error: 'failed', message: e.message }; }
    // Let the steps play out: at least 2.6 s, so the reading feels like reading.
    const wait = Math.max(0, 2600 - (Date.now() - t0));
    setTimeout(() => {
      clearInterval(timer);
      setOut(res); setPhase('done');
      if (res?.vehicle) { pixelChecked(); journey({ step: 'viewing', section: `app dashboard · ${reg}` }); }
      if (res?.error === 'sign_in_needed') askSignIn(res.message, () => run({ signedIn: true }));
    }, wait);
  };
  useEffect(() => {
    if (started.current || fromGarage) return;
    started.current = true;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const v = out?.vehicle || null;
  const g = out?.garage || null;
  const status = out?.status || v?.status || g?.status || null;
  const id = v?.identity || (g ? { maker: g.maker, model: g.model, fuel: g.fuel, vehicle_class: g.vehicle_class } : {});
  const name = [title(id.maker), id.model ? title(String(id.model).split(" ")[0]) : null].filter(Boolean).join(' ') || reg;
  const art = KIND_ART[id.kind] || (/M-?CYCLE|SCOOTER|2W/i.test(id.vehicle_class || '') ? '🏍️' : '🚗');
  const paid = Boolean(out?.report || g?.report_id);
  const price = out?.price_paise || out?.offer?.price_paise || 1900;

  const watch = () => {
    const doIt = async () => {
      try {
        const r = await api.startFreeMonitor(reg);
        toast(L.watchStarted(reg, day(r.ends_at)));
        if (await notify.state().catch(() => 'unsupported') === 'off') notify.enable().catch(() => {});
      } catch (e) { toast(e.message); }
    };
    if (!me) askSignIn(null, doIt); else doIt();
  };
  const buy = () => {
    if (!me) askSignIn(null, () => setBuying({ reg, price }));
    else setBuying({ reg, price });
  };
  const pdf = async () => {
    try {
      const rid = out?.report?.id || g?.report_id;
      const { blob, filename } = await api.reportPdf(rid, true);
      saveBlob(blob, filename);
    } catch (e) { toast(e.message); }
  };

  const worst = status?.documents?.find((d) => d.state === 'expired') || status?.documents?.find((d) => d.state === 'due_soon');
  const note = !status ? null
    : worst ? { tone: worst.state === 'expired' ? 'red' : 'red', text: (worst.state === 'expired' ? L.remind.expired : L.remind.due)(L.docs[worst.label] || worst.label) }
      : status.challans_pending ? { tone: 'red', text: L.remind.challans(status.challans_pending) }
        : { tone: 'ok', text: L.remind.clear };

  return (
    <>
      <header className="go-top">
        <button type="button" className="go-back" aria-label="Back" onClick={() => (window.history.length > 1 ? nav(-1) : nav('/go'))}>←</button>
        <span className="go-plate-chip">{reg}</span>
      </header>
      {phase === 'reading' ? (
        <main className="go-main" data-test="go-reading">
          <div className="go-scanplate">
            <div className="go-plate" style={{ marginTop: 18 }}><span className="ind"><i />IND</span><input readOnly value={reg} aria-label="Vehicle number" /></div>
            <div className="go-scanline" />
          </div>
          <div className="go-steps">
            {L.steps.map((s, i) => (
              <div key={s} className={`go-step ${i < stepN ? 'done' : i === stepN ? 'now' : 'wait'}`}><div className="s">{i < stepN ? '✓' : i === stepN ? '' : i + 1}</div>{s}</div>
            ))}
          </div>
          <div className="go-fact">💡 <b>{L.fact[0]}</b> {L.fact[1]}</div>
        </main>
      ) : !v && !g ? (
        <main className="go-main">
          <div className="go-note info" style={{ marginTop: 24 }}>⚠️ <span>{out?.error === 'vehicle_not_found' || out?.error === 'not_found' ? L.notFound : (out?.message || 'Something went wrong. Please try again.')}</span></div>
          <button type="button" className="go-start" onClick={() => nav('/go')}>{L.start}</button>
        </main>
      ) : (
        <main className="go-main with-actions" data-test="go-dashboard">
          <Dial score={status?.score ?? 0} />
          <div className="go-read" style={{ color: BAND_COLOUR[status?.band || 'attention'] }}>{status?.score ?? '—'}<small>{L.score}</small></div>
          {status?.band ? <div className="go-band" style={{ color: BAND_COLOUR[status.band] }}>● {L.band[status.band]}</div> : null}
          <div className="go-vname">{art} {name}<span>{[id.fuel, v?.rto?.office || v?.rto?.code || null].filter(Boolean).join(' · ')}</span></div>
          {g ? <div className="go-terms">{L.fromRecord}</div> : null}
          <div className="go-rows" data-test="go-rows">
            {(status?.documents || []).map((d) => (
              <div key={d.label} className="go-row"><div className={`go-ico ${TONE[d.state]}`}>{ICON[d.label] || '📄'}</div>{L.docs[d.label] || d.label}<span className={`v ${TEXT_TONE[d.state]}`}>{L.st[d.state]}</span></div>
            ))}
            <div className="go-row"><div className={`go-ico ${status?.challans_pending ? 'r' : status?.challans_pending === 0 ? 'g' : ''}`}>🚨</div>{L.challans}
              <span className={`v ${status?.challans_pending ? 't-r' : status?.challans_pending === 0 ? 't-g' : 't-m'}`}>{status?.challans_pending == null ? L.unknown : L.pending(status.challans_pending)}</span></div>
            {!paid ? <div className="go-row"><div className="go-ico">🔒</div>{L.locked}<span className="v t-m">{L.inReport}</span></div> : null}
          </div>
          {note ? <div className={`go-note ${note.tone}`}>{note.tone === 'ok' ? '✅' : '⏰'} <span>{note.text}</span></div> : null}
          {g ? <button type="button" className="go-btn line" style={{ width: '100%', marginTop: 12, height: 46 }} onClick={() => { nav(`/go/v/${reg}`, { replace: true, state: null }); window.location.reload(); }}>{L.refresh}</button> : null}
        </main>
      )}
      {phase === 'done' && (v || g) ? (
        <div className="go-actions">
          {paid ? (
            <>
              <a className="go-btn gold" href={`/chat?reg=${reg}`}>{L.open}<small>{L.openSub}</small></a>
              <button type="button" className="go-btn dark" onClick={pdf}>{L.pdf}<small>{L.pdfSub}</small></button>
            </>
          ) : (
            <>
              <button type="button" className="go-btn gold" onClick={buy} data-test="go-buy">{L.full} ₹{Math.round(price / 100)}<small>{L.fullSub}</small></button>
              <button type="button" className="go-btn dark" onClick={watch} data-test="go-watch">{L.watch}<small>{L.watchSub}</small></button>
            </>
          )}
        </div>
      ) : null}
      {buying ? <BuyDialog regNo={buying.reg} pricePaise={buying.price} onClose={() => setBuying(null)} onAlreadyBought={() => nav(`/chat?reg=${reg}`)} /> : null}
    </>
  );
}

/* ─────────────── /go/garage ─────────────── */
function GarageScreen({ askSignIn }) {
  const { L } = useT();
  const { me } = useSession();
  const nav = useNavigate();
  const [rows, setRows] = useState(null);
  useEffect(() => { journey({ step: 'go_garage', section: null }); if (me) api.vehicles().then((r) => setRows(r.rows || [])).catch(() => setRows([])); }, [me]);
  if (!me) return <SignedOut askSignIn={askSignIn} titleText={L.garage} />;
  return (
    <>
      <header className="go-top"><Logo /><LangChip /></header>
      <main className="go-main">
        <h1 className="go-title">{L.garage}</h1>
        <p>{rows ? L.garageSub(rows.length) : '…'}</p>
        {rows && !rows.length ? <div className="go-empty"><b>{L.garageEmpty[0]}</b>{L.garageEmpty[1]}</div> : null}
        {(rows || []).map((r) => {
          const s = r.status || {};
          const k = KIND_ART[r.kind] || (/M-?CYCLE|SCOOTER|2W/i.test(r.vehicle_class || '') ? '🏍️' : '🚗');
          return (
            <button key={r.reg_no} type="button" className="go-card" onClick={() => nav(`/go/v/${r.reg_no}`, { state: { row: r } })} data-test="go-car">
              <div className="art">{k}</div>
              <div className="info">
                <b>{[title(r.maker), r.model ? title(String(r.model).split(" ")[0]) : null].filter(Boolean).join(' ') || r.reg_no}</b>
                <div className="p">{r.reg_no}</div>
                <div className="go-dots">{(s.documents || []).map((d) => <i key={d.label} style={{ background: d.state === 'expired' ? '#ff5a4e' : d.state === 'due_soon' ? '#ffb020' : '#34d399' }} />)}
                  {s.challans_pending ? <i style={{ background: '#ff5a4e' }} /> : null}</div>
                {r.watched ? <span className="go-badge">{L.watched}</span> : null}{r.report_id ? <span className="go-badge" style={{ marginLeft: 6 }}>{L.reportOk}</span> : null}
              </div>
              <div className="sc" style={{ color: BAND_COLOUR[s.band || 'attention'] }}>{s.score ?? '—'}<small>{L.scoreLbl}</small></div>
            </button>
          );
        })}
        <Link to="/go" className="go-btn line" style={{ marginTop: 14, height: 52 }}>{L.addOne}</Link>
      </main>
    </>
  );
}

/* ─────────────── /go/reports ─────────────── */
function ReportsScreen({ askSignIn, toast }) {
  const { L } = useT();
  const { me } = useSession();
  const [rows, setRows] = useState(null);
  useEffect(() => { journey({ step: 'go_reports', section: null }); if (me) api.reports().then((r) => setRows(r.rows || [])).catch(() => setRows([])); }, [me]);
  if (!me) return <SignedOut askSignIn={askSignIn} titleText={L.reports} />;
  const get = async (id) => { try { const { blob, filename } = await api.reportPdf(id, true); saveBlob(blob, filename); } catch (e) { toast(e.message); } };
  return (
    <>
      <header className="go-top"><Logo /><LangChip /></header>
      <main className="go-main">
        <h1 className="go-title">{L.reports}</h1>
        <p>{rows ? `${rows.length}` : '…'}</p>
        {rows && !rows.length ? <div className="go-empty"><b>{L.reportsEmpty[0]}</b>{L.reportsEmpty[1]}</div> : null}
        {(rows || []).map((r) => (
          <div key={r.id} className="go-card">
            <div className="art">📄</div>
            <div className="info"><b>{r.reg_no}</b><div className="p">{r.report_number || ''}</div>
              {r.valid_until ? <span className="go-badge">{L.validTill} {day(r.valid_until)}</span> : null}</div>
            {r.downloadable !== false ? <button type="button" className="go-btn dark" style={{ height: 42, flex: 'none' }} onClick={() => get(r.id)}>⬇ {L.download}</button> : null}
          </div>
        ))}
      </main>
    </>
  );
}

/* ─────────────── /go/me ─────────────── */
function MeScreen({ askSignIn }) {
  const { L, lang, setLang } = useT();
  const { me, signOut } = useSession();
  const nav = useNavigate();
  const [nState, setNState] = useState('…');
  useEffect(() => { journey({ step: 'go_me', section: null }); notify.state().then(setNState).catch(() => setNState('unsupported')); }, []);
  if (!me) return <SignedOut askSignIn={askSignIn} titleText={L.me} />;
  const first = String(me.name || '').trim().split(/\s+/)[0] || 'GaadiPe';
  return (
    <>
      <header className="go-top"><Logo /><LangChip /></header>
      <main className="go-main">
        <div className="go-me"><div className="av">{first.slice(0, 1).toUpperCase()}</div>
          <div><b>{me.name || '—'}</b><span>+91 {String(me.mobile || '').slice(-10)}{me.email ? ` · ${me.email}` : ''}</span></div></div>
        <div className="go-list">
          {nState !== 'unsupported' ? (
            <button type="button" className="go-li" onClick={() => notify.enable().then(() => notify.state().then(setNState)).catch(() => {})}>🔔 {L.notif}<span>{nState === 'on' ? L.notifOn : L.notifOff}</span></button>
          ) : null}
          <button type="button" className="go-li" onClick={() => setLang(lang === 'hi' ? 'en' : 'hi')}>🌐 {L.lang}<span>{L.langNow}</span></button>
          <a className="go-li" href="/chat?open=profile">⚙️ {L.more}<span>›</span></a>
          <a className="go-li" href="/help">💬 {L.help}<span>›</span></a>
          <a className="go-li" href="/terms">📜 {L.policies}<span>›</span></a>
          <button type="button" className="go-li" onClick={async () => { await notify.disable().catch(() => {}); await signOut().catch(() => {}); nav('/go'); }}>↪ {L.signOut}</button>
        </div>
      </main>
    </>
  );
}

function SignedOut({ askSignIn, titleText }) {
  const { L } = useT();
  return (
    <>
      <header className="go-top"><Logo /><LangChip /></header>
      <main className="go-main">
        <h1 className="go-title">{titleText}</h1>
        <div className="go-empty"><b>🔐</b>{L.signInFor}</div>
        <button type="button" className="go-start" onClick={() => askSignIn(null, null)}>{L.signInBtn}</button>
      </main>
    </>
  );
}

/* ─────────────── the app shell ─────────────── */
export default function GoApp() {
  const { L } = useT();
  const loc = useLocation();
  const [sheet, setSheet] = useState(null);       // { reason, then }
  const [msg, setMsg] = useState('');
  const askSignIn = (reason, then) => setSheet({ reason, then });
  const toast = (m) => { setMsg(m); setTimeout(() => setMsg(''), 4200); };

  // The browser bar takes the dashboard's colour, as an installed app's does.
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const before = meta?.getAttribute('content');
    meta?.setAttribute('content', '#0b1116');
    const prevBg = document.body.style.background;
    document.body.style.background = '#05080b';
    // The ₹19 checkout dialog is drawn at the page's top level: dark while the app is open (go.css).
    document.body.classList.add('go-dark');
    return () => { if (meta && before) meta.setAttribute('content', before); document.body.style.background = prevBg; document.body.classList.remove('go-dark'); };
  }, []);

  const showTabs = !/^\/go\/v\//.test(loc.pathname);
  const tabs = useMemo(() => [['/go', '🔍', L.tabs[0], true], ['/go/garage', '🚗', L.tabs[1]], ['/go/reports', '📄', L.tabs[2]], ['/go/me', '👤', L.tabs[3]]], [L]);
  return (
    <div className="go-root">
      <div className="go-app">
        <Routes>
          <Route index element={<CheckScreen />} />
          <Route path="v/:reg" element={<VehicleScreen askSignIn={askSignIn} toast={toast} />} />
          <Route path="garage" element={<GarageScreen askSignIn={askSignIn} />} />
          <Route path="reports" element={<ReportsScreen askSignIn={askSignIn} toast={toast} />} />
          <Route path="me" element={<MeScreen askSignIn={askSignIn} />} />
          <Route path="*" element={<CheckScreen />} />
        </Routes>
        {showTabs ? (
          <nav className="go-tabs" aria-label="GaadiPe">
            {tabs.map(([to, icon, label, end]) => <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'on' : '')}><span>{icon}</span>{label}</NavLink>)}
          </nav>
        ) : null}
        {sheet ? <SignInSheet reason={sheet.reason} onClose={() => setSheet(null)} onDone={() => { const then = sheet.then; setSheet(null); then?.(); }} /> : null}
        {msg ? <div className="go-toast" role="status">{msg}</div> : null}
      </div>
    </div>
  );
}
