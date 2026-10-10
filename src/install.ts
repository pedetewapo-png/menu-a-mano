/** Marca compartida entre la app y la página de instalación (mismo origen). */
export const INSTALLED_FLAG = 'mam.installed';

/** ¿Se está ejecutando como aplicación instalada, en su propia ventana? */
export function isStandalone(): boolean {
  return ['standalone', 'window-controls-overlay', 'minimal-ui'].some(
    (mode) => window.matchMedia(`(display-mode: ${mode})`).matches,
  );
}
