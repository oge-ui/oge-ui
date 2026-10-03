#!/usr/bin/env node
/**
 * `npm audit` as a build gate, with dated exceptions.
 *
 * Fails on every advisory at moderate or above — except one listed in
 * `audit-allowlist.json` whose `expires` date has not passed. An entry is
 * only for an advisory that has **no patched version** yet (otherwise the fix
 * is an upgrade or a targeted `overrides` entry, see docs/ARCHITECTURE.md →
 * "Security rules"); it must say why the exposure is acceptable and expire
 * within weeks, so the gate turns red again and someone re-checks for a fix.
 *
 * Also fails when an entry has expired, and warns when an entry no longer
 * matches anything (delete it).
 *
 *   node tools/audit-check.mjs
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const LEVELS = ['info', 'low', 'moderate', 'high', 'critical'];
const threshold = LEVELS.indexOf('moderate');

const allowlist = JSON.parse(
  readFileSync(join(root, 'audit-allowlist.json'), 'utf8'),
).advisories;

let raw;
try {
  // a fixed command string (no interpolated input), so running it through
  // the shell — which Windows needs to find npm.cmd — is safe
  raw = execSync('npm audit --json', {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
} catch (error) {
  // npm audit exits non-zero when it finds anything; the JSON is still on stdout
  raw = error.stdout;
}
const report = JSON.parse(raw);

/** advisory id (GHSA-…) → { package, severity, title } */
const found = new Map();
for (const [name, vuln] of Object.entries(report.vulnerabilities ?? {})) {
  for (const via of vuln.via) {
    if (typeof via === 'string') continue;
    if (LEVELS.indexOf(via.severity) < threshold) continue;
    const id = via.url.split('/').pop();
    found.set(id, { package: name, severity: via.severity, title: via.title });
  }
}

const today = new Date().toISOString().slice(0, 10);
const failures = [];
for (const [id, adv] of found) {
  const entry = allowlist.find((a) => a.id === id);
  if (!entry) {
    failures.push(`${adv.severity} ${adv.package}: ${adv.title} (${id})`);
  } else if (entry.expires < today) {
    failures.push(
      `${adv.severity} ${adv.package}: allowlist entry ${id} expired on ${entry.expires} — check for a fix, then remove or re-date it`,
    );
  }
}
for (const entry of allowlist) {
  if (!found.has(entry.id)) {
    console.warn(
      `warning: allowlist entry ${entry.id} (${entry.package}) no longer matches an advisory — delete it`,
    );
  }
}

if (failures.length) {
  console.error(`npm audit: ${failures.length} blocking advisory(ies):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
const allowed = [...found.keys()].filter((id) =>
  allowlist.some((a) => a.id === id),
);
console.log(
  `✓ npm audit: no blocking advisories${allowed.length ? ` (${allowed.length} allowlisted until fixed: ${allowed.join(', ')})` : ''}`,
);
