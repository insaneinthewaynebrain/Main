/**
 * Turns MOT advisories and defects into "what probably needs fixing" plus
 * links to live prices on other websites. No prices are made up here.
 */
import { priceSearchSites, repairRules, type RepairRule } from '../../config/repairParts';
import type { MotDefect } from '../vehicle/types';

export interface RepairSuggestion {
  part: string;
  kind: RepairRule['kind'];
  /** The MOT wording that triggered it. */
  defects: MotDefect[];
  links: { label: string; url: string }[];
}

/** "YARIS DESIGN" → "Yaris", "MODEL Y LONG RANGE" → "Model Y", "320D M SPORT" → "320d". */
export function modelFamily(model?: string): string {
  if (!model) return '';
  const words = model.trim().split(/\s+/);
  const take = /^(model|class|series|grand|range|land)$/i.test(words[0]) || words[0].length <= 2 ? 2 : 1;
  return words
    .slice(0, take)
    .map((w) => (/\d/.test(w) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ');
}

function axle(text: string): string {
  if (/\b(front|nearside front|offside front)\b/i.test(text)) return 'Front ';
  if (/\b(rear|nearside rear|offside rear)\b/i.test(text)) return 'Rear ';
  return '';
}

const fill = (template: string, text: string) => {
  const s = template.replace('{axle}', axle(text));
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export function suggestRepairs(defects: MotDefect[], make?: string, model?: string): RepairSuggestion[] {
  const car = [make ? make.charAt(0).toUpperCase() + make.slice(1).toLowerCase() : '', modelFamily(model)].filter(Boolean).join(' ');
  const byPart = new Map<string, RepairSuggestion>();
  for (const d of defects) {
    if (!d.text) continue;
    const rule = repairRules.find((r) => r.pattern.test(d.text));
    if (!rule) continue;
    const part = fill(rule.part, d.text);
    const existing = byPart.get(part);
    if (existing) {
      existing.defects.push(d);
      continue;
    }
    const search = fill(rule.search, d.text).toLowerCase();
    const links: RepairSuggestion['links'] = [];
    if (rule.kind === 'part') {
      links.push({ label: priceSearchSites.parts.label, url: priceSearchSites.parts.url.replace('{q}', encodeURIComponent(`${car} ${search}`.trim())) });
    }
    links.push({
      label: priceSearchSites.repair.label,
      url: priceSearchSites.repair.url.replace('{q}', encodeURIComponent(`${car} ${search} replacement cost UK`.trim())),
    });
    byPart.set(part, { part, kind: rule.kind, defects: [d], links });
  }
  return [...byPart.values()];
}
