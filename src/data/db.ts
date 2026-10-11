import Dexie, { type Table } from 'dexie';
import type { Favorite, SavedPlan, ShoppingListState, WeekPlan } from '../domain/types';
import { migratePreferences, migrateWeekPlan } from './migrations';

/** Versión del esquema local. 1 = v1 (comida y cena). 2 = v2 (se añaden los desayunos). */
export const SCHEMA_VERSION = 2;

export const PREFERENCES_KEY = 'preferences';
/** Copia de los datos tal como estaban antes de pasar a la v2, por si hiciera falta recuperarlos. */
export const PRE_V2_SNAPSHOT_KEY = 'snapshot-before-v2';

export interface KeyValue {
  key: string;
  value: unknown;
}

export class AppDatabase extends Dexie {
  kv!: Table<KeyValue, string>;
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

    // v2: cada día pasa de dos comidas a tres. Las tablas no cambian; cambian los datos.
    this.version(2).upgrade(async (tx) => {
      const kv = tx.table<KeyValue, string>('kv');
      const weekPlans = tx.table<WeekPlan, string>('weekPlans');
      const preferences = await kv.get(PREFERENCES_KEY);

      await kv.put({
        key: PRE_V2_SNAPSHOT_KEY,
        value: { savedAt: new Date().toISOString(), preferences: preferences?.value, weekPlans: await weekPlans.toArray() },
      });
      if (preferences) await kv.put({ key: PREFERENCES_KEY, value: migratePreferences(preferences.value) });
      await weekPlans.toCollection().modify((plan, ref) => {
        ref.value = migrateWeekPlan(plan);
      });
    });
  }
}

export const db = new AppDatabase();
