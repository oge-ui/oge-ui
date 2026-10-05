import { createRef } from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import type {
  OgeKanbanCardDeletingEvent,
  OgeKanbanCardMovedEvent,
  OgeKanbanCardMovingEvent,
  OgeKanbanColumnAddingEvent,
} from '@oge-ui/kanban-engine';
import { OgeKanban } from './kanban';
import type {
  OgeKanbanEditDialogShowingEvent,
  OgeKanbanHandle,
  OgeKanbanProps,
} from './kanban-types';

interface Task {
  id: number | string;
  status: string;
  title: string;
  rank?: number;
}

const TASKS: Task[] = [
  { id: 1, status: 'todo', title: 'One' },
  { id: 2, status: 'todo', title: 'Two' },
  { id: 3, status: 'doing', title: 'Three' },
];
const COLUMNS = [{ key: 'todo' }, { key: 'doing' }, { key: 'done' }];

function setup(props: Partial<OgeKanbanProps<Task>> = {}) {
  const ref = createRef<OgeKanbanHandle<Task>>();
  const log = {
    deleting: [] as OgeKanbanCardDeletingEvent<Task>[],
    deleted: [] as unknown[],
    moving: [] as OgeKanbanCardMovingEvent<Task>[],
    moved: [] as OgeKanbanCardMovedEvent<Task>[],
    showing: [] as OgeKanbanEditDialogShowingEvent<Task>[],
    hidden: 0,
  };
  const utils = render(
    <OgeKanban<Task>
      ref={ref}
      dataSource={TASKS}
      columns={COLUMNS}
      virtualScrolling={false}
      keyExpr="id"
      columnExpr="status"
      titleExpr="title"
      locale="en-US"
      onCardDeleting={(event) => log.deleting.push(event)}
      onCardDeleted={(event) => log.deleted.push(event)}
      onCardMoving={(event) => log.moving.push(event)}
      onCardMoved={(event) => log.moved.push(event)}
      onCardEditDialogShowing={(event) => log.showing.push(event)}
      onCardEditDialogHidden={() => log.hidden++}
      {...props}
    />,
  );
  const root = utils.container;
  const cards = () =>
    Array.from(root.querySelectorAll<HTMLElement>('.oge-kanban-card'));
  const titlesIn = (column: string) =>
    Array.from(
      root.querySelectorAll(
        `.oge-kanban-cards[data-col="${column}"] .oge-kanban-card-title`,
      ),
    ).map((el) => el.textContent ?? '');
  return { ...utils, ref, log, cards, titlesIn, root };
}

const flush = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

describe('<OgeKanban> CRUD + interactions', () => {
  it('renders the toolbar: add, collapse pill, search', () => {
    const { root } = setup();
    const toolbar = root.querySelector('.oge-kanban-toolbar');
    expect(toolbar?.getAttribute('role')).toBe('toolbar');
    expect(toolbar?.querySelector('.oge-kanban-btn-add')?.textContent).toBe(
      'New card',
    );
    expect(
      toolbar?.querySelectorAll(
        '.oge-kanban-toolbar-group button:not(.oge-kanban-btn-undo):not(.oge-kanban-btn-redo)',
      ),
    ).toHaveLength(2);
    expect(
      root
        .querySelector('.oge-kanban-search-input')
        ?.getAttribute('aria-label'),
    ).toBe('Search cards');
  });

  it('search filters cards fold-insensitively and clears', () => {
    const { root, cards } = setup();
    const input = root.querySelector('.oge-kanban-search-input') as HTMLElement;
    fireEvent.change(input, { target: { value: 'TWO' } });
    expect(cards().map((card) => card.textContent)).toEqual([
      expect.stringContaining('Two'),
    ]);
    fireEvent.change(input, { target: { value: 'nothing' } });
    expect(root.querySelector('.oge-kanban-empty-title')?.textContent).toBe(
      'No cards match your search',
    );
    fireEvent.click(root.querySelector('.oge-kanban-search-clear') as Element);
    expect(cards()).toHaveLength(3);
  });

  it('dblclick opens the edit dialog through onCardEditDialogShowing', async () => {
    const { cards, log } = setup();
    fireEvent.doubleClick(cards()[0]);
    await flush();
    expect(log.showing).toHaveLength(1);
    expect(log.showing[0].isNew).toBe(false);
    expect(log.showing[0].formItems.map((item) => item.field)).toEqual([
      'title',
      'description',
      'column',
      'color',
    ]);
    expect(document.querySelector('.oge-modal')).not.toBeNull();
    expect(document.querySelector('.oge-kanban-editor-form')).not.toBeNull();
  });

  it('cancelling onCardEditDialogShowing keeps the dialog closed', async () => {
    const { cards } = setup({
      onCardEditDialogShowing: (event) => {
        event.cancel = true;
      },
    });
    fireEvent.doubleClick(cards()[0]);
    await flush();
    expect(document.querySelector('.oge-kanban-editor-form')).toBeNull();
  });

  it('Delete key runs the cancelable delete pipeline', () => {
    const { cards, log, titlesIn } = setup();
    fireEvent.keyDown(cards()[0], { key: 'Delete' });
    expect(log.deleting).toHaveLength(1);
    expect(log.deleted).toHaveLength(1);
    expect(titlesIn('todo')).toEqual(['Two']);
  });

  it('a cancelled onCardDeleting leaves the board unchanged', () => {
    const { cards, log, titlesIn } = setup({
      onCardDeleting: (event) => {
        event.cancel = true;
      },
    });
    fireEvent.keyDown(cards()[0], { key: 'Delete' });
    expect(log.deleted).toHaveLength(0);
    expect(titlesIn('todo')).toEqual(['One', 'Two']);
  });

  it('moveCard commits through onCardMoving → onCardMoved and reorders the store', () => {
    const { ref, log, titlesIn } = setup();
    act(() => ref.current?.moveCard(1, 'doing', 0));
    expect(log.moving[0]).toMatchObject({
      fromColumn: 'todo',
      toColumn: 'doing',
      fromIndex: 0,
      toIndex: 0,
    });
    expect(log.moved[0].card).toMatchObject({ id: 1, status: 'doing' });
    expect(titlesIn('doing')).toEqual(['One', 'Three']);
  });

  it('a cancelled onCardMoving leaves every column unchanged', () => {
    const { ref, log, titlesIn } = setup({
      onCardMoving: (event) => {
        event.cancel = true;
      },
    });
    act(() => ref.current?.moveCard(1, 'doing'));
    expect(log.moved).toHaveLength(0);
    expect(titlesIn('todo')).toEqual(['One', 'Two']);
  });

  it('moveCard with an orderExpr writes a midpoint order instead of reordering', () => {
    const ranked: Task[] = [
      { id: 1, status: 'todo', title: 'One', rank: 0 },
      { id: 2, status: 'todo', title: 'Two', rank: 1 },
      { id: 3, status: 'doing', title: 'Three', rank: 0 },
    ];
    const { ref, log, titlesIn } = setup({
      dataSource: ranked,
      orderExpr: 'rank',
    });
    act(() => ref.current?.moveCard(3, 'todo', 1));
    expect(log.moved[0].card).toMatchObject({ id: 3, rank: 0.5 });
    expect(titlesIn('todo')).toEqual(['One', 'Three', 'Two']);
  });

  it('right-click opens the built-in card menu; the move-to entry moves', async () => {
    const { cards, root, titlesIn } = setup();
    fireEvent.contextMenu(cards()[0], { clientX: 20, clientY: 20 });
    await flush();
    const menu = root.querySelector('.oge-kanban-menu');
    expect(menu?.getAttribute('role')).toBe('menu');
    expect(document.activeElement?.textContent).toBe('Edit');
    const moves = Array.from(
      root.querySelectorAll<HTMLElement>('.oge-kanban-menu-item-move'),
    );
    expect(moves.map((item) => item.textContent)).toEqual(['doing', 'done']);
    fireEvent.click(moves[1]);
    expect(root.querySelector('.oge-kanban-menu')).toBeNull();
    expect(titlesIn('done')).toEqual(['One']);
  });

  it('menu keyboard: arrows walk the items, Escape closes', async () => {
    const { cards, root } = setup();
    fireEvent.contextMenu(cards()[0]);
    await flush();
    const menu = root.querySelector('.oge-kanban-menu') as HTMLElement;
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement?.textContent).toBe('doing');
    fireEvent.keyDown(menu, { key: 'Escape' });
    expect(root.querySelector('.oge-kanban-menu')).toBeNull();
  });

  it('an available action preventDefaults the native menu', () => {
    const { cards } = setup();
    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      cards()[0].dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
  });

  it('the per-column add button and empty-column affordances render', () => {
    const { root } = setup();
    expect(root.querySelectorAll('.oge-kanban-column-add')).toHaveLength(3);
    expect(
      root.querySelector('.oge-kanban-column-add')?.getAttribute('aria-label'),
    ).toBe('Add a card to todo');
    expect(root.querySelector('.oge-kanban-cell-empty')?.textContent).toBe(
      'No cards',
    );
  });

  it('readOnly keeps the native context menu (no built-in menu)', () => {
    const { cards, root } = setup({ readOnly: true });
    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      cards()[0].dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(false);
    expect(root.querySelector('.oge-kanban-menu')).toBeNull();
    expect(root.querySelector('.oge-kanban-btn-add')).toBeNull();
    expect(cards()[0].getAttribute('aria-keyshortcuts')).toBeNull();
  });

  it('minCount renders the warning badge; transitionColumns/allowDrop gate the menu', async () => {
    const { cards, root } = setup({
      columns: [
        { key: 'todo', minCount: 3, transitionColumns: ['doing', 'done'] },
        { key: 'doing' },
        { key: 'done', allowDrop: false },
      ],
    });
    expect(
      root
        .querySelector('.oge-kanban-column-header .oge-kanban-count')
        ?.classList.contains('oge-kanban-count-warn'),
    ).toBe(true);
    fireEvent.contextMenu(cards()[0]);
    await flush();
    expect(
      Array.from(root.querySelectorAll('.oge-kanban-menu-item-move')).map(
        (item) => item.textContent,
      ),
    ).toEqual(['doing']);
  });

  it('closeDialog() closes programmatically and onCardEditDialogHidden fires', async () => {
    const { ref, log, cards } = setup();
    fireEvent.doubleClick(cards()[0]);
    await flush();
    act(() => ref.current?.closeDialog());
    await flush();
    expect(log.hidden).toBe(1);
    await waitFor(() =>
      expect(document.querySelector('.oge-kanban-editor-form')).toBeNull(),
    );
  });

  it('a derived column survives its last card leaving it', async () => {
    const { ref, root } = setup({ columns: undefined });
    await flush();
    act(() => ref.current?.moveCard(3, 'todo'));
    await flush();
    expect(
      Array.from(root.querySelectorAll('.oge-kanban-column-title')).map(
        (el) => el.textContent,
      ),
    ).toEqual(['todo', 'doing']);
  });

  it('the "+ Add column" composer creates a runtime column through onColumnAdding', async () => {
    const adding: OgeKanbanColumnAddingEvent[] = [];
    const added: unknown[] = [];
    const { root } = setup({
      allowColumnAdding: true,
      onColumnAdding: (event) => adding.push(event),
      onColumnAdded: (event) => added.push(event),
    });
    expect(root.querySelector('.oge-kanban-cell-ghost')).not.toBeNull();
    fireEvent.click(root.querySelector('.oge-kanban-add-column') as Element);
    await flush();
    const input = root.querySelector(
      '.oge-kanban-add-column-input',
    ) as HTMLInputElement;
    expect(document.activeElement).toBe(input);
    fireEvent.change(input, { target: { value: 'QA' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(adding[0].column).toEqual({ key: 'QA', title: 'QA' });
    expect(added).toHaveLength(1);
    expect(
      Array.from(root.querySelectorAll('.oge-kanban-column-title')).map(
        (el) => el.textContent,
      ),
    ).toEqual(['todo', 'doing', 'done', 'QA']);
    expect(root.querySelector('.oge-kanban-add-column-input')).toBeNull();
  });

  it("cardColorMode 'surface' tints the card instead of the stripe", () => {
    const { root } = setup({
      dataSource: [
        { id: 1, status: 'todo', title: 'One', color: '#f00' } as Task,
      ],
      cardColorMode: 'surface',
    });
    const card = root.querySelector<HTMLElement>('.oge-kanban-card');
    expect(card?.classList.contains('oge-kanban-card-tinted')).toBe(true);
    expect(card?.style.getPropertyValue('--oge-kanban-card-tint')).toBe('#f00');
    expect(root.querySelector('.oge-kanban-card-stripe')).toBeNull();
  });

  it('saving the dialog updates the card through the update pipeline', async () => {
    const updated: unknown[] = [];
    const { cards, titlesIn } = setup({
      onCardUpdated: (event) => updated.push(event.newData),
    });
    fireEvent.keyDown(cards()[0], { key: 'Enter' });
    await flush();
    const title = document.querySelector<HTMLInputElement>(
      '.oge-kanban-editor-form input',
    ) as HTMLInputElement;
    expect(title.value).toBe('One');
    fireEvent.change(title, { target: { value: 'One edited' } });
    const save = document.querySelector(
      '.oge-kanban-editor-footer .oge-kanban-btn-primary',
    ) as HTMLElement;
    fireEvent.click(save);
    await flush();
    expect(updated[0]).toMatchObject({ id: 1, title: 'One edited' });
    expect(titlesIn('todo')).toEqual(['One edited', 'Two']);
  });

  it('a new card from the toolbar lands through onCardAdding with a session key', async () => {
    const addedCards: unknown[] = [];
    const { root, titlesIn } = setup({
      onCardAdded: (event) => addedCards.push(event.card),
    });
    fireEvent.click(root.querySelector('.oge-kanban-btn-add') as Element);
    await flush();
    const title = document.querySelector(
      '.oge-kanban-editor-form input',
    ) as HTMLInputElement;
    fireEvent.change(title, { target: { value: 'Fresh' } });
    fireEvent.click(
      document.querySelector(
        '.oge-kanban-editor-footer .oge-kanban-btn-primary',
      ) as Element,
    );
    await flush();
    expect(addedCards[0]).toMatchObject({
      id: 'oge-card-1',
      title: 'Fresh',
      status: 'todo',
    });
    expect(titlesIn('todo')).toEqual(['One', 'Two', 'Fresh']);
    expect(root.querySelector('.oge-kanban-live')?.textContent).toBe(
      'Fresh created',
    );
  });

  it('the handle adds, updates and deletes programmatically', () => {
    const { ref, titlesIn } = setup();
    act(() => ref.current?.addCard({ id: 9, status: 'done', title: 'Nine' }));
    expect(titlesIn('done')).toEqual(['Nine']);
    act(() =>
      ref.current?.updateCard(TASKS[1], { ...TASKS[1], title: 'Two!' }),
    );
    expect(titlesIn('todo')).toEqual(['One', 'Two!']);
    act(() => ref.current?.deleteCard(TASKS[0]));
    expect(titlesIn('todo')).toEqual(['Two!']);
    act(() => ref.current?.collapseAllColumns());
    act(() => ref.current?.expandAllColumns());
    expect(titlesIn('done')).toEqual(['Nine']);
  });

  it('the data array is never mutated', () => {
    const data = TASKS.map((task) => ({ ...task }));
    const snapshot = JSON.stringify(data);
    const { ref } = setup({ dataSource: data });
    act(() => ref.current?.moveCard(1, 'done'));
    act(() => ref.current?.deleteCard(data[1]));
    expect(JSON.stringify(data)).toBe(snapshot);
  });
});
