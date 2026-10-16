#!/usr/bin/env node
/**
 * Issues an OGE UI Pro license key by hand (offline sales, renewals, support).
 *
 *   node tools/license/issue.mjs --licensee "Acme Ltd" --seats 3 \
 *     [--id manual-2026-001] [--expires 2027-10-10] [--families all] \
 *     [--key ~/.oge-license/private-key.pem]
 *
 * The private key comes from `--key`, else `OGE_LICENSE_PRIVATE_KEY`, else
 * `~/.oge-license/private-key.pem`. It is never stored in the repository.
 * Defaults: id `manual-<timestamp>`, issued today, expires one year later.
 *
 *   node tools/license/issue.mjs --public-key   # print the matching public key
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import {
  day,
  issueLicenseKey,
  loadPrivateKey,
  oneYearAfter,
  publicKeyOf,
} from './sign.mjs';

const { values } = parseArgs({
  options: {
    licensee: { type: 'string' },
    seats: { type: 'string', default: '1' },
    id: { type: 'string' },
    expires: { type: 'string' },
    families: { type: 'string', default: 'all' },
    key: { type: 'string' },
    'public-key': { type: 'boolean', default: false },
  },
});

const pem =
  values.key !== undefined
    ? readFileSync(values.key, 'utf8')
    : (process.env.OGE_LICENSE_PRIVATE_KEY ??
      readFileSync(join(homedir(), '.oge-license', 'private-key.pem'), 'utf8'));
const privateKey = loadPrivateKey(pem);

if (values['public-key']) {
  console.log(publicKeyOf(privateKey));
  process.exit(0);
}
if (!values.licensee) {
  console.error('--licensee is required');
  process.exit(1);
}
const now = new Date();
console.log(
  issueLicenseKey(privateKey, {
    id: values.id ?? `manual-${now.getTime()}`,
    licensee: values.licensee,
    seats: Number(values.seats),
    families: values.families.split(',').map((f) => f.trim()),
    issued: day(now),
    expires: values.expires ?? oneYearAfter(now),
  }),
);
