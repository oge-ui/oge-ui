import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { OgeKanban, type OgeKanbanCardTransferredEvent } from '@oge-ui/kanban';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_KANBAN_MULTI_SELECT_SECTIONS,
  ReactKanbanMultiSelectDemos,
} from '../react-kanban/multi-select';
import {
  CROSS_BOARD_SNIPPET,
  MULTI_SELECT_SNIPPET,
  QUICK_ADD_SNIPPET,
  SWIMLANE_WIP_SNIPPET,
} from './multi-select-snippets';

const SECTIONS = [
  'Multi-select & undo',
  'Cross-board drag',
  'Swimlane WIP limits',
  'Quick add, inline titles & checklists',
] as const;

interface Task {
  id: number;
  status: string;
  title: string;
}

type Row = Record<string, unknown>;

@Component({
  selector: 'app-kanban-multi-select',
  imports: [
    DemoCard,
    DocHeader,
    OgeKanban,
    PageToc,
    ReactKanbanMultiSelectDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Multi-select &amp; cross-board"
      category="Kanban"
      categoryLink="/components/kanban"
      [chips]="[
        'Ctrl/Shift click',
        'multi-card drag',
        'dragGroup',
        'undo / redo',
      ]"
    >
      <p>
        Select several cards (Ctrl/Shift-click or the keyboard), drag or
        Ctrl+Arrow them as one, move them to another board that shares the
        <code>dragGroup</code>, and undo any step with
        <kbd>Ctrl</kbd>+<kbd>Z</kbd>. Swimlanes take their own WIP limits, and
        cards gain an inline quick-add composer, in-place title editing and
        checklists.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-kanban-multi-select-demos />
    } @else {
      <app-demo-card
        [chips]="['[(selectedCardKeys)]', 'Ctrl+A', 'Ctrl+Z']"
        heading="Multi-select &amp; undo"
        description="Ctrl/⌘-click toggles, Shift-click selects a range in the column, Ctrl+A on a card selects its column, Ctrl+Space toggles, Shift+↑/↓ extends and Escape collapses. Dragging a selected card carries the selection — the ghost shows the count — and Ctrl+←/→ and Delete act on all of it, each as one undoable step (Ctrl+Z / Ctrl+Y or the toolbar)."
        [code]="multiSnippet"
        language="ts"
      >
        <oge-kanban
          [dataSource]="multiTasks"
          keyExpr="id"
          columnExpr="status"
          titleExpr="title"
          [(selectedCardKeys)]="selected"
          style="height: 420px"
        />
        <p class="mt-2 text-sm text-slate-500">
          Selected: {{ selected().length }}
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['dragGroup', 'cardTransferring', 'Move to …']"
        heading="Cross-board drag"
        description="Boards sharing a <code>dragGroup</code> exchange cards: drag a card (or a selection) onto the other board, or use the card menu&#39;s <em>Move to …</em> entry — the keyboard and single-pointer twin. The target fires the cancelable <code>cardTransferring</code>; both boards fire <code>cardTransferred</code>."
        [code]="crossBoardSnippet"
        language="ts"
      >
        <div class="grid gap-3 md:grid-cols-2">
          <oge-kanban
            [dataSource]="backlog()"
            keyExpr="id"
            columnExpr="status"
            titleExpr="title"
            dragGroup="planning"
            boardId="Backlog"
            [columns]="backlogColumns"
            (cardTransferred)="onTransferred($event)"
            style="height: 360px"
          />
          <oge-kanban
            [dataSource]="sprint()"
            keyExpr="id"
            columnExpr="status"
            titleExpr="title"
            dragGroup="planning"
            boardId="Sprint"
            [columns]="sprintColumns"
            (cardTransferred)="onTransferred($event)"
            style="height: 360px"
          />
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['swimlaneWipLimit', 'swimlaneWipLimits']"
        heading="Swimlane WIP limits"
        description="<code>swimlaneWipLimit</code> on a column caps it inside every lane (the cell badge turns danger on overflow); <code>swimlaneWipLimits</code> caps a lane&#39;s total, keyed by lane value."
        [code]="swimlaneWipSnippet"
        language="ts"
      >
        <oge-kanban
          [dataSource]="laneTasks"
          keyExpr="id"
          columnExpr="status"
          titleExpr="title"
          swimlaneExpr="team"
          [columns]="laneColumns"
          [swimlaneWipLimits]="laneLimits"
          style="height: 520px"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['quickAdd', 'F2', 'checklistExpr']"
        heading="Quick add, inline titles &amp; checklists"
        description="<code>quickAdd</code> turns the column footer into an inline composer (Enter adds and stays open, Escape closes). <kbd>F2</kbd> on a card — or a double-click on its title with <code>inlineTitleEditing</code> — renames it in place. <code>checklistExpr</code> maps <code>{ text, done }</code> sub-tasks to a progress badge."
        [code]="quickAddSnippet"
        language="ts"
      >
        <oge-kanban
          #board
          [dataSource]="checklistTasks"
          keyExpr="id"
          columnExpr="status"
          titleExpr="title"
          checklistExpr="todo"
          [quickAdd]="true"
          [inlineTitleEditing]="true"
          style="height: 420px"
        />
        <button
          type="button"
          class="mt-2 rounded border px-3 py-1 text-sm"
          (click)="board.toggleChecklistItem(1, 1)"
        >
          Tick “Write tests” on the first card
        </button>
      </app-demo-card>
    }
  `,
})
export class KanbanMultiSelectPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_KANBAN_MULTI_SELECT_SECTIONS;
  protected readonly multiSnippet = MULTI_SELECT_SNIPPET;
  protected readonly crossBoardSnippet = CROSS_BOARD_SNIPPET;
  protected readonly swimlaneWipSnippet = SWIMLANE_WIP_SNIPPET;
  protected readonly quickAddSnippet = QUICK_ADD_SNIPPET;

  protected readonly selected = signal<readonly unknown[]>([]);
  protected readonly multiTasks: Row[] = [
    { id: 1, status: 'todo', title: 'Ctrl-click me' },
    { id: 2, status: 'todo', title: '…and me' },
    { id: 3, status: 'todo', title: 'Shift-click for a range' },
    { id: 4, status: 'doing', title: 'Drag a selected card' },
    { id: 5, status: 'done', title: 'Ctrl+Z undoes the last step' },
  ];

  protected readonly backlogColumns = [{ key: 'todo', title: 'Ideas' }];
  protected readonly sprintColumns = [
    { key: 'todo', title: 'To do' },
    { key: 'doing', title: 'In progress' },
  ];
  protected readonly backlog = signal<Task[]>([
    { id: 1, status: 'todo', title: 'Dark mode' },
    { id: 2, status: 'todo', title: 'CSV import' },
    { id: 3, status: 'todo', title: 'Audit log' },
  ]);
  protected readonly sprint = signal<Task[]>([
    { id: 10, status: 'todo', title: 'Login rate limits' },
  ]);

  protected onTransferred(event: OgeKanbanCardTransferredEvent<Task>): void {
    const moved = new Set(event.sourceCards.map((task) => task.id));
    const from = event.fromBoard === 'Backlog' ? this.backlog : this.sprint;
    const to = event.toBoard === 'Backlog' ? this.backlog : this.sprint;
    if (from().some((task) => moved.has(task.id))) {
      from.set(from().filter((task) => !moved.has(task.id)));
      to.set([...to(), ...event.cards]);
    }
  }

  protected readonly laneColumns = [
    { key: 'todo', title: 'To do' },
    { key: 'doing', title: 'In progress', swimlaneWipLimit: 1 },
    { key: 'done', title: 'Done' },
  ];
  protected readonly laneLimits = { Mobile: 2 };
  protected readonly laneTasks: Row[] = [
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

  protected readonly checklistTasks: Row[] = [
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
}
