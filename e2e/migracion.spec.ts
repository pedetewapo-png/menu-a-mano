import { expect, test, type Page } from '@playwright/test';
import { openScreen } from './helpers';

// Estas pruebas reproducen una instalación real de una versión anterior: crean la base
// de datos con el esquema y los datos de entonces, y después abren la app actual sobre ella.

interface OldInstall {
  /** Dexie guarda la versión N del esquema como versión N × 10 de IndexedDB. */
  idbVersion: number;
  meals: string[];
  preferences: Record<string, unknown>;
}

async function seedOldInstall(page: Page, install: OldInstall): Promise<void> {
  // Una página del mismo origen que no carga la app, para preparar los datos antes.
  await page.goto('/icons/icon.svg');
  await page.evaluate(async ({ idbVersion, meals, preferences }) => {
    const today = new Date();
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
    const pad = (n: number) => String(n).padStart(2, '0');
    const weekStart = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;

    // Lunes: pisto bloqueado para comer y tortilla para cenar. El resto de la semana, pisto bloqueado.
    const slots: Record<string, unknown>[] = [];
    for (let day = 0; day < 7; day++) {
      for (const mealType of meals) {
        const base = { day, mealType, active: true, locked: false, origin: 'manual' };
        if (mealType === 'breakfast') slots.push({ ...base, recipeId: 'fruta-con-nueces', origin: 'generated' });
        else if (day === 0 && mealType === 'dinner') slots.push({ ...base, recipeId: 'tortilla-de-patatas', note: 'Invitados' });
        else slots.push({ ...base, recipeId: 'pisto', locked: true });
      }
    }

    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('menu-a-mano', idbVersion);
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
  }, install);
}

const basePreferences = {
  diet: 'vegetarian',
  servings: 4,
  excludedIngredientIds: [],
  excludedGroups: [],
  excludedAllergens: [],
  maxTotalMinutes: null,
  preferBudget: false,
  onboardingDone: true,
};

/** Lo que tiene que seguir igual tras actualizar, venga de la versión que venga. */
async function expectDataIntact(page: Page, slotsPerDay: number): Promise<void> {
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
  await expect(monday.locator('.slot')).toHaveCount(slotsPerDay);

  // Las preferencias, que eran de una sola persona, son ahora su ficha de comensal.
  await openScreen(page, '#/ajustes', 'Ajustes');
  const row = page.locator('.profile-row');
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('Yo');
  await expect(row).toContainText('Vegetariana');

  // Favoritas, comensales y lista de la compra, también.
  await openScreen(page, '#/recetas/pisto', 'Pisto');
  await expect(page.getByRole('button', { name: 'Quitar de favoritas' })).toBeVisible();
  await expect(page.getByText('Comensales', { exact: true }).locator('..').getByRole('status')).toHaveText('4');
  await openScreen(page, '#/compra', 'Lista de la compra');
  await expect(page.getByText('Pan del bueno')).toBeVisible();
}

test('los datos de la v1 siguen intactos al actualizar', async ({ page }) => {
  await seedOldInstall(page, {
    idbVersion: 10,
    meals: ['lunch', 'dinner'],
    preferences: { ...basePreferences, activeSlots: Array.from({ length: 7 }, () => [true, true]) },
  });
  // Los desayunos no aparecen hasta que se eligen: dos comidas al día.
  await expectDataIntact(page, 2);
});

test('los datos de la versión con desayunos siguen intactos al pasar a perfiles', async ({ page }) => {
  await seedOldInstall(page, {
    idbVersion: 20,
    meals: ['breakfast', 'lunch', 'dinner'],
    preferences: {
      ...basePreferences,
      activeSlots: Array.from({ length: 7 }, () => [true, true, true]),
      habitualBreakfastIds: ['fruta-con-nueces'],
    },
  });
  await expectDataIntact(page, 3);

  // Los desayunos habituales y las notas también se conservan.
  await openScreen(page, '#/ajustes', 'Ajustes');
  await expect(page.getByRole('checkbox', { name: /Fruta troceada con nueces/ })).toBeChecked();
  await openScreen(page, '#/menu', 'Menú semanal');
  const mondayChip = page.getByRole('button', { name: /^Lunes / });
  if (await mondayChip.isVisible()) await mondayChip.click();
  await expect(page.locator('.day:visible').first().locator('.slot-note')).toHaveText('Invitados');
});
