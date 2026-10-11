import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initInstall } from '../install';
import { initPwa } from '../pwa';
import { App } from '../ui/App';
import { applyAppearance } from '../ui/appearance';
import '../styles/tokens.css';
import '../ui/styles.css';

initInstall();
initPwa();
applyAppearance();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
