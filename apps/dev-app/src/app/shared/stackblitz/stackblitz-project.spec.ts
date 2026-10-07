import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { demoSource } from '../demo-source';
import { reactDemoSource } from '../react-demo-source';
import { SITE_VERSION } from '../site-version';
import { demoFramework } from './demo-framework';
import { createStackblitzForm, openInStackblitz } from './stackblitz-open';
import {
  buildStackblitzProject,
  moduleSpecifiers,
  ogeClosure,
  packageName,
} from './stackblitz-project';
import { STACKBLITZ_TOOLCHAIN } from './stackblitz-manifest';

const ANGULAR_DEMO = demoSource({
  use: { '@oge-ui/buttons': ['OgeButton'] },
  template: `<oge-button text="Save" severity="accent" />`,
});

const REACT_DEMO = reactDemoSource({
  use: { '@oge-ui/react-grid': ['OgeGrid', 'OgeColumn'] },
  jsx: `<OgeGrid data={[]} keyField="id"><OgeColumn field="name" /></OgeGrid>`,
  name: 'EmployeesGrid',
});

/** The single source of the release version — what `nx release` bumps. */
const RELEASE = JSON.parse(
  readFileSync(
    resolve(__dirname, '../../../../../../packages/ui/package.json'),
    'utf8',
  ),
).version as string;

describe('demoFramework', () => {
  it('tells Angular, React and fragments apart', () => {
    expect(demoFramework(ANGULAR_DEMO)).toBe('angular');
    expect(demoFramework(REACT_DEMO)).toBe('react');
    expect(demoFramework('npm install @oge-ui/grid')).toBeNull();
    expect(demoFramework(':root { --oge-accent: red; }')).toBeNull();
  });
});

describe('module specifiers', () => {
  it('finds static, type-only, side-effect and dynamic imports', () => {
    const source = `import { a } from '@oge-ui/grid';
import type { B } from './types';
import '@oge-ui/react-grid/styles.css';
import {
  c,
  d,
} from 'rxjs';
const x = await import('@oge-ui/grid/export-excel');`;
    expect(moduleSpecifiers(source).sort()).toEqual([
      './types',
      '@oge-ui/grid',
      '@oge-ui/grid/export-excel',
      '@oge-ui/react-grid/styles.css',
      'rxjs',
    ]);
    expect(packageName('@oge-ui/grid/export-excel')).toBe('@oge-ui/grid');
    expect(packageName('react-dom/client')).toBe('react-dom');
  });
});

describe('buildStackblitzProject — Angular', () => {
  const project = buildStackblitzProject(ANGULAR_DEMO, {
    title: 'Severities',
    pageUrl: 'https://www.ogeui.com/components/buttons',
  });

  it('returns null for a fragment', () => {
    expect(buildStackblitzProject('npm install oge-ui')).toBeNull();
  });

  it('builds a standalone Angular CLI app around the demo', () => {
    expect(project?.framework).toBe('angular');
    expect(project?.template).toBe('node');
    expect(project?.openFile).toBe('src/app/app.component.ts');
    expect(Object.keys(project?.files ?? {}).sort()).toEqual([
      '.stackblitzrc',
      'README.md',
      'angular.json',
      'package.json',
      'src/app/app.component.ts',
      'src/index.html',
      'src/main.ts',
      'src/styles.css',
      'tsconfig.app.json',
      'tsconfig.json',
    ]);
    const files = project?.files ?? {};
    expect(files['src/app/app.component.ts']).toBe(`${ANGULAR_DEMO}\n`);
    expect(files['src/index.html']).toContain('<demo-root></demo-root>');
    expect(files['src/main.ts']).toContain('provideZonelessChangeDetection()');
    expect(files['src/main.ts']).toContain('bootstrapApplication(Demo, {');
    const angular = JSON.parse(files['angular.json']);
    expect(angular.projects.demo.architect.build.builder).toBe(
      '@angular/build:application',
    );
    expect(files['README.md']).toContain(
      'https://www.ogeui.com/components/buttons',
    );
    expect(files['README.md']).not.toContain('Licence');
  });

  it('pins @oge-ui to the release version and the toolchain to the workspace', () => {
    expect(SITE_VERSION).toBe(RELEASE);
    const pkg = JSON.parse(project?.files['package.json'] ?? '{}');
    expect(pkg.scripts.start).toBe('ng serve');
    expect(pkg.dependencies['@oge-ui/buttons']).toBe(RELEASE);
    expect(pkg.dependencies['@angular/core']).toBe(
      STACKBLITZ_TOOLCHAIN['@angular/core'],
    );
    expect(pkg.devDependencies['@angular/build']).toBe(
      STACKBLITZ_TOOLCHAIN['@angular/build'],
    );
    expect(pkg.dependencies['zone.js']).toBeUndefined();
    expect(project?.unresolved).toEqual([]);
  });

  it('wires router, http and an exported appConfig into main.ts', () => {
    const source = demoSource({
      use: { '@oge-ui/navigation': ['OgeBreadcrumb'] },
      helpers: {
        '@angular/router': ['RouterLink'],
        '@angular/common/http': ['HttpClient'],
      },
      template: `<oge-breadcrumb />`,
      after: `export const appConfig = { providers: [] };`,
    });
    const main = buildStackblitzProject(source)?.files['src/main.ts'] ?? '';
    expect(main).toContain('provideRouter([])');
    expect(main).toContain('provideHttpClient()');
    expect(main).toContain(
      "import { Demo, appConfig as demoConfig } from './app/app.component';",
    );
    expect(main).toContain('...demoConfig.providers');
  });

  it('adds the optional export peers for export entry points', () => {
    const source = demoSource({
      use: { '@oge-ui/grid': ['OgeGrid'] },
      template: `<oge-grid [data]="[]" />`,
      body: `async exportPdf() {
  const { exportPdf } = await import('@oge-ui/grid/export-pdf');
  return exportPdf;
}`,
    });
    const deps = buildStackblitzProject(source)?.dependencies ?? {};
    expect(deps['jspdf']).toBe(STACKBLITZ_TOOLCHAIN['jspdf']);
    expect(deps['jspdf-autotable']).toBe(
      STACKBLITZ_TOOLCHAIN['jspdf-autotable'],
    );
    expect(deps['exceljs']).toBeUndefined();
  });

  it('states the licence of a commercial family in the README', () => {
    const source = demoSource({
      use: { '@oge-ui/scheduler': ['OgeScheduler'] },
      template: `<oge-scheduler />`,
    });
    const readme = buildStackblitzProject(source)?.files['README.md'] ?? '';
    expect(readme).toContain('**Licence:** @oge-ui/scheduler');
    expect(readme).toContain('free for evaluation and development');
  });

  it('reports an import no dependency covers', () => {
    const source = `import { Component } from '@angular/core';
import { thing } from 'left-pad';

@Component({ selector: 'demo-root', template: '' })
export class Demo {}`;
    expect(buildStackblitzProject(source)?.unresolved).toEqual(['left-pad']);
  });
});

describe('buildStackblitzProject — React', () => {
  const project = buildStackblitzProject(REACT_DEMO, { title: 'Quick start' });
  const files = project?.files ?? {};

  it('builds a Vite + React + TypeScript app around the demo', () => {
    expect(project?.framework).toBe('react');
    expect(project?.openFile).toBe('src/App.tsx');
    expect(files['src/App.tsx']).toBe(`${REACT_DEMO}\n`);
    expect(files['index.html']).toContain('src="/src/main.tsx"');
    expect(files['vite.config.ts']).toContain('@vitejs/plugin-react');
    expect(files['src/main.tsx']).toContain(
      "import { EmployeesGrid } from './App';",
    );
    expect(files['src/main.tsx']).toContain('<EmployeesGrid />');
    const pkg = JSON.parse(files['package.json']);
    expect(pkg.scripts.start).toBe('vite');
    expect(pkg.devDependencies.vite).toBe(STACKBLITZ_TOOLCHAIN.vite);
    expect(pkg.dependencies.react).toBe(STACKBLITZ_TOOLCHAIN.react);
  });

  it('imports every stylesheet the demo renders through, dependencies first', () => {
    const main = files['src/main.tsx'];
    const order = [
      ...main.matchAll(/import '(@oge-ui\/[^']+)\/styles\.css'/g),
    ].map((match) => match[1]);
    expect(order).toEqual(
      ogeClosure(['@oge-ui/react-grid']).filter((name) =>
        name.startsWith('@oge-ui/react'),
      ),
    );
    expect(order.at(-1)).toBe('@oge-ui/react-grid');
    expect(order.indexOf('@oge-ui/react-overlay')).toBeLessThan(
      order.indexOf('@oge-ui/react-grid'),
    );
    // each stylesheet package is a direct dependency, pinned to the release
    for (const name of order) {
      expect(project?.dependencies[name]).toBe(RELEASE);
    }
  });

  it('renders the prop-less component when helpers are exported beside it', () => {
    const source = `'use client';

import { OgeButton } from '@oge-ui/react-buttons';

export function count(xml: string) {
  return xml.length;
}

export function Counter() {
  return <OgeButton text={String(count('x'))} />;
}`;
    const main = buildStackblitzProject(source)?.files['src/main.tsx'] ?? '';
    expect(main).toContain('<Counter />');
  });
});

describe('the StackBlitz form', () => {
  it('posts every file and the project fields to stackblitz.com/run', () => {
    const project = buildStackblitzProject(ANGULAR_DEMO, { title: 'Save' });
    expect(project).not.toBeNull();
    if (!project) return;
    const form = createStackblitzForm(document, project);
    expect(form.method.toLowerCase()).toBe('post');
    expect(form.action).toBe(
      'https://stackblitz.com/run?file=src%2Fapp%2Fapp.component.ts',
    );
    expect(form.target).toBe('_blank');
    const fields = Object.fromEntries(
      [...form.querySelectorAll('input')].map((input) => [
        input.name,
        input.value,
      ]),
    );
    expect(fields['project[template]']).toBe('node');
    expect(fields['project[title]']).toBe('Save');
    expect(JSON.parse(fields['project[dependencies]'])).toEqual(
      project.dependencies,
    );
    for (const [path, contents] of Object.entries(project.files)) {
      expect(fields[`project[files][${path}]`]).toBe(contents);
    }
  });

  it('submits and removes the form; a fragment opens nothing', () => {
    const submitted: HTMLFormElement[] = [];
    const original = HTMLFormElement.prototype.submit;
    HTMLFormElement.prototype.submit = function (this: HTMLFormElement) {
      submitted.push(this);
    };
    try {
      expect(openInStackblitz(document, REACT_DEMO)).toBe(true);
      expect(openInStackblitz(document, 'npm i oge-ui')).toBe(false);
    } finally {
      HTMLFormElement.prototype.submit = original;
    }
    expect(submitted).toHaveLength(1);
    expect(document.querySelector('form')).toBeNull();
  });
});
