import { describe, expect, it } from 'vitest';
import { explainUnexpectedReply } from './unexpectedReply';

const netlifyLogin = '<!DOCTYPE html><html><head><title>Login Redirect</title></head><body><script>var url = new URL("https://app.netlify.com/edge-access?domain=x");</script></body></html>';

describe('explainUnexpectedReply', () => {
  it('says "not available on this copy" only on GitHub Pages', () => {
    expect(explainUnexpectedReply(404, '<html>Not found</html>', 'insaneinthewaynebrain.github.io').message).toMatch(/isn't available on this copy/);
    for (const host of ['hp-calc-wayne.netlify.app', 'localhost', 'example.com']) {
      expect(explainUnexpectedReply(404, '<html>Not found</html>', host).message).not.toMatch(/this copy/);
    }
  });
  it("recognises Netlify's visitor login page", () => {
    const e = explainUnexpectedReply(401, netlifyLogin, 'hp-calc-wayne.netlify.app');
    expect(e.message).toMatch(/site protection/);
  });
  it('explains missing functions and server errors', () => {
    expect(explainUnexpectedReply(404, 'Not Found', 'hp-calc-wayne.netlify.app').message).toMatch(/wasn't found/);
    expect(explainUnexpectedReply(502, 'Bad gateway', 'hp-calc-wayne.netlify.app')).toMatchObject({ code: 'UNAVAILABLE' });
  });
});
