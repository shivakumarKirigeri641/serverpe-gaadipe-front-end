/**
 * src/lib/pixel.js — THE META PIXEL (user, 2026-10-22: Meta could only aim the ads at "the page loaded";
 * told what a visit led to, it can find people who check vehicles, sign in and buy, and show the ad again
 * to visitors who left).
 *
 * Off unless the build sets VITE_META_PIXEL_ID (Events Manager → the GaadiPe dataset's id). Sends only
 * what the visit led to — never a vehicle number, a mobile, an email or a report:
 *   PageView              each page
 *   ViewContent           a free check answered
 *   Lead                  a sign-in code asked for
 *   CompleteRegistration  signed in
 *   Purchase              a payment completed, with its amount in rupees
 * The privacy policy names Meta and the Meta Pixel (back end, migration 204). A failure is ignored —
 * the site never waits on, or breaks because of, its advertising tag.
 */

const ID = String(import.meta.env.VITE_META_PIXEL_ID || '').trim();

function load() {
  if (!ID || typeof window === 'undefined' || window.fbq) return;
  /* eslint-disable */
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;
  s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */
  window.fbq('init', ID);
}

const fire = (...args) => { try { load(); if (window.fbq) window.fbq(...args); } catch { /* never break the page */ } };

export const pixelPage = () => ID && fire('track', 'PageView');
export const pixelChecked = () => ID && fire('track', 'ViewContent', { content_category: 'free_check' });
export const pixelCodeAsked = () => ID && fire('track', 'Lead');
export const pixelSignedIn = () => ID && fire('track', 'CompleteRegistration');
// Once per payment: a reload of the page they came back to must not count it twice.
export function pixelPaid(rupees, key) {
  if (!ID || !(Number(rupees) > 0)) return;
  try { const k = `gp.px.paid.${key}`; if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, '1'); } catch { /* private mode */ }
  fire('track', 'Purchase', { value: Number(rupees), currency: 'INR' });
}
