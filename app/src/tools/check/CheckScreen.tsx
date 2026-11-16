/**
 * Check tab: registration lookup at the top, then the finance calculator,
 * vehicle details, MOT light, road tax and clean air check.
 */
import { useId, useState } from 'react';
import { financeRules } from '../../config/financeRules';
import { lookupProblem, lookupRegistration } from '../../api/client';
import { evaluateCar } from '../../domain/evaluate';
import { depositOptions } from '../../domain/finance/calculator';
import { formatISODate, formatMonthYear, isValidISODate, todayISO } from '../../domain/dates';
import { normaliseRegistration } from '../../domain/vehicle/registration';
import type { ApiError } from '../../domain/vehicle/types';
import { formatAge, formatGBPWhole, formatPercent, MONTH_NAMES, parseMoney } from '../../lib/format';
import { useCheckState } from '../../hooks/useCheckState';
import PlateInput from '../../components/PlateInput';
import PasscodeSheet from '../../components/PasscodeSheet';
import { findByReg, getShortlistItem, saveShortlistItem } from '../../storage/shortlist';
import { itemFromCheck } from '../shortlist/mapping';
import VehicleCard from './VehicleCard';
import ResultCard from './ResultCard';
import TaxCard from './TaxCard';
import CleanAirCard from './CleanAirCard';

const DEPOSITS = depositOptions();
const FUELS = [
  ['PETROL', 'Petrol'],
  ['DIESEL', 'Diesel'],
  ['HYBRID ELECTRIC', 'Hybrid (petrol)'],
  ['ELECTRICITY', 'Electric'],
] as const;

export default function CheckScreen() {
  const [s, patch] = useCheckState();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<ApiError>();
  const [askPasscode, setAskPasscode] = useState<string>();
  const [toast, setToast] = useState<string>();
  const ids = {
    price: useId(), deposit: useId(), term: useId(), start: useId(), day: useId(), month: useId(), year: useId(), fuel: useId(),
  };

  const today = todayISO();
  const agreementStart = s.agreementStart && isValidISODate(s.agreementStart) ? s.agreementStart : today;
  const lookup = s.lookup;
  const hasLookup = !!(lookup?.vehicle || lookup?.mot);
  const useManual = s.manualOn || !hasLookup;

  const ev = evaluateCar(
    {
      vehicle: lookup?.vehicle,
      mot: lookup?.mot,
      manualRegistration: useManual ? s.manual : undefined,
      manualFuelType: s.manualFuel || undefined,
      manualCo2: Number(s.manualCo2Text) || undefined,
      manualEngineCc: Number(s.manualEngineText) || undefined,
      listPrice: Number(s.listPriceText) || undefined,
      overThresholdWhenNew: s.overThreshold,
    },
    { price: parseMoney(s.priceText), deposit: s.deposit, requestedTermMonths: s.requestedTerm, agreementStart },
    today,
  );
  const w = ev.working;
  const maxTerm = w?.status === 'ok' ? w.maxTermMonths : 0;
  const termOptions = Array.from({ length: Math.max(0, maxTerm - financeRules.minTermMonths + 1) }, (_, i) => maxTerm - i);
  const selectedTerm = s.requestedTerm && s.requestedTerm <= maxTerm ? s.requestedTerm : maxTerm;

  async function runLookup() {
    const reg = normaliseRegistration(s.plateText);
    setBusy(true);
    setProblem(undefined);
    const result = await lookupRegistration(reg);
    setBusy(false);
    const issue = lookupProblem(result);
    if (issue?.code === 'UNAUTHORISED') {
      setAskPasscode(issue.message);
      return;
    }
    if (issue) {
      setProblem(issue);
      return;
    }
    // New car: reset per-car inputs; keep price/deposit.
    patch({ lookup: result, manualOn: false, requestedTerm: undefined, listPriceText: '', overThreshold: false, shortlistId: undefined });
  }

  async function saveToShortlist() {
    const existing =
      (s.shortlistId ? await getShortlistItem(s.shortlistId) : undefined) ??
      (lookup?.reg ? await findByReg(lookup.reg) : undefined);
    const saved = await saveShortlistItem(itemFromCheck(s, existing));
    patch({ shortlistId: saved.id });
    setToast(existing ? 'Shortlist card updated' : 'Saved to shortlist');
    setTimeout(() => setToast(undefined), 2200);
  }

  const reg = ev.registration;
  const workingLine =
    reg && w
      ? `Registered ${reg.approx ? `${formatMonthYear(reg.date)} (approx, 1st assumed)` : formatISODate(reg.date)}, ${formatAge(
          Math.max(0, w.carAgeMonths),
        )} old (${Math.max(0, w.carAgeMonths)} months) at the start, ${
          w.status === 'ok' ? `max term ${w.maxTermMonths} months` : w.status === 'not-eligible' ? 'not eligible' : 'check the dates'
        }`
      : undefined;

  const years = Array.from({ length: financeRules.registrationYearsBack + 1 }, (_, i) => Number(today.slice(0, 4)) - i);
  if (!years.includes(s.manual.year)) years.push(s.manual.year);

  return (
    <div className="check">
      <section className="card lookup-card" aria-label="Registration lookup">
        <PlateInput value={s.plateText} onChange={(v) => patch({ plateText: v })} onSubmit={runLookup} busy={busy} />
        {problem && (
          <p className={`lookup-problem lookup-problem--${problem.code.toLowerCase()}`} role="alert">
            {problem.message}
          </p>
        )}
        <div className="lookup-links">
          {hasLookup && (
            <button type="button" className="link-btn" onClick={() => patch({ lookup: undefined, plateText: '', shortlistId: undefined })}>
              Clear car
            </button>
          )}
          <button type="button" className="link-btn" onClick={() => setAskPasscode('')}>
            Passcode
          </button>
        </div>
      </section>

      <div className="col col-main">
        <ResultCard quote={ev.quote} needsDate={!reg} monthlyTax={ev.ved?.status === 'ok' ? ev.ved.monthly : undefined} trueMonthly={ev.trueMonthly} />
        {hasLookup && lookup && (
          <VehicleCard
            reg={lookup.reg}
            vehicle={lookup.vehicle}
            mot={lookup.mot}
            vehicleError={lookup.vehicleError}
            motError={lookup.motError}
            registration={reg}
            assessment={ev.mot}
            mock={lookup.mock}
          />
        )}
      </div>

      <div className="col col-side">
        <section className="card inputs" aria-label="Finance details">
          <div className="field">
            <label htmlFor={ids.price}>Car price</label>
            <div className="money-input">
              <span aria-hidden="true">£</span>
              <input
                id={ids.price}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                enterKeyHint="done"
                placeholder="0"
                value={s.priceText}
                onChange={(e) => patch({ priceText: e.target.value.replace(/[^\d.,]/g, '') })}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor={ids.deposit}>Deposit</label>
            <select id={ids.deposit} value={s.deposit} onChange={(e) => patch({ deposit: Number(e.target.value) })}>
              {DEPOSITS.map((d) => (
                <option key={d} value={d}>{formatGBPWhole(d)}</option>
              ))}
            </select>
          </div>

          <div className="row">
            <div className="field">
              <label htmlFor={ids.term}>Term</label>
              <select
                id={ids.term}
                value={selectedTerm || ''}
                disabled={termOptions.length === 0}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  patch({ requestedTerm: v === maxTerm ? undefined : v });
                }}
              >
                {termOptions.length === 0 && <option value="">—</option>}
                {termOptions.map((t) => (
                  <option key={t} value={t}>{t === maxTerm ? `${t} mo (max)` : `${t} months`}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor={ids.start}>Start date</label>
              <input
                id={ids.start}
                type="date"
                value={agreementStart}
                min={today}
                onChange={(e) => patch({ agreementStart: e.target.value === today ? '' : e.target.value })}
              />
            </div>
          </div>

          <div className="field">
            <span className="field-label">Registration date</span>
            {workingLine && <p className="working">{workingLine}</p>}
            {hasLookup && (
              <label className="checkbox">
                <input type="checkbox" checked={s.manualOn} onChange={(e) => patch({ manualOn: e.target.checked })} />
                <span>Use a different registration date</span>
              </label>
            )}
            {useManual && (
              <fieldset className="manual-date">
                <legend className="sr-only">Enter registration date</legend>
                <div className="row row-3">
                  <div>
                    <label htmlFor={ids.day} className="mini-label">Day</label>
                    <select
                      id={ids.day}
                      value={s.manual.day ?? ''}
                      onChange={(e) => patch({ manual: { ...s.manual, day: e.target.value ? Number(e.target.value) : undefined } })}
                    >
                      <option value="">Not sure</option>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={ids.month} className="mini-label">Month</label>
                    <select id={ids.month} value={s.manual.month} onChange={(e) => patch({ manual: { ...s.manual, month: Number(e.target.value) } })}>
                      {MONTH_NAMES.map((name, i) => (
                        <option key={name} value={i + 1}>{name.slice(0, 3)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={ids.year} className="mini-label">Year</label>
                    <select id={ids.year} value={s.manual.year} onChange={(e) => patch({ manual: { ...s.manual, year: Number(e.target.value) } })}>
                      {years.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {!hasLookup && (
                  <div className="field">
                    <label htmlFor={ids.fuel} className="mini-label">Fuel (for tax and clean air)</label>
                    <select id={ids.fuel} value={s.manualFuel} onChange={(e) => patch({ manualFuel: e.target.value })}>
                      <option value="">Not sure</option>
                      {FUELS.map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                )}
              </fieldset>
            )}
          </div>

          <div className="fixed-rate">
            <span>APR (fixed, no fees)</span>
            <strong>{formatPercent(financeRules.apr)}</strong>
          </div>
        </section>

        <TaxCard
          ved={ev.ved}
          listPriceText={s.listPriceText}
          overThreshold={s.overThreshold}
          onListPrice={(t) => patch({ listPriceText: t })}
          onOverThreshold={(v) => patch({ overThreshold: v })}
          manual={{
            co2Text: s.manualCo2Text,
            engineText: s.manualEngineText,
            onCo2: (t) => patch({ manualCo2Text: t }),
            onEngine: (t) => patch({ manualEngineText: t }),
          }}
        />

        {(hasLookup || s.manualFuel) && <CleanAirCard result={ev.cleanAir} />}

        <button type="button" className="btn btn-primary btn-block" onClick={saveToShortlist} disabled={!hasLookup && !parseMoney(s.priceText)}>
          {s.shortlistId ? 'Update shortlist card' : 'Save to shortlist'}
        </button>

        <p className="footnote">
          {financeRules.productName}. Maximum term {financeRules.maxTermMonths} months; the car must be no more than{' '}
          {financeRules.maxCarAgeAtEndMonths / 12} years old when the agreement ends. Figures are estimates.
        </p>
      </div>

      {askPasscode !== undefined && (
        <PasscodeSheet
          message={askPasscode || undefined}
          onClose={() => setAskPasscode(undefined)}
          onSaved={() => {
            setAskPasscode(undefined);
            if (normaliseRegistration(s.plateText).length >= 2) runLookup();
          }}
        />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
