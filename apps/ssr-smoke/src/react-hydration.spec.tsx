import { JSDOM } from 'jsdom';
import { format } from 'node:util';
import { populateGlobal } from 'vitest/environments';

/**
 * Every React family renders on a real server and hydrates on a client with
 * zero warnings, under `<StrictMode>` (ARCHITECTURE → "SSR and hydration").
 *
 * The file runs in plain Node, so the first half is a genuine server render:
 * no `window`, `document`, storage, observers or animation frames — a
 * component that touches one while rendering throws, exactly as in a Next.js
 * or Remix server, and one that branches on `typeof window` renders its
 * server branch. Then a browser DOM is installed, the modules are loaded
 * afresh (a client bundle evaluates them with `window` present) and the same
 * trees hydrate that markup: any difference between the two branches is a
 * hydration mismatch, reported through `onRecoverableError` or
 * `console.error`.
 */
type Families = typeof import('./react/families');

const serverHtml = new Map<string, string>();
let client: {
  readonly families: Families;
  readonly react: typeof import('react');
  readonly dom: typeof import('react-dom/client');
};
let restoreGlobals: () => void = () => undefined;

/**
 * The server renders at 10:00 and the client hydrates seven minutes later —
 * a cached or streamed page is never hydrated the instant it was rendered —
 * so anything positioned from the wall clock (a now-line, a today marker)
 * has to be kept out of the hydration render to match.
 */
const SERVER_TIME = new Date(2026, 9, 6, 10, 0);
const CLIENT_TIME = new Date(2026, 9, 6, 10, 7);

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(SERVER_TIME);
  expect(typeof window).toBe('undefined');
  expect(typeof document).toBe('undefined');
  const { REACT_FAMILIES } = await import('./react/families');
  const { createElement, StrictMode } = await import('react');
  const { renderToString } = await import('react-dom/server');
  for (const family of REACT_FAMILIES) {
    serverHtml.set(
      family.name,
      renderToString(createElement(StrictMode, null, family.tree())),
    );
  }

  const jsdom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/',
    pretendToBeVisual: true,
  });
  const { keys, originals } = populateGlobal(globalThis, jsdom.window, {
    bindFunctions: true,
  });
  restoreGlobals = () => {
    for (const key of keys) {
      if (originals.has(key)) {
        (globalThis as Record<string, unknown>)[key] = originals.get(key);
      } else {
        delete (globalThis as Record<string, unknown>)[key];
      }
    }
    jsdom.window.close();
  };
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;

  vi.setSystemTime(CLIENT_TIME);
  vi.resetModules();
  client = {
    families: await import('./react/families'),
    react: await import('react'),
    dom: await import('react-dom/client'),
  };
}, 60_000);

afterAll(() => {
  restoreGlobals();
  vi.useRealTimers();
});

describe('React SSR: renderToString in Node → hydrateRoot (StrictMode)', () => {
  // the list is static; the module instance used below is the client one
  const names = [
    'react-grid',
    'react-tree-list',
    'react-pivot',
    'react-charts',
    'react-scheduler',
    'react-scheduler-today',
    'react-gantt',
    'react-kanban',
    'react-bpmn',
    'react-inputs',
    'react-overlay',
    'react-navigation',
    'react-layout',
    'react-tabs',
    'react-buttons',
    'react-forms',
    'react-upload',
    'react-editor',
  ];

  it('covers every family the hosts list', () => {
    expect(client.families.REACT_FAMILIES.map((f) => f.name)).toEqual(names);
  });

  for (const name of names) {
    it(`${name}: hydrates the server markup with no warnings`, async () => {
      const family = client.families.REACT_FAMILIES.find(
        (f) => f.name === name,
      );
      if (family === undefined) throw new Error(`no family ${name}`);
      const html = serverHtml.get(name) ?? '';
      for (const text of family.expect) expect(html).toContain(text);

      const { act, createElement, StrictMode } = client.react;
      const container = document.createElement('div');
      container.innerHTML = html;
      document.body.appendChild(container);
      const firstElement = container.firstElementChild;

      const lines: string[] = [];
      const capture = (...args: unknown[]) => lines.push(format(...args));
      const error = vi.spyOn(console, 'error').mockImplementation(capture);
      const warn = vi.spyOn(console, 'warn').mockImplementation(capture);
      const recoverable: string[] = [];
      let root: import('react-dom/client').Root | undefined;
      try {
        await act(async () => {
          root = client.dom.hydrateRoot(
            container,
            createElement(StrictMode, null, family.tree()),
            {
              onRecoverableError: (failure) =>
                recoverable.push(String(failure)),
            },
          );
        });
        expect(recoverable).toEqual([]);
        expect(lines).toEqual([]);
        // hydration adopted the server DOM instead of replacing it
        expect(firstElement?.isConnected).toBe(true);
      } finally {
        await act(async () => root?.unmount());
        error.mockRestore();
        warn.mockRestore();
        container.remove();
      }
    });
  }
});
