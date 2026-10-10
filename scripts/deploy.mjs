// Compila el sitio para GitHub Pages y lo publica en la rama gh-pages. Uso: npm run deploy
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import ghpages from 'gh-pages';

// En GitHub Pages el sitio cuelga de /<repositorio>/.
const BASE_PATH = '/menu-a-mano/';
const root = join(import.meta.dirname, '..');

execSync('npm run build', { cwd: root, stdio: 'inherit', env: { ...process.env, BASE_PATH } });

await ghpages.publish(join(root, 'dist'), {
  dotfiles: true,
  // Sin esto GitHub procesa el sitio con Jekyll y descarta algunos archivos.
  nojekyll: true,
  message: `Publicar ${new Date().toISOString().slice(0, 10)}`,
});

console.log('\nPublicado. Los cambios tardan alrededor de un minuto en verse.');
