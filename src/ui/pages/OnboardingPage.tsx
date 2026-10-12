import { useEffect, useRef, useState } from 'react';
import { createProfile, saveProfile, saveSettings } from '../../data/repos';
import { combinePreferences, DEFAULT_SETTINGS } from '../../domain/household';
import { PROFILE_NAME_MAX_LENGTH } from '../../domain/types';
import { mondayOf } from '../../domain/week';
import { t } from '../../i18n';
import { AvoidSection, DietField, ServingsField, WeekSection } from '../components/PreferencesForm';
import { generateWeek } from '../planActions';

const STEP_COUNT = 3;

/** Configuración inicial: crea la ficha del primer comensal y los ajustes de la casa. */
export function OnboardingPage() {
  const [profile, setProfile] = useState(() => createProfile());
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const last = step === STEP_COUNT - 1;

  // Al cambiar de paso el foco va al título, para que el lector de pantalla lo anuncie.
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const finish = async () => {
    setBusy(true);
    const person = { ...profile, name: profile.name.trim() || t.profiles.defaultName };
    const done = { ...settings, onboardingDone: true };
    await generateWeek(mondayOf(new Date()), combinePreferences([person], done), new Set());
    await saveProfile(person);
    await saveSettings(done);
  };

  return (
    <main className="onboarding">
      <p className="brand">{t.appName}</p>
      <h1>{t.onboarding.title}</h1>
      <p className="hint">{t.onboarding.intro}</p>
      <section className="card" aria-labelledby="onboarding-step">
        <p className="hint">{t.onboarding.step(step + 1, STEP_COUNT)}</p>
        <h2 id="onboarding-step" ref={headingRef} tabIndex={-1}>
          {t.onboarding.steps[step]}
        </h2>

        {step === 0 && (
          <>
            <div className="field">
              <label className="field-label" htmlFor="onboarding-name">
                {t.onboarding.name}
              </label>
              <input
                id="onboarding-name"
                value={profile.name}
                maxLength={PROFILE_NAME_MAX_LENGTH}
                autoComplete="given-name"
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
            </div>
            <DietField value={profile} onChange={(patch) => setProfile({ ...profile, ...patch })} />
            <ServingsField value={settings.servings} onChange={(servings) => setSettings({ ...settings, servings })} />
          </>
        )}
        {step === 1 && (
          <>
            <AvoidSection value={profile} onChange={(patch) => setProfile({ ...profile, ...patch })} />
            <p className="hint">{t.onboarding.moreLater}</p>
          </>
        )}
        {step === 2 && (
          <WeekSection
            value={settings}
            preferences={combinePreferences([profile], settings)}
            onChange={(patch) => setSettings({ ...settings, ...patch })}
          />
        )}

        {last && (
          <p className="callout" role="note">
            {t.notices.scope}
          </p>
        )}
        <div className="actions">
          {step > 0 && (
            <button type="button" className="button" onClick={() => setStep(step - 1)}>
              {t.common.back}
            </button>
          )}
          {last ? (
            <button type="button" className="button button-primary" disabled={busy} onClick={finish}>
              {t.onboarding.finish}
            </button>
          ) : (
            <button type="button" className="button button-primary" onClick={() => setStep(step + 1)}>
              {t.common.next}
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
