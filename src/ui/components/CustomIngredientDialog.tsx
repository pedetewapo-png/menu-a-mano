import { useId, useState } from 'react';
import {
  ALLERGENS,
  BASE_UNITS,
  DIETS,
  INGREDIENT_GROUPS,
  SHOP_SECTIONS,
  USER_ID_PREFIX,
  type CustomIngredient,
  type Diet,
} from '../../domain/types';
import { t } from '../../i18n';
import { Dialog } from './Dialog';

/** Ingrediente nuevo, todavía sin guardar. La dieta y los alérgenos no tienen valor por defecto: hay que elegirlos. */
export function createCustomIngredient(name: string): CustomIngredient {
  return {
    id: `${USER_ID_PREFIX}ing-${crypto.randomUUID()}`,
    name,
    section: 'other',
    baseUnit: 'g',
    diet: 'vegan',
    allergens: [],
    mayContain: [],
    groups: [],
    pantryStaple: false,
    custom: true,
  };
}

interface CustomIngredientDialogProps {
  ingredient: CustomIngredient;
  isNew: boolean;
  onSave: (ingredient: CustomIngredient) => void;
  onClose: () => void;
}

export function CustomIngredientDialog({ ingredient, isNew, onSave, onClose }: CustomIngredientDialogProps) {
  const [draft, setDraft] = useState(ingredient);
  // En un ingrediente nuevo nada está elegido: ni la dieta ni "ningún alérgeno" se dan por supuestos.
  const [diet, setDiet] = useState<Diet | null>(isNew ? null : ingredient.diet);
  const [noAllergens, setNoAllergens] = useState(!isNew && ingredient.allergens.length === 0);
  const [error, setError] = useState('');
  // Las calorías se escriben por 100 g, por 100 ml o por unidad, según cómo se compre.
  const [kcal, setKcal] = useState(ingredient.nutrition ? String(ingredient.nutrition.kcal) : '');
  const id = useId();

  const toggle = <T,>(list: T[], item: T, on: boolean) => (on ? [...list, item] : list.filter((x) => x !== item));

  const submit = () => {
    const name = draft.name.trim();
    if (!name || !diet) return;
    if (draft.allergens.length === 0 && !noAllergens) {
      setError(t.customIngredient.allergensRequired);
      return;
    }
    const value = Number(kcal);
    // Por unidad: se guarda como si la unidad pesara 100 g, y así el cálculo es el mismo para todo.
    const nutrition =
      kcal.trim() !== '' && value >= 0 ? { kcal: value, ...(draft.baseUnit === 'unit' ? { gramsPerUnit: 100 } : {}) } : undefined;
    onSave({ ...draft, name, diet, nutrition });
  };

  return (
    <Dialog open onClose={onClose} title={isNew ? t.customIngredient.newTitle : t.customIngredient.editTitle(ingredient.name)}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          // El formulario vive dentro del de la receta: su envío no debe guardar también la receta.
          event.stopPropagation();
          submit();
        }}
      >
        <p className="hint">{t.customIngredient.intro}</p>
        <div className="field">
          <label className="field-label" htmlFor={`${id}-name`}>
            {t.customIngredient.name}
          </label>
          <input
            id={`${id}-name`}
            value={draft.name}
            required
            maxLength={60}
            autoComplete="off"
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor={`${id}-section`}>
            {t.customIngredient.section}
          </label>
          <select
            id={`${id}-section`}
            value={draft.section}
            onChange={(e) => setDraft({ ...draft, section: e.target.value as CustomIngredient['section'] })}
          >
            {SHOP_SECTIONS.map((section) => (
              <option key={section} value={section}>
                {t.section[section]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor={`${id}-unit`}>
            {t.customIngredient.baseUnit}
          </label>
          <select
            id={`${id}-unit`}
            value={draft.baseUnit}
            // Cambiarla después dejaría sin sentido las cantidades de las recetas que ya lo usan.
            disabled={!isNew}
            onChange={(e) => setDraft({ ...draft, baseUnit: e.target.value as CustomIngredient['baseUnit'] })}
          >
            {BASE_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {t.customIngredient.baseUnits[unit]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor={`${id}-kcal`}>
            {t.calories.custom[draft.baseUnit]}
          </label>
          <input
            id={`${id}-kcal`}
            type="number"
            inputMode="decimal"
            min={0}
            max={900}
            step="any"
            value={kcal}
            onChange={(e) => setKcal(e.target.value)}
          />
          <p className="hint">{t.calories.customHint}</p>
        </div>
        <label className="choice">
          <input
            type="checkbox"
            checked={draft.pantryStaple}
            onChange={(e) => setDraft({ ...draft, pantryStaple: e.target.checked })}
          />
          <span>
            <strong>{t.customIngredient.pantry}</strong>
            <span className="hint"> {t.customIngredient.pantryHint}</span>
          </span>
        </label>

        <fieldset className="field">
          <legend>{t.customIngredient.diet}</legend>
          {[...DIETS].reverse().map((option) => (
            <label key={option} className="choice">
              <input type="radio" name={`${id}-diet`} required checked={diet === option} onChange={() => setDiet(option)} />
              <span>{t.customIngredient.diets[option]}</span>
            </label>
          ))}
        </fieldset>

        <fieldset className="field">
          <legend>{t.customIngredient.groups}</legend>
          <p className="hint">{t.customIngredient.groupsHint}</p>
          <div className="check-grid">
            {INGREDIENT_GROUPS.map((group) => (
              <label key={group} className="choice">
                <input
                  type="checkbox"
                  checked={draft.groups.includes(group)}
                  onChange={(e) => setDraft({ ...draft, groups: toggle(draft.groups, group, e.target.checked) })}
                />
                <span>{t.group[group]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend>{t.customIngredient.allergens}</legend>
          <p className="hint">{t.customIngredient.allergensHint}</p>
          <div className="check-grid">
            {ALLERGENS.map((allergen) => (
              <label key={allergen} className="choice">
                <input
                  type="checkbox"
                  checked={draft.allergens.includes(allergen)}
                  onChange={(e) => {
                    setDraft({ ...draft, allergens: toggle(draft.allergens, allergen, e.target.checked) });
                    if (e.target.checked) setNoAllergens(false);
                    setError('');
                  }}
                />
                <span>{t.allergen[allergen]}</span>
              </label>
            ))}
          </div>
          <label className="choice">
            <input
              type="checkbox"
              checked={noAllergens}
              onChange={(e) => {
                setNoAllergens(e.target.checked);
                if (e.target.checked) setDraft({ ...draft, allergens: [] });
                setError('');
              }}
            />
            <strong>{t.customIngredient.none}</strong>
          </label>
          <p className="form-error" role="alert">
            {error}
          </p>
        </fieldset>

        <div className="actions">
          <button type="button" className="button" onClick={onClose}>
            {t.common.cancel}
          </button>
          <button type="submit" className="button button-primary">
            {t.customIngredient.save}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
