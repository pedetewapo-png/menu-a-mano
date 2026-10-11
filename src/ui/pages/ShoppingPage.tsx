import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { catalog } from '../../data/catalog';
import { db } from '../../data/db';
import { emptyShoppingState, updateShoppingState } from '../../data/repos';
import { buildShoppingList, type ShoppingItem } from '../../domain/shopping';
import { breakfastsEnabled, SHOP_SECTIONS, type ShoppingListState } from '../../domain/types';
import { t } from '../../i18n';
import { formatBaseQuantity, formatWeekRange, shoppingItemName, shoppingItemQuantity } from '../format';
import { usePending, usePreferences, useWakeLock, useWeek, useWeekPlan } from '../hooks';

export function ShoppingPage() {
  const { weekStart } = useWeek();
  const prefs = usePreferences();
  const loaded = useWeekPlan(weekStart);
  const [stored, showState] = usePending(
    useLiveQuery(async () => ({ state: await db.shoppingLists.get(weekStart) }), [weekStart]),
  );
  const [text, setText] = useState('');
  const [message, setMessage] = useState('');
  // En el supermercado la pantalla no debe apagarse entre un artículo y el siguiente.
  useWakeLock();

  if (!prefs || !loaded || !stored) return <p>{t.common.loading}</p>;

  const state = stored.state ?? emptyShoppingState(weekStart);
  const items = loaded.plan ? buildShoppingList(loaded.plan, catalog, prefs.servings, breakfastsEnabled(prefs)) : [];
  const update = (change: (s: ShoppingListState) => ShoppingListState) => {
    // Se muestra ya el resultado; la casilla no espera a que termine el guardado.
    showState({ state: change(state) });
    return updateShoppingState(weekStart, change);
  };

  // Un artículo cuenta como comprado solo si su cantidad no ha cambiado desde que se marcó.
  const isChecked = (item: ShoppingItem) => state.checked[item.ingredientId]?.quantityWhenChecked === item.quantity;
  const wasUpdated = (item: ShoppingItem) => item.ingredientId in state.checked && !isChecked(item);
  const have = new Set(state.alreadyHave);

  const toBuy = items.filter((i) => !i.pantry && !have.has(i.ingredientId));
  const pantry = items.filter((i) => i.pantry && !have.has(i.ingredientId));
  const atHome = items.filter((i) => have.has(i.ingredientId));
  const total = toBuy.length + state.manualItems.length;
  const done = toBuy.filter(isChecked).length + state.manualItems.filter((m) => m.checked).length;

  const toggleChecked = (item: ShoppingItem, checked: boolean) =>
    update((s) => {
      const next = { ...s.checked };
      if (checked) next[item.ingredientId] = { quantityWhenChecked: item.quantity };
      else delete next[item.ingredientId];
      return { ...s, checked: next };
    });
  const setHave = (ingredientId: string, value: boolean) =>
    update((s) => ({
      ...s,
      alreadyHave: value ? [...s.alreadyHave, ingredientId] : s.alreadyHave.filter((id) => id !== ingredientId),
    }));

  const copy = async () => {
    const lines: string[] = [];
    for (const section of SHOP_SECTIONS) {
      const inSection = toBuy.filter((i) => i.section === section && !isChecked(i));
      if (inSection.length === 0) continue;
      lines.push(`${t.section[section]}:`);
      for (const item of inSection) lines.push(`- ${shoppingItemName(item, catalog)} ${shoppingItemQuantity(item)}`.trimEnd());
    }
    const manual = state.manualItems.filter((m) => !m.checked);
    if (manual.length > 0) lines.push(`${t.shopping.manual}:`, ...manual.map((m) => `- ${m.text}`));
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setMessage(t.shopping.copied);
    } catch {
      setMessage(t.shopping.copyFailed);
    }
  };

  const renderItem = (item: ShoppingItem) => {
    const name = shoppingItemName(item, catalog);
    const checked = isChecked(item);
    return (
      <li key={item.ingredientId} className={`shop-item${checked ? ' shop-item-done' : ''}`}>
        <label className="choice">
          <input
            type="checkbox"
            checked={checked}
            aria-label={t.shopping.markBought(name)}
            onChange={(e) => toggleChecked(item, e.target.checked)}
          />
          <span>
            <span className="shop-name">{name}</span>
            {item.quantity !== null && <span className="shop-quantity"> {shoppingItemQuantity(item)}</span>}
            {item.optional && <span className="hint"> ({t.units.optional})</span>}
            {wasUpdated(item) && <span className="tag tag-warn"> {t.shopping.updated}</span>}
          </span>
        </label>
        <details className="shop-sources">
          <summary>{t.shopping.from}</summary>
          <ul>
            {item.sources.map((source) => (
              <li key={source.recipeId}>
                {catalog.recipeById.get(source.recipeId)?.name}
                {source.quantity !== null && ` · ${formatBaseQuantity(Math.round(source.quantity * 10) / 10, item.unit)}`}
              </li>
            ))}
          </ul>
        </details>
        <button
          type="button"
          className="button button-small button-quiet"
          aria-label={t.shopping.haveLabel(name)}
          onClick={() => setHave(item.ingredientId, true)}
        >
          {t.shopping.alreadyHave}
        </button>
      </li>
    );
  };

  return (
    <>
      <header className="page-header">
        <div>
          <h1>{t.shopping.title}</h1>
          <p className="week-range">{t.menu.weekOf(formatWeekRange(weekStart))}</p>
        </div>
        {items.length > 0 && (
          <div className="toolbar">
            <span role="status" aria-live="polite">
              {t.shopping.progress(done, total)}
            </span>
            <button type="button" className="button" onClick={copy}>
              {t.shopping.copy}
            </button>
          </div>
        )}
      </header>
      <p role="status" aria-live="polite">
        {message}
      </p>

      {items.length === 0 && (
        <div className="empty">
          <p>{t.shopping.empty}</p>
          <Link className="button button-primary" to="/menu">
            {t.shopping.goMenu}
          </Link>
        </div>
      )}

      <div className="shop-columns">
        {SHOP_SECTIONS.map((section) => {
          const inSection = toBuy.filter((i) => i.section === section);
          if (inSection.length === 0) return null;
          // Los ya comprados bajan al final de su sección.
          const ordered = [...inSection.filter((i) => !isChecked(i)), ...inSection.filter(isChecked)];
          return (
            <section key={section} className="card shop-section" aria-labelledby={`section-${section}`}>
              <h2 id={`section-${section}`}>{t.section[section]}</h2>
              <ul className="shop-list">{ordered.map(renderItem)}</ul>
            </section>
          );
        })}

        <section className="card shop-section" aria-labelledby="section-manual">
          <h2 id="section-manual">{t.shopping.manual}</h2>
          <ul className="shop-list">
            {state.manualItems.map((manual) => (
              <li key={manual.id} className={`shop-item${manual.checked ? ' shop-item-done' : ''}`}>
                <label className="choice">
                  <input
                    type="checkbox"
                    checked={manual.checked}
                    onChange={(e) =>
                      update((s) => ({
                        ...s,
                        manualItems: s.manualItems.map((m) => (m.id === manual.id ? { ...m, checked: e.target.checked } : m)),
                      }))
                    }
                  />
                  <span className="shop-name">{manual.text}</span>
                </label>
                <button
                  type="button"
                  className="button button-small button-quiet"
                  aria-label={t.common.remove(manual.text)}
                  onClick={() => update((s) => ({ ...s, manualItems: s.manualItems.filter((m) => m.id !== manual.id) }))}
                >
                  {t.common.delete}
                </button>
              </li>
            ))}
          </ul>
          <form
            className="toolbar"
            onSubmit={(e) => {
              e.preventDefault();
              const value = text.trim();
              if (!value) return;
              update((s) => ({
                ...s,
                manualItems: [...s.manualItems, { id: crypto.randomUUID(), text: value, section: 'other', checked: false }],
              }));
              setText('');
            }}
          >
            <input
              aria-label={t.shopping.addItem}
              placeholder={t.shopping.addItemPlaceholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={80}
            />
            <button type="submit" className="button">
              {t.common.add}
            </button>
          </form>
        </section>

        {pantry.length > 0 && (
          <section className="card shop-section" aria-labelledby="section-pantry">
            <h2 id="section-pantry">{t.shopping.pantry}</h2>
            <p className="hint">{t.shopping.pantryHint}</p>
            <ul className="chips">
              {pantry.map((item) => (
                <li key={item.ingredientId} className="chip">
                  {shoppingItemName(item, catalog)}
                </li>
              ))}
            </ul>
          </section>
        )}

        {atHome.length > 0 && (
          <details className="card shop-section">
            <summary>{t.shopping.alreadyHaveGroup(atHome.length)}</summary>
            <ul className="shop-list">
              {atHome.map((item) => (
                <li key={item.ingredientId} className="shop-item">
                  <span className="shop-name">{shoppingItemName(item, catalog)}</span>
                  <button type="button" className="button button-small" onClick={() => setHave(item.ingredientId, false)}>
                    {t.shopping.restore}
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </>
  );
}
