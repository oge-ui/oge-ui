import { describe, expect, it } from 'vitest';
import { DOCUMENT_TITLES, documentTitle } from './title.strategy';

describe('documentTitle', () => {
  it('names both frameworks on a page both layers cover', () => {
    expect(
      documentTitle('OGE — Button Group', '/components/buttons/button-group'),
    ).toBe('Button Group for Angular and React | OGE UI');
  });

  it('leads an Angular-only page with Angular', () => {
    expect(documentTitle('OGE — Routed Tabs', '/components/tabs/routed')).toBe(
      'Angular Routed Tabs | OGE UI',
    );
    expect(
      documentTitle('OGE — Routed Tabs', '/components/tabs/routed/members'),
    ).toBe('Angular Routed Tabs | OGE UI');
  });

  it('does not double a framework already in the title', () => {
    expect(documentTitle('OGE — Angular Charts', '/components/charts')).toBe(
      'Angular Charts | OGE UI',
    );
  });

  it('keeps guide pages framework-free', () => {
    expect(documentTitle('OGE — Getting Started', '/getting-started')).toBe(
      'Getting Started | OGE UI',
    );
  });

  it('ignores query and fragment when matching the path', () => {
    expect(
      documentTitle('OGE — Tabs', '/components/tabs?framework=react#usage'),
    ).toBe('Tabs for Angular and React | OGE UI');
  });

  it('uses the fixed home title for the landing page', () => {
    expect(
      documentTitle('OGE — UI components for Angular and React', '/'),
    ).toMatch(/^OGE UI — .*Angular and React/);
    expect(documentTitle(undefined, '/')).toMatch(/^OGE UI — /);
  });

  it('uses the hand-written titles of the commercial-intent pages', () => {
    expect(documentTitle('OGE — OGE UI vs AG Grid', '/compare/ag-grid')).toBe(
      'OGE UI vs AG Grid — Angular & React Alternative',
    );
    expect(documentTitle('OGE — Pricing', '/pricing?ref=x')).toMatch(
      /^OGE UI Pricing/,
    );
    for (const [path, title] of Object.entries(DOCUMENT_TITLES)) {
      expect(title.length, path).toBeLessThanOrEqual(60);
    }
  });
});
