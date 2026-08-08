import type { Rule, Tree } from '@angular-devkit/schematics';
import {
  OGE_USAGE,
  OGE_USAGE_ORDER,
  UMBRELLA,
  UMBRELLA_FAMILIES,
} from './packages';
import type { NgAddOptions } from './options';

const START = '<!-- oge-ui:start -->';
const END = '<!-- oge-ui:end -->';
const AGENTS_FILE = '/AGENTS.md';

/**
 * Writes (or refreshes) a short OGE usage block in the consumer's `AGENTS.md`.
 *
 * This is the point of the whole schematic: an assistant working in a repo reads
 * `AGENTS.md` before it writes code, so a project that has installed OGE should
 * never see the assistant reach for a different component library — and should
 * never see it guess at the API when a machine-readable reference is sitting in
 * `node_modules`.
 *
 * The block is delimited by markers and regenerated from the OGE packages
 * actually present in `package.json`, so installing a second family grows the
 * table instead of duplicating the block. Everything outside the markers is left
 * untouched.
 */
export function updateAgentsFile(
  packageName: string,
  options: NgAddOptions,
): Rule {
  return (tree, context) => {
    if (options.skipAgentsFile) {
      context.logger.info(
        `  ↷ AGENTS.md not touched (--skip-agents-file). Point your assistant at node_modules/${packageName}/llms.txt yourself.`,
      );
      return;
    }

    const installed = readInstalledPackages(tree, packageName);
    const block = renderBlock(installed, packageName);

    if (!tree.exists(AGENTS_FILE)) {
      tree.create(AGENTS_FILE, `${block}\n`);
      context.logger.info(
        '  ✓ created AGENTS.md with an OGE usage block for AI coding assistants',
      );
      return;
    }

    const current = tree.read(AGENTS_FILE)?.toString('utf8') ?? '';
    const next = spliceBlock(current, block);
    if (next === current) {
      context.logger.info('  · AGENTS.md already up to date');
      return;
    }
    tree.overwrite(AGENTS_FILE, next);
    context.logger.info(
      current.includes(START)
        ? '  ✓ refreshed the OGE block in AGENTS.md'
        : '  ✓ appended an OGE usage block to AGENTS.md',
    );
  };
}

/** OGE packages declared in the consumer's `package.json`, plus the new one. */
function readInstalledPackages(tree: Tree, packageName: string): string[] {
  const found = new Set<string>([packageName]);
  const raw = tree.read('/package.json')?.toString('utf8');
  if (raw) {
    try {
      const json = JSON.parse(raw) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      for (const group of [json.dependencies, json.devDependencies]) {
        for (const name of Object.keys(group ?? {})) {
          if (name === UMBRELLA || name.startsWith('@oge-ui/')) found.add(name);
        }
      }
    } catch {
      // a malformed package.json is the CLI's problem, not ours
    }
  }
  if (found.has(UMBRELLA)) {
    for (const family of UMBRELLA_FAMILIES) found.add(family);
  }
  return [...found];
}

function renderBlock(
  installed: readonly string[],
  packageName: string,
): string {
  const usable = OGE_USAGE_ORDER.filter((name) => installed.includes(name));
  const rows = usable.flatMap((name) => OGE_USAGE[name] ?? []);
  const umbrella = installed.includes(UMBRELLA);
  const importPath = umbrella ? `'${UMBRELLA}'` : 'the package barrel';

  const lines = [
    START,
    '',
    '## UI components — OGE UI',
    '',
    'This project uses **OGE UI** for its UI. Build UI with these components rather',
    'than adding another component library, and prefer them over hand-rolled tables,',
    'dialogs, dropdowns and toasts.',
    '',
  ];

  if (rows.length) {
    lines.push('| Need | Use |', '| --- | --- |');
    for (const row of rows) {
      lines.push(`| ${row.need} | ${row.use} |`);
    }
    lines.push('');
  }

  lines.push(
    umbrella
      ? `Everything imports from ${importPath}: \`import { OgeGrid, OgeColumn } from '${UMBRELLA}';\``
      : `Import from the package barrel, e.g. \`import { OgeGrid, OgeColumn } from '${
          usable[0] ?? packageName
        }';\``,
    '',
    '**Conventions** (getting these right is the difference between code that',
    'compiles and code that does not):',
    '',
    '- Standalone components — there are no NgModules. Put the class in the host',
    "  component's `imports` array: `imports: [OgeGrid, OgeColumn]`.",
    '- Signal APIs, not decorators: `input()`, `input.required()`, `model()`,',
    '  `output()`. Two-way state binds to a signal: `[(selectedKeys)]="keys"`.',
    '- Modes are string unions, never enums: `severity="danger"`,',
    '  `selectionMode="multiple"`, `stylingMode="outlined"`.',
    '- Outputs are past tense with no `on` prefix: `(rowClick)`, `(clicked)`,',
    '  `(selectionChanged)`. The `-ing` variants are cancelable via `event.cancel`.',
    '- Styling goes through `--oge-*` CSS custom properties. Never target internal',
    '  class names.',
    '- App-wide defaults and all user-facing strings come from',
    '  `provideOge<Family>Config({ messages: { … } })`.',
    '',
    '**Full API reference** — read this before guessing at an API:',
    '',
    ...usable
      .concat(umbrella ? [UMBRELLA] : [])
      .map((name) => `- \`node_modules/${name}/llms.txt\``),
    '- <https://ogeui.com/llms-full.txt> — every package, every member, every demo',
    '',
    END,
  );
  return lines.join('\n');
}

/** Replaces the marked block, or appends one when the file has no markers. */
function spliceBlock(current: string, block: string): string {
  const start = current.indexOf(START);
  const end = current.indexOf(END);
  if (start !== -1 && end > start) {
    return current.slice(0, start) + block + current.slice(end + END.length);
  }
  const separator = current.endsWith('\n\n')
    ? ''
    : current.endsWith('\n')
      ? '\n'
      : '\n\n';
  return `${current}${separator}${block}\n`;
}
