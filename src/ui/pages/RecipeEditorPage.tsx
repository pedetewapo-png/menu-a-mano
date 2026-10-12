import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { countUserRecipes, saveCustomIngredients, saveUserRecipe } from '../../data/repos';
import { deriveRecipeInfo } from '../../domain/catalog';
import {
  isUserRecipe,
  MAIN_GROUPS,
  MAX_RECIPE_STEPS,
  MAX_SERVINGS,
  MAX_USER_RECIPES,
  MEAL_TYPES,
  MIN_SERVINGS,
  RECIPE_NAME_MAX_LENGTH,
  RECIPE_UNITS,
  USER_ID_PREFIX,
  type CustomIngredient,
  type Ingredient,
  type MainGroup,
  type RecipeIngredient,
  type RecipeUnit,
  type UserRecipe,
} from '../../domain/types';
import { isUsableUnit } from '../../domain/units';
import { missingForReady } from '../../domain/userRecipes';
import { t } from '../../i18n';
import { createCustomIngredient, CustomIngredientDialog } from '../components/CustomIngredientDialog';
import { Stepper } from '../components/Stepper';
import { capitalize, normalize } from '../format';
import { useCatalog } from '../hooks';
import { processPhoto, type ProcessedPhoto } from '../photo';

function createRecipe(): UserRecipe {
  return {
    id: `${USER_ID_PREFIX}${crypto.randomUUID()}`,
    name: '',
    summary: '',
    mealTypes: ['lunch', 'dinner'],
    baseServings: 2,
    totalMinutes: 0,
    activeMinutes: 0,
    cost: 2,
    mainGroup: 'vegetables',
    cuisine: 'other',
    ingredients: [],
    steps: [''],
    source: { author: t.editor.ownAuthor, license: t.editor.ownLicense },
    origin: 'own',
    status: 'draft',
    includeInPlanner: true,
    updatedAt: '',
  };
}

export function RecipeEditorPage() {
  const { recipeId } = useParams();
  const catalog = useCatalog();
  const count = useLiveQuery(() => countUserRecipes(), []);
  const existing = recipeId ? catalog.recipeById.get(recipeId) : undefined;

  if (count === undefined) return <p>{t.common.loading}</p>;
  if (recipeId && (!existing || !isUserRecipe(existing))) {
    return (
      <>
        <p>{t.editor.notFound}</p>
        <Link to="/recetas">{t.recipes.backToList}</Link>
      </>
    );
  }
  if (!recipeId && count >= MAX_USER_RECIPES) {
    return (
      <>
        <p>{t.editor.limit(MAX_USER_RECIPES)}</p>
        <Link to="/recetas">{t.recipes.backToList}</Link>
      </>
    );
  }
  // La clave reinicia el formulario al pasar de una receta a otra.
  return <RecipeEditor key={recipeId ?? 'new'} initial={(existing as UserRecipe | undefined) ?? createRecipe()} isNew={!recipeId} />;
}

/** undefined = sin cambios; null = quitar la foto. */
type PhotoChange = ProcessedPhoto | null | undefined;

function RecipeEditor({ initial, isNew }: { initial: UserRecipe; isNew: boolean }) {
  const catalog = useCatalog();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<UserRecipe>({ ...initial, steps: initial.steps.length > 0 ? initial.steps : [''] });
  const [photo, setPhoto] = useState<PhotoChange>(undefined);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [editingIngredient, setEditingIngredient] = useState<{ ingredient: CustomIngredient; isNew: boolean } | null>(null);
  // Ingredientes recién creados: se usan ya, sin esperar a que el catálogo se recargue.
  const [created, setCreated] = useState<ReadonlyMap<string, Ingredient>>(new Map());
  const nameRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const ingredients = new Map([...catalog.ingredients, ...created]);
  const set = (patch: Partial<UserRecipe>) => setRecipe((current) => ({ ...current, ...patch }));
  const setItem = (index: number, patch: Partial<RecipeIngredient>) =>
    set({ ingredients: recipe.ingredients.map((item, i) => (i === index ? { ...item, ...patch } : item)) });
  const setSteps = (steps: string[]) => set({ steps });

  const addIngredient = (ingredient: Ingredient) => {
    // Los básicos de despensa suelen ir "al gusto"; el resto, en su unidad de compra.
    const unit: RecipeUnit = ingredient.pantryStaple ? 'toTaste' : ingredient.baseUnit;
    set({ ingredients: [...recipe.ingredients, { ingredientId: ingredient.id, quantity: null, unit }] });
    setQuery('');
  };

  const needle = normalize(query.trim());
  const used = new Set(recipe.ingredients.map((item) => item.ingredientId));
  const matches = needle
    ? [...ingredients.values()]
        .filter((i) => !used.has(i.id) && normalize(i.name).includes(needle))
        .sort((a, b) => a.name.localeCompare(b.name, 'es'))
        .slice(0, 8)
    : [];

  // Solo se calcula con ingredientes que existen; un borrador puede no tener ninguno.
  const known = recipe.ingredients.filter((item) => ingredients.has(item.ingredientId));
  const info = deriveRecipeInfo({ id: recipe.id, ingredients: known }, ingredients);
  const missing = missingForReady(recipe);

  const choosePhoto = async (file: File) => {
    try {
      setPhoto(await processPhoto(file));
      setMessage('');
    } catch {
      setMessage(t.editor.photoError);
    }
  };
  const thumb = photo === undefined ? recipe.photoThumb : photo?.thumb;

  const save = async () => {
    const name = recipe.name.trim();
    if (!name) {
      setMessage(t.editor.nameRequired);
      nameRef.current?.focus();
      return;
    }
    const clean: UserRecipe = {
      ...recipe,
      name,
      summary: recipe.summary.trim(),
      notes: recipe.notes?.trim() || undefined,
      steps: recipe.steps.map((step) => step.trim()).filter(Boolean),
      ingredients: recipe.ingredients.map((item) => ({
        ...item,
        quantity: item.unit === 'toTaste' ? null : item.quantity,
        note: item.note?.trim() || undefined,
      })),
      // El tiempo activo no puede superar al total; si no se indica, se toma el total.
      activeMinutes: Math.min(recipe.activeMinutes || recipe.totalMinutes, recipe.totalMinutes),
      photoThumb: thumb,
      updatedAt: new Date().toISOString(),
    };
    const status = missingForReady(clean).length === 0 ? 'ready' : 'draft';
    await saveUserRecipe({ ...clean, status }, photo === undefined ? undefined : (photo?.full ?? null));
    navigate(`/recetas/${clean.id}`, { replace: true });
  };

  return (
    <>
      <form
        className="editor"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        // Intro en un campo de una línea no debe guardar la receta a medias.
        onKeyDown={(event) => {
          if (event.key === 'Enter' && event.target instanceof HTMLInputElement) event.preventDefault();
        }}
      >
        <p>
          <Link to={isNew ? '/recetas' : `/recetas/${recipe.id}`}>← {t.common.back}</Link>
        </p>
        <h1>{isNew ? t.editor.newTitle : t.editor.editTitle(initial.name)}</h1>
        <p className="form-error" role="alert">
          {message}
        </p>

        <section className="card" aria-labelledby="editor-basics">
          <h2 id="editor-basics">{t.editor.basics}</h2>
          <div className="field">
            <label className="field-label" htmlFor="recipe-name">
              {t.editor.name}
            </label>
            <input
              id="recipe-name"
              ref={nameRef}
              className="input-wide"
              value={recipe.name}
              maxLength={RECIPE_NAME_MAX_LENGTH}
              autoComplete="off"
              onChange={(e) => set({ name: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="recipe-summary">
              {t.editor.summary}
            </label>
            <input
              id="recipe-summary"
              className="input-wide"
              value={recipe.summary}
              maxLength={200}
              onChange={(e) => set({ summary: e.target.value })}
            />
          </div>
          <fieldset className="field">
            <legend>{t.editor.mealTypes}</legend>
            <div className="toolbar">
              {MEAL_TYPES.map((mealType) => (
                <label key={mealType} className="choice">
                  <input
                    type="checkbox"
                    checked={recipe.mealTypes.includes(mealType)}
                    onChange={(e) =>
                      set({
                        mealTypes: MEAL_TYPES.filter((m) => (m === mealType ? e.target.checked : recipe.mealTypes.includes(m))),
                      })
                    }
                  />
                  <span>{t.meal[mealType]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="field">
            <span className="field-label">{t.editor.servings}</span>
            <Stepper
              value={recipe.baseServings}
              min={MIN_SERVINGS}
              max={MAX_SERVINGS}
              unitLabel={t.editor.servingsUnit}
              onChange={(baseServings) => set({ baseServings })}
            />
          </div>
          <div className="toolbar editor-row">
            <div className="field">
              <label className="field-label" htmlFor="recipe-total">
                {t.editor.totalMinutes}
              </label>
              <input
                id="recipe-total"
                type="number"
                inputMode="numeric"
                min={0}
                max={1440}
                value={recipe.totalMinutes || ''}
                onChange={(e) => set({ totalMinutes: Math.max(0, Math.round(Number(e.target.value)) || 0) })}
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="recipe-active">
                {t.editor.activeMinutes}
              </label>
              <input
                id="recipe-active"
                type="number"
                inputMode="numeric"
                min={0}
                max={1440}
                value={recipe.activeMinutes || ''}
                onChange={(e) => set({ activeMinutes: Math.max(0, Math.round(Number(e.target.value)) || 0) })}
              />
            </div>
          </div>
          <div className="toolbar editor-row">
            <div className="field">
              <label className="field-label" htmlFor="recipe-group">
                {t.editor.mainGroup}
              </label>
              <select id="recipe-group" value={recipe.mainGroup} onChange={(e) => set({ mainGroup: e.target.value as MainGroup })}>
                {MAIN_GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {t.mainGroup[group]}
                  </option>
                ))}
              </select>
              <p className="hint">{t.editor.mainGroupHint}</p>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="recipe-cost">
                {t.editor.cost}
              </label>
              <select id="recipe-cost" value={recipe.cost} onChange={(e) => set({ cost: Number(e.target.value) as 1 | 2 | 3 })}>
                {[1, 2, 3].map((cost) => (
                  <option key={cost} value={cost}>
                    {t.editor.costs[cost]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="card" aria-labelledby="editor-ingredients">
          <h2 id="editor-ingredients">{t.editor.ingredients}</h2>
          {recipe.ingredients.length === 0 && <p className="hint">{t.editor.ingredientEmpty}</p>}
          <ul className="editor-ingredients">
            {recipe.ingredients.map((item, index) => {
              const ingredient = ingredients.get(item.ingredientId);
              if (!ingredient) return null;
              const name = capitalize(ingredient.name);
              return (
                <li key={item.ingredientId} className="editor-ingredient">
                  <p className="editor-ingredient-name">
                    <strong>{name}</strong>
                    {ingredient.custom && <span className="hint"> · {t.editor.ownIngredient}</span>}
                  </p>
                  <input
                    className="input-number"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    aria-label={t.editor.quantityOf(ingredient.name)}
                    placeholder={t.editor.quantity}
                    disabled={item.unit === 'toTaste'}
                    value={item.unit === 'toTaste' ? '' : (item.quantity ?? '')}
                    onChange={(e) => setItem(index, { quantity: Number(e.target.value) > 0 ? Number(e.target.value) : null })}
                  />
                  <select
                    aria-label={t.editor.unitOf(ingredient.name)}
                    value={item.unit}
                    onChange={(e) => setItem(index, { unit: e.target.value as RecipeUnit })}
                  >
                    {RECIPE_UNITS.filter((unit) => isUsableUnit(ingredient, unit)).map((unit) => (
                      <option key={unit} value={unit}>
                        {t.editor.units[unit]}
                      </option>
                    ))}
                  </select>
                  <input
                    className="editor-note"
                    aria-label={t.editor.noteOf(ingredient.name)}
                    placeholder={t.editor.notePlaceholder}
                    maxLength={80}
                    value={item.note ?? ''}
                    onChange={(e) => setItem(index, { note: e.target.value })}
                  />
                  <label className="choice">
                    <input
                      type="checkbox"
                      aria-label={t.editor.optionalOf(name)}
                      checked={item.optional ?? false}
                      onChange={(e) => setItem(index, { optional: e.target.checked || undefined })}
                    />
                    <span>{t.editor.optional}</span>
                  </label>
                  <div className="toolbar">
                    {ingredient.custom && (
                      <button
                        type="button"
                        className="button button-small button-quiet"
                        aria-label={t.editor.editIngredient(ingredient.name)}
                        onClick={() => setEditingIngredient({ ingredient: ingredient as CustomIngredient, isNew: false })}
                      >
                        {t.recipes.edit}
                      </button>
                    )}
                    <button
                      type="button"
                      className="button button-small button-quiet"
                      aria-label={t.editor.removeIngredient(ingredient.name)}
                      onClick={() => set({ ingredients: recipe.ingredients.filter((_, i) => i !== index) })}
                    >
                      {t.profiles.remove}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="field">
            <label className="field-label" htmlFor="ingredient-search">
              {t.editor.ingredientSearch}
            </label>
            <input
              id="ingredient-search"
              type="search"
              value={query}
              autoComplete="off"
              onChange={(e) => setQuery(e.target.value)}
            />
            {needle && (
              <ul className="option-list" aria-live="polite">
                {matches.map((ingredient) => (
                  <li key={ingredient.id}>
                    <button
                      type="button"
                      className="button"
                      aria-label={t.editor.ingredientAdd(ingredient.name)}
                      onClick={() => addIngredient(ingredient)}
                    >
                      {capitalize(ingredient.name)}
                    </button>
                  </li>
                ))}
                {matches.length === 0 && <li className="hint">{t.editor.ingredientNone}</li>}
                <li>
                  <button
                    type="button"
                    className="button button-quiet"
                    onClick={() => setEditingIngredient({ ingredient: createCustomIngredient(query.trim()), isNew: true })}
                  >
                    {t.editor.ingredientCreate(query.trim())}
                  </button>
                </li>
              </ul>
            )}
          </div>

          <div className="callout" role="note">
            <h3 className="callout-title">{t.editor.computed}</h3>
            <p>
              {t.recipes.dietLabel}: <strong>{t.diet[info.diet]}</strong>
              {' · '}
              {t.recipes.allergens}:{' '}
              <strong>{info.allergens.length > 0 ? info.allergens.map((a) => t.allergen[a]).join(', ') : t.recipes.noAllergens}</strong>
            </p>
            <p className="hint">{t.editor.computedHint}</p>
          </div>
        </section>

        <section className="card" aria-labelledby="editor-steps">
          <h2 id="editor-steps">{t.editor.steps}</h2>
          <ol className="editor-steps">
            {recipe.steps.map((step, index) => (
              <li key={index}>
                <textarea
                  aria-label={t.editor.stepLabel(index + 1)}
                  value={step}
                  rows={2}
                  maxLength={600}
                  onChange={(e) => setSteps(recipe.steps.map((s, i) => (i === index ? e.target.value : s)))}
                />
                <div className="toolbar">
                  <button
                    type="button"
                    className="button button-small button-quiet"
                    aria-label={t.editor.moveStepUp(index + 1)}
                    disabled={index === 0}
                    onClick={() => setSteps(recipe.steps.map((s, i, all) => (i === index - 1 ? step : i === index ? all[index - 1]! : s)))}
                  >
                    {t.editor.up}
                  </button>
                  <button
                    type="button"
                    className="button button-small button-quiet"
                    aria-label={t.editor.moveStepDown(index + 1)}
                    disabled={index === recipe.steps.length - 1}
                    onClick={() => setSteps(recipe.steps.map((s, i, all) => (i === index + 1 ? step : i === index ? all[index + 1]! : s)))}
                  >
                    {t.editor.down}
                  </button>
                  <button
                    type="button"
                    className="button button-small button-quiet"
                    aria-label={t.editor.removeStep(index + 1)}
                    disabled={recipe.steps.length === 1}
                    onClick={() => setSteps(recipe.steps.filter((_, i) => i !== index))}
                  >
                    {t.profiles.remove}
                  </button>
                </div>
              </li>
            ))}
          </ol>
          {recipe.steps.length < MAX_RECIPE_STEPS && (
            <button type="button" className="button" onClick={() => setSteps([...recipe.steps, ''])}>
              {t.editor.addStep}
            </button>
          )}
          <div className="field editor-notes">
            <label className="field-label" htmlFor="recipe-notes">
              {t.editor.notes}
            </label>
            <textarea id="recipe-notes" rows={2} maxLength={600} value={recipe.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} />
          </div>
        </section>

        <section className="card" aria-labelledby="editor-photo">
          <h2 id="editor-photo">{t.editor.photo}</h2>
          <p className="hint">{t.editor.photoHint}</p>
          {thumb && <img className="editor-photo" src={thumb} alt={t.editor.photoAlt} width={320} height={240} />}
          <div className="toolbar">
            <button type="button" className="button" onClick={() => fileRef.current?.click()}>
              {t.editor.photoChoose}
            </button>
            {thumb && (
              <button type="button" className="button button-quiet" onClick={() => setPhoto(null)}>
                {t.editor.photoRemove}
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void choosePhoto(file);
              }}
            />
          </div>
        </section>

        <section className="card" aria-labelledby="editor-options">
          <h2 id="editor-options">{t.editor.options}</h2>
          <label className="choice">
            <input type="checkbox" checked={recipe.includeInPlanner} onChange={(e) => set({ includeInPlanner: e.target.checked })} />
            <span>
              <strong>{t.editor.includeInPlanner}</strong>
              <span className="hint"> {t.editor.includeInPlannerHint}</span>
            </span>
          </label>
        </section>

        <div className="callout" role="status" aria-live="polite">
          {missing.length === 0 ? (
            <p>{t.editor.readyNotice}</p>
          ) : (
            <>
              <p>
                {t.editor.missingTitle} {missing.map((field) => t.editor.missing[field]).join('; ')}.
              </p>
              <p className="hint">{t.editor.draftNotice}</p>
            </>
          )}
        </div>
        <div className="actions">
          <Link className="button" to={isNew ? '/recetas' : `/recetas/${recipe.id}`}>
            {t.common.cancel}
          </Link>
          <button type="submit" className="button button-primary">
            {missing.length === 0 ? t.editor.save : t.editor.saveDraft}
          </button>
        </div>
      </form>

      {editingIngredient && (
        <CustomIngredientDialog
          key={editingIngredient.ingredient.id}
          ingredient={editingIngredient.ingredient}
          isNew={editingIngredient.isNew}
          onClose={() => setEditingIngredient(null)}
          onSave={async (ingredient) => {
            await saveCustomIngredients([ingredient]);
            setCreated((current) => new Map(current).set(ingredient.id, ingredient));
            if (editingIngredient.isNew) addIngredient(ingredient);
            setEditingIngredient(null);
          }}
        />
      )}
    </>
  );
}
