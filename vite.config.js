import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/* Static files plus one environment variable pointing at the gateway, so a
   laptop and the deployed site differ by configuration rather than by code. */
export default defineConfig({
  plugins: [react()],
  server: { port: 5174, strictPort: true },
  preview: { port: 4174, strictPort: true },
  build: { outDir: 'dist', sourcemap: false },
});
