import { useLiveQuery } from 'dexie-react-hooks';
import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { db } from '../data/db';
import { getMeta, getPreferences, getProfiles, getSettings } from '../data/repos';
import type { DinerProfile, HouseholdSettings, Meta, Preferences, WeekPlan } from '../domain/types';
import { getInstallState, subscribeInstall, type InstallState } from '../install';
import { getPwaState, subscribePwa, type PwaState } from '../pwa';

export function useInstallState(): InstallState {
  return useSyncExternalStore(subscribeInstall, getInstallState);
}

export function usePwaState(): PwaState {
  return useSyncExternalStore(subscribePwa, getPwaState);
}

/**
 * Muestra un cambio al instante mientras se guarda. Sin esto, una casilla marcada
 * volvería un momento a su estado anterior hasta que la base de datos confirmase
 * el cambio. En cuanto llegan datos guardados nuevos, mandan ellos.
 */
export function usePending<T>(stored: T): [T, (next: T) => void] {
  const [pending, setPending] = useState<{ value: T } | null>(null);
  useEffect(() => {
    setPending(null);
  }, [stored]);
  return [pending ? pending.value : stored, (next) => setPending({ value: next })];
}

/** Mantiene la pantalla encendida mientras el componente está a la vista, si el dispositivo lo permite. */
export function useWakeLock(): void {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) void lock.release();
        else sentinel = lock;
      } catch {
        // El sistema puede negarlo (batería baja, por ejemplo); no es un error para la app.
      }
    };
    // El bloqueo se pierde al cambiar de pestaña; se recupera al volver.
    const onVisibilityChange = () => void acquire();

    void acquire();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      void sentinel?.release();
    };
  }, []);
}

/** Preferencias con las que se planifica (las de todos los comensales a la vez). undefined mientras carga. */
export function usePreferences(): Preferences | undefined {
  return useLiveQuery(() => getPreferences(), []);
}

/** Fichas de comensal; sirven para decir de quién es cada restricción. undefined mientras carga. */
export function useProfiles(): DinerProfile[] | undefined {
  return useLiveQuery(() => getProfiles(), []);
}

export interface Household {
  profiles: DinerProfile[];
  settings: HouseholdSettings;
}

/** Las fichas de comensal y los ajustes de la casa, por separado. undefined mientras carga. */
export function useHousehold(): Household | undefined {
  return useLiveQuery(async () => ({ profiles: await getProfiles(), settings: await getSettings() }), []);
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
