import type { BaseUnit, Catalog, ShopSection, WeekPlan } from './types';
import { SHOP_SECTIONS } from './types';
import { roundUpForShopping, toBaseQuantity } from './units';

export interface ShoppingSource {
  recipeId: string;
  /** En la unidad base, sin redondear. null si la receta no fija cantidad. */
  quantity: number | null;
}

export interface ShoppingItem {
  ingredientId: string;
  section: ShopSection;
  /** Básico de despensa: se lista sin cantidad. */
  pantry: boolean;
  /** En la unidad base, ya redondeada. null para los básicos de despensa. */
  quantity: number | null;
  unit: BaseUnit;
  /** Equivalencia aproximada en unidades cuando la base son gramos. */
  approxUnits: number | null;
  /** Solo aparece como ingrediente opcional. */
  optional: boolean;
  sources: ShoppingSource[];
}

/** Lista de la compra derivada del menú. Función pura. */
export function buildShoppingList(plan: WeekPlan, catalog: Catalog, defaultServings: number): ShoppingItem[] {
  const totals = new Map<string, { sum: number; hasQuantity: boolean; optional: boolean; sources: ShoppingSource[] }>();

  for (const slot of plan.slots) {
    if (!slot.active || !slot.recipeId) continue;
    const recipe = catalog.recipeById.get(slot.recipeId);
    if (!recipe) continue;
    const factor = (slot.servingsOverride ?? defaultServings) / recipe.baseServings;

    for (const item of recipe.ingredients) {
      const ingredient = catalog.ingredients.get(item.ingredientId);
      if (!ingredient) continue;
      const base = ingredient.pantryStaple ? null : toBaseQuantity(ingredient, item.quantity, item.unit);
      const quantity = base === null ? null : base * factor;

      let entry = totals.get(ingredient.id);
      if (!entry) {
        entry = { sum: 0, hasQuantity: false, optional: true, sources: [] };
        totals.set(ingredient.id, entry);
      }
      if (quantity !== null) {
        entry.sum += quantity;
        entry.hasQuantity = true;
      }
      if (!item.optional) entry.optional = false;
      const existing = entry.sources.find((s) => s.recipeId === recipe.id);
      if (existing) {
        if (quantity !== null) existing.quantity = (existing.quantity ?? 0) + quantity;
      } else {
        entry.sources.push({ recipeId: recipe.id, quantity });
      }
    }
  }

  const items: ShoppingItem[] = [];
  for (const [ingredientId, entry] of totals) {
    const ingredient = catalog.ingredients.get(ingredientId)!;
    const quantity = entry.hasQuantity ? roundUpForShopping(entry.sum, ingredient.baseUnit) : null;
    items.push({
      ingredientId,
      section: ingredient.section,
      pantry: quantity === null,
      quantity,
      unit: ingredient.baseUnit,
      approxUnits:
        quantity !== null && ingredient.baseUnit === 'g' && ingredient.gramsPerUnit
          ? Math.max(1, Math.round(quantity / ingredient.gramsPerUnit))
          : null,
      optional: entry.optional,
      sources: entry.sources,
    });
  }

  const sectionOrder = (s: ShopSection) => SHOP_SECTIONS.indexOf(s);
  return items.sort(
    (a, b) =>
      sectionOrder(a.section) - sectionOrder(b.section) ||
      catalog.ingredients.get(a.ingredientId)!.name.localeCompare(catalog.ingredients.get(b.ingredientId)!.name, 'es'),
  );
}
