import { defineConfig } from '@playwright/test';

const DEV = 'http://localhost:5173';
const BUILT = 'http://localhost:4173';

// Las pruebas usan el Edge instalado en el equipo, así que no hay que descargar navegadores.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: true,
  reporter: [['list']],
  // El servidor de desarrollo compila cada página la primera vez que se pide; con todas
  // las pruebas arrancando a la vez, esa primera carga puede tardar más de lo habitual.
  expect: { timeout: 15_000 },
  use: {
    channel: 'msedge',
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    // Sin transiciones: si la comprobación de contraste coincide con un botón a medio
    // cambiar de color, falla aunque el color final sea correcto.
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'ordenador',
      testIgnore: /compilada/,
      use: { baseURL: DEV, viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'movil',
      testIgnore: /compilada/,
      use: { baseURL: DEV, viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true },
    },
    {
      // Versión compilada: la única con service worker, necesaria para probar el uso sin conexión.
      name: 'compilada',
      testMatch: /compilada/,
      use: { baseURL: BUILT, viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: [
    {
      command: 'npm run dev -- --port 5173 --strictPort',
      url: `${DEV}/app/`,
      reuseExistingServer: true,
    },
    {
      command: 'npm run build && npm run preview -- --port 4173 --strictPort',
      url: `${BUILT}/app/`,
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
});
