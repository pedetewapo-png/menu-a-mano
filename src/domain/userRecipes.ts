import type { Recipe } from './types';
import { isUserRecipe } from './types';

/** ¿Puede ponerse en un menú? Las recetas retiradas y los borradores, no. */
export function isUsable(recipe: Recipe): boolean {
  return !recipe.retired && !(isUserRecipe(recipe) && recipe.status === 'draft');
}

/** ¿La propone el planificador por su cuenta? */
export function isAutoPlanned(recipe: Recipe): boolean {
  return isUsable(recipe) && !(isUserRecipe(recipe) && !recipe.includeInPlanner);
}

export type MissingField = 'name' | 'mealTypes' | 'time' | 'ingredients' | 'quantities' | 'steps';

/** Lo que le falta a una receta para poder usarse en el menú. Vacío = completa. */
export function missingForReady(recipe: Recipe): MissingField[] {
  const missing: MissingField[] = [];
  if (recipe.name.trim() === '') missing.push('name');
  if (recipe.mealTypes.length === 0) missing.push('mealTypes');
  if (!(recipe.totalMinutes > 0)) missing.push('time');
  if (recipe.ingredients.length === 0) missing.push('ingredients');
  // Toda cantidad debe estar escrita, salvo en los ingredientes "al gusto".
  else if (recipe.ingredients.some((i) => i.unit !== 'toTaste' && !(i.quantity !== null && i.quantity > 0))) {
    missing.push('quantities');
  }
  if (recipe.steps.every((step) => step.trim() === '')) missing.push('steps');
  return missing;
}
