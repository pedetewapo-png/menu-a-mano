import type { Ingredient, Recipe, RecipeUnit } from './types';
import { ML_PER_TBSP, ML_PER_TSP } from './units';

/** Ingesta de referencia de un adulto medio (Reglamento UE 1169/2011): la de las etiquetas de los alimentos. */
export const REFERENCE_KCAL_PER_DAY = 2000;

/**
 * Gramos que supone una cantidad de receta, para calcular calorías.
 * 0 = no aporta (al gusto, una pizca, o algo que no se come). null = no se puede saber.
 */
export function gramsOf(ingredient: Ingredient, quantity: number | null, unit: RecipeUnit): number | null {
  const nutrition = ingredient.nutrition;
  if (nutrition?.ignore) return 0;
  if (quantity === null || unit === 'pinch' || unit === 'toTaste') return 0;
  switch (unit) {
    case 'g':
      return quantity;
    case 'ml':
      return quantity * (nutrition?.gramsPerMl ?? 1);
    case 'unit': {
      const gramsPerUnit = nutrition?.gramsPerUnit ?? ingredient.gramsPerUnit;
      return gramsPerUnit ? quantity * gramsPerUnit : null;
    }
    case 'tbsp':
    case 'tsp': {
      const ml = quantity * (unit === 'tbsp' ? ML_PER_TBSP : ML_PER_TSP);
      return nutrition?.gramsPerMl ? ml * nutrition.gramsPerMl : null;
    }
  }
}

/**
 * Calorías de una ración, sumando los ingredientes. null si a algún ingrediente con
 * cantidad le falta el dato: es mejor no dar cifra que dar una incompleta.
 */
export function kcalPerServing(recipe: Recipe, ingredients: ReadonlyMap<string, Ingredient>): number | null {
  if (recipe.ingredients.length === 0 || !(recipe.baseServings > 0)) return null;
  let total = 0;
  for (const item of recipe.ingredients) {
    const ingredient = ingredients.get(item.ingredientId);
    if (!ingredient) return null;
    const grams = gramsOf(ingredient, item.quantity, item.unit);
    if (grams === 0) continue;
    if (grams === null || !ingredient.nutrition) return null;
    total += (grams * ingredient.nutrition.kcal) / 100;
  }
  return total / recipe.baseServings;
}

/** Las calorías se muestran redondeadas a la decena: más precisión sería fingida. */
export function roundKcal(kcal: number): number {
  return Math.round(kcal / 10) * 10;
}
