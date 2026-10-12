import { useRef, useState } from 'react';
import { exportBackup, importBackup } from '../../data/backup';
import { parseBackup } from '../../data/backupFormat';
import { clearAllData, createProfile, deleteProfile, saveProfile, saveSettings } from '../../data/repos';
import { combinePreferences } from '../../domain/household';
import { MAX_PROFILES, type Catalog, type DinerProfile, type HouseholdSettings } from '../../domain/types';
import { t } from '../../i18n';
import { promptInstall } from '../../install';
import { getTextScale, getTheme, setTextScale, setTheme, TEXT_SCALES, THEMES } from '../appearance';
import { ServingsField, WeekSection } from '../components/PreferencesForm';
import { ProfileDialog } from '../components/ProfileDialog';
import { formatDateTime } from '../format';
import { useCatalog, useHousehold, useInstallState, useMeta, usePending, useWeek } from '../hooks';
import { refreshBreakfasts } from '../planActions';

/** Resumen de una ficha en una línea: "Vegetariana · evita champiñones · alérgenos: gluten". */
function summarize(profile: DinerProfile, catalog: Catalog): string {
  const avoided = [
    ...profile.excludedGroups.map((group) => t.group[group].toLowerCase()),
    ...profile.excludedIngredientIds.map((id) => catalog.ingredients.get(id)?.name ?? id),
  ];
  const parts = [t.diet[profile.diet]];
  if (avoided.length > 0) parts.push(t.profiles.avoids(avoided.join(', ')));
  if (profile.excludedAllergens.length > 0) {
    parts.push(t.profiles.allergens(profile.excludedAllergens.map((a) => t.allergen[a].toLowerCase()).join(', ')));
  }
  if (parts.length === 1) parts.push(t.profiles.noNeeds);
  return parts.join(' · ');
}

export function SettingsPage() {
  const catalog = useCatalog();
  const [household, showHousehold] = usePending(useHousehold());
  const meta = useMeta();
  const install = useInstallState();
  const { weekStart } = useWeek();
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState<{ profile: DinerProfile; isNew: boolean } | null>(null);
  const [textScale, setScale] = useState(getTextScale);
  const [theme, setThemeState] = useState(getTheme);

  if (!household || !meta) return <p>{t.common.loading}</p>;
  const { profiles, settings } = household;

  const changeSettings = async (patch: Partial<HouseholdSettings>) => {
    const next = { ...settings, ...patch };
    showHousehold({ profiles, settings: next });
    await saveSettings(next);
    if ('habitualBreakfastIds' in patch) await refreshBreakfasts(weekStart, combinePreferences(profiles, next));
  };

  const saveEdited = async (profile: DinerProfile, isNew: boolean) => {
    await saveProfile(profile);
    let text = t.profiles.saved(profile.name);
    // Una persona más en casa es, como mínimo, un comensal más.
    const count = profiles.length + (isNew ? 1 : 0);
    if (isNew && settings.servings < count) {
      await saveSettings({ ...settings, servings: count });
      text += t.profiles.servingsRaised(count);
    }
    setEditing(null);
    setMessage(text);
  };

  const removeProfile = async (profile: DinerProfile) => {
    if (!window.confirm(t.profiles.removeConfirm(profile.name))) return;
    await deleteProfile(profile.id);
    setMessage(t.profiles.removed(profile.name));
  };

  const download = async () => {
    const backup = await exportBackup();
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `menu-a-mano-${backup.exportedAt.slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importFile = async (file: File) => {
    // Se valida la copia entera antes de tocar ningún dato.
    const result = parseBackup(await file.text());
    if (!result.ok) {
      setMessage(t.settings.importError[result.reason]);
      return;
    }
    if (!window.confirm(t.settings.importConfirm)) return;
    await importBackup(result.data);
    setMessage(t.settings.importDone);
  };

  const deleteAll = async () => {
    if (!window.confirm(t.settings.deleteConfirm)) return;
    await clearAllData();
    setMessage(t.settings.deleted);
  };

  const credits = catalog.recipes.filter((r) => r.image);

  return (
    <>
      <header className="page-header">
        <h1>{t.settings.title}</h1>
      </header>
      <p role="status" aria-live="polite">
        {message}
      </p>

      <section className="card" aria-labelledby="settings-profiles">
        <h2 id="settings-profiles">{t.profiles.title}</h2>
        <p className="hint">{t.profiles.hint}</p>
        <ul className="profile-list">
          {profiles.map((profile) => (
            <li key={profile.id} className="profile-row">
              <div>
                <strong>{profile.name}</strong>
                <p className="hint">{summarize(profile, catalog)}</p>
              </div>
              <div className="toolbar">
                <button
                  type="button"
                  className="button button-small"
                  aria-label={t.profiles.editFor(profile.name)}
                  onClick={() => setEditing({ profile, isNew: false })}
                >
                  {t.profiles.edit}
                </button>
                {/* Siempre tiene que quedar al menos un comensal. */}
                {profiles.length > 1 && (
                  <button
                    type="button"
                    className="button button-small button-quiet"
                    aria-label={t.profiles.removeFor(profile.name)}
                    onClick={() => removeProfile(profile)}
                  >
                    {t.profiles.remove}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
        {profiles.length < MAX_PROFILES ? (
          <button type="button" className="button" onClick={() => setEditing({ profile: createProfile(), isNew: true })}>
            {t.profiles.add}
          </button>
        ) : (
          <p className="hint">{t.profiles.limit(MAX_PROFILES)}</p>
        )}
      </section>

      <section className="card" aria-labelledby="settings-menu">
        <h2 id="settings-menu">{t.profiles.menuTitle}</h2>
        <p className="hint">{t.profiles.menuHint}</p>
        <ServingsField value={settings.servings} onChange={(servings) => changeSettings({ servings })} />
        <WeekSection value={settings} preferences={combinePreferences(profiles, settings)} onChange={changeSettings} />
      </section>

      {editing && (
        <ProfileDialog
          key={editing.profile.id}
          profile={editing.profile}
          isNew={editing.isNew}
          onSave={(profile) => saveEdited(profile, editing.isNew)}
          onClose={() => setEditing(null)}
        />
      )}

      <section className="card" aria-labelledby="settings-data">
        <h2 id="settings-data">{t.settings.data}</h2>
        <p>{t.settings.dataHint}</p>
        <p className="hint">
          {meta.lastExportAt ? t.settings.lastExport(formatDateTime(meta.lastExportAt)) : t.settings.neverExported}
        </p>
        <div className="toolbar">
          <button type="button" className="button button-primary" onClick={download}>
            {t.settings.export}
          </button>
          <button type="button" className="button" onClick={() => fileInput.current?.click()}>
            {t.settings.import}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void importFile(file);
            }}
          />
          <button type="button" className="button button-danger" onClick={deleteAll}>
            {t.settings.deleteAll}
          </button>
        </div>
      </section>

      <section className="card" aria-labelledby="settings-install">
        <h2 id="settings-install">{t.install.title}</h2>
        <p>{t.install.intro}</p>
        <p role="status" aria-live="polite">
          {t.install.state[install]}
        </p>
        {install === 'available' && (
          <button type="button" className="button button-primary" onClick={() => void promptInstall()}>
            {t.install.button}
          </button>
        )}
      </section>

      <section className="card" aria-labelledby="settings-appearance">
        <h2 id="settings-appearance">{t.settings.appearance}</h2>
        <div className="toolbar">
          <div className="field">
            <label className="field-label" htmlFor="text-size">
              {t.settings.textSize}
            </label>
            <select
              id="text-size"
              value={textScale}
              onChange={(e) => {
                setTextScale(e.target.value);
                setScale(e.target.value);
              }}
            >
              {TEXT_SCALES.map((scale) => (
                <option key={scale} value={scale}>
                  {t.settings.textSizes[scale]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="theme">
              {t.settings.theme}
            </label>
            <select
              id="theme"
              value={theme}
              onChange={(e) => {
                setTheme(e.target.value);
                setThemeState(e.target.value);
              }}
            >
              {THEMES.map((option) => (
                <option key={option} value={option}>
                  {t.settings.themes[option]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="card" aria-labelledby="settings-about">
        <h2 id="settings-about">{t.settings.about}</h2>
        <p>{t.notices.scope}</p>
        <p>{t.notices.allergens}</p>
        <p>{t.notices.draftCatalog}</p>
        <p>{t.settings.privacy}</p>
        <h3>{t.settings.credits}</h3>
        {credits.length === 0 ? (
          <p className="hint">{t.settings.noCredits}</p>
        ) : (
          <ul>
            {credits.map((recipe) => (
              <li key={recipe.id}>
                {recipe.name}: {t.recipes.photo(recipe.image!.author, recipe.image!.license)}
                {recipe.image!.sourceUrl && (
                  <>
                    {' · '}
                    <a href={recipe.image!.sourceUrl} target="_blank" rel="noreferrer">
                      {recipe.image!.title ?? recipe.image!.sourceUrl}
                    </a>
                  </>
                )}
                {` · ${recipe.image!.modifications}`}
              </li>
            ))}
          </ul>
        )}
        <p className="hint">{t.settings.version(__APP_VERSION__)}</p>
      </section>
    </>
  );
}
