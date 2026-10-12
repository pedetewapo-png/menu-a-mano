import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import sharp from 'sharp';
import { expectAccessible, openScreen, startApp } from './helpers';

test('receta propia: crear con un ingrediente nuevo, usar en el menú, exportar, borrar e importar', async ({ page }) => {
  await startApp(page);
  await openScreen(page, '#/recetas', 'Recetas');
  await page.getByRole('link', { name: 'Nueva receta' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Nueva receta' })).toBeVisible();
  await expectAccessible(page);

  await page.getByRole('textbox', { name: 'Nombre de la receta' }).fill('Sopa de fideos de la abuela');
  await page.getByRole('spinbutton', { name: 'Tiempo total (minutos)' }).fill('30');

  // Un ingrediente de la app, en unidades.
  const search = page.getByRole('searchbox', { name: 'Buscar ingrediente para añadir' });
  await search.fill('zanah');
  await page.getByRole('button', { name: 'Añadir zanahoria' }).click();
  await page.getByRole('spinbutton', { name: 'Cantidad de zanahoria' }).fill('2');
  await page.getByRole('combobox', { name: 'Unidad de zanahoria' }).selectOption('unit');

  // Un ingrediente que la app no trae: hay que declarar quién puede tomarlo y sus alérgenos.
  await search.fill('fideos caseros');
  await page.getByRole('button', { name: 'Crear el ingrediente «fideos caseros»' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('radio', { name: /Personas vegetarianas/ }).check();
  // Sin elegir alérgenos (ni "ninguno") no se puede guardar: no hay valor por defecto.
  await dialog.getByRole('button', { name: 'Guardar ingrediente' }).click();
  await expect(dialog.getByText('Marca los alérgenos que lleva, o «Ninguno de los 14 alérgenos».')).toBeVisible();
  await dialog.getByRole('checkbox', { name: 'Gluten' }).check();
  await dialog.getByRole('checkbox', { name: 'Huevo', exact: true }).check();
  await expectAccessible(page);
  await dialog.getByRole('button', { name: 'Guardar ingrediente' }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('spinbutton', { name: 'Cantidad de fideos caseros' }).fill('150');

  // La dieta y los alérgenos se calculan solos a partir de los ingredientes.
  const computed = page.locator('.callout', { hasText: 'Calculado a partir de los ingredientes' });
  await expect(computed).toContainText('Vegetariana');
  await expect(computed).toContainText('Gluten, Huevo');

  // Todavía falta un paso: de momento sería un borrador.
  await expect(page.getByText(/falta: al menos un paso/)).toBeVisible();
  await page.getByRole('textbox', { name: 'Paso 1' }).fill('Cocer la zanahoria en rodajas y añadir los fideos.');
  await expect(page.getByText('Está completa: al guardarla podrás usarla en el menú.')).toBeVisible();

  // Foto: se recorta y se reduce en el propio dispositivo.
  const photo = await sharp({ create: { width: 1600, height: 900, channels: 3, background: '#c8804f' } }).jpeg().toBuffer();
  await page.locator('.editor input[type="file"]').setInputFiles({ name: 'sopa.jpg', mimeType: 'image/jpeg', buffer: photo });
  await expect(page.getByRole('img', { name: 'Foto elegida para la receta' })).toBeVisible();
  await expectAccessible(page);

  await page.getByRole('button', { name: 'Guardar receta' }).click();

  // Ficha de la receta.
  await expect(page.getByRole('heading', { level: 1, name: 'Sopa de fideos de la abuela' })).toBeVisible();
  await expect(page.getByText('Propia', { exact: true })).toBeVisible();
  await expect(page.getByText('Gluten, Huevo')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Sopa de fideos de la abuela' })).toBeVisible();
  await expect(page.getByText('2 zanahorias')).toBeVisible();
  await expectAccessible(page);

  // Aparece en el listado y se puede filtrar por origen.
  await openScreen(page, '#/recetas', 'Recetas');
  await page.getByRole('combobox', { name: 'Origen' }).selectOption('own');
  await expect(page.getByText('1 receta', { exact: true })).toBeVisible();
  await expect(page.locator('.recipe-card')).toContainText('Sopa de fideos de la abuela');

  // Se puede poner en el menú, y sus ingredientes entran en la compra.
  await openScreen(page, '#/menu', 'Menú semanal');
  const slot = page.locator('.slot:visible').first();
  await slot.getByRole('button', { name: /^Más opciones/ }).click();
  await dialog.getByRole('button', { name: 'Elegir receta…' }).click();
  await dialog.getByRole('searchbox', { name: 'Buscar receta' }).fill('sopa de fideos');
  await dialog.getByRole('button', { name: /Sopa de fideos de la abuela/ }).click();
  await expect(slot.locator('.slot-name')).toHaveText('Sopa de fideos de la abuela');
  await openScreen(page, '#/compra', 'Lista de la compra');
  await expect(page.getByRole('checkbox', { name: 'Marcar Fideos caseros como comprado' })).toBeVisible();

  // Exportar a un archivo.
  await openScreen(page, '#/recetas', 'Recetas');
  await page.getByRole('link', { name: 'Sopa de fideos de la abuela' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('receta-sopa-de-fideos-de-la-abuela.json');
  const exported = await readFile(await file.path(), 'utf8');
  expect(JSON.parse(exported)).toMatchObject({ app: 'menu-a-mano', kind: 'recipe' });

  // Borrar: desaparece del listado, y la comida que la usaba lo indica.
  page.once('dialog', (confirm) => confirm.accept());
  await page.getByRole('button', { name: 'Borrar receta' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Recetas' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sopa de fideos de la abuela' })).toHaveCount(0);
  await openScreen(page, '#/menu', 'Menú semanal');
  await expect(page.locator('.slot:visible').first().getByText('Receta no disponible')).toBeVisible();

  // Importar el archivo: antes de guardar se enseñan los alérgenos declarados.
  await openScreen(page, '#/recetas', 'Recetas');
  await page.locator('.page-header input[type="file"]').setInputFiles({
    name: 'receta.json',
    mimeType: 'application/json',
    buffer: Buffer.from(exported),
  });
  await expect(dialog.getByRole('heading', { name: 'Importar receta' })).toBeVisible();
  await expect(dialog.getByText('Fideos caseros: alérgenos declarados: gluten, huevo')).toBeVisible();
  await expect(dialog.getByText('150 g de fideos caseros')).toBeVisible();
  await expectAccessible(page);
  await dialog.getByRole('button', { name: 'Importar', exact: true }).click();
  await expect(page.getByText('«Sopa de fideos de la abuela» importada.')).toBeVisible();

  const card = page.locator('.recipe-card', { hasText: 'Sopa de fideos de la abuela' });
  await expect(card.getByText('Importada', { exact: true })).toBeVisible();
  await card.getByRole('link').click();
  await expect(page.getByText('Gluten, Huevo')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Sopa de fideos de la abuela' })).toBeVisible();
});

test('receta propia incompleta: se guarda como borrador y no se ofrece para el menú', async ({ page }) => {
  await startApp(page);
  await openScreen(page, '#/recetas/nueva', 'Nueva receta');

  // Sin nombre no se guarda nada.
  await page.getByRole('button', { name: 'Guardar borrador' }).click();
  await expect(page.getByText('Escribe al menos el nombre para poder guardarla.')).toBeVisible();

  await page.getByRole('textbox', { name: 'Nombre de la receta' }).fill('Guiso a medias');
  await page.getByRole('button', { name: 'Guardar borrador' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Guiso a medias' })).toBeVisible();
  await expect(page.getByText('Borrador', { exact: true })).toBeVisible();
  await expect(page.getByText('Es un borrador: complétala para poder usarla en el menú.').first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Cocinar', exact: true })).toHaveCount(0);

  await openScreen(page, '#/menu', 'Menú semanal');
  await page.locator('.slot:visible').first().getByRole('button', { name: /^Más opciones/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Elegir receta…' }).click();
  await dialog.getByRole('searchbox', { name: 'Buscar receta' }).fill('guiso');
  await expect(dialog.getByText('No hay recetas compatibles.')).toBeVisible();

  // Se puede retomar y completar más tarde.
  await dialog.getByRole('button', { name: 'Cerrar' }).click();
  await openScreen(page, '#/recetas', 'Recetas');
  await page.getByRole('link', { name: 'Guiso a medias' }).click();
  await page.getByRole('link', { name: 'Editar', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Nombre de la receta' })).toHaveValue('Guiso a medias');
});
