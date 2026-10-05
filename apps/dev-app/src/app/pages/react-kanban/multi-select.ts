import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useRef, useState, type ReactNode } from 'react';
import {
  OgeKanban,
  type OgeKanbanCardTransferredEvent,
  type OgeKanbanHandle,
} from '@oge-ui/react-kanban';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { KANBAN_MULTI_SELECT_DEMOS } from './multi-select-snippets';

/** TOC of the React view — the same sections as the Angular page. */
export const REACT_KANBAN_MULTI_SELECT_SECTIONS = [
  'Multi-select & undo',
  'Cross-board drag',
  'Swimlane WIP limits',
  'Quick add, inline titles & checklists',
] as const;

type Row = Record<string, unknown>;

interface Task {
  id: number;
  status: string;
  title: string;
}

const MULTI_TASKS: Row[] = [
  { id: 1, status: 'todo', title: 'Ctrl-click me' },
  { id: 2, status: 'todo', title: '…and me' },
  { id: 3, status: 'todo', title: 'Shift-click for a range' },
  { id: 4, status: 'doing', title: 'Drag a selected card' },
  { id: 5, status: 'done', title: 'Ctrl+Z undoes the last step' },
];

const LANE_COLUMNS = [
  { key: 'todo', title: 'To do' },
  { key: 'doing', title: 'In progress', swimlaneWipLimit: 1 },
  { key: 'done', title: 'Done' },
];

const LANE_TASKS: Row[] = [
  { id: 1, team: 'Web', status: 'doing', title: 'Token migration' },
  { id: 2, team: 'Web', status: 'todo', title: 'Navigation audit' },
  { id: 3, team: 'Mobile', status: 'doing', title: 'Push opt-in' },
  {
    id: 4,
    team: 'Mobile',
    status: 'doing',
    title: 'Biometric login — over the cell limit',
  },
  {
    id: 5,
    team: 'Mobile',
    status: 'todo',
    title: 'Offline mode — over the lane limit',
  },
];

const CHECKLIST_TASKS: Row[] = [
  {
    id: 1,
    status: 'doing',
    title: 'Payments API',
    todo: [
      { text: 'Design endpoints', done: true },
      { text: 'Write tests', done: false },
      { text: 'Roll out', done: false },
    ],
  },
  { id: 2, status: 'todo', title: 'Press F2 to rename me' },
];

function MultiSelectDemo(): ReactNode {
  const [selected, setSelected] = useState<readonly unknown[]>([]);
  return createElement(
    'div',
    null,
    createElement(OgeKanban<Row>, {
      dataSource: MULTI_TASKS,
      keyExpr: 'id',
      columnExpr: 'status',
      titleExpr: 'title',
      selectedCardKeys: selected,
      onSelectedCardKeysChange: setSelected,
      style: { height: 420 },
    }),
    createElement(
      'p',
      { className: 'mt-2 text-sm text-slate-500' },
      `Selected: ${selected.length}`,
    ),
  );
}

function CrossBoardDemo(): ReactNode {
  const [backlog, setBacklog] = useState<Task[]>([
    { id: 1, status: 'todo', title: 'Dark mode' },
    { id: 2, status: 'todo', title: 'CSV import' },
    { id: 3, status: 'todo', title: 'Audit log' },
  ]);
  const [sprint, setSprint] = useState<Task[]>([
    { id: 10, status: 'todo', title: 'Login rate limits' },
  ]);
  const onTransferred = (event: OgeKanbanCardTransferredEvent<Task>) => {
    const moved = new Set(event.sourceCards.map((task) => task.id));
    const [setFrom, setTo] =
      event.fromBoard === 'Backlog'
        ? [setBacklog, setSprint]
        : [setSprint, setBacklog];
    setFrom((list) => list.filter((task) => !moved.has(task.id)));
    setTo((list) => [
      ...list.filter((task) => !moved.has(task.id)),
      ...event.cards,
    ]);
  };
  return createElement(
    'div',
    { className: 'grid gap-3 md:grid-cols-2' },
    createElement(OgeKanban<Task>, {
      dataSource: backlog,
      keyExpr: 'id',
      columnExpr: 'status',
      titleExpr: 'title',
      dragGroup: 'planning-react',
      boardId: 'Backlog',
      columns: [{ key: 'todo', title: 'Ideas' }],
      onCardTransferred: onTransferred,
      style: { height: 360 },
    }),
    createElement(OgeKanban<Task>, {
      dataSource: sprint,
      keyExpr: 'id',
      columnExpr: 'status',
      titleExpr: 'title',
      dragGroup: 'planning-react',
      boardId: 'Sprint',
      columns: [
        { key: 'todo', title: 'To do' },
        { key: 'doing', title: 'In progress' },
      ],
      onCardTransferred: onTransferred,
      style: { height: 360 },
    }),
  );
}

function SwimlaneWipDemo(): ReactNode {
  return createElement(OgeKanban<Row>, {
    dataSource: LANE_TASKS,
    keyExpr: 'id',
    columnExpr: 'status',
    titleExpr: 'title',
    swimlaneExpr: 'team',
    columns: LANE_COLUMNS,
    swimlaneWipLimits: { Mobile: 2 },
    style: { height: 520 },
  });
}

function QuickAddDemo(): ReactNode {
  const board = useRef<OgeKanbanHandle<Row>>(null);
  return createElement(
    'div',
    null,
    createElement(OgeKanban<Row>, {
      ref: board,
      dataSource: CHECKLIST_TASKS,
      keyExpr: 'id',
      columnExpr: 'status',
      titleExpr: 'title',
      checklistExpr: 'todo',
      quickAdd: true,
      inlineTitleEditing: true,
      style: { height: 420 },
    }),
    createElement(
      'button',
      {
        type: 'button',
        className: 'mt-2 rounded border px-3 py-1 text-sm',
        onClick: () => board.current?.toggleChecklistItem(1, 1),
      },
      'Tick “Write tests” on the first card',
    ),
  );
}

@Component({
  selector: 'app-react-kanban-multi-select-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/kanban/src/styles.scss',
    '../../../../../../packages/react/overlay/src/styles.scss',
    '../../../../../../packages/react/forms/src/styles.scss',
    '../../../../../../packages/react/inputs/src/styles.scss',
  ],
  template: `
    <app-demo-card
      [chips]="['selectedCardKeys', 'Ctrl+A', 'Ctrl+Z']"
      heading="Multi-select &amp; undo"
      description="Ctrl/⌘-click toggles, Shift-click selects a range in the column, Ctrl+A on a card selects its column, Ctrl+Space toggles, Shift+↑/↓ extends and Escape collapses. Dragging a selected card carries the selection — the ghost shows the count — and Ctrl+←/→ and Delete act on all of it, each as one undoable step (Ctrl+Z / Ctrl+Y or the toolbar)."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="multi" />
    </app-demo-card>

    <app-demo-card
      [chips]="['dragGroup', 'onCardTransferring', 'Move to …']"
      heading="Cross-board drag"
      description="Boards sharing a <code>dragGroup</code> exchange cards: drag a card (or a selection) onto the other board, or use the card menu&#39;s <em>Move to …</em> entry — the keyboard and single-pointer twin. The target calls the cancelable <code>onCardTransferring</code>; both boards call <code>onCardTransferred</code>."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="crossBoard" />
    </app-demo-card>

    <app-demo-card
      [chips]="['swimlaneWipLimit', 'swimlaneWipLimits']"
      heading="Swimlane WIP limits"
      description="<code>swimlaneWipLimit</code> on a column caps it inside every lane (the cell badge turns danger on overflow); <code>swimlaneWipLimits</code> caps a lane&#39;s total, keyed by lane value."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="swimlaneWip" />
    </app-demo-card>

    <app-demo-card
      [chips]="['quickAdd', 'F2', 'checklistExpr']"
      heading="Quick add, inline titles &amp; checklists"
      description="<code>quickAdd</code> turns the column footer into an inline composer (Enter adds and stays open, Escape closes). <kbd>F2</kbd> on a card — or a double-click on its title with <code>inlineTitleEditing</code> — renames it in place. <code>checklistExpr</code> maps <code>{ text, done }</code> sub-tasks to a progress badge."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="quickAdd" />
    </app-demo-card>
  `,
})
export class ReactKanbanMultiSelectDemos {
  protected readonly demos = KANBAN_MULTI_SELECT_DEMOS;
  protected readonly multi = () => createElement(MultiSelectDemo);
  protected readonly crossBoard = () => createElement(CrossBoardDemo);
  protected readonly swimlaneWip = () => createElement(SwimlaneWipDemo);
  protected readonly quickAdd = () => createElement(QuickAddDemo);
}
