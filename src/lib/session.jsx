import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, getToken, setToken, onSignedOut, tokenReady } from './api';

/**
 * Who is signed in.
 *
 * The site is useful to a stranger, so nothing waits on this: the public pages
 * render immediately and only the account area holds for `ready`.
 */
const Ctx = createContext(null);

export function SessionProvider({ children }) {
  const [me, setMe] = useState(null);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    // The saved sign-in is sealed on the device (lib/vault.js): unseal it first.
    await tokenReady.catch(() => {});
    if (!getToken()) { setMe(null); setReady(true); return; }
    try {
      const out = await api.session();
      setMe(out.user);
    } catch { setMe(null); } finally { setReady(true); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => onSignedOut(() => setMe(null)), []);

  const signIn = useCallback(async (token, user) => {
    setToken(token);
    // A fresh sign-in asks for the email again if it is still missing (EmailCard.jsx).
    try { sessionStorage.removeItem('gaadipe.emailPrompt.dismissed'); } catch { /* private mode */ }
    setMe(user);
  }, []);

  const signOut = useCallback(async () => {
    try { await api.signOut(); } catch { /* the token is going either way */ }
    setToken(null);
    setMe(null);
  }, []);

  return (
    <Ctx.Provider value={{ me, ready, signIn, signOut, reload: load, setMe }}>
      {children}
    </Ctx.Provider>
  );
}

export const useSession = () => useContext(Ctx);
