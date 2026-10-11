import { describe, expect, it } from 'vitest';
import { BACKUP_APP_ID, parseBackup } from '../data/backupFormat';
import { migratePreferences, migrateWeekPlan } from '../data/migrations';
import { emptyPlan, slotIndex } from '../domain/planner';
import { DEFAULT_PREFERENCES, type MealSlot } from '../domain/types';

// Datos tal como los guardaba la v1: dos comidas al día y sin desayunos.
const v1Preferences = {
  diet: 'vegetarian',
  servings: 3,
  excludedIngredientIds: ['champinones'],
  excludedGroups: [],
  excludedAllergens: ['gluten'],
  maxTotalMinutes: 30,
  preferBudget: true,
  activeSlots: [[false, true], [true, true], [true, true], [true, true], [true, false], [true, true], [true, true]],
  onboardingDone: true,
};

function v1Plan() {
  const slots: MealSlot[] = [];
  for (let day = 0; day < 7; day++) {
    for (const mealType of ['lunch', 'dinner'] as const) {
      slots.push({ day, mealType, active: true, recipeId: null, locked: false, origin: 'generated' });
    }
  }
  Object.assign(slots[0]!, { recipeId: 'pisto', locked: true });
  Object.assign(slots[13]!, { recipeId: 'tortilla-de-patatas', origin: 'manual', servingsOverride: 5 });
  slots[5]!.active = false;
  return { weekStart: '2026-10-05', slots, seed: 42, updatedAt: '2026-10-10T18:00:00.000Z' };
}

describe('migración de la v1 a la v2', () => {
  it('las preferencias conservan todo y ganan los desayunos, activos y sin elegir', () => {
    const migrated = migratePreferences(v1Preferences);
    const { activeSlots: _oldSlots, ...unchanged } = v1Preferences;
    expect(migrated).toMatchObject(unchanged);
    expect(migrated.activeSlots[0]).toEqual([true, false, true]);
    expect(migrated.activeSlots[4]).toEqual([true, true, false]);
    expect(migrated.habitualBreakfastIds).toEqual([]);
  });

  it('sin datos previos devuelve las preferencias por defecto', () => {
    expect(migratePreferences(undefined)).toEqual(DEFAULT_PREFERENCES);
  });

  it('un menú pasa de 14 a 21 comidas sin perder ni mover ningún plato', () => {
    const before = v1Plan();
    const after = migrateWeekPlan(before);
    expect(after.slots).toHaveLength(21);
    expect(after.slots[slotIndex(0, 'lunch')]).toEqual(before.slots[0]);
    expect(after.slots[slotIndex(6, 'dinner')]).toEqual(before.slots[13]);
    expect(after.slots[slotIndex(2, 'dinner')]!.active).toBe(false);
    for (let day = 0; day < 7; day++) {
      expect(after.slots[slotIndex(day, 'breakfast')]).toMatchObject({ day, mealType: 'breakfast', recipeId: null });
    }
    expect({ ...after, slots: undefined }).toEqual({ ...before, slots: undefined });
  });

  it('aplicarla dos veces no cambia nada', () => {
    const once = migrateWeekPlan(v1Plan());
    expect(migrateWeekPlan(once)).toBe(once);
    const prefs = migratePreferences(v1Preferences);
    expect(migratePreferences(prefs)).toEqual(prefs);
    const current = emptyPlan('2026-10-12', DEFAULT_PREFERENCES);
    expect(migrateWeekPlan(current)).toBe(current);
  });

  it('una copia de seguridad de la v1 se importa convertida', () => {
    const backup = {
      app: BACKUP_APP_ID,
      schemaVersion: 1,
      exportedAt: '2026-10-10T18:00:00.000Z',
      notice: '',
      data: {
        preferences: v1Preferences,
        weekPlans: [v1Plan()],
        savedPlans: [],
        favorites: [{ recipeId: 'pisto', addedAt: '2026-10-10T18:00:00.000Z' }],
        shoppingLists: [],
      },
    };
    const result = parseBackup(JSON.stringify(backup));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.weekPlans[0]!.slots).toHaveLength(21);
    expect(result.data.weekPlans[0]!.slots[slotIndex(0, 'lunch')]).toMatchObject({ recipeId: 'pisto', locked: true });
    expect(result.data.preferences.diet).toBe('vegetarian');
    expect(result.data.favorites).toHaveLength(1);
  });

  it('una copia de la v1 dañada se sigue rechazando', () => {
    const plan = v1Plan();
    plan.slots.pop();
    const backup = {
      app: BACKUP_APP_ID,
      schemaVersion: 1,
      data: { preferences: v1Preferences, weekPlans: [plan], savedPlans: [], favorites: [], shoppingLists: [] },
    };
    expect(parseBackup(JSON.stringify(backup))).toMatchObject({ ok: false, reason: 'invalid' });
  });
});
