export type Diet = 'omnivore' | 'vegetarian' | 'vegan';
export const DIETS = ['omnivore', 'vegetarian', 'vegan'] as const;

export type MealType = 'breakfast' | 'lunch' | 'dinner';
/** En el orden del día; es también el orden de las franjas dentro de cada día. */
export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'] as const;
export const MEALS_PER_DAY = MEAL_TYPES.length;
export const DAYS_PER_WEEK = 7;

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
  'dairy',
  'fruit',
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

/**
 * Valores por 100 g de alimento. En los ingredientes de la app vienen de una tabla
 * oficial; en los propios, de la etiqueta que copia el usuario (solo las calorías).
 */
export interface Nutrition {
  kcal: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  /** Peso de una unidad (un huevo, un diente de ajo) cuando difiere del de compra. */
  gramsPerUnit?: number;
  /** Para pasar cucharadas y mililitros a gramos. */
  gramsPerMl?: number;
  /** Se usa para aromatizar y no se come (el laurel): no cuenta. */
  ignore?: boolean;
}

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
  /** Añadido por el usuario: sus alérgenos los declaró él, no vienen del catálogo. */
  custom?: boolean;
  nutrition?: Nutrition;
}

/** Ingrediente creado por el usuario. Sus alérgenos se eligieron expresamente al crearlo. */
export interface CustomIngredient extends Ingredient {
  custom: true;
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

/** Receta creada o importada por el usuario. */
export interface UserRecipe extends Recipe {
  origin: 'own' | 'imported';
  /** Un borrador está incompleto y no puede usarse en el menú. */
  status: 'draft' | 'ready';
  /** Si es false, el planificador no la propone, pero se puede elegir a mano. */
  includeInPlanner: boolean;
  /** Miniatura de la foto, como URL de datos. La foto grande se guarda aparte. */
  photoThumb?: string;
  updatedAt: string;
}

export const USER_ID_PREFIX = 'u-';
export const MAX_USER_RECIPES = 200;
export const RECIPE_NAME_MAX_LENGTH = 80;
export const MAX_RECIPE_STEPS = 30;

export function isUserRecipe(recipe: Recipe): recipe is UserRecipe {
  return 'origin' in recipe;
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

/** Ficha de una persona que come en casa, con sus necesidades personales. */
export interface DinerProfile {
  id: string;
  name: string;
  diet: Diet;
  excludedIngredientIds: string[];
  excludedGroups: IngredientGroup[];
  excludedAllergens: Allergen[];
  createdAt: string;
}

/** Ajustes comunes de la casa: son decisiones de quien cocina, no restricciones de nadie. */
export interface HouseholdSettings {
  /** 1–12 */
  servings: number;
  maxTotalMinutes: number | null;
  preferBudget: boolean;
  /** [día 0–6][desayuno, comida, cena] */
  activeSlots: boolean[][];
  /** Desayunos que se alternan durante la semana. Vacío = el menú no tiene desayunos. */
  habitualBreakfastIds: string[];
  onboardingDone: boolean;
}

export const MAX_PROFILES = 12;
export const PROFILE_NAME_MAX_LENGTH = 40;

/**
 * Lo que el planificador necesita saber: los ajustes de la casa más la suma de las
 * restricciones de todos los comensales. No se guarda; se calcula con `combinePreferences`.
 */
export interface Preferences {
  /** La dieta más restrictiva entre todos los comensales. */
  diet: Diet;
  /** 1–12 */
  servings: number;
  excludedIngredientIds: string[];
  excludedGroups: IngredientGroup[];
  excludedAllergens: Allergen[];
  maxTotalMinutes: number | null;
  preferBudget: boolean;
  /** [día 0–6][desayuno, comida, cena] */
  activeSlots: boolean[][];
  /** Desayunos que se alternan durante la semana. Vacío = el menú no tiene desayunos. */
  habitualBreakfastIds: string[];
  onboardingDone: boolean;
}

export const MIN_SERVINGS = 1;
export const MAX_SERVINGS = 12;
export const MAX_HABITUAL_BREAKFASTS = 3;
export const NOTE_MAX_LENGTH = 80;

export const DEFAULT_PREFERENCES: Preferences = {
  diet: 'omnivore',
  servings: 2,
  excludedIngredientIds: [],
  excludedGroups: [],
  excludedAllergens: [],
  maxTotalMinutes: null,
  preferBudget: false,
  activeSlots: Array.from({ length: DAYS_PER_WEEK }, () => [true, true, true]),
  habitualBreakfastIds: [],
  onboardingDone: false,
};

/** Los desayunos solo forman parte del menú cuando se han elegido los habituales. */
export function breakfastsEnabled(prefs: Pick<HouseholdSettings, 'habitualBreakfastIds'>): boolean {
  return prefs.habitualBreakfastIds.length > 0;
}

export interface MealSlot {
  /** 0 = lunes */
  day: number;
  mealType: MealType;
  active: boolean;
  recipeId: string | null;
  locked: boolean;
  servingsOverride?: number;
  origin: 'generated' | 'manual';
  /** Nota de la comida ("llevar al trabajo"). Pertenece a la franja, no a la receta. */
  note?: string;
}

export interface WeekPlan {
  /** Fecha ISO del lunes. */
  weekStart: string;
  /** 21 franjas, ordenadas por día y después desayuno, comida y cena. */
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
