import { describe, expect, it } from 'vitest';
import rawNutrition from '../../catalog/nutrition.json';
import { catalog } from '../data/catalog';
import { gramsOf, kcalPerServing, roundKcal } from '../domain/nutrition';
import type { Ingredient, Recipe, RecipeIngredient } from '../domain/types';

const ingredient = (id: string, extra: Partial<Ingredient> = {}): Ingredient => ({
  id,
  name: id,
  section: 'other',
  baseUnit: 'g',
  diet: 'vegan',
  allergens: [],
  mayContain: [],
  groups: [],
  pantryStaple: false,
  ...extra,
});

const recipe = (ingredients: RecipeIngredient[], baseServings = 2): Recipe => ({
  id: 'r',
  name: 'r',
  summary: '',
  mealTypes: ['lunch'],
  baseServings,
  totalMinutes: 10,
  activeMinutes: 10,
  cost: 1,
  mainGroup: 'vegetables',
  cuisine: 'other',
  ingredients,
  steps: ['.'],
  source: { author: 't', license: 't' },
});

const arroz = ingredient('arroz', { nutrition: { kcal: 360 } });
const aceite = ingredient('aceite', { baseUnit: 'ml', pantryStaple: true, nutrition: { kcal: 884, gramsPerMl: 0.9 } });
const huevo = ingredient('huevo', { baseUnit: 'unit', nutrition: { kcal: 143, gramsPerUnit: 50 } });
const cebolla = ingredient('cebolla', { gramsPerUnit: 150, nutrition: { kcal: 40 } });
const sal = ingredient('sal', { pantryStaple: true, nutrition: { kcal: 0 } });
const laurel = ingredient('laurel', { baseUnit: 'unit', pantryStaple: true, nutrition: { kcal: 313, ignore: true } });
const misterio = ingredient('misterio');
const all = new Map([arroz, aceite, huevo, cebolla, sal, laurel, misterio].map((i) => [i.id, i]));

describe('gramos de una cantidad de receta', () => {
  it('convierte unidades, cucharadas y mililitros', () => {
    expect(gramsOf(arroz, 200, 'g')).toBe(200);
    expect(gramsOf(huevo, 2, 'unit')).toBe(100);
    // Si la tabla no da el peso de una unidad, vale el de compra.
    expect(gramsOf(cebolla, 0.5, 'unit')).toBe(75);
    expect(gramsOf(aceite, 2, 'tbsp')).toBeCloseTo(27);
    expect(gramsOf(aceite, 1, 'tsp')).toBeCloseTo(4.5);
    expect(gramsOf(aceite, 100, 'ml')).toBeCloseTo(90);
  });

  it('lo que va al gusto, una pizca o no se come no aporta', () => {
    expect(gramsOf(sal, null, 'toTaste')).toBe(0);
    expect(gramsOf(arroz, 1, 'pinch')).toBe(0);
    expect(gramsOf(laurel, 1, 'unit')).toBe(0);
  });

  it('sin el peso de la unidad o la densidad, no se puede saber', () => {
    expect(gramsOf(arroz, 1, 'unit')).toBeNull();
    expect(gramsOf(arroz, 1, 'tbsp')).toBeNull();
  });
});

describe('calorías por ración', () => {
  it('suma los ingredientes y reparte entre las raciones', () => {
    const paella = recipe([
      { ingredientId: 'arroz', quantity: 200, unit: 'g' },
      { ingredientId: 'cebolla', quantity: 1, unit: 'unit' },
      { ingredientId: 'aceite', quantity: 2, unit: 'tbsp' },
      { ingredientId: 'huevo', quantity: 2, unit: 'unit' },
      { ingredientId: 'sal', quantity: null, unit: 'toTaste' },
      { ingredientId: 'laurel', quantity: 1, unit: 'unit' },
    ]);
    // (200 × 360 + 150 × 40 + 27 × 884 + 100 × 143) / 100 = 1.161,68 kcal para 2 raciones
    expect(kcalPerServing(paella, all)).toBeCloseTo(580.84);
    expect(kcalPerServing({ ...paella, baseServings: 4 }, all)).toBeCloseTo(290.42);
  });

  it('no da cifra si a un ingrediente con cantidad le falta el dato', () => {
    const incompleta = recipe([
      { ingredientId: 'arroz', quantity: 200, unit: 'g' },
      { ingredientId: 'misterio', quantity: 50, unit: 'g' },
    ]);
    expect(kcalPerServing(incompleta, all)).toBeNull();
    // Si el ingrediente sin dato va al gusto, no impide el cálculo.
    const alGusto = recipe([
      { ingredientId: 'arroz', quantity: 200, unit: 'g' },
      { ingredientId: 'misterio', quantity: null, unit: 'toTaste' },
    ]);
    expect(kcalPerServing(alGusto, all)).toBe(360);
  });

  it('una receta sin ingredientes no tiene calorías que mostrar', () => {
    expect(kcalPerServing(recipe([]), all)).toBeNull();
  });

  it('un ingrediente propio medido por unidades usa las calorías por unidad', () => {
    const barrita = ingredient('u-ing-barrita', { baseUnit: 'unit', custom: true, nutrition: { kcal: 120, gramsPerUnit: 100 } });
    const merienda = recipe([{ ingredientId: barrita.id, quantity: 3, unit: 'unit' }], 1);
    expect(kcalPerServing(merienda, new Map([[barrita.id, barrita]]))).toBe(360);
  });

  it('se muestran redondeadas a la decena', () => {
    expect(roundKcal(479.4)).toBe(480);
    expect(roundKcal(524.9)).toBe(520);
    expect(roundKcal(1240)).toBe(1240);
  });
});

describe('datos de calorías del catálogo', () => {
  it('coinciden con el cálculo manual a partir de la tabla de USDA', () => {
    // Ensalada de alubias blancas, 2 raciones. Valores por 100 g de SR Legacy:
    // alubias cocidas 140 · tomate 18 · pimiento rojo 26 · cebolleta 32 · aceitunas 145 · aceite 884 · vinagre 19.
    // 400 g alubias, 2 tomates (300 g), ½ pimiento (100 g), 1 cebolleta (60 g), 40 g aceitunas,
    // 2 cucharadas de aceite (30 ml × 0,9 = 27 g) y 1 de vinagre (15 g); la sal va al gusto.
    const manual = (400 * 140 + 300 * 18 + 100 * 26 + 60 * 32 + 40 * 145 + 27 * 884 + 15 * 19) / 100 / 2;
    const ensalada = catalog.recipeById.get('ensalada-de-alubias-blancas')!;
    expect(kcalPerServing(ensalada, catalog.ingredients)).toBeCloseTo(manual, 5);
    expect(roundKcal(manual)).toBe(480);
  });

  it('todos los ingredientes tienen su dato, con el alimento de la tabla del que procede', () => {
    for (const item of catalog.ingredients.values()) {
      const food = (rawNutrition.foods as Record<string, { fdcId: number; description: string; kcal: number }>)[item.id];
      expect(food, item.id).toBeDefined();
      expect(food!.fdcId).toBeGreaterThan(0);
      expect(food!.description.length).toBeGreaterThan(0);
      expect(item.nutrition?.kcal).toBe(food!.kcal);
    }
    expect(rawNutrition.source.name).toMatch(/FoodData Central/);
  });

  it('todas las recetas del catálogo pueden mostrar sus calorías, y son verosímiles', () => {
    for (const item of catalog.recipes) {
      const kcal = kcalPerServing(item, catalog.ingredients);
      expect(kcal, item.id).not.toBeNull();
      expect(kcal!, item.id).toBeGreaterThan(100);
      expect(kcal!, item.id).toBeLessThan(1000);
    }
  });
});
