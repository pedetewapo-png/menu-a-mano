import { useEffect, useRef, useState } from 'react';
import { savePreferences } from '../../data/repos';
import type { Preferences } from '../../domain/types';
import { mondayOf } from '../../domain/week';
import { t } from '../../i18n';
import { AvoidSection, DietSection, WeekSection } from '../components/PreferencesForm';
import { generateWeek } from '../planActions';

const SECTIONS = [DietSection, AvoidSection, WeekSection];

export function OnboardingPage({ initial }: { initial: Preferences }) {
  const [prefs, setPrefs] = useState(initial);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const Section = SECTIONS[step]!;
  const last = step === SECTIONS.length - 1;

  // Al cambiar de paso el foco va al título, para que el lector de pantalla lo anuncie.
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const finish = async () => {
    setBusy(true);
    const done = { ...prefs, onboardingDone: true };
    await generateWeek(mondayOf(new Date()), done, new Set());
    await savePreferences(done);
  };

  return (
    <main className="onboarding">
      <p className="brand">{t.appName}</p>
      <h1>{t.onboarding.title}</h1>
      <p className="hint">{t.onboarding.intro}</p>
      <section className="card" aria-labelledby="onboarding-step">
        <p className="hint">{t.onboarding.step(step + 1, SECTIONS.length)}</p>
        <h2 id="onboarding-step" ref={headingRef} tabIndex={-1}>
          {t.onboarding.steps[step]}
        </h2>
        <Section value={prefs} onChange={(patch) => setPrefs({ ...prefs, ...patch })} />
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
