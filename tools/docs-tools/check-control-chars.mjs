#!/usr/bin/env node
/**
 * Fails when a tracked text file under packages/, apps/ or tools/ contains a
 * raw control character other than tab, LF and CR.
 *
 * Why: a literal NUL (or any C0 control) in a source file makes grep and
 * ripgrep classify the whole file as binary, so it silently drops out of
 * every code search — exactly how five files with `'\0'` separators went
 * unnoticed. Write the escape (`'\u0000'`, `'\x1f'`) instead; it is the same
 * code unit at runtime.
 *
 * Run: `node tools/docs-tools/check-control-chars.mjs` (wired into
 * `docs-tools:lint`, which `nx run-many -t lint` runs in CI).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCOPES = ['packages', 'apps', 'tools'];

/** Extensions that are legitimately binary and are not inspected. */
const BINARY = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico',
  '.webp',
  '.avif',
  '.bmp',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.eot',
  '.pdf',
  '.zip',
  '.gz',
  '.br',
  '.xlsx',
  '.docx',
  '.pptx',
  '.mp3',
  '.mp4',
  '.webm',
  '.wasm',
]);

const files = execFileSync(
  'git',
  [
    'ls-files',
    '-z',
    '--cached',
    '--others',
    '--exclude-standard',
    '--',
    ...SCOPES,
  ],
  {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  },
)
  .split('\0')
  .filter((file) => file !== '' && !BINARY.has(extname(file).toLowerCase()));

const offenders = [];
for (const file of files) {
  let bytes;
  try {
    bytes = readFileSync(resolve(root, file));
  } catch {
    continue; // deleted in the working tree
  }
  let line = 1;
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte === 0x0a) line++;
    if (byte < 0x20 && byte !== 0x09 && byte !== 0x0a && byte !== 0x0d) {
      offenders.push(
        `${file}:${line}: raw 0x${byte.toString(16).padStart(2, '0')}`,
      );
      break; // one report per file is enough to find it
    }
  }
}

if (offenders.length > 0) {
  console.error(
    `✗ raw control characters in ${offenders.length} file(s) — write an escape (\\u0000, \\x1f) instead:\n  ` +
      offenders.join('\n  '),
  );
  process.exit(1);
}
console.log(`✓ no raw control characters in ${files.length} tracked files`);
