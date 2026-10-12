import rawIngredients from '../../catalog/ingredients.json';
import rawNutrition from '../../catalog/nutrition.json';
import { buildCatalog } from '../domain/catalog';
import type { Catalog, Ingredient, Recipe } from '../domain/types';
import { checkCatalog } from './catalogCheck';

const recipeModules = import.meta.glob<{ default: unknown }>('../../catalog/recipes/*.json', { eager: true });

function load(): Catalog {
  const rawRecipes = Object.entries(recipeModules).map(([path, module]) => ({
    file: path.split('/').pop()!.replace(/\.json$/, ''),
    data: module.default,
  }));
  const report = checkCatalog(rawIngredients, rawRecipes, rawNutrition);
  if (!report.catalog) throw new Error(`Catálogo no válido:\n${report.errors.join('\n')}`);
  return report.catalog;
}

/** De dónde salen las calorías, para citarlo en la app. */
export const nutritionSource: { name: string; version: string; url: string; license: string } = rawNutrition.source;

/** Catálogo incluido en la app, de solo lectura. */
export const catalog: Catalog = load();

/** El catálogo de la app más las recetas e ingredientes del usuario. */
export function mergeCatalog(userIngredients: readonly Ingredient[], userRecipes: readonly Recipe[]): Catalog {
  if (userIngredients.length === 0 && userRecipes.length === 0) return catalog;
  const ingredients = [...catalog.ingredients.values(), ...userIngredients];
  const known = new Set(ingredients.map((i) => i.id));
  // Una receta con un ingrediente que ya no existe no debe tumbar la app: se deja fuera.
  const usable = userRecipes.filter((recipe) => recipe.ingredients.every((item) => known.has(item.ingredientId)));
  return buildCatalog(ingredients, [...catalog.recipes, ...usable]);
}
