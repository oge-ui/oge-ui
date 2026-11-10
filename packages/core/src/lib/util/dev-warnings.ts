/**
 * Coded development warnings. Every warning the suite prints during
 * development carries a stable `OGE####` code and a link to its entry on
 * `/guides/dev-warnings`, so a console line can be looked up instead of
 * reverse-engineered. The registry below is the single source: the docs page
 * renders it and `llms-full.txt` is generated from it, so a new warning is a
 * new entry here plus an `ogeDevWarn(code, …)` call — never a bare
 * `console.warn`.
 *
 * Production builds stay silent: Angular apps through `ngDevMode`, every
 * other toolchain through `NODE_ENV` (`development` and `test` warn; a
 * toolchain with neither signal is treated as production).
 *
 * License notices (`[OGE UI] … — https://www.ogeui.com/license`) are not
 * development warnings: they are shown in production on purpose.
 */

declare const ngDevMode: boolean | object | undefined;
declare const process: { env?: Record<string, string | undefined> } | undefined;

/** One registered development warning. */
export interface OgeDevWarningInfo {
  /** Short title, e.g. "A close guard threw or rejected". */
  readonly title: string;
  /** Packages that can print it. */
  readonly packages: readonly string[];
  /** Why it appears. */
  readonly cause: string;
  /** What to change. */
  readonly fix: string;
}

/** Every development warning the suite can print, by code. */
export const OGE_DEV_WARNINGS = {
  OGE1001: {
    title: 'A close guard threw or rejected',
    packages: ['@oge-ui/overlay', '@oge-ui/navigation', '@oge-ui/core'],
    cause:
      'A `closeGuard` (modal, drawer, window, popover…) threw or returned a rejected promise.',
    fix: 'The close is treated as vetoed. Return `false` (or resolve to `false`) to keep the surface open on purpose, and catch errors inside the guard.',
  },
  OGE1002: {
    title: 'A deprecated message key is in use',
    packages: ['every family'],
    cause:
      'A messages catalog or locale override supplies a key that is deprecated; it is still honoured for one minor release.',
    fix: 'Supply the replacement key named in the warning (usually an ICU plural branch) and drop the old one.',
  },
  OGE1003: {
    title: 'A cycle in hierarchical data',
    packages: ['@oge-ui/core', 'tree view, tree list, tree select'],
    cause:
      'A row is its own ancestor through the parent / children fields (`parentIdExpr`, `itemsExpr`).',
    fix: 'The cyclic subtree is skipped. Fix the data so every parent chain ends at the root value.',
  },
  OGE2001: {
    title: 'An attribute was not applied',
    packages: [
      '@oge-ui/overlay',
      '@oge-ui/buttons',
      '@oge-ui/navigation',
      '@oge-ui/layout',
    ],
    cause:
      'An attribute bag (`panelAttributes`, `dropdownAttributes`, `htmlAttributes`…) had an event handler, `srcdoc`, `style`, `class`, an unsafe URL, an invalid name or an attribute the component sets itself.',
    fix: 'Use the class and style inputs of the part for classes and styles, the component inputs for ARIA it owns, and never pass handlers as attributes.',
  },
  OGE2002: {
    title: 'An open popup never rendered',
    packages: ['@oge-ui/overlay', 'every popup editor'],
    cause:
      'An anchored panel was opened but its anchor or panel element never appeared in the DOM.',
    fix: 'Render the popup while the panel model is open (`@if (panel.isOpen())` / `{panel.isOpen && …}`) and hand the element to the panel.',
  },
  OGE2003: {
    title: 'PDF text the built-in fonts cannot draw',
    packages: ['grid, tree list, pivot, gantt, scheduler PDF export'],
    cause:
      'The exported text contains characters outside WinAnsi (for example Turkish ğ ş ı İ), which the built-in PDF fonts cannot draw.',
    fix: 'Pass a Unicode TrueType font through the `font` option or `setOgePdfDefaultFont()`.',
  },
  OGE3001: {
    title: '`holdToConfirm` and `autoRepeat` together',
    packages: ['@oge-ui/buttons', '@oge-ui/react-buttons'],
    cause: 'A button sets both press behaviours; they are mutually exclusive.',
    fix: '`holdToConfirm` wins. Remove one of the two inputs.',
  },
  OGE3002: {
    title: 'Selectable buttons without a value',
    packages: ['@oge-ui/buttons', '@oge-ui/react-buttons'],
    cause:
      'A button group has a `selectionMode` but some buttons carry no `value`.',
    fix: 'Give every button a `value`; buttons without one cannot be selected.',
  },
  OGE3101: {
    title: '`virtualScroll` ignores `groupBy`',
    packages: ['select box, tag box, autocomplete (both layers)'],
    cause: 'Group headers are not rendered in virtual mode.',
    fix: 'Drop `groupBy`, or turn virtual scrolling off for grouped lists.',
  },
  OGE3102: {
    title: '`virtualScroll` ignores `wrapItemText`',
    packages: ['select box, autocomplete (both layers)'],
    cause: 'Virtual mode needs fixed-height rows, so long items cannot wrap.',
    fix: 'Drop `wrapItemText`, or turn virtual scrolling off.',
  },
  OGE3201: {
    title: 'Item rules ignored on a bound form',
    packages: ['@oge-ui/forms'],
    cause:
      '`validationRules`, `isRequired`, `disabled` or `readOnly` sit on an item of a form bound with `[fieldTree]` or `[formGroup]`, which owns that state.',
    fix: 'Express the rule in the schema (`required()`, `disabled()`, `readonly()`) or on the control.',
  },
  OGE3301: {
    title: '`expandAll()` needs multiple expansion',
    packages: ['accordion, panel bar (both layers)'],
    cause:
      '`expandAll()` was called while only one item may be expanded at a time.',
    fix: 'Set `multiple` (accordion) or `expandMode="multiple"` (panel bar), or expand items one by one.',
  },
  OGE3302: {
    title: 'An unreadable splitter pane size',
    packages: ['@oge-ui/layout', '@oge-ui/react-layout'],
    cause:
      'A pane `size` is neither a share number, a `"<n>%"` nor a `"<n>px"` value.',
    fix: 'The size is ignored. Use a number, a percentage or a pixel value.',
  },
  OGE3401: {
    title: 'A stepper button without a stepper',
    packages: ['@oge-ui/navigation'],
    cause:
      'An `ogeStepperNext` / `ogeStepperPrevious` button is neither inside an `<oge-stepper>` nor bound to one.',
    fix: 'Place the button inside the stepper or bind it with `[ogeStepperTarget]`.',
  },
} as const satisfies Readonly<Record<string, OgeDevWarningInfo>>;

/** A registered development warning code. */
export type OgeDevWarningCode = keyof typeof OGE_DEV_WARNINGS;

/** Where every code is explained. */
export const OGE_DEV_WARNINGS_URL = 'https://www.ogeui.com/guides/dev-warnings';

/**
 * Whether development warnings are on: Angular's `ngDevMode` when the app
 * defines it, otherwise `NODE_ENV` `development` or `test`. No signal at all
 * counts as production — a shipped app never warns forever.
 */
export function ogeIsDevMode(): boolean {
  if (typeof ngDevMode !== 'undefined') return !!ngDevMode;
  if (typeof process === 'undefined' || typeof process.env === 'undefined') {
    return false;
  }
  const env = process.env['NODE_ENV'];
  return env === 'development' || env === 'test';
}

const printed = new Set<string>();

/** Options of {@link ogeDevWarn}. */
export interface OgeDevWarnOptions {
  /** Print only once per distinct `once` key (e.g. per message key). */
  readonly once?: string;
  /** `console.error` for misuse that changes behaviour. Default `'warn'`. */
  readonly level?: 'warn' | 'error';
}

/**
 * Prints a coded development warning:
 * `[OGE3101] <detail> — https://www.ogeui.com/guides/dev-warnings#oge3101`.
 * Silent in production (see {@link ogeIsDevMode}).
 */
export function ogeDevWarn(
  code: OgeDevWarningCode,
  detail: string,
  options: OgeDevWarnOptions = {},
): void {
  if (!ogeIsDevMode() || typeof console === 'undefined') return;
  if (options.once !== undefined) {
    const key = `${code}|${options.once}`;
    if (printed.has(key)) return;
    printed.add(key);
  }
  const text = `[${code}] ${detail} — ${OGE_DEV_WARNINGS_URL}#${code.toLowerCase()}`;
  if (options.level === 'error') console.error(text);
  else console.warn(text);
}
