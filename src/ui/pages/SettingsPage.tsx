import { useRef, useState } from 'react';
import { exportBackup, importBackup } from '../../data/backup';
import { parseBackup } from '../../data/backupFormat';
import { catalog } from '../../data/catalog';
import { clearAllData, savePreferences } from '../../data/repos';
import type { Preferences } from '../../domain/types';
import { t } from '../../i18n';
import { promptInstall } from '../../install';
import { getTextScale, getTheme, setTextScale, setTheme, TEXT_SCALES, THEMES } from '../appearance';
import { AvoidSection, DietSection, WeekSection } from '../components/PreferencesForm';
import { formatDateTime } from '../format';
import { useInstallState, useMeta, usePending, usePreferences, useWeek } from '../hooks';
import { refreshBreakfasts } from '../planActions';

export function SettingsPage() {
  const [prefs, showPrefs] = usePending(usePreferences());
  const meta = useMeta();
  const install = useInstallState();
  const { weekStart } = useWeek();
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [textScale, setScale] = useState(getTextScale);
  const [theme, setThemeState] = useState(getTheme);

  if (!prefs || !meta) return <p>{t.common.loading}</p>;

  const change = async (patch: Partial<Preferences>) => {
    const next = { ...prefs, ...patch };
    showPrefs(next);
    await savePreferences(next);
    if ('habitualBreakfastIds' in patch) await refreshBreakfasts(weekStart, next);
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

      <section className="card" aria-labelledby="settings-prefs">
        <h2 id="settings-prefs">{t.settings.preferences}</h2>
        <p className="hint">{t.settings.preferencesHint}</p>
        <div className="settings-grid">
          <div>
            <DietSection value={prefs} onChange={change} />
            <WeekSection value={prefs} onChange={change} />
          </div>
          <div>
            <AvoidSection value={prefs} onChange={change} />
          </div>
        </div>
      </section>

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
