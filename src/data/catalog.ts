import rawIngredients from '../../catalog/ingredients.json';
import type { Catalog } from '../domain/types';
import { checkCatalog } from './catalogCheck';

const recipeModules = import.meta.glob<{ default: unknown }>('../../catalog/recipes/*.json', { eager: true });

function load(): Catalog {
  const rawRecipes = Object.entries(recipeModules).map(([path, module]) => ({
    file: path.split('/').pop()!.replace(/\.json$/, ''),
    data: module.default,
  }));
  const report = checkCatalog(rawIngredients, rawRecipes);
  if (!report.catalog) throw new Error(`Catálogo no válido:\n${report.errors.join('\n')}`);
  return report.catalog;
}

/** Catálogo incluido en la app, de solo lectura. */
export const catalog: Catalog = load();
