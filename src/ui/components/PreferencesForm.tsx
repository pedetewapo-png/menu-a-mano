import { useId, useState } from 'react';
import { catalog } from '../../data/catalog';
import { hardCandidates } from '../../domain/planner';
import {
  ALLERGENS,
  breakfastsEnabled,
  DIETS,
  INGREDIENT_GROUPS,
  MAX_HABITUAL_BREAKFASTS,
  MAX_SERVINGS,
  MEAL_TYPES,
  MIN_SERVINGS,
  type IngredientGroup,
  type Preferences,
} from '../../domain/types';
import { t } from '../../i18n';
import { capitalize, normalize } from '../format';
import { Stepper } from './Stepper';

interface SectionProps {
  value: Preferences;
  onChange: (patch: Partial<Preferences>) => void;
}

const TIME_OPTIONS = [20, 30, 45, 60];

export function DietSection({ value, onChange }: SectionProps) {
  const name = useId();
  return (
    <>
      <fieldset className="field">
        <legend>{t.prefs.diet}</legend>
        {DIETS.map((diet) => (
          <label key={diet} className="choice">
            <input type="radio" name={name} checked={value.diet === diet} onChange={() => onChange({ diet })} />
            <span>
              <strong>{t.diet[diet]}</strong>
              <span className="hint"> {t.dietHint[diet]}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="field">
        <span className="field-label">{t.prefs.servings}</span>
        <p className="hint">{t.prefs.servingsHint}</p>
        <Stepper
          value={value.servings}
          min={MIN_SERVINGS}
          max={MAX_SERVINGS}
          unitLabel={t.prefs.servingsUnit}
          onChange={(servings) => onChange({ servings })}
        />
      </div>
    </>
  );
}

type ExclusionOption = { kind: 'group'; id: IngredientGroup; label: string } | { kind: 'ingredient'; id: string; label: string };

function ExclusionPicker({ value, onChange }: SectionProps) {
  const inputId = useId();
  const [query, setQuery] = useState('');

  const usedGroups = new Set(catalog.recipes.flatMap((r) => catalog.derived.get(r.id)!.groups));
  const all: ExclusionOption[] = [
    ...INGREDIENT_GROUPS.filter((g) => usedGroups.has(g)).map((id) => ({ kind: 'group' as const, id, label: t.group[id] })),
    ...[...catalog.ingredients.values()]
      .filter((i) => !i.pantryStaple)
      .map((i) => ({ kind: 'ingredient' as const, id: i.id, label: capitalize(i.name) }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es')),
  ];
  const isSelected = (o: ExclusionOption) =>
    o.kind === 'group' ? value.excludedGroups.includes(o.id) : value.excludedIngredientIds.includes(o.id);
  const toggle = (o: ExclusionOption) => {
    if (o.kind === 'group') {
      const next = isSelected(o) ? value.excludedGroups.filter((g) => g !== o.id) : [...value.excludedGroups, o.id];
      onChange({ excludedGroups: next });
    } else {
      const next = isSelected(o)
        ? value.excludedIngredientIds.filter((i) => i !== o.id)
        : [...value.excludedIngredientIds, o.id];
      onChange({ excludedIngredientIds: next });
    }
  };

  const needle = normalize(query.trim());
  const matches = needle ? all.filter((o) => !isSelected(o) && normalize(o.label).includes(needle)).slice(0, 8) : [];
  const selected = all.filter(isSelected);

  return (
    <div className="field">
      <label className="field-label" htmlFor={inputId}>
        {t.prefs.excluded}
      </label>
      <p className="hint">{t.prefs.excludedHint}</p>
      <input
        id={inputId}
        type="search"
        value={query}
        placeholder={t.prefs.excludedSearch}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
      />
      {needle && (
        <ul className="option-list" aria-live="polite">
          {matches.length === 0 && <li className="hint">{t.prefs.excludedNoMatch}</li>}
          {matches.map((o) => (
            <li key={`${o.kind}-${o.id}`}>
              <button
                type="button"
                className="button"
                onClick={() => {
                  toggle(o);
                  setQuery('');
                }}
              >
                {t.common.add} «{o.label}»{o.kind === 'group' && <span className="hint"> ({t.prefs.groupTag})</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected.length === 0 ? (
        <p className="hint">{t.prefs.excludedNone}</p>
      ) : (
        <ul className="chips">
          {selected.map((o) => (
            <li key={`${o.kind}-${o.id}`} className="chip">
              {o.label}
              <button type="button" className="chip-remove" aria-label={t.common.remove(o.label)} onClick={() => toggle(o)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AvoidSection({ value, onChange }: SectionProps) {
  return (
    <>
      <ExclusionPicker value={value} onChange={onChange} />
      <fieldset className="field">
        <legend>{t.prefs.allergens}</legend>
        <div className="check-grid">
          {ALLERGENS.map((allergen) => (
            <label key={allergen} className="choice">
              <input
                type="checkbox"
                checked={value.excludedAllergens.includes(allergen)}
                onChange={(e) =>
                  onChange({
                    excludedAllergens: e.target.checked
                      ? [...value.excludedAllergens, allergen]
                      : value.excludedAllergens.filter((a) => a !== allergen),
                  })
                }
              />
              <span>{t.allergen[allergen]}</span>
            </label>
          ))}
        </div>
        {value.excludedAllergens.length > 0 && (
          <p className="callout" role="note">
            {t.notices.allergens}
          </p>
        )}
      </fieldset>
    </>
  );
}

function BreakfastPicker({ value, onChange }: SectionProps) {
  const chosen = value.habitualBreakfastIds;
  const compatible = hardCandidates(catalog, value, 'breakfast');
  // Los ya elegidos se muestran siempre, aunque hayan dejado de cumplir, para poder quitarlos.
  const stale = chosen
    .filter((id) => !compatible.some((r) => r.id === id))
    .flatMap((id) => catalog.recipeById.get(id) ?? []);
  const options = [...compatible, ...stale].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const full = chosen.length >= MAX_HABITUAL_BREAKFASTS;

  return (
    <fieldset className="field">
      <legend>{t.prefs.breakfasts}</legend>
      <p className="hint">{t.prefs.breakfastsHint(MAX_HABITUAL_BREAKFASTS)}</p>
      {options.length === 0 && <p className="hint">{t.prefs.breakfastsNone}</p>}
      {options.map((recipe) => {
        const checked = chosen.includes(recipe.id);
        return (
          <label key={recipe.id} className="choice">
            <input
              type="checkbox"
              checked={checked}
              disabled={!checked && full}
              onChange={(e) =>
                onChange({
                  habitualBreakfastIds: e.target.checked ? [...chosen, recipe.id] : chosen.filter((id) => id !== recipe.id),
                })
              }
            />
            <span>
              {recipe.name}
              <span className="hint">
                {' '}
                {t.common.minutes(recipe.totalMinutes)}
                {stale.includes(recipe) && ` · ${t.prefs.breakfastNoLongerFits}`}
              </span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

export function WeekSection({ value, onChange }: SectionProps) {
  const timeId = useId();
  // La columna de desayunos solo tiene sentido cuando el menú los incluye.
  const meals = MEAL_TYPES.map((mealType, meal) => ({ mealType, meal })).filter(
    ({ mealType }) => mealType !== 'breakfast' || breakfastsEnabled(value),
  );
  const toggleSlot = (day: number, meal: number, active: boolean) =>
    onChange({
      activeSlots: value.activeSlots.map((row, d) => (d === day ? row.map((v, m) => (m === meal ? active : v)) : row)),
    });

  return (
    <>
      <div className="field">
        <label className="field-label" htmlFor={timeId}>
          {t.prefs.maxTime}
        </label>
        <select
          id={timeId}
          value={value.maxTotalMinutes ?? ''}
          onChange={(e) => onChange({ maxTotalMinutes: e.target.value ? Number(e.target.value) : null })}
        >
          <option value="">{t.prefs.noLimit}</option>
          {TIME_OPTIONS.map((minutes) => (
            <option key={minutes} value={minutes}>
              {t.common.minutes(minutes)}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label className="choice">
          <input type="checkbox" checked={value.preferBudget} onChange={(e) => onChange({ preferBudget: e.target.checked })} />
          <span>
            <strong>{t.prefs.budget}</strong>
            <span className="hint"> {t.prefs.budgetHint}</span>
          </span>
        </label>
      </div>
      <fieldset className="field">
        <legend>{t.prefs.slots}</legend>
        <p className="hint">{t.prefs.slotsHint}</p>
        <table className="slot-table">
          <thead>
            <tr>
              <th scope="col">{t.prefs.dayColumn}</th>
              {meals.map(({ mealType }) => (
                <th key={mealType} scope="col">
                  {t.meal[mealType]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.days.map((dayName, day) => (
              <tr key={dayName}>
                <th scope="row">
                  {/* Nombre corto para que la tabla quepa en un móvil; las casillas llevan el nombre completo. */}
                  <abbr title={dayName}>{t.daysShort[day]}</abbr>
                </th>
                {meals.map(({ mealType, meal }) => (
                  <td key={mealType}>
                    <input
                      type="checkbox"
                      aria-label={t.prefs.slotLabel(dayName, t.meal[mealType])}
                      checked={value.activeSlots[day]?.[meal] ?? true}
                      onChange={(e) => toggleSlot(day, meal, e.target.checked)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </fieldset>
      <BreakfastPicker value={value} onChange={onChange} />
    </>
  );
}
