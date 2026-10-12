import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { catalog } from '../../data/catalog';
import { toggleFavorite } from '../../data/repos';
import { violations } from '../../domain/filters';
import { slotIndex } from '../../domain/planner';
import { MAX_SERVINGS, MEAL_TYPES, MIN_SERVINGS, type MealType } from '../../domain/types';
import { t } from '../../i18n';
import { RecipeImage } from '../components/RecipeImage';
import { Stepper } from '../components/Stepper';
import { describeViolation, formatRecipeIngredient } from '../format';
import { useFavorites, usePreferences, useProfiles, useWeek } from '../hooks';
import { patchSlot } from '../planActions';

export function RecipeDetailPage() {
  const { recipeId } = useParams();
  const prefs = usePreferences();
  const profiles = useProfiles();
  const favorites = useFavorites();
  const { weekStart } = useWeek();
  const [servings, setServings] = useState<number | null>(null);
  const [day, setDay] = useState(0);
  const [mealType, setMealType] = useState<MealType | null>(null);
  const [message, setMessage] = useState('');

  if (!prefs || !profiles || !favorites) return <p>{t.common.loading}</p>;
  const recipe = recipeId ? catalog.recipeById.get(recipeId) : undefined;
  if (!recipe) {
    return (
      <>
        <p>{t.recipes.notFound}</p>
        <Link to="/recetas">{t.recipes.backToList}</Link>
      </>
    );
  }

  const info = catalog.derived.get(recipe.id)!;
  const shownServings = servings ?? prefs.servings;
  const factor = shownServings / recipe.baseServings;
  const isFavorite = favorites.has(recipe.id);
  const problems = violations(recipe, catalog, prefs);
  const chosenMeal = mealType ?? recipe.mealTypes[0]!;

  const addToMenu = async () => {
    await patchSlot(weekStart, prefs, slotIndex(day, chosenMeal), {
      recipeId: recipe.id,
      origin: 'manual',
      active: true,
      locked: false,
    });
    setMessage(t.recipes.added(t.days[day]!, t.meal[chosenMeal]));
  };

  return (
    <article className="recipe">
      <p>
        <Link to="/recetas">← {t.recipes.backToList}</Link>
      </p>
      <div className="recipe-top">
        <figure className="recipe-figure">
          <RecipeImage recipe={recipe} size="detail" />
          <figcaption className="hint">
            {recipe.image ? (
              <>
                {t.recipes.photo(recipe.image.author, recipe.image.license)}
                {recipe.image.sourceUrl && (
                  <>
                    {' · '}
                    <a href={recipe.image.sourceUrl} target="_blank" rel="noreferrer">
                      {recipe.image.title ?? recipe.image.sourceUrl}
                    </a>
                  </>
                )}
              </>
            ) : (
              t.recipes.noPhoto
            )}
          </figcaption>
        </figure>
        <div className="stack">
          <h1>{recipe.name}</h1>
          <p>{recipe.summary}</p>
          <dl className="facts">
            <div>
              <dt>{t.recipes.totalTime}</dt>
              <dd>{t.common.minutes(recipe.totalMinutes)}</dd>
            </div>
            <div>
              <dt>{t.recipes.activeTime}</dt>
              <dd>{t.common.minutes(recipe.activeMinutes)}</dd>
            </div>
            <div>
              <dt>{t.recipes.dietLabel}</dt>
              <dd>{t.diet[info.diet]}</dd>
            </div>
            <div>
              <dt>{t.recipes.suits}</dt>
              <dd>{recipe.mealTypes.map((m) => t.meal[m]).join(', ')}</dd>
            </div>
          </dl>
          {problems.length > 0 && (
            <p className="callout" role="note">
              {t.recipes.notCompatible}: {problems.map((p) => describeViolation(p, recipe, catalog, profiles)).join('; ')}.
            </p>
          )}
          <div className="toolbar">
            <Link className="button button-primary" to={`/cocinar/${recipe.id}?c=${shownServings}`}>
              {t.menu.cook}
            </Link>
            <button type="button" className="button" aria-pressed={isFavorite} onClick={() => toggleFavorite(recipe.id)}>
              {isFavorite ? t.recipes.removeFavorite : t.recipes.addFavorite}
            </button>
          </div>
        </div>
      </div>

      <div className="recipe-columns">
        <section aria-labelledby="ingredients-title">
          <h2 id="ingredients-title">{t.recipes.ingredients}</h2>
          <div className="toolbar">
            <span className="field-label">{t.prefs.servings}</span>
            <Stepper
              value={shownServings}
              min={MIN_SERVINGS}
              max={MAX_SERVINGS}
              unitLabel={t.prefs.servingsUnit}
              onChange={setServings}
            />
          </div>
          <ul className="ingredient-list">
            {recipe.ingredients.map((item) => (
              <li key={item.ingredientId}>
                {formatRecipeIngredient(catalog.ingredients.get(item.ingredientId)!, item, factor)}
              </li>
            ))}
          </ul>
          <h3>{t.recipes.allergens}</h3>
          <p>{info.allergens.length > 0 ? info.allergens.map((a) => t.allergen[a]).join(', ') : t.recipes.noAllergens}</p>
          <p className="hint">{t.notices.allergens}</p>
        </section>

        <section aria-labelledby="steps-title">
          <h2 id="steps-title">{t.recipes.steps}</h2>
          <ol className="step-list">
            {recipe.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          {recipe.notes && (
            <>
              <h3>{t.recipes.notes}</h3>
              <p>{recipe.notes}</p>
            </>
          )}
        </section>
      </div>

      <section className="card" aria-labelledby="add-title">
        <h2 id="add-title">{t.recipes.addToMenu}</h2>
        {problems.length > 0 ? (
          <p>{t.recipes.addToMenuDisabled(describeViolation(problems[0]!, recipe, catalog, profiles))}</p>
        ) : (
          <div className="toolbar">
            <select aria-label={t.prefs.dayColumn} value={day} onChange={(e) => setDay(Number(e.target.value))}>
              {t.days.map((name, index) => (
                <option key={name} value={index}>
                  {name}
                </option>
              ))}
            </select>
            <select aria-label={t.recipes.suits} value={chosenMeal} onChange={(e) => setMealType(e.target.value as MealType)}>
              {MEAL_TYPES.filter((m) => recipe.mealTypes.includes(m)).map((m) => (
                <option key={m} value={m}>
                  {t.meal[m]}
                </option>
              ))}
            </select>
            <button type="button" className="button button-primary" onClick={addToMenu}>
              {t.recipes.addToMenu}
            </button>
          </div>
        )}
        <p role="status" aria-live="polite">
          {message}
        </p>
      </section>

      <p className="hint">{t.recipes.source(recipe.source.author, recipe.source.license)}</p>
    </article>
  );
}
