import { getInstallState, initInstall, isStandalone, promptInstall, subscribeInstall, type InstallState } from '../install';
import { initPwa } from '../pwa';
import '../styles/tokens.css';
import './landing.css';

const STATES: InstallState[] = ['checking', 'available', 'installed', 'ios', 'manual', 'unsupported'];

function render(): void {
  const current = getInstallState();
  for (const name of STATES) {
    const element = document.getElementById(`state-${name}`);
    if (element) element.hidden = name !== current;
  }
}

// La página de entrada abierta dentro de la app instalada no tiene sentido.
if (isStandalone()) {
  location.replace(`${import.meta.env.BASE_URL}app/`);
} else {
  // El service worker deja la app descargada para que funcione sin conexión desde el primer arranque.
  initPwa();
  initInstall();
  subscribeInstall(render);
  render();
  document.getElementById('install-button')?.addEventListener('click', () => void promptInstall());
}
