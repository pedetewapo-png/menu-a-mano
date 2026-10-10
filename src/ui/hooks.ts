import { useLiveQuery } from 'dexie-react-hooks';
import { createContext, useContext } from 'react';
import { db } from '../data/db';
import { getMeta, getPreferences } from '../data/repos';
import type { Meta, Preferences, WeekPlan } from '../domain/types';

/** undefined mientras carga. */
export function usePreferences(): Preferences | undefined {
  return useLiveQuery(() => getPreferences(), []);
}

export function useMeta(): Meta | undefined {
  return useLiveQuery(() => getMeta(), []);
}

export function useFavorites(): ReadonlySet<string> | undefined {
  return useLiveQuery(async () => new Set((await db.favorites.toArray()).map((f) => f.recipeId)), []);
}

/** undefined mientras carga; `plan` es undefined si esa semana aún no tiene menú. */
export function useWeekPlan(weekStart: string): { plan: WeekPlan | undefined } | undefined {
  return useLiveQuery(async () => ({ plan: await db.weekPlans.get(weekStart) }), [weekStart]);
}

export interface WeekContextValue {
  weekStart: string;
  setWeekStart: (weekStart: string) => void;
}

/** Semana que se está viendo; la comparten el menú y la lista de la compra. */
export const WeekContext = createContext<WeekContextValue | null>(null);

export function useWeek(): WeekContextValue {
  const value = useContext(WeekContext);
  if (!value) throw new Error('Falta WeekContext');
  return value;
}
