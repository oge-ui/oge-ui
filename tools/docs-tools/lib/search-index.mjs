import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { readApiBlocks } from './api-data.mjs';
import { decodeEntities } from './markdown.mjs';

/**
 * Builds `apps/dev-app/public/search-index.json`, the data behind the docs
 * site's Ctrl/⌘K palette (`apps/dev-app/src/app/shared/search/`).
 *
 * Three kinds of entries, all derived from the workspace — never typed twice:
 *
 * - `page`    every titled route (`app.routes.ts`), its label, the family or
 *             guide it belongs to and its SEO description (`seo.service.ts`).
 * - `section` every linkable heading on a page: `<app-demo-card heading="…">`
 *             and `<h2 id="…">`, with the anchor id the page renders.
 * - `api`     every `<app-api-reference>` block and every member row of its
 *             `*-api-data.ts` tables, anchored at the block's section.
 *
 * Framework tags (`f`): a page's own frameworks are decided at runtime from
 * `FrameworkService`'s coverage table (one source of truth), so pages carry no
 * tag. A heading or API row that belongs to only one render layer — the page
 * branches on the framework switch and renders an imported `react-*` file in
 * React — carries `f: 'angular' | 'react'`.
 *
 * The file is generated and committed (like `sitemap.xml`): `docs-tools:llms`
 * writes it and `docs-tools:llms-check` fails CI when it is stale, so the dev
 * server, the prerender, the e2e suite and the Vercel build all read the same
 * file with no build-order wiring.
 */

/** Same slugifier as `shared/demo-card.ts` — the ids the pages render. */
export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** The member tables of an API block, in page order. */
const API_TABLES = ['properties', 'methods', 'events', 'types'];

/** Context labels for pages outside `/components/<family>`. */
const TOP_LEVEL_CONTEXT = {
  'getting-started': 'Getting Started',
  ai: 'AI',
  license: 'Getting Started',
  changelog: 'Resources',
  'bundle-size': 'Resources',
  components: 'Components',
};

/**
 * @param {object} options
 * @param {string} options.workspaceRoot
 * @param {string} options.routesFile repo-relative `app.routes.ts`
 * @param {import('./routes.mjs').RoutePage[]} options.routes
 * @param {{ prefix: string, description: string }[]} options.seoDescriptions
 * @param {object[]} options.packages the manifest's `PACKAGES`
 * @returns {Promise<string>} the JSON file contents
 */
export async function buildSearchIndex({
  workspaceRoot,
  routesFile,
  routes,
  seoDescriptions,
  packages,
}) {
  const abs = (relative) => path.join(workspaceRoot, relative);
  const routesDir = path.dirname(abs(routesFile));
  const labels = new Map(routes.map((route) => [route.path, route.label]));

  /** route source file (absolute, no extension) → the page's URL path */
  const pageOfFile = new Map();
  /** route source file → the `react-*` files it renders in React */
  const reactPartsOf = new Map();
  for (const route of routes) {
    if (!route.source) continue;
    const file = path.resolve(routesDir, route.source);
    if (!pageOfFile.has(file)) pageOfFile.set(file, urlOf(route));
    reactPartsOf.set(file, reactImports(`${file}.ts`));
  }

  // ---------------------------------------------------------------- pages
  /** @type {{ p: string, t: string, c?: string, d?: string }[]} */
  const pages = [];
  /** url → index into `pages` */
  const pageIndex = new Map();
  for (const route of routes) {
    const url = urlOf(route);
    if (pageIndex.has(url)) continue;
    const page = { p: url, t: route.path === '' ? 'Home' : route.label };
    const context = contextOf(route.path, labels);
    if (context) page.c = context;
    const description = descriptionFor(url, seoDescriptions);
    if (description) page.d = description;
    pageIndex.set(url, pages.length);
    pages.push(page);
  }

  // ------------------------------------------------------------- sections
  /** @type {{ p: number, a: string, t: string, f?: string }[]} */
  const sections = [];
  const seenSections = new Set();
  const pushSection = (url, heading, framework) => {
    const p = pageIndex.get(url);
    const key = `${p}|${heading.id}|${framework ?? ''}`;
    if (p === undefined || seenSections.has(key)) return;
    seenSections.add(key);
    sections.push({
      p,
      a: heading.id,
      t: heading.text,
      ...(framework ? { f: framework } : {}),
    });
  };
  for (const route of routes) {
    if (!route.source) continue;
    const file = path.resolve(routesDir, route.source);
    const url = urlOf(route);
    const reactParts = reactPartsOf.get(file) ?? [];
    // a page that renders a React half shows its own headings in Angular only
    const own = reactParts.length > 0 ? 'angular' : undefined;
    for (const heading of readHeadings(`${file}.ts`)) {
      pushSection(url, heading, own);
    }
    for (const part of reactParts) {
      for (const heading of readHeadings(`${part}.ts`)) {
        pushSection(url, heading, 'react');
      }
    }
  }

  // ------------------------------------------------------------------ api
  /**
   * One entry per `<app-api-reference>` block; members are grouped by table
   * (`properties` / `methods` / `events` / `types`), and each table's anchor
   * is `<a>-<table>` — the ids `ApiReference` renders.
   *
   * @type {{ p: number, a: string, t: string, o: string, f?: string, m: Record<string, string[]> }[]}
   */
  const api = [];
  const seenBlocks = new Set();
  for (const pkg of packages) {
    const apiPages = pkg.apiPage
      ? Array.isArray(pkg.apiPage)
        ? pkg.apiPage
        : [pkg.apiPage]
      : [];
    for (const apiPage of apiPages) {
      const file = abs(apiPage);
      if (!existsSync(file)) continue;
      const base = file.replace(/\.ts$/, '');
      const ownUrl = pageOfFile.get(base);
      const url = ownUrl ?? hostPageOf(base, reactPartsOf, pageOfFile);
      if (!url) {
        throw new Error(
          `search index: ${apiPage} is neither a route nor rendered by one`,
        );
      }
      // a React half rendered inside an Angular page is React-only; the
      // page's own tables are Angular-only when it has such a half
      const framework =
        ownUrl === undefined
          ? 'react'
          : (reactPartsOf.get(base) ?? []).length > 0
            ? 'angular'
            : undefined;
      for (const block of await readApiBlocks(file)) {
        const anchor = slugify(block.title);
        const p = pageIndex.get(url);
        const key = `${p}|${anchor}|${framework ?? ''}`;
        if (p === undefined || seenBlocks.has(key)) continue;
        seenBlocks.add(key);
        /** @type {Record<string, string[]>} */
        const members = {};
        for (const [table, groups] of Object.entries(block.sections)) {
          if (!API_TABLES.includes(table)) continue;
          const names = [];
          for (const group of groups ?? []) {
            for (const row of group.entries ?? []) {
              const name = decodeEntities(row.name).replace(/\s+/g, ' ');
              if (!names.includes(name)) names.push(name);
            }
          }
          if (names.length) members[table] = names;
        }
        api.push({
          p,
          a: anchor,
          t: block.title,
          o: pkg.npm,
          ...(framework ? { f: framework } : {}),
          m: members,
        });
      }
    }
  }

  const list = (items) =>
    `[\n${items.map((item) => JSON.stringify(item)).join(',\n')}\n]`;
  return (
    `{"version":1,\n"pages":${list(pages)},\n"sections":${list(sections)},\n` +
    `"api":${list(api)}}\n`
  );
}

/** Where a route lands — its redirect target when the URL itself redirects. */
function urlOf(route) {
  return `/${route.landing ?? route.path}`;
}

/** `components/buttons/fab` → `Buttons`; `getting-started/setup` → `Getting Started`. */
function contextOf(routePath, labels) {
  if (routePath === '') return null;
  const [first, family] = routePath.split('/');
  if (first === 'components' && family) {
    const familyPath = `components/${family}`;
    return routePath === familyPath
      ? 'Components'
      : (labels.get(familyPath) ?? 'Components');
  }
  return TOP_LEVEL_CONTEXT[first] ?? null;
}

/** Exact entry first, then the longest whole-segment prefix — like `SeoService`. */
function descriptionFor(url, seoDescriptions) {
  let best = null;
  for (const entry of seoDescriptions) {
    if (entry.prefix === url) return entry.description;
    if (
      url.startsWith(`${entry.prefix}/`) &&
      (!best || entry.prefix.length > best.prefix.length)
    ) {
      best = entry;
    }
  }
  return best?.description ?? null;
}

/** The page whose route file renders `reactFile` in its React branch. */
function hostPageOf(reactFile, reactPartsOf, pageOfFile) {
  for (const [file, parts] of reactPartsOf) {
    if (parts.includes(reactFile)) return pageOfFile.get(file) ?? null;
  }
  return null;
}

/**
 * Relative imports of `react-*` page modules (not their data modules) —
 * the React half a page renders when the reader picked React.
 *
 * @param {string} file absolute `.ts` path
 * @returns {string[]} absolute paths without extension
 */
function reactImports(file) {
  const out = [];
  const queue = pageImports(file, true);
  while (queue.length) {
    const next = queue.shift();
    if (out.includes(next)) continue;
    out.push(next);
    // a React index page composes per-component parts (`./tree-view-api`)
    queue.push(...pageImports(`${next}.ts`, false));
  }
  return out;
}

/**
 * Relative page-module imports of `file`; with `reactOnly`, just the
 * `react-*` ones.
 */
function pageImports(file, reactOnly) {
  if (!existsSync(file)) return [];
  const source = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  const out = [];
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    if (!ts.isStringLiteralLike(statement.moduleSpecifier)) continue;
    const specifier = statement.moduleSpecifier.text;
    // `../react-buttons/overview`, or a sibling `./react-api` (locales)
    if (!specifier.startsWith('.')) continue;
    if (reactOnly && !/^\.\.?\/(?:[^/]+\/)*react-/.test(specifier)) continue;
    if (/-(snippets|api-data)$/.test(specifier)) continue;
    const resolved = path.resolve(path.dirname(file), specifier);
    // a page module, not a shared helper (`../../shared/react-host`)
    if (!resolved.split(path.sep).includes('pages')) continue;
    if (!out.includes(resolved)) out.push(resolved);
  }
  return out;
}

/**
 * Linkable headings in a page's inline template: demo-card `heading="…"`
 * attributes and `<h2 id="…">` / `<h3 id="…">` elements.
 *
 * @param {string} file absolute `.ts` path
 * @returns {{ id: string, text: string }[]}
 */
export function readHeadings(file) {
  if (!existsSync(file)) return [];
  const text = readFileSync(file, 'utf8');
  /** @type {{ id: string, text: string }[]} */
  const out = [];
  for (const match of text.matchAll(/<app-demo-card\b([^>]*?)>/g)) {
    const heading = /\sheading="([^"]+)"/.exec(match[1])?.[1];
    if (!heading) continue;
    const label = decodeEntities(heading).replace(/\s+/g, ' ').trim();
    if (label) out.push({ id: slugify(label), text: label });
  }
  for (const match of text.matchAll(
    /<h([23])\b[^>]*?\sid="([a-z0-9-]+)"[^>]*>([\s\S]*?)<\/h\1>/g,
  )) {
    const label = decodeEntities(match[3].replace(/<[^>]+>/g, ''))
      .replace(/\s+/g, ' ')
      .trim();
    if (label && !label.includes('{{')) out.push({ id: match[2], text: label });
  }
  return out;
}
