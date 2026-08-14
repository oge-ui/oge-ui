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
      for (const { suffix, code, title } of collectSources(value)) {
        snippets.push({
          file: relative,
          name: `${name}${suffix}`,
          code,
          title,
          checkable: isStandaloneComponent(code),
        });
      }
    }
  }
  snippets.sort(
    (a, b) => a.file.localeCompare(b.file) || a.name.localeCompare(b.name),
  );
  return snippets;
}

/**
 * Normalises what a `*-snippets.ts` module may export into snippet sources.
 *
 * The Angular pages export bare strings, one constant per demo. The React
 * pages export arrays of `{ title, description, source }` because their demo
 * cards carry that metadata — so an array (or a single such object) is unwrapped
 * here rather than forcing one convention onto both apps. Anything else is
 * ignored, which is what keeps helper exports out of the docs.
 *
 * @param {unknown} value
 * @returns {Array<{ suffix: string, code: string }>}
 */
function collectSources(value) {
  if (typeof value === 'string') return [{ suffix: '', code: value }];
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      collectSources(entry).map(({ code, title }) => ({
        suffix: `[${index}]`,
        code,
        title,
      })),
    );
  }
  if (
    value &&
    typeof value === 'object' &&
    typeof (/** @type {{ source?: unknown }} */ (value).source) === 'string'
  ) {
    const record = /** @type {{ source: string, title?: unknown }} */ (value);
    return [
      {
        suffix: '',
        code: record.source,
        // The demo card's human title — used as the llms.txt heading instead
        // of the constant name + index, which reads as `Button demos[0]`.
        title: typeof record.title === 'string' ? record.title : undefined,
      },
    ];
  }
  return [];
}

/**
 * A snippet is checkable when it is a whole file: import statements plus a
 * component. Structural rather than a flag, so a fragment can never claim to be
 * complete and a complete one can never opt out of the gate.
 *
 * Two shapes qualify — an Angular `@Component` and a React component module,
 * which the `'use client'` pragma plus an exported function identifies.
 */
function isStandaloneComponent(code) {
  if (code.startsWith('import ') && code.includes('@Component(')) return true;
  // Props are allowed — `export function Demo({ children }: …)` is as much a
  // whole component module as a no-arg one, and exempting it would let any
  // props-taking React demo silently escape the gate.
  return (
    code.startsWith("'use client';") &&
    code.includes('import ') &&
    /export function \w+\(/.test(code)
  );
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
