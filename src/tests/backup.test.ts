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
    profiles: [ana],
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
});
