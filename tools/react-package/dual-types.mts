/**
 * Dual (ESM + CommonJS) type declarations for the React packages.
 *
 * The React packages are `"type": "module"` and ship both `index.js` (ESM)
 * and `index.cjs`. `vite-plugin-dts` emits one `.d.ts` tree with
 * extension-less relative specifiers (`from './lib/card'`), which is right
 * for `moduleResolution: "bundler"` but wrong everywhere else:
 *
 * - under `node16` / `nodenext` an ESM declaration file must spell its
 *   relative imports out (`./lib/card.js`), otherwise every re-export
 *   silently fails to resolve ("Internal resolution error" in
 *   `@arethetypeswrong/cli`);
 * - a `.d.ts` inside a `"type": "module"` package describes an ES module,
 *   so the `require` condition needs its own `.d.cts` tree or TypeScript
 *   treats the CommonJS entry as ESM ("Masquerading as ESM").
 *
 * This `afterBuild` hook rewrites every emitted `.d.ts` in place with
 * explicit `.js` specifiers and writes a `.d.cts` twin whose specifiers end
 * in `.cjs` (TypeScript maps `./x.cjs` to `./x.d.cts`). The package.json
 * `exports` map then points `import.types` at the `.d.ts` and
 * `require.types` at the `.d.cts`. Checked by `tools/package-check.mjs`.
 *
 *   dts({ …, afterBuild: ogeDualTypes })
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/** `from '…'`, `import '…'` and `import('…')` with a relative specifier. */
const RELATIVE_SPECIFIER =
  /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])(\.{1,2}\/[^'"]*)\2/g;

function resolveSpecifier(
  fromFile: string,
  specifier: string,
  declarations: ReadonlySet<string>,
): string | null {
  const base = resolve(dirname(fromFile), specifier);
  if (declarations.has(`${base}.d.ts`)) return specifier;
  if (declarations.has(join(base, 'index.d.ts'))) {
    return `${specifier.replace(/\/$/, '')}/index`;
  }
  // already explicit, or not a declaration (e.g. a stylesheet): leave it
  return null;
}

function rewrite(
  file: string,
  content: string,
  extension: '.js' | '.cjs',
  declarations: ReadonlySet<string>,
): string {
  return content.replace(
    RELATIVE_SPECIFIER,
    (match, prefix: string, quote: string, specifier: string) => {
      const target = resolveSpecifier(file, specifier, declarations);
      return target === null
        ? match
        : `${prefix}${quote}${target}${extension}${quote}`;
    },
  );
}

export function ogeDualTypes(emittedFiles: Map<string, string>): void {
  const declarations = new Set(
    [...emittedFiles.keys()]
      .filter((file) => file.endsWith('.d.ts'))
      .map((file) => resolve(file)),
  );
  for (const file of declarations) {
    const content = readFileSync(file, 'utf8');
    writeFileSync(file, rewrite(file, content, '.js', declarations));
    writeFileSync(
      file.replace(/\.d\.ts$/, '.d.cts'),
      rewrite(file, content, '.cjs', declarations),
    );
  }
}
