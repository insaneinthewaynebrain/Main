import { describe, expect, it } from 'vitest';
import { photoSearchTerm, photoSearchUrl, pickPhoto } from './carPhoto';

// Shape of a MediaWiki "generator=search&prop=pageimages|info" response.
const sample = {
  query: {
    pages: {
      '1': { pageid: 1, title: 'Toyota Yaris (XP210)', index: 2, fullurl: 'https://en.wikipedia.org/wiki/Toyota_Yaris_(XP210)', thumbnail: { source: 'https://upload.wikimedia.org/a.jpg', width: 800, height: 500 } },
      '2': { pageid: 2, title: 'Toyota', index: 1, fullurl: 'https://en.wikipedia.org/wiki/Toyota', thumbnail: { source: 'https://upload.wikimedia.org/logo.jpg' } },
      '3': { pageid: 3, title: 'Toyota Yaris', index: 3, fullurl: 'https://en.wikipedia.org/wiki/Toyota_Yaris' },
    },
  },
};

describe('car photo lookup', () => {
  it('builds the search from make and model family', () => {
    expect(photoSearchTerm('TOYOTA', 'YARIS DESIGN')).toBe('Toyota Yaris');
    expect(photoSearchTerm('TOYOTA', undefined)).toBeUndefined();
    const url = new URL(photoSearchUrl('Toyota Yaris'));
    expect(url.hostname).toBe('en.wikipedia.org');
    expect(url.searchParams.get('origin')).toBe('*');
    expect(url.searchParams.get('gsrsearch')).toBe('Toyota Yaris car');
  });
  it('prefers a result naming the model that has a photo', () => {
    expect(pickPhoto(sample, 'Toyota Yaris')).toEqual({
      imageUrl: 'https://upload.wikimedia.org/a.jpg',
      pageUrl: 'https://en.wikipedia.org/wiki/Toyota_Yaris_(XP210)',
      title: 'Toyota Yaris (XP210)',
    });
  });
  it('copes with empty or odd responses', () => {
    expect(pickPhoto({}, 'Toyota Yaris')).toBeUndefined();
    expect(pickPhoto(null, 'Toyota Yaris')).toBeUndefined();
  });
});
