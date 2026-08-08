import {
  ChangeDetectionStrategy,
  Component,
  signal,
  viewChild,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeTreeSelect } from './tree-select';
import type {
  OgeTreeSelectSelectionChangedEvent,
  OgeTreeSelectSelectionMode,
} from './tree-select-types';

interface Folder {
  id: number;
  parentId: number | null;
  name: string;
}

/**
 * ```
 * 1 Documents        4 Photos
 *   2 Reports          5 Holiday
 *     3 Q1.pdf
 *   6 Notes
 * ```
 */
const FOLDERS: Folder[] = [
  { id: 1, parentId: null, name: 'Documents' },
  { id: 2, parentId: 1, name: 'Reports' },
  { id: 3, parentId: 2, name: 'Q1.pdf' },
  { id: 6, parentId: 1, name: 'Notes' },
  { id: 4, parentId: null, name: 'Photos' },
  { id: 5, parentId: 4, name: 'Holiday' },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  selector: 'oge-test-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OgeTreeSelect],
  template: `
    <oge-tree-select
      label="Folder"
      [items]="items()"
      displayExpr="name"
      [rootValue]="null"
      [selectionMode]="selectionMode()"
      [showCheckBoxes]="showCheckBoxes()"
      [disabled]="disabled()"
      [readonly]="readonly()"
      [showClearButton]="true"
      [expandedKeys]="[1, 2, 4]"
      [(value)]="value"
      [(opened)]="opened"
      (selectionChanged)="changes.push($event)"
    />
  `,
})
class Host {
  readonly select = viewChild.required(OgeTreeSelect<Folder>);
  readonly items = signal<readonly Folder[]>(FOLDERS);
  readonly selectionMode = signal<OgeTreeSelectSelectionMode>('single');
  readonly showCheckBoxes = signal<'none' | 'normal' | 'selectAll'>('none');
  readonly disabled = signal(false);
  readonly readonly = signal(false);
  readonly value = signal<unknown>(null);
  readonly opened = signal(false);
  readonly changes: OgeTreeSelectSelectionChangedEvent[] = [];
}

describe('OgeTreeSelect', () => {
  async function render(setup?: (host: Host) => void) {
    const fixture = TestBed.createComponent(Host);
    const host = fixture.componentInstance;
    setup?.(host);
    await settle(fixture);
    const el: HTMLElement = fixture.nativeElement;
    return {
      fixture,
      host,
      el,
      input: () => el.querySelector<HTMLInputElement>('.oge-input-native'),
      panel: () => document.querySelector('.oge-tree-select-panel'),
      rowFor: (name: string) =>
        Array.from(
          document.querySelectorAll<HTMLElement>('.oge-tree-view-item'),
        ).find((row) => row.textContent?.trim().startsWith(name)),
    };
  }

  afterEach(() => {
    document
      .querySelectorAll('.oge-popup, .oge-tree-select-panel')
      .forEach((el) => el.remove());
  });

  it('renders a readonly combobox with the field chrome', async () => {
    const { input, el } = await render();
    expect(input()?.getAttribute('role')).toBe('combobox');
    expect(input()?.getAttribute('aria-haspopup')).toBe('tree');
    expect(input()?.readOnly).toBe(true);
    expect(input()?.getAttribute('aria-expanded')).toBe('false');
    expect(el.querySelector('.oge-input-label')?.textContent).toContain(
      'Folder',
    );
  });

  it('opens on field click and points aria-controls at the tree', async () => {
    const { fixture, host, input, panel } = await render();
    input()?.click();
    await settle(fixture);

    expect(host.opened()).toBe(true);
    expect(panel()).not.toBeNull();
    const treeId = input()?.getAttribute('aria-controls');
    expect(treeId).toBeTruthy();
    expect(document.getElementById(treeId ?? '')?.getAttribute('role')).toBe(
      'tree',
    );
  });

  it('commits the picked key and closes in single mode', async () => {
    const { fixture, host, input, rowFor } = await render();
    input()?.click();
    await settle(fixture);

    rowFor('Reports')?.click();
    await settle(fixture);

    expect(host.value()).toBe(2);
    expect(host.opened()).toBe(false);
    expect(input()?.value).toBe('Reports');
    expect(host.changes.at(-1)?.keys).toEqual([2]);
  });

  it('shows the display text of a preset value without opening', async () => {
    const { input } = await render((h) => h.value.set(5));
    expect(input()?.value).toBe('Holiday');
  });

  it('collects several keys and joins their labels in multiple mode', async () => {
    const { fixture, host, input, rowFor } = await render((h) => {
      h.selectionMode.set('multiple');
      h.showCheckBoxes.set('normal');
    });
    input()?.click();
    await settle(fixture);

    rowFor('Notes')
      ?.querySelector<HTMLElement>('.oge-tree-view-check')
      ?.click();
    await settle(fixture);

    expect(host.value()).toEqual([6]);
    expect(input()?.value).toBe('Notes');
    // checkbox mode keeps the popup open for further picks
    expect(host.opened()).toBe(true);

    rowFor('Holiday')
      ?.querySelector<HTMLElement>('.oge-tree-view-check')
      ?.click();
    await settle(fixture);
    // Holiday is Photos' only child, so the cascade promotes Photos too —
    // `selectedKeysMode="leavesOnly"` is the projection that hides that
    expect(host.value()).toEqual([6, 4, 5]);
    expect(input()?.value).toBe('Notes, Photos, Holiday');
  });

  it('carries the tri-state cascade into the committed value', async () => {
    const { fixture, host, input, rowFor } = await render((h) => {
      h.selectionMode.set('multiple');
      h.showCheckBoxes.set('normal');
    });
    input()?.click();
    await settle(fixture);

    rowFor('Reports')
      ?.querySelector<HTMLElement>('.oge-tree-view-check')
      ?.click();
    await settle(fixture);
    // Reports + its descendant Q1.pdf; Documents stays partial (Notes is off)
    expect([...(host.value() as number[])].sort()).toEqual([2, 3]);
  });

  it('opens with ArrowDown and closes with Escape', async () => {
    const { fixture, host, input } = await render();
    input()?.focus();
    input()?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    await settle(fixture);
    expect(host.opened()).toBe(true);

    input()?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await settle(fixture);
    expect(host.opened()).toBe(false);
  });

  it('moves focus into the tree when the popup opens', async () => {
    const { fixture, host, input } = await render((h) => h.value.set(2));
    input()?.click();
    await settle(fixture);
    await new Promise((resolve) => setTimeout(resolve));
    await settle(fixture);

    const active = document.activeElement;
    expect(active?.classList.contains('oge-tree-view-item')).toBe(true);
    expect(active?.getAttribute('data-key')).toBe('2');
    void host;
  });

  it('clears through the field chrome clear button', async () => {
    const { fixture, host, el, input } = await render((h) => h.value.set(2));
    expect(input()?.value).toBe('Reports');

    el.querySelector<HTMLElement>('.oge-input-clear')?.click();
    await settle(fixture);
    expect(host.value()).toBeNull();
    expect(input()?.value).toBe('');
  });

  it('refuses to open while disabled or readonly', async () => {
    const { fixture, host, input } = await render((h) => h.disabled.set(true));
    input()?.click();
    await settle(fixture);
    expect(host.opened()).toBe(false);

    host.disabled.set(false);
    host.readonly.set(true);
    await settle(fixture);
    input()?.click();
    await settle(fixture);
    expect(host.opened()).toBe(false);
  });

  it('reports emptiness so the floating label and clear button behave', async () => {
    const { fixture, host, el } = await render();
    expect(el.querySelector('.oge-input-empty')).not.toBeNull();

    host.value.set(1);
    await settle(fixture);
    expect(el.querySelector('.oge-input-empty')).toBeNull();
  });

  it('treats an empty array as empty in multiple mode', async () => {
    const { el } = await render((h) => {
      h.selectionMode.set('multiple');
      h.value.set([]);
    });
    expect(el.querySelector('.oge-input-empty')).not.toBeNull();
  });
});
