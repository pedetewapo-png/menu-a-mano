import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** Abre la app recién instalada y completa la configuración inicial con los valores por defecto. */
export async function startApp(page: Page): Promise<void> {
  await page.goto('/app/');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('button', { name: 'Crear mi primer menú' }).click();
  await expect(page.getByRole('heading', { name: 'Menú semanal' })).toBeVisible();
}

/** Navega a una pantalla de la app sin recargar la página. */
export async function openScreen(page: Page, hash: string, heading: string | RegExp): Promise<void> {
  await page.evaluate((target) => {
    location.hash = target;
  }, hash);
  await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
}

/** Comprueba la página actual con axe (WCAG 2.2 AA) y que no haya desplazamiento horizontal. */
export async function expectAccessible(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const summary = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
  expect(summary, 'incumplimientos de accesibilidad').toEqual([]);

  // Se compara con el ancho real de la pantalla: en móvil, el navegador ensancha
  // la página por dentro cuando algo no cabe, y medir contra eso lo ocultaría.
  const contentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(contentWidth, 'ancho del contenido frente al de la pantalla').toBeLessThanOrEqual(page.viewportSize()!.width);
}
