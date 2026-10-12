import { expect, test } from '@playwright/test';
import { expectAccessible, openScreen, startApp } from './helpers';

test('calorías: se ven en la receta y en el menú, y se pueden ocultar', async ({ page }) => {
  await startApp(page);

  // En el menú: cada plato y el total planificado de cada día, con la referencia general.
  await expect(page.locator('.slot:visible .slot-meta').first()).toContainText(/unas [\d.]+ kcal/);
  await expect(page.locator('.day-kcal:visible').first()).toHaveText(/^Planificado: unas [\d.]+ kcal$/);
  await expect(page.getByText(/Referencia para un adulto: 2\.000 kcal al día/)).toBeVisible();
  await expectAccessible(page);

  // En la receta: por ración, como valor orientativo.
  await openScreen(page, '#/recetas/pisto', 'Pisto');
  await expect(page.getByText('unas 350 kcal por ración')).toBeVisible();
  await expect(page.getByText(/Valor orientativo/)).toBeVisible();

  // La app nunca pide peso, edad ni altura: solo hay un interruptor para mostrarlas u ocultarlas.
  await openScreen(page, '#/ajustes', 'Ajustes');
  await expect(page.getByText(/FoodData Central/)).toBeVisible();
  await page.getByRole('checkbox', { name: /Mostrar las calorías/ }).uncheck();
  await expectAccessible(page);

  await openScreen(page, '#/recetas/pisto', 'Pisto');
  await expect(page.getByText(/kcal/)).toHaveCount(0);
  await openScreen(page, '#/menu', 'Menú semanal');
  await expect(page.getByText(/kcal/)).toHaveCount(0);

  // La preferencia se conserva al volver a abrir la app.
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Menú semanal' })).toBeVisible();
  await expect(page.getByText(/kcal/)).toHaveCount(0);
});

test('un ingrediente propio sin calorías deja la receta sin cifra, en lugar de dar una incompleta', async ({ page }) => {
  await startApp(page);
  await openScreen(page, '#/recetas/nueva', 'Nueva receta');
  await page.getByRole('textbox', { name: 'Nombre de la receta' }).fill('Arroz con algo');
  await page.getByRole('spinbutton', { name: 'Tiempo total (minutos)' }).fill('20');

  const search = page.getByRole('searchbox', { name: 'Buscar ingrediente para añadir' });
  await search.fill('arroz');
  await page.getByRole('button', { name: 'Añadir arroz', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Cantidad de arroz' }).fill('200');

  await search.fill('salsa secreta');
  await page.getByRole('button', { name: 'Crear el ingrediente «salsa secreta»' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('radio', { name: /Cualquiera/ }).check();
  await dialog.getByRole('checkbox', { name: 'Ninguno de los 14 alérgenos' }).check();
  await dialog.getByRole('button', { name: 'Guardar ingrediente' }).click();
  await page.getByRole('spinbutton', { name: 'Cantidad de salsa secreta' }).fill('100');
  await page.getByRole('textbox', { name: 'Paso 1' }).fill('Mezclar.');
  await page.getByRole('button', { name: 'Guardar receta' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Arroz con algo' })).toBeVisible();
  const calories = page.locator('.facts div', { hasText: 'Calorías' });
  await expect(calories).toContainText('no disponibles');

  // Al copiar las calorías de la etiqueta, la receta ya puede calcularlas.
  await page.getByRole('link', { name: 'Editar', exact: true }).click();
  await page.getByRole('button', { name: 'Editar el ingrediente salsa secreta' }).click();
  await dialog.getByRole('spinbutton', { name: 'Calorías por 100 g (opcional)' }).fill('100');
  await dialog.getByRole('button', { name: 'Guardar ingrediente' }).click();
  await page.getByRole('button', { name: 'Guardar receta' }).click();
  // (200 g de arroz × 360 + 100 g de salsa × 100) / 100 / 2 raciones = 410
  await expect(calories).toContainText('unas 410 kcal por ración');
});
