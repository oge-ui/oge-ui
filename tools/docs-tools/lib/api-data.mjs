import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createJiti } from 'jiti';
import ts from 'typescript';
import { decodeEntities } from './markdown.mjs';

/**
 * @typedef {{ name: string, type: string, default?: string, description: string }} ApiEntry
 * @typedef {{ title?: string, entries: ApiEntry[] }} ApiGroup
 * @typedef {{ properties?: ApiGroup[], methods?: ApiGroup[], events?: ApiGroup[], types?: ApiGroup[] }} ApiSections
 * @typedef {{ title: string, selector?: string, sections: ApiSections }} ApiBlock
 */

// The `*-api-data.ts` modules only ever `import type` from the docs app, so they
// load in plain Node without Angular. jiti handles the TS syntax.
const jiti = createJiti(import.meta.url, { interopDefault: true });

/**
 * Reads the API reference blocks an API page renders, in page order, resolving
 * each `[sections]` binding back to the exported `*-api-data.ts` constant.
 *
 * Derived rather than hand-listed so a new `<app-api-reference>` on a docs page
 * shows up in `llms.txt` without a second edit.
 *
 * @param {string} apiPageFile absolute path to a `pages/<family>/api.ts`
 * @returns {Promise<ApiBlock[]>}
 */
export async function readApiBlocks(apiPageFile) {
  const text = readFileSync(apiPageFile, 'utf8');
  const source = ts.createSourceFile(
    apiPageFile,
    text,
    ts.ScriptTarget.Latest,
    true,
  );

  const template = findTemplate(source);
  if (template === null) {
    throw new Error(`No inline \`template\` found in ${apiPageFile}`);
  }
  const references = parseApiReferences(template, apiPageFile);
  const fieldToConst = readFieldAliases(source);
  const namespace = await loadApiDataModules(source, apiPageFile);

  /** @type {ApiBlock[]} */
  const blocks = [];
  for (const reference of references) {
    const constName = fieldToConst.get(reference.sections);
    if (!constName) {
      throw new Error(
        `${apiPageFile}: \`[sections]="${reference.sections}"\` has no matching class field`,
      );
    }
    const sections = namespace[constName];
    if (!sections) {
      throw new Error(
        `${apiPageFile}: \`${constName}\` is not exported by any *-api-data module`,
      );
    }
    blocks.push({
      title: reference.title,
      selector: reference.selector,
      sections,
    });
  }
  return blocks;
}

/** @param {ts.SourceFile} source */
function findTemplate(source) {
  /** @type {string | null} */
  let template = null;
  const visit = (node) => {
    if (
      template === null &&
      ts.isPropertyAssignment(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'template' &&
      ts.isNoSubstitutionTemplateLiteral(node.initializer)
    ) {
      template = node.initializer.text;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return template;
}

/**
 * @param {string} template
 * @param {string} file
 * @returns {{ title: string, selector?: string, sections: string }[]}
 */
function parseApiReferences(template, file) {
  const occurrences = (template.match(/<app-api-reference\b/g) ?? []).length;
  const matches = [...template.matchAll(/<app-api-reference\b([\s\S]*?)\/>/g)];
  if (matches.length !== occurrences) {
    throw new Error(
      `${file}: found ${occurrences} <app-api-reference> tags but only ${matches.length} self-closing ones — the parser expects the self-closing form`,
    );
  }
  return matches.map(([, attributes]) => {
    const title = attributes.match(/\btitle="([^"]*)"/)?.[1];
    const selector = attributes.match(/\bselector="([^"]*)"/)?.[1];
    const sections = attributes.match(/\[sections\]="([^"]*)"/)?.[1];
    if (!title || !sections) {
      throw new Error(
        `${file}: an <app-api-reference> is missing title or [sections]`,
      );
    }
    return { title, selector, sections };
  });
}

/** `protected readonly modalApi = OGE_MODAL_API;` → `modalApi` → `OGE_MODAL_API`. */
function readFieldAliases(source) {
  /** @type {Map<string, string>} */
  const aliases = new Map();
  const visit = (node) => {
    if (
      ts.isPropertyDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isIdentifier(node.initializer)
    ) {
      aliases.set(node.name.text, node.initializer.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return aliases;
}

/**
 * Loads every `*-api-data` module the page imports and merges their exports —
 * a family may split its tables across files (layout → `accordion-api-data`).
 */
async function loadApiDataModules(source, apiPageFile) {
  /** @type {Record<string, ApiSections>} */
  const merged = {};
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    if (!ts.isStringLiteralLike(statement.moduleSpecifier)) continue;
    const specifier = statement.moduleSpecifier.text;
    if (!specifier.endsWith('-api-data')) continue;
    const resolved = path.resolve(path.dirname(apiPageFile), `${specifier}.ts`);
    const namespace = await jiti.import(resolved);
    Object.assign(merged, namespace);
  }
  return merged;
}

/**
 * Every member name documented anywhere in a block list, normalized for the
 * coverage report: lowercased with punctuation dropped, so the table's
 * `*ogeCellTemplate` matches the exported `OgeCellTemplate`, and a method's
 * `focus(position)` signature matches `focus`.
 */
export function documentedNames(blocks) {
  /** @type {Set<string>} */
  const names = new Set();
  const add = (raw) => {
    const bare = raw.replace(/[(<].*$/s, '');
    // a row may document several aliases: `width / height / minWidth`
    for (const part of bare.split('/')) {
      const key = normalizeName(part);
      if (key) names.add(key);
    }
  };
  for (const block of blocks) {
    add(block.title);
    for (const groups of Object.values(block.sections)) {
      for (const group of groups ?? []) {
        // a group title is how a symbol with only a few members is documented
        // (`OgeToastRef`, `OgeAnchoredPanelOptions`) — it counts as coverage
        if (group.title) add(group.title);
        for (const entry of group.entries ?? []) add(entry.name);
      }
    }
  }
  return names;
}

/**
 * `*ogeCellTemplate`, `OgeCellTemplate` and `oge-cell-template` all collapse.
 * Entities are decoded first: table names carry escaped generics
 * (`OgeModalRef&lt;R&gt;`), and without decoding the `lt`/`gt` letters survive
 * the strip and never match the exported symbol.
 */
export function normalizeName(name) {
  return decodeEntities(name)
    .replace(/[<(].*$/s, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}
