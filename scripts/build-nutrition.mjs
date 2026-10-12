// Genera catalog/nutrition.json a partir de la tabla de composición de alimentos de USDA
// (FoodData Central, SR Legacy) y de catalog/nutrition-sources.json, que dice qué alimento
// de la tabla corresponde a cada ingrediente. La tabla no se guarda en el proyecto: hay
// que descargarla e indicar dónde está.
//
// Uso: npm run catalog:nutrition -- <carpeta con los CSV de SR Legacy>
// Descarga: https://fdc.nal.usda.gov/download-datasets (SR Legacy, CSV)
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dataDir = process.argv[2];
if (!dataDir) {
  console.error('Indica la carpeta con los CSV de SR Legacy.');
  process.exit(1);
}
const catalogDir = join(import.meta.dirname, '..', 'catalog');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const read = (name) => parseCsv(readFileSync(join(dataDir, name), 'utf8')).slice(1);

const sources = JSON.parse(readFileSync(join(catalogDir, 'nutrition-sources.json'), 'utf8')).foods;
const wanted = new Set(Object.values(sources).map((s) => String(s.fdcId)));

const descriptions = new Map(read('food.csv').filter((r) => wanted.has(r[0])).map((r) => [r[0], r[2]]));

// Identificadores de nutriente de USDA, por 100 g de alimento.
const NUTRIENTS = { 1008: 'kcal', 1003: 'protein', 1004: 'fat', 1005: 'carbs' };
const values = new Map();
// Este archivo es grande: se recorre línea a línea en vez de analizarlo entero.
for (const line of readFileSync(join(dataDir, 'food_nutrient.csv'), 'utf8').split('\n').slice(1)) {
  const [, fdcId, nutrientId, amount] = line.split(',').map((x) => x.replaceAll('"', ''));
  const key = NUTRIENTS[nutrientId];
  if (!key || !wanted.has(fdcId)) continue;
  if (!values.has(fdcId)) values.set(fdcId, {});
  values.get(fdcId)[key] = Number(amount);
}

// Raciones que publica USDA: de ellas salen el peso de una unidad y el de una cucharada.
const portions = new Map();
for (const r of read('food_portion.csv')) {
  if (!wanted.has(r[1])) continue;
  if (!portions.has(r[1])) portions.set(r[1], []);
  portions.get(r[1]).push({ amount: Number(r[3]), modifier: r[6].toLowerCase(), grams: Number(r[7]) });
}

const ML = [
  [/^(tsp|teaspoon)\b/, 5],
  [/^(tbsp|tablespoon)\b/, 15],
  [/^cup\b/, 236.6],
];

/** Gramos por mililitro, a partir de la primera ración de cucharadita, cucharada o taza. */
function gramsPerMl(list) {
  for (const [pattern, ml] of ML) {
    const portion = list.find((p) => pattern.test(p.modifier) && p.grams > 0 && p.amount > 0);
    if (portion) return Math.round((portion.grams / (portion.amount * ml)) * 100) / 100;
  }
  return undefined;
}

const errors = [];
const foods = {};
for (const [ingredientId, source] of Object.entries(sources)) {
  const fdcId = String(source.fdcId);
  const nutrients = values.get(fdcId);
  if (!descriptions.has(fdcId) || nutrients?.kcal === undefined) {
    errors.push(`${ingredientId}: el alimento ${fdcId} no está en la tabla o no tiene energía`);
    continue;
  }
  const list = portions.get(fdcId) ?? [];
  const entry = {
    fdcId: source.fdcId,
    description: descriptions.get(fdcId),
    kcal: nutrients.kcal,
    protein: nutrients.protein ?? 0,
    fat: nutrients.fat ?? 0,
    carbs: nutrients.carbs ?? 0,
  };
  if (source.unitPortion) {
    const portion = list.find((p) => p.modifier.startsWith(source.unitPortion));
    if (!portion) errors.push(`${ingredientId}: USDA no publica la ración "${source.unitPortion}"`);
    else entry.gramsPerUnit = Math.round((portion.grams / portion.amount) * 10) / 10;
  }
  const density = gramsPerMl(list);
  if (density !== undefined) entry.gramsPerMl = density;
  if (source.ignore) entry.ignore = true;
  foods[ingredientId] = entry;
}

for (const error of errors) console.error(`ERROR  ${error}`);
if (errors.length > 0) process.exit(1);

const output = {
  source: {
    name: 'U.S. Department of Agriculture, Agricultural Research Service. FoodData Central: SR Legacy',
    version: '2018-04',
    url: 'https://fdc.nal.usda.gov/',
    license: 'Dominio público (CC0 1.0)',
    note: 'Valores por 100 g de alimento. No se han modificado; solo se han redondeado las densidades.',
  },
  foods,
};
writeFileSync(join(catalogDir, 'nutrition.json'), JSON.stringify(output, null, 2) + '\n', 'utf8');
console.log(`Nutrición: ${Object.keys(foods).length} ingredientes escritos en catalog/nutrition.json`);
