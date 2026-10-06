// @vitest-environment jsdom
import { type ApplicationRef } from '@angular/core';
import {
  bootstrapApplication,
  provideClientHydration,
} from '@angular/platform-browser';
import { format } from 'node:util';
import { FAMILIES } from './hosts';
import { TABS } from './hosts/ui';
import {
  HOST_SELECTOR,
  renderOnServer,
  type RenderOptions,
  type SsrFamily,
} from './render';

/**
 * The hydration round trip per family (ARCHITECTURE → "SSR and hydration"):
 * the server render from `renderOnServer` is loaded into a browser document
 * and bootstrapped with `provideClientHydration()`. Hydration must claim the
 * server DOM — the same element objects survive, every `ngh` annotation is
 * consumed — and report nothing: dev-mode Angular explains each NG05xx
 * mismatch (with the offending node) on the console, which is what this
 * asserts against. The browser-level crawl over the prerendered docs is
 * `apps/dev-app-e2e/ssr/hydration.spec.ts`.
 */
async function hydrate(
  family: SsrFamily,
  options?: RenderOptions,
): Promise<{
  readonly console: readonly string[];
  readonly pending: number;
  readonly reused: boolean;
  readonly hydratedLog: string | undefined;
  readonly adopted: readonly boolean[];
}> {
  const { html } = await renderOnServer(family, options);
  const body = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)?.[1] ?? '';
  document.body.innerHTML = body;
  const host = document.querySelector(HOST_SELECTOR);
  const firstChild = host?.firstElementChild ?? null;
  const survivors = (family.survives ?? []).map((selector) =>
    document.querySelector(selector),
  );

  const lines: string[] = [];
  const logs: string[] = [];
  const capture = (...args: unknown[]) => lines.push(format(...args));
  const error = vi.spyOn(console, 'error').mockImplementation(capture);
  const warn = vi.spyOn(console, 'warn').mockImplementation(capture);
  const log = vi
    .spyOn(console, 'log')
    .mockImplementation((...args: unknown[]) => logs.push(format(...args)));
  let app: ApplicationRef | undefined;
  try {
    try {
      app = await bootstrapApplication(family.host, {
        providers: [provideClientHydration(), ...(family.providers ?? [])],
      });
      await app.whenStable();
    } catch (failure) {
      // a hydration error thrown while bootstrapping counts like a logged one
      lines.push(String(failure));
    }
    return {
      console: lines,
      pending: document.querySelectorAll('[ngh]').length,
      reused: firstChild !== null && firstChild.isConnected,
      hydratedLog: logs.find((line) => line.includes('hydrated')),
      adopted: survivors.map((el) => el !== null && el.isConnected),
    };
  } finally {
    app?.destroy();
    error.mockRestore();
    warn.mockRestore();
    log.mockRestore();
    document.body.innerHTML = '';
  }
}

describe('hydration round trip (server render → provideClientHydration)', () => {
  for (const family of FAMILIES) {
    it(`${family.name}: hydrates the server DOM without a mismatch`, async () => {
      const result = await hydrate(family);
      expect(result.console).toEqual([]);
      expect(result.pending).toBe(0);
      expect(result.reused).toBe(true);
      expect(result.hydratedLog).toMatch(/hydrated \d+ component/);
      expect(result.adopted).toEqual((family.survives ?? []).map(() => true));
    });
  }

  /**
   * Pins the upstream ordering bug `foldReplayBootstrap` works around: left
   * where Angular inserts it, the replay bootstrap script shifts every
   * body-relative hydration path, and `<oge-tab-panel>`'s projected tab
   * content (rendered outside the `<oge-tab>` host, so located from
   * `<body>`) is not found. When this starts failing, Angular has fixed the
   * ordering: drop the fold here and in the docs' server config.
   */
  it('without the fold, event replay breaks body-relative paths (Angular 22.2)', async () => {
    const result = await hydrate(TABS, { fold: false });
    expect(result.pending).toBeGreaterThan(0);
    expect(result.console.join('\n')).toMatch(
      /NG0509|Expecting instance of DOM Element/,
    );
  });
});
