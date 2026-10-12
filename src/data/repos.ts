import { combinePreferences } from '../domain/household';
import type {
  DinerProfile,
  HouseholdSettings,
  Meta,
  Preferences,
  SavedPlan,
  ShoppingListState,
  WeekPlan,
} from '../domain/types';
import { db, SCHEMA_VERSION, SETTINGS_KEY } from './db';
import { normalizeSettings } from './migrations';

// La interfaz solo accede a los datos a través de este módulo, para poder
// cambiar IndexedDB por otro almacenamiento sin tocar las pantallas.

const META_KEY = 'meta';

export async function getSettings(): Promise<HouseholdSettings> {
  const row = await db.kv.get(SETTINGS_KEY);
  // Completa con los valores por defecto cualquier campo que falte.
  return normalizeSettings(row?.value);
}

export async function saveSettings(settings: HouseholdSettings): Promise<void> {
  await db.kv.put({ key: SETTINGS_KEY, value: settings });
}

/** Fichas de comensal, en el orden en que se crearon. */
export async function getProfiles(): Promise<DinerProfile[]> {
  const profiles = await db.profiles.toArray();
  return profiles.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.name.localeCompare(b.name, 'es'));
}

/** Ficha nueva, todavía sin guardar. */
export function createProfile(name = ''): DinerProfile {
  return {
    id: crypto.randomUUID(),
    name,
    diet: 'omnivore',
    excludedIngredientIds: [],
    excludedGroups: [],
    excludedAllergens: [],
    createdAt: new Date().toISOString(),
  };
}

export async function saveProfile(profile: DinerProfile): Promise<void> {
  await db.profiles.put(profile);
}

export async function deleteProfile(id: string): Promise<void> {
  await db.profiles.delete(id);
}

/** Preferencias con las que se planifica: los ajustes de la casa más las necesidades de todos los comensales. */
export async function getPreferences(): Promise<Preferences> {
  return combinePreferences(await getProfiles(), await getSettings());
}

export async function getMeta(): Promise<Meta> {
  const row = await db.kv.get(META_KEY);
  return { schemaVersion: SCHEMA_VERSION, ...(row?.value as Partial<Meta> | undefined) };
}

export async function saveMeta(meta: Meta): Promise<void> {
  await db.kv.put({ key: META_KEY, value: meta });
}

export function getWeekPlan(weekStart: string): Promise<WeekPlan | undefined> {
  return db.weekPlans.get(weekStart);
}

export async function saveWeekPlan(plan: WeekPlan): Promise<void> {
  await db.weekPlans.put({ ...plan, updatedAt: new Date().toISOString() });
}

export async function toggleFavorite(recipeId: string): Promise<void> {
  if (await db.favorites.get(recipeId)) await db.favorites.delete(recipeId);
  else await db.favorites.put({ recipeId, addedAt: new Date().toISOString() });
}

export function listSavedPlans(): Promise<SavedPlan[]> {
  return db.savedPlans.orderBy('id').toArray();
}

export async function addSavedPlan(name: string, plan: WeekPlan): Promise<void> {
  const createdAt = new Date().toISOString();
  await db.savedPlans.put({
    id: `${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    slots: plan.slots.map(({ day, mealType, recipeId }) => ({ day, mealType, recipeId })),
    createdAt,
  });
}

export function deleteSavedPlan(id: string): Promise<void> {
  return db.savedPlans.delete(id);
}

export function emptyShoppingState(weekStart: string): ShoppingListState {
  return { weekStart, checked: {}, alreadyHave: [], manualItems: [] };
}

export async function updateShoppingState(
  weekStart: string,
  change: (state: ShoppingListState) => ShoppingListState,
): Promise<void> {
  await db.transaction('rw', db.shoppingLists, async () => {
    const current = (await db.shoppingLists.get(weekStart)) ?? emptyShoppingState(weekStart);
    await db.shoppingLists.put(change(current));
  });
}

export async function clearAllData(): Promise<void> {
  await db.transaction('rw', [db.kv, db.profiles, db.weekPlans, db.savedPlans, db.favorites, db.shoppingLists], async () => {
    await Promise.all([
      db.kv.clear(),
      db.profiles.clear(),
      db.weekPlans.clear(),
      db.savedPlans.clear(),
      db.favorites.clear(),
      db.shoppingLists.clear(),
    ]);
  });
}
