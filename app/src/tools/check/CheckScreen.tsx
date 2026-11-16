/**
 * Check tab: registration search, car hero card, monthly payment, then
 * sections for Finance, MOT, Tax & clean air, and the Advert.
 */
import { useEffect, useId, useState } from 'react';
import { financeRules } from '../../config/financeRules';
import { lookupProblem, lookupRegistration } from '../../api/client';
import { useAppNav } from '../../appNav';
import { evaluateCar } from '../../domain/evaluate';
import { depositOptions } from '../../domain/finance/calculator';
import { formatISODate, formatMonthYear, isValidISODate, todayISO } from '../../domain/dates';
import { siteFromUrl } from '../../domain/shortlist/priceHistory';
import { normaliseRegistration } from '../../domain/vehicle/registration';
import type { ApiError } from '../../domain/vehicle/types';
import { formatAge, formatGBPWhole, formatPercent, MONTH_NAMES, parseMoney } from '../../lib/format';
import { completeManual, useCheckState, type CheckSection } from '../../hooks/useCheckState';
import { useShortlist } from '../../hooks/useShortlist';
import PlateInput from '../../components/PlateInput';
import PasscodeSheet from '../../components/PasscodeSheet';
import PriceInput from '../../components/PriceInput';
import SectionTabs from '../../components/SectionTabs';
import { getShortlistItem, saveShortlistItem } from '../../storage/shortlist';
import { itemFromCheck } from '../shortlist/mapping';
import CarHero from './CarHero';
import ResultCard from './ResultCard';
import TaxCard from './TaxCard';
import CleanAirCard from './CleanAirCard';
import MotPanel from './MotPanel';
import AdvertPanel from './AdvertPanel';

const DEPOSITS = depositOptions();
const FUELS = [
  ['PETROL', 'Petrol'],
  ['DIESEL', 'Diesel'],
  ['HYBRID ELECTRIC', 'Hybrid (petrol)'],
  ['ELECTRICITY', 'Electric'],
] as const;

export default function CheckScreen() {
  const nav = useAppNav();
  const [s, patch, clear] = useCheckState();
  const { items } = useShortlist();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<ApiError>();
  const [askPasscode, setAskPasscode] = useState<string>();
  const [toast, setToast] = useState<string>();
  const ids = { deposit: useId(), term: useId(), start: useId(), day: useId(), month: useId(), year: useId(), fuel: useId() };

  const today = todayISO();
  const agreementStart = s.agreementStart && isValidISODate(s.agreementStart) ? s.agreementStart : today;
  const lookup = s.lookup;
  const hasLookup = !!(lookup?.vehicle || lookup?.mot);
  const useManual = s.manualOn || !hasLookup;
  const linked = items.find((i) => i.id === s.shortlistId) ?? (lookup?.reg ? items.find((i) => i.reg === lookup.reg) : undefined);

  // Remember the link to an existing shortlist card (and its advert).
  useEffect(() => {
    if (linked && s.shortlistId !== linked.id) {
      patch({
        shortlistId: linked.id,
        ...(s.advertUrl ? {} : { advertUrl: linked.advertUrl ?? '', advertTitle: linked.advertTitle, advertImageUrl: linked.advertImageUrl, advertSite: linked.advertSite }),
      });
    }
  }, [linked, s.shortlistId, s.advertUrl, patch]);

  const ev = evaluateCar(
    {
      vehicle: lookup?.vehicle,
      mot: lookup?.mot,
      manualRegistration: useManual ? completeManual(s.manual) : undefined,
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
    if (issue?.code === 'UNAUTHORISED') return setAskPasscode(issue.message);
    if (issue) return setProblem(issue);
    const existing = items.find((i) => i.reg === reg);
    // A different car: start its details fresh but keep price/deposit/start date.
    patch({
      lookup: result,
      manualOn: false,
      requestedTerm: undefined,
      listPriceText: existing?.listPrice ? String(existing.listPrice) : '',
      overThreshold: !!existing?.overThresholdWhenNew,
      shortlistId: existing?.id,
      advertUrl: existing?.advertUrl ?? '',
      advertTitle: existing?.advertTitle,
      advertImageUrl: existing?.advertImageUrl,
      advertSite: existing?.advertSite,
      priceText: existing?.askingPrice ? String(existing.askingPrice) : s.priceText,
    });
  }

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(undefined), 2200);
  }

  async function saveToShortlist() {
    const existing = linked ?? (s.shortlistId ? await getShortlistItem(s.shortlistId) : undefined);
    const saved = await saveShortlistItem(itemFromCheck(s, existing));
    patch({ shortlistId: saved.id });
    flash(existing ? 'Shortlist card updated' : 'Saved to shortlist');
  }

  /** Keep the shortlist card's advert in step with the Check screen. */
  function setAdvert(fields: Partial<typeof s>) {
    patch(fields);
    if (linked) {
      const url = (fields.advertUrl ?? s.advertUrl).trim();
      saveShortlistItem({
        ...linked,
        advertUrl: url || undefined,
        advertTitle: fields.advertTitle ?? (url === linked.advertUrl ? linked.advertTitle : undefined),
        advertImageUrl: fields.advertImageUrl ?? (url === linked.advertUrl ? linked.advertImageUrl : undefined),
        advertSite: siteFromUrl(url),
      });
    }
  }

  const reg = ev.registration;
  const workingLine =
    reg && w
      ? `Registered ${reg.approx ? `${formatMonthYear(reg.date)} (approx, 1st assumed)` : formatISODate(reg.date)} · ${formatAge(
          Math.max(0, w.carAgeMonths),
        )} old (${Math.max(0, w.carAgeMonths)} months) at the start · ${
          w.status === 'ok' ? `max term ${w.maxTermMonths} months` : w.status === 'not-eligible' ? 'not eligible' : 'check the dates'
        }`
      : undefined;

  const years = Array.from({ length: financeRules.registrationYearsBack + 1 }, (_, i) => Number(today.slice(0, 4)) - i);
  const motBadge = ev.mot && ev.mot.light !== 'none' ? ev.mot.light : undefined;
  const sections: { id: CheckSection; label: string; badge?: string }[] = [
    { id: 'finance', label: 'Finance' },
    ...(hasLookup ? [{ id: 'mot' as const, label: 'MOT', badge: motBadge }] : []),
    { id: 'tax', label: 'Tax & ULEZ' },
    { id: 'advert', label: 'Advert' },
  ];
  const section = sections.some((x) => x.id === s.section) ? s.section : 'finance';
  const canSave = hasLookup || parseMoney(s.priceText) > 0;
  const nothingEntered = !hasLookup && !s.priceText && !completeManual(s.manual) && !s.plateText && !s.advertUrl;

  return (
    <div className="check">
      <section className="search-card" aria-label="Registration lookup">
        <PlateInput value={s.plateText} onChange={(v) => patch({ plateText: v })} onSubmit={runLookup} busy={busy} />
        {problem && (
          <p className={`lookup-problem lookup-problem--${problem.code.toLowerCase()}`} role="alert">
            {problem.message}
          </p>
        )}
        <div className="lookup-links">
          {!nothingEntered && (
            <button type="button" className="link-btn" onClick={() => { clear(); setProblem(undefined); window.scrollTo({ top: 0 }); }}>
              Clear all
            </button>
          )}
          <button type="button" className="link-btn" onClick={() => setAskPasscode('')}>
            Passcode
          </button>
        </div>
      </section>

      <div className="col col-main">
        {hasLookup && lookup && (
          <CarHero
            reg={lookup.reg}
            vehicle={lookup.vehicle}
            mot={lookup.mot}
            ev={ev}
            mock={lookup.mock}
            advertUrl={s.advertUrl.trim() || undefined}
            advertSite={s.advertSite ?? siteFromUrl(s.advertUrl)}
            ownImageUrl={s.advertImageUrl}
            onShortlist={!!linked}
            onSave={saveToShortlist}
            onViewCard={() => linked && nav.openShortlistItem(linked.id)}
            onAddAdvert={() => patch({ section: 'advert' })}
            onClear={() => { clear(); setProblem(undefined); window.scrollTo({ top: 0 }); }}
          />
        )}
        {lookup?.vehicleError && hasLookup && <p className="note">DVLA: {lookup.vehicleError.message}</p>}
        <ResultCard quote={ev.quote} needsDate={!reg} monthlyTax={ev.ved?.status === 'ok' ? ev.ved.monthly : undefined} trueMonthly={ev.trueMonthly} />
      </div>

      <div className="col col-side">
        <SectionTabs tabs={sections} active={section} onChange={(id) => patch({ section: id })} />

        {section === 'finance' && (
          <div className="panel">
            <section className="card inputs" aria-label="Finance details">
              <PriceInput value={s.priceText} onChange={(t) => patch({ priceText: t })} />

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
                    {!hasLookup && !completeManual(s.manual) && (
                      <p className="muted small">No lookup? Pick the month and year from the V5C or advert.</p>
                    )}
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
                        <select
                          id={ids.month}
                          value={s.manual.month ?? ''}
                          onChange={(e) => patch({ manual: { ...s.manual, month: e.target.value ? Number(e.target.value) : undefined } })}
                        >
                          <option value="">Month</option>
                          {MONTH_NAMES.map((name, i) => (
                            <option key={name} value={i + 1}>{name.slice(0, 3)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor={ids.year} className="mini-label">Year</label>
                        <select
                          id={ids.year}
                          value={s.manual.year ?? ''}
                          onChange={(e) => patch({ manual: { ...s.manual, year: e.target.value ? Number(e.target.value) : undefined } })}
                        >
                          <option value="">Year</option>
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
            {!hasLookup && canSave && (
              <button type="button" className="btn btn-primary btn-block" onClick={saveToShortlist}>
                {linked ? 'Update shortlist card' : 'Save to shortlist'}
              </button>
            )}
          </div>
        )}

        {section === 'mot' && hasLookup && (
          <MotPanel mot={lookup?.mot} make={lookup?.vehicle?.make} assessment={ev.mot} motError={lookup?.motError} />
        )}

        {section === 'tax' && (
          <div className="panel">
            {ev.ved ? (
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
            ) : (
              <p className="note">Look up a car, or enter its registration date under Finance, to estimate road tax.</p>
            )}
            {(hasLookup || s.manualFuel) ? (
              <CleanAirCard result={ev.cleanAir} />
            ) : (
              <p className="note">Clean air check needs the fuel type — look up the car or choose the fuel under Finance.</p>
            )}
          </div>
        )}

        {section === 'advert' && (
          <AdvertPanel
            advertUrl={s.advertUrl}
            known={s.advertTitle || s.advertImageUrl ? { url: s.advertUrl, title: s.advertTitle, imageUrl: s.advertImageUrl, siteName: s.advertSite } : undefined}
            priceText={s.priceText}
            linked={linked}
            canSave={canSave}
            onUrl={(url) => setAdvert({ advertUrl: url, advertTitle: undefined, advertImageUrl: undefined, advertSite: siteFromUrl(url) })}
            onPreview={(p) => setAdvert({ advertTitle: p.title, advertImageUrl: p.imageUrl, advertSite: p.siteName ?? siteFromUrl(p.url) })}
            onUsePrice={(n) => patch({ priceText: String(n), section: 'finance' })}
            onSave={saveToShortlist}
            onViewCard={() => linked && nav.openShortlistItem(linked.id)}
          />
        )}

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
