/**
 * Signs OGE UI Pro license keys — the issuing half of
 * `packages/core/src/lib/license/license-key.ts` (which documents the format).
 *
 * Shared by `tools/license/issue.mjs` (manual issuance) and the docs site's
 * claim endpoint (`api/license/claim.mjs`). The private key is never in the
 * repository: it is read from a PEM file or the `OGE_LICENSE_PRIVATE_KEY`
 * environment variable (PKCS#8 PEM, Ed25519).
 */
import { createPrivateKey, createPublicKey, sign } from 'node:crypto';

export const KEY_PREFIX = 'OGE1';
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const FAMILIES = [
  'all',
  'pivot',
  'bpmn',
  'scheduler',
  'gantt',
  'kanban',
  'charts',
];

const b64url = (buffer) => Buffer.from(buffer).toString('base64url');

/** Normalises a PEM that went through an env var (`\n` escapes, CRLF). */
export function loadPrivateKey(pem) {
  const text = String(pem ?? '')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .trim();
  if (!text.includes('BEGIN PRIVATE KEY')) {
    throw new Error('expected a PKCS#8 PEM private key');
  }
  const key = createPrivateKey(text);
  if (key.asymmetricKeyType !== 'ed25519') {
    throw new Error(`expected an Ed25519 key, got ${key.asymmetricKeyType}`);
  }
  return key;
}

/** The raw base64url public key matching `privateKey` (what core embeds). */
export function publicKeyOf(privateKey) {
  return createPublicKey(privateKey).export({ format: 'jwk' }).x;
}

/** Validates the payload the same way the library does, then signs it. */
export function issueLicenseKey(privateKey, info) {
  const payload = {
    id: String(info.id),
    licensee: String(info.licensee),
    seats: Number(info.seats),
    families: info.families ?? ['all'],
    issued: info.issued,
    expires: info.expires,
  };
  if (!payload.id || !payload.licensee)
    throw new Error('id and licensee are required');
  if (!Number.isInteger(payload.seats) || payload.seats < 1) {
    throw new Error('seats must be a positive integer');
  }
  if (
    !payload.families.length ||
    !payload.families.every((f) => FAMILIES.includes(f))
  ) {
    throw new Error(`families must be from ${FAMILIES.join(', ')}`);
  }
  if (!DAY.test(payload.issued) || !DAY.test(payload.expires)) {
    throw new Error('issued and expires must be YYYY-MM-DD');
  }
  const signed = `${KEY_PREFIX}.${b64url(JSON.stringify(payload))}`;
  return `${signed}.${b64url(sign(null, Buffer.from(signed, 'ascii'), privateKey))}`;
}

/** `YYYY-MM-DD` for a Date (UTC). */
export function day(date) {
  return date.toISOString().slice(0, 10);
}

/** One year (plus `graceDays`) after `from`, as `YYYY-MM-DD`. */
export function oneYearAfter(from, graceDays = 0) {
  const end = new Date(from);
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  end.setUTCDate(end.getUTCDate() + graceDays);
  return day(end);
}
