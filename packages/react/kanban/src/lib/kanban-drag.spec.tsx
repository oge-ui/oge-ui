import { act, fireEvent, render } from '@testing-library/react';
import type {
  OgeKanbanCardMovedEvent,
  OgeKanbanColumnReorderedEvent,
} from '@oge-ui/kanban-engine';
import { OgeKanban } from './kanban';
import type { OgeKanbanProps } from './kanban-types';

interface Task {
  id: number;
  status: string;
  title: string;
}

const TASKS: Task[] = [
  { id: 1, status: 'todo', title: 'One' },
  { id: 2, status: 'todo', title: 'Two' },
  { id: 3, status: 'doing', title: 'Three' },
];

function pointer(type: string, init: MouseEventInit): PointerEvent {
  // jsdom has no PointerEvent constructor in some versions — MouseEvent works
  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    ...init,
  }) as unknown as PointerEvent;
}

function pointerDown(el: HTMLElement, x: number, y: number): void {
  act(() => {
    el.dispatchEvent(
      pointer('pointerdown', { button: 0, clientX: x, clientY: y }),
    );
  });
}

function pointerMove(x: number, y: number): void {
  act(() => {
    document.dispatchEvent(pointer('pointermove', { clientX: x, clientY: y }));
  });
}

function pointerUp(): void {
  act(() => {
    document.dispatchEvent(pointer('pointerup', {}));
  });
}

function setup(props: Partial<OgeKanbanProps<Task>> = {}) {
  const moved: OgeKanbanCardMovedEvent<Task>[] = [];
  const reordered: OgeKanbanColumnReorderedEvent[] = [];
  const utils = render(
    <OgeKanban<Task>
      dataSource={TASKS}
      columns={[{ key: 'todo' }, { key: 'doing' }, { key: 'done' }]}
      virtualScrolling={false}
      allowColumnReordering
      keyExpr="id"
      columnExpr="status"
      titleExpr="title"
      onCardMoved={(event) => moved.push(event)}
      onColumnReordered={(event) => reordered.push(event)}
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
  return { root, cards, titlesIn, moved, reordered };
}

/**
 * jsdom reports zero-size rects, so cross-cell hit-testing cannot run here
 * (the e2e suite drives real drags; the engine specs cover the geometry).
 * These specs cover the gesture wiring: threshold, drag state, Escape
 * restore, keyboard moves, announcements — the same set as the Angular specs.
 */
describe('<OgeKanban> drag gesture wiring', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'requestAnimationFrame',
      (cb: FrameRequestCallback) =>
        setTimeout(() => cb(performance.now()), 0) as unknown as number,
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('a plain click never starts a drag (3px threshold)', () => {
    const { root, cards, moved } = setup();
    pointerDown(cards()[0], 10, 10);
    pointerMove(11, 11);
    expect(root.querySelector('.oge-kanban-drag-preview')).toBeNull();
    pointerUp();
    expect(moved).toHaveLength(0);
  });

  it('crossing the threshold lifts the card into a floating preview', () => {
    const { root, cards } = setup();
    pointerDown(cards()[0], 10, 10);
    pointerMove(40, 40);
    const preview = root.querySelector<HTMLElement>('.oge-kanban-drag-preview');
    expect(preview).not.toBeNull();
    expect(preview?.textContent).toContain('One');
    expect(root.querySelector('.oge-kanban')?.classList).toContain(
      'oge-kanban-dragging',
    );
    // the origin card left the flow
    expect(cards()[0].classList.contains('oge-kanban-card-hidden')).toBe(true);
    expect(root.querySelector('.oge-kanban-placeholder')).not.toBeNull();
    pointerUp();
    expect(root.querySelector('.oge-kanban-drag-preview')).toBeNull();
  });

  it('mid-drag Escape restores everything and announces the cancel', () => {
    const { root, cards, titlesIn, moved } = setup();
    pointerDown(cards()[0], 10, 10);
    pointerMove(60, 60);
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }),
      );
    });
    expect(root.querySelector('.oge-kanban-drag-preview')).toBeNull();
    expect(titlesIn('todo')).toEqual(['One', 'Two']);
    expect(moved).toHaveLength(0);
    expect(root.querySelector('.oge-kanban-live')?.textContent).toBe(
      'Cancelled',
    );
    // and the gesture is fully finished: a later pointerup commits nothing
    pointerUp();
    expect(moved).toHaveLength(0);
  });

  it('Ctrl+ArrowRight moves the focused card to the next column and announces', () => {
    const { root, cards, titlesIn, moved } = setup();
    fireEvent.keyDown(cards()[0], { key: 'ArrowRight', ctrlKey: true });
    expect(titlesIn('doing')).toEqual(['One', 'Three']);
    expect(moved).toHaveLength(1);
    const live = root.querySelector('.oge-kanban-live')?.textContent ?? '';
    expect(live).toContain('One moved to doing');
    expect(live).toContain('position 1 of 2');
  });

  it('Ctrl+ArrowDown reorders within the column', () => {
    const { cards, titlesIn } = setup();
    fireEvent.keyDown(cards()[0], { key: 'ArrowDown', ctrlKey: true });
    expect(titlesIn('todo')).toEqual(['Two', 'One']);
  });

  it('Ctrl+Arrow at an edge is a no-op', () => {
    const { cards, titlesIn, moved } = setup();
    fireEvent.keyDown(cards()[0], { key: 'ArrowUp', ctrlKey: true });
    expect(titlesIn('todo')).toEqual(['One', 'Two']);
    expect(moved).toHaveLength(0);
  });

  it('readOnly disables card dragging', () => {
    const { root, cards } = setup({ readOnly: true });
    pointerDown(cards()[0], 10, 10);
    pointerMove(60, 60);
    expect(root.querySelector('.oge-kanban-drag-preview')).toBeNull();
    pointerUp();
  });

  it('column header drag previews live and commits through onColumnReordered', () => {
    const { root, reordered } = setup();
    const headers = Array.from(
      root.querySelectorAll<HTMLElement>('.oge-kanban-column-header'),
    );
    expect(
      headers[0].classList.contains('oge-kanban-column-header-draggable'),
    ).toBe(true);
    pointerDown(headers[0], 10, 10);
    expect(
      root
        .querySelector('.oge-kanban-column-header')
        ?.classList.contains('oge-kanban-column-header-dragging'),
    ).toBe(true);
    // jsdom centers are all 0, so any pointer right of them crosses every
    // neighbour: the dragged column previews at the end, live
    pointerMove(500, 10);
    expect(
      Array.from(root.querySelectorAll('.oge-kanban-column-title')).map(
        (el) => el.textContent,
      ),
    ).toEqual(['doing', 'done', 'todo']);
    pointerUp();
    expect(reordered).toEqual([
      {
        column: { key: 'todo' },
        fromIndex: 0,
        toIndex: 2,
        columnOrder: ['doing', 'done', 'todo'],
      },
    ]);
    expect(root.querySelector('.oge-kanban-live')?.textContent).toBe(
      'todo column moved to position 3',
    );
    expect(root.querySelector('.oge-kanban-column-header-dragging')).toBeNull();
  });
});

describe('<OgeKanban> virtualization', () => {
  it('renders a bounded card window per column, not the whole board', () => {
    const many: Task[] = Array.from({ length: 500 }, (_, index) => ({
      id: index,
      status: index % 2 === 0 ? 'todo' : 'doing',
      title: `Card ${index}`,
    }));
    const { root } = setup({ dataSource: many, virtualScrolling: true });
    const rendered = root.querySelectorAll('.oge-kanban-card').length;
    expect(rendered).toBeGreaterThan(0);
    expect(rendered).toBeLessThan(40);
    const inner = root.querySelector<HTMLElement>('.oge-kanban-cards-inner');
    expect(inner?.style.height).toBe(`${250 * 120 - 8}px`);
  });

  it('scrolling a cell moves its window without touching other columns', () => {
    const many: Task[] = Array.from({ length: 200 }, (_, index) => ({
      id: index,
      status: index < 100 ? 'todo' : 'doing',
      title: `Card ${index}`,
    }));
    const { root } = setup({ dataSource: many, virtualScrolling: true });
    const cell = root.querySelector<HTMLElement>(
      '.oge-kanban-cards[data-col="todo"]',
    ) as HTMLElement;
    Object.defineProperty(cell, 'clientHeight', { value: 480 });
    cell.scrollTop = 120 * 50;
    fireEvent.scroll(cell);
    const todoTitles = Array.from(
      cell.querySelectorAll('.oge-kanban-card-title'),
    ).map((el) => el.textContent);
    expect(todoTitles).toContain('Card 50');
    expect(todoTitles).not.toContain('Card 0');
    const doing = root.querySelector('.oge-kanban-cards[data-col="doing"]');
    expect(doing?.querySelector('.oge-kanban-card-title')?.textContent).toBe(
      'Card 100',
    );
  });
});
