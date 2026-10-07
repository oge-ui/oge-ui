/**
 * Turns one docs demo — the complete component `demoSource()` /
 * `reactDemoSource()` renders — into a runnable StackBlitz project.
 *
 * - **Angular**: a minimal standalone Angular CLI app (`@angular/build`
 *   application builder, `ng serve`), the demo as `src/app/app.component.ts`,
 *   bootstrapped zoneless.
 * - **React**: Vite + React + TypeScript, the demo as `src/App.tsx`, the
 *   stylesheets of every `@oge-ui/react-*` package it uses (and theirs) imported
 *   once in `src/main.tsx`.
 *
 * Both run on StackBlitz's `node` template (WebContainers): `npm install`, then
 * `npm start`. Every `@oge-ui/*` dependency is pinned to `SITE_VERSION` (which
 * is generated from `packages/ui/package.json`), the toolchain to the versions
 * the workspace builds with (`stackblitz-manifest.ts`, generated too).
 *
 * Framework-free and DOM-free on purpose: `docs-tools:stackblitz-check` loads
 * this module in Node and builds the project of every demo, failing on any
 * import the project could not resolve. Loaded lazily, on first use.
 */
import { SITE_VERSION } from '../site-version';
import { demoFramework, type DemoFramework } from './demo-framework';
import {
  STACKBLITZ_PACKAGES,
  STACKBLITZ_TOOLCHAIN,
} from './stackblitz-manifest';

export interface StackblitzProjectOptions {
  /** Human title — the demo card heading. */
  readonly title?: string;
  /** The docs page the demo came from, linked from the README. */
  readonly pageUrl?: string;
}

export interface StackblitzProject {
  readonly framework: DemoFramework;
  readonly title: string;
  readonly description: string;
  /** StackBlitz's WebContainers template — runs `npm install` + `npm start`. */
  readonly template: 'node';
  /** Path → contents. */
  readonly files: Readonly<Record<string, string>>;
  /** `dependencies` of the generated `package.json`. */
  readonly dependencies: Readonly<Record<string, string>>;
  /** `devDependencies` of the generated `package.json`. */
  readonly devDependencies: Readonly<Record<string, string>>;
  /** The file StackBlitz opens first — the demo itself. */
  readonly openFile: string;
  /**
   * Bare imports no dependency covers. Empty for every docs demo —
   * `docs-tools:stackblitz-check` enforces that.
   */
  readonly unresolved: readonly string[];
}

/** `exceljs` / `jspdf` are optional peers, needed only by the export entries. */
const SUBPATH_PEERS: readonly (readonly [RegExp, readonly ToolchainName[]])[] =
  [
    [/\/export-excel$/, ['exceljs']],
    [/\/export-pdf$/, ['jspdf', 'jspdf-autotable']],
  ];

type ToolchainName = keyof typeof STACKBLITZ_TOOLCHAIN;

const ANGULAR_RUNTIME: readonly ToolchainName[] = [
  '@angular/common',
  '@angular/compiler',
  '@angular/core',
  '@angular/forms',
  '@angular/platform-browser',
  '@angular/router',
  'rxjs',
  'tslib',
];
const ANGULAR_DEV: readonly ToolchainName[] = [
  '@angular/build',
  '@angular/cli',
  '@angular/compiler-cli',
  'typescript',
];
const REACT_RUNTIME: readonly ToolchainName[] = ['react', 'react-dom'];
const REACT_DEV: readonly ToolchainName[] = [
  '@types/react',
  '@types/react-dom',
  '@vitejs/plugin-react',
  'typescript',
  'vite',
];

const LICENSE_URL = 'https://www.ogeui.com/license';

/**
 * Builds the project, or returns `null` when `source` is not a complete
 * component (a fragment has nothing to run).
 */
export function buildStackblitzProject(
  source: string,
  options: StackblitzProjectOptions = {},
): StackblitzProject | null {
  const framework = demoFramework(source);
  if (!framework) return null;

  const title = (options.title ?? '').trim() || 'OGE UI demo';
  const specifiers = moduleSpecifiers(source);
  const resolved = resolveDependencies(framework, specifiers);
  const { devDependencies, unresolved, oge } = resolved;
  const commercial = commercialPackages(oge);
  // React: the stylesheet of every OGE package the demo renders through —
  // `@oge-ui/react-grid` draws `@oge-ui/react-overlay` popups too. Each is
  // imported by name in main.tsx, so each is a direct dependency as well.
  const stylesheets =
    framework === 'react'
      ? ogeClosure(oge).filter((name) => STACKBLITZ_PACKAGES[name]?.styles)
      : [];
  const dependencies = sortKeys({
    ...resolved.dependencies,
    ...Object.fromEntries(stylesheets.map((name) => [name, SITE_VERSION])),
  });
  const label = framework === 'angular' ? 'Angular' : 'React';
  const description = `OGE UI for ${label} — ${title}`;
  const packageJson = renderPackageJson(
    framework,
    title,
    dependencies,
    devDependencies,
  );
  const readme = renderReadme(framework, title, options.pageUrl, commercial);

  const files =
    framework === 'angular'
      ? angularFiles(source, title, packageJson, readme)
      : reactFiles(source, title, packageJson, readme, stylesheets);

  return {
    framework,
    title,
    description,
    template: 'node',
    files,
    dependencies,
    devDependencies,
    openFile:
      framework === 'angular' ? 'src/app/app.component.ts' : 'src/App.tsx',
    unresolved,
  };
}

// ------------------------------------------------------------------ imports

/**
 * Every module specifier a source file references: static imports (value,
 * type and side-effect), re-exports and dynamic `import('…')`.
 */
export function moduleSpecifiers(source: string): string[] {
  const found = new Set<string>();
  const patterns = [
    /^\s*(?:import|export)\s+(?:type\s+)?[^'"`;]*?\sfrom\s+['"]([^'"]+)['"]/gm,
    /^\s*import\s+['"]([^'"]+)['"]/gm,
    /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) found.add(match[1]);
  }
  return [...found];
}

/** `@scope/name/sub/path` → `@scope/name`; `name/sub` → `name`. */
export function packageName(specifier: string): string {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

function isOgePackage(name: string): boolean {
  return name === 'oge-ui' || name.startsWith('@oge-ui/');
}

function resolveDependencies(
  framework: DemoFramework,
  specifiers: readonly string[],
): {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  unresolved: string[];
  oge: string[];
} {
  const dependencies: Record<string, string> = {};
  const unresolved: string[] = [];
  const oge: string[] = [];
  const addToolchain = (name: ToolchainName) => {
    dependencies[name] = STACKBLITZ_TOOLCHAIN[name];
  };

  for (const name of framework === 'angular' ? ANGULAR_RUNTIME : REACT_RUNTIME)
    addToolchain(name);

  for (const specifier of specifiers) {
    if (specifier.startsWith('.') || specifier.startsWith('/')) continue;
    const name = packageName(specifier);
    if (isOgePackage(name)) {
      if (STACKBLITZ_PACKAGES[name]) {
        dependencies[name] = SITE_VERSION;
        if (!oge.includes(name)) oge.push(name);
      } else {
        unresolved.push(specifier);
      }
    } else if (name in STACKBLITZ_TOOLCHAIN) {
      addToolchain(name as ToolchainName);
    } else {
      unresolved.push(specifier);
    }
    for (const [pattern, peers] of SUBPATH_PEERS) {
      if (isOgePackage(name) && pattern.test(specifier)) {
        for (const peer of peers) addToolchain(peer);
      }
    }
  }

  const devDependencies: Record<string, string> = {};
  for (const name of framework === 'angular' ? ANGULAR_DEV : REACT_DEV) {
    devDependencies[name] = STACKBLITZ_TOOLCHAIN[name];
  }
  return {
    dependencies: sortKeys(dependencies),
    devDependencies: sortKeys(devDependencies),
    unresolved,
    oge,
  };
}

/** `@oge-ui/*` packages in the closure of `direct` (dependencies first). */
export function ogeClosure(direct: readonly string[]): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();
  const visit = (name: string) => {
    if (seen.has(name)) return;
    seen.add(name);
    const info = STACKBLITZ_PACKAGES[name];
    if (!info) return;
    for (const dep of info.deps) visit(dep);
    ordered.push(name);
  };
  for (const name of direct) visit(name);
  return ordered;
}

function commercialPackages(direct: readonly string[]): string[] {
  return ogeClosure(direct)
    .filter((name) => STACKBLITZ_PACKAGES[name]?.commercial)
    .sort();
}

// ------------------------------------------------------------------ angular

function angularFiles(
  source: string,
  title: string,
  packageJson: string,
  readme: string,
): Record<string, string> {
  const component = source.slice(Math.max(0, source.indexOf('@Component(')));
  const selector = /selector:\s*'([^']+)'/.exec(component)?.[1] ?? 'demo-root';
  const className = /export class (\w+)/.exec(component)?.[1] ?? 'Demo';
  const hasAppConfig = /^export const appConfig\b/m.test(source);
  const usesRouter = source.includes("from '@angular/router'");
  const usesHttp = source.includes("from '@angular/common/http'");

  const imports = [
    "import {\n  provideBrowserGlobalErrorListeners,\n  provideZonelessChangeDetection,\n} from '@angular/core';",
    ...(usesHttp
      ? ["import { provideHttpClient } from '@angular/common/http';"]
      : []),
    "import { bootstrapApplication } from '@angular/platform-browser';",
    ...(usesRouter ? ["import { provideRouter } from '@angular/router';"] : []),
    `import { ${className}${hasAppConfig ? ', appConfig as demoConfig' : ''} } from './app/app.component';`,
  ];
  const providers = [
    '    // Zoneless, like the docs site: no zone.js anywhere.',
    '    provideZonelessChangeDetection(),',
    '    provideBrowserGlobalErrorListeners(),',
    ...(usesHttp ? ['    provideHttpClient(),'] : []),
    ...(usesRouter ? ['    provideRouter([]),'] : []),
    ...(hasAppConfig ? ['    ...demoConfig.providers,'] : []),
  ];
  const main = `${imports.join('\n')}

bootstrapApplication(${className}, {
  providers: [
${providers.join('\n')}
  ],
}).catch((err) => console.error(err));
`;

  const angularJson = {
    $schema: './node_modules/@angular/cli/lib/config/schema.json',
    version: 1,
    cli: { analytics: false, packageManager: 'npm' },
    newProjectRoot: 'projects',
    projects: {
      demo: {
        projectType: 'application',
        root: '',
        sourceRoot: 'src',
        prefix: 'demo',
        architect: {
          build: {
            builder: '@angular/build:application',
            options: {
              browser: 'src/main.ts',
              index: 'src/index.html',
              tsConfig: 'tsconfig.app.json',
              styles: ['src/styles.css'],
              outputPath: 'dist/demo',
            },
            configurations: {
              production: { outputHashing: 'all' },
              development: {
                optimization: false,
                extractLicenses: false,
                sourceMap: true,
              },
            },
            defaultConfiguration: 'production',
          },
          serve: {
            builder: '@angular/build:dev-server',
            configurations: {
              production: { buildTarget: 'demo:build:production' },
              development: { buildTarget: 'demo:build:development' },
            },
            defaultConfiguration: 'development',
          },
        },
      },
    },
  };

  const tsconfig = {
    compileOnSave: false,
    compilerOptions: {
      strict: true,
      skipLibCheck: true,
      isolatedModules: true,
      experimentalDecorators: true,
      importHelpers: true,
      target: 'ES2022',
      module: 'preserve',
      moduleResolution: 'bundler',
      lib: ['ES2022', 'dom'],
    },
    angularCompilerOptions: {
      strictInjectionParameters: true,
      strictInputAccessModifiers: true,
      strictTemplates: true,
    },
  };
  const tsconfigApp = {
    extends: './tsconfig.json',
    compilerOptions: { outDir: './out-tsc/app', types: [] },
    files: ['src/main.ts'],
  };

  return {
    'package.json': packageJson,
    'README.md': readme,
    '.stackblitzrc': json({
      installDependencies: true,
      startCommand: 'npm start',
    }),
    'angular.json': json(angularJson),
    'tsconfig.json': json(tsconfig),
    'tsconfig.app.json': json(tsconfigApp),
    'src/index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)} — OGE UI</title>
    <base href="/" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <${selector}></${selector}>
  </body>
</html>
`,
    'src/main.ts': main,
    'src/styles.css': `/*
 * OGE components ship their own styles — no global stylesheet is required and
 * the light theme is built in. Optional themes come from @oge-ui/core
 * (npm i @oge-ui/core), e.g.:
 *
 *   @import '@oge-ui/core/themes/dark.css';   then data-oge-theme="dark" on <html>
 */
body {
  margin: 0;
  padding: 24px;
  font-family: system-ui, sans-serif;
}
`,
    'src/app/app.component.ts': ensureTrailingNewline(source),
  };
}

// -------------------------------------------------------------------- react

function reactFiles(
  source: string,
  title: string,
  packageJson: string,
  readme: string,
  stylesheetPackages: readonly string[],
): Record<string, string> {
  const exported = [...source.matchAll(/export function (\w+)\(([^)]*)\)/g)];
  // The demo component takes no props; helpers exported beside it do.
  const root =
    exported.filter((match) => !match[2].trim()).at(-1) ?? exported[0];
  const name = root?.[1] ?? 'Demo';
  const takesProps = Boolean(root?.[2].trim());

  const stylesheets = stylesheetPackages.map(
    (pkg) => `import '${pkg}/styles.css';`,
  );

  const element = takesProps
    ? `<${name} {...({} as ComponentProps<typeof ${name}>)} />`
    : `<${name} />`;
  const main = `import { StrictMode${takesProps ? ', type ComponentProps' : ''} } from 'react';
import { createRoot } from 'react-dom/client';
${stylesheets.length ? `// once, at the app entry: each OGE package ships class names, not inline styles\n${stylesheets.join('\n')}\n` : ''}import './styles.css';
import { ${name} } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    ${element}
  </StrictMode>,
);
`;

  const tsconfig = {
    compilerOptions: {
      target: 'ES2022',
      lib: ['ES2022', 'DOM', 'DOM.Iterable'],
      module: 'ESNext',
      moduleResolution: 'bundler',
      jsx: 'react-jsx',
      strict: true,
      skipLibCheck: true,
      isolatedModules: true,
      noEmit: true,
      types: ['vite/client'],
    },
    include: ['src'],
  };

  return {
    'package.json': packageJson,
    'README.md': readme,
    '.stackblitzrc': json({
      installDependencies: true,
      startCommand: 'npm start',
    }),
    'index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)} — OGE UI</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
    'vite.config.ts': `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`,
    'tsconfig.json': json(tsconfig),
    'src/main.tsx': main,
    'src/styles.css': `body {
  margin: 0;
  padding: 24px;
  font-family: system-ui, sans-serif;
}
`,
    'src/App.tsx': ensureTrailingNewline(source),
  };
}

// ------------------------------------------------------------------- shared

function renderPackageJson(
  framework: DemoFramework,
  title: string,
  dependencies: Record<string, string>,
  devDependencies: Record<string, string>,
): string {
  const scripts =
    framework === 'angular'
      ? { ng: 'ng', start: 'ng serve', build: 'ng build' }
      : {
          dev: 'vite',
          start: 'vite',
          build: 'vite build',
          typecheck: 'tsc --noEmit',
        };
  return json({
    name: `oge-ui-${slug(title) || 'demo'}`,
    version: '0.0.0',
    private: true,
    ...(framework === 'react' ? { type: 'module' } : {}),
    scripts,
    dependencies,
    devDependencies,
  });
}

function renderReadme(
  framework: DemoFramework,
  title: string,
  pageUrl: string | undefined,
  commercial: readonly string[],
): string {
  const label = framework === 'angular' ? 'Angular' : 'React';
  const lines = [
    `# ${title} — OGE UI for ${label}`,
    '',
    pageUrl
      ? `Generated from the demo at ${pageUrl} (OGE UI ${SITE_VERSION}).`
      : `Generated from an OGE UI ${SITE_VERSION} docs demo (https://www.ogeui.com).`,
    '',
    'Run it locally with `npm install` and `npm start`.',
  ];
  if (commercial.length) {
    lines.push(
      '',
      `> **Licence:** ${commercial.join(', ')} ${commercial.length > 1 ? 'are' : 'is'} commercial, source-available software — free for evaluation and development; production use requires a paid licence (${LICENSE_URL}).`,
    );
  }
  return `${lines.join('\n')}\n`;
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sortKeys(record: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(record).sort(([a], [b]) => a.localeCompare(b, 'en')),
  );
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ensureTrailingNewline(text: string): string {
  return text.endsWith('\n') ? text : `${text}\n`;
}
