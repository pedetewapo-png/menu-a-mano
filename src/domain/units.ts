import type { BaseUnit, Ingredient, RecipeUnit } from './types';

export const ML_PER_TBSP = 15;
export const ML_PER_TSP = 5;

const EPSILON = 1e-9;

/** Convierte una cantidad de receta a la unidad base del ingrediente. null si no tiene cantidad o no es convertible. */
export function toBaseQuantity(ingredient: Ingredient, quantity: number | null, unit: RecipeUnit): number | null {
  if (quantity === null || unit === 'pinch' || unit === 'toTaste') return null;
  if (unit === ingredient.baseUnit) return quantity;
  if (unit === 'unit' && ingredient.baseUnit === 'g' && ingredient.gramsPerUnit) {
    return quantity * ingredient.gramsPerUnit;
  }
  if (unit === 'g' && ingredient.baseUnit === 'unit' && ingredient.gramsPerUnit) {
    return quantity / ingredient.gramsPerUnit;
  }
  if (ingredient.baseUnit === 'ml' && unit === 'tbsp') return quantity * ML_PER_TBSP;
  if (ingredient.baseUnit === 'ml' && unit === 'tsp') return quantity * ML_PER_TSP;
  return null;
}

/** ¿Puede la lista de la compra tratar esta unidad para este ingrediente? */
export function isUsableUnit(ingredient: Ingredient, unit: RecipeUnit): boolean {
  // Los básicos de despensa se listan sin cantidad, así que admiten cualquier unidad.
  if (ingredient.pantryStaple) return true;
  if (unit === 'pinch' || unit === 'toTaste') return false;
  return toBaseQuantity(ingredient, 1, unit) !== null;
}

function stepFor(quantity: number): number {
  if (quantity < 100) return 5;
  if (quantity <= 1000) return 10;
  return 50;
}

/** Redondeo de compra: siempre hacia arriba, una sola vez y después de sumar. */
export function roundUpForShopping(quantity: number, unit: BaseUnit): number {
  if (unit === 'unit') return Math.max(1, Math.ceil(quantity - EPSILON));
  const step = stepFor(quantity);
  return Math.max(step, Math.ceil(quantity / step - EPSILON) * step);
}

/** Redondeo para mostrar una receta: al valor cómodo más cercano. */
export function roundForRecipe(quantity: number, unit: RecipeUnit): number {
  if (unit === 'g' || unit === 'ml') {
    const step = stepFor(quantity);
    return Math.max(step, Math.round(quantity / step) * step);
  }
  return Math.max(0.5, Math.round(quantity * 2) / 2);
}
