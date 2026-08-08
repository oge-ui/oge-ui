import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

/**
 * Walks a package entry point's `index.ts` (following `export * from` chains)
 * and returns everything it makes public, split into runtime values and
 * type-only exports.
 *
 * Used for two things: the symbol inventory in `llms.txt`, and the coverage
 * report that flags exports with no API-reference entry.
 *
 * @param {string} entryFile absolute path to an `index.ts`
 * @returns {{ values: string[], types: string[] }} both sorted
 */
export function readEntryExports(entryFile) {
  /** @type {Set<string>} */
  const values = new Set();
  /** @type {Set<string>} */
  const types = new Set();
  /** @type {Set<string>} */
  const visited = new Set();
  collect(entryFile, values, types, visited);
  // A symbol re-exported both ways (rare) counts as a value.
  for (const name of values) types.delete(name);
  return {
    values: [...values].sort(),
    types: [...types].sort(),
  };
}

function collect(file, values, types, visited) {
  const resolved = resolveModule(file);
  if (resolved === null || visited.has(resolved)) return;
  visited.add(resolved);

  const source = ts.createSourceFile(
    resolved,
    readFileSync(resolved, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );

  for (const statement of source.statements) {
    if (ts.isExportDeclaration(statement)) {
      const specifier = ts.isStringLiteralLike(statement.moduleSpecifier ?? {})
        ? statement.moduleSpecifier.text
        : null;

      if (!statement.exportClause && specifier) {
        // `export * from './x'` — the star hides the names, so recurse.
        collect(
          path.resolve(path.dirname(resolved), specifier),
          values,
          types,
          visited,
        );
        continue;
      }
      if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        for (const element of statement.exportClause.elements) {
          const name = element.name.text;
          const typeOnly = statement.isTypeOnly || element.isTypeOnly;
          (typeOnly ? types : values).add(name);
        }
      }
      continue;
    }

    if (!hasExportModifier(statement)) continue;

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name))
          values.add(declaration.name.text);
      }
    } else if (
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement)
    ) {
      types.add(statement.name.text);
    } else if (
      (ts.isClassDeclaration(statement) ||
        ts.isFunctionDeclaration(statement) ||
        ts.isEnumDeclaration(statement)) &&
      statement.name
    ) {
      values.add(statement.name.text);
    }
  }
}

function hasExportModifier(node) {
  return (
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) ?? []).some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    )
  );
}

/** `./foo` → `./foo.ts` or `./foo/index.ts`. */
function resolveModule(file) {
  const candidates = file.endsWith('.ts')
    ? [file]
    : [`${file}.ts`, path.join(file, 'index.ts')];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

/**
 * Entry points declared in `tsconfig.base.json`, grouped by package folder.
 *
 * @param {string} workspaceRoot
 * @returns {Map<string, { specifier: string, entryFile: string }[]>}
 *   key is the folder under `packages/`
 */
export function readEntryPoints(workspaceRoot) {
  const tsconfig = JSON.parse(
    stripJsonComments(
      readFileSync(path.join(workspaceRoot, 'tsconfig.base.json'), 'utf8'),
    ),
  );
  const paths = tsconfig.compilerOptions?.paths ?? {};
  /** @type {Map<string, { specifier: string, entryFile: string }[]>} */
  const byPackage = new Map();
  for (const [specifier, targets] of Object.entries(paths)) {
    const target = targets[0];
    const match = /^\.\/packages\/([^/]+)\//.exec(target);
    if (!match) continue;
    const dir = match[1];
    const list = byPackage.get(dir) ?? [];
    list.push({
      specifier,
      entryFile: path.resolve(workspaceRoot, target),
    });
    byPackage.set(dir, list);
  }
  // Primary entry (shortest specifier) first, then secondary entries A→Z.
  for (const list of byPackage.values()) {
    list.sort(
      (a, b) =>
        a.specifier.length - b.specifier.length ||
        a.specifier.localeCompare(b.specifier),
    );
  }
  return byPackage;
}

/** tsconfig files allow comments; `JSON.parse` does not. */
function stripJsonComments(text) {
  return text
    .replace(
      /\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g,
      (match, comment) => (comment ? '' : match),
    )
    .replace(/,(\s*[}\]])/g, '$1');
}
