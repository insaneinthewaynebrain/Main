import { cleanAirConfig } from '../../config/cleanAirZones';
import type { CleanAirResult } from '../../domain/cleanAir/cleanAir';

const ICON: Record<CleanAirResult['status'], string> = {
  'likely-compliant': '✓',
  'possibly-compliant': '?',
  'likely-not-compliant': '✕',
  unknown: '?',
};

export default function CleanAirCard({ result }: { result: CleanAirResult }) {
  const checkers = Array.from(new Map(cleanAirConfig.zones.map((z) => [z.checker.url, z.checker])).values());
  return (
    <section className={`card clean-air clean-air--${result.status}`} aria-label="Clean air zones">
      <h2 className="card-title">Clean air zones</h2>
      <p className="caz-headline">
        <span className="caz-icon" aria-hidden="true">{ICON[result.status]}</span>
        {result.headline}
      </p>
      <p className="muted small">{result.basis}. DVLA data isn't definitive — always check the official checker.</p>
      {result.status !== 'likely-compliant' && (
        <ul className="zones">
          {cleanAirConfig.zones.map((z) => (
            <li key={z.name}>
              <span>{z.name}</span>
              <span className="muted">{z.chargesCars ? (z.note ?? 'Charges non-compliant cars') : z.note}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="link-row">
        {checkers.map((c) => (
          <a key={c.url} className="btn btn-small btn-ghost" href={c.url} target="_blank" rel="noopener noreferrer">
            {c.label} ↗
          </a>
        ))}
      </div>
    </section>
  );
}
