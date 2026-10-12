import { buildCatalog } from '../domain/catalog';
import type { Catalog, Ingredient, Recipe } from '../domain/types';
import { isUsableUnit } from '../domain/units';
import { ingredientSchema, nutritionFileSchema, recipeSchema } from './schemas';

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

const isMain = (r: Recipe) => r.mealTypes.includes('lunch') || r.mealTypes.includes('dinner');
const isBreakfast = (r: Recipe) => r.mealTypes.includes('breakfast');

/** Cobertura mínima del catálogo completo (especificación v2 §9.2). */
const COVERAGE: { label: string; minimum: number; test: (r: Recipe, c: Catalog) => boolean }[] = [
  { label: 'recetas de comida y cena', minimum: 70, test: isMain },
  { label: 'desayunos', minimum: 8, test: isBreakfast },
  { label: 'recetas veganas de comida o cena', minimum: 20, test: (r, c) => isMain(r) && c.derived.get(r.id)!.diet === 'vegan' },
  {
    label: 'recetas vegetarianas de comida o cena (incluye veganas)',
    minimum: 35,
    test: (r, c) => isMain(r) && c.derived.get(r.id)!.diet !== 'omnivore',
  },
  { label: 'recetas de comida o cena de 30 min o menos', minimum: 30, test: (r) => isMain(r) && r.totalMinutes <= 30 },
  { label: 'recetas aptas para cena', minimum: 35, test: (r) => r.mealTypes.includes('dinner') },
  {
    label: 'recetas de comida o cena sin gluten',
    minimum: 25,
    test: (r, c) => isMain(r) && !c.derived.get(r.id)!.allergens.includes('gluten'),
  },
  { label: 'recetas de comida o cena de coste 1', minimum: 25, test: (r) => isMain(r) && r.cost === 1 },
  { label: 'recetas con legumbres como grupo principal', minimum: 10, test: (r) => r.mainGroup === 'legumes' },
  { label: 'desayunos veganos', minimum: 3, test: (r, c) => isBreakfast(r) && c.derived.get(r.id)!.diet === 'vegan' },
  {
    label: 'desayunos sin gluten',
    minimum: 3,
    test: (r, c) => isBreakfast(r) && !c.derived.get(r.id)!.allergens.includes('gluten'),
  },
];

const NO_NUTRITION_SOURCE = { name: '-', version: '-', url: 'https://example.org/', license: '-' };

function describeIssues(error: { issues: { path: PropertyKey[]; message: string }[] }): string {
  return error.issues.map((i) => `${i.path.join('.') || '(raíz)'}: ${i.message}`).join('; ');
}

/** Valida el catálogo en bruto. Los errores impiden compilar; los avisos señalan trabajo pendiente. */
export function checkCatalog(rawIngredients: unknown, rawRecipes: RawRecipeFile[], rawNutrition?: unknown): CatalogReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Las calorías vienen en un archivo aparte, con su procedencia, y se unen aquí a cada ingrediente.
  const nutrition = nutritionFileSchema.safeParse(rawNutrition ?? { source: NO_NUTRITION_SOURCE, foods: {} });
  if (!nutrition.success) errors.push(`nutrition.json: ${describeIssues(nutrition.error)}`);
  const foods = nutrition.success ? nutrition.data.foods : {};

  const ingredients: Ingredient[] = [];
  if (!Array.isArray(rawIngredients)) {
    errors.push('ingredients.json debe contener una lista');
  } else {
    for (const [index, raw] of rawIngredients.entries()) {
      const parsed = ingredientSchema.safeParse(raw);
      if (!parsed.success) {
        errors.push(`Ingrediente nº ${index + 1}: ${describeIssues(parsed.error)}`);
        continue;
      }
      const food = foods[parsed.data.id];
      if (!food) {
        ingredients.push(parsed.data);
        continue;
      }
      const { fdcId: _fdcId, description: _description, ...values } = food;
      ingredients.push({ ...parsed.data, nutrition: values });
    }
  }
  const known = new Set(ingredients.map((i) => i.id));
  for (const id of Object.keys(foods)) {
    if (!known.has(id)) errors.push(`nutrition.json: "${id}" no es un ingrediente del catálogo`);
  }
  if (rawNutrition !== undefined) {
    const missing = ingredients.filter((i) => !i.nutrition).map((i) => i.id);
    if (missing.length > 0) warnings.push(`Ingredientes sin datos de calorías: ${missing.join(', ')}`);
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

  // Las fotos del catálogo se aplazan a la v3: que falten no es trabajo pendiente de esta versión.
  // Una receta no entra en la app hasta que una persona la ha revisado (especificación v2, §9.3).
  for (const recipe of recipes) {
    if (!recipe.reviewedOn) errors.push(`Receta "${recipe.id}": falta la fecha de revisión (reviewedOn)`);
  }

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
