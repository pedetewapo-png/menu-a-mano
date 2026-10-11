import { expect, test } from '@playwright/test';
import { openScreen, startApp } from './helpers';

test('preferencias → menú → lista de la compra', async ({ page }) => {
  await startApp(page);

  // El menú generado tiene platos.
  const slot = page.locator('.slot:visible').first();
  const dish = slot.locator('.slot-name');
  await expect(dish).toBeVisible();
  const lockedName = await dish.innerText();

  // Un plato bloqueado sobrevive a regenerar.
  await slot.getByRole('button', { name: /^Bloquear / }).click();
  await expect(slot.getByText('Bloqueado', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Regenerar' }).click();
  await expect(page.getByText('Menú generado.')).toBeVisible();
  await expect(dish).toHaveText(lockedName);

  // La lista de la compra sale del menú y recuerda lo comprado.
  await openScreen(page, '#/compra', 'Lista de la compra');
  // Se localiza por su nombre: al marcarlo, el artículo baja al final de su sección.
  const label = await page.getByRole('checkbox', { name: /^Marcar .* como comprado$/ }).first().getAttribute('aria-label');
  const item = page.getByRole('checkbox', { name: label!, exact: true });
  await item.check();
  await expect(page.getByText(/^1 de \d+ comprados$/)).toBeVisible();

  // Todo se conserva al cerrar y volver a abrir.
  await page.reload();
  await expect(item).toBeChecked();
  await openScreen(page, '#/menu', 'Menú semanal');
  await expect(page.locator('.slot:visible').first().locator('.slot-name')).toHaveText(lockedName);
  await expect(page.locator('.slot:visible').first().getByText('Bloqueado', { exact: true })).toBeVisible();
});

test('cambiar un plato propone otro distinto', async ({ page }) => {
  await startApp(page);
  const slot = page.locator('.slot:visible').first();
  const before = await slot.locator('.slot-name').innerText();
  await slot.getByRole('button', { name: /^Cambiar / }).click();
  await expect(page.getByText(/^Plato cambiado por /)).toBeVisible();
  await expect(slot.locator('.slot-name')).not.toHaveText(before);
});

test('una exclusión nunca aparece en el menú', async ({ page }) => {
  await page.goto('/app/');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('searchbox', { name: 'Ingredientes que no quieres' }).fill('huevo');
  await page.getByRole('button', { name: /Añadir «Huevo»/ }).click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('button', { name: 'Crear mi primer menú' }).click();
  await expect(page.getByRole('heading', { name: 'Menú semanal' })).toBeVisible();

  // Ninguna receta con huevo se puede proponer: en el catálogo aparecen señaladas como no compatibles.
  await openScreen(page, '#/recetas', 'Recetas');
  const tortilla = page.locator('.recipe-card', { hasText: 'Tortilla de patatas' });
  await expect(tortilla.getByText(/No cumple tus preferencias/)).toBeVisible();

  await openScreen(page, '#/compra', 'Lista de la compra');
  await expect(page.getByRole('checkbox', { name: /Marcar Huevos? como comprado/ })).toHaveCount(0);
});

test('exportar y borrar los datos', async ({ page }) => {
  await startApp(page);
  await openScreen(page, '#/ajustes', 'Ajustes');

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar copia' }).click();
  expect((await download).suggestedFilename()).toMatch(/^menu-a-mano-\d{4}-\d{2}-\d{2}\.json$/);
  await expect(page.getByText(/^Última copia: /)).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Borrar todos los datos' }).click();
  // Sin datos, la app vuelve a la configuración inicial.
  await expect(page.getByRole('heading', { name: 'Vamos a preparar tu primer menú' })).toBeVisible();
});
