/**
 * Car price: one-tap amounts, − / + fine adjustment, and free typing.
 */
import { useId } from 'react';
import { financeRules } from '../config/financeRules';
import { parseMoney } from '../lib/format';

interface Props {
  value: string;
  onChange: (text: string) => void;
  /** Called when editing finishes (blur or a button tap). */
  onCommit?: (text: string) => void;
  label?: string;
}

const short = (n: number) => `£${(n / 1000).toLocaleString('en-GB', { maximumFractionDigits: 1 })}k`;

export default function PriceInput({ value, onChange, onCommit, label = 'Car price' }: Props) {
  const id = useId();
  const current = parseMoney(value);
  const set = (n: number) => {
    const text = String(Math.max(0, Math.round(n)));
    onChange(text);
    onCommit?.(text);
  };
  const step = financeRules.priceStep;

  return (
    <div className="field price-input">
      <label htmlFor={id}>{label}</label>
      <div className="price-row">
        <button type="button" className="step-btn" aria-label={`Minus £${step}`} onClick={() => set((Number.isFinite(current) ? current : 0) - step)}>
          −
        </button>
        <div className="money-input">
          <span aria-hidden="true">£</span>
          <input
            id={id}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            enterKeyHint="done"
            placeholder="0"
            value={Number.isFinite(current) && !/[.,]$/.test(value) && !value.includes('.') ? current.toLocaleString('en-GB') : value}
            onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ''))}
            onBlur={(e) => onCommit?.(e.target.value.replace(/[^\d.]/g, ''))}
          />
        </div>
        <button type="button" className="step-btn" aria-label={`Plus £${step}`} onClick={() => set((Number.isFinite(current) ? current : 0) + step)}>
          +
        </button>
      </div>
      <div className="quick-prices" role="group" aria-label="Quick prices">
        {financeRules.quickPrices.map((p) => (
          <button key={p} type="button" className={`quick${current === p ? ' quick--on' : ''}`} aria-pressed={current === p} onClick={() => set(p)}>
            {short(p)}
          </button>
        ))}
      </div>
    </div>
  );
}
