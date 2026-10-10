import { useEffect, useId, useRef, type ReactNode } from 'react';
import { t } from '../../i18n';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/** Diálogo modal sobre el elemento nativo <dialog>: gestiona el foco y se cierra con Escape. */
export function Dialog({ open, onClose, title, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className="dialog" aria-labelledby={titleId} onClose={onClose}>
      {open && (
        <>
          <header className="dialog-header">
            <h2 id={titleId}>{title}</h2>
            <button type="button" className="button button-quiet" onClick={onClose}>
              {t.common.close}
            </button>
          </header>
          <div className="dialog-body">{children}</div>
        </>
      )}
    </dialog>
  );
}
