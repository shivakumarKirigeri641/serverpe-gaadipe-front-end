import { useEffect } from 'react';
import { createPortal } from 'react-dom';

const TONES = {
  good: 'border-good-500/25 bg-good-50 text-good-700',
  wrong: 'border-wrong-500/25 bg-wrong-50 text-wrong-700',
  watch: 'border-watch-500/25 bg-watch-50 text-watch-700',
  info: 'border-line bg-shell text-body',
  brand: 'border-brand/20 bg-brand/5 text-brand-deep',
};

export const Banner = ({ tone = 'info', children, className = '' }) => (
  <div className={`rounded-lg border px-4 py-3 text-sm ${TONES[tone]} ${className}`}>{children}</div>
);

export const Chip = ({ tone = 'info', children }) => (
  <span className={`chip ${TONES[tone]}`}>{children}</span>
);

export const Field = ({ label, hint, children }) => (
  <label className="block">
    <span className="label">{label}</span>
    {children}
    {hint && <span className="mt-1.5 block text-2xs text-muted">{hint}</span>}
  </label>
);

export const Spinner = ({ label = 'Loading…' }) => (
  <div className="py-12 text-center text-sm text-muted">{label}</div>
);

export const Empty = ({ children, action }) => (
  <div className="card px-6 py-12 text-center">
    <p className="text-sm text-muted">{children}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export function Modal({ title, onClose, children, footer }) {
  useEffect(() => {
    const key = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);

  /*
   * FITS A PHONE (user, 2026-10-08: "the Full report pop-up goes out of the
   * mobile screen"). A tall box centred in a flex column overflows at the top
   * and bottom where it cannot be scrolled to. Now: never taller than the screen;
   * the title and the buttons stay put and only the middle scrolls. On a phone it
   * is a sheet from the bottom; from sm up, a centred box as before.
   */
  return createPortal((
    <div className="anim-in fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:px-4 sm:py-6"
      onClick={onClose}>
      <div className="card anim-pop flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-b-none shadow-pop sm:max-h-[90dvh] sm:rounded-b-2xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0 border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        {footer && (
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-line bg-shell/60 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  ), document.body);
}

/** Save a PDF the browser already holds. */
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function openBlob(blob) {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
