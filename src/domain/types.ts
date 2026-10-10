export type Diet = 'omnivore' | 'vegetarian' | 'vegan';
export const DIETS = ['omnivore', 'vegetarian', 'vegan'] as const;

export type MealType = 'lunch' | 'dinner';
export const MEAL_TYPES = ['lunch', 'dinner'] as const;

export const BASE_UNITS = ['g', 'ml', 'unit'] as const;
export type BaseUnit = (typeof BASE_UNITS)[number];
export const RECIPE_UNITS = ['g', 'ml', 'unit', 'tbsp', 'tsp', 'pinch', 'toTaste'] as const;
export type RecipeUnit = (typeof RECIPE_UNITS)[number];

// Los 14 alérgenos de declaración obligatoria (Reglamento UE 1169/2011)
export const ALLERGENS = [
  'gluten',
  'crustaceans',
  'eggs',
  'fish',
  'peanuts',
  'soy',
  'milk',
  'treeNuts',
  'celery',
  'mustard',
  'sesame',
  'sulphites',
  'lupin',
  'molluscs',
] as const;
export type Allergen = (typeof ALLERGENS)[number];

// En orden de recorrido habitual del supermercado
export const SHOP_SECTIONS = [
  'produce',
  'meat',
  'fish',
  'dairyEggs',
  'bakery',
  'dryGoods',
  'canned',
  'frozen',
  'other',
  'condiments',
] as const;
export type ShopSection = (typeof SHOP_SECTIONS)[number];

export const MAIN_GROUPS = [
  'legumes',
  'fish',
  'whiteMeat',
  'redMeat',
  'eggs',
  'vegetables',
  'grainsPasta',
  'plantProtein',
] as const;
export type MainGroup = (typeof MAIN_GROUPS)[number];

// Grupos que el usuario puede excluir de una vez
export const INGREDIENT_GROUPS = [
  'pork',
  'beef',
  'poultry',
  'fish',
  'shellfish',
  'dairy',
  'eggs',
  'legumes',
  'mushrooms',
  'nuts',
  'spicy',
] as const;
export type IngredientGroup = (typeof INGREDIENT_GROUPS)[number];

export interface Ingredient {
  id: string;
  name: string;
  namePlural?: string;
  /** Nombre de la unidad contable cuando no coincide con el ingrediente ("diente de ajo"). */
  unitName?: string;
  unitNamePlural?: string;
  section: ShopSection;
  /** Unidad en la que se suma y se compra. */
  baseUnit: BaseUnit;
  /** Permite convertir entre unidades y gramos (1 cebolla ≈ 150 g). */
  gramsPerUnit?: number;
  /** Dieta más restrictiva que lo admite. */
  diet: Diet;
  allergens: Allergen[];
  /** Depende de la marca; se filtra igual que `allergens`. */
  mayContain: Allergen[];
  groups: IngredientGroup[];
  pantryStaple: boolean;
}

export interface RecipeIngredient {
  ingredientId: string;
  /** null con 'toTaste'. */
  quantity: number | null;
  unit: RecipeUnit;
  optional?: boolean;
  note?: string;
}

export interface RecipeImage {
  file: string;
  alt: string;
  origin: 'licensed' | 'own';
  title?: string;
  author: string;
  license: string;
  sourceUrl?: string;
  retrievedOn?: string;
  modifications: string;
}

export interface Recipe {
  id: string;
  name: string;
  summary: string;
  mealTypes: MealType[];
  baseServings: number;
  totalMinutes: number;
  activeMinutes: number;
  /** Estimación relativa, orientativa. */
  cost: 1 | 2 | 3;
  mainGroup: MainGroup;
  cuisine: 'spanish' | 'mediterranean' | 'other';
  ingredients: RecipeIngredient[];
  steps: string[];
  notes?: string;
  image?: RecipeImage;
  source: { author: string; license: string; url?: string };
  /** Fecha de la última revisión humana de ingredientes y alérgenos. */
  reviewedOn?: string;
  /** Las recetas retiradas no se proponen, pero siguen existiendo para los menús guardados. */
  retired?: boolean;
}

/** Calculado a partir de los ingredientes; nunca se escribe a mano. */
export interface DerivedRecipeInfo {
  diet: Diet;
  allergens: Allergen[];
  ingredientIds: string[];
  groups: IngredientGroup[];
}

export interface Catalog {
  ingredients: Map<string, Ingredient>;
  recipes: Recipe[];
  recipeById: Map<string, Recipe>;
  derived: Map<string, DerivedRecipeInfo>;
}

export interface Preferences {
  diet: Diet;
  /** 1–12 */
  servings: number;
  excludedIngredientIds: string[];
  excludedGroups: IngredientGroup[];
  excludedAllergens: Allergen[];
  maxTotalMinutes: number | null;
  preferBudget: boolean;
  /** [día 0–6][0 = comida, 1 = cena] */
  activeSlots: boolean[][];
  onboardingDone: boolean;
}

export const MIN_SERVINGS = 1;
export const MAX_SERVINGS = 12;

export const DEFAULT_PREFERENCES: Preferences = {
  diet: 'omnivore',
  servings: 2,
  excludedIngredientIds: [],
  excludedGroups: [],
  excludedAllergens: [],
  maxTotalMinutes: null,
  preferBudget: false,
  activeSlots: Array.from({ length: 7 }, () => [true, true]),
  onboardingDone: false,
};

export interface MealSlot {
  /** 0 = lunes */
  day: number;
  mealType: MealType;
  active: boolean;
  recipeId: string | null;
  locked: boolean;
  servingsOverride?: number;
  origin: 'generated' | 'manual';
}

export interface WeekPlan {
  /** Fecha ISO del lunes. */
  weekStart: string;
  /** 14 franjas, ordenadas por día y después comida/cena. */
  slots: MealSlot[];
  /** Semilla de la última generación. */
  seed: number;
  updatedAt: string;
}

export interface SavedPlan {
  id: string;
  name: string;
  slots: { day: number; mealType: MealType; recipeId: string | null }[];
  createdAt: string;
}

export interface Favorite {
  recipeId: string;
  addedAt: string;
}

export interface ManualShoppingItem {
  id: string;
  text: string;
  section: ShopSection;
  checked: boolean;
}

/** Solo los ajustes del usuario; las cantidades se recalculan desde el menú. */
export interface ShoppingListState {
  weekStart: string;
  /** Por ingredientId. La cantidad permite detectar que cambió después de marcarlo. */
  checked: Record<string, { quantityWhenChecked: number | null }>;
  alreadyHave: string[];
  manualItems: ManualShoppingItem[];
}

export interface Meta {
  schemaVersion: number;
  lastExportAt?: string;
}
