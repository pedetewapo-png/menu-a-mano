import { useId, useState } from 'react';
import { PROFILE_NAME_MAX_LENGTH, type DinerProfile } from '../../domain/types';
import { t } from '../../i18n';
import { Dialog } from './Dialog';
import { AvoidSection, DietField } from './PreferencesForm';

interface ProfileDialogProps {
  profile: DinerProfile;
  isNew: boolean;
  onSave: (profile: DinerProfile) => void;
  onClose: () => void;
}

/** Ficha de un comensal. Los cambios no se aplican hasta pulsar "Guardar". */
export function ProfileDialog({ profile, isNew, onSave, onClose }: ProfileDialogProps) {
  const [draft, setDraft] = useState(profile);
  const nameId = useId();

  return (
    <Dialog open onClose={onClose} title={isNew ? t.profiles.newTitle : t.profiles.editTitle(profile.name)}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const name = draft.name.trim();
          if (name) onSave({ ...draft, name });
        }}
        // Intro en el buscador de ingredientes no debe guardar la ficha a medias.
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.target as HTMLElement).matches('input[type="search"]')) {
            event.preventDefault();
          }
        }}
      >
        <div className="field">
          <label className="field-label" htmlFor={nameId}>
            {t.profiles.name}
          </label>
          <input
            id={nameId}
            value={draft.name}
            required
            maxLength={PROFILE_NAME_MAX_LENGTH}
            autoComplete="off"
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </div>
        <DietField value={draft} onChange={(patch) => setDraft({ ...draft, ...patch })} />
        <AvoidSection value={draft} onChange={(patch) => setDraft({ ...draft, ...patch })} />
        <div className="actions">
          <button type="button" className="button" onClick={onClose}>
            {t.common.cancel}
          </button>
          <button type="submit" className="button button-primary">
            {t.common.save}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
