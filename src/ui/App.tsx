import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { HashRouter, Link, Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { promptInstall } from '../install';
import { mondayOf } from '../domain/week';
import { t } from '../i18n';
import { dismissPwaNotice, updateNow } from '../pwa';
import { useInstallState, usePreferences, usePwaState, WeekContext } from './hooks';
import { CookPage } from './pages/CookPage';
import { MenuPage } from './pages/MenuPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { RecipeDetailPage } from './pages/RecipeDetailPage';
import { RecipesPage } from './pages/RecipesPage';
import { SettingsPage } from './pages/SettingsPage';
import { ShoppingPage } from './pages/ShoppingPage';

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      className="nav-icon"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const NAV = [
  {
    to: '/menu',
    label: t.nav.menu,
    icon: (
      <Icon>
        <rect x="3.5" y="5" width="17" height="15" rx="2" />
        <path d="M3.5 10h17M8 3v4M16 3v4" />
      </Icon>
    ),
  },
  {
    to: '/recetas',
    label: t.nav.recipes,
    icon: (
      <Icon>
        <path d="M5 4.5h11a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z" />
        <path d="M9 9h6M9 13h6" />
      </Icon>
    ),
  },
  {
    to: '/compra',
    label: t.nav.shopping,
    icon: (
      <Icon>
        <path d="M3 4h2.5l2.2 10.5h10.6L20.5 7H6.4" />
        <circle cx="9" cy="19" r="1.4" />
        <circle cx="17" cy="19" r="1.4" />
      </Icon>
    ),
  },
  {
    to: '/ajustes',
    label: t.nav.settings,
    icon: (
      <Icon>
        <path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1" />
        <circle cx="15" cy="7" r="2" />
        <circle cx="9" cy="12" r="2" />
        <circle cx="17" cy="17" r="2" />
      </Icon>
    ),
  },
];

/** Avisos de la app: lista para usarse sin conexión y versión nueva disponible. */
function PwaStatus() {
  const { offlineReady, updateAvailable } = usePwaState();
  return (
    <div className="pwa-status" role="status" aria-live="polite">
      {updateAvailable && (
        <p className="callout">
          {t.pwa.updateAvailable}{' '}
          <button type="button" className="button button-small button-primary" onClick={updateNow}>
            {t.pwa.updateNow}
          </button>{' '}
          <button type="button" className="button button-small button-quiet" onClick={() => dismissPwaNotice('updateAvailable')}>
            {t.pwa.dismiss}
          </button>
        </p>
      )}
      {offlineReady && !updateAvailable && (
        <p className="callout">
          {t.pwa.offlineReady}{' '}
          <button type="button" className="button button-small button-quiet" onClick={() => dismissPwaNotice('offlineReady')}>
            {t.common.close}
          </button>
        </p>
      )}
    </div>
  );
}

const STORAGE_NOTICE_KEY = 'mam.storageNoticeDismissedAt';
const STORAGE_NOTICE_REPEAT_DAYS = 30;

function storageNoticeDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(STORAGE_NOTICE_KEY));
    return at > 0 && Date.now() - at < STORAGE_NOTICE_REPEAT_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

/**
 * Un navegador puede borrar los datos de una web que no está instalada.
 * Si no garantiza conservarlos, se avisa con discreción y se ofrecen salidas.
 */
function StorageNotice() {
  const install = useInstallState();
  const [atRisk, setAtRisk] = useState(false);
  const [dismissed, setDismissed] = useState(storageNoticeDismissed);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const storage = navigator.storage;
      if (!storage?.persisted) return;
      const safe = (await storage.persisted()) || ((await storage.persist?.()) ?? false);
      if (alive) setAtRisk(!safe);
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!atRisk || dismissed || install === 'installed') return null;

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_NOTICE_KEY, String(Date.now()));
    } catch {
      // Sin almacenamiento, el aviso volverá a salir la próxima vez.
    }
    setDismissed(true);
  };

  return (
    <aside className="callout storage-notice" aria-label={t.storage.title}>
      <p>
        <strong>{t.storage.title}.</strong> {t.storage.text}
      </p>
      <div className="toolbar">
        {install === 'available' && (
          <button type="button" className="button button-small" onClick={() => void promptInstall()}>
            {t.install.button}
          </button>
        )}
        <Link className="button button-small" to="/ajustes">
          {t.storage.goToData}
        </Link>
        <button type="button" className="button button-small button-quiet" onClick={dismiss}>
          {t.storage.dismiss}
        </button>
      </div>
    </aside>
  );
}

/** Las pantallas habituales, con la navegación principal. */
function Shell() {
  return (
    <>
      <a className="skip-link" href="#contenido">
        {t.common.skipToContent}
      </a>
      <div className="shell">
        <nav className="sidebar" aria-label={t.nav.label}>
          <p className="brand">{t.appName}</p>
          <ul>
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to}>
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
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
          <StorageNotice />
        </main>
      </div>
    </>
  );
}

export function App() {
  const prefs = usePreferences();
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const week = useMemo(() => ({ weekStart, setWeekStart }), [weekStart]);

  if (!prefs) return <p className="loading">{t.common.loading}</p>;
  if (!prefs.onboardingDone) return <OnboardingPage />;

  return (
    <WeekContext.Provider value={week}>
      <HashRouter>
        <Routes>
          {/* El modo cocina ocupa toda la pantalla, sin navegación. */}
          <Route path="/cocinar/:recipeId" element={<CookPage />} />
          <Route path="*" element={<Shell />} />
        </Routes>
      </HashRouter>
    </WeekContext.Provider>
  );
}
