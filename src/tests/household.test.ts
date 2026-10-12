import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { catalog } from '../data/catalog';
import { violations } from '../domain/filters';
import {
  combinePreferences,
  DEFAULT_SETTINGS,
  profilesBehindFilter,
  profilesBehindViolation,
} from '../domain/household';
import { emptyPlan, generatePlan } from '../domain/planner';
import { ALLERGENS, DIETS, INGREDIENT_GROUPS, type DinerProfile } from '../domain/types';

const profile = (name: string, needs: Partial<DinerProfile> = {}): DinerProfile => ({
  id: name.toLowerCase(),
  name,
  diet: 'omnivore',
  excludedIngredientIds: [],
  excludedGroups: [],
  excludedAllergens: [],
  createdAt: '2026-10-11T10:00:00.000Z',
  ...needs,
});

const pedro = profile('Pedro');
const ana = profile('Ana', { diet: 'vegetarian', excludedAllergens: ['gluten'] });
const luis = profile('Luis', { excludedGroups: ['fish'], excludedIngredientIds: ['champinones'] });
const sara = profile('Sara', { diet: 'vegan', excludedAllergens: ['gluten', 'soy'] });

describe('combinePreferences', () => {
  it('toma la dieta más restrictiva y suma las exclusiones de todos, sin duplicados', () => {
    const combined = combinePreferences([pedro, ana, luis, sara], { ...DEFAULT_SETTINGS, servings: 4 });
    expect(combined.diet).toBe('vegan');
    expect(combined.excludedGroups).toEqual(['fish']);
    expect(combined.excludedIngredientIds).toEqual(['champinones']);
    expect(new Set(combined.excludedAllergens)).toEqual(new Set(['gluten', 'soy']));
    expect(combined.excludedAllergens).toHaveLength(2);
    expect(combined.servings).toBe(4);
  });

  it('con un solo comensal equivale a sus propias necesidades', () => {
    expect(combinePreferences([ana], DEFAULT_SETTINGS)).toMatchObject({
      diet: 'vegetarian',
      excludedAllergens: ['gluten'],
      excludedGroups: [],
    });
  });

  it('sin comensales no restringe nada', () => {
    expect(combinePreferences([], DEFAULT_SETTINGS)).toMatchObject({
      diet: 'omnivore',
      excludedIngredientIds: [],
      excludedGroups: [],
      excludedAllergens: [],
    });
  });
});

describe('a quién se debe una restricción', () => {
  const household = [pedro, ana, luis, sara];
  const names = (profiles: DinerProfile[]) => profiles.map((p) => p.name);

  it('un incumplimiento se atribuye a los comensales que lo causan', () => {
    expect(names(profilesBehindViolation({ kind: 'allergen', allergen: 'gluten' }, 'vegan', household))).toEqual(['Ana', 'Sara']);
    expect(names(profilesBehindViolation({ kind: 'group', group: 'fish' }, 'omnivore', household))).toEqual(['Luis']);
    expect(names(profilesBehindViolation({ kind: 'ingredient', ingredientId: 'champinones' }, 'vegan', household))).toEqual(['Luis']);
    // Una receta con huevo no vale para Sara (vegana), pero sí para Ana (vegetariana).
    expect(names(profilesBehindViolation({ kind: 'diet' }, 'vegetarian', household))).toEqual(['Sara']);
    expect(names(profilesBehindViolation({ kind: 'diet' }, 'omnivore', household))).toEqual(['Ana', 'Sara']);
  });

  it('el tiempo máximo es de la casa, no de nadie', () => {
    expect(profilesBehindViolation({ kind: 'time' }, 'vegan', household)).toEqual([]);
    expect(profilesBehindFilter('time', household)).toEqual([]);
  });

  it('un filtro del planificador se atribuye a quien lo fija', () => {
    expect(names(profilesBehindFilter('diet', household))).toEqual(['Sara']);
    expect(names(profilesBehindFilter('diet', [pedro, ana]))).toEqual(['Ana']);
    expect(profilesBehindFilter('diet', [pedro, luis])).toEqual([]);
    expect(names(profilesBehindFilter('allergens', household))).toEqual(['Ana', 'Sara']);
    expect(names(profilesBehindFilter('excluded', household))).toEqual(['Luis']);
  });
});

describe('el menú respeta a todos los comensales', () => {
  const profileArb: fc.Arbitrary<DinerProfile> = fc.record({
    id: fc.uuid(),
    name: fc.constantFrom('Ana', 'Luis', 'Sara', 'Pedro'),
    diet: fc.constantFrom(...DIETS),
    excludedIngredientIds: fc.subarray([...catalog.ingredients.keys()], { maxLength: 3 }),
    excludedGroups: fc.subarray([...INGREDIENT_GROUPS], { maxLength: 2 }),
    excludedAllergens: fc.subarray([...ALLERGENS], { maxLength: 2 }),
    createdAt: fc.constant('2026-10-11T10:00:00.000Z'),
  });

  it('ningún plato incumple las necesidades de ningún comensal por separado', () => {
    fc.assert(
      fc.property(fc.array(profileArb, { minLength: 1, maxLength: 5 }), fc.integer(), (profiles, seed) => {
        const preferences = combinePreferences(profiles, {
          ...DEFAULT_SETTINGS,
          habitualBreakfastIds: ['fruta-con-nueces', 'tostadas-con-tomate-y-aceite'],
        });
        const { plan } = generatePlan({
          catalog,
          preferences,
          favorites: new Set(),
          currentPlan: emptyPlan('2026-10-12', preferences),
          seed,
        });
        for (const slot of plan.slots) {
          if (!slot.recipeId) continue;
          const recipe = catalog.recipeById.get(slot.recipeId)!;
          // Se comprueba contra cada persona, no contra la suma: así la prueba no depende de cómo se combinan.
          for (const person of profiles) {
            expect(violations(recipe, catalog, combinePreferences([person], DEFAULT_SETTINGS))).toEqual([]);
          }
        }
      }),
      { numRuns: 300 },
    );
  });
});
