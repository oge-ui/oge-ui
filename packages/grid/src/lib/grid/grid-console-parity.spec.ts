import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { OgeMenuItem } from '@oge-ui/overlay';
import { OgeColumn } from '../columns/column';
import { OgeDetailTemplate } from '../templates/detail-template';
import {
  OgeGrid,
  type OgeContextMenuEvent,
  type OgeGridRowTogglingEvent,
  type OgeHeaderContextMenuEvent,
} from './grid';

/**
 * The members a production console had to rebuild around the grid: keyboard
 * context menus, immediate sort/page events, column alignment, evented
 * group/detail toggles, focused-cell events, the imperative column chooser and
 * programmatic total-summary values.
 */

interface Sale {
  id: number;
  region: string;
  city: string;
  amount: number;
}

const SALES: Sale[] = [
  { id: 1, region: 'EU', city: 'Berlin', amount: 100 },
  { id: 2, region: 'EU', city: 'Paris', amount: 200 },
  { id: 3, region: 'US', city: 'NYC', amount: 300 },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve));
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeGrid, OgeColumn, OgeDetailTemplate],
  template: `
    <oge-grid
      [data]="data"
      keyField="id"
      [groupBy]="groupBy()"
      [columnChooser]="true"
      [paging]="paging()"
      (rowContextMenu)="onRowMenu($event)"
      (headerContextMenu)="headerEvents.push($event)"
    >
      <oge-column field="id" dataType="number" [width]="70" />
      <oge-column field="region" alignment="center" />
      <oge-column field="city" />
      <oge-column field="amount" dataType="number" totalSummary="sum" />
      <oge-column field="code" dataType="number" alignment="start" />
      @if (withDetail()) {
        <ng-template ogeDetailTemplate let-row>detail {{ row.id }}</ng-template>
      }
    </oge-grid>
  `,
})
class Host {
  readonly grid = viewChild.required(OgeGrid<Sale>);
  readonly data = SALES;
  readonly groupBy = signal<string[]>([]);
  readonly paging = signal<false | { pageSize: number }>(false);
  readonly withDetail = signal(false);
  readonly rowEvents: OgeContextMenuEvent<Sale>[] = [];
  readonly headerEvents: OgeHeaderContextMenuEvent[] = [];
  rowItems: OgeMenuItem[] = [];

  onRowMenu(event: OgeContextMenuEvent<Sale>): void {
    this.rowEvents.push(event);
    event.items.push(...this.rowItems);
  }
}

async function render(
  setup: (host: Host) => void = () => undefined,
): Promise<{ fixture: ComponentFixture<Host>; host: Host; el: HTMLElement }> {
  const fixture = TestBed.createComponent(Host);
  setup(fixture.componentInstance);
  await settle(fixture);
  return {
    fixture,
    host: fixture.componentInstance,
    el: fixture.nativeElement as HTMLElement,
  };
}

function key(target: Element, init: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

describe('OgeGrid — console parity', () => {
  describe('column alignment', () => {
    it('defaults numbers to the end and honours an explicit alignment', async () => {
      const { el } = await render();
      const headers = [...el.querySelectorAll('.oge-header-cell[data-colid]')];
      const classesOf = (id: string) => {
        const header = headers.find((h) => h.getAttribute('data-colid') === id);
        return {
          end: header?.classList.contains('oge-align-end'),
          center: header?.classList.contains('oge-align-center'),
        };
      };
      expect(classesOf('id')).toEqual({ end: true, center: false });
      expect(classesOf('region')).toEqual({ end: false, center: true });
      expect(classesOf('city')).toEqual({ end: false, center: false });
      // a number column may opt out of end alignment
      expect(classesOf('code')).toEqual({ end: false, center: false });

      const firstRowCells = [
        ...(el.querySelector('.oge-row')?.querySelectorAll('.oge-cell') ?? []),
      ];
      expect(firstRowCells[0].classList.contains('oge-align-end')).toBe(true);
      expect(firstRowCells[1].classList.contains('oge-align-center')).toBe(
        true,
      );
      // tabular figures stay on every number cell, aligned or not
      expect(firstRowCells[4].classList.contains('oge-cell-number')).toBe(true);
      expect(firstRowCells[4].classList.contains('oge-align-end')).toBe(false);
    });
  });

  describe('keyboard context menus', () => {
    it('Shift+F10 on a body cell emits rowContextMenu from the keyboard', async () => {
      const { fixture, host, el } = await render((h) => {
        h.rowItems = [{ text: 'Open' }];
      });
      const cell = el
        .querySelectorAll('.oge-row')[1]
        .querySelector('.oge-cell');
      expect(cell).toBeTruthy();
      const event = key(cell as Element, { key: 'F10', shiftKey: true });
      await settle(fixture);
      expect(host.rowEvents).toHaveLength(1);
      expect(host.rowEvents[0]).toMatchObject({
        key: 2,
        row: SALES[1],
        source: 'keyboard',
      });
      expect(host.rowEvents[0].event).toBe(event);
      expect(event.defaultPrevented).toBe(true);
      // the built-in menu opened with the pushed item
      expect(document.querySelector('.oge-menu-list')?.textContent).toContain(
        'Open',
      );
    });

    it('swallows the native contextmenu echo, but never a real right-click', async () => {
      const { fixture, host, el } = await render();
      const cell = el.querySelector('.oge-row .oge-cell') as HTMLElement;
      key(cell, { key: 'ContextMenu' });
      const echo = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        button: 0,
      });
      cell.dispatchEvent(echo);
      await settle(fixture);
      expect(host.rowEvents.map((e) => e.source)).toEqual(['keyboard']);
      expect(echo.defaultPrevented).toBe(true);

      cell.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          button: 2,
        }),
      );
      await settle(fixture);
      expect(host.rowEvents.map((e) => e.source)).toEqual([
        'keyboard',
        'pointer',
      ]);
    });

    it('the Menu key on a focused header opens the header menu', async () => {
      const { fixture, host, el } = await render();
      const header = el.querySelector(
        '.oge-header-cell[data-colid="city"]',
      ) as HTMLElement;
      key(header, { key: 'ContextMenu' });
      await settle(fixture);
      expect(host.headerEvents).toHaveLength(1);
      expect(host.headerEvents[0]).toMatchObject({
        field: 'city',
        source: 'keyboard',
      });
      // the built-in sort items are there
      expect(host.headerEvents[0].items.length).toBeGreaterThan(0);
    });

    it('leaves the keys alone while an editor or a non-cell has focus', async () => {
      const { host, el } = await render();
      const toolbarButton = el.querySelector(
        '.oge-chooser-button',
      ) as HTMLElement;
      const event = key(toolbarButton, { key: 'F10', shiftKey: true });
      expect(event.defaultPrevented).toBe(false);
      expect(host.rowEvents).toHaveLength(0);
    });
  });

  describe('sortChanged / pageChanged', () => {
    it('sortChanged fires with the previous sort, the initial sort is not a change', async () => {
      const { fixture, host, el } = await render();
      const events: unknown[] = [];
      host.grid().sortChanged.subscribe((e) => events.push(e));
      (
        el.querySelector('.oge-header-cell[data-colid="city"]') as HTMLElement
      ).click();
      await settle(fixture);
      expect(events).toEqual([
        { sort: [{ field: 'city', dir: 'asc' }], previousSort: [] },
      ]);
      host.grid().clearSorting();
      await settle(fixture);
      expect(events[1]).toEqual({
        sort: [],
        previousSort: [{ field: 'city', dir: 'asc' }],
      });
    });

    it('pageChanged reports index and size moves', async () => {
      const { fixture, host } = await render((h) =>
        h.paging.set({ pageSize: 2 }),
      );
      const events: unknown[] = [];
      host.grid().pageChanged.subscribe((e) => events.push(e));
      host.grid().setPageIndex(1);
      await settle(fixture);
      expect(events).toEqual([
        {
          pageIndex: 1,
          pageSize: 2,
          previousPageIndex: 0,
          previousPageSize: 2,
        },
      ]);
    });
  });

  describe('rowExpanding / rowExpanded / rowCollapsing / rowCollapsed', () => {
    it('evented group toggles, vetoable through cancel', async () => {
      const { fixture, host, el } = await render((h) =>
        h.groupBy.set(['region']),
      );
      const grid = host.grid();
      const log: string[] = [];
      let veto = false;
      grid.rowCollapsing.subscribe((e: OgeGridRowTogglingEvent<Sale>) => {
        log.push(`collapsing:${e.kind}`);
        e.cancel = veto;
      });
      grid.rowCollapsed.subscribe((e) => log.push(`collapsed:${e.kind}`));
      grid.rowExpanding.subscribe((e) => log.push(`expanding:${e.kind}`));
      grid.rowExpanded.subscribe((e) => log.push(`expanded:${e.kind}`));

      const group = () => el.querySelector('.oge-group-row') as HTMLElement;
      veto = true;
      group().click();
      await settle(fixture);
      expect(log).toEqual(['collapsing:group']);
      expect(group().getAttribute('aria-expanded')).toBe('true');

      veto = false;
      group().click();
      await settle(fixture);
      expect(group().getAttribute('aria-expanded')).toBe('false');
      group().click();
      await settle(fixture);
      expect(log).toEqual([
        'collapsing:group',
        'collapsing:group',
        'collapsed:group',
        'expanding:group',
        'expanded:group',
      ]);
    });

    it('detail toggles carry the row, from the expander and expandRow()', async () => {
      const { fixture, host, el } = await render((h) => h.withDetail.set(true));
      const grid = host.grid();
      const expanded: unknown[] = [];
      grid.rowExpanded.subscribe((e) => expanded.push(e));
      (el.querySelector('.oge-expander-btn') as HTMLElement).click();
      await settle(fixture);
      grid.expandRow(3);
      await settle(fixture);
      expect(expanded).toEqual([
        { key: 1, kind: 'detail', row: SALES[0] },
        { key: 3, kind: 'detail', row: SALES[2] },
      ]);
      // already expanded: no event
      grid.expandRow(3);
      await settle(fixture);
      expect(expanded).toHaveLength(2);
    });
  });

  describe('focusedCellChanged', () => {
    it('reports the cell, its row and its field as focus moves', async () => {
      const { fixture, host, el } = await render();
      const events: unknown[] = [];
      host.grid().focusedCellChanged.subscribe((e) => events.push(e));
      const cells = el
        .querySelectorAll('.oge-row')[0]
        .querySelectorAll('.oge-cell');
      cells[0].dispatchEvent(new FocusEvent('focus'));
      await settle(fixture);
      expect(events).toHaveLength(1);
      cells[1].dispatchEvent(new FocusEvent('focus'));
      await settle(fixture);
      expect(events).toHaveLength(2);
      expect(events.at(-1)).toEqual({
        rowIndex: 0,
        columnIndex: 1,
        key: 1,
        row: SALES[0],
        field: 'region',
      });
    });
  });

  describe('imperative chooser and totals', () => {
    it('showColumnChooser() / hideColumnChooser()', async () => {
      const { fixture, host } = await render();
      const chooserOpen = () =>
        document.querySelector('.oge-chooser-popup') !== null;
      host.grid().showColumnChooser();
      await settle(fixture);
      expect(chooserOpen()).toBe(true);
      host.grid().showColumnChooser(); // idempotent
      await settle(fixture);
      expect(document.querySelectorAll('.oge-chooser-popup')).toHaveLength(1);
      host.grid().hideColumnChooser();
      await settle(fixture);
      expect(chooserOpen()).toBe(false);
    });

    it('getTotalSummaryValue() returns the raw total', async () => {
      const { host } = await render();
      expect(host.grid().getTotalSummaryValue('amount')).toBe(600);
      expect(host.grid().getTotalSummaryValue('amount', 'sum')).toBe(600);
      expect(host.grid().getTotalSummaryValue('amount', 'avg')).toBeUndefined();
      expect(host.grid().getTotalSummaryValue('city')).toBeUndefined();
    });
  });
});
