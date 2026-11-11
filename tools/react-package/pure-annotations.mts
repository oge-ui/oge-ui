import type { Plugin } from 'vite';

/**
 * Marks module-level `forwardRef(…)`, `memo(…)` and `createContext(…)` calls
 * `/* @__PURE__ *\/` while a React package is built.
 *
 * A bundler keeps every top-level call it cannot prove free of side effects —
 * and with it every component the call receives, and everything those
 * components reference. Unmarked, `export const OgeSimpleTable =
 * forwardRef(…)` made an app that imported one component bundle the whole
 * family (`tools/tree-shake-check.mjs` measures it). React's own factories
 * are pure, so the annotation is always correct; doing it at build time keeps
 * the sources readable and cannot be forgotten on a new component.
 *
 * Only declarations at the start of a line are touched (`const X = …` /
 * `export const X = …`, with an optional type annotation), i.e. module scope
 * in Prettier-formatted code; calls inside functions are left alone.
 */
const TOP_LEVEL_FACTORY =
  /^((?:export\s+)?const\s+[A-Za-z_$][\w$]*(?:\s*:[^=\n]+)?\s*=\s*)(?=(?:React\.)?(?:forwardRef|memo|createContext)\b)/gm;

/** Adds the annotation; exported for the unit test. */
export function ogeAnnotatePureFactories(code: string): string {
  return code.replace(TOP_LEVEL_FACTORY, '$1/* @__PURE__ */ ');
}

export function ogePureAnnotations(): Plugin {
  return {
    name: 'oge:pure-annotations',
    enforce: 'pre',
    apply: 'build',
    transform(code, id) {
      if (!/\.[cm]?tsx?$/.test(id) || id.includes('node_modules')) return null;
      const next = ogeAnnotatePureFactories(code);
      return next === code ? null : { code: next, map: null };
    },
  };
}
