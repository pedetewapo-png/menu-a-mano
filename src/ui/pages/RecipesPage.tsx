import { useState } from 'react';
import { Link } from 'react-router-dom';
import { catalog } from '../../data/catalog';
import { dietAllows } from '../../domain/catalog';
import { violations } from '../../domain/filters';
import { DIETS, type Diet } from '../../domain/types';
import { t } from '../../i18n';
import { RecipeImage } from '../components/RecipeImage';
import { describeViolation, normalize } from '../format';
import { useFavorites, usePreferences } from '../hooks';

const TIME_OPTIONS = [20, 30, 45];

export function RecipesPage() {
  const prefs = usePreferences();
  const favorites = useFavorites();
  const [query, setQuery] = useState('');
  const [diet, setDiet] = useState<Diet | ''>('');
  const [maxMinutes, setMaxMinutes] = useState(0);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [onlyCompatible, setOnlyCompatible] = useState(false);

  if (!prefs || !favorites) return <p>{t.common.loading}</p>;

  const needle = normalize(query.trim());
  const results = catalog.recipes
    .filter((r) => !r.retired)
    .map((recipe) => ({ recipe, info: catalog.derived.get(recipe.id)!, problems: violations(recipe, catalog, prefs) }))
    .filter(({ recipe, info, problems }) => {
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

  return (
    <>
      <header className="page-header">
        <h1>{t.recipes.title}</h1>
      </header>
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
                {t.common.minutes(recipe.totalMinutes)} · {t.diet[info.diet]}
              </p>
              {favorites.has(recipe.id) && <p className="tag">{t.recipes.favorite}</p>}
              {problems.length > 0 && (
                <p className="tag tag-warn">
                  {t.recipes.notCompatible}: {describeViolation(problems[0]!, catalog)}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
