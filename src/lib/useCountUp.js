import { useEffect, useRef, useState } from 'react';

/**
 * Count a number up when it first appears.
 *
 * WHY A PRICE IS WORTH ANIMATING and most numbers are not: the eye follows
 * movement, and ₹19 is the single figure this page is trying to get read. A
 * dashboard full of counting numbers is a fairground; one is emphasis.
 *
 * Honours prefers-reduced-motion by landing on the final value immediately —
 * and does the same when the tab is hidden, so somebody returning to the tab
 * does not find a number mid-count.
 */
export default function useCountUp(target, { durationMs = 900, start = true } = {}) {
  const end = Number(target) || 0;
  const [value, setValue] = useState(end);
  const frame = useRef(0);

  useEffect(() => {
    const reduced = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (!start || reduced || !end || document.hidden) { setValue(end); return undefined; }

    const from = 0;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / durationMs);
      // Ease out: fast at first, settling on the number rather than arriving
      // at it abruptly.
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(from + (end - from) * eased));
      if (p < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [end, durationMs, start]);

  return value;
}
