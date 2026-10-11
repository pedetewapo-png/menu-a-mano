import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { catalog } from '../data/catalog';
import { buildCatalog } from '../domain/catalog';
import { violations } from '../domain/filters';
import { emptyPlan, redistributeBreakfasts, generatePlan, slotIndex, SLOT_COUNT, suggestReplacement } from '../domain/planner';
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
const BREAKFAST_IDS = catalog.recipes.filter((r) => r.mealTypes.includes('breakfast')).map((r) => r.id);
const isMain = (slot: { mealType: string }) => slot.mealType !== 'breakfast';

const preferencesArb: fc.Arbitrary<Preferences> = fc.record({
  diet: fc.constantFrom(...DIETS),
  servings: fc.integer({ min: 1, max: 12 }),
  excludedIngredientIds: fc.subarray([...catalog.ingredients.keys()], { maxLength: 4 }),
  excludedGroups: fc.subarray([...INGREDIENT_GROUPS], { maxLength: 3 }),
  excludedAllergens: fc.subarray([...ALLERGENS], { maxLength: 3 }),
  maxTotalMinutes: fc.constantFrom(null, 20, 30, 45, 60),
  preferBudget: fc.boolean(),
  activeSlots: fc.array(fc.array(fc.boolean(), { minLength: 3, maxLength: 3 }), { minLength: 7, maxLength: 7 }),
  habitualBreakfastIds: fc.subarray(BREAKFAST_IDS, { maxLength: 3 }),
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
      fc.property(fc.integer(), fc.integer(), fc.subarray([...Array(SLOT_COUNT).keys()]), (seedA, seedB, lockedIndexes) => {
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
    const ids = plan.slots.filter(isMain).map((s) => s.recipeId);
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(14);
    // Sin desayunos habituales, los desayunos quedan vacíos.
    expect(plan.slots.filter((s) => !isMain(s)).every((s) => s.recipeId === null)).toBe(true);
    expect(notices).toEqual([]);
  });

  it('una sustitución respeta las restricciones y evita lo rechazado', () => {
    fc.assert(
      fc.property(preferencesArb, fc.integer(), fc.integer({ min: 0, max: SLOT_COUNT - 1 }), (preferences, seed, index) => {
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
      activeSlots: DEFAULT_PREFERENCES.activeSlots.map((row, day) => (day < 2 ? row : [false, false, false])),
    };
    const { plan, notices } = run(preferences, ['a', 'b', 'c']);
    const ids = plan.slots.filter((s) => s.active && isMain(s)).map((s) => s.recipeId);
    expect(new Set(ids).size).toBe(4);
    expect(notices).toEqual([{ kind: 'repeatedFromPreviousWeek' }]);
  });
});

describe('desayunos habituales', () => {
  const withBreakfasts = (ids: string[]): Preferences => ({ ...DEFAULT_PREFERENCES, habitualBreakfastIds: ids });
  const breakfastsOf = (plan: { slots: { mealType: string; recipeId: string | null }[] }) =>
    plan.slots.filter((s) => !isMain(s)).map((s) => s.recipeId);
  const run = (preferences: Preferences, seed = 3) =>
    generatePlan({ catalog, preferences, favorites: new Set(), currentPlan: emptyPlan(WEEK, preferences), seed });

  it('se reparten por turnos entre los siete días', () => {
    const habitual = ['tostadas-con-tomate-y-aceite', 'fruta-con-nueces'];
    const breakfasts = breakfastsOf(run(withBreakfasts(habitual)).plan);
    expect(breakfasts).toHaveLength(7);
    for (const [day, id] of breakfasts.entries()) {
      expect(habitual).toContain(id);
      if (day > 0) expect(id).not.toBe(breakfasts[day - 1]);
    }
  });

  it('no alteran las comidas ni las cenas', () => {
    const without = run({ ...DEFAULT_PREFERENCES }).plan.slots.filter(isMain).map((s) => s.recipeId);
    const withThem = run(withBreakfasts(['fruta-con-nueces'])).plan.slots.filter(isMain).map((s) => s.recipeId);
    expect(withThem).toEqual(without);
  });

  it('un desayuno habitual que deja de cumplir no se asigna y se avisa', () => {
    const preferences: Preferences = {
      ...withBreakfasts(['yogur-con-platano-y-nueces', 'fruta-con-nueces']),
      excludedAllergens: ['milk'],
    };
    const { plan, notices } = run(preferences);
    expect(new Set(breakfastsOf(plan))).toEqual(new Set(['fruta-con-nueces']));
    expect(notices).toContainEqual({ kind: 'breakfastsUnavailable', recipeIds: ['yogur-con-platano-y-nueces'] });
  });

  it('respetan los días sin planificar y los desayunos bloqueados', () => {
    const preferences = withBreakfasts(['tostadas-con-tomate-y-aceite', 'fruta-con-nueces']);
    const current = emptyPlan(WEEK, preferences);
    current.slots[slotIndex(2, 'breakfast')]!.active = false;
    Object.assign(current.slots[slotIndex(4, 'breakfast')]!, { recipeId: 'tortitas-de-platano-y-huevo', locked: true });
    const { plan } = generatePlan({ catalog, preferences, favorites: new Set(), currentPlan: current, seed: 1 });
    expect(plan.slots[slotIndex(2, 'breakfast')]!.recipeId).toBeNull();
    expect(plan.slots[slotIndex(4, 'breakfast')]!.recipeId).toBe('tortitas-de-platano-y-huevo');
  });

  it('redistributeBreakfasts vuelve a repartir sin tocar comidas, cenas ni lo elegido a mano', () => {
    const before = run(withBreakfasts(['fruta-con-nueces'])).plan;
    Object.assign(before.slots[slotIndex(0, 'breakfast')]!, { recipeId: 'gachas-de-avena-con-platano', origin: 'manual' });
    const habitual = ['tostadas-con-tomate-y-aceite', 'tostadas-con-aguacate'];
    const after = redistributeBreakfasts(before, catalog, withBreakfasts(habitual), 4);

    expect(after.slots.filter(isMain)).toEqual(before.slots.filter(isMain));
    const [monday, ...rest] = breakfastsOf(after);
    expect(monday).toBe('gachas-de-avena-con-platano');
    /* Los que venían del reparto anterior se sustituyen por los nuevos habituales, alternados. */
    expect(new Set(rest)).toEqual(new Set(habitual));
  });

  it('sin desayunos habituales, los repartidos se retiran', () => {
    const before = run(withBreakfasts(['fruta-con-nueces'])).plan;
    const after = redistributeBreakfasts(before, catalog, withBreakfasts([]), 4);
    expect(breakfastsOf(after).every((id) => id === null)).toBe(true);
  });
});
