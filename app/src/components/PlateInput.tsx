/**
 * UK number-plate style registration input.
 */
import { useId } from 'react';
import { formatRegistration, isValidRegistration, normaliseRegistration } from '../domain/vehicle/registration';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  busy?: boolean;
  buttonLabel?: string;
  /** Show the Look up button. */
  showButton?: boolean;
  label?: string;
}

export default function PlateInput({ value, onChange, onSubmit, busy, buttonLabel = 'Look up', showButton = true, label = 'Registration' }: Props) {
  const id = useId();
  const reg = normaliseRegistration(value);
  const valid = isValidRegistration(reg);
  const showInvalid = reg.length >= 2 && !valid;

  return (
    <form
      className="plate-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid && !busy) onSubmit?.();
      }}
    >
      <label htmlFor={id} className="sr-only">{label}</label>
      <div className={`plate${showInvalid ? ' plate--invalid' : ''}`}>
        <span className="plate-band" aria-hidden="true">
          <span className="plate-flag">UK</span>
        </span>
        <input
          id={id}
          className="plate-input"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase().slice(0, 10))}
          onBlur={() => valid && onChange(formatRegistration(reg))}
          placeholder="AB12 CDE"
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          inputMode="text"
          aria-invalid={showInvalid || undefined}
        />
      </div>
      {showButton && (
        <button type="submit" className="btn btn-primary" disabled={!valid || busy}>
          {busy ? <span className="spinner" aria-label="Looking up" /> : buttonLabel}
        </button>
      )}
      {showInvalid && <p className="field-error">That doesn't look like a UK registration.</p>}
    </form>
  );
}
