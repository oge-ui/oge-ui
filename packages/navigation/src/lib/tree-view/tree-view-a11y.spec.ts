import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideOgeTreeViewConfig } from './config';
import {
  OgeTreeExpandIconTemplate,
  OgeTreeItemTemplate,
  OgeTreeNoDataTemplate,
} from './templates';
import { OgeTreeView } from './tree-view';
import { FLAT, render, settle, type Node } from './tree-view-test-host';

describe('OgeTreeView accessibility', () => {
  it('wires the tree/treeitem roles and the label', async () => {
    const { el } = await render();
    const tree = el.querySelector('[role="tree"]');
    expect(tree).not.toBeNull();
    expect(el.querySelectorAll('[role="treeitem"]')).toHaveLength(2);
  });

  it('advertises aria-multiselectable only in multiple mode', async () => {
    const { fixture, host, el } = await render();
    const tree = () => el.querySelector('[role="tree"]');
    expect(tree()?.getAttribute('aria-multiselectable')).toBeNull();

    host.selectionMode.set('multiple');
    await settle(fixture);
    expect(tree()?.getAttribute('aria-multiselectable')).toBe('true');
  });

  it('marks the tree busy while lazy children load', async () => {
    let resolve!: (rows: Node[]) => void;
    const { fixture, el, rowFor } = await render((h) => {
      h.items.set([
        { id: 1, parentId: null, name: 'Documents', hasItems: true },
      ]);
      h.loadChildren.set(() => new Promise<Node[]>((r) => (resolve = r)));
    });
    rowFor('Documents')?.click();
    await settle(fixture);
    expect(el.querySelector('[role="tree"]')?.getAttribute('aria-busy')).toBe(
      'true',
    );

    resolve([]);
    await settle(fixture);
    expect(
      el.querySelector('[role="tree"]')?.getAttribute('aria-busy'),
    ).toBeNull();
  });

  it('keeps loading placeholders out of the treeitem set', async () => {
    let resolve!: (rows: Node[]) => void;
    const { fixture, el, rowFor } = await render((h) => {
      h.items.set([
        { id: 1, parentId: null, name: 'Documents', hasItems: true },
      ]);
      h.loadChildren.set(() => new Promise<Node[]>((r) => (resolve = r)));
    });
    rowFor('Documents')?.click();
    await settle(fixture);
    const filler = el.querySelector('.oge-tree-view-item-filler');
    expect(filler).not.toBeNull();
    expect(filler?.getAttribute('role')).toBeNull();
    expect(filler?.getAttribute('tabindex')).toBe('-1');
    resolve([]);
    await settle(fixture);
  });
});

@Component({
  selector: 'oge-tpl-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    OgeTreeView,
    OgeTreeItemTemplate,
    OgeTreeExpandIconTemplate,
    OgeTreeNoDataTemplate,
  ],
  template: `
    <oge-tree-view [items]="items()" displayExpr="name" [rootValue]="null">
      <ng-template
        ogeTreeItemTemplate
        [ogeTreeItemTemplateTypeFor]="items()"
        let-item
        let-level="level"
      >
        <span class="custom-label">{{ item.name }}@{{ level }}</span>
      </ng-template>
      <ng-template ogeTreeExpandIconTemplate let-expanded>
        <span class="custom-icon">{{ expanded ? '-' : '+' }}</span>
      </ng-template>
      <ng-template ogeTreeNoDataTemplate>
        <span class="custom-empty">Nothing here</span>
      </ng-template>
    </oge-tree-view>
  `,
})
class TemplateHost {
  readonly items = signal<readonly Node[]>(FLAT);
}

describe('OgeTreeView template slots', () => {
  it('replaces the label and the chevron', async () => {
    const fixture = TestBed.createComponent(TemplateHost);
    await settle(fixture);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.custom-label')?.textContent).toBe('Documents@0');
    expect(el.querySelectorAll('.custom-icon')).toHaveLength(2);
    expect(el.querySelector('.custom-icon')?.textContent).toBe('+');
  });

  it('replaces the empty state', async () => {
    const fixture = TestBed.createComponent(TemplateHost);
    fixture.componentInstance.items.set([]);
    await settle(fixture);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.custom-empty'),
    ).not.toBeNull();
  });
});

describe('OgeTreeView configuration', () => {
  it('honors provideOgeTreeViewConfig message overrides', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideOgeTreeViewConfig({ messages: { noData: 'Öğe yok' } }),
      ],
    });
    @Component({
      selector: 'oge-config-host',
      changeDetection: ChangeDetectionStrategy.OnPush,
      imports: [OgeTreeView],
      template: `<oge-tree-view [items]="[]" />`,
    })
    class ConfigHost {}
    const fixture = TestBed.createComponent(ConfigHost);
    await settle(fixture);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '.oge-tree-view-empty',
      )?.textContent,
    ).toContain('Öğe yok');
  });
});
