// Genera las imágenes de las recetas a partir de los originales de catalog/images/.
// De cada una salen una miniatura (320 px) y una imagen de detalle (960 px), en WebP
// y recortadas a 4:3. Los originales no se publican. Uso: npm run catalog:images
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const root = join(import.meta.dirname, '..');
const recipesDir = join(root, 'catalog', 'recipes');
const originalsDir = join(root, 'catalog', 'images');
const outDir = join(root, 'public', 'recipes');

const WIDTHS = [320, 960];
const MIN_ORIGINAL_WIDTH = 1200;
/** Presupuesto total: lo que cabe descargar para ver el catálogo sin conexión. */
const BUDGET_BYTES = 8 * 1024 * 1024;

mkdirSync(outDir, { recursive: true });

const errors = [];
const expected = new Set();
let generated = 0;

for (const name of readdirSync(recipesDir).filter((n) => n.endsWith('.json'))) {
  const recipe = JSON.parse(readFileSync(join(recipesDir, name), 'utf8'));
  if (!recipe.image) continue;

  const original = join(originalsDir, recipe.image.file);
  if (!existsSync(original)) {
    errors.push(`${recipe.id}: falta el original catalog/images/${recipe.image.file}`);
    continue;
  }
  const { width } = await sharp(original).metadata();
  if (width < MIN_ORIGINAL_WIDTH) {
    errors.push(`${recipe.id}: el original mide ${width} px de ancho (mínimo ${MIN_ORIGINAL_WIDTH})`);
    continue;
  }

  for (const size of WIDTHS) {
    const file = `${recipe.id}-${size}.webp`;
    expected.add(file);
    const out = join(outDir, file);
    // Solo se regenera si el original es más reciente que el resultado.
    if (existsSync(out) && statSync(out).mtimeMs >= statSync(original).mtimeMs) continue;
    await sharp(original)
      .rotate()
      .resize(size, Math.round((size * 3) / 4), { fit: 'cover', position: 'attention' })
      .webp({ quality: size === 320 ? 68 : 74 })
      .toFile(out);
    generated++;
  }
}

// Las imágenes de recetas que ya no existen o han perdido la foto se retiran.
let total = 0;
for (const file of readdirSync(outDir)) {
  if (!expected.has(file)) rmSync(join(outDir, file));
  else total += statSync(join(outDir, file)).size;
}
if (total > BUDGET_BYTES) {
  errors.push(`las imágenes pesan ${(total / 1048576).toFixed(1)} MB (máximo ${BUDGET_BYTES / 1048576} MB)`);
}

for (const error of errors) console.error(`ERROR  ${error}`);
console.log(
  `Imágenes: ${expected.size / WIDTHS.length} recetas con foto, ${generated} archivos generados, ${(total / 1024).toFixed(0)} KB en total.`,
);
if (errors.length > 0) process.exit(1);
