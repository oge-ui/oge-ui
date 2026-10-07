/** Code samples rendered on the CSP and Trusted Types guide. */
import { demoSource } from '../../shared/demo-source';

/** The policy `apps/dev-app-e2e/ssr/strict-csp.spec.ts` serves the docs under. */
export const STRICT_POLICY = `Content-Security-Policy:
  default-src 'self';
  script-src 'nonce-{NONCE}' 'strict-dynamic';
  style-src 'self' 'nonce-{NONCE}';
  style-src-attr 'unsafe-inline';
  img-src 'self' data: blob:;
  font-src 'self' data:;
  connect-src 'self';
  worker-src 'self' blob:;
  object-src 'none';
  base-uri 'self';
  frame-ancestors 'none';
  form-action 'self';
  require-trusted-types-for 'script';
  trusted-types angular angular#bundler oge-ui#bpmn oge-ui#editor`;

export const STATIC_POLICY = `# a static host cannot mint a nonce — allow component styles inline
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  object-src 'none';
  base-uri 'self'`;

export const ANGULAR_NONCE = `<!-- index.html as your server sends it: the same per-request nonce as the header.
     Angular stamps it on the <style> elements it adds for component styles. -->
<app-root ngCspNonce="{NONCE}"></app-root>`;

export const ANGULAR_NONCE_PROVIDER = `// …or provide it in code (e.g. read from a meta tag your server writes)
import { ApplicationConfig, CSP_NONCE } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: CSP_NONCE,
      useFactory: () =>
        document.querySelector<HTMLMetaElement>('meta[name="csp-nonce"]')
          ?.content ?? null,
    },
  ],
};`;

export const SANITIZE_URL_REACT = `'use client';

import { sanitizeUrl } from '@oge-ui/behavior';

interface Link {
  readonly label: string;
  readonly url: string;
}

// links from a CMS or an API: javascript: and other script schemes become about:blank
export function CmsLinks({ links }: { links: readonly Link[] }) {
  return (
    <ul>
      {links.map((link) => (
        <li key={link.label}>
          <a href={sanitizeUrl(link.url, { allowedSchemes: ['web+app'] })}>
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );
}`;

export const EDITOR_SANITIZE = demoSource({
  helpers: { '@oge-ui/editor': ['ogeSanitizeEditorHtml'] },
  template: `<article [innerHTML]="html"></article>`,
  body: `// stored rich text, rendered outside the editor: the same allowlist the editor
// applies to its value, pastes and drops (scripts, styles, svg, iframes and
// event handlers are dropped; href/src go through sanitizeUrl)
readonly html = ogeSanitizeEditorHtml(
  '<p>Hello <a href="javascript:alert(1)">there</a><script>steal()</script></p>',
);`,
});
