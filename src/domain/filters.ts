import { dietAllows } from './catalog';
import type { Allergen, Catalog, IngredientGroup, Preferences, Recipe } from './types';

export type Violation =
  | { kind: 'diet' }
  | { kind: 'ingredient'; ingredientId: string }
  | { kind: 'group'; group: IngredientGroup }
  | { kind: 'allergen'; allergen: Allergen }
  | { kind: 'time' };

/** Restricciones obligatorias que la receta incumple. Vacío = compatible. */
export function violations(recipe: Recipe, catalog: Catalog, prefs: Preferences): Violation[] {
  const info = catalog.derived.get(recipe.id);
  if (!info) throw new Error(`Receta sin información derivada: "${recipe.id}"`);
  const result: Violation[] = [];
  if (!dietAllows(prefs.diet, info.diet)) result.push({ kind: 'diet' });
  for (const ingredientId of prefs.excludedIngredientIds) {
    if (info.ingredientIds.includes(ingredientId)) result.push({ kind: 'ingredient', ingredientId });
  }
  for (const group of prefs.excludedGroups) {
    if (info.groups.includes(group)) result.push({ kind: 'group', group });
  }
  for (const allergen of prefs.excludedAllergens) {
    if (info.allergens.includes(allergen)) result.push({ kind: 'allergen', allergen });
  }
  if (prefs.maxTotalMinutes !== null && recipe.totalMinutes > prefs.maxTotalMinutes) {
    result.push({ kind: 'time' });
  }
  return result;
}

export function isCompatible(recipe: Recipe, catalog: Catalog, prefs: Preferences): boolean {
  return violations(recipe, catalog, prefs).length === 0;
}
