import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/* Static files plus one environment variable pointing at the gateway, so a
   laptop and the deployed site differ by configuration rather than by code. */
export default defineConfig({
  plugins: [react()],
  /* IN DEVELOPMENT THE API IS PROXIED (user, 2026-09-18). The page calls its own
     origin and Vite passes the call to the gateway, so the site works however it
     is opened — localhost, 127.0.0.1, a phone on the same Wi-Fi, a tunnel —
     without the gateway having to name each of those origins for CORS. A built
     site sets VITE_API_BASE and calls the gateway directly; this is dev only. */
  server: {
    port: 5174, strictPort: true, host: true,
    proxy: Object.fromEntries(["/site/api","/serverpe","/pay"].map((p) => [p, { target: process.env.VITE_PROXY_TARGET || 'http://localhost:5007', changeOrigin: false, xfwd: true }])),
  },
  preview: { port: 4174, strictPort: true },
  build: { outDir: 'dist', sourcemap: false },
});
