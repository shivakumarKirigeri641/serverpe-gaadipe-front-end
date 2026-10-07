import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useSession } from '../lib/session';
import { useLang } from '../lib/i18n.jsx';
import BuyDialog from '../components/BuyDialog.jsx';
import { saveBlob } from '../components/ui.jsx';

/**
 * THE GAADIPE CHAT (user, 2026-10-07: "a chat in the browser — better than
 * WhatsApp; the basic check without a phone number, then sign in for more; an
 * existing customer sees their WhatsApp conversation"). A full-screen, phone-
 * first page, installable as an app (public/manifest.webmanifest).
 *
 *   not signed in   a free basic check (back end: /site/api/chat/check — free
 *                   sources only, a few a day), then "sign in for more"
 *   signing in      mobile number → SMS code, inside the conversation
 *   signed in       "welcome back", their WhatsApp history above, checks run
 *                   as on /app/check; the full report opens the vehicle page
 *
 * Nothing about whether a number is a customer is said before its code is
 * verified (the sign-in answers every number the same).
 */

const T = {
  en: {
    hello: 'Namaste! 🙏 I’m GaadiPe. Send me any vehicle number — like *KA01AB1234* — and I’ll show its record. The basic check is *free*, no sign-in needed.',
    checking: (r) => `Checking *${r}* …`,
    placeholderPlate: 'Type a vehicle number…',
    placeholderMobile: 'Your 10-digit mobile number',
    placeholderCode: '6-digit code from SMS',
    askMobile: 'Sure! Your *mobile number*, please — I’ll send a one-time code by SMS. No password, no app.',
    badMobile: 'That doesn’t look like a 10-digit mobile number. Please try again.',
    codeSent: (m) => `✓ Code sent by SMS to *${m}*. Type it here.\n\n_Used GaadiPe on WhatsApp before? Your chat and reports will be here right after you verify._`,
    badCode: 'Please type the 6-digit code from the SMS.',
    signedIn: '✅ You’re signed in.',
    welcomeBack: (n) => `🎉 Welcome back${n ? `, *${n}*` : ''}!`,
    welcomeNew: '👋 Welcome to GaadiPe! Send any vehicle number to begin.',
    found: 'We found your GaadiPe history:',
    vehicles: (n) => `${n} vehicle${n === 1 ? '' : 's'} checked`,
    reports: (n) => `${n} full report${n === 1 ? '' : 's'}`,
    waDivider: 'Your WhatsApp chat with GaadiPe',
    nowHere: 'Now on gaadipe.in',
    loadEarlier: 'Load earlier messages',
    signInMore: 'Sign in for the full report, your history and alerts — it takes a few seconds.',
    fullReport: (p) => `Full report ${p}`,
    another: 'Check another',
    signIn: 'Sign in',
    home: 'Home',
    myVehicles: 'My vehicles',
    myReports: 'My reports',
    profile: 'Profile',
    howWorks: 'What do I get?',
    howAnswer: 'The *free check* shows the vehicle’s make, model and fuel, and how many things need attention.\n\nThe *full report* (₹19, GST invoice) shows insurance, PUC, road tax, fitness and permit dates, every challan with place and amount, loan (hypothecation), blacklist status and number of owners — as a PDF you can download.',
    attention: (n) => (n ? `⚠️ *${n} thing${n === 1 ? '' : 's'} need attention*` : '✅ *Nothing needs attention*'),
    expired: 'Expired', dueSoon: 'Due soon', challans: 'Pending challans',
    locked: 'In the full report',
    youHave: '📄 You have the full report for this vehicle.',
    open: 'Open report',
    trust: '🔒 VAHAN records via ULIP · Secure payments · Owner details masked',
    online: 'online',
    leftToday: (n) => `${n} free check${n === 1 ? '' : 's'} left today without signing in.`,
    invoices: 'Invoices',
    noVehicles: 'No vehicles yet. Send any vehicle number to check it.',
    noReports: 'No reports yet. Check a vehicle and get its full report for ₹19.',
    noInvoices: 'No invoices yet.',
    yourVehicles: (n) => `🚗 Your vehicles (${n})`,
    yourReports: (n) => `📄 Your reports (${n})`,
    yourInvoices: (n) => `🧾 Your invoices (${n})`,
    reportValid: (d) => `valid till ${d}`,
    reportExpired: 'download window ended',
    download: 'Download PDF',
    paidThanks: (r) => `✅ Payment received — thank you! Here is the full report for *${r}*.`,
    documents: 'Documents', challansH: 'Challans', ownership: 'Ownership & loan', fastag: 'FASTag',
    owners: (n) => `Owner no. ${n}`, loan: 'Loan', noLoan: 'No loan on record', blacklist: 'Blacklist',
    pendingAmt: (n, a) => `${n} pending · ${a}`, noChallans: 'No pending challans',
    daysLeft: (d) => (d < 0 ? `expired ${-d} days ago` : d === 0 ? 'expires today' : `${d} days left`),
    profileH: '👤 Your profile', mobileL: 'Mobile', nameL: 'Name', emailL: 'Email',
    offers: 'Tips & offers by SMS / email', signOut: 'Sign out', signedOut: 'You are signed out. Send any vehicle number for a free check.',
    vehicleBtn: 'Open',
  },
  hi: {
    hello: 'नमस्ते! 🙏 मैं GaadiPe हूँ। कोई भी गाड़ी नंबर भेजें — जैसे *KA01AB1234* — मैं उसका रिकॉर्ड दिखाऊँगा। बेसिक जाँच *मुफ़्त* है, साइन इन की ज़रूरत नहीं।',
    checking: (r) => `*${r}* की जाँच हो रही है…`,
    placeholderPlate: 'गाड़ी नंबर लिखें…',
    placeholderMobile: 'अपना 10 अंकों का मोबाइल नंबर',
    placeholderCode: 'SMS का 6 अंकों का कोड',
    askMobile: 'ज़रूर! अपना *मोबाइल नंबर* भेजें — मैं SMS से एक कोड भेजूँगा। कोई पासवर्ड नहीं, कोई ऐप नहीं।',
    badMobile: 'यह 10 अंकों का मोबाइल नंबर नहीं लगता। फिर से कोशिश करें।',
    codeSent: (m) => `✓ *${m}* पर SMS से कोड भेजा गया। उसे यहाँ लिखें।\n\n_पहले WhatsApp पर GaadiPe इस्तेमाल किया है? वेरिफ़ाई करते ही आपकी चैट और रिपोर्ट यहाँ होंगी।_`,
    badCode: 'कृपया SMS का 6 अंकों का कोड लिखें।',
    signedIn: '✅ आप साइन इन हो गए हैं।',
    welcomeBack: (n) => `🎉 वापसी पर स्वागत है${n ? `, *${n}*` : ''}!`,
    welcomeNew: '👋 GaadiPe में स्वागत है! शुरू करने के लिए कोई भी गाड़ी नंबर भेजें।',
    found: 'आपका GaadiPe इतिहास:',
    vehicles: (n) => `${n} गाड़ियाँ जाँचीं`,
    reports: (n) => `${n} पूरी रिपोर्ट`,
    waDivider: 'GaadiPe के साथ आपकी WhatsApp चैट',
    nowHere: 'अब gaadipe.in पर',
    loadEarlier: 'पुराने संदेश देखें',
    signInMore: 'पूरी रिपोर्ट, इतिहास और अलर्ट के लिए साइन इन करें — कुछ ही सेकंड लगते हैं।',
    fullReport: (p) => `पूरी रिपोर्ट ${p}`,
    another: 'दूसरी गाड़ी',
    signIn: 'साइन इन',
    home: 'होम',
    myVehicles: 'मेरी गाड़ियाँ',
    myReports: 'मेरी रिपोर्ट',
    profile: 'प्रोफ़ाइल',
    howWorks: 'मुझे क्या मिलेगा?',
    howAnswer: '*मुफ़्त जाँच* में गाड़ी का मेक, मॉडल, ईंधन और कितनी चीज़ों पर ध्यान चाहिए, यह दिखता है।\n\n*पूरी रिपोर्ट* (₹19, GST बिल) में बीमा, PUC, रोड टैक्स, फ़िटनेस, परमिट की तारीखें, हर चालान (जगह और राशि), लोन, ब्लैकलिस्ट और मालिकों की संख्या — PDF में।',
    attention: (n) => (n ? `⚠️ *${n} चीज़ों पर ध्यान चाहिए*` : '✅ *कुछ भी बाकी नहीं*'),
    expired: 'समाप्त', dueSoon: 'जल्द', challans: 'बाकी चालान',
    locked: 'पूरी रिपोर्ट में',
    youHave: '📄 इस गाड़ी की पूरी रिपोर्ट आपके पास है।',
    open: 'रिपोर्ट खोलें',
    trust: '🔒 ULIP से VAHAN रिकॉर्ड · सुरक्षित भुगतान · मालिक की जानकारी छिपी',
    online: 'ऑनलाइन',
    leftToday: (n) => `बिना साइन इन आज ${n} मुफ़्त जाँच बाकी।`,
    invoices: 'बिल',
    noVehicles: 'अभी कोई गाड़ी नहीं। जाँच के लिए कोई भी गाड़ी नंबर भेजें।',
    noReports: 'अभी कोई रिपोर्ट नहीं। गाड़ी जाँचें और ₹19 में पूरी रिपोर्ट लें।',
    noInvoices: 'अभी कोई बिल नहीं।',
    yourVehicles: (n) => `🚗 आपकी गाड़ियाँ (${n})`,
    yourReports: (n) => `📄 आपकी रिपोर्ट (${n})`,
    yourInvoices: (n) => `🧾 आपके बिल (${n})`,
    reportValid: (d) => `${d} तक मान्य`,
    reportExpired: 'डाउनलोड समय समाप्त',
    download: 'PDF डाउनलोड',
    paidThanks: (r) => `✅ भुगतान मिल गया — धन्यवाद! *${r}* की पूरी रिपोर्ट यह रही।`,
    documents: 'दस्तावेज़', challansH: 'चालान', ownership: 'मालिक और लोन', fastag: 'FASTag',
    owners: (n) => `मालिक क्रमांक ${n}`, loan: 'लोन', noLoan: 'कोई लोन दर्ज नहीं', blacklist: 'ब्लैकलिस्ट',
    pendingAmt: (n, a) => `${n} बाकी · ${a}`, noChallans: 'कोई चालान बाकी नहीं',
    daysLeft: (d) => (d < 0 ? `${-d} दिन पहले समाप्त` : d === 0 ? 'आज समाप्त' : `${d} दिन बाकी`),
    profileH: '👤 आपकी प्रोफ़ाइल', mobileL: 'मोबाइल', nameL: 'नाम', emailL: 'ईमेल',
    offers: 'SMS / ईमेल पर टिप्स और ऑफ़र', signOut: 'साइन आउट', signedOut: 'आप साइन आउट हो गए। मुफ़्त जाँच के लिए कोई भी गाड़ी नंबर भेजें।',
    vehicleBtn: 'खोलें',
  },
};

const STORE = 'gp.chat.v1';
const USED = 'gp.chat.used';
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const rupee = (p) => (p == null ? '₹19' : `₹${Math.round(p / 100)}`);
const cleanPlate = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const looksLikePlate = (s) => /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{3,4}$/.test(cleanPlate(s)) || /^\d{2}BH\d{4}[A-Z]{1,2}$/.test(cleanPlate(s));
const prettyPlate = (s) => {
  const p = cleanPlate(s);
  const m = p.match(/^([A-Z]{2})(\d{1,2})([A-Z]{0,3})(\d{1,4})$/);
  return m ? [m[1], m[2], m[3], m[4]].filter(Boolean).join(' ') : p;
};
const ten = (s) => String(s || '').replace(/\D/g, '').slice(-10);

/** *bold* inside a run of text (also inside _italic_). */
const bolds = (s) => String(s).split(/(\*[^*\n]+\*)/g).map((part, j) => (
  /^\*[^*]+\*$/.test(part) ? <b key={j} className="font-semibold">{part.slice(1, -1)}</b> : <span key={j}>{part}</span>));

/** WhatsApp-style *bold*, _italic_ and line breaks — as React nodes, never HTML. */
function Text({ text }) {
  const lines = String(text || '').split('\n');
  return lines.map((line, i) => (
    <span key={i}>
      {line.split(/(_[^_\n]+_)/g).map((part, j) => (
        /^_[^_]+_$/.test(part) ? <i key={j}>{bolds(part.slice(1, -1))}</i> : <span key={j}>{bolds(part)}</span>))}
      {i < lines.length - 1 && <br />}
    </span>
  ));
}

const time = (at) => {
  try { return new Date(at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\s+/g, ' ').toLowerCase(); }
  catch { return ''; }
};

export default function Chat() {
  const { me, ready, signIn, signOut, setMe } = useSession();
  const { lang, setLang } = useLang();
  const L = T[lang === 'hi' ? 'hi' : 'en'];
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORE) || '[]').filter((x) => x.kind !== 'typing'); } catch { return []; }
  });
  const [history, setHistory] = useState({ items: [], more: false, before: null, loaded: false });
  const [mode, setMode] = useState('plate');         // plate | mobile | code
  const [mobile, setMobile] = useState('');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingReg, setPendingReg] = useState(null);
  const [buying, setBuying] = useState(null);       // { reg, price } — the payment window over the chat
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const greeted = useRef(false);

  /* Remember the conversation on this device (not the history — that is read
     fresh). Paid reports, the profile and document lists are NOT kept on the
     device — a shared phone must not show them to the next person; they are
     reopened from the account. */
  useEffect(() => {
    const keep = items.filter((x) => x.kind !== 'typing').map((x) => {
      if (x.kind === 'vehicle' && x.paid) return { ...x, kind: 'text', from: 'bot', text: `📄 *${x.vehicle?.pretty || x.vehicle?.reg_no}* — full report`, chips: [`open:${x.vehicle?.reg_no}`], vehicle: undefined };
      if (['profile', 'reports', 'invoices', 'vehicles'].includes(x.kind)) return null;
      return x;
    }).filter(Boolean);
    try { localStorage.setItem(STORE, JSON.stringify(keep.slice(-60))); } catch { /* private mode */ }
  }, [items]);
  useEffect(() => { try { localStorage.setItem(USED, '1'); } catch { /* private mode */ } }, []);
  useEffect(() => { document.title = 'GaadiPe — Chat'; }, []);

  const scrollDown = useCallback(() => {
    requestAnimationFrame(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight; });
  }, []);
  useEffect(scrollDown, [items.length, scrollDown]);

  const push = useCallback((...list) => setItems((cur) => [...cur.filter((x) => x.kind !== 'typing'), ...list.map((x) => ({ id: uid(), at: new Date().toISOString(), ...x }))]), []);
  const typing = useCallback(() => setItems((cur) => [...cur.filter((x) => x.kind !== 'typing'), { id: 'typing', kind: 'typing', from: 'bot' }]), []);
  const bot = useCallback((text, extra = {}) => push({ from: 'bot', kind: 'text', text, ...extra }), [push]);

  /* First open: greet, once. Signed in: welcome back + their WhatsApp history. */
  useEffect(() => {
    if (!ready || greeted.current) return;
    greeted.current = true;
    if (me) welcome();
    else if (!items.length) bot(L.hello, { chips: ['howWorks'] });
    // A number brought from the home page (?reg=) is checked at once, then dropped from the address.
    const reg = cleanPlate(params.get('reg'));
    /* LOCAL DEVELOPMENT ONLY (?demo=full): the full-report card with sample data,
       to try its buttons without a live lookup. Never in a production build. */
    // ?demo=basic — a free-check card, to try "Full report ₹19" while the records server is down.
    if (import.meta.env.DEV && params.get('demo') === 'basic') {
      push({ from: 'bot', kind: 'vehicle', paid: false, signedIn: Boolean(me), price: 1900, vehicle: {
        reg_no: 'KA31N8147', pretty: 'KA 31 N 8147', identity: { maker: 'KIA INDIA', model: 'SELTOS D1.5 6AT HTX PLUS', fuel: 'Diesel', vehicle_class: 'Motor Car' },
        found: { needs_attention: 2, documents_total: 5, has_record: true },
        locked: ['Loan / hypothecation status', 'Blacklist and NOC status', 'Every challan, with its offence, place and amount'] } });
    }
    if (import.meta.env.DEV && params.get('demo') === 'full') {
      api.reports().then((r) => {
        const rep = (r.rows || []).find((x) => x.downloadable) || null;
        push({ from: 'bot', kind: 'vehicle', paid: true, report: rep, vehicle: DEMO_FULL });
      }).catch(() => {});
    }
    // Back from paying (?paid=REG): the report opens right here in the chat.
    const paid = cleanPlate(params.get('paid'));
    if ((reg && looksLikePlate(reg)) || paid) {
      const rest = new URLSearchParams(params); rest.delete('reg'); rest.delete('paid'); setParams(rest, { replace: true });
      if (paid && me) setTimeout(() => { bot(L.paidThanks(prettyPlate(paid))); openVehicle(paid); }, 600);
      else if (reg) setTimeout(() => check(reg), 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, me]);

  async function welcome({ justSignedIn = false } = {}) {
    try {
      const [s, h] = await Promise.all([api.chatSummary(), api.chatHistory()]);
      setHistory({ items: h.items || [], more: h.more, before: h.before, loaded: true });
      const any = s.vehicles || s.reports || s.whatsapp;
      const lines = any
        ? [L.welcomeBack(s.name ? String(s.name).split(/\s+/)[0] : ''), '', L.found,
          s.vehicles ? `• ${L.vehicles(s.vehicles)}` : null,
          s.reports ? `• ${L.reports(s.reports)}` : null].filter((x) => x !== null).join('\n')
        : L.welcomeNew;
      if (justSignedIn || !items.some((x) => x.kind === 'welcome')) {
        push({ from: 'bot', kind: 'welcome', text: lines, last: s.last_vehicle, chips: ['another', 'myVehicles', 'myReports'] });
      }
    } catch { /* the chat still works without it */ }
  }

  async function loadEarlier() {
    if (!history.before) return;
    const el = listRef.current; const h0 = el?.scrollHeight || 0;
    const h = await api.chatHistory(history.before).catch(() => null);
    if (!h) return;
    setHistory((cur) => ({ items: [...(h.items || []), ...cur.items], more: h.more, before: h.before, loaded: true }));
    requestAnimationFrame(() => { if (el) el.scrollTop = el.scrollHeight - h0; });
  }

  /* ────────────────────────────── what the customer sends ── */

  async function send(raw) {
    const text = String(raw ?? input).trim();
    if (!text || busy) return;
    setInput('');
    if (mode === 'mobile') return sendMobile(text);
    if (mode === 'code') return sendCode(text);
    if (looksLikePlate(text)) return check(text);
    // A mobile number typed in the vehicle box: they want to sign in.
    if (!me && /^[6-9]\d{9}$/.test(ten(text)) && String(text).replace(/\D/g, '').length >= 10) return sendMobile(text);
    push({ from: 'me', kind: 'text', text });
    bot(lang === 'hi'
      ? 'मैं गाड़ी नंबर समझता हूँ — जैसे *KA01AB1234*। या नीचे से कोई विकल्प चुनें।'
      : 'I understand vehicle numbers — like *KA01AB1234*. Or pick an option below.', { chips: ['howWorks'] });
  }

  async function check(raw) {
    const reg = cleanPlate(raw);
    push({ from: 'me', kind: 'text', text: prettyPlate(reg) });
    setBusy(true); typing();
    try {
      const out = me ? await api.check(reg) : await api.chatCheck(reg);
      if (out.error === 'sign_in_needed') { bot(out.message); setPendingReg(reg); startSignIn(); return; }
      if (out.error || !out.vehicle) { bot(`⚠️ ${out.message || 'Something went wrong. Please try again.'}`, { chips: ['another'] }); return; }
      push({ from: 'bot', kind: 'vehicle', vehicle: out.vehicle, paid: Boolean(out.report || out.vehicle.paid), report: out.report || null,
             price: out.price_paise, signedIn: Boolean(me), left: out.left_today });
    } catch (e) {
      bot(`⚠️ ${e.message}`, { chips: ['another'] });
    } finally { setBusy(false); }
  }

  function startSignIn(reg = null) {
    if (reg) setPendingReg(reg);
    setMode('mobile');
    bot(L.askMobile);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function sendMobile(text) {
    const m = ten(text);
    push({ from: 'me', kind: 'text', text: m.length === 10 ? `${m.slice(0, 5)} ${m.slice(5)}` : text });
    if (!/^[6-9]\d{9}$/.test(m)) { bot(L.badMobile); return; }
    setBusy(true); typing();
    try {
      const out = await api.requestCode(m);
      if (!out.ok) { bot(`⚠️ ${out.message}`); return; }
      setMobile(m); setMode('code');
      bot(L.codeSent(`${m.slice(0, 5)} ${m.slice(5)}`));
    } catch (e) { bot(`⚠️ ${e.message}`); } finally { setBusy(false); }
  }

  async function sendCode(text) {
    const code = String(text).replace(/\D/g, '');
    push({ from: 'me', kind: 'text', text: '••••••' });
    if (code.length < 4) { bot(L.badCode); return; }
    setBusy(true); typing();
    try {
      const out = await api.verifyCode(mobile, code, false, false);
      if (!out.ok) { bot(`⚠️ ${out.message}`); return; }
      await signIn(out.token, out.user);
      setMode('plate');
      bot(L.signedIn);
      await welcome({ justSignedIn: true });
      if (pendingReg) {
        push({ from: 'bot', kind: 'text', text: lang === 'hi' ? `*${prettyPlate(pendingReg)}* — आगे बढ़ें?` : `Continue with *${prettyPlate(pendingReg)}*?`,
               chips: [`open:${pendingReg}`, 'another'] });
        setPendingReg(null);
      }
    } catch (e) { bot(`⚠️ ${e.message}`); } finally { setBusy(false); }
  }

  /* ────────────── the account, inside the conversation (no other pages) ── */

  /** One vehicle as a card: the full report if they own one, else the free view. */
  async function openVehicle(reg) {
    setBusy(true); typing();
    try {
      const out = await api.vehicle(reg);
      if (out.error || !out.vehicle) { bot(`⚠️ ${out.message || 'Could not open that vehicle.'}`); return; }
      push({ from: 'bot', kind: 'vehicle', vehicle: out.vehicle, paid: Boolean(out.vehicle.paid), report: out.report || null,
             price: out.price_paise, signedIn: true });
    } catch (e) { bot(`⚠️ ${e.message}`); } finally { setBusy(false); }
  }

  async function showList(kind) {
    const label = { vehicles: L.myVehicles, reports: L.myReports, invoices: L.invoices }[kind];
    push({ from: 'me', kind: 'text', text: label });
    setBusy(true); typing();
    try {
      const out = await (kind === 'vehicles' ? api.vehicles() : kind === 'reports' ? api.reports() : api.invoices());
      const rows = out.rows || [];
      if (!rows.length) { bot({ vehicles: L.noVehicles, reports: L.noReports, invoices: L.noInvoices }[kind], { chips: ['another'] }); return; }
      push({ from: 'bot', kind, rows });
    } catch (e) { bot(`⚠️ ${e.message}`); } finally { setBusy(false); }
  }

  async function showProfile() {
    push({ from: 'me', kind: 'text', text: L.profile });
    setBusy(true); typing();
    try {
      const out = await api.me();
      push({ from: 'bot', kind: 'profile', user: out.user || out });
    } catch (e) { bot(`⚠️ ${e.message}`); } finally { setBusy(false); }
  }

  async function download(kind, row) {
    try {
      const { blob, filename } = await (kind === 'invoice' ? api.invoicePdf(row.id, true) : api.reportPdf(row.id, true));
      saveBlob(blob, filename);
    } catch (e) { bot(`⚠️ ${e.message}`); }
  }

  async function doSignOut() {
    await signOut().catch(() => {});
    setHistory({ items: [], more: false, before: null, loaded: false });
    setItems([]);
    bot(L.signedOut, { chips: ['howWorks'] });
  }

  /* ────────────────────────────── chips and buttons ── */

  function chip(key) {
    if (key === 'howWorks') { push({ from: 'me', kind: 'text', text: L.howWorks }); bot(L.howAnswer, { chips: ['another'] }); return; }
    if (key === 'another') { setMode('plate'); inputRef.current?.focus(); return; }
    if (key === 'signIn') { startSignIn(); return; }
    if (key === 'myVehicles') { showList('vehicles'); return; }
    if (key === 'myReports') { showList('reports'); return; }
    if (key === 'invoices') { showList('invoices'); return; }
    if (key === 'profile') { showProfile(); return; }
    if (key.startsWith('open:')) { push({ from: 'me', kind: 'text', text: prettyPlate(key.slice(5)) }); openVehicle(key.slice(5)); }
  }
  const chipLabel = (key) => (key.startsWith('open:') ? `🔓 ${prettyPlate(key.slice(5))}` : {
    howWorks: `❓ ${L.howWorks}`, another: `🔍 ${L.another}`, signIn: `🔐 ${L.signIn}`,
    myVehicles: `🚗 ${L.myVehicles}`, myReports: `📄 ${L.myReports}`, profile: `👤 ${L.profile}`, invoices: `🧾 ${L.invoices}`,
  }[key] || key);

  // The payment window opens over the chat; paying returns to /chat?paid=REG.
  function fullReport(reg, price) {
    if (me) setBuying({ reg, price });
    else { push({ from: 'me', kind: 'text', text: L.fullReport('').trim() }); startSignIn(reg); }
  }

  const quick = me ? ['another', 'myVehicles', 'myReports', 'invoices', 'profile'] : ['howWorks', 'signIn'];
  const placeholder = mode === 'mobile' ? L.placeholderMobile : mode === 'code' ? L.placeholderCode : L.placeholderPlate;
  const plateHint = mode === 'plate' && looksLikePlate(input);

  return (
    <div className="gp-chat-bg flex h-[100dvh] flex-col">
      {/* GaadiPe's own moving background (index.css) — clearly not WhatsApp. */}
      <div className="gp-glows" aria-hidden="true"><span className="a" /><span className="b" /><span className="c" /><span className="road" /></div>
      {/* The top bar: who you are talking to, why it can be trusted, a way home. */}
      <header className="z-10 bg-gradient-to-r from-[#0a4f49] via-[#0f766e] to-[#14a08f] text-white shadow-md"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-3 py-2.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-sm font-black text-[#0f766e] shadow">GP</div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="flex items-center gap-1 font-bold">GaadiPe
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#ffd84d]" fill="currentColor" aria-label="verified"><path d="M12 2l2.4 2.1 3.2-.4.9 3.1 2.8 1.6-1.2 3 1.2 3-2.8 1.6-.9 3.1-3.2-.4L12 22l-2.4-2.1-3.2.4-.9-3.1L2.7 15.6l1.2-3-1.2-3 2.8-1.6.9-3.1 3.2.4z"/><path d="M10.5 15.5l-3-3 1.4-1.4 1.6 1.6 4.6-4.6 1.4 1.4z" fill="#0f766e"/></svg>
            </div>
            <div className="text-[11px] text-white/80">{busy ? (lang === 'hi' ? 'लिख रहा है…' : 'typing…') : L.online}</div>
          </div>
          <button type="button" onClick={() => setLang(lang === 'hi' ? 'en' : 'hi')}
            className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold hover:bg-white/25">{lang === 'hi' ? 'EN' : 'हिं'}</button>
          <Link to="/?home=1" className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold hover:bg-white/25">{L.home} ↗</Link>
        </div>
        <div className="bg-black/15 px-3 py-1 text-center text-[10.5px] text-white/90">{L.trust}</div>
      </header>

      {/* The conversation. */}
      <main ref={listRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-2xl flex-col gap-2 px-3 py-4">
          {me && history.items.length > 0 && (
            <>
              {history.more && (
                <button type="button" onClick={loadEarlier} className="mx-auto rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-[#0f766e] shadow-sm">
                  ↑ {L.loadEarlier}
                </button>
              )}
              <Divider>{L.waDivider}</Divider>
              {history.items.map((h) => <Bubble key={`wa-${h.id}`} item={h} faded onChip={() => {}} chipLabel={(c) => c} L={L} />)}
              <Divider>{L.nowHere}</Divider>
            </>
          )}
          {items.map((it) => {
            if (it.kind === 'vehicle' && it.paid && it.vehicle?.paid) {
              return <FullCard key={it.id} it={it} L={L} onDownload={() => it.report && download('report', it.report)} onAnother={() => chip('another')} />;
            }
            if (it.kind === 'vehicle') {
              return <VehicleCard key={it.id} it={it} L={L} onFull={() => (it.paid ? openVehicle(it.vehicle.reg_no) : fullReport(it.vehicle.reg_no, it.price))} onAnother={() => chip('another')} />;
            }
            if (it.kind === 'vehicles') return <VehiclesList key={it.id} rows={it.rows} L={L} onOpen={(r) => chip(`open:${r}`)} />;
            if (it.kind === 'reports' || it.kind === 'invoices') {
              return <DocsList key={it.id} kind={it.kind} rows={it.rows} L={L} onDownload={(row) => download(it.kind === 'invoices' ? 'invoice' : 'report', row)} />;
            }
            if (it.kind === 'profile') {
              return <ProfileCard key={it.id} user={it.user} L={L} onSignOut={doSignOut}
                onPromo={async (agree) => { const out = await api.setPromoConsent(agree); setMe?.(out.user); return out.user; }} />;
            }
            return <Bubble key={it.id} item={it} onChip={chip} chipLabel={chipLabel} L={L} />;
          })}
        </div>
      </main>

      {/* Quick actions and the composer, above the keyboard. */}
      <footer className="border-t border-black/5 bg-white/95 backdrop-blur" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto max-w-2xl">
          <div className="flex gap-2 overflow-x-auto px-3 pt-2 [scrollbar-width:none]">
            {quick.map((k) => (
              <button key={k} type="button" data-test={`quick-${k}`} onClick={() => chip(k)}
                className="shrink-0 rounded-full border border-[#0f766e]/20 bg-[#0f766e]/5 px-3 py-1.5 text-xs font-semibold text-[#0a4f49] active:scale-95">
                {chipLabel(k)}
              </button>
            ))}
          </div>
          <form className="flex items-end gap-2 px-3 py-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <div className="relative flex-1">
              <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder={placeholder}
                inputMode={mode === 'plate' ? 'text' : 'numeric'} autoComplete={mode === 'mobile' ? 'tel' : mode === 'code' ? 'one-time-code' : 'off'}
                maxLength={mode === 'code' ? 6 : 20} disabled={busy}
                className={`w-full rounded-2xl border bg-[#f6f9f9] px-4 py-3 text-[15px] outline-none transition focus:border-[#0f766e] focus:bg-white ${mode === 'plate' ? 'uppercase tracking-wider' : 'tracking-widest'} placeholder:normal-case placeholder:tracking-normal ${plateHint ? 'border-[#12a150]' : 'border-black/10'}`} />
              {plateHint && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#12a150]">✓ {prettyPlate(input)}</span>}
            </div>
            <button type="submit" disabled={busy || !input.trim()} aria-label="Send"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#0f766e] text-white shadow-md transition active:scale-90 disabled:opacity-40">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M3 20.5l18-8.5L3 3.5v6.6l12 1.9-12 1.9z" /></svg>
            </button>
          </form>
        </div>
      </footer>

      {/* Paying: the declaration and checkout open over the chat (BuyDialog); the
          payment page returns to /chat?paid=REG, where the report opens. */}
      {buying && (
        <BuyDialog regNo={buying.reg} pricePaise={buying.price} onClose={() => setBuying(null)}
          onAlreadyBought={() => { setBuying(null); openVehicle(buying.reg); }} />
      )}
    </div>
  );
}

/* Sample data for ?demo=full in local development (see above). */
const DEMO_FULL = {
  reg_no: 'KA02EX1480', pretty: 'KA 02 EX 1480', paid: true,
  identity: { maker: 'MARUTI SUZUKI', model: 'SWIFT VXI', fuel: 'Petrol', vehicle_class: 'Motor Car', colour: 'Red', manufactured: '03/2019' },
  documents: [
    { label: 'insurance', name: 'Insurance', valid_until: '2027-03-14', days: 158, state: 'valid' },
    { label: 'puc', name: 'PUC (emission test)', valid_until: '2026-10-12', days: 5, state: 'due' },
    { label: 'tax', name: 'Road tax', valid_until: '2034-03-01', days: 2700, state: 'valid' },
    { label: 'fitness', name: 'Fitness', valid_until: '2026-01-10', days: -270, state: 'expired' },
  ],
  challans: { pending_count: 2, pending_amount_paise: 150000, pending: [
    { challan_no: 'KA1', offence: 'Over-speeding', place: 'Bengaluru', date: '2026-08-14', amount_paise: 100000, status: 'Pending' },
    { challan_no: 'KA2', offence: 'Wrong parking', place: 'Bengaluru', date: '2026-07-02', amount_paise: 50000, status: 'Pending' } ] },
  ownership: { owner_serial: 2, owner_masked: 'R***** K****', financer: 'HDFC BANK LTD', blacklist_status: null },
  fastag: { active: true, balance: 245 },
};

const inr = (p) => (p == null ? '—' : `₹${(Number(p) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
const day = (d) => { try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return d || ''; } };
const STATE = { expired: ['#c62828', '#fdecea'], due: ['#b26a00', '#fff4e0'], valid: ['#12813f', '#e7f6ec'] };

/** The full report, as a card in the conversation. */
function FullCard({ it, L, onDownload, onAnother }) {
  const v = it.vehicle || {};
  const id = v.identity || {};
  const docs = v.documents || [];
  const ch = v.challans || {};
  const own = v.ownership || {};
  const bad = docs.filter((d) => d.state !== 'valid').length + (ch.pending_count ? 1 : 0);
  return (
    <div className="anim-up flex flex-col items-start">
      <div className="w-[94%] max-w-md overflow-hidden rounded-2xl rounded-bl-md bg-white shadow-md">
        <div className="bg-gradient-to-br from-[#0f766e] to-[#0a4f49] p-3.5 text-white">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-md border-2 border-black bg-white px-2.5 py-0.5 font-mono text-[17px] font-black tracking-[2px] text-black shadow">{v.pretty || v.reg_no}</span>
            <span className="rounded-full bg-[#ffd84d] px-2.5 py-1 text-[11px] font-black text-[#0a4f49]">FULL REPORT</span>
          </div>
          <div className="mt-2 text-[15px] font-bold">{[id.maker, id.model].filter(Boolean).join(' · ')}</div>
          <div className="text-[12px] text-white/80">{[id.fuel, id.vehicle_class, id.colour, id.manufactured].filter(Boolean).join(' · ')}</div>
          <div className="mt-1 text-[12px] text-white/80">{bad ? `⚠️ ${bad} need attention` : '✅ All in order'}</div>
        </div>

        <Section title={`📋 ${L.documents}`}>
          {docs.map((d) => (
            <div key={d.label} className="flex items-center justify-between gap-2 py-1">
              <span className="text-[13px] text-[#0b2e2b]">{d.name || d.label}</span>
              <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ color: STATE[d.state]?.[0], background: STATE[d.state]?.[1] }}>
                {L.daysLeft(d.days)}{d.valid_until ? ` · ${day(d.valid_until)}` : ''}
              </span>
            </div>
          ))}
        </Section>

        <Section title={`🚨 ${L.challansH}`}>
          {ch.pending_count ? (
            <>
              <div className="text-[13px] font-bold text-[#c62828]">{L.pendingAmt(ch.pending_count, inr(ch.pending_amount_paise))}</div>
              {(ch.pending || []).slice(0, 6).map((c, i) => (
                <div key={c.challan_no || i} className="mt-1.5 rounded-lg bg-[#fdecea]/50 p-2 text-[12.5px]">
                  <div className="flex justify-between gap-2 font-semibold text-[#0b2e2b]"><span>{c.offence || 'Challan'}</span><span>{inr(c.amount_paise)}</span></div>
                  <div className="text-black/50">{[c.place, c.date ? day(c.date) : null, c.status].filter(Boolean).join(' · ')}</div>
                </div>
              ))}
            </>
          ) : <div className="text-[13px] font-semibold text-[#12813f]">✅ {L.noChallans}</div>}
        </Section>

        <Section title={`🏦 ${L.ownership}`}>
          {own.owner_serial != null && <Row k={L.owners(own.owner_serial)} v={own.owner_masked || ''} />}
          <Row k={L.loan} v={own.financer || L.noLoan} tone={own.financer ? 'due' : 'valid'} />
          {own.blacklist_status && <Row k={L.blacklist} v={own.blacklist_status} tone="expired" />}
        </Section>

        {v.fastag && (
          <Section title={`🛣 ${L.fastag}`}>
            <Row k={v.fastag.active ? 'Active' : 'Not active'} v={v.fastag.balance != null ? inr(Number(v.fastag.balance) * 100) : ''} tone={v.fastag.active ? 'valid' : 'expired'} />
          </Section>
        )}

        <div className="grid grid-cols-2 border-t border-black/5">
          <button type="button" data-test="full-download" onClick={onDownload} disabled={!it.report} className="gp-shine bg-[#ffd84d] py-3 text-[14px] font-black text-[#0a4f49] disabled:opacity-50">📄 {L.download}</button>
          <button type="button" data-test="full-another" onClick={onAnother} className="py-3 text-[14px] font-bold text-[#0f766e]">🔍 {L.another}</button>
        </div>
      </div>
    </div>
  );
}

const Section = ({ title, children }) => (
  <div className="border-t border-black/5 px-3.5 py-2.5">
    <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[#0f766e]">{title}</div>
    {children}
  </div>
);
const Row = ({ k, v, tone }) => (
  <div className="flex items-center justify-between gap-2 py-0.5 text-[13px]">
    <span className="text-black/60">{k}</span>
    <span className="text-right font-semibold" style={{ color: tone ? STATE[tone][0] : '#0b2e2b' }}>{v}</span>
  </div>
);

function VehiclesList({ rows, L, onOpen }) {
  return (
    <div className="anim-up flex flex-col items-start">
      <div className="w-[94%] max-w-md overflow-hidden rounded-2xl rounded-bl-md bg-white shadow-md">
        <div className="px-3.5 pt-3 text-[14px] font-bold text-[#0b2e2b]">{L.yourVehicles(rows.length)}</div>
        {rows.map((r) => (
          <button key={r.reg_no} type="button" data-test={`open-${r.reg_no}`} onClick={() => onOpen(r.reg_no)}
            className="flex w-full items-center gap-3 border-t border-black/5 px-3.5 py-2.5 text-left first-of-type:mt-2 active:bg-black/5">
            <span className="rounded border-2 border-black bg-white px-1.5 font-mono text-[12px] font-black tracking-wider text-black">{prettyPlate(r.reg_no)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-[#0b2e2b]">{[r.maker, r.model].filter(Boolean).join(' ') || '—'}</span>
              <span className="block text-[11.5px] text-black/50">
                {r.report_id ? '📄 Full report' : r.needs_attention ? `⚠️ ${r.needs_attention} need attention` : r.expired?.length ? `⚠️ ${r.expired.join(', ')}` : ''}
                {r.watched ? ' · 🔔 watched' : ''}
              </span>
            </span>
            <span className="text-[12px] font-bold text-[#0f766e]">{L.vehicleBtn} ›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function DocsList({ kind, rows, L, onDownload }) {
  const reports = kind === 'reports';
  return (
    <div className="anim-up flex flex-col items-start">
      <div className="w-[94%] max-w-md overflow-hidden rounded-2xl rounded-bl-md bg-white shadow-md">
        <div className="px-3.5 pt-3 text-[14px] font-bold text-[#0b2e2b]">{reports ? L.yourReports(rows.length) : L.yourInvoices(rows.length)}</div>
        {rows.map((r) => (
          <div key={r.id} className="mt-2 flex items-center gap-3 border-t border-black/5 px-3.5 py-2.5">
            <div className="grid h-10 w-9 shrink-0 place-items-center rounded-md bg-[#e53935] text-[10px] font-black text-white">PDF</div>
            <div className="min-w-0 flex-1 text-[12.5px]">
              <div className="truncate font-semibold text-[#0b2e2b]">{reports ? r.report_number : r.invoice_number}{r.reg_no ? ` · ${prettyPlate(r.reg_no)}` : ''}</div>
              <div className="text-black/50">
                {reports ? (r.downloadable ? L.reportValid(day(r.valid_until)) : L.reportExpired) : `${day(r.invoice_date)} · ${inr(r.total_paise)}`}
              </div>
            </div>
            <button type="button" data-test={`pdf-${r.id}`} onClick={() => onDownload(r)} disabled={!r.downloadable}
              className="shrink-0 rounded-full bg-[#0f766e] px-3 py-1.5 text-[11.5px] font-bold text-white disabled:opacity-40">⬇ PDF</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileCard({ user, L, onSignOut, onPromo }) {
  const [promo, setPromo] = useState(Boolean(user?.promo_consent));
  const [busy, setBusy] = useState(false);
  const m = String(user?.mobile || '').slice(-10);
  return (
    <div className="anim-up flex flex-col items-start">
      <div className="w-[94%] max-w-md overflow-hidden rounded-2xl rounded-bl-md bg-white shadow-md">
        <div className="px-3.5 pt-3 text-[14px] font-bold text-[#0b2e2b]">{L.profileH}</div>
        <div className="px-3.5 py-2">
          <Row k={L.nameL} v={user?.name || user?.display_name || '—'} />
          <Row k={L.mobileL} v={m ? `${m.slice(0, 5)} ${m.slice(5)}` : '—'} />
          <Row k={L.emailL} v={user?.email || '—'} />
          <label className="mt-2 flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-[#f3f7f6] px-3 py-2 text-[13px]">
            <span className="text-[#0b2e2b]">{L.offers}</span>
            <input type="checkbox" data-test="profile-offers" className="h-5 w-5 accent-[#0f766e]" checked={promo} disabled={busy}
              onChange={async (e) => {
                const agree = e.target.checked; setPromo(agree); setBusy(true);
                try { await onPromo(agree); } catch { setPromo(!agree); } finally { setBusy(false); }
              }} />
          </label>
        </div>
        <button type="button" data-test="signout" onClick={onSignOut} className="w-full border-t border-black/5 py-3 text-[14px] font-bold text-[#c62828]">↪ {L.signOut}</button>
      </div>
    </div>
  );
}

function Divider({ children }) {
  return (
    <div className="my-2 flex items-center gap-2 text-[11px] font-semibold text-[#0a4f49]/70">
      <span className="h-px flex-1 bg-[#0f766e]/15" /><span className="rounded-full bg-white/80 px-2.5 py-0.5 shadow-sm">{children}</span><span className="h-px flex-1 bg-[#0f766e]/15" />
    </div>
  );
}

function Bubble({ item, onChip, chipLabel, faded = false }) {
  const mine = item.from === 'me';
  if (item.kind === 'typing') {
    return (
      <div className="flex">
        <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm">
          {[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-[#0f766e]/60" style={{ animationDelay: `${i * 0.15}s` }} />)}
        </div>
      </div>
    );
  }
  if (item.kind === 'note') return <div className="mx-auto text-[11px] text-black/40">{item.text}</div>;
  const welcome = item.kind === 'welcome';
  return (
    <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'} ${faded ? 'opacity-75' : 'gp-pop'}`}>
      <div className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[14.5px] leading-snug shadow-sm ${mine
        ? 'gp-me rounded-br-md text-white'
        : welcome ? 'rounded-bl-md border border-[#ffd84d] bg-gradient-to-br from-white to-[#fff8d6] text-[#0b2e2b]'
          : 'gp-bot rounded-bl-md text-[#0b2e2b]'}`}>
        {item.label && <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0f766e]">📣 {item.label}</div>}
        {item.kind === 'file'
          ? <FileLine item={item} />
          : <Text text={item.text} />}
        <div className={`mt-0.5 text-right text-[10px] ${mine ? 'text-white/70' : 'text-black/35'}`}>{time(item.at)}{faded ? ' · WhatsApp' : ''}</div>
      </div>
      {item.chips?.length > 0 && (
        <div className={`mt-1.5 flex max-w-[90%] flex-wrap gap-1.5 ${mine ? 'justify-end' : ''}`}>
          {/* Old WhatsApp buttons are shown as plain labels — never tappable, never mistaken for real ones. */}
          {item.chips.map((c) => (faded
            ? <span key={c} className="rounded-full border border-black/10 bg-white/50 px-3 py-1 text-xs font-semibold text-black/40">{c}</span>
            : (
              <button key={c} type="button" data-test={`chip-${c}`} onClick={() => onChip(c)}
                className="rounded-full border border-[#0f766e]/30 bg-white px-3 py-1 text-xs font-semibold text-[#0f766e] shadow-sm active:scale-95">
                {chipLabel(c)}
              </button>
            )))}
        </div>
      )}
    </div>
  );
}

function FileLine({ item }) {
  const f = item.file || {};
  const href = f.type === 'report' ? '/app/reports' : f.type === 'invoice' ? '/app/invoices' : null;
  return (
    <div>
      <div className="flex items-center gap-2.5 rounded-xl bg-[#f3f7f6] p-2">
        <div className="grid h-10 w-9 shrink-0 place-items-center rounded-md bg-[#e53935] text-[10px] font-black text-white">PDF</div>
        <div className="min-w-0 text-[13px]"><Text text={item.text} /></div>
      </div>
      {href && <Link to={href} className="mt-1.5 block text-center text-[13px] font-semibold text-[#0f766e]">Open in GaadiPe ›</Link>}
    </div>
  );
}

/** The vehicle as a card — the free view, honest about what is locked. */
function VehicleCard({ it, L, onFull, onAnother }) {
  // A signed-in check of a vehicle they own a report for comes back full: open it in the chat.
  const v = it.vehicle || {};
  const id = v.identity || {};
  const f = v.found || {};
  const attention = f.needs_attention ?? ((f.expired?.length || 0) + (f.due_soon?.length || 0) + (f.challans_pending ? 1 : 0));
  const ring = attention === 0 ? '#12a150' : attention <= 2 ? '#eda100' : '#d92d20';
  return (
    <div className="anim-up flex flex-col items-start">
      <div className="w-[92%] max-w-sm overflow-hidden rounded-2xl rounded-bl-md bg-white shadow-md">
        <div className="bg-gradient-to-br from-[#0f766e] to-[#0a4f49] p-3.5 text-white">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-md border-2 border-black bg-white px-2.5 py-0.5 font-mono text-[17px] font-black tracking-[2px] text-black shadow">
              {v.pretty || v.reg_no}
            </span>
            <span className="grid h-11 w-11 place-items-center rounded-full text-[15px] font-black" style={{ background: `conic-gradient(${ring} 100%, transparent 0)` }}>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#0a4f49] text-white">{attention}</span>
            </span>
          </div>
          <div className="mt-2 text-[15px] font-bold">{[id.maker, id.model].filter(Boolean).join(' · ') || '—'}</div>
          <div className="text-[12px] text-white/80">{[id.fuel, id.vehicle_class].filter(Boolean).join(' · ')}</div>
        </div>
        <div className="space-y-1.5 p-3.5 text-[13.5px] text-[#0b2e2b]">
          {it.paid ? <div className="font-semibold text-[#12813f]">{L.youHave}</div> : (
            <>
              <div><Text text={L.attention(attention)} /></div>
              {f.expired?.length > 0 && <div className="text-[#c62828]">● {L.expired}: {f.expired.join(', ')}</div>}
              {f.due_soon?.length > 0 && <div className="text-[#b26a00]">● {L.dueSoon}: {f.due_soon.join(', ')}</div>}
              {f.challans_pending > 0 && <div className="text-[#c62828]">● {L.challans}: {f.challans_pending}</div>}
              {v.locked?.length > 0 && (
                <div className="mt-2 rounded-xl bg-[#f3f7f6] p-2.5">
                  <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[#0f766e]">🔒 {L.locked}</div>
                  {v.locked.slice(0, 5).map((x) => <div key={x} className="text-[12.5px] text-black/60">• {x}</div>)}
                </div>
              )}
            </>
          )}
        </div>
        <div className="grid grid-cols-2 border-t border-black/5">
          <button type="button" data-test="card-full" onClick={onFull} className="gp-shine bg-[#ffd84d] py-3 text-[14px] font-black text-[#0a4f49] active:brightness-95">
            {it.paid ? `📄 ${L.open}` : `🔓 ${L.fullReport(rupee(it.price))}`}
          </button>
          <button type="button" data-test="card-another" onClick={onAnother} className="py-3 text-[14px] font-bold text-[#0f766e] active:bg-black/5">🔍 {L.another}</button>
        </div>
      </div>
      {!it.signedIn && !it.paid && (
        <div className="mt-1.5 max-w-[88%] rounded-xl bg-white/80 px-3 py-2 text-[12px] text-[#0a4f49] shadow-sm">
          {L.signInMore}{typeof it.left === 'number' ? ` ${L.leftToday(it.left)}` : ''}
        </div>
      )}
    </div>
  );
}
