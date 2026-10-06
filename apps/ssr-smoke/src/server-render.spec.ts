import { FAMILIES } from './hosts';
import { renderOnServer } from './render';

/**
 * Every Angular family's main components render on the server with no
 * browser globals (ARCHITECTURE → "SSR and hydration"). The environment is
 * plain Node, so an unguarded `window` / `document` / `localStorage` /
 * `ResizeObserver` read throws a ReferenceError instead of passing quietly as
 * it would under jsdom.
 */
describe('server render (renderApplication, no DOM globals)', () => {
  it('runs with no browser globals at all', () => {
    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');
    expect(typeof ResizeObserver).toBe('undefined');
    expect(typeof requestAnimationFrame).toBe('undefined');
  });

  for (const family of FAMILIES) {
    it(`${family.name}: renders with hydration annotations and a silent console`, async () => {
      const { html, console: lines } = await renderOnServer(family);

      expect(lines).toEqual([]);
      for (const cls of family.expect) expect(html).toContain(cls);
      // hydration annotations: the host carries `ngh`, the state script exists
      expect(html).toMatch(/<app-ssr-host[^>]*\sngh="/);
      expect(html).toContain('id="ng-state"');
      // the server platform must not leak its DOM into the globals
      expect(typeof window).toBe('undefined');
      expect(typeof document).toBe('undefined');
    });
  }
});
