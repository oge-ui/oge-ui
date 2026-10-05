import { StrictMode, createRef, useState } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import type {
  OgeKanbanCardTransferredEvent,
  OgeKanbanColumnSort,
  OgeKanbanFilter,
  OgeKanbanFilterExpression,
} from '@oge-ui/kanban-engine';
import { OgeKanban } from './kanban';
import type { OgeKanbanHandle } from './kanban-types';

interface Task {
  id: number;
  status: string;
  title: string;
  tags?: string[];
  owner?: string;
  priority?: string;
  todo?: { text: string; done: boolean }[];
}

const TASKS: Task[] = [
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
];
const COLUMNS = [{ key: 'todo' }, { key: 'doing' }, { key: 'done' }];

interface Recorded {
  chips: OgeKanbanFilterExpression[];
  sort: OgeKanbanColumnSort<Task>[];
  selected: (readonly unknown[])[];
  transferred: OgeKanbanCardTransferredEvent<Task>[];
  received: OgeKanbanCardTransferredEvent<Task>[];
}

function Boards({
  filter,
  left,
  right,
  rec,
  veto,
}: {
  filter?: OgeKanbanFilter<Task>;
  left: React.Ref<OgeKanbanHandle<Task>>;
  right: React.Ref<OgeKanbanHandle<Task>>;
  rec: Recorded;
  veto: { current: boolean };
}) {
  const [chips, setChips] = useState<OgeKanbanFilterExpression>({});
  return (
    <>
      <OgeKanban<Task>
        ref={left}
        dataSource={TASKS}
        columns={COLUMNS}
        virtualScrolling={false}
        keyExpr="id"
        columnExpr="status"
        titleExpr="title"
        tagsExpr="tags"
        assigneeExpr="owner"
        priorityExpr="priority"
        checklistExpr="todo"
        filter={filter}
        showFilterBar
        filterValue={chips}
        onFilterValueChange={(value) => {
          rec.chips.push(value);
          setChips(value);
        }}
        onColumnSortChange={(sort) => rec.sort.push(sort)}
        onSelectedCardKeysChange={(keys) => rec.selected.push(keys)}
        quickAdd
        dragGroup="g"
        boardId="left"
        onCardTransferred={(event) => rec.transferred.push(event)}
        className="left"
      />
      <OgeKanban<Task>
        ref={right}
        dataSource={[{ id: 10, status: 'todo', title: 'Remote' }]}
        columns={COLUMNS}
        virtualScrolling={false}
        keyExpr="id"
        columnExpr="status"
        titleExpr="title"
        dragGroup="g"
        boardId="right"
        onCardTransferring={(event) => {
          event.cancel = veto.current;
        }}
        onCardTransferred={(event) => rec.received.push(event)}
        className="right"
      />
    </>
  );
}

function setup(filter?: OgeKanbanFilter<Task>) {
  const left = createRef<OgeKanbanHandle<Task>>();
  const right = createRef<OgeKanbanHandle<Task>>();
  const rec: Recorded = {
    chips: [],
    sort: [],
    selected: [],
    transferred: [],
    received: [],
  };
  const veto = { current: false };
  const utils = render(
    <StrictMode>
      <Boards filter={filter} left={left} right={right} rec={rec} veto={veto} />
    </StrictMode>,
  );
  const board = (name: 'left' | 'right') =>
    utils.container.querySelector<HTMLElement>(`.oge-kanban.${name}`)!;
  const titles = (column: string, name: 'left' | 'right' = 'left') =>
    Array.from(
      board(name).querySelectorAll(
        `.oge-kanban-cards[data-col="${column}"] .oge-kanban-card-title`,
      ),
    ).map((el) => el.textContent ?? '');
  const card = (key: number) =>
    utils.container.querySelector<HTMLElement>(
      `.oge-kanban-card[data-key="${key}"]`,
    )!;
  return { ...utils, left, right, rec, veto, board, titles, card };
}

describe('<OgeKanban> filtering, sorting, selection, history, transfers', () => {
  it('filters by the programmatic filter and by chips (StrictMode)', () => {
    const { board, titles, rerender, left, right, rec, veto } = setup({
      priorities: ['low', 'high'],
    });
    expect(titles('todo')).toEqual(['Banana', 'Apple']);
    const bug = Array.from(
      board('left').querySelectorAll<HTMLButtonElement>('.oge-kanban-chip'),
    ).find((chip) => chip.textContent === 'bug')!;
    fireEvent.click(bug);
    expect(rec.chips.at(-1)).toEqual({ tags: ['bug'] });
    expect(bug.getAttribute('aria-pressed')).toBe('true');
    expect(titles('todo')).toEqual(['Banana']);
    rerender(
      <StrictMode>
        <Boards
          filter={(c) => c.key === 3}
          left={left}
          right={right}
          rec={rec}
          veto={veto}
        />
      </StrictMode>,
    );
    expect(
      board('left').querySelector('.oge-kanban-empty-title')?.textContent,
    ).toBe('No cards match the filters');
    fireEvent.click(
      board('left').querySelector<HTMLButtonElement>('.oge-kanban-filters-clear')!,
    );
    expect(titles('todo')).toEqual(['Cherry']);
  });

  it('sorts a column from its header menu', () => {
    const { board, titles, rec } = setup();
    fireEvent.click(
      board('left').querySelector<HTMLButtonElement>(
        '.oge-kanban-column-menu-btn',
      )!,
    );
    const byTitle = board('left').querySelector<HTMLButtonElement>(
      '.oge-kanban-menu-item-sort[data-field="title"]',
    )!;
    expect(byTitle.getAttribute('role')).toBe('menuitemradio');
    fireEvent.click(byTitle);
    expect(rec.sort.at(-1)).toEqual({
      todo: { field: 'title', direction: 'asc' },
    });
    expect(titles('todo')).toEqual(['Apple', 'Banana', 'Cherry']);
  });

  it('multi-selects, bulk-deletes and undoes in one step', () => {
    const { card, titles, rec, board } = setup();
    fireEvent.click(card(1));
    fireEvent.click(card(3), { shiftKey: true });
    expect(rec.selected.at(-1)).toEqual([1, 2, 3]);
    expect(card(2).classList).toContain('oge-kanban-card-multi');
    fireEvent.click(card(2), { ctrlKey: true });
    expect(rec.selected.at(-1)).toEqual([1, 3]);
    fireEvent.keyDown(card(1), { key: 'a', ctrlKey: true });
    expect(rec.selected.at(-1)).toEqual([1, 2, 3]);
    fireEvent.keyDown(card(1), { key: 'Delete' });
    expect(titles('todo')).toEqual([]);
    expect(board('left').querySelector('.oge-kanban-live')?.textContent).toBe(
      '3 cards deleted',
    );
    fireEvent.keyDown(board('left'), { key: 'z', ctrlKey: true });
    expect(titles('todo')).toEqual(['Banana', 'Apple', 'Cherry']);
  });

  it('moves the selection with Ctrl+Arrow and redoes it', () => {
    const { card, titles, left } = setup();
    fireEvent.click(card(1));
    fireEvent.click(card(2), { ctrlKey: true });
    fireEvent.keyDown(card(1), { key: 'ArrowRight', ctrlKey: true });
    expect(titles('doing')).toEqual(['Banana', 'Apple', 'Date']);
    act(() => left.current!.undo());
    expect(titles('doing')).toEqual(['Date']);
    expect(left.current!.canRedo()).toBe(true);
    act(() => left.current!.redo());
    expect(titles('doing')).toEqual(['Banana', 'Apple', 'Date']);
  });

  it('adds from the quick-add composer and edits titles inline', () => {
    const { board, titles, card } = setup();
    fireEvent.click(
      board('left').querySelector<HTMLButtonElement>(
        '.oge-kanban-cards[data-col="done"] ~ .oge-kanban-add-card',
      )!,
    );
    const input = board('left').querySelector<HTMLInputElement>(
      '.oge-kanban-quick-add-input',
    )!;
    fireEvent.change(input, { target: { value: 'Fresh' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(titles('done')).toEqual(['Fresh']);
    fireEvent.keyDown(
      board('left').querySelector('.oge-kanban-quick-add-input')!,
      { key: 'Escape' },
    );
    expect(board('left').querySelector('.oge-kanban-quick-add-input')).toBeNull();

    fireEvent.keyDown(card(3), { key: 'F2' });
    const title = board('left').querySelector<HTMLInputElement>(
      '.oge-kanban-card-title-input',
    )!;
    title.value = 'Cherry pie';
    fireEvent.keyDown(title, { key: 'Enter' });
    expect(titles('todo')).toContain('Cherry pie');
  });

  it('shows checklist progress and toggles items', () => {
    const { card, left } = setup();
    const badge = card(1).querySelector('.oge-kanban-checklist')!;
    expect(badge.textContent).toContain('1/2');
    expect(badge.querySelector('.oge-kanban-sr-only')?.textContent).toBe(
      '1 of 2 checklist items done',
    );
    act(() => left.current!.toggleChecklistItem(1, 1));
    expect(card(1).querySelector('.oge-kanban-checklist')?.classList).toContain(
      'oge-kanban-checklist-done',
    );
  });

  it('transfers cards to another board of the drag group', () => {
    const { card, board, titles, rec, veto, left } = setup();
    fireEvent.contextMenu(card(1));
    const send = board('left').querySelector<HTMLButtonElement>(
      '.oge-kanban-menu-item-board',
    )!;
    expect(send.textContent).toBe('Move to right');
    fireEvent.click(send);
    expect(titles('todo')).toEqual(['Apple', 'Cherry']);
    expect(titles('todo', 'right')).toEqual(['Remote', 'Banana']);
    expect(rec.transferred[0]).toMatchObject({
      fromBoard: 'left',
      toBoard: 'right',
    });
    expect(rec.received[0].cards[0]).toMatchObject({ id: 1, status: 'todo' });
    veto.current = true;
    let accepted = true;
    act(() => {
      accepted = left.current!.transferCards([2], 'right');
    });
    expect(accepted).toBe(false);
    expect(titles('todo')).toEqual(['Apple', 'Cherry']);
  });

  it('exports CSV in board order', () => {
    const { left } = setup();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const csv = left.current!.exportToCsv('x.csv');
    click.mockRestore();
    const lines = csv.replace(new RegExp('^\\uFEFF'), '').split(/\r?\n/);
    expect(lines.slice(1).map((line) => line.split(',')[1])).toEqual([
      'Banana',
      'Apple',
      'Cherry',
      'Date',
    ]);
  });
});
