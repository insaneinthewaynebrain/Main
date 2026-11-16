import { describe, expect, it } from 'vitest';
import { readSharedLink } from './share';

describe('readSharedLink', () => {
  it('reads ?share=, ?url= and links inside ?text=', () => {
    expect(readSharedLink('https://app/?share=https%3A%2F%2Fwww.autotrader.co.uk%2Fcar-details%2F1')?.url).toBe('https://www.autotrader.co.uk/car-details/1');
    expect(readSharedLink('https://app/?url=https://cars.example/ad')?.url).toBe('https://cars.example/ad');
    expect(readSharedLink('https://app/?text=Look%20at%20this%20https://cars.example/ad%20nice')?.url).toBe('https://cars.example/ad');
  });
  it('ignores pages without a link', () => {
    expect(readSharedLink('https://app/')).toBeUndefined();
    expect(readSharedLink('https://app/?share=not-a-link')).toBeUndefined();
  });
});
