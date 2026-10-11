// Captura las pantallas principales en tamaño de móvil y de ordenador, para revisarlas
// de un vistazo. Necesita el servidor de desarrollo en marcha. Uso: npm run screenshots
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const out = join(import.meta.dirname, '..', 'test-results', 'screens');
mkdirSync(out, { recursive: true });

const SIZES = {
  movil: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  ordenador: { viewport: { width: 1280, height: 800 } },
};
const SCREENS = [
  ['menu', '#/menu'],
  ['recetas', '#/recetas'],
  ['receta', '#/recetas/pisto'],
  ['compra', '#/compra'],
  ['ajustes', '#/ajustes'],
];

const browser = await chromium.launch({ channel: 'msedge' });
for (const [size, options] of Object.entries(SIZES)) {
  const context = await browser.newContext({ ...options, locale: 'es-ES' });
  const page = await context.newPage();

  await page.goto(`${BASE}/`);
  await page.screenshot({ path: join(out, `${size}-entrada.png`) });

  await page.goto(`${BASE}/app/`);
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('button', { name: 'Crear mi primer menú' }).click();
  await page.getByRole('heading', { name: 'Menú semanal' }).waitFor();

  const open = async (hash) => {
    await page.evaluate((target) => {
      location.hash = target;
    }, hash);
    await page.waitForTimeout(400);
  };

  // Con desayunos habituales, para ver el menú completo.
  await open('#/ajustes');
  await page.getByRole('checkbox', { name: /Fruta troceada con nueces/ }).check();
  await page.getByRole('checkbox', { name: /Tostadas con tomate y aceite/ }).check();

  for (const [name, hash] of SCREENS) {
    await open(hash);
    await page.screenshot({ path: join(out, `${size}-${name}.png`) });
  }

  await open('#/cocinar/pisto?c=2');
  await page.screenshot({ path: join(out, `${size}-cocinar-ingredientes.png`) });
  await page.getByRole('button', { name: 'Empezar a cocinar' }).click();
  await page.screenshot({ path: join(out, `${size}-cocinar-paso.png`) });
  await context.close();
}
await browser.close();
console.log(`Capturas guardadas en ${out}`);
