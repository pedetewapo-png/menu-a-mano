import { describe, expect, it } from 'vitest';
import { catalog, mergeCatalog } from '../data/catalog';
import { buildRecipeFile, parseRecipeFile, prepareImport, RECIPE_FILE_VERSION } from '../data/recipeFile';
import { violations } from '../domain/filters';
import { emptyPlan, generatePlan, hardCandidates } from '../domain/planner';
import { DEFAULT_PREFERENCES, type CustomIngredient, type Preferences, type UserRecipe } from '../domain/types';
import { isAutoPlanned, isUsable, missingForReady } from '../domain/userRecipes';

const chorizo: CustomIngredient = {
  id: 'u-ing-chorizo',
  name: 'chorizo casero',
  section: 'meat',
  baseUnit: 'g',
  diet: 'omnivore',
  allergens: ['milk', 'sulphites'],
  mayContain: [],
  groups: ['pork'],
  pantryStaple: false,
  custom: true,
};

const recipe = (changes: Partial<UserRecipe> = {}): UserRecipe => ({
  id: 'u-lentejas',
  name: 'Lentejas con chorizo',
  summary: 'Las de casa.',
  mealTypes: ['lunch'],
  baseServings: 4,
  totalMinutes: 50,
  activeMinutes: 15,
  cost: 1,
  mainGroup: 'legumes',
  cuisine: 'spanish',
  ingredients: [
    { ingredientId: 'lentejas', quantity: 320, unit: 'g' },
    { ingredientId: 'u-ing-chorizo', quantity: 150, unit: 'g', note: 'en rodajas' },
    { ingredientId: 'sal', quantity: null, unit: 'toTaste' },
  ],
  steps: ['Rehogar el chorizo.', 'Añadir las lentejas y cocer.'],
  source: { author: 'Receta propia', license: 'Uso personal' },
  origin: 'own',
  status: 'ready',
  includeInPlanner: true,
  updatedAt: '2026-10-12T10:00:00.000Z',
  ...changes,
});

const WEEK = '2026-10-12';

describe('qué le falta a una receta para estar completa', () => {
  it('una receta completa no echa nada en falta', () => {
    expect(missingForReady(recipe())).toEqual([]);
  });

  it('señala cada dato que falta', () => {
    expect(missingForReady(recipe({ name: '  ' }))).toEqual(['name']);
    expect(missingForReady(recipe({ mealTypes: [] }))).toEqual(['mealTypes']);
    expect(missingForReady(recipe({ totalMinutes: 0 }))).toEqual(['time']);
    expect(missingForReady(recipe({ ingredients: [] }))).toEqual(['ingredients']);
    expect(missingForReady(recipe({ steps: ['', ' '] }))).toEqual(['steps']);
  });

  it('exige cantidad en todos los ingredientes salvo los que van al gusto', () => {
    const noQuantity = recipe({ ingredients: [{ ingredientId: 'lentejas', quantity: null, unit: 'g' }] });
    expect(missingForReady(noQuantity)).toEqual(['quantities']);
    const toTaste = recipe({ ingredients: [{ ingredientId: 'sal', quantity: null, unit: 'toTaste' }] });
    expect(missingForReady(toTaste)).toEqual([]);
  });
});

describe('las recetas propias en el catálogo y en el planificador', () => {
  it('la dieta y los alérgenos salen de sus ingredientes, también de los propios', () => {
    const merged = mergeCatalog([chorizo], [recipe()]);
    const info = merged.derived.get('u-lentejas')!;
    expect(info.diet).toBe('omnivore');
    // Los de las lentejas del catálogo (trazas de gluten) más los del chorizo declarado por el usuario.
    expect(new Set(info.allergens)).toEqual(new Set(['gluten', 'milk', 'sulphites']));
    expect(info.groups).toContain('pork');
    // El catálogo de la app no se ve alterado.
    expect(catalog.recipeById.has('u-lentejas')).toBe(false);
  });

  it('pasan por los mismos filtros que las del catálogo', () => {
    const merged = mergeCatalog([chorizo], [recipe()]);
    const own = merged.recipeById.get('u-lentejas')!;
    const check = (changes: Partial<Preferences>) => violations(own, merged, { ...DEFAULT_PREFERENCES, ...changes });
    expect(check({})).toEqual([]);
    expect(check({ diet: 'vegetarian' })).toEqual([{ kind: 'diet' }]);
    expect(check({ excludedGroups: ['pork'] })).toEqual([{ kind: 'group', group: 'pork' }]);
    expect(check({ excludedAllergens: ['milk'] })).toEqual([{ kind: 'allergen', allergen: 'milk' }]);
    expect(check({ excludedIngredientIds: ['u-ing-chorizo'] })).toEqual([{ kind: 'ingredient', ingredientId: 'u-ing-chorizo' }]);
  });

  it('un borrador no se puede usar; una receta fuera de los menús automáticos solo se elige a mano', () => {
    const draft = recipe({ id: 'u-borrador', status: 'draft' });
    const manualOnly = recipe({ id: 'u-manual', includeInPlanner: false });
    expect([isUsable(draft), isAutoPlanned(draft)]).toEqual([false, false]);
    expect([isUsable(manualOnly), isAutoPlanned(manualOnly)]).toEqual([true, false]);

    const merged = mergeCatalog([chorizo], [recipe(), draft, manualOnly]);
    const offered = hardCandidates(merged, DEFAULT_PREFERENCES, 'lunch').map((r) => r.id);
    expect(offered).toContain('u-lentejas');
    expect(offered).toContain('u-manual');
    expect(offered).not.toContain('u-borrador');

    // En muchos menús generados, la propia aparece alguna vez; el borrador y la manual, nunca.
    const seen = new Set<string>();
    for (let seed = 0; seed < 60; seed++) {
      const { plan } = generatePlan({
        catalog: merged,
        preferences: DEFAULT_PREFERENCES,
        favorites: new Set(),
        currentPlan: emptyPlan(WEEK, DEFAULT_PREFERENCES),
        seed,
      });
      for (const slot of plan.slots) if (slot.recipeId) seen.add(slot.recipeId);
    }
    expect(seen).toContain('u-lentejas');
    expect(seen).not.toContain('u-borrador');
    expect(seen).not.toContain('u-manual');
  });

  it('una receta con un ingrediente que ya no existe se deja fuera en vez de romper la app', () => {
    const merged = mergeCatalog([], [recipe()]);
    expect(merged.recipeById.has('u-lentejas')).toBe(false);
    expect(merged.recipes.length).toBe(catalog.recipes.length);
  });
});

describe('archivo de receta', () => {
  const merged = mergeCatalog([chorizo], [recipe()]);
  const exported = () =>
    JSON.stringify(buildRecipeFile(merged.recipeById.get('u-lentejas')!, merged, '2026-10-12T10:00:00.000Z', 'data:image/webp;base64,AAAA'));
  let counter = 0;
  const newId = () => `nuevo-${++counter}`;

  it('ida y vuelta: conserva ingredientes, cantidades y alérgenos', () => {
    const parsed = parseRecipeFile(exported(), catalog);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const { recipe: imported, newIngredients, photo } = prepareImport(parsed.content, [], newId, '2026-10-13T09:00:00.000Z');
    expect(imported).toMatchObject({ name: 'Lentejas con chorizo', origin: 'imported', status: 'ready', baseServings: 4 });
    expect(imported.steps).toEqual(recipe().steps);
    expect(photo).toBe('data:image/webp;base64,AAAA');

    // El ingrediente propio viaja completo y recibe un identificador nuevo.
    expect(newIngredients).toHaveLength(1);
    expect(newIngredients[0]).toMatchObject({ name: 'chorizo casero', allergens: ['milk', 'sulphites'], groups: ['pork'] });
    expect(newIngredients[0]!.id).not.toBe(chorizo.id);
    expect(imported.id).not.toBe('u-lentejas');
    expect(imported.ingredients).toEqual([
      { ingredientId: 'lentejas', quantity: 320, unit: 'g' },
      { ingredientId: newIngredients[0]!.id, quantity: 150, unit: 'g', note: 'en rodajas' },
      { ingredientId: 'sal', quantity: null, unit: 'toTaste' },
    ]);

    // En la instalación de destino, los alérgenos calculados son los mismos que en la de origen.
    const destination = mergeCatalog(newIngredients, [imported]);
    expect(new Set(destination.derived.get(imported.id)!.allergens)).toEqual(new Set(merged.derived.get('u-lentejas')!.allergens));
  });

  it('reutiliza un ingrediente propio idéntico en vez de duplicarlo', () => {
    const parsed = parseRecipeFile(exported(), catalog);
    if (!parsed.ok) throw new Error('el archivo debería ser válido');
    const mine: CustomIngredient = { ...chorizo, id: 'u-ing-el-mio', name: 'Chorizo Casero' };
    const { recipe: imported, newIngredients } = prepareImport(parsed.content, [mine], newId, '2026-10-13T09:00:00.000Z');
    expect(newIngredients).toEqual([]);
    expect(imported.ingredients[1]!.ingredientId).toBe('u-ing-el-mio');

    // Si difiere en los alérgenos, no es el mismo: se crea aparte.
    const different: CustomIngredient = { ...mine, allergens: ['milk'] };
    expect(prepareImport(parsed.content, [different], newId, '2026-10-13T09:00:00.000Z').newIngredients).toHaveLength(1);
  });

  it('un borrador se importa como borrador', () => {
    const draft = recipe({ steps: [], status: 'draft' });
    const text = JSON.stringify(buildRecipeFile(draft, merged, '2026-10-12T10:00:00.000Z'));
    const parsed = parseRecipeFile(text, catalog);
    if (!parsed.ok) throw new Error('el archivo debería ser válido');
    expect(prepareImport(parsed.content, [], newId, '2026-10-13T09:00:00.000Z').recipe.status).toBe('draft');
  });

  it('rechaza lo que no es una receta válida, sin guardar nada', () => {
    const file = JSON.parse(exported());
    expect(parseRecipeFile('no es json', catalog)).toMatchObject({ ok: false, reason: 'notJson' });
    expect(parseRecipeFile(JSON.stringify({ app: 'menu-a-mano', schemaVersion: 4, data: {} }), catalog)).toMatchObject({
      ok: false,
      reason: 'notRecipe',
    });
    expect(parseRecipeFile(JSON.stringify({ ...file, schemaVersion: RECIPE_FILE_VERSION + 1 }), catalog)).toMatchObject({
      ok: false,
      reason: 'newerVersion',
    });
    expect(parseRecipeFile(JSON.stringify({ ...file, recipe: { ...file.recipe, mainGroup: 'postres' } }), catalog)).toMatchObject({
      ok: false,
      reason: 'invalid',
    });
  });

  it('rechaza una receta cuyos ingredientes no vienen en el archivo ni existen en la app', () => {
    const file = JSON.parse(exported());
    // Falta el ingrediente propio.
    expect(parseRecipeFile(JSON.stringify({ ...file, customIngredients: [] }), catalog)).toMatchObject({
      ok: false,
      reason: 'unknownIngredients',
      detail: 'u-ing-chorizo',
    });
    // Un ingrediente de catálogo que esta versión no tiene.
    const future = { ...file, recipe: { ...file.recipe, ingredients: [{ ingredientId: 'kale', quantity: 100, unit: 'g' }] } };
    expect(parseRecipeFile(JSON.stringify(future), catalog)).toMatchObject({ ok: false, reason: 'unknownIngredients' });
  });
});
