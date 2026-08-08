import { describe, expect, it } from 'vitest';
import { demoSource } from './demo-source';

describe('demoSource', () => {
  it('renders a complete standalone component', () => {
    const source = demoSource({
      use: { '@oge-ui/buttons': ['OgeButton'] },
      template: `<oge-button text="Save" severity="accent" />`,
    });

    expect(source).toBe(
      [
        "import { ChangeDetectionStrategy, Component } from '@angular/core';",
        "import { OgeButton } from '@oge-ui/buttons';",
        '',
        '@Component({',
        "  selector: 'demo-root',",
        '  imports: [OgeButton],',
        '  changeDetection: ChangeDetectionStrategy.OnPush,',
        '  template: `',
        '    <oge-button text="Save" severity="accent" />',
        '  `,',
        '})',
        'export class Demo {}',
      ].join('\n'),
    );
  });

  it('imports the core symbols the class body uses, and no others', () => {
    const source = demoSource({
      use: { '@oge-ui/buttons': ['OgeButton'] },
      template: `<oge-button [text]="label()" />`,
      body: `readonly label = signal('Save');`,
    });

    expect(source).toContain(
      "import { ChangeDetectionStrategy, Component, signal } from '@angular/core';",
    );
    expect(source).not.toContain('computed');
  });

  it('does not import core symbols that only appear in the template', () => {
    const source = demoSource({
      use: { '@oge-ui/buttons': ['OgeButton'] },
      // `effect` here is a class member call, not the Angular function
      template: `<oge-button [text]="effect()" />`,
    });

    expect(source).toContain(
      "import { ChangeDetectionStrategy, Component } from '@angular/core';",
    );
  });

  it('keeps type-only imports out of the imports array', () => {
    const source = demoSource({
      use: { '@oge-ui/overlay': ['OgeMenuList'] },
      types: { '@oge-ui/overlay': ['OgeMenuItem'] },
      template: `<oge-menu-list [items]="items" />`,
      body: `readonly items: OgeMenuItem[] = [{ text: 'Delete' }];`,
    });

    expect(source).toContain(
      "import type { OgeMenuItem } from '@oge-ui/overlay';",
    );
    expect(source).toContain('imports: [OgeMenuList],');
    expect(source).not.toContain('imports: [OgeMenuList, OgeMenuItem]');
  });

  it('imports helpers without declaring them', () => {
    const source = demoSource({
      use: { '@oge-ui/inputs': ['OgeTextBox'] },
      helpers: { '@angular/forms/signals': ['form', 'required'] },
      template: `<oge-text-box [formField]="f.name" />`,
      body: `readonly f = form(signal({ name: '' }), (p) => required(p.name));`,
    });

    expect(source).toContain(
      "import { form, required } from '@angular/forms/signals';",
    );
    expect(source).toContain('imports: [OgeTextBox],');
  });

  it('merges use and helpers that share a module into one import', () => {
    const source = demoSource({
      use: { '@angular/forms': ['ReactiveFormsModule'] },
      helpers: { '@angular/forms': ['FormControl', 'Validators'] },
      template: `<input [formControl]="email" />`,
      body: `readonly email = new FormControl('');`,
    });

    expect(source).toContain(
      "import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';",
    );
    expect(source).toContain('imports: [ReactiveFormsModule],');
  });

  it('inlines a dataset before the class body', () => {
    const source = demoSource({
      use: { '@oge-ui/grid': ['OgeGrid', 'OgeColumn'] },
      dataset: 'employees',
      template: `<oge-grid [data]="employees" keyField="id" />`,
      body: `readonly title = 'Team';`,
    });

    expect(source).toContain('readonly employees = [');
    expect(source.indexOf('readonly employees')).toBeLessThan(
      source.indexOf('readonly title'),
    );
  });

  it('escapes backticks so the rendered source stays valid TypeScript', () => {
    const source = demoSource({
      template: '<p>Use `npm i` first</p>',
    });

    expect(source).toContain('<p>Use \\`npm i\\` first</p>');
  });

  it('omits the imports array when the demo uses no components', () => {
    const source = demoSource({ template: `<p>Nothing to import</p>` });

    expect(source).not.toContain('imports:');
    expect(source).toContain("selector: 'demo-root'");
  });
});
