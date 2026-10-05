import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import type { RowKey } from '@oge-ui/core';
import {
  OgeGantt,
  type OgeGanttSortChangedEvent,
  type OgeGanttTask,
} from '@oge-ui/gantt';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_GANTT_TASK_LIST_SECTIONS,
  ReactGanttTaskListDemos,
} from '../react-gantt/task-list';
import {
  LIST_EDIT_COLUMNS,
  LIST_SORT_COLUMNS,
  listLinks,
  listTasks,
} from './gantt-depth-data';
import {
  INLINE_EDIT_SNIPPET,
  MULTI_SELECT_SNIPPET,
  SORT_FILTER_SNIPPET,
} from './task-list-snippets';

const SECTIONS = [
  'Inline editing',
  'Sort, filter & columns',
  'Multi-select & bulk edits',
] as const;

const BUTTON = 'rounded border px-3 py-1 text-sm';

@Component({
  selector: 'app-gantt-task-list',
  imports: [DemoCard, DocHeader, OgeGantt, PageToc, ReactGanttTaskListDemos],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Task list editing"
      category="Gantt"
      categoryLink="/components/gantt"
      [chips]="[
        'inline editing',
        'sorting',
        'filter row',
        'column resize / reorder',
        'frozen columns',
        'multi-select',
      ]"
    >
      <p>
        The task list is a full treegrid: cells edit in place, headers sort,
        resize and move (each with a keyboard twin), a filter row and a search
        box narrow the tree without losing ancestors, and a multi-selection
        drives bulk delete, indent and outdent — every bulk edit one undo step.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-gantt-task-list-demos />
    } @else {
      <app-demo-card
        [chips]="['inlineEditing', 'F2', 'Tab', 'editor', 'predecessors']"
        heading="Inline editing"
        description="Double-click a cell or press <strong>F2</strong> on a row. Text, date, number, duration (days) and predecessor editors (<code>2FS+1d, 3</code>); summaries keep their rolled-up dates read-only and <code>editor: false</code> locks a column. Enter commits, Escape cancels, Tab / Shift+Tab move along the row."
        [code]="inlineSnippet"
        language="ts"
      >
        <oge-gantt
          [tasks]="editTasks"
          [dependencies]="editLinks"
          [columns]="editColumns"
          [inlineEditing]="true"
          [taskListWidth]="560"
          style="height: 380px"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="[
          'allowSorting',
          'filterRow',
          'searchPanel',
          'allowColumnResizing',
          'allowColumnReordering',
          'frozen',
        ]"
        heading="Sort, filter & columns"
        description="Click a header (or focus it and press Enter) to sort ascending, descending, off — siblings stay inside their parent and the WBS keeps the store order. Type into the filter row or the toolbar search: matches keep their ancestors. Drag a header edge or press <strong>Alt+Left/Right</strong> to resize; drag a header or press <strong>Ctrl+Shift+Left/Right</strong> to move it. WBS and Task are frozen."
        [code]="sortSnippet"
        language="ts"
      >
        <oge-gantt
          [tasks]="sortTasks"
          [dependencies]="sortLinks"
          [columns]="sortColumns"
          [allowSorting]="true"
          [allowColumnResizing]="true"
          [allowColumnReordering]="true"
          [filterRow]="true"
          [searchPanel]="true"
          [taskListWidth]="380"
          style="height: 420px"
          (sortChanged)="lastSort.set($event)"
        />
        <p class="mt-2 text-sm">
          Sorted by: {{ lastSort()?.field ?? 'store order' }}
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="[
          'selectionMode',
          'selectedTaskKeys',
          'deleteTasks()',
          'indentTasks()',
        ]"
        heading="Multi-select & bulk edits"
        description="Ctrl/Cmd-click toggles, Shift-click or Shift+Up/Down extends, Ctrl+A selects every row. Delete, Alt+Shift+Left/Right and the context menu then act on the whole selection — as one undo step, with one plural announcement."
        [code]="multiSnippet"
        language="ts"
      >
        <div class="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            [class]="button"
            (click)="multiGantt.indentTasks(multiGantt.getSelectedTasks())"
          >
            Indent selected
          </button>
          <button
            type="button"
            [class]="button"
            (click)="
              multiGantt.deleteTasks(sourcesOf(multiGantt.getSelectedTasks()))
            "
          >
            Delete selected
          </button>
          <button type="button" [class]="button" (click)="multiGantt.undo()">
            Undo
          </button>
        </div>
        <oge-gantt
          #multiGantt
          [tasks]="multiTasks"
          [dependencies]="multiLinks"
          selectionMode="multiple"
          [(selectedTaskKeys)]="selected"
          style="height: 380px"
        />
        <p class="mt-2 text-sm" aria-live="polite">
          {{ selected().length }} selected
        </p>
      </app-demo-card>
    }
  `,
})
export class GanttTaskListPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_GANTT_TASK_LIST_SECTIONS;
  protected readonly button = BUTTON;
  protected readonly inlineSnippet = INLINE_EDIT_SNIPPET;
  protected readonly sortSnippet = SORT_FILTER_SNIPPET;
  protected readonly multiSnippet = MULTI_SELECT_SNIPPET;
  protected readonly editTasks = listTasks();
  protected readonly editLinks = listLinks();
  protected readonly editColumns = LIST_EDIT_COLUMNS;
  protected readonly sortTasks = listTasks();
  protected readonly sortLinks = listLinks();
  protected readonly sortColumns = LIST_SORT_COLUMNS;
  protected readonly lastSort = signal<OgeGanttSortChangedEvent | null>(null);
  protected readonly multiTasks = listTasks();
  protected readonly multiLinks = listLinks();
  protected readonly selected = signal<readonly RowKey[]>([]);

  protected sourcesOf<T>(tasks: readonly OgeGanttTask<T>[]): T[] {
    return tasks.map((task) => task.source);
  }
}
