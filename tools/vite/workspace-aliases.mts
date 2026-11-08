/**
 * Vite `resolve.alias` entries for every path mapping in `tsconfig.base.json`.
 *
 * Nx 24 removed `nxViteTsPaths`, and Vite's native `resolve.tsconfigPaths`
 * only rewrites imports in files that some tsconfig `include`s. Secondary
 * entry points such as `packages/grid/foundation/src` are compiled by
 * ng-packagr and sit outside every project tsconfig, so their `@oge-ui/*`
 * imports went unresolved under vitest. These aliases apply the workspace
 * mappings to every file, the way the removed Nx plugin did.
 *
 * Library builds are unaffected: Rollup checks `build.rollupOptions.external`
 * against the bare specifier before any alias runs.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

const escapeRegExp = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function workspaceAliases(): { find: RegExp; replacement: string }[] {
  const tsconfig = JSON.parse(
    readFileSync(join(workspaceRoot, 'tsconfig.base.json'), 'utf8'),
  );
  const paths: Record<string, string[]> = tsconfig.compilerOptions.paths ?? {};
  const exact: { find: RegExp; replacement: string }[] = [];
  const wildcard: { find: RegExp; replacement: string }[] = [];
  for (const [key, [target]] of Object.entries(paths)) {
    const absolute = join(workspaceRoot, target).replace(/\\/g, '/');
    if (key.includes('*')) {
      const [prefix, suffix] = key.split('*');
      wildcard.push({
        find: new RegExp(
          `^${escapeRegExp(prefix)}(.+)${escapeRegExp(suffix)}$`,
        ),
        replacement: absolute.replace('*', '$1'),
      });
    } else {
      exact.push({
        find: new RegExp(`^${escapeRegExp(key)}$`),
        replacement: absolute,
      });
    }
  }
  // exact mappings win over a wildcard that would also match them
  return [...exact, ...wildcard];
}
