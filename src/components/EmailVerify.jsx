import { useState } from 'react';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n.jsx';

/**
 * AN EMAIL, CONFIRMED WITH A CODE (user, 2026-10-07: "mail must be mandatory, with
 * verification, before pay"). Type the address → "Send code" → the six digits
 * from the inbox → "Verify". The server checks the address can receive mail
 * first ("did you mean …@gmail.com?"). Used in the payment window and the Profile.
 *
 *   email, onEmail       the address being typed (the parent owns it)
 *   verifiedEmail        the account's confirmed address, if any
 *   onVerified(user)     the account, once confirmed
 */
const W = {
  en: { send: 'Send code', sending: 'Sending…', code: '6-digit code from the email', verify: 'Verify', verifying: 'Checking…',
    sent: (e) => `Code sent to ${e}. Check the inbox (and Spam).`, ok: '✅ Email confirmed', change: 'Change',
    use: (s) => `Use ${s}`, again: 'Send again', dev: 'Testing: the code is in the server’s log, not emailed.' },
  hi: { send: 'कोड भेजें', sending: 'भेज रहे हैं…', code: 'ईमेल में आया 6 अंकों का कोड', verify: 'पुष्टि करें', verifying: 'जाँच रहे हैं…',
    sent: (e) => `कोड ${e} पर भेजा गया। इनबॉक्स (और Spam) देखें।`, ok: '✅ ईमेल की पुष्टि हो गई', change: 'बदलें',
    use: (s) => `${s} रखें`, again: 'फिर भेजें', dev: 'टेस्टिंग: कोड सर्वर लॉग में है, ईमेल नहीं हुआ।' },
};

export default function EmailVerify({ email, onEmail, verifiedEmail, onVerified, inputClass = 'input', dataTest = 'ev' }) {
  const { lang } = useLang();
  const w = W[lang === 'hi' ? 'hi' : 'en'];
  const [stage, setStage] = useState('email');          // email | code
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);                // { tone, text, suggestion }
  const clean = String(email || '').trim().toLowerCase();
  const confirmed = Boolean(verifiedEmail) && clean === String(verifiedEmail).toLowerCase();
  const shape = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(clean);

  const send = async (addr = clean) => {
    setBusy(true); setNote(null);
    try {
      const out = await api.emailCode(addr);
      if (addr !== clean) onEmail(addr);
      setStage('code'); setCode('');
      setNote({ tone: 'good', text: `${w.sent(addr)}${out.dev ? ` ${w.dev}` : ''}` });
    } catch (e) { setNote({ tone: 'bad', text: e.message, suggestion: e.body?.suggestion || null }); }
    finally { setBusy(false); }
  };
  const verify = async () => {
    setBusy(true); setNote(null);
    try { const out = await api.emailVerify(clean, code); setStage('email'); setNote(null); onVerified?.(out.user); }
    catch (e) { setNote({ tone: 'bad', text: e.message }); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input className={`${inputClass} min-w-0 flex-1`} type="email" inputMode="email" autoCapitalize="none" autoComplete="email" maxLength={160}
          value={email} disabled={stage === 'code'} data-test={`${dataTest}-email`}
          onChange={(e) => { onEmail(e.target.value); setNote(null); }} placeholder="you@gmail.com" />
        {confirmed ? <span className="self-center whitespace-nowrap text-[12px] font-bold text-[#0a6c34]">{w.ok}</span>
          : stage === 'email'
            ? <button type="button" data-test={`${dataTest}-send`} disabled={busy || !shape} onClick={() => send()}
                className="whitespace-nowrap rounded-xl bg-[#0f766e] px-3 text-[13px] font-bold text-white disabled:opacity-40">{busy ? w.sending : w.send}</button>
            : <button type="button" disabled={busy} onClick={() => { setStage('email'); setNote(null); }}
                className="whitespace-nowrap rounded-xl border border-black/10 px-3 text-[12px] font-bold text-[#0b2e2b]">{w.change}</button>}
      </div>
      {stage === 'code' ? (
        <div className="flex gap-2">
          <input className={`${inputClass} min-w-0 flex-1 tracking-[0.3em]`} inputMode="numeric" autoComplete="one-time-code" maxLength={6}
            value={code} data-test={`${dataTest}-code`} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder={w.code} />
          <button type="button" data-test={`${dataTest}-verify`} disabled={busy || code.length !== 6} onClick={verify}
            className="whitespace-nowrap rounded-xl bg-[#0f766e] px-3 text-[13px] font-bold text-white disabled:opacity-40">{busy ? w.verifying : w.verify}</button>
        </div>) : null}
      {note ? (
        <div className={`rounded-lg px-3 py-2 text-[12.5px] ${note.tone === 'good' ? 'bg-[#f3f7f6] text-[#0b2e2b]' : 'bg-[#fdecec] text-[#912018]'}`}>
          {note.text}
          {stage === 'code' && note.tone === 'good' ? <button type="button" className="ml-2 underline" disabled={busy} onClick={() => send()}>{w.again}</button> : null}
          {note.suggestion ? <button type="button" className="mt-1.5 block rounded-full bg-[#0f766e] px-3 py-1 text-[12px] font-bold text-white" onClick={() => send(note.suggestion)}>✓ {w.use(note.suggestion)}</button> : null}
        </div>) : null}
    </div>
  );
}
