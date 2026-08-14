#!/usr/bin/env node
/**
 * Generates the machine-readable documentation set that coding assistants read:
 *
 *   apps/dev-app/public/llms.txt          the llmstxt.org index for ogeui.com
 *   apps/dev-app/public/llms-full.txt     every API table and demo, inlined
 *   apps/dev-app/public/llms/<pkg>.txt    one full reference per package
 *   packages/<pkg>/llms.txt               the same file, shipped in the tarball
 *   apps/dev-app/public/sitemap.xml       derived from app.routes.ts
 *
 * Everything is derived from the workspace — routes, `<app-api-reference>`
 * blocks, `*-api-data.ts` tables, entry-point exports and `*-snippets.ts` demo
 * sources — so the output cannot drift from the site. `--check` regenerates in
 * memory and fails when the committed files differ, which is what keeps the
 * committed artifacts honest in CI.
 *
 * Usage: node tools/docs-tools/generate-llms.mjs [--check]
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import {
  readApiBlocks,
  documentedNames,
  normalizeName,
} from './lib/api-data.mjs';
import { readEntryExports, readEntryPoints } from './lib/exports.mjs';
import {
  GUIDE_DIRS,
  PACKAGES,
  PATHS,
  REPO_URL,
  SITE_ORIGIN,
} from './lib/manifest.mjs';
import { sectionsToMarkdown } from './lib/markdown.mjs';
import {
  COMMERCIAL_NOTE,
  CONVENTIONS,
  CONVENTIONS_REACT,
  INSTALL,
  MISTAKES,
  MISTAKES_REACT,
  SUMMARY,
  readSiteVersion,
  buildSiteVersionFile,
} from './lib/prose.mjs';
import { readRoutes, readSeoDescriptions } from './lib/routes.mjs';
import { readSnippets } from './lib/snippets.mjs';

const workspaceRoot = process.cwd();
const checkOnly = process.argv.includes('--check');
const abs = (...parts) => path.join(workspaceRoot, ...parts);

// One source of truth for the version: the file `nx release` bumps. Every
// other place it appears — the site badge, the llms artifacts — is generated
// from here, so a release cannot leave one of them behind.
const version = readSiteVersion(abs('packages/ui/package.json'), readFileSync);
const routes = readRoutes(abs(PATHS.routes));
const seoDescriptions = readSeoDescriptions(abs(PATHS.seo));
const entryPoints = readEntryPoints(workspaceRoot);
const snippets = await readSnippets(abs(PATHS.pagesDir), workspaceRoot);

/** @type {Map<string, { pkg: object, blocks: any[], entries: any[], demos: any[] }>} */
const docs = new Map();
for (const pkg of PACKAGES) {
  // A package can land in the manifest before its docs page exists (a family
  // still being built). Warn and carry on rather than blocking the whole set.
  // A package with more than one family (layout: accordion + splitter) lists
  // one API page per family, in the order they should appear.
  const apiPages = pkg.apiPage
    ? Array.isArray(pkg.apiPage)
      ? pkg.apiPage
      : [pkg.apiPage]
    : [];
  const blocks = [];
  for (const apiPage of apiPages) {
    if (!existsSync(abs(apiPage))) {
      console.warn(
        `! ${pkg.npm}: API page ${apiPage} does not exist yet — no API reference in its llms.txt`,
      );
      continue;
    }
    blocks.push(...(await readApiBlocks(abs(apiPage))));
  }
  const entries = (entryPoints.get(pkg.dir) ?? []).map((entry) => ({
    ...entry,
    exports: readEntryExports(entry.entryFile),
  }));
  const demos = snippets.filter((snippet) =>
    pkg.pageDirs.includes(pageDirOf(snippet.file)),
  );
  docs.set(pkg.dir, { pkg, blocks, entries, demos });
}

/** @type {Map<string, string>} repo-relative path → contents */
const artifacts = new Map();
artifacts.set(`${PATHS.publicDir}/llms.txt`, buildIndex());
artifacts.set(`${PATHS.publicDir}/llms-full.txt`, buildFull());
for (const [dir, doc] of docs) {
  const contents = buildPackageDoc(doc);
  artifacts.set(`${PATHS.publicDir}/llms/${dir}.txt`, contents);
  artifacts.set(`packages/${dir}/llms.txt`, contents);
}
artifacts.set(`${PATHS.publicDir}/sitemap.xml`, buildSitemap());
artifacts.set(
  'apps/dev-app/src/app/shared/site-version.ts',
  buildSiteVersionFile(version),
);

reportGaps();

if (checkOnly) {
  const stale = [];
  for (const [relative, contents] of artifacts) {
    const file = abs(relative);
    // `core.autocrlf` is on in this repo, so the working copy carries CRLF —
    // compare content, not line endings.
    const current = existsSync(file) ? lf(readFileSync(file, 'utf8')) : null;
    if (current !== lf(contents)) stale.push(relative);
  }
  if (stale.length) {
    console.error(
      `\n${stale.length} generated doc artifact(s) are out of date:\n` +
        stale.map((relative) => `  ${relative}`).join('\n') +
        '\n\nRun `npx nx run docs-tools:llms` and commit the result.\n',
    );
    process.exit(1);
  }
  console.log(`✓ ${artifacts.size} generated doc artifacts are up to date`);
} else {
  for (const [relative, contents] of artifacts) {
    const file = abs(relative);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, contents, 'utf8');
  }
  console.log(`✓ wrote ${artifacts.size} doc artifacts (v${version})`);
}

/** Normalizes line endings so the drift check is content-only. */
function lf(text) {
  return text.replace(/\r\n/g, '\n');
}

// ---------------------------------------------------------------- builders

/** The llmstxt.org index: H1, summary blockquote, then link sections. */
function buildIndex() {
  const out = [];
  out.push('# OGE UI');
  out.push('');
  out.push(`> ${SUMMARY}`);
  out.push('');
  out.push(
    'Install with `npm i oge-ui` (every MIT family, one import path) or per family, e.g. `npm i @oge-ui/grid`. Requires Angular >= 22 and Node >= 22.22. Component styles ship inside the components, so no global stylesheet is required and the light theme is built in. App-wide defaults and every user-facing string come from `provideOge<Family>Config()`.',
  );
  out.push('');
  out.push(
    `For code generation, prefer the full reference — it inlines every API table and every demo source: [llms-full.txt](${SITE_ORIGIN}/llms-full.txt). Per-package references live at \`${SITE_ORIGIN}/llms/<package>.txt\` and ship inside each tarball at \`node_modules/<package>/llms.txt\`.`,
  );
  out.push('');

  out.push('## Packages');
  out.push('');
  for (const { pkg } of docs.values()) {
    const url = pkg.docsRoot
      ? `${SITE_ORIGIN}${pkg.docsRoot}`
      : `https://www.npmjs.com/package/${pkg.npm}`;
    const licence = pkg.tier === 'commercial' ? ' **Commercial licence.**' : '';
    out.push(`- [${pkg.npm}](${url}): ${pkg.summary}${licence}`);
  }
  out.push('');

  const grouped = groupRoutes();
  for (const [heading, pages] of grouped) {
    if (!pages.length) continue;
    out.push(`## ${heading}`);
    out.push('');
    for (const page of pages) {
      const note = exactSeoDescription(page.path);
      out.push(
        `- [${page.label}](${SITE_ORIGIN}/${page.path})${note ? `: ${note}` : ''}`,
      );
    }
    out.push('');
  }

  out.push('## Optional');
  out.push('');
  out.push(
    `- [Full reference](${SITE_ORIGIN}/llms-full.txt): every API member and demo source in one file — the best single input for code generation.`,
  );
  out.push(
    `- [Roadmap](${REPO_URL}/blob/main/ROADMAP.md): shipped features and feature-parity tables against the reference libraries.`,
  );
  out.push(
    `- [Changelog](${REPO_URL}/blob/main/CHANGELOG.md): released versions per package.`,
  );
  out.push(
    `- [Source](${REPO_URL}): Nx monorepo — every package under \`packages/\`, docs app under \`apps/dev-app\`.`,
  );
  out.push('');
  return out.join('\n');
}

/** One self-contained reference per package — also what npm consumers get. */
function buildPackageDoc({ pkg, blocks, entries, demos }) {
  const out = [];
  out.push(`# ${pkg.npm}`);
  out.push('');
  out.push(`> ${pkg.summary}`);
  if (pkg.tier === 'commercial') {
    out.push('>');
    out.push(`> ${COMMERCIAL_NOTE}`);
  }
  out.push('');
  out.push(`Part of OGE UI v${version}.`);
  if (pkg.docsRoot) {
    out.push(`Docs and live demos: ${SITE_ORIGIN}${pkg.docsRoot}`);
  }
  out.push(`Whole-suite reference: ${SITE_ORIGIN}/llms-full.txt`);
  out.push('');
  out.push('```sh');
  out.push(`npm i ${pkg.npm}`);
  out.push('```');
  out.push('');
  // The rules a package ships must match the framework it is for. Handing the
  // Angular conventions to a `@oge-ui/react-*` reader is not merely unhelpful —
  // it instructs an assistant to write `imports: [OgeButton]` into a `.tsx`
  // file (ADR 0001).
  const isReact = pkg.platform === 'react';
  out.push(isReact ? CONVENTIONS_REACT : CONVENTIONS);
  out.push('');
  out.push(isReact ? MISTAKES_REACT : MISTAKES);
  out.push('');
  out.push(renderEntryPoints(entries));
  if (blocks.length) {
    out.push('## API reference');
    out.push('');
    for (const block of blocks) {
      out.push(sectionsToMarkdown(block.title, block.selector, block.sections));
      out.push('');
    }
  }
  out.push(renderDemos(demos, '##'));
  return `${out
    .filter((line) => line !== null)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')}\n`;
}

/** Everything, in one file: the highest-signal single input for a model. */
function buildFull() {
  const out = [];
  out.push('# OGE UI — full reference');
  out.push('');
  out.push(`> ${SUMMARY}`);
  out.push('');
  out.push(
    `Version ${version}. Generated from the OGE UI source tree: the API tables and demo sources below are the same ones ${SITE_ORIGIN} renders. Index: ${SITE_ORIGIN}/llms.txt`,
  );
  out.push('');
  out.push('## Contents');
  out.push('');
  for (const { pkg } of docs.values()) {
    out.push(`- \`${pkg.npm}\` — ${pkg.label}`);
  }
  out.push('');
  out.push(INSTALL);
  out.push('');
  out.push(CONVENTIONS);
  out.push('');
  out.push(MISTAKES);
  out.push('');
  out.push(renderGuides());

  for (const doc of docs.values()) {
    const { pkg, blocks, entries, demos } = doc;
    out.push(`## ${pkg.npm}`);
    out.push('');
    out.push(pkg.summary);
    if (pkg.tier === 'commercial') {
      out.push('');
      out.push(`**${COMMERCIAL_NOTE}**`);
    }
    if (pkg.docsRoot) {
      out.push('');
      out.push(`Docs: ${SITE_ORIGIN}${pkg.docsRoot}`);
    }
    out.push('');
    out.push(renderEntryPoints(entries, '###'));
    for (const block of blocks) {
      out.push(sectionsToMarkdown(block.title, block.selector, block.sections));
      out.push('');
    }
    out.push(renderDemos(demos, '###'));
  }
  return `${out.join('\n').replace(/\n{3,}/g, '\n\n')}\n`;
}

function renderEntryPoints(entries, heading = '##') {
  if (!entries.length) return '';
  const out = [`${heading} Entry points`, ''];
  for (const entry of entries) {
    const { values, types } = entry.exports;
    out.push(`\`${entry.specifier}\``);
    out.push('');
    if (values.length) {
      out.push(`- values: ${values.map((name) => `\`${name}\``).join(', ')}`);
    }
    if (types.length) {
      out.push(`- types: ${types.map((name) => `\`${name}\``).join(', ')}`);
    }
    out.push('');
  }
  return out.join('\n');
}

/**
 * The getting-started samples belong to no package but answer the questions a
 * model asks before it writes anything: how to install, theme and localize.
 */
function renderGuides() {
  const guides = snippets.filter((snippet) =>
    GUIDE_DIRS.includes(pageDirOf(snippet.file)),
  );
  if (!guides.length) return '';
  const out = ['## Guides', ''];
  for (const guide of guides) {
    const page = guide.file
      .split('/')
      .pop()
      .replace(/-snippets\.ts$/, '');
    out.push(
      `### ${humanize(page.replace(/-/g, '_'))} — ${humanize(guide.name)}`,
    );
    out.push('');
    out.push('```ts');
    out.push(guide.code);
    out.push('```');
    out.push('');
  }
  return out.join('\n');
}

function renderDemos(demos, heading = '##') {
  if (!demos.length) return '';
  const out = [`${heading} Demos`, ''];
  out.push(
    'Each demo below is a complete standalone component — copy one whole and it compiles.',
  );
  out.push('');
  for (const demo of demos) {
    out.push(`${heading}# ${demoTitle(demo)}`);
    out.push('');
    out.push('```ts');
    out.push(demo.code);
    out.push('```');
    out.push('');
  }
  return out.join('\n');
}

function buildSitemap() {
  const familyRoots = new Set(
    PACKAGES.filter((pkg) => pkg.docsRoot).map((pkg) => pkg.docsRoot.slice(1)),
  );
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];
  for (const page of routes) {
    const loc = `${SITE_ORIGIN}/${page.path}`;
    const priority =
      page.path === ''
        ? '1.0'
        : familyRoots.has(page.path) || !page.path.includes('/')
          ? '0.9'
          : null;
    lines.push(
      priority
        ? `  <url><loc>${loc}</loc><priority>${priority}</priority></url>`
        : `  <url><loc>${loc}</loc></url>`,
    );
  }
  lines.push('</urlset>');
  return `${lines.join('\n')}\n`;
}

// ---------------------------------------------------------------- helpers

/** `apps/dev-app/src/app/pages/buttons/overview-snippets.ts` → `buttons`. */
function pageDirOf(file) {
  return file.split(`${PATHS.pagesDir}/`)[1]?.split('/')[0] ?? '';
}

/**
 * `VARIANTS_SNIPPET` → `Variants`. A bare `SNIPPET` carries no information, so it falls back to the page it came
 * from (`columns-snippets.ts` → `Columns`).
 */
function demoTitle(demo) {
  // React demo entries carry a human title on the card; prefer it over the
  // constant-name fallback, which reads as `Button demos[0]`.
  if (demo.title) return demo.title;
  const fromName = humanize(demo.name.replace(/_?SNIPPET$/, ''));
  if (fromName) return fromName;
  const page = demo.file
    .split('/')
    .pop()
    .replace(/-snippets\.ts$/, '');
  return humanize(page.replace(/-/g, '_'));
}

function humanize(name) {
  return name
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((word, index) =>
      index === 0 ? word[0].toUpperCase() + word.slice(1) : word,
    )
    .join(' ');
}

/**
 * Groups routes into the `llms.txt` H2 sections: one per component family, plus
 * getting-started and a catch-all. Family match is by longest `docsRoot`, so
 * `/components/overlay/toast` lands under Overlay, not under a generic bucket.
 */
function groupRoutes() {
  /** @type {Map<string, { path: string, label: string }[]>} */
  const grouped = new Map();
  grouped.set('Getting started', []);
  grouped.set('AI', []);
  for (const { pkg } of docs.values()) {
    if (pkg.docsRoot) grouped.set(pkg.label, []);
  }
  grouped.set('Other pages', []);

  const families = PACKAGES.filter((pkg) => pkg.docsRoot)
    .map((pkg) => ({ prefix: pkg.docsRoot.slice(1), label: pkg.label }))
    .sort((a, b) => b.prefix.length - a.prefix.length);

  for (const page of routes) {
    if (page.path === '') continue; // the H1 already is the home page
    if (page.path.startsWith('getting-started')) {
      grouped.get('Getting started').push(page);
      continue;
    }
    if (page.path === 'ai' || page.path.startsWith('ai/')) {
      grouped.get('AI').push(page);
      continue;
    }
    const family = families.find(
      (candidate) =>
        page.path === candidate.prefix ||
        page.path.startsWith(`${candidate.prefix}/`),
    );
    grouped.get(family ? family.label : 'Other pages').push(page);
  }
  return grouped;
}

/** The meta description for a page, only when it describes that exact page. */
function exactSeoDescription(routePath) {
  const entry = seoDescriptions.find(
    (candidate) => candidate.prefix === `/${routePath}`,
  );
  return entry?.description ?? null;
}

/**
 * Two "no silent gaps" reports: packages on disk with no manifest entry, and
 * exported symbols with no API-reference row. Both warn without failing — the
 * `*-api-data.ts` tables are hand-compiled, so this is the only signal that one
 * has fallen behind its source.
 */
function reportGaps() {
  // `packages/react/` groups the React render layer's packages one level
  // down and has no package.json of its own — recurse into it so a React
  // family added without a manifest entry still trips this warning.
  const onDisk = readdirSync(abs('packages'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) =>
      existsSync(abs('packages', entry.name, 'package.json'))
        ? [entry.name]
        : readdirSync(abs('packages', entry.name), { withFileTypes: true })
            .filter((nested) => nested.isDirectory())
            .map((nested) => `${entry.name}/${nested.name}`)
            .filter((dir) => existsSync(abs('packages', dir, 'package.json'))),
    );
  const missing = onDisk.filter((dir) => !docs.has(dir));
  if (missing.length) {
    console.warn(
      `! packages with no manifest entry (not documented): ${missing.join(', ')}\n  add them to tools/docs-tools/lib/manifest.mjs`,
    );
  }

  // A demo module whose folder no package claims never reaches llms.txt — the
  // exact failure mode of "new component shipped, AI docs not updated". Hard
  // failure: silently dropping documentation is worse than a red build.
  const claimed = new Set(PACKAGES.flatMap((pkg) => pkg.pageDirs));
  for (const dir of GUIDE_DIRS) claimed.add(dir); // rendered by renderGuides()
  const orphans = [
    ...new Set(
      snippets
        .map((snippet) => pageDirOf(snippet.file))
        .filter((dir) => dir && !claimed.has(dir)),
    ),
  ];
  if (orphans.length) {
    console.error(
      `\n✗ demo folders no package claims: ${orphans.join(', ')}\n` +
        `  their snippets would be missing from llms-full.txt and every packages/<pkg>/llms.txt.\n` +
        `  Add the folder to the owning package's \`pageDirs\` in tools/docs-tools/lib/manifest.mjs.\n`,
    );
    process.exit(1);
  }

  // One global set: packages re-export each other (tree-list ships grid's
  // `provideOgeGridConfig`), and a symbol documented once is documented.
  /** @type {Set<string>} */
  const documented = new Set();
  for (const { blocks } of docs.values()) {
    for (const name of documentedNames(blocks)) documented.add(name);
  }

  for (const { pkg, blocks, entries } of docs.values()) {
    if (!blocks.length) continue;
    const primary = entries[0];
    if (!primary) continue;
    const undocumented = primary.exports.values.filter(
      (name) =>
        !documented.has(normalizeName(name)) &&
        // config tokens and defaults are covered by the configuration block
        !name.startsWith('OGE_'),
    );
    if (undocumented.length) {
      console.warn(
        `! ${pkg.npm}: ${undocumented.length} exported value(s) have no API-reference entry: ${undocumented.join(', ')}`,
      );
    }
  }
}
