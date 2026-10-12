import { z } from 'zod';
import type { Catalog, CustomIngredient, Recipe, UserRecipe } from '../domain/types';
import { USER_ID_PREFIX } from '../domain/types';
import { missingForReady } from '../domain/userRecipes';
import { customIngredientSchema, userRecipeContentSchema } from './schemas';

// Archivo con el que una persona le pasa una receta suya a otra. Lleva la receta y,
// completos, los ingredientes propios que necesita; los del catálogo viajan solo
// como identificador, porque quien la recibe ya los tiene.

const RECIPE_FILE_APP = 'menu-a-mano';
export const RECIPE_FILE_VERSION = 1;

const recipeFileSchema = z.object({
  recipe: userRecipeContentSchema,
  customIngredients: z.array(customIngredientSchema),
  photo: z.string().startsWith('data:image/').optional(),
  photoThumb: z.string().startsWith('data:image/').optional(),
});

export type RecipeFileContent = z.infer<typeof recipeFileSchema>;

export interface RecipeFile extends RecipeFileContent {
  app: typeof RECIPE_FILE_APP;
  kind: 'recipe';
  schemaVersion: number;
  exportedAt: string;
}

export function buildRecipeFile(recipe: Recipe, catalog: Catalog, exportedAt: string, photo?: string): RecipeFile {
  const customIngredients = recipe.ingredients
    .map((item) => catalog.ingredients.get(item.ingredientId))
    .filter((ingredient): ingredient is CustomIngredient => ingredient?.custom === true);
  return {
    app: RECIPE_FILE_APP,
    kind: 'recipe',
    schemaVersion: RECIPE_FILE_VERSION,
    exportedAt,
    recipe: {
      name: recipe.name,
      summary: recipe.summary,
      mealTypes: recipe.mealTypes,
      baseServings: recipe.baseServings,
      totalMinutes: recipe.totalMinutes,
      activeMinutes: recipe.activeMinutes,
      cost: recipe.cost,
      mainGroup: recipe.mainGroup,
      cuisine: recipe.cuisine,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      notes: recipe.notes,
      source: recipe.source,
    },
    // Sin repetidos, aunque la receta use dos veces el mismo ingrediente.
    customIngredients: [...new Map(customIngredients.map((i) => [i.id, i])).values()],
    photo,
    photoThumb: 'photoThumb' in recipe ? (recipe.photoThumb as string | undefined) : undefined,
  };
}

export type RecipeFileResult =
  | { ok: true; content: RecipeFileContent }
  | { ok: false; reason: 'notJson' | 'notRecipe' | 'newerVersion' | 'invalid' | 'unknownIngredients'; detail?: string };

/** Valida un archivo de receta entero antes de que se guarde nada. */
export function parseRecipeFile(text: string, catalog: Catalog): RecipeFileResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'notJson' };
  }
  const header = z
    .object({ app: z.literal(RECIPE_FILE_APP), kind: z.literal('recipe'), schemaVersion: z.number().int().positive() })
    .safeParse(raw);
  if (!header.success) return { ok: false, reason: 'notRecipe' };
  if (header.data.schemaVersion > RECIPE_FILE_VERSION) return { ok: false, reason: 'newerVersion' };

  const body = recipeFileSchema.safeParse(raw);
  if (!body.success) {
    const issue = body.error.issues[0];
    return { ok: false, reason: 'invalid', detail: issue ? `${issue.path.join('.')}: ${issue.message}` : undefined };
  }

  // Cada ingrediente tiene que venir en el archivo (si es propio) o existir en el catálogo de esta app.
  const shipped = new Set(body.data.customIngredients.map((i) => i.id));
  const unknown = body.data.recipe.ingredients
    .map((item) => item.ingredientId)
    .filter((id) => !shipped.has(id) && !(catalog.ingredients.has(id) && !id.startsWith(USER_ID_PREFIX)));
  if (unknown.length > 0) return { ok: false, reason: 'unknownIngredients', detail: unknown.join(', ') };

  return { ok: true, content: body.data };
}

const normalizeName = (name: string) =>
  name
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Dos ingredientes propios son el mismo si coinciden en todo lo que afecta a filtros y compra. */
function sameIngredient(a: CustomIngredient, b: CustomIngredient): boolean {
  const key = (i: CustomIngredient) =>
    JSON.stringify([
      normalizeName(i.name),
      i.section,
      i.baseUnit,
      i.gramsPerUnit ?? null,
      i.diet,
      [...i.allergens].sort(),
      [...i.mayContain].sort(),
      [...i.groups].sort(),
      i.pantryStaple,
    ]);
  return key(a) === key(b);
}

export interface PreparedImport {
  recipe: UserRecipe;
  /** Ingredientes propios que hay que crear; los que ya existían idénticos se reutilizan. */
  newIngredients: CustomIngredient[];
  photo?: string;
}

/**
 * Convierte un archivo ya validado en una receta lista para guardar. Recibe siempre
 * identificadores nuevos: los del archivo son de otra instalación y podrían coincidir con los propios.
 */
export function prepareImport(
  content: RecipeFileContent,
  existing: readonly CustomIngredient[],
  newId: () => string,
  now: string,
): PreparedImport {
  const idMap = new Map<string, string>();
  const newIngredients: CustomIngredient[] = [];
  for (const ingredient of content.customIngredients as CustomIngredient[]) {
    const match = [...existing, ...newIngredients].find((candidate) => sameIngredient(candidate, ingredient));
    if (match) {
      idMap.set(ingredient.id, match.id);
    } else {
      const copy = { ...ingredient, id: `${USER_ID_PREFIX}ing-${newId()}` };
      newIngredients.push(copy);
      idMap.set(ingredient.id, copy.id);
    }
  }

  const draft: UserRecipe = {
    ...content.recipe,
    id: `${USER_ID_PREFIX}${newId()}`,
    ingredients: content.recipe.ingredients.map((item) => ({
      ...item,
      ingredientId: idMap.get(item.ingredientId) ?? item.ingredientId,
    })),
    origin: 'imported',
    status: 'draft',
    includeInPlanner: true,
    photoThumb: content.photo ? content.photoThumb : undefined,
    updatedAt: now,
  };
  return {
    recipe: { ...draft, status: missingForReady(draft).length === 0 ? 'ready' : 'draft' },
    newIngredients,
    photo: content.photo,
  };
}
