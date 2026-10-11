import { catalog } from '../data/catalog';
import { getWeekPlan, saveWeekPlan } from '../data/repos';
import { isCompatible } from '../domain/filters';
import {
  emptyPlan,
  redistributeBreakfasts,
  generatePlan,
  suggestReplacement,
  type PlannerNotice,
} from '../domain/planner';
import type { MealSlot, Preferences, SavedPlan, WeekPlan } from '../domain/types';
import { addDays } from '../domain/week';

const randomSeed = () => Math.floor(Math.random() * 0xffffffff);

export async function loadPlan(weekStart: string, prefs: Preferences): Promise<WeekPlan> {
  return (await getWeekPlan(weekStart)) ?? emptyPlan(weekStart, prefs);
}

async function previousRecipeIds(weekStart: string): Promise<string[]> {
  const previous = await getWeekPlan(addDays(weekStart, -7));
  return previous ? previous.slots.flatMap((s) => (s.recipeId ? [s.recipeId] : [])) : [];
}

export async function generateWeek(
  weekStart: string,
  prefs: Preferences,
  favorites: ReadonlySet<string>,
): Promise<PlannerNotice[]> {
  const result = generatePlan({
    catalog,
    preferences: prefs,
    favorites,
    currentPlan: await loadPlan(weekStart, prefs),
    previousRecipeIds: await previousRecipeIds(weekStart),
    seed: randomSeed(),
  });
  await saveWeekPlan(result.plan);
  return result.notices;
}

/** Tras cambiar los desayunos habituales, los vuelve a repartir en la semana que se está viendo. */
export async function refreshBreakfasts(weekStart: string, prefs: Preferences): Promise<void> {
  const plan = await getWeekPlan(weekStart);
  // Sin menú todavía no hay nada que rellenar: lo hará "Generar menú".
  if (!plan) return;
  await saveWeekPlan(redistributeBreakfasts(plan, catalog, prefs, randomSeed()));
}

/** Sustituye el plato de una franja por otro compatible. Devuelve el id nuevo o null si no hay alternativas. */
export async function replaceSlot(
  weekStart: string,
  prefs: Preferences,
  favorites: ReadonlySet<string>,
  index: number,
  rejectedIds: readonly string[],
): Promise<string | null> {
  const plan = await loadPlan(weekStart, prefs);
  const recipeId = suggestReplacement({
    catalog,
    preferences: prefs,
    favorites,
    plan,
    index,
    rejectedIds,
    previousRecipeIds: await previousRecipeIds(weekStart),
    seed: randomSeed(),
  });
  if (recipeId) await patchSlot(weekStart, prefs, index, { recipeId, origin: 'generated' });
  return recipeId;
}

export async function patchSlot(
  weekStart: string,
  prefs: Preferences,
  index: number,
  patch: Partial<MealSlot>,
): Promise<void> {
  const plan = await loadPlan(weekStart, prefs);
  const slots = plan.slots.map((slot, i) => {
    if (i !== index) return slot;
    const next = { ...slot, ...patch };
    // Una franja sin planificar no conserva plato ni bloqueo.
    if (!next.active) return { ...next, recipeId: null, locked: false };
    if (!next.recipeId) return { ...next, locked: false };
    return next;
  });
  await saveWeekPlan({ ...plan, slots });
}

/** Mueve un plato a otra franja; si el destino está ocupado, los intercambia. */
export async function moveSlot(weekStart: string, prefs: Preferences, from: number, to: number): Promise<void> {
  const plan = await loadPlan(weekStart, prefs);
  const a = plan.slots[from];
  const b = plan.slots[to];
  if (!a || !b || from === to) return;
  const content = ({ recipeId, locked, servingsOverride, origin }: MealSlot) => ({
    recipeId,
    locked,
    servingsOverride,
    origin,
  });
  const slots = plan.slots.map((slot, i) => {
    if (i === from) return { ...slot, ...content(b), active: true };
    if (i === to) return { ...slot, ...content(a), origin: 'manual' as const, active: true };
    return slot;
  });
  await saveWeekPlan({ ...plan, slots });
}

/** Aplica un menú guardado. Las recetas que ya no cumplen las preferencias se omiten; devuelve cuántas. */
export async function applySavedPlan(weekStart: string, prefs: Preferences, saved: SavedPlan): Promise<number> {
  const base = emptyPlan(weekStart, prefs);
  let skipped = 0;
  const slots = base.slots.map((slot) => {
    const source = saved.slots.find((s) => s.day === slot.day && s.mealType === slot.mealType);
    if (!source?.recipeId) return slot;
    const recipe = catalog.recipeById.get(source.recipeId);
    if (!recipe || recipe.retired || !isCompatible(recipe, catalog, prefs)) {
      skipped++;
      return slot;
    }
    return { ...slot, active: true, recipeId: recipe.id, origin: 'manual' as const };
  });
  await saveWeekPlan({ ...base, slots });
  return skipped;
}
