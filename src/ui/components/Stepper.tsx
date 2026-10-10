import { t } from '../../i18n';

interface StepperProps {
  value: number;
  min: number;
  max: number;
  /** Nombre de lo que se cuenta, para las etiquetas accesibles ("comensales"). */
  unitLabel: string;
  onChange: (value: number) => void;
}

export function Stepper({ value, min, max, unitLabel, onChange }: StepperProps) {
  return (
    <div className="stepper">
      <button
        type="button"
        className="button"
        aria-label={t.common.decrease(unitLabel)}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <output aria-live="polite">{value}</output>
      <button
        type="button"
        className="button"
        aria-label={t.common.increase(unitLabel)}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  );
}
