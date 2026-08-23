import { describe, expect, it } from 'vitest';
import { documentTitle } from './title.strategy';

describe('documentTitle', () => {
  it('leads component pages with the framework name', () => {
    expect(
      documentTitle('OGE — Button Group', '/components/buttons/button-group'),
    ).toBe('Angular Button Group | OGE UI');
  });

  it('does not double the framework prefix', () => {
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
    ).toBe('Angular Tabs | OGE UI');
  });

  it('uses the fixed home title for the landing page', () => {
    expect(documentTitle('OGE — Angular UI components', '/')).toMatch(
      /^OGE UI — /,
    );
    expect(documentTitle(undefined, '/')).toMatch(/^OGE UI — /);
  });
});
