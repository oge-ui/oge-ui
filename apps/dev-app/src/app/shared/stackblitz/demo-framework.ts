/**
 * Which render layer a docs code sample is a complete component of — or
 * `null` for a fragment (a shell command, a CSS block, a provider excerpt).
 *
 * This is the only part of "Open in StackBlitz" in the initial bundle: the
 * code block calls it to decide whether to show the button. The rule is the
 * same structural one `docs-tools:typecheck` uses to pick the snippets it
 * compiles (`tools/docs-tools/lib/snippets.mjs` → `isStandaloneComponent`),
 * and `docs-tools:stackblitz-check` fails when the two disagree — so every
 * compiled demo gets the button, and no fragment does.
 */
export type DemoFramework = 'angular' | 'react';

export function demoFramework(code: string): DemoFramework | null {
  if (code.startsWith('import ') && code.includes('@Component(')) {
    return 'angular';
  }
  if (
    code.startsWith("'use client';") &&
    code.includes('import ') &&
    /export function \w+\(/.test(code)
  ) {
    return 'react';
  }
  return null;
}
