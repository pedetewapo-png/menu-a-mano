import { expect, test } from '@playwright/test';
import { expectAccessible, openScreen, startApp } from './helpers';

test('catálogo revisado: sin aviso de borrador y con aviso de etiqueta en las recetas veganas', async ({ page }) => {
  await startApp(page);

  // El pan puede llevar leche según la marca: la receta lo avisa a quien la quiere vegana.
  await openScreen(page, '#/recetas/tostadas-con-tomate-y-aceite', 'Tostadas con tomate y aceite');
  await expect(page.getByText('Para que sea vegana, comprueba en la etiqueta que no lleven huevo ni leche: pan.')).toBeVisible();
  await expectAccessible(page);

  // Una receta vegana sin productos que dependan de la marca no lleva ese aviso.
  await openScreen(page, '#/recetas/pisto', 'Pisto');
  await expect(page.getByText(/Para que sea vegana/)).toHaveCount(0);
  // El aviso general de alérgenos se mantiene siempre.
  await expect(page.getByText(/Comprueba siempre las etiquetas/)).toBeVisible();

  // Con todas las recetas revisadas, Ajustes ya no dice que el catálogo es un borrador.
  await openScreen(page, '#/ajustes', 'Ajustes');
  await expect(page.getByText(/El catálogo es un borrador/)).toHaveCount(0);
  await expect(page.getByText(/no ha sido revisado por profesionales sanitarios/)).toBeVisible();
});
