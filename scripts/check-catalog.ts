// Valida el catálogo antes de compilar. Uso: npm run catalog:check [-- --strict]
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkCatalog } from '../src/data/catalogCheck';
import { kcalPerServing, roundKcal } from '../src/domain/nutrition';

const root = join(import.meta.dirname, '..', 'catalog');
const strict = process.argv.includes('--strict');

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));

const recipesDir = join(root, 'recipes');
const rawRecipes = readdirSync(recipesDir)
  .filter((name) => name.endsWith('.json'))
  .map((name) => ({ file: name.replace(/\.json$/, ''), data: readJson(join(recipesDir, name)) }));

const report = checkCatalog(readJson(join(root, 'ingredients.json')), rawRecipes, readJson(join(root, 'nutrition.json')));

// Toda receta del catálogo debe poder mostrar sus calorías.
if (report.catalog) {
  const without = report.catalog.recipes.filter((r) => kcalPerServing(r, report.catalog!.ingredients) === null);
  if (without.length > 0) report.warnings.push(`Recetas sin calorías calculables: ${without.map((r) => r.id).join(', ')}`);
}

// Con --kcal se listan las calorías por ración de cada receta, para repasarlas de un vistazo.
if (process.argv.includes('--kcal') && report.catalog) {
  const rows = report.catalog.recipes
    .map((r) => ({ id: r.id, kcal: kcalPerServing(r, report.catalog!.ingredients) }))
    .sort((a, b) => (b.kcal ?? 0) - (a.kcal ?? 0));
  for (const row of rows) console.log(`${row.kcal === null ? '   ?' : String(roundKcal(row.kcal)).padStart(4)} kcal  ${row.id}`);
}

for (const warning of report.warnings) console.warn(`aviso  ${warning}`);
for (const error of report.errors) console.error(`ERROR  ${error}`);

const recipeCount = report.catalog?.recipes.length ?? 0;
console.log(`\nCatálogo: ${recipeCount} recetas, ${report.errors.length} errores, ${report.warnings.length} avisos.`);

if (report.errors.length > 0 || (strict && report.warnings.length > 0)) process.exit(1);
