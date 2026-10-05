import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import {
  Fragment,
  createElement,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { RowKey } from '@oge-ui/core';
import {
  OgeGantt,
  type OgeGanttHandle,
  type OgeGanttSortChangedEvent,
} from '@oge-ui/react-gantt';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import {
  LIST_EDIT_COLUMNS,
  LIST_SORT_COLUMNS,
  listLinks,
  listTasks,
  type DepthLink,
  type DepthTask,
} from '../gantt/gantt-depth-data';
import { GANTT_TASK_LIST_DEMOS } from './task-list-snippets';

/** TOC of the React view — the same sections as the Angular page. */
export const REACT_GANTT_TASK_LIST_SECTIONS = [
  'Inline editing',
  'Sort, filter & columns',
  'Multi-select & bulk edits',
] as const;

const BUTTON = 'rounded border px-3 py-1 text-sm';

const button = (label: string, onClick: () => void): ReactNode =>
  createElement(
    'button',
    { type: 'button', className: BUTTON, onClick },
    label,
  );

function InlineDemo(): ReactNode {
  const [tasks] = useState(() => listTasks());
  const [links] = useState(() => listLinks());
  return createElement(OgeGantt<DepthTask, DepthLink>, {
    tasks,
    dependencies: links,
    columns: LIST_EDIT_COLUMNS,
    inlineEditing: true,
    taskListWidth: 560,
    style: { height: 380 },
  });
}

function SortDemo(): ReactNode {
  const [tasks] = useState(() => listTasks());
  const [links] = useState(() => listLinks());
  const [lastSort, setLastSort] = useState<OgeGanttSortChangedEvent | null>(
    null,
  );
  return createElement(
    Fragment,
    null,
    createElement(OgeGantt<DepthTask, DepthLink>, {
      tasks,
      dependencies: links,
      columns: LIST_SORT_COLUMNS,
      allowSorting: true,
      allowColumnResizing: true,
      allowColumnReordering: true,
      filterRow: true,
      searchPanel: true,
      taskListWidth: 380,
      style: { height: 420 },
      onSortChanged: setLastSort,
    }),
    createElement(
      'p',
      { className: 'mt-2 text-sm' },
      `Sorted by: ${lastSort?.field ?? 'store order'}`,
    ),
  );
}

function MultiDemo(): ReactNode {
  const gantt = useRef<OgeGanttHandle<DepthTask, DepthLink>>(null);
  const [tasks] = useState(() => listTasks());
  const [links] = useState(() => listLinks());
  const [selected, setSelected] = useState<readonly RowKey[]>([]);
  return createElement(
    Fragment,
    null,
    createElement(
      'div',
      { className: 'mb-3 flex flex-wrap gap-2' },
      button('Indent selected', () => {
        const handle = gantt.current;
        if (handle) handle.indentTasks(handle.getSelectedTasks());
      }),
      button('Delete selected', () => {
        const handle = gantt.current;
        if (handle) {
          handle.deleteTasks(handle.getSelectedTasks().map((t) => t.source));
        }
      }),
      button('Undo', () => gantt.current?.undo()),
    ),
    createElement(OgeGantt<DepthTask, DepthLink>, {
      ref: gantt,
      tasks,
      dependencies: links,
      selectionMode: 'multiple',
      selectedTaskKeys: selected,
      onSelectedTaskKeysChange: setSelected,
      style: { height: 380 },
    }),
    createElement(
      'p',
      { className: 'mt-2 text-sm', 'aria-live': 'polite' },
      `${selected.length} selected`,
    ),
  );
}

/**
 * The React half of "Task list editing" — rendered inside
 * `/components/gantt/task-list` when the reader has chosen React.
 */
@Component({
  selector: 'app-react-gantt-task-list-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/gantt/src/styles.scss',
    '../../../../../../packages/react/overlay/src/styles.scss',
    '../../../../../../packages/react/forms/src/styles.scss',
    '../../../../../../packages/react/inputs/src/styles.scss',
  ],
  template: `
    <app-demo-card
      [chips]="['inlineEditing', 'F2', 'Tab', 'editor', 'predecessors']"
      heading="Inline editing"
      description="Double-click a cell or press <strong>F2</strong> on a row. Text, date, number, duration (days) and predecessor editors (<code>2FS+1d, 3</code>); summaries keep their rolled-up dates read-only and <code>editor: false</code> locks a column. Enter commits, Escape cancels, Tab / Shift+Tab move along the row."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="inline" />
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
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="sort" />
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
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="multi" />
    </app-demo-card>
  `,
})
export class ReactGanttTaskListDemos {
  protected readonly demos = GANTT_TASK_LIST_DEMOS;
  protected readonly inline = () => createElement(InlineDemo);
  protected readonly sort = () => createElement(SortDemo);
  protected readonly multi = () => createElement(MultiDemo);
}
