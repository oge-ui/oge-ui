import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  OgeKanban,
  OgeKanbanCardTemplate,
  type OgeKanbanCard,
  type OgeKanbanCardMovingEvent,
  type OgeKanbanEditDialogShowingEvent,
} from '@oge-ui/kanban';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import {
  CONFIG_SNIPPET,
  DIALOG_EVENTS_SNIPPET,
  DRAG_DROP_SNIPPET,
  GETTING_STARTED_SNIPPET,
  KEYBOARD_SNIPPET,
  SWIMLANES_SNIPPET,
  TEMPLATE_SNIPPET,
  WIP_SNIPPET,
} from './overview-snippets';

const SECTIONS = [
  'Getting started',
  'Swimlanes',
  'WIP limits',
  'Drag & drop pipeline',
  'Keyboard moving & a11y',
  'Edit dialog & events',
  'Card template',
  'Configuration & i18n',
] as const;

type DemoCardRow = Record<string, unknown>;

@Component({
  selector: 'app-kanban-overview',
  imports: [
    DemoCard,
    DocHeader,
    OgeKanban,
    OgeKanbanCardTemplate,
    PageToc,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Kanban"
      category="Kanban"
      categoryLink="/components/kanban"
      [chips]="[
        'columns + swimlanes',
        'WIP limits',
        'drag & drop',
        'keyboard moving',
        'virtualized',
      ]"
    >
      <p>
        A task-board Kanban built on a framework-free kernel: columns and
        swimlanes over a plain card array with <code>*Expr</code> field mapping,
        per-column virtualization over a fixed card height (10k cards stay
        smooth), WIP limits with live drag previews, and a polished drag &amp;
        drop — 3px threshold, live placeholder, lifted tilt, edge auto-scroll,
        mid-drag Escape restore, exactly one commit through the cancelable
        <code>cardMoving</code> pipeline. A built-in edit dialog, context menu
        and toolbar (search, collapse, add) come out of the box. No WAI-ARIA APG
        kanban pattern exists, so the widget composes the listbox pattern —
        labeled column listboxes with roving-tabindex option cards — and adds
        <strong>Ctrl+Arrow keyboard card moving</strong> with polite live-region
        announcements, which no reference library offers.
      </p>
      <p>
        <code>&#64;oge-ui/kanban</code> is a commercial package — free for
        evaluation and development, with no watermark and no runtime license
        checks. See
        <a
          routerLink="/license"
          class="text-indigo-600 underline dark:text-indigo-400"
          >licensing</a
        >
        for the terms.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <app-demo-card
      [chips]="['field mapping', 'declared columns', 'search', 'context menu']"
      heading="Getting started"
      description="One element, a working board. Drag a card between columns (Escape cancels mid-drag), double-click a card to edit it, double-click empty column space to add one there, right-click for the built-in menu, and type in the toolbar to search. Columns declare titles, colors and WIP limits — or derive from the data."
      [code]="gettingStartedSnippet"
      language="ts"
    >
      <oge-kanban
        [dataSource]="basicTasks"
        keyExpr="id"
        columnExpr="status"
        titleExpr="title"
        descriptionExpr="notes"
        assigneeExpr="owner"
        dueDateExpr="due"
        priorityExpr="priority"
        tagsExpr="labels"
        [columns]="basicColumns"
        [allowColumnAdding]="true"
        style="height: 520px"
      />
    </app-demo-card>

    <app-demo-card
      [chips]="['swimlaneExpr', 'collapsible lanes']"
      heading="Swimlanes"
      description="<code>swimlaneExpr</code> turns the board into swimlane rows × columns. Lane headers collapse — <code>[(collapsedSwimlanes)]</code> and <code>[(collapsedColumns)]</code> are two-way — and every lane scrolls its cells independently."
      [code]="swimlanesSnippet"
      language="ts"
    >
      <oge-kanban
        [dataSource]="laneTasks"
        keyExpr="id"
        columnExpr="status"
        titleExpr="title"
        swimlaneExpr="team"
        [columns]="laneColumns"
        style="height: 560px"
      />
    </app-demo-card>

    <app-demo-card
      [chips]="['wipLimit', 'danger badge', 'drag preview']"
      heading="WIP limits"
      description="<code>wipLimit</code> is a soft limit: the column badge shows count/limit, turns to the danger tone on overflow, and previews the target column's +1 while a drag hovers it. Limits count real data — search filtering never changes them."
      [code]="wipSnippet"
      language="ts"
    >
      <oge-kanban
        [dataSource]="wipTasks"
        keyExpr="id"
        columnExpr="status"
        titleExpr="title"
        [columns]="wipColumns"
        style="height: 420px"
      />
    </app-demo-card>

    <app-demo-card
      [chips]="['cardMoving', 'Escape restore', 'orderExpr', 'column reorder']"
      heading="Drag &amp; drop pipeline"
      description="Every move — drag, Ctrl+Arrow or <code>moveCard()</code> — runs the same cancelable pipeline: <code>cardMoving</code> (set <code>cancel</code> to veto) then <code>cardMoved</code>. Here nothing may leave <em>Done</em> — try it. <code>orderExpr</code> persists the in-column order back onto your items; column headers drag too."
      [code]="dragDropSnippet"
      language="ts"
    >
      <oge-kanban
        [dataSource]="dragTasks"
        keyExpr="id"
        columnExpr="status"
        titleExpr="title"
        orderExpr="rank"
        [allowColumnReordering]="true"
        (cardMoving)="onDemoMoving($event)"
        (cardMoved)="
          dragLog.set('moved to ' + $event.toColumn + ' @ ' + $event.toIndex)
        "
        style="height: 420px"
      />
      <p class="mt-2 text-sm text-slate-500">{{ dragLog() }}</p>
    </app-demo-card>

    <app-demo-card
      [chips]="['Ctrl+Arrow', 'live region', 'listbox pattern']"
      heading="Keyboard moving &amp; a11y"
      description="Arrows rove between cards and columns, Enter edits, Delete deletes — and <strong>Ctrl+Arrow moves the focused card</strong>, the exact keyboard twin of the drag, with a polite live-region announcement after every commit. Columns are labeled listboxes with their count and WIP in the accessible name."
      [code]="keyboardSnippet"
      language="ts"
    >
      <oge-kanban
        [dataSource]="keyboardTasks"
        keyExpr="id"
        columnExpr="status"
        titleExpr="title"
        style="height: 420px"
      />
    </app-demo-card>

    <app-demo-card
      [chips]="['cardEditDialogShowing', 'formItems', 'cancelable CRUD']"
      heading="Edit dialog &amp; events"
      description="The built-in dialog (an <code>OgeForm</code>) covers the standard card fields; <code>cardEditDialogShowing</code> is both the veto and the customization point — <code>formItems</code> arrives pre-populated and may be mutated or replaced. This demo swaps the color field for a sprint picker."
      [code]="dialogEventsSnippet"
      language="ts"
    >
      <oge-kanban
        [dataSource]="dialogTasks"
        keyExpr="id"
        columnExpr="status"
        titleExpr="title"
        descriptionExpr="notes"
        (cardEditDialogShowing)="onDemoDialogShowing($event)"
        style="height: 420px"
      />
    </app-demo-card>

    <app-demo-card
      [chips]="['*ogeKanbanCardTemplate', 'cardHeight']"
      heading="Card template"
      description="<code>*ogeKanbanCardTemplate</code> replaces the card body while drag, keyboard and ARIA stay on the component. Rich templates usually pair with a matching <code>cardHeight</code> — or opt out of virtualization entirely when heights must vary (documented exception)."
      [code]="templateSnippet"
      language="ts"
    >
      <oge-kanban
        [dataSource]="deployments"
        keyExpr="id"
        columnExpr="stage"
        titleExpr="service"
        [cardHeight]="96"
        style="height: 420px"
      >
        <ng-template ogeKanbanCardTemplate let-card>
          <div
            style="padding: 10px 12px; display: flex; flex-direction: column; gap: 4px"
          >
            <strong>{{ card.title }}</strong>
            <code style="font-size: 11px">{{
              sourceField(card, 'version')
            }}</code>
            <progress
              [value]="healthOf(card)"
              max="100"
              style="width: 100%"
            ></progress>
          </div>
        </ng-template>
      </oge-kanban>
    </app-demo-card>

    <app-demo-card
      [chips]="['provideOgeKanbanConfig', 'messages', 'locale']"
      heading="Configuration &amp; i18n"
      description="Every user-facing string — toolbar, menu, dialog, aria labels, live-region announcements — lives in <code>OgeKanbanMessages</code>: provide once, override per instance with <code>[messages]</code>. <code>locale</code> drives every Intl format (the due-date badges here render in German)."
      [code]="configSnippet"
      language="ts"
    >
      <oge-kanban
        [dataSource]="germanTasks"
        keyExpr="id"
        columnExpr="status"
        titleExpr="title"
        dueDateExpr="due"
        locale="de-DE"
        style="height: 380px"
      />
    </app-demo-card>
  `,
})
export class KanbanOverviewPage {
  protected readonly sections = SECTIONS;

  protected readonly gettingStartedSnippet = GETTING_STARTED_SNIPPET;
  protected readonly swimlanesSnippet = SWIMLANES_SNIPPET;
  protected readonly wipSnippet = WIP_SNIPPET;
  protected readonly dragDropSnippet = DRAG_DROP_SNIPPET;
  protected readonly keyboardSnippet = KEYBOARD_SNIPPET;
  protected readonly dialogEventsSnippet = DIALOG_EVENTS_SNIPPET;
  protected readonly templateSnippet = TEMPLATE_SNIPPET;
  protected readonly configSnippet = CONFIG_SNIPPET;

  protected readonly basicColumns = [
    { key: 'todo', title: 'To do', color: '#64748b' },
    { key: 'doing', title: 'In progress', color: '#2563eb', wipLimit: 3 },
    { key: 'review', title: 'Review', color: '#d97706' },
    { key: 'done', title: 'Done', color: '#16a34a' },
  ];

  protected readonly basicTasks: DemoCardRow[] = [
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

  protected readonly laneColumns = [
    { key: 'todo', title: 'To do' },
    { key: 'doing', title: 'In progress' },
    { key: 'done', title: 'Done' },
  ];

  protected readonly laneTasks: DemoCardRow[] = [
    { id: 1, team: 'Platform', status: 'doing', title: 'Sharding rollout' },
    { id: 2, team: 'Platform', status: 'todo', title: 'Postgres 18 upgrade' },
    {
      id: 3,
      team: 'Mobile',
      status: 'todo',
      title: 'Push notification opt-in',
    },
    { id: 4, team: 'Mobile', status: 'done', title: 'Biometric login' },
    { id: 5, team: 'Web', status: 'doing', title: 'Design token migration' },
  ];

  protected readonly wipColumns = [
    { key: 'todo', title: 'To do' },
    { key: 'doing', title: 'In progress', wipLimit: 2 },
    { key: 'done', title: 'Done' },
  ];

  protected readonly wipTasks: DemoCardRow[] = [
    { id: 1, status: 'doing', title: 'Payments API' },
    { id: 2, status: 'doing', title: 'Search relevance' },
    { id: 3, status: 'doing', title: 'One too many — WIP exceeded' },
    { id: 4, status: 'todo', title: 'Docs sweep' },
    { id: 5, status: 'done', title: 'Login rate limits' },
  ];

  protected readonly dragLog = signal('drag a card');

  protected readonly dragTasks: DemoCardRow[] = [
    { id: 1, status: 'todo', title: 'Refactor auth', rank: 0 },
    { id: 2, status: 'todo', title: 'Ship dark mode', rank: 1 },
    { id: 3, status: 'doing', title: 'Bundle size audit', rank: 0 },
    { id: 4, status: 'done', title: 'This card is locked in', rank: 0 },
  ];

  protected onDemoMoving(event: OgeKanbanCardMovingEvent): void {
    if (event.fromColumn === 'done') event.cancel = true;
  }

  protected readonly keyboardTasks: DemoCardRow[] = [
    { id: 1, status: 'todo', title: 'Tab to the board, then arrow around' },
    { id: 2, status: 'todo', title: 'Ctrl+ArrowRight moves me' },
    { id: 3, status: 'doing', title: 'Enter opens my dialog' },
  ];

  protected readonly dialogTasks: DemoCardRow[] = [
    {
      id: 1,
      status: 'todo',
      title: 'Double-click me',
      notes: 'Custom form field below',
    },
    { id: 2, status: 'doing', title: 'Right-click me for the menu' },
  ];

  protected onDemoDialogShowing(event: OgeKanbanEditDialogShowingEvent): void {
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

  protected sourceField(card: OgeKanbanCard, field: string): string {
    return String((card.source as Record<string, unknown>)[field] ?? '');
  }

  protected healthOf(card: OgeKanbanCard): number {
    return Number((card.source as Record<string, unknown>)['health'] ?? 0);
  }

  protected readonly deployments: DemoCardRow[] = [
    {
      id: 1,
      stage: 'staging',
      service: 'api-gateway',
      version: 'v2.14.0',
      health: 98,
    },
    {
      id: 2,
      stage: 'staging',
      service: 'search',
      version: 'v1.9.2',
      health: 74,
    },
    {
      id: 3,
      stage: 'production',
      service: 'billing',
      version: 'v3.1.1',
      health: 100,
    },
  ];

  protected readonly germanTasks: DemoCardRow[] = [
    {
      id: 1,
      status: 'Offen',
      title: 'Angebot schreiben',
      due: new Date(2026, 7, 14),
    },
    { id: 2, status: 'In Arbeit', title: 'Rechnung prüfen' },
    { id: 3, status: 'Fertig', title: 'Kickoff-Termin' },
  ];
}
