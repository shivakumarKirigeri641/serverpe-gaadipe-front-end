import { useLang } from '../lib/i18n.jsx';

/**
 * The first thing a new visitor sees: which language.
 *
 * ASKED ONCE, IN BOTH LANGUAGES AT ONCE. The question itself is written in
 * English and Hindi side by side, because a question asked only in English is
 * a question some of the people it is for cannot read. After the first answer
 * it never appears again on that device; the header switch changes it later.
 *
 * Shown over the page rather than instead of it, so a crawler and a slow
 * connection still get the content underneath.
 */
export default function LanguageGate() {
  const { chosen, setLang } = useLang();
  if (chosen) return null;

  return (
    <div className="anim-in fixed inset-0 z-[80] flex items-center justify-center bg-ink/50 px-4 backdrop-blur-sm">
      <div className="card anim-pop w-full max-w-sm p-6 text-center shadow-pop">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-brand text-base font-bold text-white">GP</span>
        <h2 className="mt-4 text-lg font-semibold text-ink">Choose your language</h2>
        <p className="text-lg font-semibold text-ink">अपनी भाषा चुनें</p>

        <div className="mt-6 grid gap-3">
          <button className="btn-primary btn-big w-full" onClick={() => setLang('en')}>English</button>
          <button className="btn-primary btn-big w-full" onClick={() => setLang('hi')}>हिंदी</button>
        </div>

        <p className="mt-4 text-2xs text-muted">
          You can change it any time · इसे कभी भी बदल सकते हैं
        </p>
      </div>
    </div>
  );
}
