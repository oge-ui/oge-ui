import { describe, expect, it } from 'vitest';
import { documentTitle } from './title.strategy';

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

  it('shortens a component title that would pass 60 characters', () => {
    expect(
      documentTitle(
        'OGE — Data Grid Excel & PDF Export',
        '/components/data-grid/export',
      ),
    ).toBe('Data Grid Excel & PDF Export for Angular and React | OGE UI');
    expect(
      documentTitle(
        'OGE — Scheduler Resources & Availability',
        '/components/scheduler/resources-availability',
      ),
    ).toBe('Angular & React Scheduler Resources & Availability | OGE UI');
    expect(
      documentTitle(
        'OGE — Data Grid Range Selection & Clipboard',
        '/components/data-grid/range-selection',
      ),
    ).toBe('Angular & React Data Grid Range Selection & Clipboard');
  });

  it('uses the fixed home title for the landing page', () => {
    const home = documentTitle(
      'OGE — UI components for Angular and React',
      '/',
    );
    expect(home).toMatch(/^OGE UI — .*Angular & React/);
    expect(home.length).toBeLessThanOrEqual(60);
    expect(documentTitle(undefined, '/')).toMatch(/^OGE UI — /);
  });
});
