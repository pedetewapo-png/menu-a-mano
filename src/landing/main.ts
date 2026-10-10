import { registerSW } from 'virtual:pwa-register';
import { INSTALLED_FLAG, isStandalone } from '../install';
import '../styles/tokens.css';
import './landing.css';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type State = 'checking' | 'install' | 'installed' | 'manual' | 'unsupported';

const STATES: State[] = ['checking', 'install', 'installed', 'manual', 'unsupported'];

function show(state: State): void {
  for (const name of STATES) {
    const element = document.getElementById(`state-${name}`);
    if (element) element.hidden = name !== state;
  }
}

function wasInstalled(): boolean {
  try {
    return localStorage.getItem(INSTALLED_FLAG) === '1';
  } catch {
    return false;
  }
}

// La página de instalación abierta dentro de la app instalada no tiene sentido.
if (isStandalone()) {
  location.replace(`${import.meta.env.BASE_URL}app/`);
} else {
  // El service worker deja la app descargada para que funcione sin conexión desde el primer arranque.
  registerSW({ immediate: true });

  let deferred: BeforeInstallPromptEvent | null = null;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    show('install');
  });

  window.addEventListener('appinstalled', () => {
    try {
      localStorage.setItem(INSTALLED_FLAG, '1');
    } catch {
      // La marca solo mejora el mensaje de esta página.
    }
    deferred = null;
    show('installed');
  });

  document.getElementById('install-button')?.addEventListener('click', async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    // El diálogo solo se puede lanzar una vez por evento.
    deferred = null;
    if (outcome === 'dismissed') show('manual');
  });

  const canPrompt = 'onbeforeinstallprompt' in window;
  if (!canPrompt) {
    show('unsupported');
  } else {
    // Si el navegador no ofrece el diálogo (ya instalada, o descartado hace poco), se explica la vía manual.
    window.setTimeout(() => {
      if (!deferred && !document.getElementById('state-checking')?.hidden) {
        show(wasInstalled() ? 'installed' : 'manual');
      }
    }, 3000);
  }
}
