import { useEffect, useLayoutEffect } from 'react';

/**
 * `useLayoutEffect` in the browser, `useEffect` on the server.
 *
 * `'use client'` components are still **server-rendered** — the directive
 * only marks the hydration boundary — and React warns on every server render
 * that uses `useLayoutEffect`. The effect cannot run there anyway (no DOM to
 * measure), so downgrading to `useEffect` is the canonical shim.
 */
export const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;
