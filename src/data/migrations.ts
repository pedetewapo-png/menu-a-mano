import type { MealSlot, MealType, Preferences, WeekPlan } from '../domain/types';
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
