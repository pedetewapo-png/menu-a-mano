import { describe, expect, it } from 'vitest';
import { buildCatalog } from '../domain/catalog';
import { emptyPlan, slotIndex } from '../domain/planner';
import { buildShoppingList } from '../domain/shopping';
import { DEFAULT_PREFERENCES, type Ingredient, type Recipe, type RecipeIngredient, type WeekPlan } from '../domain/types';
import { roundForRecipe, roundUpForShopping } from '../domain/units';

const ingredient = (id: string, extra: Partial<Ingredient> = {}): Ingredient => ({
  id,
  name: id,
  section: 'produce',
  baseUnit: 'g',
  diet: 'vegan',
  allergens: [],
  mayContain: [],
  groups: [],
  pantryStaple: false,
  ...extra,
});

const recipe = (id: string, ingredients: RecipeIngredient[], baseServings = 2): Recipe => ({
  id,
  name: id,
  summary: id,
  mealTypes: ['lunch', 'dinner'],
  baseServings,
  totalMinutes: 20,
  activeMinutes: 10,
  cost: 1,
  mainGroup: 'vegetables',
  cuisine: 'other',
  ingredients,
  steps: ['.'],
  source: { author: 'test', license: 'test' },
});

const catalog = buildCatalog(
  [
    ingredient('arroz', { section: 'dryGoods' }),
    ingredient('cebolla', { gramsPerUnit: 150 }),
    ingredient('huevo', { baseUnit: 'unit', section: 'dairyEggs' }),
    ingredient('caldo', { baseUnit: 'ml', section: 'canned' }),
    ingredient('sal', { pantryStaple: true, section: 'condiments' }),
    ingredient('queso', { section: 'dairyEggs' }),
  ],
  [
    recipe('paella', [
      { ingredientId: 'arroz', quantity: 200, unit: 'g' },
      { ingredientId: 'cebolla', quantity: 0.5, unit: 'unit' },
      { ingredientId: 'caldo', quantity: 2, unit: 'tbsp' },
      { ingredientId: 'sal', quantity: null, unit: 'toTaste' },
    ]),
    recipe('revuelto', [
      { ingredientId: 'huevo', quantity: 3, unit: 'unit' },
      { ingredientId: 'cebolla', quantity: 100, unit: 'g' },
      { ingredientId: 'sal', quantity: 1, unit: 'tsp' },
      { ingredientId: 'queso', quantity: 30, unit: 'g', optional: true },
    ]),
  ],
);

function planWith(entries: { day: number; meal: 'lunch' | 'dinner'; recipeId: string; servings?: number }[]): WeekPlan {
  const plan = emptyPlan('2026-10-12', DEFAULT_PREFERENCES);
  for (const entry of entries) {
    const slot = plan.slots[slotIndex(entry.day, entry.meal)]!;
    slot.recipeId = entry.recipeId;
    slot.servingsOverride = entry.servings;
  }
  return plan;
}

const find = (items: ReturnType<typeof buildShoppingList>, id: string) => items.find((i) => i.ingredientId === id)!;

describe('buildShoppingList', () => {
  it('escala por comensales: 200 g para 2 son 300 g para 3', () => {
    const items = buildShoppingList(planWith([{ day: 0, meal: 'lunch', recipeId: 'paella' }]), catalog, 3);
    expect(find(items, 'arroz').quantity).toBe(300);
  });

  it.each([
    [1, 100],
    [2, 200],
    [4, 400],
    [5, 500],
  ])('para %i comensales calcula %i g de arroz', (servings, grams) => {
    const items = buildShoppingList(planWith([{ day: 0, meal: 'lunch', recipeId: 'paella' }]), catalog, servings);
    expect(find(items, 'arroz').quantity).toBe(grams);
  });

  it('suma el mismo ingrediente de recetas distintas convirtiendo unidades', () => {
    const items = buildShoppingList(
      planWith([
        { day: 0, meal: 'lunch', recipeId: 'paella' },
        { day: 0, meal: 'dinner', recipeId: 'revuelto' },
      ]),
      catalog,
      2,
    );
    // media cebolla (75 g) + 100 g = 175 g → 180 g, aproximadamente 1 unidad
    const cebolla = find(items, 'cebolla');
    expect(cebolla.quantity).toBe(180);
    expect(cebolla.approxUnits).toBe(1);
    expect(cebolla.sources).toHaveLength(2);
    expect(items.filter((i) => i.ingredientId === 'cebolla')).toHaveLength(1);
  });

  it('usa los comensales propios de cada comida', () => {
    const items = buildShoppingList(
      planWith([
        { day: 0, meal: 'lunch', recipeId: 'paella' },
        { day: 1, meal: 'lunch', recipeId: 'paella', servings: 6 },
      ]),
      catalog,
      2,
    );
    expect(find(items, 'arroz').quantity).toBe(800);
  });

  it('redondea hacia arriba una sola vez, después de sumar', () => {
    // 3 huevos para 2 → 1,5 por persona; dos comidas de 1 comensal suman 3, no 2 + 2
    const items = buildShoppingList(
      planWith([
        { day: 0, meal: 'dinner', recipeId: 'revuelto', servings: 1 },
        { day: 1, meal: 'dinner', recipeId: 'revuelto', servings: 1 },
      ]),
      catalog,
      2,
    );
    expect(find(items, 'huevo').quantity).toBe(3);
  });

  it('convierte cucharadas de líquidos a mililitros', () => {
    const items = buildShoppingList(planWith([{ day: 0, meal: 'lunch', recipeId: 'paella' }]), catalog, 2);
    expect(find(items, 'caldo')).toMatchObject({ quantity: 30, unit: 'ml' });
  });

  it('lista los básicos de despensa sin cantidad', () => {
    const items = buildShoppingList(
      planWith([
        { day: 0, meal: 'lunch', recipeId: 'paella' },
        { day: 0, meal: 'dinner', recipeId: 'revuelto' },
      ]),
      catalog,
      2,
    );
    expect(find(items, 'sal')).toMatchObject({ pantry: true, quantity: null });
  });

  it('señala lo que solo aparece como opcional', () => {
    const items = buildShoppingList(planWith([{ day: 0, meal: 'dinner', recipeId: 'revuelto' }]), catalog, 2);
    expect(find(items, 'queso').optional).toBe(true);
    expect(find(items, 'huevo').optional).toBe(false);
  });

  it('ignora las franjas sin planificar y ordena por sección', () => {
    const plan = planWith([
      { day: 0, meal: 'lunch', recipeId: 'paella' },
      { day: 0, meal: 'dinner', recipeId: 'revuelto' },
    ]);
    plan.slots[slotIndex(0, 'dinner')]!.active = false;
    const items = buildShoppingList(plan, catalog, 2);
    expect(items.map((i) => i.ingredientId)).toEqual(['cebolla', 'arroz', 'caldo', 'sal']);
  });

  it('cuenta los desayunos solo cuando el menú los incluye', () => {
    const plan = planWith([{ day: 0, meal: 'lunch', recipeId: 'paella' }]);
    plan.slots[slotIndex(0, 'breakfast')]!.recipeId = 'revuelto';
    expect(find(buildShoppingList(plan, catalog, 2), 'huevo').quantity).toBe(3);
    expect(buildShoppingList(plan, catalog, 2, false).map((i) => i.ingredientId)).not.toContain('huevo');
  });

  it('devuelve una lista vacía si no hay menú', () => {
    expect(buildShoppingList(planWith([]), catalog, 2)).toEqual([]);
  });
});

describe('redondeos', () => {
  it('compra: múltiplos de 5 hasta 100, de 10 hasta 1000 y de 50 por encima', () => {
    expect(roundUpForShopping(42, 'g')).toBe(45);
    expect(roundUpForShopping(101, 'g')).toBe(110);
    expect(roundUpForShopping(1010, 'ml')).toBe(1050);
    expect(roundUpForShopping(300, 'g')).toBe(300);
    expect(roundUpForShopping(2.2, 'unit')).toBe(3);
    expect(roundUpForShopping(0.1 + 0.2 + 2.7, 'unit')).toBe(3);
  });

  it('receta: al valor cómodo más cercano', () => {
    expect(roundForRecipe(1.3, 'unit')).toBe(1.5);
    expect(roundForRecipe(0.1, 'unit')).toBe(0.5);
    expect(roundForRecipe(233, 'g')).toBe(230);
    expect(roundForRecipe(2.25, 'tbsp')).toBe(2.5);
  });
});
