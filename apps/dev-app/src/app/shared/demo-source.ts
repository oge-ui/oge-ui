/**
 * Builds the source shown in a docs demo's **Code** tab.
 *
 * Docs snippets are the code people (and coding assistants) copy out of
 * ogeui.com, so every demo is rendered as one complete standalone component:
 * imports at the top, `@Component` with an inline template, class members
 * underneath. One copy-paste, and it compiles.
 *
 * That promise is enforced, not asserted — `npx nx run docs-tools:typecheck`
 * extracts every snippet and compiles it with the Angular compiler under
 * `strictTemplates`. Snippets that are deliberately fragments (shell commands,
 * CSS blocks, provider excerpts) are plain strings and exempt from the gate, but
 * the checker always lists them so an exemption stays visible.
 *
 * This module is intentionally free of Angular imports: `*-snippets.ts` files
 * must load in plain Node for the generator and the checker to read them.
 */

/** Class members and fields the template binds to, verbatim. */
export interface DemoSourceInput {
  /**
   * Runtime imports — these land in the import statement **and** the
   * `@Component.imports` array. Keyed by module specifier.
   */
  readonly use?: Readonly<Record<string, readonly string[]>>;
  /**
   * Runtime imports that are **not** declarable — helper functions and classes
   * like `form()`, `Validators`, `FormControl`. Imported, never in `imports: []`.
   */
  readonly helpers?: Readonly<Record<string, readonly string[]>>;
  /** Type-only imports (`OgeMenuItem`, event types…) — never in `imports: []`. */
  readonly types?: Readonly<Record<string, readonly string[]>>;
  /** The component template, authored at zero indentation. */
  readonly template: string;
  /** Class body: fields, methods. Authored at zero indentation. */
  readonly body?: string;
  /** Adds a small inline dataset as a class field, so bindings resolve. */
  readonly dataset?: DemoDataset;
  /**
   * Top-level code emitted between the imports and the component — row
   * interfaces, constants the template's types depend on.
   */
  readonly before?: string;
  /**
   * Top-level code emitted after the component — a dialog content class, an
   * `appConfig` provider block. Anything that cannot live inside the class.
   */
  readonly after?: string;
  /** Defaults to `demo-root`. */
  readonly selector?: string;
  /** Defaults to `Demo`. */
  readonly className?: string;
}

export type DemoDataset = 'employees' | 'org';

/**
 * Symbols pulled from `@angular/core` when the class body mentions them.
 * A closed list on purpose: guessing imports is how generated code breaks, and
 * anything missing here is caught by the compile gate rather than shipped.
 */
const CORE_SYMBOLS = [
  'DestroyRef',
  'ElementRef',
  'TemplateRef',
  'afterNextRender',
  'afterRenderEffect',
  'computed',
  'contentChild',
  'contentChildren',
  'effect',
  'inject',
  'linkedSignal',
  'signal',
  'untracked',
  'viewChild',
  'viewChildren',
] as const;

/** Inline datasets, shaped like the ones the live demos render. */
const DATASETS: Readonly<Record<DemoDataset, string>> = {
  employees: `readonly employees = [
  { id: 1, firstName: 'Ali', lastName: 'Yılmaz', department: 'Engineering', city: 'İstanbul', salary: 8400, hireDate: '2019-03-11' },
  { id: 2, firstName: 'Ayşe', lastName: 'Kaya', department: 'Sales', city: 'Ankara', salary: 7200, hireDate: '2020-07-02' },
  { id: 3, firstName: 'Mehmet', lastName: 'Demir', department: 'Engineering', city: 'İzmir', salary: 9100, hireDate: '2018-01-23' },
  { id: 4, firstName: 'Zeynep', lastName: 'Şahin', department: 'Finance', city: 'İstanbul', salary: 6800, hireDate: '2021-11-15' },
  { id: 5, firstName: 'Emre', lastName: 'Çelik', department: 'Support', city: 'Bursa', salary: 5400, hireDate: '2022-05-09' },
];`,
  org: `readonly org = [
  { id: 1, parentId: null, name: 'Aylin Koç', title: 'CEO', office: 'İstanbul', headcount: 4 },
  { id: 2, parentId: 1, name: 'Baran Ateş', title: 'VP Engineering', office: 'İstanbul', headcount: 2 },
  { id: 3, parentId: 2, name: 'Ceren Aksu', title: 'Team Lead', office: 'İzmir', headcount: 1 },
  { id: 4, parentId: 3, name: 'Deniz Ünal', title: 'Engineer', office: 'İzmir', headcount: 0 },
  { id: 5, parentId: 1, name: 'Elif Barış', title: 'VP Sales', office: 'Ankara', headcount: 0 },
];`,
};

/**
 * Renders a complete standalone component.
 *
 * ```ts
 * export const BASIC_SNIPPET = demoSource({
 *   use: { '@oge-ui/buttons': ['OgeButton'] },
 *   template: `<oge-button text="Save" severity="accent" />`,
 * });
 * ```
 */
export function demoSource(input: DemoSourceInput): string {
  const body = composeBody(input);
  // `before`/`after` are TypeScript too — their core-symbol usage needs importing
  const importLines = renderImports(
    input,
    [body, input.before, input.after].filter(Boolean).join('\n'),
  );
  const runtime = Object.values(input.use ?? {}).flat();

  const decorator = [
    '@Component({',
    `  selector: '${input.selector ?? 'demo-root'}',`,
    ...(runtime.length ? [`  imports: [${runtime.join(', ')}],`] : []),
    '  changeDetection: ChangeDetectionStrategy.OnPush,',
    '  template: `',
    indent(escapeTemplate(input.template.trim()), 4),
    '  `,',
    '})',
  ].join('\n');

  const className = input.className ?? 'Demo';
  const classBlock = body
    ? `export class ${className} {\n${indent(body, 2)}\n}`
    : `export class ${className} {}`;

  return [
    importLines,
    input.before?.trim(),
    `${decorator}\n${classBlock}`,
    input.after?.trim(),
  ]
    .filter(Boolean)
    .join('\n\n');
}

/** The class body plus any requested dataset, in a stable order. */
function composeBody(input: DemoSourceInput): string {
  const parts = [
    input.dataset ? DATASETS[input.dataset] : '',
    input.body?.trim() ?? '',
  ].filter(Boolean);
  return parts.join('\n\n');
}

function renderImports(input: DemoSourceInput, body: string): string {
  const core = ['ChangeDetectionStrategy', 'Component'];
  for (const symbol of CORE_SYMBOLS) {
    // Templates never need imports — only the class body can reference these.
    if (new RegExp(`\\b${symbol}\\b`).test(body)) core.push(symbol);
  }
  core.sort(compareSymbols);

  const lines = [`import { ${core.join(', ')} } from '@angular/core';`];
  const runtime = mergeModules(input.use, input.helpers);
  for (const [module, symbols] of Object.entries(runtime)) {
    lines.push(`import { ${symbols.join(', ')} } from '${module}';`);
  }
  for (const [module, symbols] of Object.entries(input.types ?? {})) {
    lines.push(`import type { ${[...symbols].join(', ')} } from '${module}';`);
  }
  return lines.join('\n');
}

/** Merges two module→symbols maps, keeping declaration order and deduping. */
function mergeModules(
  ...maps: (Readonly<Record<string, readonly string[]>> | undefined)[]
): Record<string, string[]> {
  const merged: Record<string, string[]> = {};
  for (const map of maps) {
    for (const [module, symbols] of Object.entries(map ?? {})) {
      const existing = (merged[module] ??= []);
      for (const symbol of symbols) {
        if (!existing.includes(symbol)) existing.push(symbol);
      }
    }
  }
  return merged;
}

/** Angular's own ordering: classes before functions, each alphabetical. */
function compareSymbols(a: string, b: string): number {
  const aClass = /^[A-Z]/.test(a);
  const bClass = /^[A-Z]/.test(b);
  if (aClass !== bClass) return aClass ? -1 : 1;
  return a.localeCompare(b);
}

/** The template is embedded in a backtick literal in the rendered source. */
function escapeTemplate(template: string): string {
  return template.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

function indent(text: string, spaces: number): string {
  const pad = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((line) => (line.trim() ? pad + line : line))
    .join('\n');
}
