#!/usr/bin/env node
/**
 * One-shot helper for the snippet migration: moves `const *_SNIPPET = \`…\``
 * definitions out of a docs page into its `*-snippets.ts` data module, adds the
 * import, and marks the demo cards as TypeScript.
 *
 * The snippets module must already exist and export the same names — this only
 * rewrites the page. Delete this script once every family is migrated.
 *
 * Usage: node tools/docs-tools/migrate-page.mjs <page.ts> [<page.ts> …]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

for (const file of process.argv.slice(2)) {
  let text = readFileSync(file, 'utf8');
  /** @type {string[]} */
  const names = [];

  text = text.replace(
    /^const ([A-Z0-9_]*SNIPPET) = `[\s\S]*?`;\n\n/gm,
    (_, name) => {
      names.push(name);
      return '';
    },
  );
  if (!names.length) {
    console.log(`· ${file}: no inline snippets`);
    continue;
  }

  const module = `./${path.basename(file, '.ts')}-snippets`;
  const importLine = `import { ${names.sort().join(', ')} } from '${module}';\n`;
  const imports = [...text.matchAll(/^import .*;\n/gm)];
  const last = imports[imports.length - 1];
  const at = last.index + last[0].length;
  text = `${text.slice(0, at)}${importLine}${text.slice(at)}`;

  // every demo card now renders a full component
  text = text.replace(
    /(\[code\]="[a-zA-Z]+")(?!\s*\n\s*language=)/g,
    '$1\n      language="ts"',
  );

  writeFileSync(file, text);
  console.log(`✓ ${file}: ${names.join(', ')}`);
}
