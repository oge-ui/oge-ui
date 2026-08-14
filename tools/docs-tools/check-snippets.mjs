#!/usr/bin/env node
/**
 * Type-checks every docs demo snippet — templates included.
 *
 * Docs snippets are the code an assistant (or a developer) copies out of
 * ogeui.com. A snippet that does not compile is worse than no snippet, so each
 * one is authored as a complete standalone component (see
 * `apps/dev-app/src/app/shared/demo-source.ts`), written to a scratch program
 * here, and compiled with the Angular compiler under `strictTemplates`.
 *
 * Snippets that are deliberately fragments (`codeSnippet()` — shell commands,
 * CSS token blocks, provider excerpts) are exempt, but they are always listed:
 * an exemption should be visible, never silent.
 *
 * Usage: node tools/docs-tools/check-snippets.mjs
 */
import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { PATHS } from './lib/manifest.mjs';
import { readSnippets } from './lib/snippets.mjs';

const workspaceRoot = process.cwd();
const scratchDir = path.join(workspaceRoot, 'tmp', 'docs-snippets');

// A snippet left inline in a page is invisible to this gate, to `llms.txt` and
// to every assistant reading the machine-readable docs. Fail before anything
// else so a new component cannot quietly skip the pipeline.
assertNoInlineSnippets();

const snippets = await readSnippets(
  path.join(workspaceRoot, PATHS.pagesDir),
  workspaceRoot,
);
// Both render layers' snippets share one `pages/` tree, because the docs are
// one site (ADR 0001). They are told apart by shape — a React demo module opens
// with the `'use client'` pragma — so each goes to the compiler that fits it.
const isReactSnippet = (code) => code.startsWith("'use client';");
const checkable = snippets.filter(
  (snippet) => snippet.checkable && !isReactSnippet(snippet.code),
);
const exempt = snippets.filter((snippet) => !snippet.checkable);

if (exempt.length) {
  console.log(
    `${exempt.length} snippet(s) exempt from the compile gate (fragments, not components):`,
  );
  for (const snippet of exempt) {
    console.log(`  ${snippet.file} → ${snippet.name}`);
  }
  console.log('');
}

if (!checkable.length) {
  console.log(
    'No standalone-component snippets found yet — nothing to type-check.',
  );
  process.exit(0);
}

rmSync(scratchDir, { recursive: true, force: true });
mkdirSync(path.join(scratchDir, 'src'), { recursive: true });

/** @type {Map<string, { file: string, name: string }>} */
const bySourceFile = new Map();
for (const snippet of checkable) {
  const slug = `${path
    .basename(snippet.file)
    .replace(/-snippets\.ts$/, '')}--${snippet.name.toLowerCase()}`;
  const target = path.join(scratchDir, 'src', `${slug}.ts`);
  writeFileSync(target, `${snippet.code}\n`, 'utf8');
  bySourceFile.set(`src/${slug}.ts`, snippet);
}

writeFileSync(
  path.join(scratchDir, 'tsconfig.json'),
  `${JSON.stringify(
    {
      extends: '../../tsconfig.base.json',
      compilerOptions: {
        noEmit: true,
        strict: true,
        skipLibCheck: true,
        types: [],
      },
      angularCompilerOptions: {
        strictTemplates: true,
        strictInjectionParameters: true,
      },
      include: ['src/**/*.ts'],
      // the base config excludes `tmp/` — this scratch program lives there
      exclude: [],
    },
    null,
    2,
  )}\n`,
  'utf8',
);

const result = spawnSync(
  'npx',
  ['ngc', '-p', 'tmp/docs-snippets/tsconfig.json'],
  {
    cwd: workspaceRoot,
    encoding: 'utf8',
    shell: true,
  },
);
const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();

if (result.status !== 0) {
  console.error(annotate(output));
  console.error(
    `\n✗ docs snippets failed to compile. Sources are in tmp/docs-snippets/src — the file name is <page>--<snippet-const>.\n`,
  );
  process.exit(1);
}

console.log(
  `✓ ${checkable.length} Angular docs snippet(s) compile under strictTemplates`,
);

// The React render layer's snippets get the same treatment with the tool that
// fits them: plain `tsc` with `jsx: react-jsx`. A React snippet that does not
// compile is exactly as harmful as an Angular one — it is what a reader copies
// out of the docs (ADR 0001).
process.exit(await checkReactSnippets());

/**
 * Compiles every React docs snippet in a scratch program.
 * @returns {Promise<number>} process exit code
 */
async function checkReactSnippets() {
  // React snippets live in the same `pages/` tree as the Angular ones — the
  // docs are one site (ADR 0001) — so they are told apart by *shape*, not by
  // folder: a React demo module starts with the `'use client'` pragma.
  const components = snippets.filter(
    (snippet) => snippet.checkable && isReactSnippet(snippet.code),
  );
  if (!components.length) return 0;

  const dir = path.join(workspaceRoot, 'tmp', 'docs-snippets-react');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(path.join(dir, 'src'), { recursive: true });

  for (const snippet of components) {
    const slug = `${path
      .basename(snippet.file)
      .replace(/-snippets\.ts$/, '')}--${snippet.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}`;
    writeFileSync(
      path.join(dir, 'src', `${slug}.tsx`),
      `${snippet.code}\n`,
      'utf8',
    );
  }

  writeFileSync(
    path.join(dir, 'tsconfig.json'),
    `${JSON.stringify(
      {
        extends: '../../tsconfig.base.json',
        compilerOptions: {
          noEmit: true,
          strict: true,
          skipLibCheck: true,
          jsx: 'react-jsx',
          moduleResolution: 'bundler',
          // `@oge-ui/react-*` resolves to source through the workspace paths,
          // so this program compiles the packages too — which needs their
          // ambient types (`vite/client` for the `.scss` side-effect import,
          // `node` for the `process.env.NODE_ENV` dev guards).
          types: ['node', 'vite/client'],
        },
        include: ['src/**/*.tsx'],
        // the base config excludes `tmp/` — this scratch program lives there
        exclude: [],
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  const reactResult = spawnSync(
    'npx',
    ['tsc', '-p', 'tmp/docs-snippets-react/tsconfig.json'],
    { cwd: workspaceRoot, encoding: 'utf8', shell: true },
  );
  if (reactResult.status === 0) {
    console.log(`✓ ${components.length} React docs snippet(s) compile`);
    return 0;
  }
  console.error(
    `${reactResult.stdout ?? ''}${reactResult.stderr ?? ''}`.trim(),
  );
  console.error(
    `\n✗ React docs snippets failed to compile. Sources are in tmp/docs-snippets-react/src.\n`,
  );
  return 1;
}

/**
 * Docs pages must not declare code samples inline — they belong in the sibling
 * `<page>-snippets.ts` data module, which is the only thing this checker and the
 * `llms.txt` generator can read.
 */
function assertNoInlineSnippets() {
  const pagesDir = path.join(workspaceRoot, PATHS.pagesDir);
  const offenders = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (
        !entry.name.endsWith('.ts') ||
        entry.name.endsWith('-snippets.ts') ||
        entry.name.endsWith('-api-data.ts') ||
        entry.name.endsWith('.spec.ts')
      ) {
        continue;
      }
      const names = [
        ...readFileSync(full, 'utf8').matchAll(
          /^const ([A-Z0-9_]+)(: [^=]+)? = `/gm,
        ),
      ].map((match) => match[1]);
      if (names.length) {
        offenders.push({
          file: path.relative(workspaceRoot, full).split(path.sep).join('/'),
          names,
        });
      }
    }
  };
  walk(pagesDir);
  if (!offenders.length) return;

  console.error(
    '\n✗ code samples declared inline in a docs page — move them to the sibling\n' +
      '  `<page>-snippets.ts` module and build each one with `demoSource()`:\n',
  );
  for (const offender of offenders) {
    console.error(`  ${offender.file}: ${offender.names.join(', ')}`);
  }
  console.error(
    '\n  Why: only `*-snippets.ts` modules are readable from Node, so anything left\n' +
      '  inline is skipped by this compile gate and never reaches llms.txt.\n' +
      '  See docs/ARCHITECTURE.md → "Docs snippets must compile".\n',
  );
  process.exit(1);
}

/** Rewrites scratch paths back to the snippet that produced them. */
function annotate(text) {
  let annotated = text;
  for (const [scratchPath, snippet] of bySourceFile) {
    const needle = scratchPath.split('/').join(path.sep);
    annotated = annotated
      .split(needle)
      .join(`${snippet.file} → ${snippet.name}`);
    annotated = annotated
      .split(scratchPath)
      .join(`${snippet.file} → ${snippet.name}`);
  }
  return annotated;
}
