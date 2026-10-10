import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { catalog } from '../data/catalog';
import { buildCatalog } from '../domain/catalog';
import { violations } from '../domain/filters';
import { emptyPlan, generatePlan, suggestReplacement } from '../domain/planner';
import {
  ALLERGENS,
  DEFAULT_PREFERENCES,
  DIETS,
  INGREDIENT_GROUPS,
  type Ingredient,
  type Preferences,
  type Recipe,
} from '../domain/types';

const WEEK = '2026-10-12';

const preferencesArb: fc.Arbitrary<Preferences> = fc.record({
  diet: fc.constantFrom(...DIETS),
  servings: fc.integer({ min: 1, max: 12 }),
  excludedIngredientIds: fc.subarray([...catalog.ingredients.keys()], { maxLength: 4 }),
  excludedGroups: fc.subarray([...INGREDIENT_GROUPS], { maxLength: 3 }),
  excludedAllergens: fc.subarray([...ALLERGENS], { maxLength: 3 }),
  maxTotalMinutes: fc.constantFrom(null, 20, 30, 45, 60),
  preferBudget: fc.boolean(),
  activeSlots: fc.array(fc.array(fc.boolean(), { minLength: 2, maxLength: 2 }), { minLength: 7, maxLength: 7 }),
  onboardingDone: fc.constant(true),
});

describe('generatePlan con el catálogo real', () => {
  it('nunca asigna una receta que incumpla una restricción obligatoria', () => {
    fc.assert(
      fc.property(preferencesArb, fc.integer(), (preferences, seed) => {
        const { plan } = generatePlan({
          catalog,
          preferences,
          favorites: new Set(),
          currentPlan: emptyPlan(WEEK, preferences),
          seed,
        });
        for (const slot of plan.slots) {
          if (!slot.active) {
            expect(slot.recipeId).toBeNull();
            continue;
          }
          if (!slot.recipeId) continue;
          const recipe = catalog.recipeById.get(slot.recipeId)!;
          expect(violations(recipe, catalog, preferences)).toEqual([]);
          expect(recipe.mealTypes).toContain(slot.mealType);
        }
      }),
      { numRuns: 300 },
    );
  });

  it('no altera los platos bloqueados', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), fc.subarray([...Array(14).keys()]), (seedA, seedB, lockedIndexes) => {
        const preferences = { ...DEFAULT_PREFERENCES };
        const first = generatePlan({
          catalog,
          preferences,
          favorites: new Set(),
          currentPlan: emptyPlan(WEEK, preferences),
          seed: seedA,
        }).plan;
        const locked = { ...first, slots: first.slots.map((s, i) => ({ ...s, locked: lockedIndexes.includes(i) })) };
        const second = generatePlan({ catalog, preferences, favorites: new Set(), currentPlan: locked, seed: seedB }).plan;
        for (const index of lockedIndexes) {
          expect(second.slots[index]!.recipeId).toBe(first.slots[index]!.recipeId);
          expect(second.slots[index]!.locked).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('es determinista: misma entrada y misma semilla, mismo menú', () => {
    fc.assert(
      fc.property(preferencesArb, fc.integer(), (preferences, seed) => {
        const input = { catalog, preferences, favorites: new Set<string>(), currentPlan: emptyPlan(WEEK, preferences), seed };
        expect(generatePlan(input)).toEqual(generatePlan(input));
      }),
      { numRuns: 100 },
    );
  });

  it('con las preferencias por defecto completa la semana sin repetir', () => {
    const preferences = { ...DEFAULT_PREFERENCES };
    const { plan, notices } = generatePlan({
      catalog,
      preferences,
      favorites: new Set(),
      currentPlan: emptyPlan(WEEK, preferences),
      seed: 7,
    });
    const ids = plan.slots.map((s) => s.recipeId);
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(14);
    expect(notices).toEqual([]);
  });

  it('una sustitución respeta las restricciones y evita lo rechazado', () => {
    fc.assert(
      fc.property(preferencesArb, fc.integer(), fc.integer({ min: 0, max: 13 }), (preferences, seed, index) => {
        const plan = generatePlan({
          catalog,
          preferences,
          favorites: new Set(),
          currentPlan: emptyPlan(WEEK, preferences),
          seed,
        }).plan;
        const current = plan.slots[index]!.recipeId;
        const rejected = current ? [current] : [];
        const replacement = suggestReplacement({ catalog, preferences, favorites: new Set(), plan, index, rejectedIds: rejected, seed });
        if (replacement === null) return;
        expect(replacement).not.toBe(current);
        expect(violations(catalog.recipeById.get(replacement)!, catalog, preferences)).toEqual([]);
      }),
      { numRuns: 200 },
    );
  });
});

describe('relajación con un catálogo reducido', () => {
  const ingredient = (id: string, diet: Ingredient['diet']): Ingredient => ({
    id,
    name: id,
    section: 'other',
    baseUnit: 'g',
    diet,
    allergens: [],
    mayContain: [],
    groups: [],
    pantryStaple: false,
  });
  const recipe = (id: string, ingredientId: string, totalMinutes = 20): Recipe => ({
    id,
    name: id,
    summary: id,
    mealTypes: ['lunch', 'dinner'],
    baseServings: 2,
    totalMinutes,
    activeMinutes: 10,
    cost: 1,
    mainGroup: 'vegetables',
    cuisine: 'other',
    ingredients: [{ ingredientId, quantity: 100, unit: 'g' }],
    steps: ['.'],
    source: { author: 'test', license: 'test' },
  });
  const small = buildCatalog(
    [ingredient('verdura', 'vegan'), ingredient('carne', 'omnivore')],
    [recipe('a', 'verdura'), recipe('b', 'verdura'), recipe('c', 'verdura', 50), recipe('d', 'carne'), recipe('e', 'carne')],
  );
  const run = (preferences: Preferences, previousRecipeIds: string[] = []) =>
    generatePlan({
      catalog: small,
      preferences,
      favorites: new Set(),
      currentPlan: emptyPlan(WEEK, preferences),
      previousRecipeIds,
      seed: 1,
    });

  it('repite recetas como máximo dos veces, nunca en días consecutivos, y lo avisa', () => {
    const { plan, notices } = run({ ...DEFAULT_PREFERENCES });
    const days = new Map<string, number[]>();
    for (const slot of plan.slots) {
      if (slot.recipeId) days.set(slot.recipeId, [...(days.get(slot.recipeId) ?? []), slot.day]);
    }
    for (const used of days.values()) {
      expect(used.length).toBeLessThanOrEqual(2);
      if (used.length === 2) expect(Math.abs(used[0]! - used[1]!)).toBeGreaterThan(1);
    }
    expect(notices.map((n) => n.kind)).toContain('repeatedInWeek');
    expect(notices.map((n) => n.kind)).toContain('emptySlots');
  });

  it('señala el filtro que más limita', () => {
    const { notices } = run({ ...DEFAULT_PREFERENCES, diet: 'vegan', maxTotalMinutes: 30 });
    const empty = notices.find((n) => n.kind === 'emptySlots');
    expect(empty && 'limiting' in empty ? empty.limiting : undefined).toEqual({ filter: 'diet', countWithout: 4 });
  });

  it('deja todo vacío si ninguna receta es compatible, sin saltarse la exclusión', () => {
    const { plan, notices } = run({ ...DEFAULT_PREFERENCES, excludedIngredientIds: ['verdura', 'carne'] });
    expect(plan.slots.every((s) => s.recipeId === null)).toBe(true);
    expect(notices).toEqual([
      { kind: 'emptySlots', count: 14, compatible: 0, limiting: { filter: 'excluded', countWithout: 5 } },
    ]);
  });

  it('usa recetas de la semana anterior antes que repetir en la misma semana', () => {
    const preferences = {
      ...DEFAULT_PREFERENCES,
      activeSlots: DEFAULT_PREFERENCES.activeSlots.map((row, day) => (day < 2 ? row : [false, false])),
    };
    const { plan, notices } = run(preferences, ['a', 'b', 'c']);
    const ids = plan.slots.filter((s) => s.active).map((s) => s.recipeId);
    expect(new Set(ids).size).toBe(4);
    expect(notices).toEqual([{ kind: 'repeatedFromPreviousWeek' }]);
  });
});
