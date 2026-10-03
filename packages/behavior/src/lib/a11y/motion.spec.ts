import { afterEach, describe, expect, it, vi } from 'vitest';
import { motionScrollBehavior, prefersReducedMotion } from './motion';

describe('motion preferences', () => {
  const original = window.matchMedia;

  afterEach(() => {
    window.matchMedia = original;
  });

  function mockReduced(matches: boolean): void {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)' && matches,
      media: query,
    })) as unknown as typeof window.matchMedia;
  }

  it('reports the reduced-motion preference', () => {
    mockReduced(true);
    expect(prefersReducedMotion()).toBe(true);
    mockReduced(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  it('scrolls instantly under reduced motion, smoothly otherwise', () => {
    mockReduced(true);
    expect(motionScrollBehavior()).toBe('auto');
    mockReduced(false);
    expect(motionScrollBehavior()).toBe('smooth');
  });

  it('answers false without matchMedia (SSR, bare jsdom)', () => {
    window.matchMedia = undefined as unknown as typeof window.matchMedia;
    expect(prefersReducedMotion()).toBe(false);
    expect(motionScrollBehavior()).toBe('smooth');
  });

  it('answers false when matchMedia throws', () => {
    window.matchMedia = (() => {
      throw new Error('nope');
    }) as unknown as typeof window.matchMedia;
    expect(prefersReducedMotion()).toBe(false);
  });
});
