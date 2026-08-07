import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { RowKey } from '@oge-ui/core';
import { OgeColumn, type OgeSelectionMode } from '@oge-ui/grid';
import { OgeTreeList } from './tree-list';

interface Task {
  id: number;
  parentId: number | null;
  title: string;
}

const TASKS: Task[] = [
  { id: 1, parentId: null, title: 'Root A' },
  { id: 2, parentId: 1, title: 'Child A1' },
  { id: 3, parentId: 1, title: 'Child A2' },
  { id: 4, parentId: null, title: 'Root B' },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function rowByTitle(el: HTMLElement, title: string): HTMLElement | undefined {
  return Array.from(el.querySelectorAll<HTMLElement>('.oge-row')).find((row) =>
    (row.textContent ?? '').includes(title),
  );
}

@Component({
  imports: [OgeTreeList, OgeColumn],
  template: `
    <oge-tree-list
      [data]="data"
      keyExpr="id"
      parentIdExpr="parentId"
      [autoExpandAll]="true"
      [selectionMode]="selectionMode"
      [(selectedKeys)]="selectedKeys"
    >
      <oge-column field="title" />
    </oge-tree-list>
  `,
})
class Host {
  data: Task[] = TASKS.map((task) => ({ ...task }));
  selectionMode: OgeSelectionMode = 'multiple';
  selectedKeys: RowKey[] = [];
}

describe('OgeTreeList selection', () => {
  async function render(configure?: (host: Host) => void) {
    const fixture = TestBed.createComponent(Host);
    configure?.(fixture.componentInstance);
    await settle(fixture);
    return {
      fixture,
      host: fixture.componentInstance,
      el: fixture.nativeElement as HTMLElement,
    };
  }

  it('single mode keeps exactly one row selected', async () => {
    const { fixture, host, el } = await render(
      (h) => (h.selectionMode = 'single'),
    );
    rowByTitle(el, 'Child A1')?.click();
    await settle(fixture);
    expect(host.selectedKeys).toEqual([2]);
    rowByTitle(el, 'Root B')?.click();
    await settle(fixture);
    expect(host.selectedKeys).toEqual([4]);
    expect(el.querySelectorAll('.oge-row-selected').length).toBe(1);
  });

  it('ctrl-click toggles in multiple mode and aria-selected follows', async () => {
    const { fixture, host, el } = await render();
    rowByTitle(el, 'Root A')?.click();
    await settle(fixture);
    rowByTitle(el, 'Child A2')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, ctrlKey: true }),
    );
    await settle(fixture);
    expect([...host.selectedKeys].sort()).toEqual([1, 3]);
    expect(rowByTitle(el, 'Child A2')?.getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(rowByTitle(el, 'Child A1')?.getAttribute('aria-selected')).toBe(
      'false',
    );
  });

  it('checkbox mode renders a leading column and select-all toggles every visible row', async () => {
    const { fixture, host, el } = await render(
      (h) => (h.selectionMode = 'checkbox'),
    );
    const headerCheckbox = el.querySelector<HTMLInputElement>(
      '.oge-header-cell.oge-checkbox-cell input',
    );
    expect(headerCheckbox).toBeTruthy();
    headerCheckbox?.click();
    await settle(fixture);
    expect(host.selectedKeys.length).toBe(4);
    headerCheckbox?.click();
    await settle(fixture);
    expect(host.selectedKeys).toEqual([]);
  });

  it('selectedKeys input drives the visual selection', async () => {
    const { el } = await render((h) => (h.selectedKeys = [2]));
    expect(
      rowByTitle(el, 'Child A1')?.classList.contains('oge-row-selected'),
    ).toBe(true);
  });
});
