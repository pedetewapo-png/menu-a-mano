import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../ui/App';
import { applyAppearance } from '../ui/appearance';
import { INSTALLED_FLAG, isStandalone } from '../install';
import '../styles/tokens.css';
import '../ui/styles.css';

// Menú a Mano se usa como aplicación instalada. Abierta en una pestaña normal,
// lleva a la página de instalación. `?tab=1` lo evita para poder probar una
// compilación sin instalarla; en desarrollo no hace falta.
const allowTab = import.meta.env.DEV || new URLSearchParams(location.search).has('tab');

if (!isStandalone() && !allowTab) {
  location.replace(import.meta.env.BASE_URL);
} else {
  if (isStandalone()) {
    try {
      localStorage.setItem(INSTALLED_FLAG, '1');
    } catch {
      // Solo sirve para que la página de instalación sepa que ya está instalada.
    }
  }
  applyAppearance();
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
