import { describe, expect, it } from 'vitest';
import { BACKUP_APP_ID, BACKUP_SCHEMA_VERSION, parseBackup } from '../data/backupFormat';
import { DEFAULT_SETTINGS } from '../domain/household';
import { emptyPlan } from '../domain/planner';
import { DEFAULT_PREFERENCES, type DinerProfile } from '../domain/types';

const ana: DinerProfile = {
  id: 'ana',
  name: 'Ana',
  diet: 'vegetarian',
  excludedIngredientIds: ['champinones'],
  excludedGroups: [],
  excludedAllergens: ['gluten'],
  createdAt: '2026-10-10T18:00:00.000Z',
};

const valid = () => ({
  app: BACKUP_APP_ID,
  schemaVersion: BACKUP_SCHEMA_VERSION,
  exportedAt: '2026-10-10T18:00:00.000Z',
  notice: '',
  data: {
    settings: { ...DEFAULT_SETTINGS, onboardingDone: true },
    // Una copia por prueba: alguna la modifica para comprobar que se rechaza.
    profiles: [{ ...ana }],
    userRecipes: [
      {
        id: 'u-1',
        name: 'Sopa de la abuela',
        summary: '',
        mealTypes: ['dinner'],
        baseServings: 4,
        totalMinutes: 40,
        activeMinutes: 15,
        cost: 1,
        mainGroup: 'vegetables',
        cuisine: 'other',
        ingredients: [{ ingredientId: 'u-ing-1', quantity: 200, unit: 'g' }],
        steps: ['Cocer todo.'],
        source: { author: 'Receta propia', license: 'Uso personal' },
        origin: 'own',
        status: 'ready',
        includeInPlanner: true,
        photoThumb: 'data:image/webp;base64,AAAA',
        updatedAt: '2026-10-12T10:00:00.000Z',
      },
    ],
    userIngredients: [
      {
        id: 'u-ing-1',
        name: 'fideos de la abuela',
        section: 'dryGoods',
        baseUnit: 'g',
        diet: 'vegetarian',
        allergens: ['gluten', 'eggs'],
        mayContain: [],
        groups: [],
        pantryStaple: false,
        custom: true,
      },
    ],
    userPhotos: [{ recipeId: 'u-1', dataUrl: 'data:image/webp;base64,BBBB' }],
    weekPlans: [{ ...emptyPlan('2026-10-12', DEFAULT_PREFERENCES), updatedAt: '2026-10-10T18:00:00.000Z' }],
    savedPlans: [],
    favorites: [{ recipeId: 'pisto', addedAt: '2026-10-10T18:00:00.000Z' }],
    shoppingLists: [
      { weekStart: '2026-10-12', checked: { arroz: { quantityWhenChecked: 300 } }, alreadyHave: [], manualItems: [] },
    ],
  },
});

describe('parseBackup', () => {
  it('acepta una copia válida y la devuelve intacta', () => {
    const backup = valid();
    const result = parseBackup(JSON.stringify(backup));
    expect(result).toEqual({ ok: true, data: backup.data });
  });

  it('rechaza lo que no es JSON', () => {
    expect(parseBackup('esto no es una copia')).toEqual({ ok: false, reason: 'notJson' });
  });

  it('rechaza archivos de otra aplicación', () => {
    expect(parseBackup(JSON.stringify({ ...valid(), app: 'otra' }))).toMatchObject({ ok: false, reason: 'otherApp' });
    expect(parseBackup('{}')).toMatchObject({ ok: false, reason: 'otherApp' });
  });

  it('rechaza copias de un esquema posterior', () => {
    const newer = { ...valid(), schemaVersion: BACKUP_SCHEMA_VERSION + 1 };
    expect(parseBackup(JSON.stringify(newer))).toMatchObject({ ok: false, reason: 'newerVersion' });
  });

  it('rechaza copias dañadas', () => {
    const broken = valid();
    broken.data.weekPlans[0]!.slots.pop();
    expect(parseBackup(JSON.stringify(broken))).toMatchObject({ ok: false, reason: 'invalid' });

    const badDiet = valid() as unknown as { data: { profiles: { diet: string }[] } };
    badDiet.data.profiles[0]!.diet = 'carnívora';
    expect(parseBackup(JSON.stringify(badDiet))).toMatchObject({ ok: false, reason: 'invalid' });

    const noName = valid();
    noName.data.profiles[0] = { ...ana, name: '   ' };
    expect(parseBackup(JSON.stringify(noName))).toMatchObject({ ok: false, reason: 'invalid' });
  });

  it('una copia anterior a las recetas propias se importa con esas listas vacías', () => {
    const { userRecipes: _recipes, userIngredients: _ingredients, userPhotos: _photos, ...older } = valid().data;
    const result = parseBackup(JSON.stringify({ ...valid(), schemaVersion: 3, data: older }));
    expect(result).toMatchObject({ ok: true, data: { userRecipes: [], userIngredients: [], userPhotos: [] } });
  });

  it('rechaza una receta propia con un identificador que podría chocar con el catálogo', () => {
    const clash = valid();
    clash.data.userRecipes[0]!.id = 'pisto';
    expect(parseBackup(JSON.stringify(clash))).toMatchObject({ ok: false, reason: 'invalid' });
  });
});
