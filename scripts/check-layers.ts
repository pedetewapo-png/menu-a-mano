// Comprueba la regla de capas: ui → data → domain. Uso: npm run check:layers
//  - src/domain solo importa de sí mismo: lógica pura, sin React, sin base de datos y sin textos.
//  - src/data no importa de la interfaz.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const src = resolve(import.meta.dirname, '..', 'src');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

/** Rutas que importa un archivo, tanto con `import … from` como con `import()`. */
function importsOf(file: string): string[] {
  const code = readFileSync(file, 'utf8');
  const pattern = /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g;
  return [...code.matchAll(pattern)].map((match) => match[1]!);
}

const layerOf = (path: string) => relative(src, path).split(sep)[0]!;

const errors: string[] = [];
for (const file of [...files(join(src, 'domain')), ...files(join(src, 'data'))]) {
  const layer = layerOf(file);
  for (const specifier of importsOf(file)) {
    const where = `${relative(src, file)} importa "${specifier}"`;
    if (!specifier.startsWith('.')) {
      // Una dependencia externa en el dominio lo ataría a una tecnología concreta.
      if (layer === 'domain') errors.push(`${where}: el dominio no usa paquetes externos`);
      continue;
    }
    const target = layerOf(resolve(file, '..', specifier));
    if (layer === 'domain' && target !== 'domain') errors.push(`${where}: el dominio solo importa del dominio`);
    if (layer === 'data' && !['data', 'domain'].includes(target) && !specifier.includes('catalog/')) {
      errors.push(`${where}: los datos no importan de "${target}"`);
    }
  }
}

for (const error of errors) console.error(`ERROR  ${error}`);
console.log(`Capas: ${errors.length} errores.`);
if (errors.length > 0) process.exit(1);
