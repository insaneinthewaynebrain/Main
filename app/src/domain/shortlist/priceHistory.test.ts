import { describe, expect, it } from 'vitest';
import { priceFromText, recordPrice, siteFromUrl, withChanges } from './priceHistory';

describe('recordPrice', () => {
  it('adds new prices, ignores repeats and replaces same-day changes', () => {
    let h = recordPrice([], { date: '2026-04-02', price: 19_132, site: 'autotrader.co.uk' });
    h = recordPrice(h, { date: '2026-05-01', price: 19_132 });
    expect(h).toHaveLength(1);
    h = recordPrice(h, { date: '2026-06-01', price: 18_500, site: 'cinch.co.uk' });
    h = recordPrice(h, { date: '2026-06-01', price: 18_250, site: 'cinch.co.uk' });
    expect(h.map((p) => p.price)).toEqual([19_132, 18_250]);
  });
  it('ignores zero or missing prices', () => {
    expect(recordPrice(undefined, { date: '2026-01-01', price: 0 })).toEqual([]);
  });
  it('fills in a missing site on a repeat sighting', () => {
    const h = recordPrice([{ date: '2026-01-01', price: 10_000 }], { date: '2026-02-01', price: 10_000, site: 'ebay.co.uk' });
    expect(h).toEqual([{ date: '2026-01-01', price: 10_000, site: 'ebay.co.uk', url: undefined }]);
  });
});

describe('withChanges', () => {
  it('lists newest first with the change from the previous price', () => {
    const c = withChanges([
      { date: '2026-04-02', price: 19_132 },
      { date: '2026-06-01', price: 18_250 },
    ]);
    expect(c.map((p) => [p.price, p.change])).toEqual([[18_250, -882], [19_132, undefined]]);
  });
});

describe('helpers', () => {
  it('gets the site name from a link', () => {
    expect(siteFromUrl('https://www.autotrader.co.uk/car-details/1')).toBe('autotrader.co.uk');
    expect(siteFromUrl('nonsense')).toBeUndefined();
  });
  it('finds the cash price in an advert title, not a monthly price', () => {
    expect(priceFromText('2021 Ford Focus 1.5 ST-Line | £13,995')).toBe(13_995);
    expect(priceFromText('Ford Focus £13995 or £229 per month')).toBe(13_995);
    expect(priceFromText('£229 per month')).toBeUndefined();
    expect(priceFromText('No price here')).toBeUndefined();
  });
});
