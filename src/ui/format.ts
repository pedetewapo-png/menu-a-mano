import type { Violation } from '../domain/filters';
import { profilesBehindFilter, profilesBehindViolation } from '../domain/household';
import { REFERENCE_KCAL_PER_DAY, roundKcal } from '../domain/nutrition';
import type { PlannerNotice } from '../domain/planner';
import type { ShoppingItem } from '../domain/shopping';
import type { BaseUnit, Catalog, DinerProfile, Ingredient, Recipe, RecipeIngredient } from '../domain/types';
import { roundForRecipe } from '../domain/units';
import { addDays, parseIsoDate } from '../domain/week';
import { locale, t } from '../i18n';

const numberFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
// Con separador de millares también en cifras de cuatro dígitos (1.240), que en español se omite por defecto.
const wholeNumber = new Intl.NumberFormat(locale, { maximumFractionDigits: 0, useGrouping: 'always' });
const dayMonth = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' });
const dayOnly = new Intl.DateTimeFormat(locale, { day: 'numeric' });
const dateTime = new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short' });

export const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);

/** Para buscar sin distinguir mayúsculas ni tildes. */
export const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase(locale);

export function formatWeekRange(weekStart: string): string {
  const start = parseIsoDate(weekStart);
  const end = parseIsoDate(addDays(weekStart, 6));
  const sameMonth = start.getMonth() === end.getMonth();
  return `${sameMonth ? dayOnly.format(start) : dayMonth.format(start)} al ${dayMonth.format(end)}`;
}

export function formatDayNumber(weekStart: string, day: number): string {
  return dayOnly.format(parseIsoDate(addDays(weekStart, day)));
}

export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));

/** "unas 520 kcal": siempre aproximado y redondeado a la decena. */
export const formatKcal = (kcal: number) => t.calories.about(wholeNumber.format(roundKcal(kcal)));

export const formatReferenceKcal = () => t.calories.reference(wholeNumber.format(REFERENCE_KCAL_PER_DAY));

export function formatBaseQuantity(quantity: number, unit: BaseUnit): string {
  if (unit === 'unit') return numberFormat.format(quantity);
  const big = unit === 'g' ? 'kg' : 'l';
  return quantity >= 1000 ? `${numberFormat.format(quantity / 1000)} ${big}` : `${numberFormat.format(quantity)} ${unit}`;
}

function formatHalves(quantity: number): string {
  const whole = Math.floor(quantity);
  const half = quantity - whole >= 0.5;
  if (!half) return String(whole);
  return whole === 0 ? '½' : `${whole} ½`;
}

/** Línea de ingrediente en el detalle de una receta, ya escalada. */
export function formatRecipeIngredient(ingredient: Ingredient, item: RecipeIngredient, factor: number): string {
  let text: string;
  if (item.unit === 'toTaste' || item.quantity === null) {
    text = `${capitalize(ingredient.name)}, ${t.units.toTaste}`;
  } else if (item.unit === 'pinch') {
    text = `${item.quantity} ${t.units.pinch(item.quantity)} ${t.units.of} ${ingredient.name}`;
  } else {
    const quantity = roundForRecipe(item.quantity * factor, item.unit);
    if (item.unit === 'unit') {
      const name =
        quantity <= 1
          ? (ingredient.unitName ?? ingredient.name)
          : (ingredient.unitNamePlural ?? ingredient.namePlural ?? ingredient.name);
      text = `${formatHalves(quantity)} ${name}`;
    } else if (item.unit === 'tbsp' || item.unit === 'tsp') {
      text = `${formatHalves(quantity)} ${t.units[item.unit](quantity)} ${t.units.of} ${ingredient.name}`;
    } else {
      text = `${formatBaseQuantity(quantity, item.unit)} ${t.units.of} ${ingredient.name}`;
    }
  }
  if (item.note) text += `, ${item.note}`;
  if (item.optional) text += ` (${t.units.optional})`;
  return text;
}

export function shoppingItemName(item: ShoppingItem, catalog: Catalog): string {
  const ingredient = catalog.ingredients.get(item.ingredientId)!;
  const many = item.unit === 'unit' && (item.quantity ?? 0) > 1;
  return capitalize(many ? (ingredient.namePlural ?? ingredient.name) : ingredient.name);
}

export function shoppingItemQuantity(item: ShoppingItem): string {
  if (item.quantity === null) return '';
  if (item.unit === 'unit') return `${item.quantity} ${t.units.piece(item.quantity)}`;
  const base = formatBaseQuantity(item.quantity, item.unit);
  return item.approxUnits ? `${base} (${t.units.approx(`${item.approxUnits} ${t.units.piece(item.approxUnits)}`)})` : base;
}

const nameList = new Intl.ListFormat(locale, { type: 'conjunction' });

/** "Ana y Luis". Vacío si solo hay un comensal: no hace falta decir de quién es la restricción. */
function namesIfSeveral(culprits: readonly DinerProfile[], profiles: readonly DinerProfile[]): string {
  return profiles.length > 1 && culprits.length > 0 ? nameList.format(culprits.map((p) => p.name)) : '';
}

function violationReason(violation: Violation, catalog: Catalog): string {
  switch (violation.kind) {
    case 'diet':
      return t.violation.diet;
    case 'ingredient':
      return t.violation.ingredient(catalog.ingredients.get(violation.ingredientId)?.name ?? violation.ingredientId);
    case 'group':
      return t.violation.group(t.group[violation.group]);
    case 'allergen':
      return t.violation.allergen(t.allergen[violation.allergen]);
    case 'time':
      return t.violation.time;
  }
}

/** Por qué una receta no entra en el menú y, si hay varios comensales, por quién. */
export function describeViolation(
  violation: Violation,
  recipe: Recipe,
  catalog: Catalog,
  profiles: readonly DinerProfile[],
): string {
  const reason = violationReason(violation, catalog);
  const culprits = profilesBehindViolation(violation, catalog.derived.get(recipe.id)!.diet, profiles);
  const names = namesIfSeveral(culprits, profiles);
  return names ? t.violation.forPeople(reason, names) : reason;
}

export function describeNotice(notice: PlannerNotice, catalog: Catalog, profiles: readonly DinerProfile[]): string {
  let text: string;
  switch (notice.kind) {
    case 'repeatedFromPreviousWeek':
      return t.menu.noticePrevWeek;
    case 'breakfastsUnavailable':
      return t.menu.noticeBreakfasts(
        notice.recipeIds.map((id) => catalog.recipeById.get(id)?.name ?? t.menu.missingRecipe).join(', '),
      );
    case 'repeatedInWeek':
      text = t.menu.noticeRepeated(notice.compatible, notice.needed);
      break;
    case 'emptySlots':
      text = t.menu.noticeEmpty(notice.count);
      break;
  }
  if (notice.limiting) {
    text += ` ${t.menu.noticeLimiting(t.filterName[notice.limiting.filter], notice.limiting.countWithout)}`;
    const names = namesIfSeveral(profilesBehindFilter(notice.limiting.filter, profiles), profiles);
    if (names) text += ` ${t.menu.noticeLimitingPeople(names)}`;
  }
  return text;
}
