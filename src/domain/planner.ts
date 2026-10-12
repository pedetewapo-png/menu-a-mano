import { violations } from './filters';
import { mulberry32 } from './rng';
import type { Catalog, MainGroup, MealSlot, MealType, Preferences, Recipe, WeekPlan } from './types';
import { DAYS_PER_WEEK, MEAL_TYPES, MEALS_PER_DAY } from './types';
import { isAutoPlanned, isUsable } from './userRecipes';

/** Pesos y umbrales de los criterios de variedad. Son valores internos, no recomendaciones nutricionales. */
export const PLANNER_CONFIG = {
  /** Se elige al azar entre los mejores candidatos que estén a esta distancia del primero. */
  topChoices: 3,
  topMargin: 10,
  previousWeekPenalty: 30,
  usedInWeekPenalty: 40,
  sameDayGroupPenalty: 25,
  adjacentGroupPenalty: 15,
  groupWeeklyCap: {
    legumes: 4,
    fish: 4,
    whiteMeat: 3,
    redMeat: 2,
    eggs: 3,
    vegetables: 5,
    grainsPasta: 4,
    plantProtein: 4,
    dairy: 3,
    fruit: 3,
  } satisfies Record<MainGroup, number>,
  overCapPenalty: 20,
  minPresence: { legumes: 2, fish: 2 } as Partial<Record<MainGroup, number>>,
  minPresenceBonus: 12,
  dinnerQuickReferenceMinutes: 30,
  dinnerQuickBonusPerMinute: 0.4,
  favoriteBonus: 10,
  maxFavoritesBoosted: 4,
  budgetBonus: 8,
  maxRepeatsInWeek: 2,
};

export const SLOT_COUNT = DAYS_PER_WEEK * MEALS_PER_DAY;

export function slotIndex(day: number, mealType: MealType): number {
  return day * MEALS_PER_DAY + MEAL_TYPES.indexOf(mealType);
}

const dayOf = (index: number) => Math.floor(index / MEALS_PER_DAY);
const mealOf = (index: number): MealType => MEAL_TYPES[index % MEALS_PER_DAY]!;

export function emptyPlan(weekStart: string, prefs: Preferences): WeekPlan {
  const slots: MealSlot[] = [];
  for (let day = 0; day < DAYS_PER_WEEK; day++) {
    for (const [meal, mealType] of MEAL_TYPES.entries()) {
      slots.push({
        day,
        mealType,
        active: prefs.activeSlots[day]?.[meal] ?? true,
        recipeId: null,
        locked: false,
        origin: 'generated',
      });
    }
  }
  return { weekStart, slots, seed: 0, updatedAt: '' };
}

export type FilterName = 'diet' | 'excluded' | 'allergens' | 'time';

export interface LimitingFilter {
  filter: FilterName;
  /** Recetas que habría sin ese filtro. */
  countWithout: number;
}

export type PlannerNotice =
  | { kind: 'repeatedFromPreviousWeek' }
  | { kind: 'repeatedInWeek'; compatible: number; needed: number; limiting?: LimitingFilter }
  | { kind: 'emptySlots'; count: number; compatible: number; limiting?: LimitingFilter }
  /** Desayunos habituales que ya no cumplen las preferencias y no se han podido asignar. */
  | { kind: 'breakfastsUnavailable'; recipeIds: string[] };

export interface PlannerInput {
  catalog: Catalog;
  preferences: Preferences;
  favorites: ReadonlySet<string>;
  /** Aporta las franjas activas y las bloqueadas. */
  currentPlan: WeekPlan;
  previousRecipeIds?: readonly string[];
  seed: number;
}

export interface PlannerResult {
  plan: WeekPlan;
  notices: PlannerNotice[];
}

/**
 * Recetas que se pueden poner en un tipo de comida: cumplen todas las restricciones
 * obligatorias y no son borradores ni están retiradas. Es lo que se ofrece al elegir a mano.
 */
export function hardCandidates(catalog: Catalog, prefs: Preferences, mealType: MealType): Recipe[] {
  return catalog.recipes.filter(
    (r) => isUsable(r) && r.mealTypes.includes(mealType) && violations(r, catalog, prefs).length === 0,
  );
}

/** Las que además propone el planificador por su cuenta. */
function autoCandidates(catalog: Catalog, prefs: Preferences, mealType: MealType): Recipe[] {
  return hardCandidates(catalog, prefs, mealType).filter(isAutoPlanned);
}

function countCompatible(catalog: Catalog, prefs: Preferences, mealTypes: readonly MealType[]): number {
  return catalog.recipes.filter(
    (r) =>
      isAutoPlanned(r) &&
      r.mealTypes.some((m) => mealTypes.includes(m)) &&
      violations(r, catalog, prefs).length === 0,
  ).length;
}

/** Preferencia que, retirada por sí sola, más recetas compatibles añadiría. */
export function mostLimitingFilter(
  catalog: Catalog,
  prefs: Preferences,
  mealTypes: readonly MealType[],
): LimitingFilter | undefined {
  const options: [FilterName, Preferences][] = [];
  if (prefs.diet !== 'omnivore') options.push(['diet', { ...prefs, diet: 'omnivore' }]);
  if (prefs.excludedIngredientIds.length > 0 || prefs.excludedGroups.length > 0) {
    options.push(['excluded', { ...prefs, excludedIngredientIds: [], excludedGroups: [] }]);
  }
  if (prefs.excludedAllergens.length > 0) options.push(['allergens', { ...prefs, excludedAllergens: [] }]);
  if (prefs.maxTotalMinutes !== null) options.push(['time', { ...prefs, maxTotalMinutes: null }]);

  const current = countCompatible(catalog, prefs, mealTypes);
  let best: LimitingFilter | undefined;
  for (const [filter, relaxed] of options) {
    const countWithout = countCompatible(catalog, relaxed, mealTypes);
    if (countWithout > current && (!best || countWithout > best.countWithout)) {
      best = { filter, countWithout };
    }
  }
  return best;
}

interface ScoreContext {
  catalog: Catalog;
  preferences: Preferences;
  favorites: ReadonlySet<string>;
  previous: ReadonlySet<string>;
}

function score(recipe: Recipe, index: number, assigned: readonly (string | null)[], ctx: ScoreContext): number {
  const cfg = PLANNER_CONFIG;
  const meal = mealOf(index);
  const groupAt = (i: number): MainGroup | undefined => {
    const id = assigned[i];
    return id ? ctx.catalog.recipeById.get(id)?.mainGroup : undefined;
  };
  let total = 0;

  let groupCount = 0;
  let favoriteCount = 0;
  let uses = 0;
  for (let i = 0; i < assigned.length; i++) {
    const id = assigned[i];
    if (!id || i === index) continue;
    if (id === recipe.id) uses++;
    if (ctx.favorites.has(id)) favoriteCount++;
    // El reparto semanal solo mira comidas y cenas.
    if (mealOf(i) !== 'breakfast' && groupAt(i) === recipe.mainGroup) groupCount++;
  }

  // Los desayunos no participan en la alternancia ni en el reparto semanal.
  if (meal !== 'breakfast') {
    const day = dayOf(index);
    const isLunch = meal === 'lunch';
    // Alternancia: ni dos veces el mismo día ni en comidas consecutivas.
    if (groupAt(slotIndex(day, isLunch ? 'dinner' : 'lunch')) === recipe.mainGroup) total -= cfg.sameDayGroupPenalty;
    const neighbourDay = isLunch ? day - 1 : day + 1;
    if (
      neighbourDay >= 0 &&
      neighbourDay < DAYS_PER_WEEK &&
      groupAt(slotIndex(neighbourDay, isLunch ? 'dinner' : 'lunch')) === recipe.mainGroup
    ) {
      total -= cfg.adjacentGroupPenalty;
    }

    // Reparto semanal.
    const cap = cfg.groupWeeklyCap[recipe.mainGroup];
    if (groupCount >= cap) total -= cfg.overCapPenalty * (groupCount - cap + 1);
    const minimum = cfg.minPresence[recipe.mainGroup];
    if (minimum !== undefined && groupCount < minimum) total += cfg.minPresenceBonus;

    if (!isLunch) {
      total += Math.max(0, cfg.dinnerQuickReferenceMinutes - recipe.activeMinutes) * cfg.dinnerQuickBonusPerMinute;
    }
  }

  if (ctx.favorites.has(recipe.id) && favoriteCount < cfg.maxFavoritesBoosted) total += cfg.favoriteBonus;
  if (ctx.preferences.preferBudget) total += (2 - recipe.cost) * cfg.budgetBonus;
  if (ctx.previous.has(recipe.id)) total -= cfg.previousWeekPenalty;
  total -= uses * cfg.usedInWeekPenalty;
  return total;
}

function pick(
  pool: readonly Recipe[],
  index: number,
  assigned: readonly (string | null)[],
  ctx: ScoreContext,
  rng: () => number,
): Recipe {
  // Los empates se deshacen al azar (con la semilla). Si se deshicieran por orden alfabético,
  // las mismas recetas ganarían siempre y otras no llegarían a salir nunca.
  const scored = pool
    .map((recipe) => ({ recipe, value: score(recipe, index, assigned, ctx), tieBreak: rng() }))
    .sort((a, b) => b.value - a.value || a.tieBreak - b.tieBreak);
  const best = scored[0]!.value;
  const top = scored.filter((s) => best - s.value <= PLANNER_CONFIG.topMargin).slice(0, PLANNER_CONFIG.topChoices);
  return top[Math.floor(rng() * top.length)]!.recipe;
}

/** Desayunos habituales que siguen cumpliendo las preferencias, y los que ya no. */
export function habitualBreakfasts(catalog: Catalog, prefs: Preferences): { valid: Recipe[]; invalidIds: string[] } {
  const compatible = new Set(hardCandidates(catalog, prefs, 'breakfast').map((r) => r.id));
  const valid: Recipe[] = [];
  const invalidIds: string[] = [];
  for (const id of prefs.habitualBreakfastIds) {
    const recipe = catalog.recipeById.get(id);
    if (recipe && compatible.has(id)) valid.push(recipe);
    else invalidIds.push(id);
  }
  return { valid, invalidIds };
}

/**
 * Reparte los desayunos habituales por turnos entre los días activos. No pasan por el
 * algoritmo de variedad: se repiten a propósito. `shouldFill` decide qué franjas se tocan.
 */
function rotateBreakfasts(
  slots: readonly MealSlot[],
  assigned: (string | null)[],
  valid: readonly Recipe[],
  seed: number,
  shouldFill: (slot: MealSlot) => boolean,
): void {
  let turn = valid.length > 0 ? Math.abs(seed) % valid.length : 0;
  for (let day = 0; day < DAYS_PER_WEEK; day++) {
    const index = slotIndex(day, 'breakfast');
    const slot = slots[index];
    if (!slot?.active) continue;
    if (shouldFill(slot)) assigned[index] = valid.length > 0 ? valid[turn % valid.length]!.id : null;
    // El turno avanza también en los días que no se tocan, para no romper la alternancia.
    turn++;
  }
}

/**
 * Rellena las franjas activas no bloqueadas. Función pura y determinista:
 * las mismas entradas y la misma semilla producen el mismo menú.
 */
export function generatePlan(input: PlannerInput): PlannerResult {
  const { catalog, preferences, currentPlan, seed } = input;
  const ctx: ScoreContext = {
    catalog,
    preferences,
    favorites: input.favorites,
    previous: new Set(input.previousRecipeIds ?? []),
  };
  const rng = mulberry32(seed);
  const slots = currentPlan.slots.map((s) => ({ ...s }));
  const isFree = (s: MealSlot) => s.active && !s.locked;

  // Solo las franjas bloqueadas conservan su receta.
  const assigned: (string | null)[] = slots.map((s) => (s.active && s.locked ? s.recipeId : null));
  const candidates = {
    lunch: autoCandidates(catalog, preferences, 'lunch'),
    dinner: autoCandidates(catalog, preferences, 'dinner'),
  };

  // Comidas y cenas: primero las franjas con menos candidatos.
  const order = slots
    .map((slot, index) => ({ slot, index, pool: slot.mealType === 'breakfast' ? null : candidates[slot.mealType] }))
    .filter((entry): entry is typeof entry & { pool: Recipe[] } => isFree(entry.slot) && entry.pool !== null)
    .sort((a, b) => a.pool.length - b.pool.length || a.index - b.index);

  const uses = (id: string) => assigned.filter((x) => x === id).length;
  const usedNearDay = (id: string, day: number) => assigned.some((x, i) => x === id && Math.abs(dayOf(i) - day) <= 1);

  let usedPreviousWeek = false;
  let repeatedInWeek = false;
  let emptyCount = 0;

  for (const { slot, index, pool: hard } of order) {
    // Relajación por pasos; solo afecta a criterios de variedad.
    let pool = hard.filter((r) => uses(r.id) === 0 && !ctx.previous.has(r.id));
    if (pool.length === 0) {
      pool = hard.filter((r) => uses(r.id) === 0);
      if (pool.length > 0) usedPreviousWeek = true;
    }
    if (pool.length === 0) {
      pool = hard.filter((r) => uses(r.id) < PLANNER_CONFIG.maxRepeatsInWeek && !usedNearDay(r.id, slot.day));
      if (pool.length > 0) repeatedInWeek = true;
    }
    if (pool.length === 0) {
      emptyCount++;
      continue;
    }
    assigned[index] = pick(pool, index, assigned, ctx, rng).id;
  }

  const breakfasts = habitualBreakfasts(catalog, preferences);
  rotateBreakfasts(slots, assigned, breakfasts.valid, seed, isFree);

  for (const [index, slot] of slots.entries()) {
    if (isFree(slot)) {
      slot.recipeId = assigned[index] ?? null;
      slot.origin = 'generated';
      const recipe = slot.recipeId ? catalog.recipeById.get(slot.recipeId) : undefined;
      // Comprobación final: un fallo aquí es un error de programación.
      if (recipe && (!recipe.mealTypes.includes(slot.mealType) || violations(recipe, catalog, preferences).length > 0)) {
        throw new Error(`El planificador asignó una receta incompatible: "${recipe.id}"`);
      }
    } else if (!slot.active) {
      slot.recipeId = null;
    }
  }

  const notices: PlannerNotice[] = [];
  const freeMealTypes = (['lunch', 'dinner'] as const).filter((m) => order.some(({ slot }) => slot.mealType === m));
  if (usedPreviousWeek) notices.push({ kind: 'repeatedFromPreviousWeek' });
  if (repeatedInWeek || emptyCount > 0) {
    const compatible = countCompatible(catalog, preferences, freeMealTypes);
    const limiting = mostLimitingFilter(catalog, preferences, freeMealTypes);
    if (repeatedInWeek) notices.push({ kind: 'repeatedInWeek', compatible, needed: order.length, limiting });
    if (emptyCount > 0) notices.push({ kind: 'emptySlots', count: emptyCount, compatible, limiting });
  }
  if (breakfasts.invalidIds.length > 0) notices.push({ kind: 'breakfastsUnavailable', recipeIds: breakfasts.invalidIds });

  return { plan: { ...currentPlan, slots, seed }, notices };
}

/**
 * Vuelve a repartir los desayunos habituales tras cambiar cuáles son, sin tocar comidas ni cenas.
 * Conserva los desayunos bloqueados y los elegidos a mano.
 */
export function redistributeBreakfasts(plan: WeekPlan, catalog: Catalog, preferences: Preferences, seed: number): WeekPlan {
  const assigned = plan.slots.map((s) => s.recipeId);
  const { valid } = habitualBreakfasts(catalog, preferences);
  rotateBreakfasts(
    plan.slots,
    assigned,
    valid,
    seed,
    (slot) => !slot.locked && (slot.recipeId === null || slot.origin === 'generated'),
  );
  return {
    ...plan,
    slots: plan.slots.map((slot, index) =>
      assigned[index] === slot.recipeId ? slot : { ...slot, recipeId: assigned[index] ?? null, origin: 'generated' },
    ),
  };
}

export interface ReplacementInput {
  catalog: Catalog;
  preferences: Preferences;
  favorites: ReadonlySet<string>;
  plan: WeekPlan;
  index: number;
  /** Recetas ya rechazadas en esta franja. */
  rejectedIds?: readonly string[];
  previousRecipeIds?: readonly string[];
  seed: number;
}

/** Propone otra receta para una franja, o null si no quedan alternativas compatibles. */
export function suggestReplacement(input: ReplacementInput): string | null {
  const { catalog, preferences, plan, index } = input;
  const slot = plan.slots[index];
  if (!slot) return null;
  const rejected = new Set(input.rejectedIds ?? []);
  const pool = autoCandidates(catalog, preferences, slot.mealType).filter(
    (r) => r.id !== slot.recipeId && !rejected.has(r.id),
  );
  if (pool.length === 0) return null;
  const assigned = plan.slots.map((s, i) => (i === index ? null : s.recipeId));
  const ctx: ScoreContext = {
    catalog,
    preferences,
    favorites: input.favorites,
    previous: new Set(input.previousRecipeIds ?? []),
  };
  return pick(pool, index, assigned, ctx, mulberry32(input.seed)).id;
}
