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

  return createPortal((
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/40 px-4 py-8"
      onClick={onClose}>
      <div className="card w-full max-w-md shadow-pop" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
        </div>
        <div className="space-y-4 px-5 py-4">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-shell/60 px-5 py-3">
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
