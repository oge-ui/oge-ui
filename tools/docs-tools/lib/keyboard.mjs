import { existsSync } from 'node:fs';
import path from 'node:path';
import { readApiBlocks } from './api-data.mjs';
import { htmlToMarkdown } from './markdown.mjs';

/**
 * Builds `pages/guides/generated/keyboard.json`, the keyboard maps the
 * accessibility guide (`/guides/accessibility`) renders.
 *
 * Read out of the Angular API reference data rather than typed twice: every
 * `*-api-data.ts` group whose title names the keyboard (`Keyboard (WAI-ARIA
 * APG treeview)`, `Canvas keyboard`, …) and whose rows are keys — `name` the
 * key or chord, `type` where it applies, `description` the action — becomes
 * one table. Groups that list keyboard-related *properties* instead (a
 * `boolean` `type`) are skipped. Descriptions are reduced to text with
 * backtick code runs, which the guide renders without `innerHTML`.
 *
 * Generated and committed like the search index: `docs-tools:llms` writes it,
 * `docs-tools:llms-check` fails when an api-data edit left it stale.
 *
 * @param {object} options
 * @param {string} options.workspaceRoot
 * @param {object[]} options.packages the manifest's `PACKAGES`
 * @returns {Promise<string>} the JSON file contents
 */
export async function buildKeyboardMaps({ workspaceRoot, packages }) {
  /** @type {{ family: string, npm: string, title: string, rows: string[][] }[]} */
  const maps = [];
  const seen = new Set();
  for (const pkg of packages) {
    if ((pkg.platform ?? 'angular') !== 'angular' || !pkg.apiPage) continue;
    const apiPages = Array.isArray(pkg.apiPage) ? pkg.apiPage : [pkg.apiPage];
    for (const apiPage of apiPages) {
      const file = path.join(workspaceRoot, apiPage);
      if (!existsSync(file)) continue;
      for (const block of await readApiBlocks(file)) {
        for (const groups of Object.values(block.sections)) {
          for (const group of groups ?? []) {
            if (!/keyboard/i.test(group.title ?? '')) continue;
            const entries = group.entries ?? [];
            if (!entries.length || entries.some(isPropertyRow)) continue;
            const key = `${block.title}|${group.title}`;
            if (seen.has(key)) continue;
            seen.add(key);
            maps.push({
              family: block.title,
              npm: pkg.npm,
              title: group.title,
              rows: entries.map((entry) => [
                toCell(entry.name),
                toCell(entry.type ?? ''),
                toCell(entry.description ?? ''),
              ]),
            });
          }
        }
      }
    }
  }
  return `${JSON.stringify({ maps }, null, 2)}\n`;
}

/** Text with backtick code runs — the guide's table renders nothing else. */
function toCell(html) {
  return htmlToMarkdown(html).replace(/\*\*/g, '');
}

/** A row documenting an input (`boolean`, `'auto' | …`), not a key. */
function isPropertyRow(entry) {
  return /^(boolean|number|string)\b|'/.test(entry.type ?? '');
}
