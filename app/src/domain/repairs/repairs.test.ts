import { describe, expect, it } from 'vitest';
import { modelFamily, suggestRepairs } from './repairs';

const adv = (text: string) => ({ text, type: 'ADVISORY', dangerous: false });

describe('modelFamily', () => {
  it('shortens MOT model names to the family', () => {
    expect(modelFamily('YARIS DESIGN')).toBe('Yaris');
    expect(modelFamily('MODEL Y LONG RANGE')).toBe('Model Y');
    expect(modelFamily('320D M SPORT')).toBe('320d');
    expect(modelFamily('FOCUS ST-LINE')).toBe('Focus');
    expect(modelFamily(undefined)).toBe('');
  });
});

describe('suggestRepairs', () => {
  it('names the part, front/rear, and links to live prices for this car', () => {
    const [s] = suggestRepairs([adv('Front brake disc worn, pitted or scored (1.1.14 (a) (ii))')], 'FORD', 'FOCUS ST-LINE');
    expect(s.part).toBe('Front brake discs');
    expect(s.kind).toBe('part');
    expect(s.links[0].url).toBe('https://www.ebay.co.uk/sch/i.html?_nkw=Ford%20Focus%20front%20brake%20discs');
    expect(s.links[1].url).toContain('google.com/search?q=Ford%20Focus%20front%20brake%20discs%20replacement%20cost%20UK');
  });
  it('groups the same part and ignores wording it cannot match', () => {
    const s = suggestRepairs(
      [adv('Nearside front tyre worn close to legal limit'), adv('Offside front tyre worn close to legal limit'), adv('Something unusual')],
      'TOYOTA',
      'YARIS',
    );
    expect(s).toHaveLength(1);
    expect(s[0].part).toBe('Tyres');
    expect(s[0].defects).toHaveLength(2);
  });
  it('labour-type repairs only get a repair-cost link', () => {
    const [s] = suggestRepairs([adv('Oil leak, but not excessive')], 'BMW', '320D');
    expect(s.kind).toBe('repair');
    expect(s.links).toHaveLength(1);
  });
  it('specific rules beat general ones', () => {
    expect(suggestRepairs([adv('Brake pipe slightly corroded')])[0].part).toBe('Brake pipes / hoses');
    expect(suggestRepairs([adv('Offside sill corroded')])[0].part).toBe('Corrosion / welding repair');
  });
});
