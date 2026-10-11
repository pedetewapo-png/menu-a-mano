// Instalación opcional de la app. Lo comparten la página de entrada y la propia app.

/** Marca compartida entre la app y la página de entrada (mismo origen). */
const INSTALLED_FLAG = 'mam.installed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * - `checking`: aún no se sabe si el navegador ofrecerá instalar.
 * - `available`: se puede lanzar el diálogo de instalación.
 * - `installed`: ya está instalada (o se está usando instalada).
 * - `ios`: iPhone o iPad; se instala a mano desde el menú Compartir.
 * - `manual`: el navegador lo permite, pero hay que hacerlo desde su menú.
 * - `unsupported`: este navegador no instala aplicaciones.
 */
export type InstallState = 'checking' | 'available' | 'installed' | 'ios' | 'manual' | 'unsupported';

/** ¿Se está ejecutando como aplicación instalada, en su propia ventana? */
export function isStandalone(): boolean {
  if ((navigator as Navigator & { standalone?: boolean }).standalone) return true;
  return ['standalone', 'window-controls-overlay', 'minimal-ui'].some(
    (mode) => window.matchMedia(`(display-mode: ${mode})`).matches,
  );
}

function isIos(): boolean {
  // Los iPad modernos se identifican como Mac; se distinguen por la pantalla táctil.
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
}

function readFlag(): boolean {
  try {
    return localStorage.getItem(INSTALLED_FLAG) === '1';
  } catch {
    return false;
  }
}

function writeFlag(): void {
  try {
    localStorage.setItem(INSTALLED_FLAG, '1');
  } catch {
    // La marca solo mejora los mensajes.
  }
}

let state: InstallState = 'checking';
let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function setState(next: InstallState): void {
  if (state === next) return;
  state = next;
  for (const listener of listeners) listener();
}

/** Empieza a escuchar al navegador. Hay que llamarlo cuanto antes: el aviso de instalación puede llegar pronto. */
export function initInstall(): void {
  if (isStandalone()) {
    writeFlag();
    setState('installed');
    return;
  }
  if (isIos()) {
    setState('ios');
    return;
  }
  if (!('onbeforeinstallprompt' in window)) {
    setState('unsupported');
    return;
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    setState('available');
  });
  window.addEventListener('appinstalled', () => {
    writeFlag();
    deferred = null;
    setState('installed');
  });
  // Si el navegador no ofrece el diálogo (ya instalada, o descartado hace poco), queda la vía manual.
  window.setTimeout(() => {
    if (state === 'checking') setState(readFlag() ? 'installed' : 'manual');
  }, 3000);
}

export function subscribeInstall(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getInstallState = (): InstallState => state;

/** Lanza el diálogo de instalación del navegador. */
export async function promptInstall(): Promise<void> {
  if (!deferred) return;
  const event = deferred;
  // El diálogo solo se puede lanzar una vez por aviso.
  deferred = null;
  await event.prompt();
  const { outcome } = await event.userChoice;
  if (outcome === 'dismissed') setState('manual');
}
