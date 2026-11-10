/**
 * Consumer-supplied classes and attributes for a component's parts (the
 * panel of a popover, the backdrop of a modal, …).
 *
 * Classes are joined, never interpreted. Attributes are a free-form bag, so
 * they are the one place a design-system integration could hand the DOM an
 * event handler or a script URL — `{ onclick: '…' }` written with
 * `setAttribute` runs on click, and React spreads whatever it is given. The
 * filter below is therefore an allowlist of *shapes* and a denylist of the
 * attributes that execute or that the component itself owns:
 *
 * - names must be valid attribute names; anything else is dropped;
 * - `on*` handlers, `srcdoc`, and `style` / `class` (use the dedicated class
 *   and style inputs, which merge with the component's own) are dropped;
 * - URL-valued attributes (`href`, `src`, `action`, `formaction`, …) keep
 *   their value only when {@link sanitizeUrl} accepts it;
 * - the caller may reserve the attributes it binds itself (`role`,
 *   `aria-modal`, `tabindex`…) so a bag cannot fight the component's own
 *   bindings.
 *
 * Dropped keys raise one dev-mode warning each, so a typo or an unsafe key is
 * visible during development and silent in production.
 */
import { ogeClassList, type OgeClassValue } from '../dom/class-value';
import { sanitizeResourceUrl, sanitizeUrl } from './sanitize-url';

declare const ngDevMode: boolean | undefined;

/** A free-form attribute bag for a component part (`data-*`, `aria-*`, `id`…). */
export type OgeHtmlAttributes = Readonly<Record<string, string>>;

/** Valid XML/HTML attribute names (namespaced `xlink:href` included). */
const NAME = /^[a-zA-Z_:][-a-zA-Z0-9_:.]*$/;

/** Attributes that run script or take over the component's own styling. */
const BLOCKED: ReadonlySet<string> = new Set(['srcdoc', 'style', 'class']);

/** Attributes whose value navigates to or loads a URL. */
const NAVIGATING: ReadonlySet<string> = new Set([
  'href',
  'xlink:href',
  'action',
  'formaction',
  'ping',
  'cite',
  'codebase',
  'data',
]);
const LOADING: ReadonlySet<string> = new Set([
  'src',
  'poster',
  'background',
  'lowsrc',
  'dynsrc',
]);

const warned = new Set<string>();

function warnDropped(name: string, reason: string): void {
  if (typeof ngDevMode !== 'undefined' && !ngDevMode) return;
  const key = `${name}|${reason}`;
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[oge] attribute "${name}" was not applied: ${reason}.`);
}

/**
 * The safe subset of `attributes`: invalid names, event handlers, `srcdoc`,
 * `style`, `class`, unsafe URLs and the `reserved` names are left out (see
 * the module comment). Always returns a new object; `undefined` gives `{}`.
 */
export function ogeSafeAttributes(
  attributes: OgeHtmlAttributes | null | undefined,
  reserved: readonly string[] = [],
): Record<string, string> {
  const safe: Record<string, string> = {};
  if (!attributes) return safe;
  const owned = new Set(reserved.map((name) => name.toLowerCase()));
  for (const [name, raw] of Object.entries(attributes)) {
    const lower = name.toLowerCase();
    const value = raw == null ? '' : String(raw);
    if (!NAME.test(name)) {
      warnDropped(name, 'not a valid attribute name');
    } else if (lower.startsWith('on')) {
      warnDropped(name, 'event handler attributes are never applied');
    } else if (BLOCKED.has(lower)) {
      warnDropped(
        name,
        lower === 'srcdoc'
          ? 'it can run script'
          : 'use the class or style input of the part instead',
      );
    } else if (owned.has(lower)) {
      warnDropped(name, 'the component sets it itself');
    } else if (NAVIGATING.has(lower) && sanitizeUrl(value) !== value) {
      warnDropped(name, 'the URL scheme is not allowed');
    } else if (LOADING.has(lower) && sanitizeResourceUrl(value) !== value) {
      warnDropped(name, 'the URL scheme is not allowed');
    } else {
      safe[name] = value;
    }
  }
  return safe;
}

/**
 * Space-separated class text from any mix of class values (strings, arrays,
 * `{ name: boolean }` maps) and empty values, with duplicates removed —
 * ready for a `class` binding or a React `className`.
 */
export function ogeClassNames(
  ...values: readonly (OgeClassValue | false)[]
): string {
  const seen = new Set<string>();
  for (const value of values) {
    if (value) for (const name of ogeClassList(value)) seen.add(name);
  }
  return [...seen].join(' ');
}

/**
 * Writes `next` onto `element` and removes the names of `previous` that
 * `next` no longer has, so clearing a bag clears the DOM. Returns the names
 * now applied — the caller keeps them as the next `previous`. `next` is
 * expected to be the output of {@link ogeSafeAttributes}.
 */
export function ogeApplyAttributes(
  element: Element,
  next: Readonly<Record<string, string>>,
  previous: readonly string[],
): string[] {
  for (const name of previous) {
    if (!(name in next)) element.removeAttribute(name);
  }
  for (const [name, value] of Object.entries(next)) {
    if (element.getAttribute(name) !== value) element.setAttribute(name, value);
  }
  return Object.keys(next);
}

/**
 * Attributes each part binds itself, per part — the `reserved` argument of
 * {@link ogeSafeAttributes}. Shared so both render layers refuse the same
 * keys.
 */
export const OGE_PART_OWNED_ATTRIBUTES = {
  /** `.oge-popup` (menus, drop-downs, pickers). */
  popup: ['id', 'popover', 'data-placement'],
  /** `.oge-popover`. */
  popover: [
    'id',
    'role',
    'tabindex',
    'popover',
    'aria-modal',
    'aria-label',
    'aria-labelledby',
    'data-placement',
  ],
  /** `.oge-modal` (the dialog panel). */
  modal: [
    'role',
    'tabindex',
    'popover',
    'aria-modal',
    'aria-label',
    'aria-labelledby',
    'aria-describedby',
    'aria-busy',
  ],
} as const satisfies Readonly<Record<string, readonly string[]>>;
