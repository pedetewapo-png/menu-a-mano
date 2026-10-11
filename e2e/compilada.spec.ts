import { expect, test } from '@playwright/test';
import { openScreen, startApp } from './helpers';

test('funciona sin conexión tras la primera carga', async ({ page, context }) => {
  await page.goto('/app/');
  // El service worker termina de guardar la app en el dispositivo durante la primera visita.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });

  // A partir de aquí, sin red: la app se abre desde lo guardado.
  await context.setOffline(true);
  await startApp(page);

  await openScreen(page, '#/recetas/pisto', 'Pisto');
  await openScreen(page, '#/compra', 'Lista de la compra');
  await expect(page.getByRole('checkbox', { name: /^Marcar .* como comprado$/ }).first()).toBeVisible();

  // Al recargar sin red, los datos siguen ahí.
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Lista de la compra' })).toBeVisible();
});

test('el manifiesto permite instalar la app', async ({ page, request, baseURL }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifest = await (await request.get(new URL(href!, baseURL).toString())).json();
  expect(manifest.display).toBe('standalone');
  expect(manifest.start_url).toMatch(/app\/$/);
  expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual(
    expect.arrayContaining(['192x192', '512x512']),
  );
});
