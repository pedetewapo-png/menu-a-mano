// Ajustes de apariencia: son comodidades de este dispositivo, no datos del
// usuario, así que viven en localStorage y no entran en las copias de seguridad.

const TEXT_KEY = 'mam.textScale';
const THEME_KEY = 'mam.theme';

export const TEXT_SCALES = ['100', '112.5', '125', '150'];
export const THEMES = ['system', 'light', 'dark'];

function read(key: string, allowed: string[], fallback: string): string {
  try {
    const value = localStorage.getItem(key);
    return value && allowed.includes(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Sin almacenamiento el ajuste dura solo esta sesión.
  }
}

// Mostrar u ocultar las calorías también es una preferencia de este dispositivo.
const CALORIES_KEY = 'mam.showCalories';
const listeners = new Set<() => void>();

export const getShowCalories = () => read(CALORIES_KEY, ['1', '0'], '1') === '1';

export function setShowCalories(show: boolean): void {
  write(CALORIES_KEY, show ? '1' : '0');
  for (const listener of listeners) listener();
}

export function subscribeAppearance(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getTextScale = () => read(TEXT_KEY, TEXT_SCALES, '100');
export const getTheme = () => read(THEME_KEY, THEMES, 'system');

export function applyAppearance(): void {
  const root = document.documentElement;
  root.style.fontSize = `${getTextScale()}%`;
  const theme = getTheme();
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
}

export function setTextScale(value: string): void {
  write(TEXT_KEY, value);
  applyAppearance();
}

export function setTheme(value: string): void {
  write(THEME_KEY, value);
  applyAppearance();
}
