import type { DinerProfile, HouseholdSettings, MealSlot, MealType, Preferences, WeekPlan } from '../domain/types';
import { DAYS_PER_WEEK, DEFAULT_PREFERENCES, MEAL_TYPES, MEALS_PER_DAY } from '../domain/types';

// Conversión de los datos de la v1 (solo comida y cena) al formato de la v2
// (desayuno, comida y cena). Son funciones puras e idempotentes: aplicarlas a
// datos que ya están en el formato nuevo no cambia nada. Las usan la migración
// de la base de datos local y la importación de copias de seguridad antiguas.

const V1_MEALS_PER_DAY = 2;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Acepta preferencias de la v1 o de la v2 y las devuelve en el formato actual. */
export function migratePreferences(raw: unknown): Preferences {
  const source = isObject(raw) ? raw : {};
  const merged = { ...DEFAULT_PREFERENCES, ...source } as Preferences;

  const rows = Array.isArray(source.activeSlots) ? (source.activeSlots as unknown[]) : [];
  const activeSlots = Array.from({ length: DAYS_PER_WEEK }, (_, day) => {
    const row = Array.isArray(rows[day]) ? (rows[day] as unknown[]).map((v) => v !== false) : [];
    // En la v1 cada día tenía [comida, cena]; el desayuno se añade delante, activo.
    if (row.length === V1_MEALS_PER_DAY) return [true, ...row];
    return Array.from({ length: MEALS_PER_DAY }, (_, meal) => row[meal] ?? true);
  });

  return {
    ...merged,
    activeSlots,
    habitualBreakfastIds: Array.isArray(source.habitualBreakfastIds) ? (source.habitualBreakfastIds as string[]) : [],
  };
}

/** Convierte un menú de 14 comidas (v1) en uno de 21, con los desayunos vacíos. */
export function migrateWeekPlan<T extends { slots: unknown }>(plan: T): T {
  const slots = plan.slots;
  if (!Array.isArray(slots) || slots.length !== DAYS_PER_WEEK * V1_MEALS_PER_DAY) return plan;

  const byKey = new Map<string, MealSlot>();
  for (const slot of slots as MealSlot[]) byKey.set(`${slot.day}:${slot.mealType}`, slot);

  const migrated: MealSlot[] = [];
  for (let day = 0; day < DAYS_PER_WEEK; day++) {
    for (const mealType of MEAL_TYPES) {
      migrated.push(byKey.get(`${day}:${mealType}`) ?? emptySlot(day, mealType));
    }
  }
  return { ...plan, slots: migrated };
}

function emptySlot(day: number, mealType: MealType): MealSlot {
  return { day, mealType, active: true, recipeId: null, locked: false, origin: 'generated' };
}

// ---------- Esquema 3: las preferencias se reparten entre fichas de comensal y ajustes de la casa ----------

/** La ficha que se crea a partir de las preferencias antiguas, que eran de una sola persona. */
export const MIGRATED_PROFILE_ID = 'principal';
const MIGRATED_PROFILE_NAME = 'Yo';
const MIGRATED_PROFILE_DATE = '2026-01-01T00:00:00.000Z';

/** Ajustes de la casa a partir de datos guardados, completando lo que falte con los valores por defecto. */
export function normalizeSettings(raw: unknown): HouseholdSettings {
  const prefs = migratePreferences(raw);
  return {
    servings: prefs.servings,
    maxTotalMinutes: prefs.maxTotalMinutes,
    preferBudget: prefs.preferBudget,
    activeSlots: prefs.activeSlots,
    habitualBreakfastIds: prefs.habitualBreakfastIds,
    onboardingDone: prefs.onboardingDone,
  };
}

/** Separa unas preferencias antiguas en los ajustes de la casa y la ficha de su único comensal. */
export function splitPreferences(raw: unknown): { settings: HouseholdSettings; profiles: DinerProfile[] } {
  const prefs = migratePreferences(raw);
  const settings = normalizeSettings(raw);
  // Quien no había terminado la configuración inicial aún no tiene ficha: la creará al hacerla.
  if (!prefs.onboardingDone) return { settings, profiles: [] };
  return {
    settings,
    profiles: [
      {
        id: MIGRATED_PROFILE_ID,
        name: MIGRATED_PROFILE_NAME,
        diet: prefs.diet,
        excludedIngredientIds: prefs.excludedIngredientIds,
        excludedGroups: prefs.excludedGroups,
        excludedAllergens: prefs.excludedAllergens,
        createdAt: MIGRATED_PROFILE_DATE,
      },
    ],
  };
}

/** Datos de una copia de seguridad del esquema 2, llevados al esquema 3. */
export function migrateBackupDataV2(data: unknown): unknown {
  if (!isObject(data) || 'settings' in data) return data;
  const { preferences, ...rest } = data;
  return { ...rest, ...splitPreferences(preferences) };
}

/** Datos de una copia de seguridad del esquema 3, llevados al 4: se añaden las recetas e ingredientes propios, vacíos. */
export function migrateBackupDataV3(data: unknown): unknown {
  if (!isObject(data)) return data;
  return { userRecipes: [], userIngredients: [], userPhotos: [], ...data };
}

/** Datos de una copia de seguridad de la v1, llevados al formato de la v2. */
export function migrateBackupDataV1(data: unknown): unknown {
  if (!isObject(data)) return data;
  return {
    ...data,
    preferences: migratePreferences(data.preferences),
    weekPlans: Array.isArray(data.weekPlans)
      ? (data.weekPlans as WeekPlan[]).map((plan) => (isObject(plan) ? migrateWeekPlan(plan) : plan))
      : data.weekPlans,
  };
}
