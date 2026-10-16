/**
 * OGE UI Pro license keys: format, decoding and signature verification.
 *
 * A key is `OGE1.<payload>.<signature>` — the payload is base64url JSON
 * ({@link OgeLicenseInfo}), the signature an Ed25519 signature over the ASCII
 * text `OGE1.<payload>`. Verification is offline: the public key below ships
 * with the library and nothing is ever sent anywhere. Keys are issued by
 * `tools/license/issue.mjs` and the docs site's claim endpoint, both signing
 * with the private half kept outside the repository.
 */

/** The six source-available families a Pro license covers. */
export type OgeCommercialFamily =
  'pivot' | 'bpmn' | 'scheduler' | 'gantt' | 'kanban' | 'charts';

/** What a license key states — the decoded payload. */
export interface OgeLicenseInfo {
  /** Stable license id, e.g. `ls-123456` for a Lemon Squeezy order. */
  readonly id: string;
  /** Who the license was sold to (company or person). */
  readonly licensee: string;
  /** Number of developers the license covers. */
  readonly seats: number;
  /** Covered families; `'all'` is the OGE UI Pro bundle. */
  readonly families: readonly (OgeCommercialFamily | 'all')[];
  /** Issue day, `YYYY-MM-DD`. */
  readonly issued: string;
  /**
   * Last day of the update window, `YYYY-MM-DD`. Every release dated on or
   * before it stays licensed forever (perpetual fallback); later releases
   * need a renewed key.
   */
  readonly expires: string;
}

/** Key format prefix; bumps only if the payload or signature scheme changes. */
export const OGE_LICENSE_KEY_PREFIX = 'OGE1';

/** Ed25519 public key (raw, base64url) that verifies issued license keys. */
export const OGE_LICENSE_PUBLIC_KEY =
  'gWAVntG4oxPNiyOGjmvT9haz8L9uL7pypDTjR0SusRU';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const FAMILIES: readonly string[] = [
  'all',
  'pivot',
  'bpmn',
  'scheduler',
  'gantt',
  'kanban',
  'charts',
];

/** base64url → bytes, or `null` for anything that is not base64url. */
export function ogeBase64UrlToBytes(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  const padded = text.replace(/-/g, '+').replace(/_/g, '/');
  try {
    const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function isLicenseInfo(value: unknown): value is OgeLicenseInfo {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['id'] === 'string' &&
    typeof v['licensee'] === 'string' &&
    typeof v['seats'] === 'number' &&
    Number.isInteger(v['seats']) &&
    (v['seats'] as number) > 0 &&
    Array.isArray(v['families']) &&
    (v['families'] as unknown[]).length > 0 &&
    (v['families'] as unknown[]).every(
      (f) => typeof f === 'string' && FAMILIES.includes(f),
    ) &&
    typeof v['issued'] === 'string' &&
    DAY.test(v['issued']) &&
    typeof v['expires'] === 'string' &&
    DAY.test(v['expires'])
  );
}

/** A key split into its parts, before any signature check. */
export interface OgeDecodedLicenseKey {
  readonly info: OgeLicenseInfo;
  /** The signed text: `OGE1.<payload>`. */
  readonly signed: string;
  readonly signature: Uint8Array;
}

/**
 * Splits and parses a key without verifying it — `null` when the text is not
 * a well-formed OGE1 key. Whitespace and line breaks (pasted keys) are ignored.
 */
export function ogeDecodeLicenseKey(
  key: string | null | undefined,
): OgeDecodedLicenseKey | null {
  const parts = (key ?? '').replace(/\s+/g, '').split('.');
  if (parts.length !== 3 || parts[0] !== OGE_LICENSE_KEY_PREFIX) return null;
  const payload = ogeBase64UrlToBytes(parts[1]);
  const signature = ogeBase64UrlToBytes(parts[2]);
  if (payload === null || signature === null || signature.length !== 64) {
    return null;
  }
  let info: unknown;
  try {
    info = JSON.parse(new TextDecoder().decode(payload));
  } catch {
    return null;
  }
  if (!isLicenseInfo(info)) return null;
  return { info, signed: `${parts[0]}.${parts[1]}`, signature };
}

/** Whether `info` covers `family`. */
export function ogeLicenseCoversFamily(
  info: OgeLicenseInfo,
  family: OgeCommercialFamily,
): boolean {
  return info.families.includes('all') || info.families.includes(family);
}

/**
 * Whether a release dated `releaseDate` falls inside the key's update window.
 * `YYYY-MM-DD` strings compare correctly as text.
 */
export function ogeLicenseCoversRelease(
  info: OgeLicenseInfo,
  releaseDate: string,
): boolean {
  return releaseDate <= info.expires;
}

/**
 * Checks the Ed25519 signature with Web Crypto. Resolves `true`/`false`, or
 * `null` where the runtime cannot verify Ed25519 at all (no `crypto.subtle`,
 * or an engine without the algorithm) — callers then trust a well-formed key
 * rather than punish a paying customer for their browser.
 */
export async function ogeVerifyLicenseSignature(
  decoded: OgeDecodedLicenseKey,
  publicKey: string = OGE_LICENSE_PUBLIC_KEY,
): Promise<boolean | null> {
  const subtle = (globalThis as { crypto?: Crypto }).crypto?.subtle;
  const raw = ogeBase64UrlToBytes(publicKey);
  if (subtle === undefined || raw === null) return null;
  let cryptoKey: CryptoKey;
  try {
    cryptoKey = await subtle.importKey(
      'raw',
      raw as BufferSource,
      { name: 'Ed25519' },
      false,
      ['verify'],
    );
  } catch {
    return null;
  }
  try {
    return await subtle.verify(
      { name: 'Ed25519' },
      cryptoKey,
      decoded.signature as BufferSource,
      new TextEncoder().encode(decoded.signed) as BufferSource,
    );
  } catch {
    return false;
  }
}
