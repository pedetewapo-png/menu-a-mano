import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { parseRecipeFile, prepareImport, type RecipeFileContent } from '../../data/recipeFile';
import { getCustomIngredients, saveCustomIngredients, saveUserRecipe } from '../../data/repos';
import { deriveRecipeInfo, dietAllows } from '../../domain/catalog';
import { violations } from '../../domain/filters';
import { DIETS, isUserRecipe, MAX_USER_RECIPES, type CustomIngredient, type Diet, type Recipe } from '../../domain/types';
import { t } from '../../i18n';
import { Dialog } from '../components/Dialog';
import { RecipeImage } from '../components/RecipeImage';
import { capitalize, describeViolation, formatRecipeIngredient, normalize } from '../format';
import { useCatalog, useFavorites, usePreferences, useProfiles } from '../hooks';

const TIME_OPTIONS = [20, 30, 45];
type Origin = 'all' | 'catalog' | 'own' | 'imported';
const ORIGINS: Origin[] = ['all', 'catalog', 'own', 'imported'];

const originOf = (recipe: Recipe): Origin => (isUserRecipe(recipe) ? recipe.origin : 'catalog');

export function RecipesPage() {
  const catalog = useCatalog();
  const prefs = usePreferences();
  const profiles = useProfiles();
  const favorites = useFavorites();
  const fileInput = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [diet, setDiet] = useState<Diet | ''>('');
  const [maxMinutes, setMaxMinutes] = useState(0);
  const [origin, setOrigin] = useState<Origin>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [onlyCompatible, setOnlyCompatible] = useState(false);
  const [pendingImport, setPendingImport] = useState<RecipeFileContent | null>(null);
  const [message, setMessage] = useState('');

  if (!prefs || !profiles || !favorites) return <p>{t.common.loading}</p>;

  const userRecipeCount = catalog.recipes.filter(isUserRecipe).length;
  const needle = normalize(query.trim());
  const results = catalog.recipes
    .filter((r) => !r.retired)
    .map((recipe) => ({ recipe, info: catalog.derived.get(recipe.id)!, problems: violations(recipe, catalog, prefs) }))
    .filter(({ recipe, info, problems }) => {
      if (origin !== 'all' && originOf(recipe) !== origin) return false;
      if (diet && !dietAllows(diet, info.diet)) return false;
      if (maxMinutes && recipe.totalMinutes > maxMinutes) return false;
      if (onlyFavorites && !favorites.has(recipe.id)) return false;
      if (onlyCompatible && problems.length > 0) return false;
      if (!needle) return true;
      return (
        normalize(recipe.name).includes(needle) ||
        info.ingredientIds.some((id) => normalize(catalog.ingredients.get(id)!.name).includes(needle))
      );
    })
    .sort((a, b) => a.recipe.name.localeCompare(b.recipe.name, 'es'));

  const chooseFile = async (file: File) => {
    if (userRecipeCount >= MAX_USER_RECIPES) {
      setMessage(t.editor.limit(MAX_USER_RECIPES));
      return;
    }
    // Se valida el archivo entero antes de enseñar nada; nada se guarda hasta confirmar.
    const result = parseRecipeFile(await file.text(), catalog);
    if (result.ok) setPendingImport(result.content);
    else setMessage(t.recipeFile.error[result.reason]);
  };

  const confirmImport = async (content: RecipeFileContent) => {
    const prepared = prepareImport(content, await getCustomIngredients(), () => crypto.randomUUID(), new Date().toISOString());
    await saveCustomIngredients(prepared.newIngredients);
    await saveUserRecipe(prepared.recipe, prepared.photo);
    setPendingImport(null);
    setMessage(t.recipeFile.imported(prepared.recipe.name));
  };

  return (
    <>
      <header className="page-header">
        <h1>{t.recipes.title}</h1>
        <div className="toolbar">
          <Link className="button button-primary" to="/recetas/nueva">
            {t.recipes.new}
          </Link>
          <button type="button" className="button" onClick={() => fileInput.current?.click()}>
            {t.recipes.import}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void chooseFile(file);
            }}
          />
        </div>
      </header>
      <p role="status" aria-live="polite">
        {message}
      </p>

      <div className="filters">
        <div className="field">
          <label className="field-label" htmlFor="recipe-search">
            {t.recipes.search}
          </label>
          <input id="recipe-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="recipe-diet">
            {t.recipes.dietLabel}
          </label>
          <select id="recipe-diet" value={diet} onChange={(e) => setDiet(e.target.value as Diet | '')}>
            <option value="">{t.recipes.allDiets}</option>
            {DIETS.filter((d) => d !== 'omnivore').map((d) => (
              <option key={d} value={d}>
                {t.diet[d]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="recipe-time">
            {t.recipes.totalTime}
          </label>
          <select id="recipe-time" value={maxMinutes} onChange={(e) => setMaxMinutes(Number(e.target.value))}>
            <option value={0}>{t.recipes.anyTime}</option>
            {TIME_OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {t.recipes.upTo(minutes)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="recipe-origin">
            {t.recipes.origin}
          </label>
          <select id="recipe-origin" value={origin} onChange={(e) => setOrigin(e.target.value as Origin)}>
            {ORIGINS.map((option) => (
              <option key={option} value={option}>
                {t.recipes.origins[option]}
              </option>
            ))}
          </select>
        </div>
        <label className="choice">
          <input type="checkbox" checked={onlyFavorites} onChange={(e) => setOnlyFavorites(e.target.checked)} />
          <span>{t.recipes.onlyFavorites}</span>
        </label>
        <label className="choice">
          <input type="checkbox" checked={onlyCompatible} onChange={(e) => setOnlyCompatible(e.target.checked)} />
          <span>{t.recipes.onlyCompatible}</span>
        </label>
      </div>

      <p className="hint" role="status" aria-live="polite">
        {results.length === 0 ? t.recipes.none : t.recipes.count(results.length)}
      </p>

      <ul className="recipe-grid">
        {results.map(({ recipe, info, problems }) => (
          <li key={recipe.id} className="recipe-card">
            <RecipeImage recipe={recipe} size="thumb" />
            <div className="recipe-card-body">
              <Link className="recipe-card-name" to={`/recetas/${recipe.id}`}>
                {recipe.name}
              </Link>
              <p className="slot-meta">
                {recipe.totalMinutes > 0 && `${t.common.minutes(recipe.totalMinutes)} · `}
                {t.diet[info.diet]}
              </p>
              {isUserRecipe(recipe) && (
                <p className="tag">
                  {recipe.status === 'draft' ? t.recipes.tagDraft : recipe.origin === 'own' ? t.recipes.tagOwn : t.recipes.tagImported}
                </p>
              )}
              {favorites.has(recipe.id) && <p className="tag">{t.recipes.favorite}</p>}
              {problems.length > 0 && (
                <p className="tag tag-warn">
                  {t.recipes.notCompatible}: {describeViolation(problems[0]!, recipe, catalog, profiles)}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>

      {pendingImport && (
        <ImportDialog content={pendingImport} onConfirm={() => confirmImport(pendingImport)} onClose={() => setPendingImport(null)} />
      )}
    </>
  );
}

interface ImportDialogProps {
  content: RecipeFileContent;
  onConfirm: () => void;
  onClose: () => void;
}

/** Enseña la receta de un archivo, con sus alérgenos, antes de guardarla. */
function ImportDialog({ content, onConfirm, onClose }: ImportDialogProps) {
  const catalog = useCatalog();
  const { recipe } = content;
  const shipped = content.customIngredients as CustomIngredient[];
  // Los ingredientes del archivo mandan sobre los propios: son los que describen esta receta.
  const ingredients = new Map([...catalog.ingredients, ...shipped.map((i) => [i.id, i] as const)]);
  const info = deriveRecipeInfo({ id: recipe.name, ingredients: recipe.ingredients }, ingredients);

  return (
    <Dialog open onClose={onClose} title={t.recipeFile.importTitle}>
      <p className="hint">{t.recipeFile.review}</p>
      <h3>{recipe.name}</h3>
      {recipe.summary && <p>{recipe.summary}</p>}
      <p>
        {t.recipes.dietLabel}: <strong>{t.diet[info.diet]}</strong>
        <br />
        {t.recipes.allergens}:{' '}
        <strong>{info.allergens.length > 0 ? info.allergens.map((a) => t.allergen[a]).join(', ') : t.recipes.noAllergens}</strong>
      </p>

      <h3>{t.recipes.ingredients}</h3>
      <ul className="ingredient-list">
        {recipe.ingredients.map((item) => (
          <li key={item.ingredientId}>{formatRecipeIngredient(ingredients.get(item.ingredientId)!, item, 1)}</li>
        ))}
      </ul>

      {shipped.length > 0 && (
        <div className="callout" role="note">
          <h3 className="callout-title">{t.recipeFile.ownIngredients}</h3>
          <p className="hint">{t.recipeFile.ownIngredientsHint}</p>
          <ul>
            {shipped.map((ingredient) => (
              <li key={ingredient.id}>
                {capitalize(ingredient.name)}:{' '}
                {ingredient.allergens.length > 0
                  ? t.recipeFile.declaredAllergens(ingredient.allergens.map((a) => t.allergen[a].toLowerCase()).join(', '))
                  : t.recipeFile.noAllergens}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="actions">
        <button type="button" className="button" onClick={onClose}>
          {t.common.cancel}
        </button>
        <button type="button" className="button button-primary" onClick={onConfirm}>
          {t.recipeFile.confirm}
        </button>
      </div>
    </Dialog>
  );
}
