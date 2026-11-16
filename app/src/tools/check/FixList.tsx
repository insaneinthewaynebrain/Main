import { suggestRepairs } from '../../domain/repairs/repairs';
import type { MotTest } from '../../domain/vehicle/types';

/** "What might need fixing" from the latest MOT, with links to live prices. */
export default function FixList({ latest, make, model }: { latest?: MotTest; make?: string; model?: string }) {
  if (!latest) return null;
  const relevant = latest.defects.filter((d) => !['USER ENTERED', 'SYSTEM GENERATED'].includes(d.type.toUpperCase()));
  const fixes = suggestRepairs(relevant, make, model);
  if (relevant.length === 0) return null;
  return (
    <section className="card fixes" aria-label="What might need fixing">
      <h3 className="card-title">What might need fixing</h3>
      <p className="muted small">From the latest MOT. Prices open on other websites — check parts fit this exact car.</p>
      {fixes.length === 0 ? (
        <p className="muted small">No common parts recognised in these items — ask a garage for a quote.</p>
      ) : (
        <ul className="fix-list">
          {fixes.map((f) => (
            <li key={f.part} className="fix">
              <div className="fix-head">
                <strong>{f.part}</strong>
                <span className="muted small">{f.defects.length > 1 ? `${f.defects.length} items` : f.defects[0].type.toLowerCase()}</span>
              </div>
              <p className="muted small fix-why">{f.defects[0].text.replace(/\s*\([^()]*(\([^()]*\)[^()]*)*\)/g, '')}</p>
              <div className="link-row">
                {f.links.map((l) => (
                  <a key={l.url} className="btn btn-small btn-ghost" href={l.url} target="_blank" rel="noopener noreferrer">
                    {l.label} ↗
                  </a>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
