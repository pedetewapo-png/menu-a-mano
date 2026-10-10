import { buildCatalog } from '../domain/catalog';
import type { Catalog, Ingredient, Recipe } from '../domain/types';
import { isUsableUnit } from '../domain/units';
import { ingredientSchema, recipeSchema } from './schemas';

export interface RawRecipeFile {
  /** Nombre del archivo sin extensión. */
  file: string;
  data: unknown;
}

export interface CatalogReport {
  errors: string[];
  warnings: string[];
  catalog?: Catalog;
}

/** Cobertura mínima del catálogo completo (especificación §13.2). */
const COVERAGE: { label: string; minimum: number; test: (r: Recipe, c: Catalog) => boolean }[] = [
  { label: 'recetas veganas', minimum: 16, test: (r, c) => c.derived.get(r.id)!.diet === 'vegan' },
  { label: 'recetas vegetarianas (incluye veganas)', minimum: 26, test: (r, c) => c.derived.get(r.id)!.diet !== 'omnivore' },
  { label: 'recetas de 30 min o menos', minimum: 20, test: (r) => r.totalMinutes <= 30 },
  { label: 'recetas aptas para cena', minimum: 20, test: (r) => r.mealTypes.includes('dinner') },
  { label: 'recetas sin gluten', minimum: 16, test: (r, c) => !c.derived.get(r.id)!.allergens.includes('gluten') },
  { label: 'recetas de coste 1', minimum: 15, test: (r) => r.cost === 1 },
  { label: 'recetas con legumbres como grupo principal', minimum: 8, test: (r) => r.mainGroup === 'legumes' },
];

function describeIssues(error: { issues: { path: PropertyKey[]; message: string }[] }): string {
  return error.issues.map((i) => `${i.path.join('.') || '(raíz)'}: ${i.message}`).join('; ');
}

/** Valida el catálogo en bruto. Los errores impiden compilar; los avisos señalan trabajo pendiente. */
export function checkCatalog(rawIngredients: unknown, rawRecipes: RawRecipeFile[]): CatalogReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  const ingredients: Ingredient[] = [];
  if (!Array.isArray(rawIngredients)) {
    errors.push('ingredients.json debe contener una lista');
  } else {
    for (const [index, raw] of rawIngredients.entries()) {
      const parsed = ingredientSchema.safeParse(raw);
      if (parsed.success) ingredients.push(parsed.data);
      else errors.push(`Ingrediente nº ${index + 1}: ${describeIssues(parsed.error)}`);
    }
  }
  const ingredientIds = new Set<string>();
  for (const ingredient of ingredients) {
    if (ingredientIds.has(ingredient.id)) errors.push(`Ingrediente duplicado: "${ingredient.id}"`);
    ingredientIds.add(ingredient.id);
  }

  const recipes: Recipe[] = [];
  const recipeIds = new Set<string>();
  const byId = new Map(ingredients.map((i) => [i.id, i]));
  for (const { file, data } of rawRecipes) {
    const parsed = recipeSchema.safeParse(data);
    if (!parsed.success) {
      errors.push(`Receta "${file}": ${describeIssues(parsed.error)}`);
      continue;
    }
    const recipe = parsed.data;
    if (recipe.id !== file) errors.push(`Receta "${file}": el id "${recipe.id}" no coincide con el nombre del archivo`);
    if (recipeIds.has(recipe.id)) errors.push(`Receta duplicada: "${recipe.id}"`);
    recipeIds.add(recipe.id);
    if (recipe.activeMinutes > recipe.totalMinutes) {
      errors.push(`Receta "${recipe.id}": el tiempo activo supera al total`);
    }

    let valid = true;
    for (const item of recipe.ingredients) {
      const ingredient = byId.get(item.ingredientId);
      if (!ingredient) {
        errors.push(`Receta "${recipe.id}": ingrediente inexistente "${item.ingredientId}"`);
        valid = false;
        continue;
      }
      if ((item.unit === 'toTaste') !== (item.quantity === null)) {
        errors.push(`Receta "${recipe.id}": "${item.ingredientId}" debe llevar cantidad salvo que sea "al gusto"`);
      }
      if (!isUsableUnit(ingredient, item.unit)) {
        errors.push(
          `Receta "${recipe.id}": "${item.ingredientId}" en "${item.unit}" no se puede convertir a "${ingredient.baseUnit}"`,
        );
      }
    }
    if (valid) recipes.push(recipe);
  }

  const pending = (label: string, missing: Recipe[]) => {
    if (missing.length > 0) warnings.push(`${missing.length} de ${recipes.length} recetas ${label}`);
  };
  pending('sin imagen', recipes.filter((r) => !r.image));
  pending('con ingredientes y alérgenos sin revisar por una persona', recipes.filter((r) => !r.reviewedOn));

  if (errors.length > 0) return { errors, warnings };

  const catalog = buildCatalog(ingredients, recipes);
  const used = new Set(recipes.flatMap((r) => r.ingredients.map((i) => i.ingredientId)));
  for (const ingredient of ingredients) {
    if (!used.has(ingredient.id)) warnings.push(`Ingrediente sin usar: "${ingredient.id}"`);
  }
  const active = recipes.filter((r) => !r.retired);
  for (const rule of COVERAGE) {
    const count = active.filter((r) => rule.test(r, catalog)).length;
    if (count < rule.minimum) warnings.push(`Cobertura: ${count} ${rule.label} (mínimo ${rule.minimum})`);
  }
  return { errors, warnings, catalog };
}
