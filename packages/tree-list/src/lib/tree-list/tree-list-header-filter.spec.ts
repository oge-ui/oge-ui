import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeColumn } from '@oge-ui/grid';
import { OgeTreeList } from './tree-list';

interface Task {
  id: number;
  parentId: number | null;
  title: string;
  office: string;
}

const TASKS: Task[] = [
  { id: 1, parentId: null, title: 'Root A', office: 'Berlin' },
  { id: 2, parentId: 1, title: 'Child A1', office: 'London' },
  { id: 3, parentId: 1, title: 'Child A2', office: 'İzmir' },
  { id: 4, parentId: null, title: 'Root B', office: 'Berlin' },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function rowTitles(el: HTMLElement): string[] {
  return Array.from(el.querySelectorAll('.oge-row')).map(
    (row) =>
      row.querySelector('.oge-tree-cell-text')?.textContent?.trim() ?? '',
  );
}

function popupLabel(el: HTMLElement, text: string): HTMLInputElement | null {
  const label = Array.from(
    el.querySelectorAll<HTMLElement>('.oge-header-filter-popup .oge-hf-item'),
  ).find((item) => item.textContent?.includes(text));
  return label?.querySelector<HTMLInputElement>('input') ?? null;
}

@Component({
  imports: [OgeTreeList, OgeColumn],
  template: `
    <oge-tree-list
      [data]="data"
      keyExpr="id"
      parentIdExpr="parentId"
      [autoExpandAll]="true"
      [headerFilter]="true"
    >
      <oge-column field="title" caption="Title" />
      <oge-column field="office" caption="Office" />
    </oge-tree-list>
  `,
})
class Host {
  readonly data = TASKS.map((task) => ({ ...task }));
}

describe('OgeTreeList header filter', () => {
  async function render() {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  async function openOfficeFilter(
    fixture: ComponentFixture<unknown>,
    el: HTMLElement,
  ): Promise<void> {
    const buttons = el.querySelectorAll<HTMLButtonElement>(
      '.oge-header-filter-btn',
    );
    buttons[1].click(); // Office column
    await settle(fixture);
  }

  it('lists distinct values and filters on toggle, keeping ancestors', async () => {
    const { fixture, el } = await render();
    await openOfficeFilter(fixture, el);
    const labels = Array.from(
      el.querySelectorAll('.oge-header-filter-popup .oge-hf-item span'),
    ).map((span) => span.textContent?.trim());
    // fold-ordered (locale-independent): İzmir folds to "izmir" → before London
    expect(labels).toEqual(['(All)', 'Berlin', 'İzmir', 'London']);

    // unticking Berlin leaves London + İzmir matches; Root A stays as ancestor
    popupLabel(el, 'Berlin')?.click();
    await settle(fixture);
    expect(rowTitles(el)).toEqual(['Root A', 'Child A1', 'Child A2']);
    // funnel shows the active state
    expect(el.querySelector('.oge-header-filter-active')).toBeTruthy();
  });

  it('the (All) checkbox clears the filter again', async () => {
    const { fixture, el } = await render();
    await openOfficeFilter(fixture, el);
    popupLabel(el, 'Berlin')?.click();
    await settle(fixture);
    popupLabel(el, '(All)')?.click();
    await settle(fixture);
    expect(rowTitles(el).length).toBe(4);
    expect(el.querySelector('.oge-header-filter-active')).toBeNull();
  });

  it('the popup search narrows the value list, locale-safe', async () => {
    const { fixture, el } = await render();
    await openOfficeFilter(fixture, el);
    const search = el.querySelector<HTMLInputElement>('.oge-hf-search');
    if (!search) throw new Error('popup search missing');
    search.value = 'izmir';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    const labels = Array.from(
      el.querySelectorAll('.oge-header-filter-popup .oge-hf-item span'),
    ).map((span) => span.textContent?.trim());
    expect(labels).toEqual(['(All)', 'İzmir']);
  });
});
