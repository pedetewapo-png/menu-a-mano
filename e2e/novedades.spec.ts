import { expect, test } from '@playwright/test';
import { expectAccessible, openScreen, startApp } from './helpers';

test('desayunos: se eligen los habituales y aparecen en el menú y en la compra', async ({ page }) => {
  await startApp(page);
  // Sin desayunos elegidos, el menú no tiene esa fila.
  await expect(page.locator('.slot:visible', { hasText: 'Desayuno' })).toHaveCount(0);

  await openScreen(page, '#/ajustes', 'Ajustes');
  await page.getByRole('checkbox', { name: /Fruta troceada con nueces/ }).check();
  await page.getByRole('checkbox', { name: /Tostadas con tomate y aceite/ }).check();
  await expectAccessible(page);

  await openScreen(page, '#/menu', 'Menú semanal');
  const breakfast = page.locator('.slot:visible', { hasText: 'Desayuno' }).first();
  await expect(breakfast.locator('.slot-name')).toHaveText(/Fruta troceada con nueces|Tostadas con tomate y aceite/);
  await expectAccessible(page);
  // Aunque se eligieron de uno en uno, los dos se alternan a lo largo de la semana.
  const week = await page.locator('.slot', { hasText: 'Desayuno' }).locator('.slot-name').allTextContents();
  expect(week).toHaveLength(7);
  expect(new Set(week)).toEqual(new Set(['Fruta troceada con nueces', 'Tostadas con tomate y aceite']));

  await openScreen(page, '#/compra', 'Lista de la compra');
  await expect(page.getByRole('checkbox', { name: 'Marcar Nueces peladas como comprado' })).toBeVisible();

  // Al quitarlos, desaparecen del menú y de la compra.
  await openScreen(page, '#/ajustes', 'Ajustes');
  await page.getByRole('checkbox', { name: /Fruta troceada con nueces/ }).uncheck();
  await page.getByRole('checkbox', { name: /Tostadas con tomate y aceite/ }).uncheck();
  await openScreen(page, '#/compra', 'Lista de la compra');
  await expect(page.getByRole('checkbox', { name: 'Marcar Nueces peladas como comprado' })).toHaveCount(0);
});

test('nota en una comida: se ve en la tarjeta y sobrevive al cambiar el plato', async ({ page }) => {
  await startApp(page);
  const slot = page.locator('.slot:visible').first();
  await slot.getByRole('button', { name: /^Más opciones/ }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Llevar al trabajo' }).click();
  await dialog.getByRole('button', { name: 'Cerrar' }).click();
  await expect(slot.locator('.slot-note')).toHaveText('Llevar al trabajo');

  await slot.getByRole('button', { name: /^Cambiar / }).click();
  await expect(page.getByText(/^Plato cambiado por /)).toBeVisible();
  await expect(slot.locator('.slot-note')).toHaveText('Llevar al trabajo');

  // Una nota escrita a mano se guarda con Intro, y se puede quitar.
  await slot.getByRole('button', { name: /^Más opciones/ }).click();
  await dialog.getByRole('textbox', { name: 'Nota' }).fill('Vienen los abuelos');
  await dialog.getByRole('textbox', { name: 'Nota' }).press('Enter');
  await dialog.getByRole('button', { name: 'Cerrar' }).click();
  await expect(slot.locator('.slot-note')).toHaveText('Vienen los abuelos');

  await slot.getByRole('button', { name: /^Más opciones/ }).click();
  await dialog.getByRole('button', { name: 'Quitar nota' }).click();
  await dialog.getByRole('button', { name: 'Cerrar' }).click();
  await expect(slot.locator('.slot-note')).toHaveCount(0);
});

test('modo cocina: ingredientes, pasos uno a uno y salida', async ({ page }) => {
  await startApp(page);
  await openScreen(page, '#/recetas/pisto', 'Pisto');
  await page.getByRole('link', { name: 'Cocinar', exact: true }).click();

  // Primero, los ingredientes con las cantidades para los comensales elegidos.
  await expect(page.getByRole('heading', { name: 'Antes de empezar' })).toBeVisible();
  await expect(page.getByText('Cantidades para 2 comensales.')).toBeVisible();
  await page.getByRole('checkbox', { name: /calabacín/ }).check();
  await expectAccessible(page);

  await page.getByRole('button', { name: 'Empezar a cocinar' }).click();
  await expect(page.getByRole('heading', { name: 'Paso 1 de 4' })).toBeVisible();
  await expect(page.getByText('Corta todas las verduras en dados pequeños.')).toBeVisible();
  await expectAccessible(page);

  // Se avanza con el botón o con las flechas del teclado.
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await expect(page.getByRole('heading', { name: 'Paso 2 de 4' })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('heading', { name: 'Paso 3 de 4' })).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('heading', { name: 'Paso 2 de 4' })).toBeVisible();

  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('button', { name: 'Terminar' }).click();
  await expect(page.getByRole('heading', { name: '¡Listo!' })).toBeVisible();

  await page.getByRole('button', { name: 'Salir' }).last().click();
  await expect(page.getByRole('heading', { level: 1, name: 'Pisto' })).toBeVisible();
});

test('la app se usa en una pestaña y ofrece instalarse desde Ajustes', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Abrir Menú a Mano' }).click();
  await expect(page.getByRole('heading', { name: 'Vamos a preparar tu primer menú' })).toBeVisible();

  await startApp(page);
  await openScreen(page, '#/ajustes', 'Ajustes');
  await expect(page.getByRole('heading', { name: 'Instalar la app' })).toBeVisible();
});
