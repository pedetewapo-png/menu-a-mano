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

  // Con un segundo comensal, para ver cómo se indica de quién es cada restricción.
  await open('#/ajustes');
  await page.getByRole('button', { name: 'Añadir persona' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Nombre' }).fill('Ana');
  await dialog.getByRole('checkbox', { name: 'Gluten' }).check();
  await page.screenshot({ path: join(out, `${size}-comensal.png`) });
  await dialog.getByRole('button', { name: 'Guardar' }).click();

  // Con desayunos habituales, para ver el menú completo.
  await page.getByRole('checkbox', { name: /Fruta troceada con nueces/ }).check();
  // Sin gluten, porque el segundo comensal lo tiene excluido.
  await page.getByRole('checkbox', { name: /Yogur con plátano y nueces/ }).check();

  for (const [name, hash] of SCREENS) {
    await open(hash);
    await page.screenshot({ path: join(out, `${size}-${name}.png`) });
  }

  await open('#/cocinar/pisto?c=2');
  await page.screenshot({ path: join(out, `${size}-cocinar-ingredientes.png`) });
  await page.getByRole('button', { name: 'Empezar a cocinar' }).click();
  await page.screenshot({ path: join(out, `${size}-cocinar-paso.png`) });

  // Editor de recetas, con un par de ingredientes para ver las filas.
  await open('#/recetas/nueva');
  await page.getByRole('textbox', { name: 'Nombre de la receta' }).fill('Sopa de fideos de la abuela');
  for (const name of ['zanahoria', 'cebolla']) {
    await page.getByRole('searchbox', { name: 'Buscar ingrediente para añadir' }).fill(name);
    await page.getByRole('button', { name: `Añadir ${name}`, exact: true }).click();
  }
  await page.screenshot({ path: join(out, `${size}-editor.png`), fullPage: true });
  await context.close();
}
await browser.close();
console.log(`Capturas guardadas en ${out}`);
