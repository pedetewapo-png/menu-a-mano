import Dexie, { type Table } from 'dexie';
import type { DinerProfile, Favorite, SavedPlan, ShoppingListState, WeekPlan } from '../domain/types';
import { migratePreferences, migrateWeekPlan, splitPreferences } from './migrations';

/**
 * Versión del esquema local.
 * 1 = v1 (comida y cena).
 * 2 = se añaden los desayunos.
 * 3 = las preferencias se reparten entre fichas de comensal y ajustes de la casa.
 */
export const SCHEMA_VERSION = 3;

export const SETTINGS_KEY = 'settings';
/** Clave de las preferencias de los esquemas 1 y 2; desaparece al migrar al 3. */
const LEGACY_PREFERENCES_KEY = 'preferences';
/** Copias de los datos tal como estaban antes de cada migración, por si hiciera falta recuperarlos. */
const PRE_V2_SNAPSHOT_KEY = 'snapshot-before-v2';
const PRE_V3_SNAPSHOT_KEY = 'snapshot-before-v3';

export interface KeyValue {
  key: string;
  value: unknown;
}

export class AppDatabase extends Dexie {
  kv!: Table<KeyValue, string>;
  profiles!: Table<DinerProfile, string>;
  weekPlans!: Table<WeekPlan, string>;
  savedPlans!: Table<SavedPlan, string>;
  favorites!: Table<Favorite, string>;
  shoppingLists!: Table<ShoppingListState, string>;

  constructor() {
    super('menu-a-mano');
    this.version(1).stores({
      kv: 'key',
      weekPlans: 'weekStart',
      savedPlans: 'id',
      favorites: 'recipeId',
      shoppingLists: 'weekStart',
    });

    // 2: cada día pasa de dos comidas a tres. Las tablas no cambian; cambian los datos.
    this.version(2).upgrade(async (tx) => {
      const kv = tx.table<KeyValue, string>('kv');
      const weekPlans = tx.table<WeekPlan, string>('weekPlans');
      const preferences = await kv.get(LEGACY_PREFERENCES_KEY);

      await kv.put({
        key: PRE_V2_SNAPSHOT_KEY,
        value: { savedAt: new Date().toISOString(), preferences: preferences?.value, weekPlans: await weekPlans.toArray() },
      });
      if (preferences) await kv.put({ key: LEGACY_PREFERENCES_KEY, value: migratePreferences(preferences.value) });
      await weekPlans.toCollection().modify((plan, ref) => {
        ref.value = migrateWeekPlan(plan);
      });
    });

    // 3: las preferencias, que eran de una sola persona, pasan a ser una ficha de comensal y unos ajustes de la casa.
    this.version(3)
      .stores({ profiles: 'id' })
      .upgrade(async (tx) => {
        const kv = tx.table<KeyValue, string>('kv');
        const preferences = await kv.get(LEGACY_PREFERENCES_KEY);
        if (!preferences) return;

        const { settings, profiles } = splitPreferences(preferences.value);
        await kv.put({
          key: PRE_V3_SNAPSHOT_KEY,
          value: { savedAt: new Date().toISOString(), preferences: preferences.value },
        });
        await kv.put({ key: SETTINGS_KEY, value: settings });
        await tx.table<DinerProfile, string>('profiles').bulkPut(profiles);
        await kv.delete(LEGACY_PREFERENCES_KEY);
      });
  }
}

export const db = new AppDatabase();
