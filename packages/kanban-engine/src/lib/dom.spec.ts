import {
  groupBoard,
  normalizeCards,
  resolveKanbanFields,
  type KanbanColumnDef,
} from './board-model';
import {
  focusFirstKanbanMenuItem,
  focusKanbanCard,
  kanbanAutoScrollStep,
  kanbanCssEscape,
  kanbanHeaderCenters,
  measureKanbanCells,
  measureKanbanDragGeometry,
  resolveKanbanDragTarget,
  scrollKanbanCell,
  startKanbanFrameLoop,
  stepKanbanMenuFocus,
  watchKanbanDirection,
} from './dom';
import type { KanbanDragState } from './interaction';

interface Task {
  id: number;
  status: string;
  title: string;
}

function rect(left: number, top: number, width: number, height: number) {
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

function cell(lane: string, col: string, left: number): HTMLElement {
  const el = document.createElement('div');
  el.className = 'oge-kanban-cards';
  el.setAttribute('data-lane', lane);
  el.setAttribute('data-col', col);
  el.getBoundingClientRect = () => rect(left, 100, 200, 400);
  Object.defineProperty(el, 'clientHeight', { value: 400, configurable: true });
  const inner = document.createElement('div');
  inner.className = 'oge-kanban-cards-inner';
  inner.getBoundingClientRect = () => rect(left, 110, 200, 300);
  el.appendChild(inner);
  return el;
}

function host(): HTMLElement {
  const root = document.createElement('div');
  const body = document.createElement('div');
  body.className = 'oge-kanban-body';
  body.getBoundingClientRect = () => rect(0, 0, 1000, 600);
  body.appendChild(cell('', 'todo', 0));
  body.appendChild(cell('', 'doing', 220));
  root.appendChild(body);
  document.body.appendChild(root);
  return root;
}

const fields = resolveKanbanFields<Task>({
  keyExpr: 'id',
  columnExpr: 'status',
  titleExpr: 'title',
  descriptionExpr: 'description',
  colorExpr: 'color',
  orderExpr: undefined,
  swimlaneExpr: undefined,
  tagsExpr: undefined,
  assigneeExpr: undefined,
  dueDateExpr: undefined,
  priorityExpr: undefined,
});
const columns: KanbanColumnDef[] = [{ key: 'todo' }, { key: 'doing' }];
const lanes = groupBoard(
  normalizeCards<Task>(
    [
      { id: 1, status: 'todo', title: 'A' },
      { id: 2, status: 'doing', title: 'B' },
    ],
    fields,
  ),
  columns,
  false,
);

afterEach(() => {
  document.body.innerHTML = '';
});

describe('kanban DOM readers', () => {
  it('measures cells and reports only real changes', () => {
    const root = host();
    const first = measureKanbanCells(root, new Map());
    expect(first?.get(' todo')).toEqual({ top: 0, height: 400 });
    expect(measureKanbanCells(root, first as Map<string, never>)).toBeNull();
  });

  it('resolves pointer positions to legal drop targets', () => {
    const root = host();
    const geometry = measureKanbanDragGeometry(root);
    expect(geometry.cells.map((c) => [c.swimlane, c.column])).toEqual([
      [null, 'todo'],
      [null, 'doing'],
    ]);
    const origin = {
      card: lanes[0].columns[0].cards[0],
      fromLane: null,
      fromIndex: 0,
    };
    expect(
      resolveKanbanDragTarget(geometry, 300, 200, origin, lanes, columns, 120),
    ).toEqual({ lane: null, column: 'doing', index: 1 });
    expect(
      resolveKanbanDragTarget(geometry, 210, 200, origin, lanes, columns, 120),
    ).toBeNull();
    const refusing = [{ key: 'todo' }, { key: 'doing', allowDrop: false }];
    expect(
      resolveKanbanDragTarget(geometry, 300, 200, origin, lanes, refusing, 120),
    ).toBeNull();
  });

  it('auto-scrolls only inside the edge bands', () => {
    const root = host();
    const geometry = measureKanbanDragGeometry(root);
    const drag = {
      x: 500,
      y: 300,
      target: { lane: null, column: 'todo', index: 0 },
    } as KanbanDragState<Task>;
    expect(kanbanAutoScrollStep(geometry, drag)).toBe(false);
    // inside the right edge band the board scrolls horizontally
    expect(kanbanAutoScrollStep(geometry, { ...drag, x: 995 })).toBe(true);
    expect(geometry.body?.scrollLeft).toBeGreaterThan(0);
  });

  it('reads header centers', () => {
    const root = document.createElement('div');
    const row = document.createElement('div');
    row.className = 'oge-kanban-header-row';
    for (const left of [0, 100]) {
      const header = document.createElement('div');
      header.getBoundingClientRect = () => rect(left, 0, 100, 40);
      row.appendChild(header);
    }
    root.appendChild(row);
    expect(kanbanHeaderCenters(root)).toEqual([50, 150]);
  });

  it('focuses cards and walks the menu', () => {
    const root = host();
    const card = document.createElement('div');
    card.className = 'oge-kanban-card';
    card.tabIndex = 0;
    card.setAttribute('data-key', 'a"b');
    root.appendChild(card);
    focusKanbanCard(root, 'a"b');
    expect(document.activeElement).toBe(card);

    const items = ['one', 'two'].map((label) => {
      const item = document.createElement('button');
      item.className = 'oge-kanban-menu-item';
      item.textContent = label;
      root.appendChild(item);
      return item;
    });
    focusFirstKanbanMenuItem(root);
    expect(document.activeElement).toBe(items[0]);
    stepKanbanMenuFocus(root, 'ArrowDown');
    expect(document.activeElement).toBe(items[1]);
    stepKanbanMenuFocus(root, 'ArrowDown');
    expect(document.activeElement).toBe(items[0]);
    stepKanbanMenuFocus(root, 'ArrowUp');
    expect(document.activeElement).toBe(items[1]);
  });

  it('writes a cell scrollTop and escapes selectors', () => {
    const root = host();
    scrollKanbanCell(root, null, 'doing', 40);
    const doing = root.querySelector<HTMLElement>('[data-col="doing"]');
    expect(doing?.scrollTop).toBe(40);
    expect(kanbanCssEscape('a"b')).not.toBe('a"b');
  });

  it('runs a frame loop until the step declines', async () => {
    let frames = 0;
    await new Promise<void>((resolve) => {
      startKanbanFrameLoop(() => {
        frames++;
        if (frames === 3) {
          resolve();
          return false;
        }
        return true;
      });
    });
    expect(frames).toBe(3);
    const stop = startKanbanFrameLoop(() => true);
    stop();
  });
});

describe('watchKanbanDirection', () => {
  it('reports the page direction now and after a dir change', async () => {
    const wrap = document.createElement('div');
    const host = document.createElement('div');
    wrap.append(host);
    document.body.append(wrap);
    const seen: boolean[] = [];
    const stop = watchKanbanDirection(host, (rtl) => seen.push(rtl));
    expect(seen).toEqual([false]);
    wrap.setAttribute('dir', 'rtl');
    await Promise.resolve();
    expect(seen).toEqual([false, true]);
    stop();
    wrap.removeAttribute('dir');
    await Promise.resolve();
    expect(seen).toEqual([false, true]);
    wrap.remove();
  });
});
