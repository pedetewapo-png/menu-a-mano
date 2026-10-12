// Busca en Wikimedia Commons fotos candidatas para cada receta y genera una página
// (revision/fotos.html) para elegirlas. No descarga ninguna imagen: la página
// enseña las miniaturas directamente desde Commons. Uso: npm run photos:propose
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const catalogDir = join(root, 'catalog');
const outDir = join(root, 'revision');
const API = 'https://commons.wikimedia.org/w/api.php';
const USER_AGENT = 'MenuAMano/0.5 (https://github.com/pedetewapo-png/menu-a-mano)';
const PER_RECIPE = 6;
const MIN_WIDTH = 1200;

// Licencias admitidas (especificación v1 §13.3): dominio público, CC0, CC BY y CC BY-SA.
// Quedan fuera las que prohíben modificar (ND) o el uso comercial (NC).
const ALLOWED = /^(cc0|public domain|pd\b|cc[ -]by(-sa)?[ -]\d)/i;
const FORBIDDEN = /\b(nc|nd)\b/i;

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const recipes = readdirSync(join(catalogDir, 'recipes'))
  .filter((name) => name.endsWith('.json'))
  .map((name) => readJson(join(catalogDir, 'recipes', name)));
const ingredientNames = new Map(readJson(join(catalogDir, 'ingredients.json')).map((i) => [i.id, i.name]));
const { queries, exclude } = readJson(join(catalogDir, 'photo-queries.json'));
const EXCLUDED = new RegExp(exclude.join('|'), 'i');

const text = (html) => (html ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function search(query) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrnamespace: '6',
    gsrlimit: '20',
    gsrsearch: `${query} filetype:bitmap`,
    prop: 'imageinfo',
    iiprop: 'url|size|mime|extmetadata',
    iiurlwidth: '480',
  });
  const response = await fetch(`${API}?${params}`, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(`Commons respondió ${response.status}`);
  const pages = Object.values((await response.json()).query?.pages ?? {});
  return pages
    .sort((a, b) => a.index - b.index)
    .map((page) => {
      const info = page.imageinfo?.[0];
      const meta = info?.extmetadata ?? {};
      return {
        title: page.title,
        pageUrl: info?.descriptionurl,
        thumbUrl: info?.thumburl,
        originalUrl: info?.url,
        width: info?.width,
        height: info?.height,
        mime: info?.mime,
        license: text(meta.LicenseShortName?.value),
        licenseUrl: meta.LicenseUrl?.value,
        author: text(meta.Artist?.value).slice(0, 80) || 'Autor no indicado',
        description: text(meta.ImageDescription?.value).slice(0, 160),
      };
    })
    .filter(
      (c) =>
        c.mime === 'image/jpeg' &&
        c.width >= MIN_WIDTH &&
        // Apaisada o casi: se va a recortar a 4:3.
        c.width >= c.height &&
        ALLOWED.test(c.license) &&
        !FORBIDDEN.test(c.license) &&
        !EXCLUDED.test(c.title),
    );
}

const result = {};
for (const recipe of recipes) {
  const lists = [];
  for (const query of queries[recipe.id] ?? [recipe.name]) {
    try {
      lists.push(await search(query));
    } catch (error) {
      console.error(`${recipe.id}: ${error.message}`);
    }
    await sleep(150);
  }
  // Se alternan las búsquedas para que las candidatas no salgan todas de la misma.
  const found = new Map();
  for (let i = 0; found.size < PER_RECIPE && lists.some((list) => i < list.length); i++) {
    for (const list of lists) {
      const candidate = list[i];
      if (candidate && found.size < PER_RECIPE && !found.has(candidate.title)) found.set(candidate.title, candidate);
    }
  }
  result[recipe.id] = {
    name: recipe.name,
    ingredients: recipe.ingredients.map((i) => ingredientNames.get(i.ingredientId) ?? i.ingredientId),
    candidates: [...found.values()],
  };
  console.log(`${String(found.size).padStart(2)} candidatas  ${recipe.id}`);
}

writeFileSync(join(catalogDir, 'photo-candidates.json'), JSON.stringify(result, null, 2) + '\n', 'utf8');

const escape = (value) =>
  String(value ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const fileName = (title) => title.replace(/^File:/, '').replace(/\.[a-z]+$/i, '');

const sections = Object.entries(result)
  .sort((a, b) => a[1].name.localeCompare(b[1].name, 'es'))
  .map(([id, { name, ingredients, candidates }]) => {
    const options = candidates
      .map(
        (c, index) => `
        <label class="option">
          <input type="radio" name="${escape(id)}" value="${escape(c.title)}">
          <img src="${escape(c.thumbUrl)}" alt="Foto ${index + 1} para ${escape(name)}" loading="lazy" width="240" height="180">
          <span class="meta">
            <strong>Foto ${index + 1}</strong>
            <span class="title">${escape(fileName(c.title))}</span>
            ${escape(c.author)} · <a href="${escape(c.licenseUrl || c.pageUrl)}" target="_blank" rel="noreferrer">${escape(c.license)}</a><br>
            <a href="${escape(c.pageUrl)}" target="_blank" rel="noreferrer">Verla en grande</a>
          </span>
        </label>`,
      )
      .join('');
    return `
    <fieldset id="${escape(id)}">
      <legend>${escape(name)}</legend>
      <p class="recipe">La receta lleva: ${escape(ingredients.join(', '))}.</p>
      ${candidates.length === 0 ? '<p class="none">No he encontrado ninguna foto con licencia abierta. Habrá que usar una foto propia.</p>' : ''}
      <div class="options">${options}
        <label class="option option-none">
          <input type="radio" name="${escape(id)}" value="">
          <span class="meta"><strong>Ninguna</strong>Ninguna de estas me vale.</span>
        </label>
      </div>
    </fieldset>`;
  })
  .join('');

const page = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fotos propuestas · Menú a Mano</title>
<style>
  body { font-family: system-ui, sans-serif; line-height: 1.5; margin: 0 auto; max-width: 70rem; padding: 1rem; background: #faf8f3; color: #1f2a24; }
  h1 { margin-bottom: .25rem; }
  .intro { background: #fff; border: 1px solid #cfcabd; border-radius: 10px; padding: 1rem 1.25rem; }
  fieldset { margin: 1.5rem 0; padding: 1rem; background: #fff; border: 1px solid #cfcabd; border-radius: 10px; }
  legend { font-weight: 700; font-size: 1.15rem; padding: 0 .5rem; }
  .recipe { margin: 0 0 .75rem; color: #56645c; }
  .options { display: grid; grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr)); gap: 1rem; }
  .option { display: grid; gap: .35rem; padding: .6rem; border: 2px solid #cfcabd; border-radius: 10px; cursor: pointer; align-content: start; }
  .option:has(input:checked) { border-color: #2f6f4e; background: #eef6f1; }
  .option img { width: 100%; height: auto; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 6px; background: #f1eee6; }
  .option input { width: 1.25rem; height: 1.25rem; accent-color: #2f6f4e; }
  .meta { font-size: .9rem; color: #56645c; overflow-wrap: anywhere; }
  .meta strong { display: block; color: #1f2a24; }
  .meta .title { display: block; font-style: italic; }
  .option-none { border-style: dashed; }
  .none { color: #9a3f12; }
  .bar { border-top: 1px solid #cfcabd; padding: 1rem 0; }
  button { min-height: 2.75rem; padding: .5rem 1rem; border: 1px solid #2f6f4e; border-radius: 10px; background: #2f6f4e; color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
  textarea { width: 100%; box-sizing: border-box; min-height: 5rem; margin-top: .75rem; font: .9rem ui-monospace, monospace; }
  a { color: #2f6f4e; }
  :focus-visible { outline: 3px solid #0b57d0; outline-offset: 2px; }
</style>
</head>
<body>
<h1>Fotos propuestas</h1>
<div class="intro">
  <p>Estas son las fotos con licencia abierta que he encontrado en Wikimedia Commons para cada receta. <strong>Todavía no se ha descargado ninguna.</strong> Las ha encontrado un buscador, así que algunas no tendrán nada que ver con el plato: para eso está «Ninguna».</p>
  <ol>
    <li>En cada receta, elige la foto que mejor represente el plato, o «Ninguna».</li>
    <li>Fíjate en que <strong>no se vean ingredientes que la receta no lleva</strong>, sobre todo alérgenos (queso, huevo, frutos secos, marisco…). Debajo de cada nombre tienes lo que lleva la receta.</li>
    <li>Al terminar, pulsa «Copiar mi selección» al final de la página y pégame el texto en el chat.</li>
  </ol>
  <p>Tu selección se guarda en este navegador: puedes cerrar la página y seguir otro día. <strong id="progress"></strong></p>
</div>
${sections}
<div class="bar">
  <button type="button" id="copy">Copiar mi selección</button> <span id="status" role="status"></span>
  <textarea id="output" readonly aria-label="Tu selección, para copiarla a mano"></textarea>
</div>
<script>
  const KEY = 'menu-a-mano.fotos';
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch {}
  const groups = [...document.querySelectorAll('fieldset')];
  const refresh = () => {
    const lines = [];
    for (const group of groups) {
      const chosen = group.querySelector('input:checked');
      if (chosen) lines.push(group.id + ' | ' + (chosen.value || 'NINGUNA'));
    }
    document.getElementById('output').value = 'FOTOS ELEGIDAS\\n' + lines.join('\\n');
    document.getElementById('progress').textContent = 'Llevas ' + lines.length + ' de ' + groups.length + '.';
  };
  for (const group of groups) {
    for (const input of group.querySelectorAll('input')) {
      if (saved[group.id] === input.value) input.checked = true;
      input.addEventListener('change', () => {
        saved[group.id] = input.value;
        try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch {}
        refresh();
      });
    }
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
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'fotos.html'), page, 'utf8');

const withNone = Object.values(result).filter((r) => r.candidates.length === 0).length;
console.log(`\nPágina generada: revision/fotos.html (${recipes.length} recetas, ${withNone} sin candidatas).`);
