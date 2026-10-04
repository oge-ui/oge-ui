import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import {
  OgeKanban,
  type OgeKanbanCard,
  type OgeKanbanCardMovingEvent,
  type OgeKanbanEditDialogShowingEvent,
} from '@oge-ui/react-kanban';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { KANBAN_OVERVIEW_DEMOS } from './overview-snippets';

/**
 * TOC of the React view — the same nine sections as the Angular overview
 * (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_KANBAN_OVERVIEW_SECTIONS = [
  'Getting started',
  'Swimlanes',
  'WIP limits',
  'Drag & drop pipeline',
  'Keyboard moving & a11y',
  'Edit dialog & events',
  'Card template',
  'Configuration & i18n',
  'RTL',
] as const;

type Row = Record<string, unknown>;

const BASIC_COLUMNS = [
  { key: 'todo', title: 'To do', color: '#64748b' },
  { key: 'doing', title: 'In progress', color: '#2563eb', wipLimit: 3 },
  { key: 'review', title: 'Review', color: '#d97706' },
  { key: 'done', title: 'Done', color: '#16a34a' },
];

const BASIC_TASKS: Row[] = [
  {
    id: 1,
    status: 'doing',
    title: 'Checkout revamp',
    notes: 'New payment flow behind the feature flag',
    owner: 'Ada Lovelace',
    due: new Date(2026, 7, 21),
    priority: 'high',
    labels: ['feature'],
  },
  {
    id: 2,
    status: 'todo',
    title: 'Wallet UI polish',
    owner: ['Grace Hopper', 'Alan Turing'],
    priority: 'medium',
    labels: ['design'],
  },
  { id: 3, status: 'todo', title: 'Upgrade CI runners', priority: 'low' },
  {
    id: 4,
    status: 'review',
    title: 'Fix login crash',
    notes: 'Repro: expired refresh token',
    owner: 'Ada Lovelace',
    due: new Date(2026, 7, 5),
    priority: 'high',
    labels: ['bug'],
  },
  { id: 5, status: 'done', title: 'Q3 roadmap draft' },
];

const LANE_COLUMNS = [
  { key: 'todo', title: 'To do' },
  { key: 'doing', title: 'In progress' },
  { key: 'done', title: 'Done' },
];

const LANE_TASKS: Row[] = [
  { id: 1, team: 'Platform', status: 'doing', title: 'Sharding rollout' },
  { id: 2, team: 'Platform', status: 'todo', title: 'Postgres 18 upgrade' },
  { id: 3, team: 'Mobile', status: 'todo', title: 'Push notification opt-in' },
  { id: 4, team: 'Mobile', status: 'done', title: 'Biometric login' },
  { id: 5, team: 'Web', status: 'doing', title: 'Design token migration' },
];

const WIP_COLUMNS = [
  { key: 'todo', title: 'To do' },
  { key: 'doing', title: 'In progress', wipLimit: 2 },
  { key: 'done', title: 'Done' },
];

const WIP_TASKS: Row[] = [
  { id: 1, status: 'doing', title: 'Payments API' },
  { id: 2, status: 'doing', title: 'Search relevance' },
  { id: 3, status: 'doing', title: 'One too many — WIP exceeded' },
  { id: 4, status: 'todo', title: 'Docs sweep' },
  { id: 5, status: 'done', title: 'Login rate limits' },
];

const DRAG_TASKS: Row[] = [
  { id: 1, status: 'todo', title: 'Refactor auth', rank: 0 },
  { id: 2, status: 'todo', title: 'Ship dark mode', rank: 1 },
  { id: 3, status: 'doing', title: 'Bundle size audit', rank: 0 },
  { id: 4, status: 'done', title: 'This card is locked in', rank: 0 },
];

const KEYBOARD_TASKS: Row[] = [
  { id: 1, status: 'todo', title: 'Tab to the board, then arrow around' },
  { id: 2, status: 'todo', title: 'Ctrl+ArrowRight moves me' },
  { id: 3, status: 'doing', title: 'Enter opens my dialog' },
];

const DIALOG_TASKS: Row[] = [
  {
    id: 1,
    status: 'todo',
    title: 'Double-click me',
    notes: 'Custom form field below',
  },
  { id: 2, status: 'doing', title: 'Right-click me for the menu' },
];

const DEPLOYMENTS: Row[] = [
  {
    id: 1,
    stage: 'staging',
    service: 'api-gateway',
    version: 'v2.14.0',
    health: 98,
  },
  { id: 2, stage: 'staging', service: 'search', version: 'v1.9.2', health: 74 },
  {
    id: 3,
    stage: 'production',
    service: 'billing',
    version: 'v3.1.1',
    health: 100,
  },
];

const GERMAN_TASKS: Row[] = [
  {
    id: 1,
    status: 'Offen',
    title: 'Angebot schreiben',
    due: new Date(2026, 7, 14),
  },
  { id: 2, status: 'In Arbeit', title: 'Rechnung prüfen' },
  { id: 3, status: 'Fertig', title: 'Kickoff-Termin' },
];

function GettingStartedDemo(): ReactNode {
  return createElement(OgeKanban<Row>, {
    dataSource: BASIC_TASKS,
    keyExpr: 'id',
    columnExpr: 'status',
    titleExpr: 'title',
    descriptionExpr: 'notes',
    assigneeExpr: 'owner',
    dueDateExpr: 'due',
    priorityExpr: 'priority',
    tagsExpr: 'labels',
    columns: BASIC_COLUMNS,
    allowColumnAdding: true,
    style: { height: 520 },
  });
}

function SwimlanesDemo(): ReactNode {
  const [collapsedLanes, setCollapsedLanes] = useState<readonly string[]>([]);
  return createElement(OgeKanban<Row>, {
    dataSource: LANE_TASKS,
    keyExpr: 'id',
    columnExpr: 'status',
    titleExpr: 'title',
    swimlaneExpr: 'team',
    columns: LANE_COLUMNS,
    collapsedSwimlanes: collapsedLanes,
    onCollapsedSwimlanesChange: setCollapsedLanes,
    style: { height: 560 },
  });
}

function WipDemo(): ReactNode {
  return createElement(OgeKanban<Row>, {
    dataSource: WIP_TASKS,
    keyExpr: 'id',
    columnExpr: 'status',
    titleExpr: 'title',
    columns: WIP_COLUMNS,
    style: { height: 420 },
  });
}

function onDemoMoving(event: OgeKanbanCardMovingEvent<Row>): void {
  if (event.fromColumn === 'done') event.cancel = true;
}

function DragDropDemo(): ReactNode {
  const [log, setLog] = useState('drag a card');
  return createElement(
    'div',
    null,
    createElement(OgeKanban<Row>, {
      dataSource: DRAG_TASKS,
      keyExpr: 'id',
      columnExpr: 'status',
      titleExpr: 'title',
      orderExpr: 'rank',
      allowColumnReordering: true,
      onCardMoving: onDemoMoving,
      onCardMoved: (event) =>
        setLog(`moved to ${event.toColumn} @ ${event.toIndex}`),
      style: { height: 420 },
    }),
    createElement('p', { className: 'mt-2 text-sm text-slate-500' }, log),
  );
}

const RTL_COLUMNS = [
  { key: 'todo', title: 'To do' },
  { key: 'doing', title: 'In progress' },
  { key: 'done', title: 'Done' },
];

const RTL_TASKS: Row[] = [
  { id: 1, status: 'todo', title: 'Ctrl+ArrowLeft moves me forward' },
  { id: 2, status: 'todo', title: 'Translate the onboarding flow' },
  { id: 3, status: 'doing', title: 'Mirror the icons' },
  { id: 4, status: 'done', title: 'Arabic and Hebrew catalogs' },
];

function RtlDemo(): ReactNode {
  return createElement(OgeKanban<Row>, {
    dataSource: RTL_TASKS,
    keyExpr: 'id',
    columnExpr: 'status',
    titleExpr: 'title',
    columns: RTL_COLUMNS,
    rtlEnabled: true,
    allowColumnReordering: true,
    style: { height: 380 },
  });
}

function KeyboardDemo(): ReactNode {
  return createElement(OgeKanban<Row>, {
    dataSource: KEYBOARD_TASKS,
    keyExpr: 'id',
    columnExpr: 'status',
    titleExpr: 'title',
    style: { height: 420 },
  });
}

function onDemoDialogShowing(
  event: OgeKanbanEditDialogShowingEvent<Row>,
): void {
  event.formItems = [
    ...event.formItems.filter((item) => item.field !== 'color'),
    {
      field: 'sprint',
      label: 'Sprint',
      editorType: 'selectBox',
      editorOptions: { items: ['Sprint 41', 'Sprint 42', 'Sprint 43'] },
    },
  ];
}

function DialogDemo(): ReactNode {
  return createElement(OgeKanban<Row>, {
    dataSource: DIALOG_TASKS,
    keyExpr: 'id',
    columnExpr: 'status',
    titleExpr: 'title',
    descriptionExpr: 'notes',
    onCardEditDialogShowing: onDemoDialogShowing,
    style: { height: 420 },
  });
}

const sourceField = (card: OgeKanbanCard, field: string): string =>
  String((card.source as Row)[field] ?? '');

function TemplateDemo(): ReactNode {
  const [log, setLog] = useState('');
  const board = createElement(OgeKanban<Row>, {
    dataSource: DEPLOYMENTS,
    keyExpr: 'id',
    columnExpr: 'stage',
    titleExpr: 'service',
    cardHeight: 112,
    style: { height: 420 },
    renderCard: ({ card }) =>
      createElement(
        'div',
        {
          style: {
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            flex: 1,
          },
        },
        createElement('strong', null, card.title),
        createElement(
          'code',
          { style: { fontSize: 11 } },
          sourceField(card, 'version'),
        ),
        createElement('progress', {
          value: Number(sourceField(card, 'health') || 0),
          max: 100,
          style: { width: '100%' },
        }),
        createElement(
          'button',
          {
            type: 'button',
            className: 'demo-rollback',
            onClick: () => setLog(`Rollback requested: ${card.title}`),
          },
          'Roll back',
        ),
      ),
  });
  return createElement(
    'div',
    null,
    board,
    createElement(
      'p',
      { className: 'mt-2 text-sm text-slate-500', 'aria-live': 'polite' },
      log,
    ),
  );
}

function ConfigDemo(): ReactNode {
  return createElement(OgeKanban<Row>, {
    dataSource: GERMAN_TASKS,
    keyExpr: 'id',
    columnExpr: 'status',
    titleExpr: 'title',
    dueDateExpr: 'due',
    locale: 'de-DE',
    style: { height: 380 },
  });
}

/**
 * The React half of the Kanban overview — the same eight demo sections as
 * the Angular page, with the same example content, rendered as real React
 * trees inside `/components/kanban` when the reader has chosen React
 * (ADR 0002).
 */
@Component({
  selector: 'app-react-kanban-overview-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React board carries the class names but no styles of its own — the
  // docs pull the same SCSS the package build compiles, plus the modal
  // (overlay), the form and its editors the edit dialog composes.
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/kanban/src/styles.scss',
    '../../../../../../packages/react/overlay/src/styles.scss',
    '../../../../../../packages/react/forms/src/styles.scss',
    '../../../../../../packages/react/inputs/src/styles.scss',
  ],
  template: `
    <app-demo-card
      [chips]="['field mapping', 'declared columns', 'search', 'context menu']"
      heading="Getting started"
      description="One element, a working board. Drag a card between columns (Escape cancels mid-drag), double-click a card to edit it, double-click empty column space to add one there, right-click for the built-in menu, and type in the toolbar to search. Columns declare titles, colors and WIP limits — or derive from the data."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="gettingStarted" />
    </app-demo-card>

    <app-demo-card
      [chips]="['swimlaneExpr', 'collapsible lanes']"
      heading="Swimlanes"
      description="<code>swimlaneExpr</code> turns the board into swimlane rows × columns. Lane headers collapse — <code>collapsedSwimlanes</code> and <code>collapsedColumns</code> are controlled pairs — and every lane scrolls its cells independently."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="swimlanes" />
    </app-demo-card>

    <app-demo-card
      [chips]="['wipLimit', 'danger badge', 'drag preview']"
      heading="WIP limits"
      description="<code>wipLimit</code> is a soft limit: the column badge shows count/limit, turns to the danger tone on overflow, and previews the target column's +1 while a drag hovers it. Limits count real data — search filtering never changes them."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="wip" />
    </app-demo-card>

    <app-demo-card
      [chips]="[
        'onCardMoving',
        'Escape restore',
        'orderExpr',
        'column reorder',
      ]"
      heading="Drag &amp; drop pipeline"
      description="Every move — drag, Ctrl+Arrow or <code>moveCard()</code> — runs the same cancelable pipeline: <code>onCardMoving</code> (set <code>cancel</code> to veto) then <code>onCardMoved</code>. Here nothing may leave <em>Done</em> — try it. <code>orderExpr</code> persists the in-column order back onto your items; column headers drag too."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="dragDrop" />
    </app-demo-card>

    <app-demo-card
      [chips]="['Ctrl+Arrow', 'live region', 'roving list']"
      heading="Keyboard moving &amp; a11y"
      description="Arrows rove between cards and columns, Enter edits, Delete deletes — and <strong>Ctrl+Arrow moves the focused card</strong>, the exact keyboard twin of the drag, with a polite live-region announcement after every commit. Columns are labeled lists with their count and WIP in the accessible name, one Tab stop each; Tab from a card continues into its quick-action buttons and any controls a card template renders."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="keyboard" />
    </app-demo-card>

    <app-demo-card
      [chips]="['onCardEditDialogShowing', 'formItems', 'cancelable CRUD']"
      heading="Edit dialog &amp; events"
      description="The built-in dialog (an <code>&amp;lt;OgeForm&amp;gt;</code>) covers the standard card fields; <code>onCardEditDialogShowing</code> is both the veto and the customization point — <code>formItems</code> arrives pre-populated and may be mutated or replaced. This demo swaps the color field for a sprint picker."
      [code]="demos[5].source"
      language="tsx"
    >
      <app-react-host [render]="dialog" />
    </app-demo-card>

    <app-demo-card
      [chips]="['renderCard', 'cardHeight']"
      heading="Card template"
      description="<code>renderCard</code> replaces the card body while drag, keyboard and ARIA stay on the board. Controls it renders are real interactive content — Tab from a card reaches its <em>Roll back</em> button, which neither starts a drag nor steals the board&#39;s arrow keys (Escape returns to the card). Rich templates usually pair with a matching <code>cardHeight</code> — or opt out of virtualization entirely when heights must vary (documented exception)."
      [code]="demos[6].source"
      language="tsx"
    >
      <app-react-host [render]="template" />
    </app-demo-card>

    <app-demo-card
      [chips]="['OgeKanbanConfigProvider', 'messages', 'locale']"
      heading="Configuration &amp; i18n"
      description="Every user-facing string — toolbar, menu, dialog, aria labels, live-region announcements — lives in <code>OgeKanbanMessages</code>: provide once with <code>&amp;lt;OgeKanbanConfigProvider&amp;gt;</code>, override per instance with <code>messages</code>. <code>locale</code> drives every Intl format (the due-date badges here render in German)."
      [code]="demos[7].source"
      language="tsx"
    >
      <app-react-host [render]="config" />
    </app-demo-card>

    <app-demo-card
      [chips]="['rtlEnabled', 'mirrored keys', 'logical layout']"
      heading="RTL"
      description="<code>rtlEnabled</code> (unset follows the page's <code>dir</code> and keeps following it) mirrors the board: the first column sits on the right, ArrowLeft moves focus to the next column and Ctrl+ArrowLeft moves the focused card there, the column-reorder drag and the drop hit-testing follow the mirrored geometry, and the collapsed-lane chevron points left. An explicit value also sets <code>dir</code> on the host."
      [code]="demos[8].source"
      language="tsx"
    >
      <app-react-host [render]="rtl" />
    </app-demo-card>
  `,
})
export class ReactKanbanOverviewDemos {
  protected readonly demos = KANBAN_OVERVIEW_DEMOS;

  protected readonly gettingStarted = () => createElement(GettingStartedDemo);
  protected readonly swimlanes = () => createElement(SwimlanesDemo);
  protected readonly wip = () => createElement(WipDemo);
  protected readonly dragDrop = () => createElement(DragDropDemo);
  protected readonly keyboard = () => createElement(KeyboardDemo);
  protected readonly dialog = () => createElement(DialogDemo);
  protected readonly template = () => createElement(TemplateDemo);
  protected readonly config = () => createElement(ConfigDemo);
  protected readonly rtl = () => createElement(RtlDemo);
}
