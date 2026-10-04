import { SITE_VERSION } from './site-version';

/**
 * Versions of the docs a reader can switch to.
 *
 * The current docs are this site, always at the published version
 * (`SITE_VERSION`, generated). Each older line is a frozen deployment of its
 * own — a `docs/v<major>.<minor>` branch built by Vercel and served from its
 * own subdomain — so an archived version is the site exactly as it shipped,
 * not a re-render of today's code with old data.
 *
 * Archiving a version is one entry here plus, once, the branch and its domain
 * (see docs/ARCHITECTURE.md → "Versioned docs").
 */
export interface DocsVersion {
  /** What the menu shows, e.g. `1.1.1 (latest)`. */
  readonly label: string;
  /** Absolute origin of that version's site; `null` for this site. */
  readonly origin: string | null;
}

/** Older versions, newest first. */
export const ARCHIVED_DOCS: readonly DocsVersion[] = [
  { label: '1.1', origin: 'https://v1-1.ogeui.com' },
  { label: '0.13', origin: 'https://v0-13.ogeui.com' },
];

export const DOCS_VERSIONS: readonly DocsVersion[] = [
  { label: `${SITE_VERSION} (latest)`, origin: null },
  ...ARCHIVED_DOCS,
];
