#!/usr/bin/env node
/**
 * Generates the configurable-selector forms of the dark theme from the one
 * source, `themes/dark.css` (its explicit `.oge-theme-dark` block):
 *
 * - `themes/dark-class.css` — the same palette under `.dark` and
 *   `[data-theme='dark']`, the class and attribute strategies Tailwind v4 and
 *   most theme toggles use;
 * - `themes/dark.scss` — a Sass module whose `theme($selector)` mixin emits
 *   the palette under any selector, and `tokens` for the bare declarations.
 *
 * `node tools/themes/gen-dark-variants.mjs` rewrites both; `--check` fails
 * when either is stale (the themes spec runs the same comparison).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const themes = join(root, 'packages/grid/src/lib/styles/themes');

/** The body of the first `.oge-theme-dark, [data-oge-theme='dark']` rule. */
export function darkBody(css) {
  const text = css.replace(/\r\n/g, '\n');
  const start = text.indexOf(".oge-theme-dark,\n[data-oge-theme='dark'] {");
  if (start < 0) throw new Error('dark.css: explicit dark block not found');
  const open = text.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return text.slice(open + 1, i);
  }
  throw new Error('dark.css: unbalanced braces');
}

export function renderDarkClass(body) {
  return `/**
 * Dark theme under your app's own dark switch — GENERATED from dark.css by
 * tools/themes/gen-dark-variants.mjs; edit dark.css, then regenerate.
 *
 * The same palette as dark.css, under the selectors theme toggles already
 * set, so OGE goes dark with the rest of the page:
 *
 *   <html class="dark">            Tailwind v4 class strategy
 *                                  (@custom-variant dark (&:where(.dark, .dark *));)
 *   <html data-theme="dark">       the attribute strategy
 *
 * Import it instead of (or next to) dark.css:
 *
 *   @import '@oge-ui/core/themes/dark-class.css';
 *
 * Another selector? Use the Sass mixin in dark.scss, or put
 * class="oge-theme-dark" on the same element.
 */
.dark,
[data-theme='dark'] {${body}}
`;
}

export function renderDarkScss(body) {
  const tokens = body
    .split('\n')
    .filter((line) => !/^\s*color-scheme:/.test(line))
    .join('\n');
  return `// Dark theme as a Sass module — GENERATED from dark.css by
// tools/themes/gen-dark-variants.mjs; edit dark.css, then regenerate.
//
//   @use '@oge-ui/core/themes/dark.scss' as oge-dark;
//   @include oge-dark.theme('.dark');                  // your dark class
//   @include oge-dark.theme('[data-mode="night"]');    // any selector
//
// \`tokens\` is the bare palette, to place inside a rule of your own
// (a media query, a cascade layer).

/// The dark palette: every \`--oge-*\` declaration of dark.css.
@mixin tokens {${tokens}}

/// The dark theme under \`$selector\` (default \`.dark\`), native controls
/// included (\`color-scheme: dark\`).
@mixin theme($selector: '.dark') {
  #{$selector} {
    color-scheme: dark;
    @include tokens;
  }
}
`;
}

function main() {
  const check = process.argv.includes('--check');
  const body = darkBody(readFileSync(join(themes, 'dark.css'), 'utf8'));
  const outputs = {
    'dark-class.css': renderDarkClass(body),
    'dark.scss': renderDarkScss(body),
  };
  let stale = 0;
  for (const [file, text] of Object.entries(outputs)) {
    const path = join(themes, file);
    if (check) {
      let current = '';
      try {
        current = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
      } catch {
        // missing counts as stale
      }
      if (current !== text) {
        stale++;
        console.error(
          `✗ ${file} is stale — run node tools/themes/gen-dark-variants.mjs`,
        );
      }
    } else {
      writeFileSync(path, text);
      console.log(`wrote ${file}`);
    }
  }
  if (stale) process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
