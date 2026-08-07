import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { RowKey } from '@oge-ui/core';
import { OgeColumn } from '../columns/column';
import { OgeGrid, type OgeContextMenuEvent } from './grid';

interface Person {
  id: number;
  name: string;
  team: string;
}

const PEOPLE: Person[] = [
  { id: 1, name: 'Ali', team: 'A' },
  { id: 2, name: 'Ayşe', team: 'A' },
  { id: 3, name: 'Cem', team: 'B' },
  { id: 4, name: 'Deniz', team: 'B' },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  // select-all (allPages) resolves through the DataSource promise chain
  await new Promise((resolve) => setTimeout(resolve));
  fixture.detectChanges();
}

function rows(el: HTMLElement): HTMLElement[] {
  return Array.from(el.querySelectorAll('.oge-row'));
}

function clickRow(el: HTMLElement, index: number, init?: MouseEventInit): void {
  rows(el)[index].dispatchEvent(
    new MouseEvent('click', { bubbles: true, ...init }),
  );
}

function selectedIds(el: HTMLElement): string[] {
  return rows(el)
    .filter((row) => row.classList.contains('oge-row-selected'))
    .map(
      (row) =>
        row
          .querySelector('.oge-cell:not(.oge-checkbox-cell)')
          ?.textContent?.trim() ?? '',
    );
}

@Component({
  imports: [OgeGrid, OgeColumn],
  template: `
    <oge-grid
      [data]="data"
      keyField="id"
      [selectionMode]="mode()"
      [(selectedKeys)]="selected"
      [groupBy]="groupBy()"
      (rowContextMenu)="onMenu($event)"
    >
      <oge-column field="id" dataType="number" [width]="60" />
      <oge-column field="name" />
      <oge-column field="team" />
    </oge-grid>
  `,
})
class SelectionHost {
  readonly data = PEOPLE;
  readonly mode = signal<'none' | 'single' | 'multiple' | 'checkbox'>(
    'multiple',
  );
  readonly groupBy = signal<string[] | undefined>(undefined);
  selected: RowKey[] = [];
  lastMenu: OgeContextMenuEvent<Person> | null = null;
  menuActionRuns = 0;

  onMenu(event: OgeContextMenuEvent<Person>): void {
    this.lastMenu = event;
    event.items.push({
      text: `Copy ${event.row.name}`,
      action: () => this.menuActionRuns++,
    });
    event.items.push({ text: 'Disabled item', disabled: true });
  }
}

describe('OgeGrid selection', () => {
  async function render(mode: 'single' | 'multiple' | 'checkbox' = 'multiple') {
    const fixture = TestBed.createComponent(SelectionHost);
    fixture.componentInstance.mode.set(mode);
    await settle(fixture);
    return {
      fixture,
      host: fixture.componentInstance,
      el: fixture.nativeElement as HTMLElement,
    };
  }

  it('single mode keeps exactly one row selected', async () => {
    const { fixture, host, el } = await render('single');
    clickRow(el, 0);
    clickRow(el, 2);
    await settle(fixture);
    expect(selectedIds(el)).toEqual(['3']);
    expect(host.selected).toEqual([3]);
  });

  it('multiple mode: plain click replaces, ctrl toggles, shift ranges', async () => {
    const { fixture, host, el } = await render();
    clickRow(el, 0);
    clickRow(el, 2, { ctrlKey: true });
    await settle(fixture);
    expect(new Set(host.selected)).toEqual(new Set([1, 3]));

    clickRow(el, 1); // plain click resets + sets anchor
    clickRow(el, 3, { shiftKey: true });
    await settle(fixture);
    expect(host.selected).toEqual([2, 3, 4]);
  });

  it('shift-range works across group rows (only data rows selected)', async () => {
    const { fixture, host, el } = await render();
    fixture.componentInstance.groupBy.set(['team']);
    await settle(fixture);
    clickRow(el, 0);
    clickRow(el, 3, { shiftKey: true });
    await settle(fixture);
    expect(host.selected).toEqual([1, 2, 3, 4]);
    expect(el.querySelectorAll('.oge-group-row.oge-row-selected').length).toBe(
      0,
    );
  });

  it('Ctrl+A selects every filtered row in multi-select modes', async () => {
    const { fixture, host, el } = await render();
    clickRow(el, 0); // establish keyboard focus on a cell
    await settle(fixture);
    const viewport = el.querySelector('.oge-viewport') as HTMLElement;
    viewport.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }),
    );
    await settle(fixture);
    expect(new Set(host.selected)).toEqual(new Set([1, 2, 3, 4]));
  });

  it('checkbox mode renders a checkbox column and select-all with indeterminate state', async () => {
    const { fixture, host, el } = await render('checkbox');
    const header = el.querySelector(
      '.oge-header-cell.oge-checkbox-cell input',
    ) as HTMLInputElement;
    expect(header).toBeTruthy();
    expect(
      el.querySelectorAll('.oge-cell.oge-checkbox-cell input').length,
    ).toBe(4);

    (
      el.querySelectorAll(
        '.oge-cell.oge-checkbox-cell input',
      )[1] as HTMLInputElement
    ).click();
    await settle(fixture);
    expect(host.selected).toEqual([2]);
    expect(header.indeterminate).toBe(true);

    header.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(fixture);
    expect(new Set(host.selected)).toEqual(new Set([1, 2, 3, 4]));
    expect(header.checked).toBe(true);

    header.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(fixture);
    expect(host.selected).toEqual([]);
  });

  it('syncs selection from the model input into the grid', async () => {
    const fixture = TestBed.createComponent(SelectionHost);
    fixture.componentInstance.selected = [2, 4];
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(selectedIds(el)).toEqual(['2', '4']);
  });

  it('sets aria attributes for selection', async () => {
    const { fixture, el } = await render();
    expect(
      el.querySelector('.oge-viewport')?.getAttribute('aria-multiselectable'),
    ).toBe('true');
    clickRow(el, 0);
    await settle(fixture);
    expect(rows(el)[0].getAttribute('aria-selected')).toBe('true');
    expect(rows(el)[1].getAttribute('aria-selected')).toBe('false');
  });
});

describe('OgeGrid keyboard navigation', () => {
  async function render() {
    const fixture = TestBed.createComponent(SelectionHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, host: fixture.componentInstance, el };
  }

  function focusCell(el: HTMLElement, row: number, col: number): void {
    const cell = el.querySelector(`[data-cell="${row}-${col}"]`) as HTMLElement;
    cell.dispatchEvent(new FocusEvent('focus', { bubbles: false }));
  }

  function key(el: HTMLElement, key: string, init?: KeyboardEventInit): void {
    (el.querySelector('.oge-viewport') as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, ...init }),
    );
  }

  function tabbableCell(el: HTMLElement): string | null {
    return (
      el.querySelector('.oge-cell[tabindex="0"]')?.getAttribute('data-cell') ??
      null
    );
  }

  it('starts at the first data cell and moves with arrows/Home/End', async () => {
    const { fixture, el } = await render();
    expect(tabbableCell(el)).toBe('0-0');

    focusCell(el, 0, 0);
    key(el, 'ArrowDown');
    await settle(fixture);
    expect(tabbableCell(el)).toBe('1-0');

    key(el, 'ArrowRight');
    await settle(fixture);
    expect(tabbableCell(el)).toBe('1-1');

    key(el, 'End');
    await settle(fixture);
    expect(tabbableCell(el)).toBe('1-2');

    key(el, 'Home', { ctrlKey: true });
    await settle(fixture);
    expect(tabbableCell(el)).toBe('0-0');

    key(el, 'End', { ctrlKey: true });
    await settle(fixture);
    expect(tabbableCell(el)).toBe('3-2');
  });

  it('skips group rows when navigating vertically', async () => {
    const { fixture, el } = await render();
    fixture.componentInstance.groupBy.set(['team']);
    await settle(fixture);
    // flat: [group A, data(1), data(2), group B, data(3), data(4)]
    focusCell(el, 1, 0);
    key(el, 'ArrowDown');
    await settle(fixture);
    expect(tabbableCell(el)).toBe('2-0');
    key(el, 'ArrowDown'); // must skip the group row at index 3
    await settle(fixture);
    expect(tabbableCell(el)).toBe('4-0');
  });

  it('selects the focused row with Space', async () => {
    const { fixture, host, el } = await render();
    focusCell(el, 2, 0);
    key(el, ' ');
    await settle(fixture);
    expect(host.selected).toEqual([3]);
  });
});

describe('OgeGrid context menu', () => {
  it('opens on right-click with consumer items and runs actions', async () => {
    const fixture = TestBed.createComponent(SelectionHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;

    rows(el)[1].dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
    );
    await settle(fixture);
    expect(fixture.componentInstance.lastMenu?.row.name).toBe('Ayşe');

    const menu = el.querySelector('.oge-context-menu') as HTMLElement;
    expect(menu).toBeTruthy();
    const items = Array.from(menu.querySelectorAll('.oge-menu-item'));
    expect(items.map((i) => i.textContent?.trim())).toEqual([
      'Copy Ayşe',
      'Disabled item',
    ]);
    expect((items[1] as HTMLButtonElement).disabled).toBe(true);

    (items[0] as HTMLButtonElement).click();
    await settle(fixture);
    expect(fixture.componentInstance.menuActionRuns).toBe(1);
    expect(el.querySelector('.oge-context-menu')).toBeFalsy();
  });
});
