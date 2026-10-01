/**
 * Trusted Types support for the engine's two `DOMParser` calls.
 *
 * Under `Content-Security-Policy: require-trusted-types-for 'script'`,
 * `DOMParser.parseFromString` refuses a plain string. The engine parses two
 * kinds of input — overlay badge markup (`overlay-html.ts`) and BPMN XML
 * (`bpmn-xml-reader.ts`) — and neither result is ever inserted into the live
 * document: the parsed document is inert (no scripts run, no resources load)
 * and is only walked, the overlay tree being re-sanitised against an
 * allowlist on the way out. So the policy's `createHTML` returns its input
 * unchanged; it exists to tell the browser that this sink is deliberate.
 *
 * The policy is named {@link OGE_BPMN_TRUSTED_TYPES_POLICY} — a page with a
 * `trusted-types` CSP directive lists that name to allow it. It is created
 * once, lazily, on the first parse; without `globalThis.trustedTypes` (older
 * browsers, server rendering, tests) a plain string is passed as before.
 */

/** Name of the Trusted Types policy the BPMN engine registers. */
export const OGE_BPMN_TRUSTED_TYPES_POLICY = 'oge-ui#bpmn';

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

function bpmnPolicy(): TrustedTypePolicyLike | null {
  if (policy !== undefined) return policy;
  const factory = (globalThis as { trustedTypes?: TrustedTypesFactoryLike })
    .trustedTypes;
  if (factory === undefined || typeof factory.createPolicy !== 'function') {
    policy = null;
    return policy;
  }
  try {
    policy = factory.createPolicy(OGE_BPMN_TRUSTED_TYPES_POLICY, {
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
export function bpmnParserInput(markup: string): string {
  const active = bpmnPolicy();
  return active === null ? markup : (active.createHTML(markup) as string);
}

/** Test seam: forget the cached policy so the next parse looks it up again. */
export function resetBpmnTrustedTypesPolicyForTests(): void {
  policy = undefined;
}
