import { Component, signal, viewChild } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeKanban } from './kanban';
import type {
  OgeKanbanCardMovedEvent,
  OgeKanbanCardTransferredEvent,
  OgeKanbanCardTransferringEvent,
  OgeKanbanColumnSort,
  OgeKanbanFilter,
  OgeKanbanFilterExpression,
} from '../kanban-types';

interface Task {
  id: number;
  status: string;
  title: string;
  team?: string;
  tags?: string[];
  owner?: string;
  priority?: string;
  todo?: { text: string; done: boolean }[];
}

@Component({
  imports: [OgeKanban],
  template: `
    <oge-kanban
      [dataSource]="tasks()"
      [columns]="columns"
      [virtualScrolling]="false"
      keyExpr="id"
      columnExpr="status"
      titleExpr="title"
      tagsExpr="tags"
      assigneeExpr="owner"
      priorityExpr="priority"
      checklistExpr="todo"
      [filter]="filter()"
      [showFilterBar]="true"
      [(filterValue)]="chips"
      [(columnSort)]="sort"
      [(selectedCardKeys)]="selected"
      [quickAdd]="true"
      dragGroup="g"
      boardId="left"
      (cardMoved)="moved.push($event)"
      (cardTransferred)="transferred.push($event)"
      style="height: 480px; display: block"
    />
    <oge-kanban
      #right
      [dataSource]="rightTasks()"
      [columns]="columns"
      [virtualScrolling]="false"
      keyExpr="id"
      columnExpr="status"
      titleExpr="title"
      dragGroup="g"
      boardId="right"
      (cardTransferring)="onTransferring($event)"
      (cardTransferred)="received.push($event)"
      style="height: 480px; display: block"
    />
  `,
})
class Host {
  readonly kanban = viewChild.required(OgeKanban<Task>);
  readonly right = viewChild.required<OgeKanban<Task>>('right');
  readonly tasks = signal<Task[]>([
    {
      id: 1,
      status: 'todo',
      title: 'Banana',
      tags: ['bug'],
      owner: 'Ada',
      priority: 'low',
      todo: [
        { text: 'a', done: true },
        { text: 'b', done: false },
      ],
    },
    {
      id: 2,
      status: 'todo',
      title: 'Apple',
      tags: ['ui'],
      owner: 'Grace',
      priority: 'high',
    },
    { id: 3, status: 'todo', title: 'Cherry', priority: 'medium' },
    { id: 4, status: 'doing', title: 'Date', tags: ['bug'] },
  ]);
  readonly rightTasks = signal<Task[]>([
    { id: 10, status: 'todo', title: 'Remote' },
  ]);
  readonly columns = [{ key: 'todo' }, { key: 'doing' }, { key: 'done' }];
  readonly filter = signal<OgeKanbanFilter<Task> | undefined>(undefined);
  readonly chips = signal<OgeKanbanFilterExpression>({});
  readonly sort = signal<OgeKanbanColumnSort<Task>>({});
  readonly selected = signal<readonly unknown[]>([]);
  readonly moved: OgeKanbanCardMovedEvent<Task>[] = [];
  readonly transferred: OgeKanbanCardTransferredEvent<Task>[] = [];
  readonly received: OgeKanbanCardTransferredEvent<Task>[] = [];
  vetoTransfers = false;
  onTransferring(event: OgeKanbanCardTransferringEvent<Task>): void {
    event.cancel = this.vetoTransfers;
  }
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

describe('<oge-kanban> filtering, sorting, selection, history, transfers', () => {
  let fixture: ComponentFixture<Host>;
  let host: HTMLElement;
  let left: HTMLElement;

  const titles = (column: string, root: HTMLElement = left): string[] =>
    Array.from(
      root.querySelectorAll<HTMLElement>(
        `.oge-kanban-cards[data-col="${column}"] .oge-kanban-card-title`,
      ),
    ).map((el) => el.textContent?.trim() ?? '');
  const card = (key: number): HTMLElement =>
    host.querySelector<HTMLElement>(`.oge-kanban-card[data-key="${key}"]`)!;
  const key = (el: HTMLElement, k: string, init: KeyboardEventInit = {}) =>
    el.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: k,
        bubbles: true,
        cancelable: true,
        ...init,
      }),
    );

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    host = fixture.nativeElement;
    await settle(fixture);
    left = host.querySelectorAll<HTMLElement>('oge-kanban')[0];
  });

  it('filters by the programmatic filter and by chips', async () => {
    fixture.componentInstance.filter.set({ priorities: ['low', 'high'] });
    await settle(fixture);
    expect(titles('todo')).toEqual(['Banana', 'Apple']);
    const bug = Array.from(
      left.querySelectorAll<HTMLButtonElement>('.oge-kanban-chip'),
    ).find((chip) => chip.textContent?.trim() === 'bug')!;
    expect(bug.getAttribute('aria-pressed')).toBe('false');
    bug.click();
    await settle(fixture);
    expect(bug.getAttribute('aria-pressed')).toBe('true');
    expect(fixture.componentInstance.chips()).toEqual({ tags: ['bug'] });
    expect(titles('todo')).toEqual(['Banana']);
    // WIP counts stay unfiltered
    expect(
      left.querySelector('.oge-kanban-column-header .oge-kanban-count')
        ?.textContent,
    ).toContain('3');
    fixture.componentInstance.filter.set((c) => c.key === 3);
    await settle(fixture);
    expect(left.querySelector('.oge-kanban-empty-title')?.textContent).toContain(
      'No cards match the filters',
    );
    left.querySelector<HTMLButtonElement>('.oge-kanban-filters-clear')!.click();
    await settle(fixture);
    expect(titles('todo')).toEqual(['Cherry']);
  });

  it('sorts a column from its header menu', async () => {
    left
      .querySelector<HTMLButtonElement>('.oge-kanban-column-menu-btn')!
      .click();
    await settle(fixture);
    const byTitle = left.querySelector<HTMLButtonElement>(
      '.oge-kanban-menu-item-sort[data-field="title"]',
    )!;
    expect(byTitle.getAttribute('role')).toBe('menuitemradio');
    byTitle.click();
    await settle(fixture);
    expect(fixture.componentInstance.sort()).toEqual({
      todo: { field: 'title', direction: 'asc' },
    });
    expect(titles('todo')).toEqual(['Apple', 'Banana', 'Cherry']);
    fixture.componentInstance.sort.set({
      todo: { field: 'priority', direction: 'asc' },
    });
    await settle(fixture);
    expect(titles('todo')).toEqual(['Apple', 'Cherry', 'Banana']);
  });

  it('multi-selects with Ctrl/Shift click and Ctrl+A, and bulk-deletes', async () => {
    card(1).click();
    card(3).dispatchEvent(
      new MouseEvent('click', { bubbles: true, shiftKey: true }),
    );
    await settle(fixture);
    expect(fixture.componentInstance.selected()).toEqual([1, 2, 3]);
    expect(card(2).classList).toContain('oge-kanban-card-multi');
    card(2).dispatchEvent(
      new MouseEvent('click', { bubbles: true, ctrlKey: true }),
    );
    await settle(fixture);
    expect(fixture.componentInstance.selected()).toEqual([1, 3]);
    key(card(1), 'a', { ctrlKey: true });
    await settle(fixture);
    expect(fixture.componentInstance.selected()).toEqual([1, 2, 3]);
    expect(card(1).getAttribute('aria-label')).toContain('selected');
    key(card(1), 'Delete');
    await settle(fixture);
    expect(titles('todo')).toEqual([]);
    expect(left.querySelector('.oge-kanban-live')?.textContent).toContain(
      '3 cards deleted',
    );
    // one undo step restores all three, in place
    fixture.componentInstance.kanban().undo();
    await settle(fixture);
    expect(titles('todo')).toEqual(['Banana', 'Apple', 'Cherry']);
  });

  it('moves the whole selection with Ctrl+Arrow and undoes it in one step', async () => {
    card(1).click();
    card(2).dispatchEvent(
      new MouseEvent('click', { bubbles: true, ctrlKey: true }),
    );
    await settle(fixture);
    key(card(1), 'ArrowRight', { ctrlKey: true });
    await settle(fixture);
    expect(titles('doing')).toEqual(['Banana', 'Apple', 'Date']);
    expect(fixture.componentInstance.moved).toHaveLength(2);
    expect(left.querySelector('.oge-kanban-live')?.textContent).toContain(
      '2 cards moved to doing',
    );
    key(left, 'z', { ctrlKey: true });
    await settle(fixture);
    expect(titles('todo')).toEqual(['Banana', 'Apple', 'Cherry']);
    expect(titles('doing')).toEqual(['Date']);
    key(left, 'y', { ctrlKey: true });
    await settle(fixture);
    expect(titles('doing')).toEqual(['Banana', 'Apple', 'Date']);
  });

  it('adds cards from the quick-add composer and edits titles inline', async () => {
    left
      .querySelector<HTMLButtonElement>(
        '.oge-kanban-cards[data-col="done"] ~ .oge-kanban-add-card',
      )!
      .click();
    await settle(fixture);
    const input = left.querySelector<HTMLInputElement>(
      '.oge-kanban-quick-add-input',
    )!;
    expect(input.getAttribute('aria-label')).toBe('New card title in done');
    input.value = 'Fresh';
    input.dispatchEvent(new Event('input'));
    key(input, 'Enter');
    await settle(fixture);
    expect(titles('done')).toEqual(['Fresh']);
    key(left.querySelector('.oge-kanban-quick-add-input')!, 'Escape');
    await settle(fixture);
    expect(left.querySelector('.oge-kanban-quick-add-input')).toBeNull();

    key(card(3), 'F2');
    await settle(fixture);
    const title = left.querySelector<HTMLInputElement>(
      '.oge-kanban-card-title-input',
    )!;
    title.value = 'Cherry pie';
    key(title, 'Enter');
    await settle(fixture);
    expect(titles('todo')).toContain('Cherry pie');
  });

  it('shows checklist progress and toggles items', async () => {
    const badge = card(1).querySelector('.oge-kanban-checklist')!;
    expect(badge.textContent).toContain('1/2');
    expect(badge.querySelector('.oge-kanban-sr-only')?.textContent).toBe(
      '1 of 2 checklist items done',
    );
    fixture.componentInstance.kanban().toggleChecklistItem(1, 1);
    await settle(fixture);
    expect(card(1).querySelector('.oge-kanban-checklist')?.classList).toContain(
      'oge-kanban-checklist-done',
    );
  });

  it('transfers cards to another board of the drag group', async () => {
    card(1).dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
    );
    await settle(fixture);
    const send = left.querySelector<HTMLButtonElement>(
      '.oge-kanban-menu-item-board',
    )!;
    expect(send.textContent?.trim()).toBe('Move to right');
    send.click();
    await settle(fixture);
    const right = host.querySelectorAll<HTMLElement>('oge-kanban')[1];
    expect(titles('todo')).toEqual(['Apple', 'Cherry']);
    expect(titles('todo', right)).toEqual(['Remote', 'Banana']);
    const { transferred, received } = fixture.componentInstance;
    expect(transferred[0]).toMatchObject({
      fromBoard: 'left',
      toBoard: 'right',
      toColumn: 'todo',
    });
    expect(received[0].cards[0]).toMatchObject({ id: 1, status: 'todo' });

    fixture.componentInstance.vetoTransfers = true;
    expect(fixture.componentInstance.kanban().transferCards([2], 'right')).toBe(
      false,
    );
    await settle(fixture);
    expect(titles('todo')).toEqual(['Apple', 'Cherry']);
  });

  it('exports CSV in board order', () => {
    // jsdom cannot follow the download link
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const csv = fixture.componentInstance.kanban().exportToCsv('x.csv');
    click.mockRestore();
    const lines = csv.replace(new RegExp('^\\uFEFF'), '').split(/\r?\n/);
    expect(lines[0]).toContain('Title');
    expect(lines.slice(1).map((line) => line.split(',')[1])).toEqual([
      'Banana',
      'Apple',
      'Cherry',
      'Date',
    ]);
    expect(lines[1]).toContain('1/2');
  });
});
