import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

/**
 * The data the docs site's "Open in StackBlitz" builder needs, generated from
 * the workspace so it cannot drift:
 *
 * - **toolchain versions** — the Angular, React, Vite and TypeScript versions
 *   the root `package.json` builds and tests the suite with, plus the optional
 *   export peers (`exceljs`, `jspdf`, `jspdf-autotable`);
 * - **the `@oge-ui/*` package graph** — each package's `@oge-ui/*`
 *   dependencies (the React stylesheet closure follows them), whether it is
 *   commercial (its `license` is not MIT) and whether it exports a
 *   `./styles.css`.
 *
 * The `@oge-ui/*` version itself is not repeated here: the builder reads
 * `SITE_VERSION`, which is generated from `packages/ui/package.json` — the one
 * file `nx release` bumps.
 */

/** Root `package.json` entries a generated project depends on. */
const TOOLCHAIN = [
  '@angular/build',
  '@angular/cli',
  '@angular/common',
  '@angular/compiler',
  '@angular/compiler-cli',
  '@angular/core',
  '@angular/forms',
  '@angular/platform-browser',
  '@angular/router',
  '@types/react',
  '@types/react-dom',
  '@vitejs/plugin-react',
  'exceljs',
  'jspdf',
  'jspdf-autotable',
  'react',
  'react-dom',
  'rxjs',
  'tslib',
  'typescript',
  'vite',
];

/**
 * @param {string} workspaceRoot
 * @returns {string} the contents of `shared/stackblitz/stackblitz-manifest.ts`
 */
export function buildStackblitzManifestFile(workspaceRoot) {
  const root = JSON.parse(
    readFileSync(path.join(workspaceRoot, 'package.json'), 'utf8'),
  );
  const declared = { ...root.dependencies, ...root.devDependencies };
  const toolchain = {};
  for (const name of TOOLCHAIN) {
    if (!declared[name]) {
      throw new Error(
        `stackblitz manifest: the root package.json declares no "${name}"`,
      );
    }
    toolchain[name] = declared[name];
  }

  const packages = {};
  for (const manifest of readOgePackages(workspaceRoot)) {
    const deps = Object.keys(manifest.dependencies ?? {})
      .filter((name) => isOgePackage(name))
      .sort();
    packages[manifest.name] = {
      deps,
      commercial: manifest.license !== 'MIT',
      styles: Boolean(manifest.exports?.['./styles.css']),
    };
  }
  const sorted = Object.fromEntries(
    Object.entries(packages).sort(([a], [b]) => a.localeCompare(b)),
  );

  return `/**
 * Versions and the \`@oge-ui/*\` package graph behind "Open in StackBlitz".
 *
 * GENERATED — do not edit. Derived from the root package.json (toolchain) and
 * every @oge-ui package.json under packages/ by \`npx nx run docs-tools:llms\`
 * (tools/docs-tools/lib/stackblitz.mjs), and checked by
 * \`docs-tools:llms-check\`. The @oge-ui version is SITE_VERSION.
 */

export interface StackblitzPackageInfo {
  /** The package's own \`@oge-ui/*\` dependencies. */
  readonly deps: readonly string[];
  /** Licensed commercially (ADR 0003) rather than MIT. */
  readonly commercial: boolean;
  /** Exports \`./styles.css\` (every React render-layer package). */
  readonly styles: boolean;
}

export const STACKBLITZ_TOOLCHAIN = ${JSON.stringify(toolchain, null, 2)} as const;

export const STACKBLITZ_PACKAGES: Readonly<
  Record<string, StackblitzPackageInfo>
> = ${JSON.stringify(sorted, null, 2)};
`;
}

/** `oge-ui` (the umbrella) or any `@oge-ui/*` package. */
function isOgePackage(name) {
  return name === 'oge-ui' || name.startsWith('@oge-ui/');
}

/** Every publishable package manifest under `packages/` and `packages/react/`. */
function readOgePackages(workspaceRoot) {
  const found = [];
  const scan = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const file = path.join(dir, entry.name, 'package.json');
      if (!existsSync(file)) continue;
      const manifest = JSON.parse(readFileSync(file, 'utf8'));
      if (manifest.private || !isOgePackage(manifest.name ?? '')) continue;
      found.push(manifest);
    }
  };
  scan(path.join(workspaceRoot, 'packages'));
  scan(path.join(workspaceRoot, 'packages', 'react'));
  return found;
}
