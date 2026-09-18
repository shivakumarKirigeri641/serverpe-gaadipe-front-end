import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import obfuscator from 'vite-plugin-javascript-obfuscator';

/*
 * THE PRODUCTION BUILD IS OBFUSCATED (user, 2026-09-18). Our own code — not
 * React or the libraries — is turned into something very hard to read, so
 * following the page's decryption step in the browser's debugger takes hours
 * rather than minutes. Build only: development stays readable. No source maps
 * are published. Settings chosen to keep the site fast: no control-flow
 * flattening or dead-code injection, which slow a phone down for little gain.
 */
const obfuscate = obfuscator({
  apply: 'build',
  include: [/src\/.*\.(js|jsx)$/],
  exclude: [/node_modules/],
  options: {
    compact: true,
    identifierNamesGenerator: 'hexadecimal',
    renameGlobals: false,
    stringArray: true,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 0.75,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    splitStrings: false,
    transformObjectKeys: false,
    controlFlowFlattening: false,
    deadCodeInjection: false,
    selfDefending: false,
    debugProtection: false,
    unicodeEscapeSequence: false,
    sourceMap: false,
  },
});

/* Static files plus one environment variable pointing at the gateway, so a
   laptop and the deployed site differ by configuration rather than by code. */
export default defineConfig({
  plugins: [react(), obfuscate],
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
