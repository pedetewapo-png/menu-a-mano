import { expect, test } from '@playwright/test';
import { expectAccessible, openScreen, startApp } from './helpers';

test('página de entrada', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Menú a Mano' })).toBeVisible();
  await expectAccessible(page);
});

test('configuración inicial, paso a paso', async ({ page }) => {
  await page.goto('/app/');
  await expect(page.getByRole('heading', { name: 'Cómo comes' })).toBeVisible();
  await expectAccessible(page);
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await expect(page.getByRole('heading', { name: 'Qué evitas' })).toBeVisible();
  await expectAccessible(page);
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await expect(page.getByRole('heading', { name: 'Tu semana' })).toBeVisible();
  await expectAccessible(page);
});

test('pantallas principales', async ({ page }) => {
  await startApp(page);
  await expectAccessible(page);

  await openScreen(page, '#/recetas', 'Recetas');
  await expectAccessible(page);

  await openScreen(page, '#/recetas/pisto', 'Pisto');
  await expectAccessible(page);

  await openScreen(page, '#/compra', 'Lista de la compra');
  await expectAccessible(page);

  await openScreen(page, '#/ajustes', 'Ajustes');
  await expectAccessible(page);
});

test('diálogo de opciones de una comida', async ({ page }) => {
  await startApp(page);
  await page.locator('.slot:visible').first().getByRole('button', { name: /^Más opciones/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expectAccessible(page);

  // Se maneja con teclado: Escape lo cierra.
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});
