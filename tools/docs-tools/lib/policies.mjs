import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createJiti } from 'jiti';

/**
 * The policies the guides publish — support matrix, deprecations, security,
 * accessibility conformance and bundle size — rendered for machine readers
 * (`llms-full.txt`) and for the repository (`SECURITY.md`'s support table).
 *
 * Every table comes from the file the docs page itself renders, so a model
 * never reads a support line or a conformance level the site does not show:
 *
 * - `pages/guides/versioning-data.ts` — support matrix, deprecations;
 * - `pages/guides/conformance-data.ts` — the WCAG 2.2 report (VPAT 2.5);
 * - `SECURITY.md` — the reporting process (its support table is generated);
 * - `tools/size-budgets.json` — the gzip baselines the size gate enforces;
 * - `@oge-ui/core`'s `OGE_DEV_WARNINGS` — the coded development warnings.
 */

const jiti = createJiti(import.meta.url, { interopDefault: true });

const GUIDES = 'apps/dev-app/src/app/pages/guides';
const SUPPORT_START = '<!-- generated: support-table -->';
const SUPPORT_END = '<!-- /generated: support-table -->';

/** Loads every policy source once. */
export async function loadPolicyData(workspaceRoot) {
  const abs = (...parts) => path.join(workspaceRoot, ...parts);
  const versioning = await jiti.import(abs(GUIDES, 'versioning-data.ts'));
  const conformance = await jiti.import(abs(GUIDES, 'conformance-data.ts'));
  const warnings = await jiti.import(
    abs('packages/core/src/lib/util/dev-warnings.ts'),
  );
  return {
    versioning,
    criteria: conformance.CRITERIA,
    devWarnings: warnings.OGE_DEV_WARNINGS,
    security: readFileSync(abs('SECURITY.md'), 'utf8'),
    budgets: JSON.parse(readFileSync(abs('tools/size-budgets.json'), 'utf8')),
  };
}

const cell = (text) =>
  String(text ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\s+/g, ' ')
    .trim();

/** A markdown table padded the way Prettier formats one, for checked-in files. */
function alignedTable(head, rows) {
  const all = [head, ...rows].map((row) => row.map(cell));
  const widths = head.map((_, i) =>
    Math.max(3, ...all.map((row) => [...(row[i] ?? '')].length)),
  );
  const line = (row) =>
    `| ${row.map((text, i) => text + ' '.repeat(widths[i] - [...text].length)).join(' | ')} |`;
  return [
    line(all[0]),
    `| ${widths.map((w) => '-'.repeat(w)).join(' | ')} |`,
    ...all.slice(1).map(line),
  ].join(String.fromCharCode(10));
}

function table(head, rows) {
  return [
    `| ${head.map(cell).join(' | ')} |`,
    `| ${head.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(cell).join(' | ')} |`),
  ].join('\n');
}

/**
 * `SECURITY.md` with its support table regenerated between the markers.
 * Throws when the markers are missing, so a hand edit cannot silently
 * detach the table from its source.
 */
export function buildSecurityMd(security, versioning) {
  const lf = security.replace(/\r\n/g, '\n');
  const start = lf.indexOf(SUPPORT_START);
  const end = lf.indexOf(SUPPORT_END);
  if (start < 0 || end < start) {
    throw new Error(
      `SECURITY.md: the "${SUPPORT_START}" … "${SUPPORT_END}" markers are missing`,
    );
  }
  return (
    lf.slice(0, start + SUPPORT_START.length) +
    '\n\n' +
    alignedTable(versioning.SUPPORT_HEAD, versioning.SUPPORT) +
    '\n\n' +
    lf.slice(end)
  );
}

/** The `## Policies` section of `llms-full.txt`. */
export function renderPolicies(data, siteOrigin) {
  const { versioning, criteria, security, budgets, devWarnings } = data;
  const code = (text) => '`' + text + '`';
  const out = ['## Policies', ''];

  out.push('### Versioning and support', '');
  out.push(
    `Semantic versioning; every \`@oge-ui\` package releases together on one version, so keep them aligned. Breaking changes only in a major; a deprecated member keeps working for at least one minor. Release notes: ${siteOrigin}/changelog (also \`CHANGELOG.md\` in the repository). Details: ${siteOrigin}/guides/versioning.`,
    '',
  );
  out.push(table(versioning.SUPPORT_HEAD, versioning.SUPPORT), '');
  out.push('Deprecated and not yet removed:', '');
  out.push(table(versioning.DEPRECATED_HEAD, versioning.DEPRECATED), '');

  out.push('### Security', '');
  const reporting = sectionOf(security, 'Reporting a vulnerability');
  if (reporting) out.push(reporting, '');
  out.push(
    `Untrusted-data rules (text is text, URL sanitizing, filtered attribute bags, CSP): ${siteOrigin}/guides/security. Releases are published with npm provenance and SLSA build attestations, and every GitHub release carries a CycloneDX SBOM.`,
    '',
  );

  out.push('### Accessibility conformance (WCAG 2.2, VPAT 2.5)', '');
  const counts = new Map();
  for (const row of criteria) {
    const key = `${row.level} — ${row.conformance}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  out.push(
    `Self-assessed report: ${siteOrigin}/guides/accessibility/conformance. Forced colors (Windows High Contrast), reduced motion and right-to-left text are supported across the suite.`,
    '',
  );
  out.push(
    table(
      ['Level — conformance', 'Criteria'],
      [...counts].map(([key, n]) => [key, String(n)]),
    ),
    '',
  );
  const caveats = criteria.filter(
    (row) =>
      row.conformance === 'Partially Supports' ||
      row.conformance === 'Does Not Support',
  );
  if (caveats.length) {
    out.push('Criteria that are not fully supported:', '');
    out.push(
      table(
        ['Criterion', 'Level', 'Conformance', 'Remarks'],
        caveats.map((row) => [
          `${row.id} ${row.name}`,
          row.level,
          row.conformance,
          row.remarks,
        ]),
      ),
      '',
    );
  }

  out.push('### Development warnings', '');
  out.push(
    [
      'Every development warning starts with a stable code and links to its entry:',
      `${code(`[OGE3101] … — ${siteOrigin}/guides/dev-warnings#oge3101`)}.`,
      `Angular warns while ${code('ngDevMode')} is on; other toolchains when`,
      `${code('NODE_ENV')} is ${code('development')} or ${code('test')}.`,
      'Production builds print none. New warnings go through',
      `${code('ogeDevWarn(code, detail)')} (${code('@oge-ui/core')}, re-exported by ${code('@oge-ui/behavior')}).`,
    ].join(' '),
    '',
  );
  out.push(
    table(
      ['Code', 'Warning', 'Cause', 'Fix'],
      Object.entries(devWarnings).map(([key, info]) => [
        code(key),
        info.title,
        info.cause,
        info.fix,
      ]),
    ),
    '',
  );

  out.push('### Localization coverage', '');
  out.push(
    [
      `${code('@oge-ui/locales')} ships 11 packs (ar, de, es, fr, he, it, ja, pt-BR, ru, tr, zh-CN).`,
      "CI's locale check fails on unknown keys, placeholder drift and broken ICU plurals and prints each pack's coverage;",
      'a key a pack lacks falls back to English at runtime.',
      `Details: ${siteOrigin}/getting-started/localization.`,
    ].join(' '),
    '',
  );

  out.push('### Bundle size', '');
  out.push(
    `Gzip size of each package's main entry point, as baselined by the CI size gate (a build fails when an entry grows more than ${Math.round((budgets.tolerance ?? 0.1) * 100)} %). Secondary entry points: ${siteOrigin}/bundle-size.`,
    '',
  );
  const roots = Object.entries(budgets.entries)
    .filter(([name]) => name.split('/').length === 2)
    .map(([name, bytes]) => [`\`${name}\``, `${(bytes / 1024).toFixed(1)} kB`]);
  out.push(table(['Entry point', 'Gzip'], roots));
  return out.join('\n');
}

/** The body of a `## heading` section of a markdown document. */
function sectionOf(markdown, heading) {
  const lf = markdown.replace(/\r\n/g, '\n');
  const start = lf.indexOf(`## ${heading}\n`);
  if (start < 0) return null;
  const body = lf.slice(start + heading.length + 4);
  const next = body.search(/\n## /);
  return (next < 0 ? body : body.slice(0, next)).trim();
}
