import { describe, expect, it } from 'vitest';
import { DESCRIPTIONS, descriptionFor } from './seo.service';

describe('descriptionFor', () => {
  it('prefers the exact entry over a family prefix', () => {
    expect(descriptionFor('/components/data-grid/filtering')).not.toBe(
      descriptionFor('/components/data-grid'),
    );
    expect(descriptionFor('/components/data-grid/filtering')).toContain(
      'filter',
    );
  });

  it('lets untitled demo children inherit their page', () => {
    expect(descriptionFor('/components/tabs/routed/members')).toBe(
      descriptionFor('/components/tabs/routed'),
    );
  });

  it('matches whole segments only', () => {
    // `/components/tabs` must not claim a hypothetical `/components/tabsx`
    expect(descriptionFor('/components/tabsx')).toBe(
      descriptionFor('/components'),
    );
    expect(descriptionFor('/nowhere')).toBe(descriptionFor('/'));
  });

  it('keeps every entry unique and within the snippet length', () => {
    const texts = DESCRIPTIONS.map(([, text]) => text);
    expect(new Set(texts).size).toBe(texts.length);
    expect(new Set(DESCRIPTIONS.map(([path]) => path)).size).toBe(
      DESCRIPTIONS.length,
    );
    for (const [path, text] of DESCRIPTIONS) {
      expect(
        text.length >= 140 && text.length <= 160,
        `${path}: ${text.length}`,
      ).toBe(true);
    }
  });
});
