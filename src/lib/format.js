/**
 * format.js — how the site writes numbers, money, dates and plates.
 * The same rules as the admin panel, so the two never disagree in front of a
 * customer who has seen both.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const rupees = (paise, { decimals = false } = {}) =>
  `₹${(Number(paise || 0) / 100).toLocaleString('en-IN', {
    minimumFractionDigits: decimals ? 2 : 0, maximumFractionDigits: decimals ? 2 : 0 })}`;

export const date = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—'
    : `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

export const ago = (v) => {
  if (!v) return '—';
  const s = Math.round((Date.now() - new Date(v).getTime()) / 1000);
  if (Number.isNaN(s)) return '—';
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  return d < 30 ? `${d} day${d === 1 ? '' : 's'} ago` : date(v);
};

/** "expired 4 months ago", "in 12 days" — how a person says it. */
export const human = (days) => {
  if (days === null || days === undefined) return '';
  const n = Math.abs(days);
  const unit = n >= 365 ? `${Math.round(n / 365)} year${Math.round(n / 365) === 1 ? '' : 's'}`
    : n >= 45 ? `${Math.round(n / 30)} months`
    : `${n} day${n === 1 ? '' : 's'}`;
  if (days < 0) return `expired ${unit} ago`;
  if (days === 0) return 'expires today';
  return `${unit} left`;
};

export const plate = (reg) => {
  const s = String(reg || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const m = /^([A-Z]{2})(\d{1,2})([A-Z]{0,3})(\d{1,4})$/.exec(s);
  return m ? m.slice(1).filter(Boolean).join(' ') : s;
};

export const mobile = (m) => {
  const s = String(m || '').replace(/\D/g, '').slice(-10);
  return s.length === 10 ? `${s.slice(0, 5)} ${s.slice(5)}` : (m || '');
};

export const titleCase = (s) => String(s || '')
  .toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase());

/** Commercial vehicles carry a yellow board; it is how a plate is recognised. */
export const isCommercial = (vehicleClass) =>
  /TRANSPORT|GOODS|PASSENGER|TAXI|BUS|TRUCK|LORRY|MAXI|TRAILER/i.test(String(vehicleClass || ''));
