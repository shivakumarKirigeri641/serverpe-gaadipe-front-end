import { useEffect } from 'react';
import { waLink } from '../lib/api';
import { useLang } from '../lib/i18n.jsx';
import Layout from '../components/Layout.jsx';
import WhatsAppCta from '../components/WhatsAppCta.jsx';

/**
 * Where /login and /app/* land while the web account is hidden (WEB_LOGIN off).
 *
 * Those addresses still exist in old emails, bookmarks and search results. A
 * blank redirect to the home page would lose the person; this says in one line
 * where everything went, and opens the chat. The redirect is a nudge, not a
 * trap — the button is there for the browser that refuses it.
 */
export default function OnWhatsApp() {
  const { t } = useLang();

  useEffect(() => {
    const id = setTimeout(() => { window.location.href = waLink('Hi'); }, 1200);
    return () => clearTimeout(id);
  }, []);

  return (
    <Layout>
      <div className="mx-auto max-w-md py-6 text-center">
        <h1 className="text-2xl font-bold text-ink">{t('onwa.h')}</h1>
        <p className="mt-3 text-body">{t('onwa.b')}</p>
        <WhatsAppCta className="mt-6 w-full" showNumber />
        <p className="mt-4 text-2xs text-muted">{t('onwa.note')}</p>
      </div>
    </Layout>
  );
}
