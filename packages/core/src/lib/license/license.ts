/**
 * OGE UI Pro license check — the runtime half.
 *
 * The six commercial families call {@link ogeCheckLicense} when a component
 * starts. Without a valid key on a production host the component still works
 * in full; the page gets one console warning per family and a single small
 * "unlicensed" link pinned to the corner. Development hosts (localhost,
 * `*.local`, `*.test`, file URLs, StackBlitz / CodeSandbox, jsdom test runs)
 * are exempt: no watermark, one informational console line at most.
 *
 * State lives on a `globalThis` symbol so two copies of `@oge-ui/core` in one
 * bundle (duplicate installs) still share the key the app set once.
 */
import {
  OGE_LICENSE_PUBLIC_KEY,
  ogeDecodeLicenseKey,
  ogeLicenseCoversFamily,
  ogeLicenseCoversRelease,
  ogeVerifyLicenseSignature,
  type OgeCommercialFamily,
  type OgeLicenseInfo,
} from './license-key';
import { OGE_RELEASE_DATE } from './release-info';

/**
 * - `licensed` — a valid key covers the family and this release.
 * - `development` — no key, on a development host (no watermark).
 * - `missing` — no key on a production host.
 * - `invalid` — the key is malformed or its signature does not verify.
 * - `expired` — the key's update window ended before this release.
 * - `not-covered` — the key is for other families.
 */
export type OgeLicenseStatus =
  | 'licensed'
  | 'development'
  | 'missing'
  | 'invalid'
  | 'expired'
  | 'not-covered';

interface LicenseState {
  key: string | null;
  /** Memoised signature check of `key`. */
  verified: Promise<boolean | null> | null;
  /** Families a component has asked about. */
  requested: Set<OgeCommercialFamily>;
  warned: Set<string>;
  watermark: HTMLElement | null;
  /** Bumped by every `ogeSetLicenseKey`, so a stale evaluation is dropped. */
  generation: number;
  /** Verifying key; replaced only by the test seam. */
  publicKey: string;
}

const STATE_KEY = Symbol.for('oge-ui.license');

function state(): LicenseState {
  const holder = globalThis as unknown as Record<symbol, LicenseState>;
  holder[STATE_KEY] ??= {
    key: null,
    verified: null,
    requested: new Set(),
    warned: new Set(),
    watermark: null,
    generation: 0,
    publicKey: OGE_LICENSE_PUBLIC_KEY,
  };
  return holder[STATE_KEY];
}

const LICENSE_URL = 'https://www.ogeui.com/license';

/** CSS class of the corner notice, for apps that need to find it in tests. */
export const OGE_LICENSE_WATERMARK_CLASS = 'oge-license-watermark';

/**
 * Registers the OGE UI Pro license key. Call it once, before the first
 * commercial component renders — in `main.ts` before bootstrapping, or at the
 * top of the React entry file. Calling it again replaces the key and
 * re-evaluates (a valid key removes the corner notice).
 */
export function ogeSetLicenseKey(key: string): void {
  const s = state();
  s.key = key.trim() === '' ? null : key;
  s.verified = null;
  s.generation++;
  s.warned.clear();
  for (const family of s.requested) void report(family);
}

/** The registered key's verified payload, or `null` without a valid key. */
export async function ogeGetLicenseInfo(): Promise<OgeLicenseInfo | null> {
  const decoded = ogeDecodeLicenseKey(state().key);
  if (decoded === null) return null;
  return (await verified()) === false ? null : decoded.info;
}

/** How the registered key stands for `family` on the current host. */
export async function ogeLicenseStatus(
  family: OgeCommercialFamily,
): Promise<OgeLicenseStatus> {
  const s = state();
  if (s.key === null) {
    return ogeIsLicenseExemptHost() ? 'development' : 'missing';
  }
  const decoded = ogeDecodeLicenseKey(s.key);
  if (decoded === null || (await verified()) === false) return 'invalid';
  if (!ogeLicenseCoversFamily(decoded.info, family)) return 'not-covered';
  if (!ogeLicenseCoversRelease(decoded.info, OGE_RELEASE_DATE)) {
    return 'expired';
  }
  return 'licensed';
}

/**
 * Called by every commercial component on start. Never throws, never blocks
 * rendering, and does nothing during server rendering.
 */
export function ogeCheckLicense(family: OgeCommercialFamily): void {
  if (typeof document === 'undefined') return;
  const s = state();
  if (s.requested.has(family)) return;
  s.requested.add(family);
  void report(family);
}

function verified(): Promise<boolean | null> {
  const s = state();
  const decoded = ogeDecodeLicenseKey(s.key);
  if (decoded === null) return Promise.resolve(false);
  s.verified ??= ogeVerifyLicenseSignature(decoded, s.publicKey);
  return s.verified;
}

const MESSAGES: Record<Exclude<OgeLicenseStatus, 'licensed'>, string> = {
  development:
    'no license key is set. That is fine for development; production use needs an OGE UI Pro license',
  missing: 'no license key is set. Production use needs an OGE UI Pro license',
  invalid:
    'the license key is not valid (malformed, or its signature does not verify)',
  expired:
    'the license key’s update window ended before this release. Use a release from within the window or renew',
  'not-covered': 'the license key does not cover this package',
};

async function report(family: OgeCommercialFamily): Promise<void> {
  const s = state();
  const generation = s.generation;
  let status: OgeLicenseStatus;
  try {
    status = await ogeLicenseStatus(family);
  } catch {
    return;
  }
  if (generation !== s.generation) return;
  if (status === 'licensed') {
    await syncWatermark();
    return;
  }
  const exempt = ogeIsLicenseExemptHost();
  const tag = `${family}:${status}`;
  if (!s.warned.has(tag) && !isTestRuntime()) {
    s.warned.add(tag);
    const text = `[OGE UI] @oge-ui/${family}: ${MESSAGES[status]} — ${LICENSE_URL}`;
    if (exempt && status === 'development') console.info(text);
    else console.warn(text);
  }
  await syncWatermark();
}

/** Whether every family components asked about is licensed (or exempt). */
const allRequestedLicensed = async (): Promise<boolean> => {
  if (ogeIsLicenseExemptHost()) return true;
  for (const family of state().requested) {
    if ((await ogeLicenseStatus(family)) !== 'licensed') return false;
  }
  return true;
};

async function syncWatermark(): Promise<void> {
  const s = state();
  const generation = s.generation;
  const ok = await allRequestedLicensed();
  if (generation !== s.generation || typeof document === 'undefined') return;
  if (ok) {
    s.watermark?.remove();
    s.watermark = null;
    return;
  }
  if (s.watermark?.isConnected || document.body === null) return;
  const link = document.createElement('a');
  link.className = OGE_LICENSE_WATERMARK_CLASS;
  link.href = LICENSE_URL;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'OGE UI Pro — unlicensed';
  link.style.cssText = [
    'position:fixed',
    'inset-inline-end:8px',
    'inset-block-end:8px',
    'z-index:2147483647',
    'padding:4px 8px',
    'border-radius:4px',
    'font:500 11px/1.4 system-ui,sans-serif',
    'color:#fff',
    'background:rgba(17,24,39,.72)',
    'text-decoration:none',
    'opacity:.85',
  ].join(';');
  document.body.appendChild(link);
  s.watermark = link;
}

function isTestRuntime(): boolean {
  const agent =
    typeof navigator === 'undefined' ? '' : (navigator.userAgent ?? '');
  return /jsdom|happy-dom/i.test(agent);
}

const EXEMPT_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '[::1]',
  '::1',
  '0.0.0.0',
  '',
]);
const EXEMPT_SUFFIXES = [
  '.localhost',
  '.local',
  '.test',
  '.webcontainer.io',
  '.stackblitz.io',
  '.csb.app',
  '.ogeui.com',
];

/**
 * Whether the page runs somewhere that is plainly not production: local
 * hosts, reserved development TLDs, file URLs, online sandboxes, jsdom /
 * happy-dom test runs — and the OGE UI docs site itself.
 */
export function ogeIsLicenseExemptHost(
  location: { hostname: string; protocol: string } | undefined = (
    globalThis as { location?: Location }
  ).location,
): boolean {
  if (isTestRuntime()) return true;
  if (location === undefined) return true;
  if (location.protocol === 'file:') return true;
  const host = location.hostname.toLowerCase();
  if (EXEMPT_HOSTS.has(host)) return true;
  if (/^127\./.test(host)) return true;
  return EXEMPT_SUFFIXES.some(
    (suffix) => host === suffix.replace(/^\./, '') || host.endsWith(suffix),
  );
}

/**
 * Test seam: forget the key, the requests and the notice; optionally verify
 * with another public key (specs sign with a throwaway pair).
 */
export function resetOgeLicenseForTests(
  publicKey: string = OGE_LICENSE_PUBLIC_KEY,
): void {
  const s = state();
  s.publicKey = publicKey;
  s.watermark?.remove();
  s.key = null;
  s.verified = null;
  s.requested.clear();
  s.warned.clear();
  s.watermark = null;
  s.generation++;
}
