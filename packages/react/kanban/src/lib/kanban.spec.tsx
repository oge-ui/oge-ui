import { StrictMode, useState } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { OGE_DEFAULT_KANBAN_MESSAGES } from '@oge-ui/kanban-engine';
import { OgeKanban } from './kanban';
import { OgeKanbanConfigProvider } from './kanban-config';
import type { OgeKanbanProps } from './kanban-types';

interface Task {
  id: number;
  status: string;
  title: string;
  description?: string;
  lane?: string;
  tags?: string[];
  owner?: string | string[];
  due?: Date;
  priority?: string;
}

const TASKS: Task[] = [
  {
    id: 1,
    status: 'todo',
    title: 'Design tokens',
    tags: ['design'],
    priority: 'high',
  },
  { id: 2, status: 'todo', title: 'Write specs', owner: 'Ada Lovelace' },
  {
    id: 3,
    status: 'doing',
    title: 'Build board',
    description: 'Columns and cards',
    due: new Date(2000, 0, 10),
  },
  { id: 4, status: 'done', title: 'Scaffold' },
];

const COLUMNS = [
  { key: 'todo', title: 'To do', wipLimit: 1 },
  { key: 'doing', title: 'In progress' },
  { key: 'done', title: 'Done' },
];

function Board(props: Partial<OgeKanbanProps<Task>>) {
  return (
    <OgeKanban<Task>
      dataSource={TASKS}
      columns={COLUMNS}
      virtualScrolling={false}
      keyExpr="id"
      columnExpr="status"
      titleExpr="title"
      tagsExpr="tags"
      assigneeExpr="owner"
      dueDateExpr="due"
      priorityExpr="priority"
      locale="en-US"
      style={{ height: 480, display: 'block' }}
      {...props}
    />
  );
}

const q = <E extends Element = HTMLElement>(root: ParentNode, sel: string) =>
  root.querySelector<E>(sel);
const qa = <E extends Element = HTMLElement>(root: ParentNode, sel: string) =>
  Array.from(root.querySelectorAll<E>(sel));

function titlesIn(root: ParentNode, column: string): string[] {
  return qa(
    root,
    `.oge-kanban-cards[data-col="${column}"] .oge-kanban-card-title`,
  ).map((el) => el.textContent ?? '');
}

describe('<OgeKanban>', () => {
  it('renders declared columns with counts and cards', () => {
    const { container } = render(<Board />);
    const headers = qa(container, '.oge-kanban-column-header');
    expect(headers).toHaveLength(3);
    expect(headers[0].textContent).toContain('To do');
    expect(qa(container, '.oge-kanban-card')).toHaveLength(4);
    const host = q(container, '.oge-kanban');
    expect(host?.getAttribute('role')).toBe('group');
    expect(host?.getAttribute('aria-label')).toBe('Kanban board');
    expect(host?.style.getPropertyValue('--oge-kanban-slot')).toBe('120px');
  });

  it('columns are labeled listboxes, cards are options with one tab stop per cell', () => {
    const { container } = render(<Board />);
    const listbox = q(container, '.oge-kanban-cards');
    expect(listbox?.getAttribute('role')).toBe('listbox');
    expect(listbox?.getAttribute('aria-label')).toBe('To do, 2 of 1 cards');
    const cards = qa(container, '.oge-kanban-card');
    expect(cards[0].getAttribute('role')).toBe('option');
    expect(cards[0].getAttribute('aria-label')).toBe('Design tokens, in To do');
    // first paint already carries the roving stops (derived, not an effect)
    expect(cards.map((card) => card.tabIndex)).toEqual([0, -1, 0, 0]);
    expect(cards[0].getAttribute('aria-keyshortcuts')).toBe(
      'Enter Delete Control+ArrowLeft Control+ArrowRight',
    );
  });

  it('a WIP limit overflow turns the count badge to danger', () => {
    const { container } = render(<Board />);
    const badge = q(container, '.oge-kanban-column-header .oge-kanban-count');
    expect(badge?.classList.contains('oge-kanban-count-danger')).toBe(true);
    expect(badge?.textContent).toContain('2');
    expect(badge?.textContent).toContain('/1');
    expect(badge?.getAttribute('title')).toBe('2 cards exceed the limit of 1');
  });

  it('renders card anatomy: tags, avatars, due badge, priority', () => {
    const { container } = render(<Board />);
    expect(q(container, '.oge-kanban-tag')?.textContent).toBe('design');
    expect(q(container, '.oge-kanban-avatar')?.textContent).toBe('AL');
    const due = q(container, '.oge-kanban-due');
    expect(due?.classList.contains('oge-kanban-due-overdue')).toBe(true);
    expect(due?.getAttribute('title')).toContain('Overdue since');
    expect(
      q(container, '.oge-kanban-priority')?.getAttribute('data-priority'),
    ).toBe('high');
    expect(q(container, '.oge-kanban-card-desc')?.textContent).toBe(
      'Columns and cards',
    );
  });

  it('click selects the card (controlled selectedCardKey pair)', () => {
    const changes: unknown[] = [];
    function Host() {
      const [selected, setSelected] = useState<unknown>(null);
      return (
        <Board
          selectedCardKey={selected}
          onSelectedCardKeyChange={(key) => {
            changes.push(key);
            setSelected(key);
          }}
        />
      );
    }
    const { container } = render(<Host />);
    fireEvent.click(qa(container, '.oge-kanban-card')[1]);
    expect(changes).toEqual([2]);
    const card = qa(container, '.oge-kanban-card')[1];
    expect(card.getAttribute('aria-selected')).toBe('true');
    expect(card.classList.contains('oge-kanban-card-selected')).toBe(true);
  });

  it('collapsing a column renders the slim pill and hides its cards', () => {
    const { container } = render(<Board />);
    fireEvent.click(qa(container, '.oge-kanban-column-collapse')[0]);
    const pill = q(container, '.oge-kanban-column-collapsed');
    expect(pill?.getAttribute('aria-label')).toBe('Expand column: To do');
    expect(titlesIn(container, 'todo')).toEqual([]);
    expect(
      q(container, '.oge-kanban-header-row')?.style.gridTemplateColumns,
    ).toBe('44px 300px 300px');
    fireEvent.click(pill as HTMLElement);
    expect(titlesIn(container, 'todo')).toEqual([
      'Design tokens',
      'Write specs',
    ]);
  });

  it('honours defaultCollapsedColumns at mount (initial-value parity)', () => {
    const { container } = render(<Board defaultCollapsedColumns={['done']} />);
    expect(qa(container, '.oge-kanban-column-collapsed')).toHaveLength(1);
    expect(titlesIn(container, 'done')).toEqual([]);
  });

  it('derives columns from the data when none are declared', async () => {
    const { container } = render(<Board columns={undefined} />);
    // the derived set is remembered in a microtask (outside the render)
    await act(async () => {
      await Promise.resolve();
    });
    expect(
      qa(container, '.oge-kanban-column-title').map((el) => el.textContent),
    ).toEqual(['todo', 'doing', 'done']);
  });

  it('swimlanes group cards into labeled, collapsible lanes', () => {
    const data: Task[] = [
      { id: 1, status: 'todo', title: 'A', lane: 'Team A' },
      { id: 2, status: 'doing', title: 'B', lane: 'Team B' },
    ];
    const { container } = render(
      <Board dataSource={data} swimlaneExpr="lane" />,
    );
    const lanes = qa(container, '.oge-kanban-lane-header');
    expect(lanes).toHaveLength(2);
    expect(lanes[0].textContent).toContain('Team A');
    expect(lanes[0].getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(lanes[0]);
    expect(lanes[0].getAttribute('aria-expanded')).toBe('false');
    expect(qa(container, '.oge-kanban-lane-cells')).toHaveLength(1);
  });

  it('arrow keys rove between cards and columns', () => {
    const { container } = render(<Board />);
    const first = qa(container, '.oge-kanban-card')[0];
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(document.activeElement?.textContent).toContain('Write specs');
    fireEvent.keyDown(document.activeElement as HTMLElement, {
      key: 'ArrowRight',
    });
    expect(document.activeElement?.textContent).toContain('Build board');
  });

  it('an empty data source renders the friendly empty state', () => {
    const { container } = render(<Board dataSource={[]} />);
    expect(q(container, '.oge-kanban-empty-title')?.textContent).toBe(
      'No cards yet',
    );
  });

  it('replaces the card body and the column header with render props', () => {
    const { container } = render(
      <Board
        renderCard={({ card, column }) => (
          <span className="custom">
            {card.title} @ {column.key}
          </span>
        )}
        renderColumnHeader={({ column, count, wip }) => (
          <span className="custom-header">
            {column.key}:{count}:{String(wip.exceeded)}
          </span>
        )}
      />,
    );
    expect(q(container, '.custom')?.textContent).toBe('Design tokens @ todo');
    expect(q(container, '.custom-header')?.textContent).toBe('todo:2:true');
    // the collapse affordance stays
    expect(qa(container, '.oge-kanban-column-collapse')).toHaveLength(3);
  });

  it('config provider: messages, locale and cardHeight, re-resolved on change', () => {
    function Host() {
      const [label, setLabel] = useState('Tafel');
      return (
        <>
          <button type="button" onClick={() => setLabel('Pano')}>
            switch
          </button>
          <OgeKanbanConfigProvider
            config={{
              cardHeight: 90,
              messages: {
                board: {
                  ...OGE_DEFAULT_KANBAN_MESSAGES.board,
                  boardLabel: label,
                },
              },
            }}
          >
            <Board dataSource={[]} />
          </OgeKanbanConfigProvider>
        </>
      );
    }
    const { container, getByText } = render(<Host />);
    const host = q(container, '.oge-kanban');
    expect(host?.getAttribute('aria-label')).toBe('Tafel');
    expect(host?.style.getPropertyValue('--oge-kanban-slot')).toBe('98px');
    fireEvent.click(getByText('switch'));
    expect(q(container, '.oge-kanban')?.getAttribute('aria-label')).toBe(
      'Pano',
    );
  });

  it('re-seeds the working set when a new dataSource array arrives', () => {
    const { container, rerender } = render(<Board />);
    expect(qa(container, '.oge-kanban-card')).toHaveLength(4);
    rerender(<Board dataSource={TASKS.slice(0, 1)} />);
    expect(qa(container, '.oge-kanban-card')).toHaveLength(1);
  });

  it('works under StrictMode (the board survives the remount)', async () => {
    const moved: unknown[] = [];
    const { container } = render(
      <StrictMode>
        <Board onCardMoved={(event) => moved.push(event)} />
      </StrictMode>,
    );
    const first = qa(container, '.oge-kanban-card')[0];
    fireEvent.keyDown(first, { key: 'ArrowRight', ctrlKey: true });
    await act(async () => {
      await Promise.resolve();
    });
    expect(moved).toHaveLength(1);
    expect(titlesIn(container, 'doing')).toEqual([
      'Design tokens',
      'Build board',
    ]);
    // the remounted board still measures and focuses after the move
    expect(document.activeElement?.textContent).toContain('Design tokens');
  });
});
