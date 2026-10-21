import type { ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/core/src/lib/license/** and the
 * `ogeCheck<Family>License` hooks in each packages/<family>-engine — keep in
 * sync with the source TSDoc when the public API changes.
 */
export const OGE_LICENSE_API: ApiSections = {
  methods: [
    {
      title: '@oge-ui/core',
      entries: [
        {
          name: 'ogeSetLicenseKey(key)',
          type: '(key: string) => void',
          description:
            'Registers the OGE UI Pro license key. Call it once before the first Pro component renders — in <code>main.ts</code> before bootstrapping, or at the top of the React entry. Calling it again replaces the key and re-evaluates; a valid key removes the corner notice. The key is verified offline and is safe to ship in the bundle.',
        },
        {
          name: 'ogeLicenseStatus(family)',
          type: '(family: OgeCommercialFamily) => Promise<OgeLicenseStatus>',
          description:
            'How the registered key stands for one family on the current host: <code>licensed</code>, <code>development</code> (no key, development host), <code>missing</code>, <code>invalid</code>, <code>expired</code> (the update window ended before this release) or <code>not-covered</code>.',
        },
        {
          name: 'ogeGetLicenseInfo()',
          type: '() => Promise<OgeLicenseInfo | null>',
          description:
            'The verified payload of the registered key — licensee, seats, families, issue and expiry day — or <code>null</code> without a valid key.',
        },
        {
          name: 'ogeCheckLicense(family)',
          type: '(family: OgeCommercialFamily) => void',
          description:
            'What every Pro component calls on start (through its engine’s <code>ogeCheck&lt;Family&gt;License</code>). Never throws, never blocks rendering, no-op during server rendering; on a production host without a valid key it logs one console warning per family and pins a single “OGE UI Pro — unlicensed” link to the page corner.',
        },
        {
          name: 'ogeIsLicenseExemptHost(location?)',
          type: '(location?: { hostname: string; protocol: string }) => boolean',
          description:
            'Whether the page counts as development: <code>localhost</code>, <code>127.*</code>, <code>*.localhost</code>, <code>*.local</code>, <code>*.test</code>, file URLs, StackBlitz and CodeSandbox, jsdom / happy-dom test runs and the OGE UI docs site. Exempt hosts never show the notice.',
        },
        {
          name: 'ogeDecodeLicenseKey(key)',
          type: '(key: string | null | undefined) => OgeDecodedLicenseKey | null',
          description:
            'Parses a key without verifying it (whitespace and line breaks ignored); <code>null</code> when it is not a well-formed <code>OGE1</code> key.',
        },
        {
          name: 'ogeVerifyLicenseSignature(decoded, publicKey?)',
          type: '(decoded: OgeDecodedLicenseKey, publicKey?: string) => Promise<boolean | null>',
          description:
            'Checks the Ed25519 signature with Web Crypto. <code>null</code> where the runtime cannot verify Ed25519 at all — the library then trusts a well-formed key rather than penalize the browser.',
        },
        {
          name: 'ogeLicenseCoversFamily(info, family)',
          type: '(info: OgeLicenseInfo, family: OgeCommercialFamily) => boolean',
          description:
            'Whether the key covers a family — <code>families</code> holds it or <code>all</code> (the OGE UI Pro bundle).',
        },
        {
          name: 'ogeLicenseCoversRelease(info, releaseDate)',
          type: '(info: OgeLicenseInfo, releaseDate: string) => boolean',
          description:
            'Whether a release dated <code>releaseDate</code> (<code>YYYY-MM-DD</code>) falls inside the key’s update window — the perpetual-fallback rule.',
        },
        {
          name: 'ogeBase64UrlToBytes(text)',
          type: '(text: string) => Uint8Array | null',
          description:
            'base64url decoding used by the key parser; <code>null</code> for invalid input.',
        },
        {
          name: 'resetOgeLicenseForTests(publicKey?)',
          type: '(publicKey?: string) => void',
          description:
            'Test seam: forgets the key, the requested families and the notice, and optionally verifies with another public key so specs can sign with a throwaway pair.',
        },
      ],
    },
    {
      title: 'Engine hooks (commercial families)',
      entries: [
        {
          name: 'ogeCheckPivotLicense()',
          type: '() => void',
          description:
            'From <code>&#64;oge-ui/pivot-engine</code>; called by the Angular and React pivot grid.',
        },
        {
          name: 'ogeCheckGanttLicense()',
          type: '() => void',
          description:
            'From <code>&#64;oge-ui/gantt-engine</code>; called by both Gantt components.',
        },
        {
          name: 'ogeCheckSchedulerLicense()',
          type: '() => void',
          description:
            'From <code>&#64;oge-ui/scheduler-engine</code>; called by both schedulers.',
        },
        {
          name: 'ogeCheckKanbanLicense()',
          type: '() => void',
          description:
            'From <code>&#64;oge-ui/kanban-engine</code>; called by both Kanban boards.',
        },
        {
          name: 'ogeCheckChartsLicense()',
          type: '() => void',
          description:
            'From <code>&#64;oge-ui/charts-engine</code>; called by every chart, gauge, map and the sparkline.',
        },
        {
          name: 'ogeCheckBpmnLicense()',
          type: '() => void',
          description:
            'From <code>&#64;oge-ui/bpmn-engine</code>; called by both BPMN editors.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeLicenseInfo',
          type: '{ id; licensee; seats; families; issued; expires }',
          description:
            'The decoded key payload. <code>expires</code> is the last day of the update window: every release dated on or before it stays licensed forever.',
        },
        {
          name: 'OgeLicenseStatus',
          type: "'licensed' | 'development' | 'missing' | 'invalid' | 'expired' | 'not-covered'",
          description: 'Result of <code>ogeLicenseStatus()</code>.',
        },
        {
          name: 'OgeCommercialFamily',
          type: "'pivot' | 'bpmn' | 'scheduler' | 'gantt' | 'kanban' | 'charts' | 'spreadsheet'",
          description: 'The seven families OGE UI Pro covers.',
        },
        {
          name: 'OgeDecodedLicenseKey',
          type: '{ info: OgeLicenseInfo; signed: string; signature: Uint8Array }',
          description: 'A parsed key before verification.',
        },
        {
          name: 'OGE_LICENSE_PUBLIC_KEY',
          type: 'string',
          description:
            'The Ed25519 public key (raw, base64url) that verifies issued keys.',
        },
        {
          name: 'OGE_LICENSE_KEY_PREFIX',
          type: "'OGE1'",
          description: 'Key format prefix.',
        },
        {
          name: 'OGE_LICENSE_WATERMARK_CLASS',
          type: "'oge-license-watermark'",
          description:
            'CSS class of the corner notice, for apps that look for it in tests.',
        },
        {
          name: 'OGE_RELEASE_VERSION',
          type: 'string',
          description: 'The suite version of this build.',
        },
        {
          name: 'OGE_RELEASE_DATE',
          type: 'string',
          description:
            'The release day of this build (<code>YYYY-MM-DD</code>), compared with a key’s <code>expires</code>.',
        },
      ],
    },
  ],
};
