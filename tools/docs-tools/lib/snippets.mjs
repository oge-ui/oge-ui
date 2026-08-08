import { readdirSync } from 'node:fs';
import path from 'node:path';
import { createJiti } from 'jiti';

// `*-snippets.ts` modules are pure data (they only import `demo-source.ts`,
// which is Angular-free) — exactly like `*-api-data.ts`. That is what makes the
// docs snippets readable from Node, and therefore checkable.
const jiti = createJiti(import.meta.url, { interopDefault: true });

/**
 * @typedef {object} Snippet
 * @property {string} file repo-relative module the snippet came from
 * @property {string} name exported constant name
 * @property {string} code the snippet source
 * @property {boolean} checkable true when it is a full standalone component and
 *   can therefore be type-checked; `codeSnippet()` fragments are false
 */

/**
 * Loads every docs snippet in the workspace.
 *
 * @param {string} pagesDir absolute path to `apps/dev-app/src/app/pages`
 * @param {string} workspaceRoot for the repo-relative `file` field
 * @returns {Promise<Snippet[]>} sorted by file then name
 */
export async function readSnippets(pagesDir, workspaceRoot) {
  /** @type {Snippet[]} */
  const snippets = [];
  for (const file of findSnippetModules(pagesDir)) {
    const namespace = await jiti.import(file);
    const relative = path
      .relative(workspaceRoot, file)
      .split(path.sep)
      .join('/');
    for (const [name, value] of Object.entries(namespace)) {
      if (typeof value !== 'string') continue;
      snippets.push({
        file: relative,
        name,
        code: value,
        checkable: isStandaloneComponent(value),
      });
    }
  }
  snippets.sort(
    (a, b) => a.file.localeCompare(b.file) || a.name.localeCompare(b.name),
  );
  return snippets;
}

/**
 * A snippet is checkable when it is a whole file: import statements plus a
 * component. Structural rather than a flag, so a fragment can never claim to be
 * complete and a complete one can never opt out of the gate.
 */
function isStandaloneComponent(code) {
  return code.startsWith('import ') && code.includes('@Component(');
}

/** @param {string} dir @returns {string[]} absolute paths */
function findSnippetModules(dir) {
  /** @type {string[]} */
  const found = [];
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith('-snippets.ts')) {
        found.push(full);
      }
    }
  };
  walk(dir);
  found.sort();
  return found;
}
