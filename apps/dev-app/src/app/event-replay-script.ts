/**
 * Post-processes the two inline scripts `withEventReplay()` adds to every
 * prerendered page, from the server config's `BEFORE_APP_SERIALIZED` hook.
 *
 * Angular emits the event-dispatch contract (`#ng-event-dispatch-contract`,
 * constant per Angular version) and, right after it, a one-line
 * `window.__jsaction_bootstrap(document.body, "ng", [...], [...])` call
 * listing the event types *that* page listens to. Two problems follow:
 *
 * 1. **Hydration.** Angular inserts the bootstrap `<script>` into `<body>`
 *    *after* it has computed the hydration annotations. Nodes Angular can
 *    only locate by a path from `<body>` — content projected into a component
 *    and rendered outside that component's host, which is how
 *    `<oge-tab-panel>` / `<oge-stepper>` render their `<oge-tab>` /
 *    `<oge-step>` children — are then one sibling off, and the client fails
 *    with NG0509 and leaves the whole view unhydrated (Angular 22.2; an
 *    upstream ordering bug, not specific to these components). Folding the
 *    call into the contract script restores the body's child list the
 *    annotations were computed against.
 * 2. **CSP.** The docs are served from a static host, so the CSP in
 *    `vercel.json` admits inline scripts by hash; 146 pages yielded ~75
 *    distinct bootstrap calls. The call is normalized to the sorted union of
 *    {@link REPLAYED_EVENTS} and the page's own lists, so every page carries
 *    the same single script and the policy one hash. Listing more types than
 *    a page needs is harmless: the early contract only queues events until
 *    hydration, and replay dispatches just those whose target carries a
 *    matching `jsaction`. A page needing a type missing here still works —
 *    its script simply differs, and `docs-tools:csp-check` fails with the new
 *    hash, which is the cue to add the type here.
 *
 * Proven by `apps/dev-app-e2e/ssr/hydration.spec.ts` (every route hydrates
 * under the production CSP) and `event-replay-script.spec.ts`.
 */
export const REPLAYED_EVENTS = {
  regular: [
    'beforeinput',
    'change',
    'click',
    'compositionend',
    'compositionstart',
    'contextmenu',
    'copy',
    'dblclick',
    'dragenter',
    'dragleave',
    'dragover',
    'drop',
    'focusin',
    'focusout',
    'input',
    'keydown',
    'keyup',
    'mousedown',
    'paste',
    'pointercancel',
    'pointerdown',
    'pointermove',
    'pointerover',
    'pointerup',
    'submit',
    'wheel',
  ],
  capture: ['blur', 'error', 'focus', 'load'],
} as const;

/** `id` of the contract script Angular's build inlines into the page. */
export const EVENT_DISPATCH_CONTRACT_ID = 'ng-event-dispatch-contract';

const BOOTSTRAP_CALL =
  /^window\.__jsaction_bootstrap\(document\.body,("[^"]*"),(\[[^\]]*\]),(\[[^\]]*\])\);$/;

function union(fixed: readonly string[], page: string): string {
  const types = new Set<string>(fixed);
  for (const type of JSON.parse(page) as string[]) types.add(type);
  return JSON.stringify([...types].sort());
}

/**
 * The normalized bootstrap call for `script`, or `null` when `script` is not
 * Angular's replay bootstrap call.
 */
export function normalizeReplayBootstrap(script: string): string | null {
  const match = BOOTSTRAP_CALL.exec(script.trim());
  if (!match) return null;
  const [, appId, regular, capture] = match;
  return (
    `window.__jsaction_bootstrap(document.body,${appId},` +
    `${union(REPLAYED_EVENTS.regular, regular)},` +
    `${union(REPLAYED_EVENTS.capture, capture)});`
  );
}

/**
 * Folds the (normalized) bootstrap call into the contract script and removes
 * its own `<script>`, in place. A page without event replay is left alone.
 */
export function prepareReplayScripts(doc: Document): void {
  const contract = doc.getElementById(EVENT_DISPATCH_CONTRACT_ID);
  if (contract === null) return;
  for (const script of Array.from(doc.querySelectorAll('script'))) {
    if (script === contract || script.hasAttribute('src')) continue;
    if (script.hasAttribute('type')) continue;
    const call = normalizeReplayBootstrap(script.textContent ?? '');
    if (call === null) continue;
    contract.textContent = `${contract.textContent ?? ''}\n${call}`;
    script.remove();
  }
}
