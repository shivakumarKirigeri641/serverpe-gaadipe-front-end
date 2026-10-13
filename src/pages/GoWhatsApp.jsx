import { useEffect } from 'react';
import { waLink, WHATSAPP } from '../lib/api';

/**
 * gaadipe.in/wa — STRAIGHT INTO THE WHATSAPP CHAT (user, 2026-10-13: Jio TrueConnect would
 * not whitelist a wa.me link for the DLT SMS). The SMS carries this address on GaadiPe's
 * own domain instead; it opens WhatsApp at once with "Hi" typed (waLink adds the visitor's
 * code, so the chat is tied to this visit and its source, e.g. ?utm_source=sms). A button
 * stays for the phone that blocks the jump.
 */
export default function GoWhatsApp() {
  const link = waLink('Hi');
  useEffect(() => { window.location.replace(link); }, [link]);
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0a4f49', color: '#fff', fontFamily: 'system-ui, sans-serif', padding: 24, textAlign: 'center' }}>
      <div>
        <div style={{ fontSize: 44 }}>💬</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '12px 0 6px' }}>Opening GaadiPe on WhatsApp…</h1>
        <p style={{ opacity: 0.85, margin: '0 0 20px' }}>Just press Send — “Hi” is already typed.</p>
        <a href={link} style={{ display: 'inline-block', background: '#ffd84d', color: '#0a4f49', fontWeight: 800, padding: '14px 26px', borderRadius: 14, textDecoration: 'none' }}>
          Open WhatsApp
        </a>
        <p style={{ opacity: 0.7, fontSize: 13, marginTop: 14 }}>+{WHATSAPP.slice(0, 2)} {WHATSAPP.slice(2, 7)} {WHATSAPP.slice(7)}</p>
      </div>
    </div>
  );
}
