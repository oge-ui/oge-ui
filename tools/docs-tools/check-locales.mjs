#!/usr/bin/env node
/**
 * Locale-pack gate for `@oge-ui/locales` (wired into `docs-tools:lint`, which
 * `nx run-many -t lint` runs in CI).
 *
 * Every pack in `packages/locales/src/<code>.ts` is checked against the
 * English catalogs it translates — the `OGE_DEFAULT_*_MESSAGES` objects in
 * `@oge-ui/behavior` and the commercial engines:
 *
 *   - **unknown keys fail** — a key no catalog has is a typo or a renamed key,
 *     and it would silently never render;
 *   - **placeholders must match the English source** — a dropped or renamed
 *     `{column}` renders literally (or loses the value);
 *   - **ICU templates must parse with `ogeFormatMessage`** — an English plural
 *     must stay a plural, every plural needs `other`, and only the language's
 *     own CLDR categories (`Intl.PluralRules`) or `=n` may appear;
 *   - **missing keys only warn**: catalogs grow in every release, and a key a
 *     pack does not carry yet falls back to English at runtime
 *     (`ogeMergeMessages`), so it must never break the build. The coverage
 *     table makes the gap visible instead.
 *
 * Run: `node tools/docs-tools/check-locales.mjs` (`--verbose` lists every
 * missing key).
 */
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const verbose = process.argv.includes('--verbose');
const localesSrc = path.join(workspaceRoot, 'packages/locales/src');

/** Pack slice → the default catalog(s) it translates. */
const SLICES = {
  grid: 'OGE_DEFAULT_GRID_MESSAGES',
  inputs: 'OGE_DEFAULT_INPUTS_MESSAGES',
  buttons: 'OGE_DEFAULT_BUTTONS_MESSAGES',
  overlay: 'OGE_DEFAULT_OVERLAY_MESSAGES',
  tabs: 'OGE_DEFAULT_TABS_MESSAGES',
  forms: 'OGE_DEFAULT_FORMS_MESSAGES',
  upload: 'OGE_DEFAULT_UPLOAD_MESSAGES',
  'layout.accordion': 'OGE_DEFAULT_ACCORDION_MESSAGES',
  'layout.progressBar': 'OGE_DEFAULT_PROGRESS_BAR_MESSAGES',
  'layout.loadIndicator': 'OGE_DEFAULT_LOAD_INDICATOR_MESSAGES',
  'layout.splitter': 'OGE_DEFAULT_SPLITTER_MESSAGES',
  'layout.toolbar': 'OGE_DEFAULT_TOOLBAR_MESSAGES',
  'layout.avatar': 'OGE_DEFAULT_AVATAR_MESSAGES',
  'layout.badge': 'OGE_DEFAULT_BADGE_MESSAGES',
  'layout.chip': 'OGE_DEFAULT_CHIP_MESSAGES',
  'layout.alert': 'OGE_DEFAULT_ALERT_MESSAGES',
  'layout.carousel': 'OGE_DEFAULT_CAROUSEL_MESSAGES',
  'layout.dataView': 'OGE_DEFAULT_DATA_VIEW_MESSAGES',
  'layout.tileLayout': 'OGE_DEFAULT_TILE_LAYOUT_MESSAGES',
  'layout.listView': 'OGE_DEFAULT_LIST_VIEW_MESSAGES',
  fab: 'OGE_DEFAULT_FAB_MESSAGES',
  'navigation.breadcrumb': 'OGE_DEFAULT_BREADCRUMB_MESSAGES',
  'navigation.drawer': 'OGE_DEFAULT_DRAWER_MESSAGES',
  'navigation.menubar': 'OGE_DEFAULT_MENUBAR_MESSAGES',
  'navigation.pagination': 'OGE_DEFAULT_PAGINATION_MESSAGES',
  'navigation.stepper': 'OGE_DEFAULT_STEPPER_MESSAGES',
  'navigation.treeView': 'OGE_DEFAULT_TREE_VIEW_MESSAGES',
  pivot: 'OGE_DEFAULT_PIVOT_MESSAGES',
  scheduler: 'OGE_DEFAULT_SCHEDULER_MESSAGES',
  gantt: 'OGE_DEFAULT_GANTT_MESSAGES',
  kanban: 'OGE_DEFAULT_KANBAN_MESSAGES',
  bpmn: 'OGE_DEFAULT_BPMN_MESSAGES',
  charts: 'OGE_DEFAULT_CHARTS_MESSAGES',
};
const COMMERCIAL = {
  pivot: '@oge-ui/pivot-engine',
  scheduler: '@oge-ui/scheduler-engine',
  gantt: '@oge-ui/gantt-engine',
  kanban: '@oge-ui/kanban-engine',
  bpmn: '@oge-ui/bpmn-engine',
  charts: '@oge-ui/charts-engine',
};

const codes = readdirSync(localesSrc)
  .filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'))
  .map((f) => f.slice(0, -3))
  .filter((c) => c !== 'index')
  .sort();

// --- load the TypeScript sources: one throwaway esbuild bundle -------------
const imports = [
  `export { ogeFormatMessage, isOgeIcuMessage } from '@oge-ui/core';`,
  `export * as behavior from '@oge-ui/behavior';`,
  ...Object.entries(COMMERCIAL).map(
    ([slice, pkg]) => `export { ${SLICES[slice]} } from '${pkg}';`,
  ),
  ...codes.map(
    (c, i) => `export * as pack${i} from './packages/locales/src/${c}';`,
  ),
].join('\n');
const scratch = mkdtempSync(path.join(tmpdir(), 'oge-locales-'));
const bundle = path.join(scratch, 'bundle.mjs');
let mod;
try {
  await esbuild.build({
    stdin: { contents: imports, resolveDir: workspaceRoot, loader: 'ts' },
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: bundle,
    tsconfig: path.join(workspaceRoot, 'tsconfig.base.json'),
    logLevel: 'error',
  });
  mod = await import(pathToFileURL(bundle).href);
} finally {
  // the module is in memory now; the file is not needed
}
rmSync(scratch, { recursive: true, force: true });
const { ogeFormatMessage, isOgeIcuMessage } = mod;
const catalogFor = (name) => mod.behavior[name] ?? mod[name];

// --- helpers ----------------------------------------------------------------
const leaves = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([key, value]) =>
    typeof value === 'string'
      ? [[prefix + key, value]]
      : value && typeof value === 'object'
        ? leaves(value, `${prefix}${key}.`)
        : [],
  );
const at = (obj, dotted) =>
  dotted.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

/** `{name}` / `{name, plural, …}` argument names of an English string. */
function argNames(template) {
  const names = new Set();
  // `one {once}` is a plural branch holding literal text, not an argument
  for (const m of template.matchAll(
    /(?<!(?:=\d+|zero|one|two|few|many|other)\s*)\{\s*(\w+)\s*(?=[,}])/g,
  ))
    names.add(m[1]);
  return names;
}
function pluralArgs(template) {
  return new Set(
    [...template.matchAll(/\{\s*(\w+)\s*,\s*(?:plural|selectordinal)\b/g)].map(
      (m) => m[1],
    ),
  );
}
/** Selectors of every plural block (`one`, `=0`, …) in a template. */
function pluralSelectors(template) {
  return [
    ...template.matchAll(
      /(?:^|[\s,}])(=\d+|zero|one|two|few|many|other)\s*\{/g,
    ),
  ].map((m) => m[1]);
}

// --- the checks ---------------------------------------------------------------
const errors = [];
const warnings = [];
const rows = [];
const sliceNames = Object.keys(SLICES);

for (const [i, code] of codes.entries()) {
  const pack = Object.values(mod[`pack${i}`])[0];
  const where = `packages/locales/src/${code}.ts`;
  if (!pack || typeof pack !== 'object') {
    errors.push(`${where}: no exported pack`);
    continue;
  }
  const locale = pack.locale;
  const categories = new Set(
    new Intl.PluralRules(locale).resolvedOptions().pluralCategories,
  );
  if (pack.dir !== 'ltr' && pack.dir !== 'rtl')
    errors.push(`${where}: dir must be 'ltr' or 'rtl'`);

  // unknown top-level / family slices
  for (const key of Object.keys(pack)) {
    if (key === 'locale' || key === 'dir') continue;
    const known =
      key in SLICES || sliceNames.some((s) => s.startsWith(`${key}.`));
    if (!known) errors.push(`${where}: unknown slice "${key}"`);
    if (key === 'layout' || key === 'navigation') {
      for (const sub of Object.keys(pack[key] ?? {}))
        if (!(`${key}.${sub}` in SLICES))
          errors.push(`${where}: unknown slice "${key}.${sub}"`);
    }
  }

  let total = 0;
  let present = 0;
  const missingBySlice = {};
  const pluralNotes = [];
  for (const [slice, catalogName] of Object.entries(SLICES)) {
    const catalog = catalogFor(catalogName);
    if (!catalog) {
      errors.push(`catalog ${catalogName} not found`);
      continue;
    }
    const english = new Map(leaves(catalog));
    const translated = at(pack, slice) ?? {};
    const own = new Map(leaves(translated));
    total += english.size;

    for (const [key, text] of own) {
      const id = `${where}: ${slice}.${key}`;
      const source = english.get(key);
      if (source === undefined) {
        errors.push(`${id}: unknown key (not in ${catalogName})`);
        continue;
      }
      present++;
      // placeholders: every English argument appears, none is invented
      const names = argNames(source);
      const plural = pluralArgs(source);
      const values = Object.fromEntries(
        [...names].map((n) => [n, plural.has(n) ? 3 : `⟦${n}⟧`]),
      );
      for (const name of names) {
        if (!new RegExp(`\\{\\s*${name}\\s*[,}]`).test(text))
          errors.push(`${id}: placeholder {${name}} is missing`);
      }
      const rendered = ogeFormatMessage(text, values, locale);
      const renderedEn = ogeFormatMessage(source, values, 'en');
      const leftover = (s) =>
        new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
      const enLeft = leftover(renderedEn);
      for (const name of leftover(rendered))
        if (!enLeft.has(name))
          errors.push(`${id}: unknown placeholder {${name}}`);
      // ICU: an English plural stays a parseable plural
      const icuEn = isOgeIcuMessage(source);
      const icu = isOgeIcuMessage(text);
      if (icuEn && !icu)
        errors.push(`${id}: ICU template does not parse (ogeFormatMessage)`);
      if (!icuEn && /\{\s*\w+\s*,\s*(plural|select|selectordinal)\b/.test(text))
        errors.push(
          `${id}: ICU syntax where the English source is a plain template`,
        );
      if (icu && pluralArgs(text).size) {
        const selectors = pluralSelectors(text);
        if (!selectors.includes('other'))
          errors.push(`${id}: plural without an "other" branch`);
        for (const s of selectors)
          if (!s.startsWith('=') && !categories.has(s))
            errors.push(
              `${id}: plural category "${s}" does not exist in ${locale} (${[...categories].join(', ')})`,
            );
        const unused = [...categories].filter((c) => !selectors.includes(c));
        if (unused.length)
          pluralNotes.push(`${slice}.${key}: ${unused.join(' ')}`);
      }
    }
    const missing = [...english.keys()].filter((k) => !own.has(k));
    if (missing.length) missingBySlice[slice] = missing;
  }
  const missingCount = Object.values(missingBySlice).flat().length;
  if (missingCount) {
    warnings.push(
      `${code}: ${missingCount} key(s) fall back to English — ` +
        Object.entries(missingBySlice)
          .map(([s, keys]) =>
            verbose ? `${s}: ${keys.join(', ')}` : `${s} (${keys.length})`,
          )
          .join('; '),
    );
  }
  rows.push({
    code,
    locale,
    dir: pack.dir,
    present,
    total,
    pluralNotes: pluralNotes.length,
  });
  if (verbose && pluralNotes.length)
    console.log(
      `  ${code}: plural categories left to "other": ${pluralNotes.join(' | ')}`,
    );
}

// --- report -------------------------------------------------------------------
const pad = (s, n) => String(s).padEnd(n);
console.log('\n@oge-ui/locales coverage');
console.log(
  `${pad('pack', 7)}${pad('locale', 8)}${pad('dir', 5)}${pad('keys', 11)}coverage`,
);
for (const r of rows) {
  const pct = ((100 * r.present) / r.total).toFixed(1);
  console.log(
    `${pad(r.code, 7)}${pad(r.locale, 8)}${pad(r.dir, 5)}${pad(`${r.present}/${r.total}`, 11)}${pct}%`,
  );
}
for (const w of warnings) console.warn(`⚠ ${w}`);
if (errors.length) {
  console.error(`\n✗ ${errors.length} locale pack error(s):`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}
console.log(
  `✓ ${rows.length} locale packs: no unknown keys, placeholders and ICU plurals intact`,
);
