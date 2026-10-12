// Genera revision/recetas.html: cada receta del catálogo con sus ingredientes, sus pasos y
// lo que la app calcula a partir de ellos (dieta, alérgenos y calorías), para que una persona
// las revise con la lista de comprobación de la especificación v2 (§9.3).
// Uso: npm run catalog:review
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkCatalog } from '../src/data/catalogCheck';
import { kcalPerServing } from '../src/domain/nutrition';
import type { Allergen, Ingredient, Recipe } from '../src/domain/types';
import { t } from '../src/i18n';
import { capitalize, formatKcal, formatRecipeIngredient, normalize } from '../src/ui/format';

const root = join(import.meta.dirname, '..');
const catalogDir = join(root, 'catalog');
const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));

const recipesDir = join(catalogDir, 'recipes');
const rawRecipes = readdirSync(recipesDir)
  .filter((name) => name.endsWith('.json'))
  .map((name) => ({ file: name.replace(/\.json$/, ''), data: readJson(join(recipesDir, name)) }));
const report = checkCatalog(readJson(join(catalogDir, 'ingredients.json')), rawRecipes, readJson(join(catalogDir, 'nutrition.json')));
if (!report.catalog) {
  for (const error of report.errors) console.error(`ERROR  ${error}`);
  process.exit(1);
}
const catalog = report.catalog;

const escape = (value: unknown) =>
  String(value ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const list = (allergens: readonly Allergen[]) => allergens.map((a) => t.allergen[a].toLowerCase()).join(', ');

// Palabras que no distinguen a un ingrediente de otro ("lomos de merluza", "pimiento rojo").
const FILLER = new Set(['de', 'del', 'en', 'con', 'para', 'o', 'y', 'al', 'la', 'el', 'lomos', 'filetes', 'cinta', 'copos', 'taquitos']);
// Formas en que los pasos nombran un ingrediente sin decir su nombre.
const ALSO: Record<string, string> = { sal: '\\bsala(s|l[aeo]s?)?\\b|salar|salpim|sazon', 'pimienta-negra': 'salpim' };

/** Palabras por las que los pasos pueden nombrar al ingrediente: "tomate" para "tomate triturado". */
function words(ingredient: Ingredient): RegExp[] {
  return normalize(ingredient.name)
    .split(/[^a-zñ]+/)
    .filter((word) => word.length > 1 && !FILLER.has(word))
    .map((word) => {
      const stem = word.length > 4 ? word.replace(/(es|s)$/, '') : word;
      // Las palabras cortas se buscan enteras: "sal" no debe coincidir con "salsa" ni con "saltea".
      return new RegExp(stem.length <= 3 ? `\\b${stem}(es|s)?\\b` : `\\b${stem}`);
    });
}
const keywords = new Map([...catalog.ingredients.values()].map((i) => [i.id, words(i)]));

/** Diferencias aparentes entre la lista de ingredientes y los pasos. Es una ayuda, no una prueba. */
function hints(recipe: Recipe): string[] {
  const steps = normalize(recipe.steps.join(' '));
  const own = new Set(recipe.ingredients.map((i) => i.ingredientId));
  const ownWords = new Set([...own].flatMap((id) => keywords.get(id)!.map((w) => w.source)));
  const result: string[] = [];
  // De la lista a los pasos: basta con que aparezca una de sus palabras ("pollo" por "contramuslos de pollo").
  for (const id of own) {
    const named = keywords.get(id)!.some((w) => w.test(steps)) || (ALSO[id] !== undefined && new RegExp(ALSO[id]).test(steps));
    if (!named) result.push(`«${catalog.ingredients.get(id)!.name}» está en la lista, pero los pasos no lo nombran.`);
  }
  // De los pasos a la lista: tienen que aparecer todas ("salsa" y "soja"), y ninguna ser de un ingrediente de la receta.
  for (const [id, patterns] of keywords) {
    if (own.has(id) || patterns.some((w) => ownWords.has(w.source))) continue;
    if (patterns.every((w) => w.test(steps))) result.push(`Los pasos nombran «${catalog.ingredients.get(id)!.name}», que no está en la lista.`);
  }
  return result;
}

const verdict = (id: string, label: string) => `
      <div class="verdict" data-id="${escape(id)}">
        <label><input type="radio" name="v-${escape(id)}" value="BIEN"> ${label} bien</label>
        <label><input type="radio" name="v-${escape(id)}" value="CORREGIR"> Hay que corregir algo</label>
        <label class="what">¿Qué hay que corregir? <textarea rows="2"></textarea></label>
      </div>`;

const ingredientRows = [...catalog.ingredients.values()]
  .sort((a, b) => a.name.localeCompare(b.name, 'es'))
  .map(
    (i) => `
        <tr>
          <th scope="row">${escape(capitalize(i.name))}</th>
          <td>${escape(t.diet[i.diet])}</td>
          <td>${escape(list(i.allergens)) || '—'}</td>
          <td>${escape(list(i.mayContain)) || '—'}</td>
        </tr>`,
  )
  .join('');

let withHints = 0;
const recipeCards = [...catalog.recipes]
  .sort((a, b) => a.name.localeCompare(b.name, 'es'))
  .map((recipe) => {
    const items = recipe.ingredients.map((item) => ({ item, ingredient: catalog.ingredients.get(item.ingredientId)! }));
    const contains = [...new Set(items.flatMap(({ ingredient }) => ingredient.allergens))];
    const mayContain = [...new Set(items.flatMap(({ ingredient }) => ingredient.mayContain))].filter((a) => !contains.includes(a));
    const kcal = kcalPerServing(recipe, catalog.ingredients);
    const recipeHints = hints(recipe);
    if (recipeHints.length > 0) {
      withHints++;
      console.log(`${recipe.id}\n${recipeHints.map((h) => `  - ${h}`).join('\n')}`);
    }
    const lines = items
      .map(({ item, ingredient }) => {
        const tags = [
          ingredient.allergens.length > 0 ? `lleva ${list(ingredient.allergens)}` : '',
          ingredient.mayContain.length > 0 ? `puede llevar ${list(ingredient.mayContain)}` : '',
        ].filter(Boolean);
        return `<li>${escape(formatRecipeIngredient(ingredient, item, 1))}${tags.length > 0 ? ` <span class="tag">${escape(tags.join('; '))}</span>` : ''}</li>`;
      })
      .join('');
    return `
    <section class="card" id="${escape(recipe.id)}">
      <h3>${escape(recipe.name)}</h3>
      <p class="facts">${escape(recipe.mealTypes.map((m) => t.meal[m]).join(' y '))} · ${recipe.baseServings} raciones · ${recipe.totalMinutes} min en total, ${recipe.activeMinutes} min de trabajo${recipe.reviewedOn ? ` · <strong>Revisada el ${escape(recipe.reviewedOn)}</strong>` : ''}</p>
      <div class="cols">
        <div>
          <h4>Ingredientes</h4>
          <ul>${lines}</ul>
        </div>
        <div>
          <h4>Pasos</h4>
          <ol>${recipe.steps.map((step) => `<li>${escape(step)}</li>`).join('')}</ol>
          ${recipe.notes ? `<p class="note">${escape(recipe.notes)}</p>` : ''}
        </div>
      </div>
      <dl class="computed">
        <div><dt>Dieta</dt><dd>${escape(t.diet[catalog.derived.get(recipe.id)!.diet])}</dd></div>
        <div><dt>Lleva</dt><dd>${escape(list(contains)) || 'ningún alérgeno'}</dd></div>
        <div><dt>Puede llevar, según la marca</dt><dd>${escape(list(mayContain)) || '—'}</dd></div>
        <div><dt>Calorías</dt><dd>${kcal === null ? 'no disponibles' : `${escape(formatKcal(kcal))} por ración`}</dd></div>
      </dl>
      ${recipeHints.length > 0 ? `<div class="hints"><strong>Para mirar con atención</strong><ul>${recipeHints.map((h) => `<li>${escape(h)}</li>`).join('')}</ul></div>` : ''}
      ${verdict(recipe.id, 'Está')}
    </section>`;
  })
  .join('');

const page = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Revisión de recetas · Menú a Mano</title>
<style>
  body { font-family: system-ui, sans-serif; line-height: 1.5; margin: 0 auto; max-width: 60rem; padding: 1rem; background: #faf8f3; color: #1f2a24; }
  h1 { margin-bottom: .25rem; }
  h2 { margin-top: 2.5rem; }
  h3 { margin: 0; font-size: 1.25rem; }
  h4 { margin: .75rem 0 .25rem; font-size: 1rem; }
  .intro, .card { background: #fff; border: 1px solid #cfcabd; border-radius: 10px; padding: 1rem 1.25rem; margin: 1rem 0; }
  .facts, .note { color: #56645c; margin: .25rem 0; }
  .cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr)); gap: 0 2rem; }
  ul, ol { margin: 0; padding-left: 1.25rem; }
  .tag { display: inline-block; padding: 0 .4rem; border-radius: 6px; background: #fdecc8; color: #5c3b00; font-size: .85rem; }
  .computed { display: grid; grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr)); gap: .5rem 1rem; margin: 1rem 0; padding: .75rem 1rem; background: #eef6f1; border-radius: 8px; }
  .computed div { margin: 0; }
  dt { font-size: .85rem; color: #56645c; }
  dd { margin: 0; font-weight: 600; }
  .hints { margin: 1rem 0; padding: .75rem 1rem; background: #fff4e5; border-left: 4px solid #b25e09; border-radius: 4px; }
  .verdict { display: flex; flex-wrap: wrap; gap: .5rem 1.5rem; align-items: center; padding-top: .75rem; border-top: 1px solid #e4e0d5; }
  .verdict input { width: 1.2rem; height: 1.2rem; accent-color: #2f6f4e; vertical-align: middle; }
  .verdict .what { display: none; flex-basis: 100%; }
  .verdict:has(input[value="CORREGIR"]:checked) .what { display: block; }
  .card:has(input[value="BIEN"]:checked) { border-color: #2f6f4e; }
  .card:has(input[value="CORREGIR"]:checked) { border-color: #b25e09; }
  textarea { display: block; width: 100%; box-sizing: border-box; font: inherit; margin-top: .25rem; }
  table { width: 100%; border-collapse: collapse; font-size: .95rem; }
  th, td { text-align: left; padding: .3rem .5rem; border-bottom: 1px solid #e4e0d5; vertical-align: top; }
  thead th { background: #f1eee6; }
  .scroll { overflow-x: auto; }
  button { min-height: 2.75rem; padding: .5rem 1rem; border: 1px solid #2f6f4e; border-radius: 10px; background: #2f6f4e; color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
  #output { min-height: 6rem; font: .9rem ui-monospace, monospace; margin-top: .75rem; }
  :focus-visible { outline: 3px solid #0b57d0; outline-offset: 2px; }
</style>
</head>
<body>
<h1>Revisión de recetas</h1>
<div class="intro">
  <p>Las recetas de Menú a Mano son un borrador hasta que una persona las repasa. Esta página te las enseña una a una, con lo que la app calcula sola a partir de los ingredientes.</p>
  <p><strong>En cada receta, comprueba esto:</strong></p>
  <ol>
    <li>Los ingredientes de la lista son los mismos que nombran los pasos: no sobra ni falta ninguno.</li>
    <li>Las cantidades son razonables para las raciones indicadas.</li>
    <li>La dieta y los alérgenos del recuadro verde son los que esperas. Por ejemplo, un plato con huevo no puede salir como «Vegana», y uno con pasta tiene que llevar gluten.</li>
    <li>Los tiempos son realistas.</li>
  </ol>
  <p>Antes de las recetas está la tabla de ingredientes: es donde se decide qué alérgenos lleva cada cosa, así que conviene mirarla con calma una vez. Si dudas de alguno, compara con la etiqueta del producto que compras.</p>
  <p>Marca «Está bien» o «Hay que corregir algo» en cada una. Al terminar, pulsa «Copiar mi revisión» al final y pégame el texto en el chat. Se guarda en este navegador: puedes seguir otro día. <strong id="progress"></strong></p>
</div>

<h2>Ingredientes (${catalog.ingredients.size})</h2>
<section class="card" id="ingredientes">
  <div class="scroll">
    <table>
      <thead><tr><th scope="col">Ingrediente</th><th scope="col">Dieta más estricta que lo admite</th><th scope="col">Lleva</th><th scope="col">Puede llevar, según la marca</th></tr></thead>
      <tbody>${ingredientRows}
      </tbody>
    </table>
  </div>
  ${verdict('ingredientes', 'Están')}
</section>

<h2>Recetas (${catalog.recipes.length})</h2>
${recipeCards}

<div class="intro">
  <button type="button" id="copy">Copiar mi revisión</button> <span id="status" role="status"></span>
  <textarea id="output" readonly aria-label="Tu revisión, para copiarla a mano"></textarea>
</div>
<script>
  const KEY = 'menu-a-mano.revision';
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch {}
  const verdicts = [...document.querySelectorAll('.verdict')];
  const refresh = () => {
    const lines = [];
    for (const box of verdicts) {
      const chosen = box.querySelector('input:checked');
      if (!chosen) continue;
      const what = box.querySelector('textarea').value.trim().replace(/\\s+/g, ' ');
      lines.push(box.dataset.id + ' | ' + chosen.value + (chosen.value === 'CORREGIR' && what ? ': ' + what : ''));
    }
    document.getElementById('output').value = 'REVISIÓN DE RECETAS\\n' + lines.join('\\n');
    document.getElementById('progress').textContent = 'Llevas ' + lines.length + ' de ' + verdicts.length + '.';
  };
  const store = () => {
    try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch {}
    refresh();
  };
  for (const box of verdicts) {
    const id = box.dataset.id;
    const text = box.querySelector('textarea');
    text.value = saved[id]?.what ?? '';
    for (const input of box.querySelectorAll('input')) {
      if (saved[id]?.value === input.value) input.checked = true;
      input.addEventListener('change', () => {
        saved[id] = { value: input.value, what: text.value };
        store();
      });
    }
    text.addEventListener('input', () => {
      if (saved[id]) saved[id].what = text.value;
      store();
    });
  }
  document.getElementById('copy').addEventListener('click', async () => {
    const output = document.getElementById('output');
    try {
      await navigator.clipboard.writeText(output.value);
      document.getElementById('status').textContent = 'Copiado. Pégalo en el chat.';
    } catch {
      output.select();
      document.getElementById('status').textContent = 'Selecciona el texto de abajo y cópialo a mano.';
    }
  });
  refresh();
</script>
</body>
</html>
`;

const outDir = join(root, 'revision');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'recetas.html'), page, 'utf8');
console.log(`\nPágina generada: revision/recetas.html (${catalog.recipes.length} recetas, ${withHints} con algo que mirar).`);
