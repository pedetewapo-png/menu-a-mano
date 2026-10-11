import { registerSW } from 'virtual:pwa-register';

// Estado del service worker, compartido con la interfaz. Se registra al
// arrancar para que la app quede disponible sin conexión cuanto antes.

export interface PwaState {
  /** La app ya está guardada en el dispositivo y funciona sin red. */
  offlineReady: boolean;
  /** Hay una versión nueva descargada, pendiente de aplicar. */
  updateAvailable: boolean;
}

let state: PwaState = { offlineReady: false, updateAvailable: false };
let applyUpdate: (() => void) | null = null;
const listeners = new Set<() => void>();

function setState(patch: Partial<PwaState>): void {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

export function initPwa(): void {
  const updateSW = registerSW({
    immediate: true,
    onOfflineReady: () => setState({ offlineReady: true }),
    // Nunca se recarga sola: la persona decide cuándo actualizar.
    onNeedRefresh: () => {
      applyUpdate = () => void updateSW(true);
      setState({ updateAvailable: true });
    },
  });
}

export function subscribePwa(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getPwaState = (): PwaState => state;

export function updateNow(): void {
  applyUpdate?.();
}

export function dismissPwaNotice(notice: keyof PwaState): void {
  setState({ [notice]: false });
}
