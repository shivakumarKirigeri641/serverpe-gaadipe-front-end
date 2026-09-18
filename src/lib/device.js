/*
 * What this browser says about itself, sent with a sign-in so the account's
 * history shows which device was used (user, 2026-09-18).
 *
 * The device id is a random value kept in this browser: it identifies "the
 * same phone again", nothing more, and clearing site data resets it. Nothing
 * here reads the device's contents or asks for a permission.
 */
const KEY = 'gaadipe.device';

export function deviceId() {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      const rand = (crypto.randomUUID && crypto.randomUUID()) || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
      id = `gp-${rand}`;
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return null;   // private window or blocked storage: the sign-in still works
  }
}

/* Chrome keeps the phone's model and OS version out of the user agent now, but
   gives them to the page on request. Asked once, remembered for the visit. */
let hints = null;
function askHints() {
  if (hints || !navigator.userAgentData?.getHighEntropyValues) return;
  hints = navigator.userAgentData
    .getHighEntropyValues(['model', 'platformVersion', 'fullVersionList'])
    .then((h) => ({ model: h.model || null, platform: h.platform || null, platformVersion: h.platformVersion || null,
                    mobile: h.mobile, brands: (h.fullVersionList || []).map((b) => `${b.brand} ${b.version}`).join(', ') }))
    .catch(() => null);
}
askHints();

export async function clientInfo() {
  const n = navigator;
  const s = window.screen || {};
  const conn = n.connection || {};
  let tz = null;
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { /* old browser */ }
  return {
    device_id: deviceId(),
    screen: s.width ? `${s.width}x${s.height} @${window.devicePixelRatio || 1}x` : null,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    timezone: tz,
    languages: (n.languages || [n.language]).filter(Boolean).join(', '),
    platform: n.userAgentData?.platform || n.platform || null,
    touch_points: n.maxTouchPoints ?? null,
    cpu_cores: n.hardwareConcurrency ?? null,
    memory_gb: n.deviceMemory ?? null,
    connection: conn.effectiveType ? `${conn.effectiveType}${conn.downlink ? ` · ${conn.downlink} Mbps` : ''}` : null,
    referrer: document.referrer || null,
    page: window.location.pathname,
    hints: hints ? await hints : null,
  };
}
