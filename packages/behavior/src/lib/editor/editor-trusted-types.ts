/**
 * Trusted Types support for the rich-text editor's one parser call.
 *
 * Under `Content-Security-Policy: require-trusted-types-for 'script'`,
 * `DOMParser.parseFromString` refuses a plain string. The editor parses HTML
 * in exactly one place — turning a `value` or a clipboard payload into its
 * document model (`editor-html.ts`) — and the parsed document is never
 * inserted anywhere: a `DOMParser` document is inert (no scripts run, no
 * images load, no event handlers fire) and is only *walked*, keeping the
 * allow-listed tags, attributes and URLs as model data. The live editor is
 * then built from that model with `createElement`, never from markup. So the
 * policy's `createHTML` returns its input unchanged; it exists to tell the
 * browser that this sink is deliberate.
 *
 * The policy is named {@link OGE_EDITOR_TRUSTED_TYPES_POLICY}; a page with a
 * `trusted-types` CSP directive lists that name. It is created once, lazily,
 * on the first parse; without `globalThis.trustedTypes` (older browsers,
 * server rendering, tests) a plain string is passed as before.
 */

/** Name of the Trusted Types policy the rich-text editor registers. */
export const OGE_EDITOR_TRUSTED_TYPES_POLICY = 'oge-ui#editor';

interface TrustedTypePolicyLike {
  createHTML(input: string): unknown;
}

interface TrustedTypesFactoryLike {
  createPolicy(
    name: string,
    rules: { createHTML: (input: string) => string },
  ): TrustedTypePolicyLike;
}

/** `undefined` = not looked up yet; `null` = no Trusted Types available. */
let policy: TrustedTypePolicyLike | null | undefined;

function editorPolicy(): TrustedTypePolicyLike | null {
  if (policy !== undefined) return policy;
  const factory = (globalThis as { trustedTypes?: TrustedTypesFactoryLike })
    .trustedTypes;
  if (factory === undefined || typeof factory.createPolicy !== 'function') {
    policy = null;
    return policy;
  }
  try {
    policy = factory.createPolicy(OGE_EDITOR_TRUSTED_TYPES_POLICY, {
      createHTML: (input) => input,
    });
  } catch {
    // the page's `trusted-types` directive does not allow the name — fall
    // back to a plain string and let the browser report the violation
    policy = null;
  }
  return policy;
}

/**
 * The `DOMParser.parseFromString` argument for `markup`: a `TrustedHTML`
 * when Trusted Types are available, the string itself otherwise. Typed as
 * `string` because that is what the DOM lib signature accepts.
 */
export function ogeEditorParserInput(markup: string): string {
  const active = editorPolicy();
  return active === null ? markup : (active.createHTML(markup) as string);
}

/** Test seam: forget the cached policy so the next parse looks it up again. */
export function resetOgeEditorTrustedTypesPolicyForTests(): void {
  policy = undefined;
}
