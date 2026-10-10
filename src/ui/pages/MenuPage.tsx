import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { catalog } from '../../data/catalog';
import { addSavedPlan, deleteSavedPlan, listSavedPlans } from '../../data/repos';
import { violations } from '../../domain/filters';
import { emptyPlan, hardCandidates, type PlannerNotice } from '../../domain/planner';
import { MAX_SERVINGS, MIN_SERVINGS, type MealSlot, type Preferences, type WeekPlan } from '../../domain/types';
import { addDays, mondayOf } from '../../domain/week';
import { t } from '../../i18n';
import { Dialog } from '../components/Dialog';
import { RecipeImage } from '../components/RecipeImage';
import { Stepper } from '../components/Stepper';
import { describeNotice, formatDayNumber, formatWeekRange, normalize } from '../format';
import { useFavorites, usePreferences, useWeek, useWeekPlan } from '../hooks';
import { applySavedPlan, generateWeek, moveSlot, patchSlot, replaceSlot } from '../planActions';

interface Feedback {
  weekStart: string;
  notices: PlannerNotice[];
  message?: string;
}

export function MenuPage() {
  const { weekStart, setWeekStart } = useWeek();
  const prefs = usePreferences();
  const favorites = useFavorites();
  const loaded = useWeekPlan(weekStart);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const [savedOpen, setSavedOpen] = useState(false);
  // Platos ya rechazados en cada franja durante esta sesión, para no volver a proponerlos.
  const rejected = useRef(new Map<string, string[]>());

  if (!prefs || !favorites || !loaded) return <p>{t.common.loading}</p>;

  const plan = loaded.plan ?? emptyPlan(weekStart, prefs);
  const hasRecipes = plan.slots.some((s) => s.recipeId);
  const current = feedback?.weekStart === weekStart ? feedback : null;
  const say = (message: string, notices: PlannerNotice[] = []) => setFeedback({ weekStart, notices, message });

  const generate = async () => {
    const manual = plan.slots.some((s) => s.recipeId && s.origin === 'manual' && !s.locked);
    if (manual && !window.confirm(t.menu.confirmRegenerate)) return;
    rejected.current.clear();
    say(t.menu.generated, await generateWeek(weekStart, prefs, favorites));
  };

  const change = async (index: number) => {
    const key = `${weekStart}:${index}`;
    const before = plan.slots[index]?.recipeId;
    const list = [...(rejected.current.get(key) ?? []), ...(before ? [before] : [])];
    rejected.current.set(key, list);
    const recipeId = await replaceSlot(weekStart, prefs, favorites, index, list);
    say(recipeId ? t.menu.changed(catalog.recipeById.get(recipeId)!.name) : t.menu.noAlternatives);
  };

  return (
    <>
      <header className="page-header">
        <div>
          <h1>{t.menu.title}</h1>
          <p className="week-range">{t.menu.weekOf(formatWeekRange(weekStart))}</p>
        </div>
        <div className="toolbar">
          <button type="button" className="button" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            ← {t.menu.previousWeek}
          </button>
          {weekStart !== mondayOf(new Date()) && (
            <button type="button" className="button" onClick={() => setWeekStart(mondayOf(new Date()))}>
              {t.menu.thisWeek}
            </button>
          )}
          <button type="button" className="button" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            {t.menu.nextWeek} →
          </button>
        </div>
      </header>

      <div className="toolbar">
        <button type="button" className="button button-primary" onClick={generate}>
          {hasRecipes ? t.menu.regenerate : t.menu.generate}
        </button>
        <button type="button" className="button" onClick={() => setSavedOpen(true)}>
          {t.menu.saved}
        </button>
        {hasRecipes && (
          <Link className="button" to="/compra">
            {t.menu.goShopping}
          </Link>
        )}
        {hasRecipes && <span className="hint">{t.menu.regenerateHint}</span>}
      </div>

      <div className="status" role="status" aria-live="polite">
        {current?.message && <p>{current.message}</p>}
        {current && current.notices.length > 0 && (
          <div className="callout">
            <h2 className="callout-title">{t.menu.noticesTitle}</h2>
            <ul>
              {current.notices.map((notice) => (
                <li key={notice.kind}>{describeNotice(notice)}</li>
              ))}
            </ul>
            <Link to="/ajustes">{t.menu.reviewPrefs}</Link>
          </div>
        )}
      </div>

      {!hasRecipes && (
        <div className="empty">
          <h2>{t.menu.emptyTitle}</h2>
          <p>{t.menu.emptyText}</p>
        </div>
      )}

      <ol className="week">
        {t.days.map((dayName, day) => (
          <li key={dayName} className="day">
            <h2 className="day-title">
              {dayName} <span className="day-number">{formatDayNumber(weekStart, day)}</span>
            </h2>
            <ul className="day-slots">
              {plan.slots
                .map((slot, index) => ({ slot, index }))
                .filter(({ slot }) => slot.day === day)
                .map(({ slot, index }) => (
                  <SlotCard
                    key={index}
                    slot={slot}
                    prefs={prefs}
                    dayName={dayName}
                    onChange={() => change(index)}
                    onToggleLock={() => patchSlot(weekStart, prefs, index, { locked: !slot.locked })}
                    onMore={() => setOpenSlot(index)}
                  />
                ))}
            </ul>
          </li>
        ))}
      </ol>

      <SlotDialog
        index={openSlot}
        plan={plan}
        prefs={prefs}
        onClose={() => setOpenSlot(null)}
        onChoose={() => {
          setPickerSlot(openSlot);
          setOpenSlot(null);
        }}
      />
      <RecipePicker index={pickerSlot} plan={plan} prefs={prefs} onClose={() => setPickerSlot(null)} />
      <SavedPlansDialog
        open={savedOpen}
        plan={plan}
        prefs={prefs}
        onClose={() => setSavedOpen(false)}
        onApplied={(message) => {
          setSavedOpen(false);
          say(message);
        }}
      />
    </>
  );
}

interface SlotCardProps {
  slot: MealSlot;
  prefs: Preferences;
  dayName: string;
  onChange: () => void;
  onToggleLock: () => void;
  onMore: () => void;
}

function SlotCard({ slot, prefs, dayName, onChange, onToggleLock, onMore }: SlotCardProps) {
  const recipe = slot.recipeId ? catalog.recipeById.get(slot.recipeId) : undefined;
  const mealName = t.meal[slot.mealType];
  const broken = recipe ? violations(recipe, catalog, prefs).length > 0 : false;

  return (
    <li className={`slot${slot.active ? '' : ' slot-off'}`}>
      <p className="slot-meal">{mealName}</p>
      {!slot.active && <p className="slot-placeholder">{t.menu.notPlanned}</p>}
      {slot.active && !slot.recipeId && <p className="slot-placeholder">{t.menu.emptySlot}</p>}
      {slot.active && slot.recipeId && !recipe && <p className="tag tag-warn">{t.menu.missingRecipe}</p>}
      {slot.active && recipe && (
        <>
          <RecipeImage recipe={recipe} size="thumb" />
          <Link className="slot-name" to={`/recetas/${recipe.id}`}>
            {recipe.name}
          </Link>
          <p className="slot-meta">
            {t.common.minutes(recipe.totalMinutes)}
            {slot.servingsOverride !== undefined && ` · ${t.common.servings(slot.servingsOverride)}`}
          </p>
          {slot.locked && <p className="tag">{t.menu.locked}</p>}
          {broken && <p className="tag tag-warn">{t.menu.violates}</p>}
        </>
      )}
      <div className="slot-actions">
        {slot.active && !slot.locked && (
          <button
            type="button"
            className="button button-small"
            aria-label={recipe ? t.menu.changeFor(recipe.name) : undefined}
            onClick={onChange}
          >
            {t.menu.change}
          </button>
        )}
        {slot.active && recipe && (
          <button
            type="button"
            className="button button-small"
            aria-label={slot.locked ? t.menu.unlockFor(recipe.name) : t.menu.lockFor(recipe.name)}
            onClick={onToggleLock}
          >
            {slot.locked ? t.menu.unlock : t.menu.lock}
          </button>
        )}
        <button type="button" className="button button-small" aria-label={t.menu.moreFor(dayName, mealName)} onClick={onMore}>
          {t.menu.more}
        </button>
      </div>
    </li>
  );
}

interface SlotDialogProps {
  index: number | null;
  plan: WeekPlan;
  prefs: Preferences;
  onClose: () => void;
  onChoose: () => void;
}

function SlotDialog({ index, plan, prefs, onClose, onChoose }: SlotDialogProps) {
  const slot = index === null ? undefined : plan.slots[index];
  const [target, setTarget] = useState('');
  if (index === null || !slot) return <Dialog open={false} onClose={onClose} title="" children={null} />;

  const title = `${t.days[slot.day]} · ${t.meal[slot.mealType]}`;
  const recipe = slot.recipeId ? catalog.recipeById.get(slot.recipeId) : undefined;
  const patch = (change: Partial<MealSlot>) => patchSlot(plan.weekStart, prefs, index, change);

  return (
    <Dialog open onClose={onClose} title={title}>
      <label className="choice">
        <input type="checkbox" checked={slot.active} onChange={(e) => patch({ active: e.target.checked })} />
        <span>{t.menu.plan}</span>
      </label>

      {slot.active && (
        <div className="stack">
          {recipe && (
            <p>
              <strong>{recipe.name}</strong> ·{' '}
              <Link to={`/recetas/${recipe.id}`} onClick={onClose}>
                {t.menu.viewRecipe}
              </Link>
            </p>
          )}
          <div className="toolbar">
            <button type="button" className="button" onClick={onChoose}>
              {t.menu.choose}
            </button>
            {slot.recipeId && (
              <button type="button" className="button" onClick={() => patch({ recipeId: null })}>
                {t.menu.clear}
              </button>
            )}
          </div>

          {slot.recipeId && (
            <>
              <div className="field">
                <span className="field-label">{t.menu.slotServings}</span>
                <div className="toolbar">
                  <Stepper
                    value={slot.servingsOverride ?? prefs.servings}
                    min={MIN_SERVINGS}
                    max={MAX_SERVINGS}
                    unitLabel={t.prefs.servingsUnit}
                    onChange={(servingsOverride) => patch({ servingsOverride })}
                  />
                  {slot.servingsOverride !== undefined && (
                    <button type="button" className="button button-quiet" onClick={() => patch({ servingsOverride: undefined })}>
                      {t.menu.useDefaultServings}
                    </button>
                  )}
                </div>
              </div>

              <div className="field">
                <label className="field-label" htmlFor="move-target">
                  {t.menu.moveTo}
                </label>
                <p className="hint">{t.menu.moveHint}</p>
                <div className="toolbar">
                  <select id="move-target" value={target} onChange={(e) => setTarget(e.target.value)}>
                    <option value="">—</option>
                    {plan.slots.map((other, i) =>
                      i === index ? null : (
                        <option key={i} value={i}>
                          {t.days[other.day]} · {t.meal[other.mealType]}
                        </option>
                      ),
                    )}
                  </select>
                  <button
                    type="button"
                    className="button"
                    disabled={target === ''}
                    onClick={async () => {
                      await moveSlot(plan.weekStart, prefs, index, Number(target));
                      setTarget('');
                      onClose();
                    }}
                  >
                    {t.menu.move}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </Dialog>
  );
}

interface RecipePickerProps {
  index: number | null;
  plan: WeekPlan;
  prefs: Preferences;
  onClose: () => void;
}

function RecipePicker({ index, plan, prefs, onClose }: RecipePickerProps) {
  const [query, setQuery] = useState('');
  const slot = index === null ? undefined : plan.slots[index];
  if (index === null || !slot) return <Dialog open={false} onClose={onClose} title="" children={null} />;

  const needle = normalize(query.trim());
  const inMenu = new Set(plan.slots.map((s) => s.recipeId));
  const options = hardCandidates(catalog, prefs, slot.mealType).filter((r) => normalize(r.name).includes(needle));
  const close = () => {
    setQuery('');
    onClose();
  };

  return (
    <Dialog open onClose={close} title={t.menu.pickerTitle(t.days[slot.day]!, t.meal[slot.mealType])}>
      <label className="field-label" htmlFor="picker-search">
        {t.menu.pickerSearch}
      </label>
      <input id="picker-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
      {options.length === 0 ? (
        <p className="hint">{t.menu.pickerEmpty}</p>
      ) : (
        <ul className="picker-list">
          {options.map((recipe) => (
            <li key={recipe.id}>
              <button
                type="button"
                className="picker-option"
                onClick={async () => {
                  await patchSlot(plan.weekStart, prefs, index, { recipeId: recipe.id, origin: 'manual', active: true });
                  close();
                }}
              >
                <span>{recipe.name}</span>
                <span className="hint">
                  {t.common.minutes(recipe.totalMinutes)}
                  {inMenu.has(recipe.id) && ` · ${t.menu.inMenu}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}

interface SavedPlansDialogProps {
  open: boolean;
  plan: WeekPlan;
  prefs: Preferences;
  onClose: () => void;
  onApplied: (message: string) => void;
}

function SavedPlansDialog({ open, plan, prefs, onClose, onApplied }: SavedPlansDialogProps) {
  const saved = useLiveQuery(() => listSavedPlans(), []);
  const [name, setName] = useState('');
  const hasRecipes = plan.slots.some((s) => s.recipeId);

  return (
    <Dialog open={open} onClose={onClose} title={t.menu.saved}>
      {hasRecipes && (
        <form
          className="field"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!name.trim()) return;
            await addSavedPlan(name.trim(), plan);
            setName('');
          }}
        >
          <label className="field-label" htmlFor="saved-name">
            {t.menu.saveName}
          </label>
          <div className="toolbar">
            <input id="saved-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
            <button type="submit" className="button button-primary">
              {t.menu.saveCurrent}
            </button>
          </div>
        </form>
      )}
      {saved && saved.length === 0 && <p className="hint">{t.menu.savedEmpty}</p>}
      <ul className="picker-list">
        {saved?.map((item) => (
          <li key={item.id} className="saved-row">
            <span>{item.name}</span>
            <span className="toolbar">
              <button
                type="button"
                className="button button-small"
                onClick={async () => {
                  if (hasRecipes && !window.confirm(t.menu.confirmApply)) return;
                  const skipped = await applySavedPlan(plan.weekStart, prefs, item);
                  onApplied(skipped > 0 ? t.menu.appliedSkipped(skipped) : t.menu.applied);
                }}
              >
                {t.menu.apply}
              </button>
              <button
                type="button"
                className="button button-small button-quiet"
                aria-label={`${t.common.delete}: ${item.name}`}
                onClick={() => deleteSavedPlan(item.id)}
              >
                {t.common.delete}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
