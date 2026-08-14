/**
 * Builds the source shown in a React docs demo's **Code** tab.
 *
 * The React mirror of `apps/dev-app/src/app/shared/demo-source.ts`, and it
 * carries the same promise: every demo renders as one complete, copy-pasteable
 * component — imports at the top, the component underneath — so what a reader
 * (or a coding assistant) copies out of the docs actually compiles.
 *
 * Like its Angular sibling this module is **framework-free on purpose**:
 * `*-snippets.ts` files must load in plain Node so the `llms.txt` generator and
 * the compile gate can read them without a bundler.
 */

/** Value imports, keyed by module specifier. */
export interface ReactDemoSourceInput {
  /** Runtime imports — components, hooks, helpers. */
  readonly use?: Readonly<Record<string, readonly string[]>>;
  /** Type-only imports (`import type { … }`). */
  readonly types?: Readonly<Record<string, readonly string[]>>;
  /** Named React imports (`useState`, `useMemo`…), emitted from `'react'`. */
  readonly react?: readonly string[];
  /** Top-level code between the imports and the component (consts, types). */
  readonly before?: string;
  /** Statements inside the component body, above the `return`. */
  readonly body?: string;
  /** The returned JSX, authored at zero indentation. */
  readonly jsx: string;
  /** Component name; defaults to `Demo`. */
  readonly name?: string;
  /** Adds a small inline dataset above the component so bindings resolve. */
  readonly dataset?: ReactDemoDataset;
  /** Whether to emit the `'use client'` pragma. Default `true`. */
  readonly client?: boolean;
}

export type ReactDemoDataset = 'employees';

const DATASETS: Record<ReactDemoDataset, string> = {
  employees: `const employees = [
  { id: 1, name: 'Ada Lovelace', title: 'Engineer' },
  { id: 2, name: 'Grace Hopper', title: 'Rear Admiral' },
];`,
};

function indent(text: string, spaces: number): string {
  const pad = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((line) => (line.trim() === '' ? line : pad + line))
    .join('\n');
}

function importLine(
  names: readonly string[],
  from: string,
  typeOnly = false,
): string {
  const kind = typeOnly ? 'import type' : 'import';
  return `${kind} { ${[...names].join(', ')} } from '${from}';`;
}

/** Renders one complete React demo component as a string. */
export function reactDemoSource(input: ReactDemoSourceInput): string {
  const lines: string[] = [];
  if (input.client !== false) lines.push("'use client';", '');

  if (input.react?.length) lines.push(importLine(input.react, 'react'));
  for (const [from, names] of Object.entries(input.use ?? {})) {
    lines.push(importLine(names, from));
  }
  for (const [from, names] of Object.entries(input.types ?? {})) {
    lines.push(importLine(names, from, true));
  }
  if (lines.at(-1) !== '') lines.push('');

  if (input.dataset) lines.push(DATASETS[input.dataset], '');
  if (input.before) lines.push(input.before.trim(), '');

  lines.push(`export function ${input.name ?? 'Demo'}() {`);
  if (input.body) lines.push(indent(input.body.trim(), 2));
  lines.push('  return (');
  lines.push(indent(input.jsx.trim(), 4));
  lines.push('  );');
  lines.push('}');

  return lines.join('\n');
}

/** One demo card's worth of docs metadata. */
export interface ReactDemo {
  readonly title: string;
  readonly description?: string;
  readonly source: string;
}
