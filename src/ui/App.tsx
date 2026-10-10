import { useEffect, useMemo, useState } from 'react';
import { HashRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import { mondayOf } from '../domain/week';
import { t } from '../i18n';
import { usePreferences, WeekContext } from './hooks';
import { MenuPage } from './pages/MenuPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { RecipeDetailPage } from './pages/RecipeDetailPage';
import { RecipesPage } from './pages/RecipesPage';
import { SettingsPage } from './pages/SettingsPage';
import { ShoppingPage } from './pages/ShoppingPage';

const NAV = [
  { to: '/menu', label: t.nav.menu },
  { to: '/recetas', label: t.nav.recipes },
  { to: '/compra', label: t.nav.shopping },
  { to: '/ajustes', label: t.nav.settings },
];

/** Avisos de la app instalada: lista para usarse sin conexión y versión nueva disponible. */
function PwaStatus() {
  const [offlineReady, setOfflineReady] = useState(false);
  const [update, setUpdate] = useState<(() => void) | null>(null);

  useEffect(() => {
    const updateSW = registerSW({
      onOfflineReady: () => setOfflineReady(true),
      // Nunca se recarga sola: la persona decide cuándo actualizar.
      onNeedRefresh: () => setUpdate(() => () => void updateSW(true)),
    });
  }, []);

  return (
    <div className="pwa-status" role="status" aria-live="polite">
      {update && (
        <p className="callout">
          {t.pwa.updateAvailable}{' '}
          <button type="button" className="button button-small button-primary" onClick={update}>
            {t.pwa.updateNow}
          </button>{' '}
          <button type="button" className="button button-small button-quiet" onClick={() => setUpdate(null)}>
            {t.pwa.dismiss}
          </button>
        </p>
      )}
      {offlineReady && !update && (
        <p className="callout">
          {t.pwa.offlineReady}{' '}
          <button type="button" className="button button-small button-quiet" onClick={() => setOfflineReady(false)}>
            {t.common.close}
          </button>
        </p>
      )}
    </div>
  );
}

export function App() {
  const prefs = usePreferences();
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const week = useMemo(() => ({ weekStart, setWeekStart }), [weekStart]);

  useEffect(() => {
    // Pide al navegador que no borre los datos si falta espacio.
    void navigator.storage?.persist?.();
  }, []);

  if (!prefs) return <p className="loading">{t.common.loading}</p>;
  if (!prefs.onboardingDone) return <OnboardingPage initial={prefs} />;

  return (
    <WeekContext.Provider value={week}>
      <HashRouter>
        <a className="skip-link" href="#contenido">
          {t.common.skipToContent}
        </a>
        <div className="shell">
          <nav className="sidebar" aria-label={t.nav.label}>
            <p className="brand">{t.appName}</p>
            <ul>
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to}>{item.label}</NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <main id="contenido" className="content" tabIndex={-1}>
            <PwaStatus />
            <Routes>
              <Route path="/menu" element={<MenuPage />} />
              <Route path="/recetas" element={<RecipesPage />} />
              <Route path="/recetas/:recipeId" element={<RecipeDetailPage />} />
              <Route path="/compra" element={<ShoppingPage />} />
              <Route path="/ajustes" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/menu" replace />} />
            </Routes>
          </main>
        </div>
      </HashRouter>
    </WeekContext.Provider>
  );
}
