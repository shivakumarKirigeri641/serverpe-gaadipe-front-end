import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n.jsx';
import Layout from '../components/Layout.jsx';
import WhatsAppCta from '../components/WhatsAppCta.jsx';

/**
 * FEEDBACK FROM A LINK (user, 2026-09-30): gaadipe.in/feedback, sent in
 * broadcasts. Tap the stars, write a line if you like, send — no sign-in. Name
 * is optional and no number is asked for (user, 2026-09-30); `?src=broadcast` (or status, invoice, …) records
 * where the link was shared. Everything lands on the admin Feedback page and
 * in the admin email, beside WhatsApp feedback.
 */
const PAGE = {
  en: {
    h: 'How was GaadiPe for you?',
    sub: 'Tap the stars — it takes ten seconds. Every message is read.',
    words: ['Poor', 'Not great', 'Okay', 'Good', 'Excellent'],
    pick: 'Choose from 1 to 5 stars.',
    more: 'Tell us more (optional)',
    morePh: { low: 'What went wrong? We will try to put it right.', high: 'What did you like? What should we add?' },
    name: 'Your name (optional)',
    send: 'Send feedback',
    consent: 'By sending, you agree that we may show your first name, rating and message on gaadipe.in. Nothing else about you is ever shown.',
    sending: 'Sending…',
    thanksH: 'Thank you! 🙏',
    thanksB: 'Your feedback has reached us. It helps make GaadiPe better for everyone.',
    thanksLow: 'We are sorry it was not better — we will work on what you told us.',
    again: 'Check a vehicle on WhatsApp',
  },
  hi: {
    h: 'GaadiPe आपको कैसा लगा?',
    sub: 'सितारे चुनिए — बस दस सेकंड लगेंगे। हर संदेश पढ़ा जाता है।',
    words: ['ख़राब', 'ठीक नहीं', 'ठीक-ठाक', 'अच्छा', 'बहुत बढ़िया'],
    pick: '1 से 5 सितारे चुनिए।',
    more: 'और बताइए (वैकल्पिक)',
    morePh: { low: 'क्या गड़बड़ हुई? हम ठीक करने की कोशिश करेंगे।', high: 'क्या अच्छा लगा? हमें और क्या जोड़ना चाहिए?' },
    name: 'आपका नाम (वैकल्पिक)',
    send: 'फ़ीडबैक भेजें',
    consent: 'भेजकर आप सहमति देते हैं कि हम आपका पहला नाम, रेटिंग और संदेश gaadipe.in पर दिखा सकते हैं। आपके बारे में और कुछ कभी नहीं दिखाया जाता।',
    sending: 'भेजा जा रहा है…',
    thanksH: 'धन्यवाद! 🙏',
    thanksB: 'आपका फ़ीडबैक हमें मिल गया। इससे GaadiPe सबके लिए बेहतर बनता है।',
    thanksLow: 'माफ़ कीजिए कि अनुभव बेहतर नहीं रहा — आपकी बात पर हम काम करेंगे।',
    again: 'WhatsApp पर वाहन चेक करें',
  },
};

export default function Feedback() {
  const { lang } = useLang();
  const p = PAGE[lang] || PAGE.en;
  const [params] = useSearchParams();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [trap, setTrap] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const shown = hover || rating;
  const submit = async (e) => {
    e.preventDefault();
    if (!rating) { setError(p.pick); return; }
    setBusy(true); setError('');
    try {
      await api.feedback({ rating, message, name, src: params.get('src') || '', website: trap });
      setDone(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally { setBusy(false); }
  };

  return (
    <Layout>
      <div className="mx-auto w-full max-w-lg py-8 sm:py-12">
        {done ? (
          <div className="card anim-up p-6 text-center sm:p-8">
            <div className="text-5xl" aria-hidden="true">{rating >= 4 ? '🎉' : '🙏'}</div>
            <h1 className="mt-3 text-2xl font-bold text-ink">{p.thanksH}</h1>
            <p className="mt-2 text-body">{p.thanksB}</p>
            {rating <= 2 && <p className="mt-2 text-sm text-muted">{p.thanksLow}</p>}
            <div className="mt-2 text-2xl text-watch-500" aria-label={`${rating} / 5`}>{'★'.repeat(rating)}<span className="text-line">{'★'.repeat(5 - rating)}</span></div>
            <WhatsAppCta className="mt-6 w-full" />
          </div>
        ) : (
          <form onSubmit={submit} className="card anim-up p-5 sm:p-8" noValidate>
            <h1 className="text-2xl font-bold text-ink">{p.h}</h1>
            <p className="mt-1.5 text-sm text-body">{p.sub}</p>

            {/* The stars: big enough for a thumb, and a word for what each means. */}
            <div className="mt-6 flex justify-between gap-1 sm:justify-center sm:gap-3" role="radiogroup" aria-label={p.pick}
              onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} — ${p.words[n - 1]}`}
                  onClick={() => { setRating(n); setError(''); }} onMouseEnter={() => setHover(n)}
                  className="grid h-14 w-14 place-items-center rounded-full text-4xl leading-none transition-transform duration-150 hover:scale-110 active:scale-95 sm:h-16 sm:w-16 sm:text-5xl"
                  style={{ color: n <= shown ? '#f5a623' : '#d7dfdd', textShadow: n <= shown ? '0 2px 8px rgba(245,166,35,.35)' : 'none' }}>
                  ★
                </button>
              ))}
            </div>
            <p className="mt-2 h-5 text-center text-sm font-semibold text-ink" aria-live="polite">{shown ? p.words[shown - 1] : ''}</p>

            <label className="mt-5 block">
              <span className="text-sm font-semibold text-ink">{p.more}</span>
              <textarea className="input mt-1.5 min-h-[110px] w-full resize-y" maxLength={1000} value={message}
                placeholder={rating && rating <= 3 ? p.morePh.low : p.morePh.high} onChange={(e) => setMessage(e.target.value)} />
            </label>

            <label className="mt-4 block">
              <span className="text-sm text-body">{p.name}</span>
              <input className="input mt-1.5 w-full" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </label>

            {/* A field no person sees: a bot that fills it is quietly ignored. */}
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={trap}
              onChange={(e) => setTrap(e.target.value)} style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, opacity: 0 }} />

            {error && <p className="mt-4 rounded-lg bg-wrong-50 px-3 py-2 text-sm text-wrong-700" role="alert">{error}</p>}

            <button className="btn-primary btn-big mt-6 w-full" disabled={busy}>{busy ? p.sending : p.send}</button>
            {/* The consent a testimonial needs (user, 2026-09-30, DPDP). */}
            <p className="mt-3 text-center text-2xs text-muted">{p.consent}</p>
          </form>
        )}
      </div>
    </Layout>
  );
}
