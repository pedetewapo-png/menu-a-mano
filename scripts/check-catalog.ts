// Valida el catálogo antes de compilar. Uso: npm run catalog:check [-- --strict]
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkCatalog } from '../src/data/catalogCheck';

const root = join(import.meta.dirname, '..', 'catalog');
const strict = process.argv.includes('--strict');

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));

const recipesDir = join(root, 'recipes');
const rawRecipes = readdirSync(recipesDir)
  .filter((name) => name.endsWith('.json'))
  .map((name) => ({ file: name.replace(/\.json$/, ''), data: readJson(join(recipesDir, name)) }));

const report = checkCatalog(readJson(join(root, 'ingredients.json')), rawRecipes);

for (const warning of report.warnings) console.warn(`aviso  ${warning}`);
for (const error of report.errors) console.error(`ERROR  ${error}`);

const recipeCount = report.catalog?.recipes.length ?? 0;
console.log(`\nCatálogo: ${recipeCount} recetas, ${report.errors.length} errores, ${report.warnings.length} avisos.`);

if (report.errors.length > 0 || (strict && report.warnings.length > 0)) process.exit(1);
