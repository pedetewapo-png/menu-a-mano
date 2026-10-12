import { z } from 'zod';
import {
  ALLERGENS,
  BASE_UNITS,
  DAYS_PER_WEEK,
  DIETS,
  INGREDIENT_GROUPS,
  MAIN_GROUPS,
  MAX_HABITUAL_BREAKFASTS,
  MAX_RECIPE_STEPS,
  MAX_SERVINGS,
  MEAL_TYPES,
  MEALS_PER_DAY,
  MIN_SERVINGS,
  NOTE_MAX_LENGTH,
  PROFILE_NAME_MAX_LENGTH,
  RECIPE_NAME_MAX_LENGTH,
  RECIPE_UNITS,
  SHOP_SECTIONS,
  USER_ID_PREFIX,
} from '../domain/types';

const id = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'identificador en minúsculas con guiones');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const mealType = z.enum(MEAL_TYPES);
const servings = z.number().int().min(MIN_SERVINGS).max(MAX_SERVINGS);

// ---------- Catálogo ----------

export const ingredientSchema = z.strictObject({
  id,
  name: z.string().min(1),
  namePlural: z.string().min(1).optional(),
  unitName: z.string().min(1).optional(),
  unitNamePlural: z.string().min(1).optional(),
  section: z.enum(SHOP_SECTIONS),
  baseUnit: z.enum(BASE_UNITS),
  gramsPerUnit: z.number().positive().optional(),
  diet: z.enum(DIETS),
  allergens: z.array(z.enum(ALLERGENS)).default([]),
  mayContain: z.array(z.enum(ALLERGENS)).default([]),
  groups: z.array(z.enum(INGREDIENT_GROUPS)).default([]),
  pantryStaple: z.boolean().default(false),
});

const recipeImageSchema = z.strictObject({
  file: z.string().min(1),
  alt: z.string().min(1),
  origin: z.enum(['licensed', 'own']),
  title: z.string().optional(),
  author: z.string().min(1),
  license: z.string().min(1),
  sourceUrl: z.url().optional(),
  retrievedOn: isoDate.optional(),
  modifications: z.string().min(1),
});

export const recipeSchema = z.strictObject({
  id,
  name: z.string().min(1),
  summary: z.string().min(1),
  mealTypes: z.array(mealType).min(1),
  baseServings: z.number().int().positive(),
  totalMinutes: z.number().int().positive(),
  activeMinutes: z.number().int().positive(),
  cost: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  mainGroup: z.enum(MAIN_GROUPS),
  cuisine: z.enum(['spanish', 'mediterranean', 'other']),
  ingredients: z
    .array(
      z.strictObject({
        ingredientId: id,
        quantity: z.number().positive().nullable(),
        unit: z.enum(RECIPE_UNITS),
        optional: z.boolean().optional(),
        note: z.string().optional(),
      }),
    )
    .min(1),
  steps: z.array(z.string().min(1)).min(1),
  notes: z.string().optional(),
  image: recipeImageSchema.optional(),
  source: z.strictObject({ author: z.string().min(1), license: z.string().min(1), url: z.url().optional() }),
  reviewedOn: isoDate.optional(),
  retired: z.boolean().optional(),
});

// ---------- Recetas e ingredientes propios ----------

export const customIngredientSchema = z.object({
  id: z.string().startsWith(USER_ID_PREFIX),
  name: z.string().trim().min(1).max(60),
  namePlural: z.string().optional(),
  unitName: z.string().optional(),
  unitNamePlural: z.string().optional(),
  section: z.enum(SHOP_SECTIONS),
  baseUnit: z.enum(BASE_UNITS),
  gramsPerUnit: z.number().positive().optional(),
  diet: z.enum(DIETS),
  allergens: z.array(z.enum(ALLERGENS)),
  mayContain: z.array(z.enum(ALLERGENS)).default([]),
  groups: z.array(z.enum(INGREDIENT_GROUPS)).default([]),
  pantryStaple: z.boolean(),
  custom: z.literal(true),
});

/** Contenido de una receta propia. Admite borradores: puede estar incompleta. */
export const userRecipeContentSchema = z.object({
  name: z.string().trim().min(1).max(RECIPE_NAME_MAX_LENGTH),
  summary: z.string().max(200),
  mealTypes: z.array(mealType),
  baseServings: servings,
  totalMinutes: z.number().int().min(0).max(24 * 60),
  activeMinutes: z.number().int().min(0).max(24 * 60),
  cost: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  mainGroup: z.enum(MAIN_GROUPS),
  cuisine: z.enum(['spanish', 'mediterranean', 'other']),
  ingredients: z.array(
    z.object({
      ingredientId: z.string().min(1),
      quantity: z.number().positive().nullable(),
      unit: z.enum(RECIPE_UNITS),
      optional: z.boolean().optional(),
      note: z.string().max(80).optional(),
    }),
  ),
  steps: z.array(z.string().max(600)).max(MAX_RECIPE_STEPS),
  notes: z.string().max(600).optional(),
  source: z.object({ author: z.string(), license: z.string(), url: z.string().optional() }),
});

const photoDataUrl = z.string().startsWith('data:image/');

export const userRecipeSchema = userRecipeContentSchema.extend({
  id: z.string().startsWith(USER_ID_PREFIX),
  origin: z.enum(['own', 'imported']),
  status: z.enum(['draft', 'ready']),
  includeInPlanner: z.boolean(),
  photoThumb: photoDataUrl.optional(),
  updatedAt: z.string(),
});

export const userPhotoSchema = z.object({ recipeId: z.string().startsWith(USER_ID_PREFIX), dataUrl: photoDataUrl });

// ---------- Datos de usuario ----------

export const profileSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(PROFILE_NAME_MAX_LENGTH),
  diet: z.enum(DIETS),
  excludedIngredientIds: z.array(z.string()),
  excludedGroups: z.array(z.enum(INGREDIENT_GROUPS)),
  excludedAllergens: z.array(z.enum(ALLERGENS)),
  createdAt: z.string(),
});

export const settingsSchema = z.object({
  servings,
  maxTotalMinutes: z.number().int().positive().nullable(),
  preferBudget: z.boolean(),
  activeSlots: z.array(z.array(z.boolean()).length(MEALS_PER_DAY)).length(DAYS_PER_WEEK),
  habitualBreakfastIds: z.array(z.string()).max(MAX_HABITUAL_BREAKFASTS),
  onboardingDone: z.boolean(),
});

const mealSlotSchema = z.object({
  day: z.number().int().min(0).max(6),
  mealType,
  active: z.boolean(),
  recipeId: z.string().nullable(),
  locked: z.boolean(),
  servingsOverride: servings.optional(),
  origin: z.enum(['generated', 'manual']),
  note: z.string().max(NOTE_MAX_LENGTH).optional(),
});

export const weekPlanSchema = z.object({
  weekStart: isoDate,
  slots: z.array(mealSlotSchema).length(DAYS_PER_WEEK * MEALS_PER_DAY),
  seed: z.number(),
  updatedAt: z.string(),
});

export const savedPlanSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slots: z.array(z.object({ day: z.number().int().min(0).max(6), mealType, recipeId: z.string().nullable() })),
  createdAt: z.string(),
});

export const favoriteSchema = z.object({ recipeId: z.string().min(1), addedAt: z.string() });

export const shoppingListSchema = z.object({
  weekStart: isoDate,
  checked: z.record(z.string(), z.object({ quantityWhenChecked: z.number().nullable() })),
  alreadyHave: z.array(z.string()),
  manualItems: z.array(
    z.object({ id: z.string(), text: z.string(), section: z.enum(SHOP_SECTIONS), checked: z.boolean() }),
  ),
});
