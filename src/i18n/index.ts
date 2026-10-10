import { es, type Messages } from './es';

// Único punto de acceso a los textos de la interfaz. Para añadir un idioma
// basta con otro objeto que cumpla `Messages` y elegirlo aquí.
export const locale = 'es-ES';
export const t: Messages = es;
