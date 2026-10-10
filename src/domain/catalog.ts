import type {
  Allergen,
  Catalog,
  DerivedRecipeInfo,
  Diet,
  Ingredient,
  IngredientGroup,
  Recipe,
} from './types';

const DIET_RANK: Record<Diet, number> = { vegan: 0, vegetarian: 1, omnivore: 2 };
const DIET_BY_RANK: Diet[] = ['vegan', 'vegetarian', 'omnivore'];

/** ¿Puede alguien con la dieta `preferred` comer algo cuya dieta mínima es `required`? */
export function dietAllows(preferred: Diet, required: Diet): boolean {
  return DIET_RANK[required] <= DIET_RANK[preferred];
}

function deriveRecipeInfo(recipe: Recipe, ingredients: Map<string, Ingredient>): DerivedRecipeInfo {
  let rank = 0;
  const allergens = new Set<Allergen>();
  const groups = new Set<IngredientGroup>();
  const ingredientIds: string[] = [];
  // Los ingredientes opcionales cuentan: una exclusión no puede depender de que el usuario los omita.
  for (const item of recipe.ingredients) {
    const ingredient = ingredients.get(item.ingredientId);
    if (!ingredient) {
      throw new Error(`La receta "${recipe.id}" usa un ingrediente inexistente: "${item.ingredientId}"`);
    }
    ingredientIds.push(ingredient.id);
    rank = Math.max(rank, DIET_RANK[ingredient.diet]);
    for (const a of ingredient.allergens) allergens.add(a);
    for (const a of ingredient.mayContain) allergens.add(a);
    for (const g of ingredient.groups) groups.add(g);
  }
  return {
    diet: DIET_BY_RANK[rank]!,
    allergens: [...allergens],
    ingredientIds,
    groups: [...groups],
  };
}

export function buildCatalog(ingredientList: Ingredient[], recipeList: Recipe[]): Catalog {
  const ingredients = new Map(ingredientList.map((i) => [i.id, i]));
  const recipes = [...recipeList].sort((a, b) => a.id.localeCompare(b.id));
  const recipeById = new Map(recipes.map((r) => [r.id, r]));
  const derived = new Map(recipes.map((r) => [r.id, deriveRecipeInfo(r, ingredients)]));
  return { ingredients, recipes, recipeById, derived };
}
