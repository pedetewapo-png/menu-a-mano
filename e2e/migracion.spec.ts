import { expect, test } from '@playwright/test';
import { openScreen } from './helpers';

// Reproduce una instalación real de la v1: crea la base de datos con su esquema
// y sus datos (dos comidas al día), y después abre la app actual sobre ella.
test('los datos de la v1 siguen intactos al actualizar', async ({ page }) => {
  // Una página del mismo origen que no carga la app, para preparar los datos antes.
  await page.goto('/icons/icon.svg');
  await page.evaluate(async () => {
    const today = new Date();
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
    const pad = (n: number) => String(n).padStart(2, '0');
    const weekStart = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;

    const slots: Record<string, unknown>[] = [];
    for (let day = 0; day < 7; day++) {
      for (const mealType of ['lunch', 'dinner']) {
        slots.push({ day, mealType, active: true, recipeId: 'pisto', locked: true, origin: 'manual' });
      }
    }
    slots[1] = { ...slots[1]!, recipeId: 'tortilla-de-patatas', locked: false };

    const preferences = {
      diet: 'vegetarian',
      servings: 4,
      excludedIngredientIds: [],
      excludedGroups: [],
      excludedAllergens: [],
      maxTotalMinutes: null,
      preferBudget: false,
      activeSlots: Array.from({ length: 7 }, () => [true, true]),
      onboardingDone: true,
    };

    await new Promise<void>((resolve, reject) => {
      // Dexie guarda la versión 1 del esquema como versión 10 de IndexedDB.
      const request = indexedDB.open('menu-a-mano', 10);
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore('kv', { keyPath: 'key' });
        db.createObjectStore('weekPlans', { keyPath: 'weekStart' });
        db.createObjectStore('savedPlans', { keyPath: 'id' });
        db.createObjectStore('favorites', { keyPath: 'recipeId' });
        db.createObjectStore('shoppingLists', { keyPath: 'weekStart' });
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(['kv', 'weekPlans', 'favorites', 'shoppingLists'], 'readwrite');
        tx.objectStore('kv').put({ key: 'preferences', value: preferences });
        tx.objectStore('weekPlans').put({ weekStart, slots, seed: 1, updatedAt: '2026-10-10T18:00:00.000Z' });
        tx.objectStore('favorites').put({ recipeId: 'pisto', addedAt: '2026-10-10T18:00:00.000Z' });
        tx.objectStore('shoppingLists').put({
          weekStart,
          checked: {},
          alreadyHave: [],
          manualItems: [{ id: 'a', text: 'Pan del bueno', section: 'other', checked: false }],
        });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  });

  await page.goto('/app/');
  // No vuelve a pedir la configuración inicial: las preferencias se han conservado.
  await expect(page.getByRole('heading', { level: 1, name: 'Menú semanal' })).toBeVisible();

  // El menú conserva los platos y los bloqueos, en su día y su comida.
  const mondayChip = page.getByRole('button', { name: /^Lunes / });
  if (await mondayChip.isVisible()) await mondayChip.click();
  const monday = page.locator('.day:visible').first();
  await expect(monday.locator('.slot', { hasText: 'Comida' }).locator('.slot-name')).toHaveText('Pisto');
  await expect(monday.locator('.slot', { hasText: 'Comida' }).getByText('Bloqueado', { exact: true })).toBeVisible();
  await expect(monday.locator('.slot', { hasText: 'Cena' }).locator('.slot-name')).toHaveText('Tortilla de patatas');
  // Los desayunos no aparecen hasta que se eligen.
  await expect(monday.locator('.slot')).toHaveCount(2);

  // Preferencias, favoritas y lista de la compra, también.
  await openScreen(page, '#/ajustes', 'Ajustes');
  await expect(page.getByRole('radio', { name: /Vegetariana/ })).toBeChecked();
  await openScreen(page, '#/recetas/pisto', 'Pisto');
  await expect(page.getByRole('button', { name: 'Quitar de favoritas' })).toBeVisible();
  await expect(page.getByText('Comensales', { exact: true }).locator('..').getByRole('status')).toHaveText('4');
  await openScreen(page, '#/compra', 'Lista de la compra');
  await expect(page.getByText('Pan del bueno')).toBeVisible();
});
