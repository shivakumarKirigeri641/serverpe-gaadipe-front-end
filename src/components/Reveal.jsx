import { useEffect, useRef, useState } from 'react';

/**
 * Show this when it scrolls into view.
 *
 * WHY AN OBSERVER AND NOT A SCROLL HANDLER: a scroll listener runs on every
 * pixel of every scroll, on a phone, for the whole page. IntersectionObserver
 * asks the browser to tell us once, which is the difference between a page that
 * animates and a page that stutters.
 *
 * Once shown, it stays shown and the observer is dropped: content that fades
 * out again when scrolled past is a page fighting its reader.
 */
export default function Reveal({ children, delay = 0, className = '', as: Tag = 'div' }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    // No observer (old browser, or a test runner): show it and move on. Content
    // that depends on an API to become visible is content that can disappear.
    if (typeof IntersectionObserver === 'undefined') { setShown(true); return undefined; }

    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setShown(true); io.disconnect(); }
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });

    io.observe(el);

    /*
     * THE SAFETY NET. Content that is invisible until an event fires can be
     * invisible for ever if that event never fires — a browser that reports an
     * element as never intersecting, a page printed rather than scrolled, a
     * screenshot taken of the whole document at once. Two seconds after mount
     * everything shows regardless: an animation that did not play is a small
     * loss, a page of blank space is not.
     */
    const failsafe = setTimeout(() => { setShown(true); io.disconnect(); }, 2000);

    return () => { clearTimeout(failsafe); io.disconnect(); };
  }, []);

  return (
    <Tag ref={ref} className={`reveal ${shown ? 'shown' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </Tag>
  );
}
