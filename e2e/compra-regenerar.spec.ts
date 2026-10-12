import { expect, test, type Page } from '@playwright/test';
import { openScreen, startApp } from './helpers';

/** Lo que hay que comprar, tal como se lee en pantalla. */
async function shoppingLines(page: Page): Promise<string[]> {
  await openScreen(page, '#/compra', 'Lista de la compra');
  await expect(page.locator('.shop-item').first()).toBeVisible();
  return page.locator('.shop-item').allInnerTexts();
}

/** Recetas del menú, en orden. */
async function menuRecipes(page: Page): Promise<string[]> {
  await openScreen(page, '#/menu', 'Menú semanal');
  await expect(page.locator('.slot-name').first()).toBeVisible();
  return page.evaluate(() => [...document.querySelectorAll('.slot-name')].map((e) => e.textContent ?? ''));
}

test('al regenerar el menú, la lista de la compra cambia con él', async ({ page }) => {
  await startApp(page);
  const menuBefore = await menuRecipes(page);
  const listBefore = await shoppingLines(page);

  await openScreen(page, '#/menu', 'Menú semanal');
  await page.getByRole('button', { name: 'Regenerar' }).click();
  await expect(page.getByText('Menú generado.')).toBeVisible();
  const menuAfter = await menuRecipes(page);
  expect(menuAfter, 'el menú debe cambiar al regenerar').not.toEqual(menuBefore);

  const listAfter = await shoppingLines(page);
  expect(listAfter, 'la lista debe cambiar con el menú').not.toEqual(listBefore);
});

test('la lista abierta en otra ventana también cambia, y lo marcado no la deja congelada', async ({ page, context }) => {
  await startApp(page);
  // Segunda ventana de la misma app, con la lista de la compra abierta y varias cosas marcadas.
  const other = await context.newPage();
  await other.goto('/app/#/compra');
  await expect(other.getByRole('heading', { level: 1, name: 'Lista de la compra' })).toBeVisible();
  const boxes = other.getByRole('checkbox', { name: /^Marcar .* como comprado$/ });
  await boxes.nth(0).check();
  await boxes.nth(1).check();
  const before = await other.locator('.shop-item').allInnerTexts();

  await page.getByRole('button', { name: 'Regenerar' }).click();
  await expect(page.getByText('Menú generado.')).toBeVisible();

  // Sin recargar ni tocar nada en la otra ventana.
  await expect.poll(() => other.locator('.shop-item').allInnerTexts(), { timeout: 5000 }).not.toEqual(before);
});
