import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

// En GitHub Pages el sitio cuelga de /<repositorio>/; se indica con BASE_PATH.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
  },
  plugins: [react(), VitePWA({
    registerType: 'prompt',
    injectRegister: false,
    includeAssets: ['icons/*.svg', 'icons/*.png'],
    manifest: {
      name: 'Menú a Mano',
      short_name: 'Menú a Mano',
      description: 'Planifica el menú de la semana y genera la lista de la compra.',
      lang: 'es',
      dir: 'ltr',
      // El ámbito es todo el sitio para que la página de instalación pueda
      // lanzar el diálogo; la app instalada arranca siempre en /app/.
      scope: base,
      start_url: `${base}app/`,
      id: `${base}app/`,
      display: 'standalone',
      background_color: '#faf8f3',
      theme_color: '#2f6f4e',
      categories: ['food', 'lifestyle', 'productivity'],
      icons: [
        { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
      navigateFallback: null,
      cleanupOutdatedCaches: true,
    },
  })],
  build: {
    rollupOptions: {
      input: {
        landing: resolve(import.meta.dirname, 'index.html'),
        app: resolve(import.meta.dirname, 'app/index.html'),
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});