import Dexie, { type Table } from 'dexie';
import type { Favorite, SavedPlan, ShoppingListState, WeekPlan } from '../domain/types';

export const SCHEMA_VERSION = 1;

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
    this.version(SCHEMA_VERSION).stores({
      kv: 'key',
      weekPlans: 'weekStart',
      savedPlans: 'id',
      favorites: 'recipeId',
      shoppingLists: 'weekStart',
    });
  }
}

export const db = new AppDatabase();
