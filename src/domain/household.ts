import { dietAllows } from './catalog';
import type { Violation } from './filters';
import type { FilterName } from './planner';
import type { Diet, DinerProfile, HouseholdSettings, Preferences } from './types';
import { DEFAULT_PREFERENCES } from './types';

/** De menos a más restrictiva. */
const DIET_ORDER: Diet[] = ['omnivore', 'vegetarian', 'vegan'];

export const DEFAULT_SETTINGS: HouseholdSettings = {
  servings: DEFAULT_PREFERENCES.servings,
  maxTotalMinutes: DEFAULT_PREFERENCES.maxTotalMinutes,
  preferBudget: DEFAULT_PREFERENCES.preferBudget,
  activeSlots: DEFAULT_PREFERENCES.activeSlots,
  habitualBreakfastIds: DEFAULT_PREFERENCES.habitualBreakfastIds,
  onboardingDone: DEFAULT_PREFERENCES.onboardingDone,
};

/**
 * Preferencias con las que se planifica: el menú debe valer para todos a la vez, así
 * que se toma la dieta más restrictiva y se suman las exclusiones y alérgenos de todos.
 */
export function combinePreferences(profiles: readonly DinerProfile[], settings: HouseholdSettings): Preferences {
  const union = <T>(pick: (profile: DinerProfile) => T[]): T[] => [...new Set(profiles.flatMap(pick))];
  const diet = profiles.reduce<Diet>(
    (strictest, profile) => (DIET_ORDER.indexOf(profile.diet) > DIET_ORDER.indexOf(strictest) ? profile.diet : strictest),
    'omnivore',
  );
  return {
    ...settings,
    diet,
    excludedIngredientIds: union((p) => p.excludedIngredientIds),
    excludedGroups: union((p) => p.excludedGroups),
    excludedAllergens: union((p) => p.excludedAllergens),
  };
}

/** Comensales cuyas necesidades causan un incumplimiento. Vacío si no es personal (el tiempo máximo). */
export function profilesBehindViolation(
  violation: Violation,
  recipeDiet: Diet,
  profiles: readonly DinerProfile[],
): DinerProfile[] {
  switch (violation.kind) {
    case 'diet':
      return profiles.filter((p) => !dietAllows(p.diet, recipeDiet));
    case 'ingredient':
      return profiles.filter((p) => p.excludedIngredientIds.includes(violation.ingredientId));
    case 'group':
      return profiles.filter((p) => p.excludedGroups.includes(violation.group));
    case 'allergen':
      return profiles.filter((p) => p.excludedAllergens.includes(violation.allergen));
    case 'time':
      return [];
  }
}

/** Comensales de quienes procede un filtro del planificador. Vacío si es un ajuste de la casa. */
export function profilesBehindFilter(filter: FilterName, profiles: readonly DinerProfile[]): DinerProfile[] {
  switch (filter) {
    case 'diet': {
      // Manda la dieta más restrictiva: son esos comensales quienes la fijan.
      const strictest = Math.max(...profiles.map((p) => DIET_ORDER.indexOf(p.diet)), 0);
      return strictest === 0 ? [] : profiles.filter((p) => DIET_ORDER.indexOf(p.diet) === strictest);
    }
    case 'excluded':
      return profiles.filter((p) => p.excludedIngredientIds.length > 0 || p.excludedGroups.length > 0);
    case 'allergens':
      return profiles.filter((p) => p.excludedAllergens.length > 0);
    case 'time':
      return [];
  }
}
