import {
  DOCUMENT,
  inject,
  type EnvironmentProviders,
  type Provider,
  type Type,
} from '@angular/core';
import {
  bootstrapApplication,
  provideClientHydration,
  withEventReplay,
  type BootstrapContext,
} from '@angular/platform-browser';
import {
  BEFORE_APP_SERIALIZED,
  provideServerRendering,
  renderApplication,
} from '@angular/platform-server';
import { format } from 'node:util';

/** The selector every host component in `hosts/` uses. */
export const HOST_SELECTOR = 'app-ssr-host';

/**
 * The page shell an Angular SSR build renders into: with event replay on,
 * the build inlines the event-dispatch contract at the start of `<body>`
 * (its code does not matter here, only that the node is there — it is what
 * Angular inserts the per-page bootstrap call after).
 */
const SHELL =
  '<!doctype html><html lang="en"><head><title>ssr</title></head><body>' +
  '<script type="text/javascript" id="ng-event-dispatch-contract">/* contract */</script>' +
  `<${HOST_SELECTOR}></${HOST_SELECTOR}></body></html>`;

/** Every family's host: the component plus whatever it needs provided. */
export interface SsrFamily {
  readonly name: string;
  readonly host: Type<unknown>;
  readonly providers?: readonly (Provider | EnvironmentProviders)[];
  /** Strings the family's components must have put in the markup. */
  readonly expect: readonly string[];
}

/**
 * Console lines that are gaps in the server DOM emulation, not defects.
 * Domino's `<option>` has no `selected` IDL property (only the reflected
 * `defaultSelected`), so dev-mode Angular reports NG0303 for `[selected]` on
 * the server. The components bind `[attr.selected]` beside it, which is what
 * puts the selection into the server HTML — `server-render.spec.ts` asserts
 * that attribute is there.
 */
export const SERVER_DOM_GAPS: readonly RegExp[] = [
  /^NG0303: Can't bind to 'selected' since it isn't a known property of 'option'/,
];

export interface ServerRender {
  readonly html: string;
  /** Everything Angular (or a component) reported through the console. */
  readonly console: readonly string[];
}

/**
 * Angular (22.2) inserts the event-replay bootstrap `<script>` into `<body>`
 * *after* computing the hydration annotations, so every node located by a
 * path from `<body>` ends up one sibling off and the client fails with
 * NG0509. Folding the call into the contract script keeps the body's child
 * list as annotated. Same fix as the docs prerender
 * (`apps/dev-app/src/app/event-replay-script.ts`, which also normalizes the
 * call for its CSP hash); `hydration.spec.ts` pins the upstream bug.
 */
export function foldReplayBootstrap(doc: Document): void {
  const contract = doc.getElementById('ng-event-dispatch-contract');
  if (contract === null) return;
  for (const script of Array.from(doc.querySelectorAll('script'))) {
    if (script === contract || script.hasAttribute('type')) continue;
    const code = script.textContent ?? '';
    if (!code.startsWith('window.__jsaction_bootstrap(')) continue;
    contract.textContent = `${contract.textContent ?? ''}\n${code}`;
    script.remove();
  }
}

export interface RenderOptions {
  /** Apply {@link foldReplayBootstrap} (default `true`). */
  readonly fold?: boolean;
}

/**
 * `renderApplication` the way the docs prerender (and an Angular SSR server)
 * does it: the server platform, hydration annotations with event replay — so
 * the server-side hydration checks (NG0503 projected DOM nodes, NG0504
 * misplaced `ngSkipHydration`) run too — and every console line captured.
 * Angular reports a render-time error through `ErrorHandler` → `console.error`
 * rather than rejecting, so an empty console is part of "it rendered".
 */
export async function renderOnServer(
  family: SsrFamily,
  options: RenderOptions = {},
): Promise<ServerRender> {
  const lines: string[] = [];
  const capture = (...args: unknown[]) => {
    const line = format(...args);
    if (!SERVER_DOM_GAPS.some((gap) => gap.test(line))) lines.push(line);
  };
  const error = vi.spyOn(console, 'error').mockImplementation(capture);
  const warn = vi.spyOn(console, 'warn').mockImplementation(capture);
  const fold: Provider[] =
    options.fold === false
      ? []
      : [
          {
            provide: BEFORE_APP_SERIALIZED,
            useFactory: () => {
              const doc = inject(DOCUMENT);
              return () => foldReplayBootstrap(doc);
            },
            multi: true,
          },
        ];
  try {
    const html = await renderApplication(
      (context: BootstrapContext) =>
        bootstrapApplication(
          family.host,
          {
            providers: [
              provideServerRendering(),
              provideClientHydration(withEventReplay()),
              ...fold,
              ...(family.providers ?? []),
            ],
          },
          context,
        ),
      {
        document: SHELL,
        url: 'http://localhost/',
        allowedHosts: ['localhost'],
      },
    );
    return { html, console: lines };
  } finally {
    error.mockRestore();
    warn.mockRestore();
  }
}
