#!/usr/bin/env node
/**
 * Builds the "Open in StackBlitz" project of every docs demo and verifies it
 * would compile:
 *
 * - every demo `docs-tools:typecheck` compiles gets the button, and no
 *   fragment does (the site's `demoFramework()` agrees with the checker's
 *   `isStandaloneComponent`);
 * - every relative import in every generated source file resolves to a file
 *   in the project's file map (demo-local helpers must ship with the demo);
 * - every bare import — static, type-only, side-effect or dynamic — is
 *   covered by the generated `package.json`, every `@oge-ui/*` one pinned to
 *   the release version, every `<pkg>/styles.css` exported by that package;
 * - `package.json` / `angular.json` / `tsconfig*.json` parse, and a project
 *   that pulls in a commercial package says so in its README.
 *
 * The builder is the docs site's own module
 * (`apps/dev-app/src/app/shared/stackblitz/stackblitz-project.ts`), loaded
 * here through jiti — the gate checks exactly what the button submits.
 *
 * Usage:
 *   node tools/docs-tools/check-stackblitz.mjs
 *   node tools/docs-tools/check-stackblitz.mjs --write <dir> --demo <text>
 *     writes the project of the first demo whose "<file> <name>" contains
 *     <text> to <dir> (to try a generated project with npm install / build)
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createJiti } from 'jiti';
import { PATHS } from './lib/manifest.mjs';
import { readSnippets } from './lib/snippets.mjs';

const workspaceRoot = process.cwd();
const jiti = createJiti(import.meta.url, { interopDefault: true });
const builderDir = path.join(
  workspaceRoot,
  'apps/dev-app/src/app/shared/stackblitz',
);
const { buildStackblitzProject, moduleSpecifiers, packageName, ogeClosure } =
  await jiti.import(path.join(builderDir, 'stackblitz-project.ts'));
const { demoFramework } = await jiti.import(
  path.join(builderDir, 'demo-framework.ts'),
);
const { STACKBLITZ_PACKAGES } = await jiti.import(
  path.join(builderDir, 'stackblitz-manifest.ts'),
);
const version = JSON.parse(
  readFileSync(path.join(workspaceRoot, 'packages/ui/package.json'), 'utf8'),
).version;

const snippets = await readSnippets(
  path.join(workspaceRoot, PATHS.pagesDir),
  workspaceRoot,
);

const args = process.argv.slice(2);
const writeIndex = args.indexOf('--write');
if (writeIndex >= 0) {
  const dir = path.resolve(args[writeIndex + 1] ?? '');
  const query = args[args.indexOf('--demo') + 1] ?? '';
  const snippet = snippets.find(
    (s) =>
      demoFramework(s.code) && `${s.file} ${s.name}`.includes(query.trim()),
  );
  if (!snippet || args.indexOf('--demo') < 0) {
    console.error(`✗ no runnable demo matches "${query}"`);
    process.exit(1);
  }
  const project = buildStackblitzProject(snippet.code, {
    title: snippet.title ?? snippet.name,
  });
  for (const [file, contents] of Object.entries(project.files)) {
    const target = path.join(dir, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, contents, 'utf8');
  }
  console.log(
    `✓ wrote the ${project.framework} project of ${snippet.file} → ${snippet.name} to ${dir}`,
  );
  process.exit(0);
}

const failures = [];
let built = 0;
for (const snippet of snippets) {
  const where = `${snippet.file} → ${snippet.name}`;
  const framework = demoFramework(snippet.code);
  if (Boolean(framework) !== snippet.checkable) {
    failures.push(
      `${where}: the docs-tools:typecheck classifier says ${snippet.checkable ? 'component' : 'fragment'}, the site's demoFramework() says ${framework ?? 'fragment'} — keep them in step`,
    );
    continue;
  }
  if (!framework) continue;

  const project = buildStackblitzProject(snippet.code, {
    title: snippet.title ?? snippet.name,
  });
  built++;
  const problems = verifyProject(project);
  for (const problem of problems) failures.push(`${where}: ${problem}`);
}

if (failures.length) {
  console.error(
    `\n✗ ${failures.length} "Open in StackBlitz" problem(s):\n\n` +
      failures.map((failure) => `  ${failure}`).join('\n') +
      '\n\n  The project builder is apps/dev-app/src/app/shared/stackblitz/stackblitz-project.ts;' +
      '\n  try one with: node tools/docs-tools/check-stackblitz.mjs --write <dir> --demo "<snippet name>"\n',
  );
  process.exit(1);
}
console.log(
  `✓ ${built} demo(s) build a StackBlitz project whose imports all resolve (@oge-ui ${version})`,
);

/** @returns {string[]} what is wrong with one generated project */
function verifyProject(project) {
  const problems = [];
  const files = project.files;
  const declared = { ...project.dependencies, ...project.devDependencies };

  for (const unresolved of project.unresolved) {
    problems.push(`no dependency provides "${unresolved}"`);
  }
  for (const file of Object.keys(files).filter((f) => f.endsWith('.json'))) {
    try {
      JSON.parse(files[file]);
    } catch (error) {
      problems.push(`${file} is not valid JSON (${error.message})`);
    }
  }
  const packageJson = JSON.parse(files['package.json']);
  if (!packageJson.scripts?.start)
    problems.push('package.json has no start script');
  if (!files[project.openFile]) problems.push(`${project.openFile} is missing`);

  const oge = [];
  for (const [name, range] of Object.entries(project.dependencies)) {
    if (name !== 'oge-ui' && !name.startsWith('@oge-ui/')) continue;
    oge.push(name);
    if (range !== version) {
      problems.push(
        `${name} is pinned to ${range}, not the release ${version}`,
      );
    }
  }

  for (const [file, contents] of Object.entries(files)) {
    if (!/\.(ts|tsx)$/.test(file)) continue;
    for (const specifier of moduleSpecifiers(contents)) {
      if (specifier.startsWith('.')) {
        if (!resolveRelative(files, file, specifier)) {
          problems.push(
            `${file} imports "${specifier}", which is not in the project — ship the helper with the demo`,
          );
        }
        continue;
      }
      const name = packageName(specifier);
      if (!declared[name]) {
        problems.push(
          `${file} imports "${specifier}" but package.json lacks "${name}"`,
        );
        continue;
      }
      if (specifier.endsWith('.css') && STACKBLITZ_PACKAGES[name]) {
        const sub = specifier.slice(name.length + 1);
        if (sub === 'styles.css' && !STACKBLITZ_PACKAGES[name].styles) {
          problems.push(`${name} does not export ./styles.css`);
        }
      }
    }
  }

  const commercial = ogeClosure(oge).filter(
    (name) => STACKBLITZ_PACKAGES[name]?.commercial,
  );
  if (commercial.length && !files['README.md'].includes('**Licence:**')) {
    problems.push(
      `uses ${commercial.join(', ')} but the README carries no licence line`,
    );
  }
  return problems;
}

function resolveRelative(files, from, specifier) {
  const base = path.posix.normalize(
    path.posix.join(path.posix.dirname(from), specifier),
  );
  return [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
  ].some((candidate) => candidate in files);
}
