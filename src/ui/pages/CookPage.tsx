import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { catalog } from '../../data/catalog';
import { MAX_SERVINGS, MIN_SERVINGS } from '../../domain/types';
import { t } from '../../i18n';
import { formatRecipeIngredient } from '../format';
import { usePreferences, useWakeLock } from '../hooks';

/**
 * Modo cocina: la receta a pantalla completa, un paso cada vez y con texto grande,
 * para seguirla con las manos ocupadas. Paso 0 = ingredientes; después, los pasos;
 * al final, una pantalla de cierre.
 */
export function CookPage() {
  const { recipeId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const prefs = usePreferences();
  const [step, setStep] = useState(0);
  const [gathered, setGathered] = useState<ReadonlySet<string>>(new Set());
  const headingRef = useRef<HTMLHeadingElement>(null);
  useWakeLock();

  const recipe = recipeId ? catalog.recipeById.get(recipeId) : undefined;
  const lastStep = (recipe?.steps.length ?? 0) + 1;

  // Al cambiar de paso el foco va al título, para que el lector de pantalla lo anuncie.
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  // Las flechas del teclado pasan de paso, salvo que se esté marcando un ingrediente.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === 'ArrowRight') setStep((s) => Math.min(s + 1, lastStep));
      if (event.key === 'ArrowLeft') setStep((s) => Math.max(s - 1, 0));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lastStep]);

  if (!prefs) return <p className="loading">{t.common.loading}</p>;
  if (!recipe) {
    return (
      <main className="cook">
        <p>{t.cook.notFound}</p>
        <Link className="button" to="/menu">
          {t.cook.exit}
        </Link>
      </main>
    );
  }

  const requested = Number(params.get('c'));
  const servings = Number.isInteger(requested) && requested >= MIN_SERVINGS && requested <= MAX_SERVINGS ? requested : prefs.servings;
  const factor = servings / recipe.baseServings;
  const total = recipe.steps.length;
  // Vuelve a donde se estaba; si se abrió directamente, al detalle de la receta.
  const exit = () => (window.history.length > 1 ? navigate(-1) : navigate(`/recetas/${recipe.id}`));

  const toggle = (ingredientId: string) =>
    setGathered((current) => {
      const next = new Set(current);
      if (next.has(ingredientId)) next.delete(ingredientId);
      else next.add(ingredientId);
      return next;
    });

  return (
    <main className="cook" aria-label={t.cook.title(recipe.name)}>
      <header className="cook-header">
        <p className="cook-recipe">{recipe.name}</p>
        <button type="button" className="button" onClick={exit}>
          {t.cook.exit}
        </button>
      </header>

      {step === 0 && (
        <section className="cook-body">
          <h1 ref={headingRef} tabIndex={-1}>
            {t.cook.ingredientsTitle}
          </h1>
          <p className="hint">
            {t.cook.ingredientsHint} {t.cook.servings(servings)}
          </p>
          <ul className="cook-ingredients">
            {recipe.ingredients.map((item) => (
              <li key={item.ingredientId}>
                <label className="choice">
                  <input type="checkbox" checked={gathered.has(item.ingredientId)} onChange={() => toggle(item.ingredientId)} />
                  <span>{formatRecipeIngredient(catalog.ingredients.get(item.ingredientId)!, item, factor)}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}

      {step >= 1 && step <= total && (
        <section className="cook-body">
          <h1 ref={headingRef} tabIndex={-1} className="cook-progress">
            {t.cook.step(step, total)}
          </h1>
          <progress className="cook-bar" value={step} max={total} aria-hidden="true" />
          <p className="cook-step">{recipe.steps[step - 1]}</p>
        </section>
      )}

      {step === lastStep && (
        <section className="cook-body cook-done">
          <h1 ref={headingRef} tabIndex={-1}>
            {t.cook.doneTitle}
          </h1>
          <p className="cook-step">{t.cook.doneText}</p>
        </section>
      )}

      <footer className="cook-footer">
        {step === 0 && (
          <button type="button" className="button button-primary button-large" onClick={() => setStep(1)}>
            {t.cook.start}
          </button>
        )}
        {step >= 1 && step <= total && (
          <>
            <button type="button" className="button button-large" onClick={() => setStep(step - 1)}>
              {step === 1 ? t.cook.backToIngredients : t.cook.previous}
            </button>
            <button type="button" className="button button-primary button-large" onClick={() => setStep(step + 1)}>
              {step === total ? t.cook.finish : t.cook.next}
            </button>
          </>
        )}
        {step === lastStep && (
          <>
            <button type="button" className="button button-large" onClick={() => setStep(1)}>
              {t.cook.again}
            </button>
            <button type="button" className="button button-primary button-large" onClick={exit}>
              {t.cook.exit}
            </button>
          </>
        )}
      </footer>
    </main>
  );
}
