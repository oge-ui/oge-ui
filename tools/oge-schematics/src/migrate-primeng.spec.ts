import { join } from 'node:path';
import { HostTree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';
import {
  migratePrimeng,
  migratePrimengTemplate,
  migratePrimengTypeScript,
} from './migrate-primeng';

describe('migratePrimengTemplate', () => {
  it('turns p-button into oge-button', () => {
    const { text, notes } = migratePrimengTemplate(
      `<p-button label="Save" icon="pi pi-save" severity="warn" [outlined]="true" rounded [loading]="saving" (onClick)="save()" />`,
    );
    expect(text).toBe(
      `<oge-button text="Save" iconClass="pi pi-save" severity="warning" shape="pill" [loading]="saving" (clicked)="save()" stylingMode="outlined" />`,
    );
    expect(notes).toEqual([]);
  });

  it('keeps a text label apart from the text style flag', () => {
    expect(migratePrimengTemplate(`<p-button label="Go" text />`).text).toBe(
      `<oge-button text="Go" stylingMode="text" />`,
    );
    expect(
      migratePrimengTemplate(`<p-button [label]="l" [rounded]="r"></p-button>`)
        .text,
    ).toBe(
      `<oge-button [text]="l" [shape]="r ? 'pill' : 'default'"></oge-button>`,
    );
    // secondary has no OGE twin: the default look
    expect(
      migratePrimengTemplate(`<p-button label="x" severity="secondary" />`)
        .text,
    ).toBe(`<oge-button text="x" />`);
  });

  it('maps p-dialog inputs and notes the defaults that differ', () => {
    const { text, notes } = migratePrimengTemplate(
      `<p-dialog header="Edit" [(visible)]="open" [modal]="true" (onHide)="done()">body</p-dialog>`,
    );
    expect(text).toContain(
      `<oge-modal title="Edit" [(opened)]="open" (closed)="done()">body</oge-modal>`,
    );
    expect(text).toContain(
      '<!-- TODO(oge-migrate): p-dialog relied on PrimeNG defaults',
    );
    expect(notes[0]).toMatch(/draggable, resizable, dismissableMask/);
    const explicit = migratePrimengTemplate(
      `<p-dialog [(visible)]="o" [draggable]="false" [resizable]="false" [dismissableMask]="true" [modal]="false"></p-dialog>`,
    );
    expect(explicit.text).toContain(
      `<oge-modal [(opened)]="o" [dragEnabled]="false" [resizeEnabled]="false" [closeOnBackdropClick]="true">`,
    );
    expect(explicit.notes).toEqual([
      'p-dialog was non-modal — use <oge-window> for a dialog that leaves the page usable',
    ]);
  });

  it('reads TreeNode fields on oge-tree-view', () => {
    const { text } = migratePrimengTemplate(
      `<p-tree [value]="nodes" [draggableNodes]="true" [droppableNodes]="true" (onNodeDrop)="drop($event)" />`,
    );
    expect(text).toContain(
      `<oge-tree-view [items]="nodes" (itemReordered)="drop($event)" displayExpr="label" itemsExpr="children" keyExpr="key" [allowDragging]="true" />`,
    );
  });

  it('moves the tooltip directive and lists elements left for a person', () => {
    const { text, notes } = migratePrimengTemplate(
      `<span pTooltip="Hi" tooltipPosition="top">x</span>\n<p-table [value]="rows"></p-table>`,
    );
    expect(text).toContain(`<span ogeTooltip="Hi" tooltipPlacement="top">`);
    expect(text).toContain('<p-table [value]="rows"></p-table>');
    expect(
      text.startsWith('<!-- TODO(oge-migrate): not converted automatically:'),
    ).toBe(true);
    expect(notes).toEqual([
      '<p-table> → oge-grid — columns become <oge-column> children; see /guides/migrate-from-primeng',
    ]);
  });

  it('leaves a template without PrimeNG alone', () => {
    const source = `<button type="button">x</button>`;
    expect(migratePrimengTemplate(source)).toEqual({
      text: source,
      notes: [],
      changed: false,
    });
  });
});

describe('migratePrimengTypeScript', () => {
  it('swaps PrimeNG modules for OGE standalone imports', () => {
    const { text } = migratePrimengTypeScript(
      [
        `import { Component } from '@angular/core';`,
        `import { ButtonModule } from 'primeng/button';`,
        `import { Dialog, DialogModule } from 'primeng/dialog';`,
        `import type { MenuItem } from 'primeng/api';`,
        `import { MessageService } from 'primeng/api';`,
        ``,
        `@Component({`,
        `  imports: [ButtonModule, Dialog, DialogModule],`,
        '  template: `<p-button label="Go" />`,',
        `})`,
        `export class A { items: MenuItem[] = []; }`,
      ].join('\n'),
    );
    expect(text).toContain(`import { OgeButton } from '@oge-ui/buttons';`);
    expect(text).toContain(
      `import { OgeModal, type OgePrimeMenuItem } from '@oge-ui/overlay';`,
    );
    expect(text).toContain(`import { MessageService } from 'primeng/api';`);
    expect(text).not.toContain(`primeng/button`);
    expect(text).toContain('imports: [OgeButton, OgeModal]');
    expect(text).toContain('<oge-button text="Go" />');
    expect(text).toContain('items: OgePrimeMenuItem[] = []');
    expect(text).toContain('// TODO(oge-migrate): MenuItem → OgePrimeMenuItem');
  });
});

describe('migrate-primeng schematic', () => {
  it('rewrites the files under the path and skips the rest', async () => {
    const runner = new SchematicTestRunner(
      'oge',
      join(__dirname, 'collection.json'),
    );
    const tree = new HostTree();
    tree.create('/src/app/a.html', '<p-button label="A" />');
    tree.create('/src/app/b.ts', 'export const b = 1;');
    tree.create('/other/c.html', '<p-button label="C" />');
    const out = await firstValueFrom(
      runner.callRule(migratePrimeng({ path: '/src' }), tree),
    );
    expect(out.readText('/src/app/a.html')).toBe('<oge-button text="A" />');
    expect(out.readText('/src/app/b.ts')).toBe('export const b = 1;');
    expect(out.readText('/other/c.html')).toBe('<p-button label="C" />');
  });
});

describe('migrate-primeng edge cases', () => {
  it('notes bound style flags and maps the remaining button inputs', () => {
    const { text, notes } = migratePrimengTemplate(
      `<p-button [label]="l" [outlined]="isOutlined" [severity]="sev" iconPos="right" raised loadingIcon="pi pi-spin" [text]="false" />`,
    );
    expect(text).toBe(
      `<!-- TODO(oge-migrate): p-button [outlined] is bound — set stylingMode instead -->\n<oge-button [text]="l" [outlined]="isOutlined" [severity]="sev" iconPosition="after" />`,
    );
    expect(notes).toHaveLength(1);
    expect(
      migratePrimengTemplate(`<p-button label="x" [rounded]="false" />`).text,
    ).toBe(`<oge-button text="x" />`);
  });

  it('maps dialog events and tree selection, filter and drop', () => {
    const dialog = migratePrimengTemplate(
      `<p-dialog [draggable]="true" [resizable]="true" [dismissableMask]="false" (onShow)="shown()" styleClass="wide"></p-dialog>`,
    );
    expect(dialog.text).toContain(
      `<oge-modal [dragEnabled]="true" [resizeEnabled]="true" [closeOnBackdropClick]="false" (openedChange)="shown()" panelClass="wide">`,
    );
    expect(dialog.notes).toEqual([
      'p-dialog (onShow) has no direct twin — use (openedChange)',
    ]);
    const tree = migratePrimengTemplate(
      `<p-tree [value]="n" [filter]="true" displayExpr="name" (onNodeSelect)="pick($event)" [draggableNodes]="false"></p-tree>`,
    );
    expect(tree.text).toContain(
      `<oge-tree-view [items]="n" [searchEnabled]="true" displayExpr="name" (itemClick)="pick($event)" itemsExpr="children" keyExpr="key">`,
    );
    expect(tree.notes[0]).toMatch(/onNodeSelect/);
  });

  it('logs touched files and notes, and the default path', () => {
    const logs: string[] = [];
    const context = {
      logger: {
        info: (message: string) => logs.push(message),
        warn: (message: string) => logs.push(message),
      },
    } as unknown as Parameters<ReturnType<typeof migratePrimeng>>[1];
    const tree = new HostTree();
    tree.create('/src/a.html', '<p-dialog header="x"></p-dialog>');
    tree.create('/src/node_modules/x.html', '<p-button label="no" />');
    tree.create('/src/b.d.ts', 'declare const p: "primeng";');
    void migratePrimeng()(tree, context);
    expect(tree.readText('/src/a.html')).toContain('<oge-modal title="x">');
    expect(tree.readText('/src/node_modules/x.html')).toBe(
      '<p-button label="no" />',
    );
    expect(logs.join(' ')).toMatch(/Migrated 1 file/);
    expect(logs.join(' ')).toMatch(/1 spot.s. need a look/);
    const empty = new HostTree();
    empty.create('/src/c.html', '<div></div>');
    logs.length = 0;
    void migratePrimeng()(empty, context);
    expect(logs.join(' ')).toMatch(/No PrimeNG usage found/);
  });

  it('keeps unknown PrimeNG imports and aliases', () => {
    const { text } = migratePrimengTypeScript(
      `import { ButtonModule as Btn, ButtonDirective } from 'primeng/button';\n@Component({ imports: [Btn] })\nexport class A {}`,
    );
    expect(text).toContain(`import { ButtonDirective } from 'primeng/button';`);
    expect(text).toContain(`import { OgeButton } from '@oge-ui/buttons';`);
    expect(text).toContain('imports: [OgeButton]');
  });
});
