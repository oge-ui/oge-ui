import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { toLocalDate } from '@oge-ui/core';
import {
  OgeColumn,
  OgeGrid,
  OgePagerInfoTemplate,
  type OgeRowDropEvent,
} from '@oge-ui/grid';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { makeEmployees } from '../../shared/demo-data';
import { ReactGridPinnedRowsDemos } from '../react-grid/pinned-rows';
import {
  DRAG_SNIPPET,
  PINNED_SNIPPET,
  STICKY_SNIPPET,
} from './pinned-rows-snippets';

interface Task {
  id: number;
  title: string;
}

@Component({
  selector: 'app-pinned-rows',
  imports: [
    OgeGrid,
    OgeColumn,
    OgePagerInfoTemplate,
    DemoCard,
    DocHeader,
    ReactGridPinnedRowsDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Pinned Rows"
      category="Data Grid"
      [chips]="[
        'pinnedTopRows',
        'pinnedBottomRows',
        'stickyGroupRows',
        'rowDragGroup',
        'pager',
      ]"
    >
      <p>
        Keep rows in view: pin rows above or below the scrolling body, keep the
        current group headers under the header while scrolling, and drag rows
        between grids.
      </p>
    </app-doc-header>

    @if (fw.isReact()) {
      <app-react-grid-pinned-rows-demos />
    } @else {
      <h3>Pinned rows & pager options</h3>
      <p>
        <code>pinnedTopRows</code> / <code>pinnedBottomRows</code> take data
        objects or keys of rows on the loaded page (which then leave the body).
        They sit in sticky sections — virtual scrolling included — and are
        display rows. The pager here adds first / last buttons, a go-to-page
        input and a custom info text (<code>*ogePagerInfoTemplate</code>).
      </p>
      <app-demo-card
        [chips]="['sticky sections', 'showFirstLastButtons', 'showPageInput']"
        [code]="pinnedSnippet"
        language="ts"
      >
        <oge-grid
          class="demo-pinned-grid"
          [data]="employees"
          keyField="id"
          [pinnedTopRows]="[budget]"
          [pinnedBottomRows]="[totals]"
          [paging]="{
            pageSize: 5,
            showFirstLastButtons: true,
            showPageInput: true,
          }"
        >
          <oge-column field="firstName" caption="Name" />
          <oge-column field="department" caption="Department" />
          <oge-column field="salary" caption="Salary" dataType="number" />
          <span *ogePagerInfoTemplate="let info">
            {{ info.firstRow }}–{{ info.lastRow }} of {{ info.totalCount }}
          </span>
        </oge-grid>
      </app-demo-card>

      <h3>Sticky group rows</h3>
      <p>
        With <code>stickyGroupRows</code> the group rows enclosing the first
        visible row stay under the header while scrolling — at every level and
        under virtual scrolling. They are a visual aid: the real group rows stay
        in place for keyboard and screen-reader users, and a click on a sticky
        row scrolls to it. The second level groups hire dates by quarter
        (<code>groupInterval="quarter"</code>).
      </p>
      <app-demo-card
        [chips]="['virtualScroll', 'groupInterval: quarter']"
        [code]="stickySnippet"
        language="ts"
      >
        <oge-grid
          class="demo-sticky-grid"
          [data]="grouped"
          keyField="id"
          style="height: 360px"
          [virtualScroll]="true"
          [stickyGroupRows]="true"
          [groupBy]="['department', 'hireDate']"
        >
          <oge-column field="department" caption="Department" />
          <oge-column
            field="hireDate"
            caption="Hired"
            dataType="date"
            groupInterval="quarter"
          />
          <oge-column field="firstName" caption="Name" />
          <oge-column field="city" caption="City" />
        </oge-grid>
      </app-demo-card>

      <h3>Drag rows between grids</h3>
      <p>
        Grids sharing a <code>rowDragGroup</code> accept each other's rows. The
        target fires <code>rowDrop</code> with the source row and the insert
        index; cross-grid drops move no data by themselves, so the handler moves
        the row (a drop inside the same grid is the usual reorder).
      </p>
      <app-demo-card
        [chips]="['rowDragGroup', 'rowDrop']"
        [code]="dragSnippet"
        language="ts"
      >
        <div class="grid grid-cols-2 gap-4 max-md:grid-cols-1">
          <oge-grid
            id="todo"
            class="demo-drag-todo"
            [data]="todo()"
            keyField="id"
            [rowDragging]="true"
            rowDragGroup="tasks"
            (rowDrop)="onDrop($event)"
          >
            <oge-column field="title" caption="To do" />
          </oge-grid>
          <oge-grid
            id="done"
            class="demo-drag-done"
            [data]="done()"
            keyField="id"
            [rowDragging]="true"
            rowDragGroup="tasks"
            (rowDrop)="onDrop($event)"
          >
            <oge-column field="title" caption="Done" />
          </oge-grid>
        </div>
      </app-demo-card>
    }
  `,
})
export class PinnedRowsPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly pinnedSnippet = PINNED_SNIPPET;
  protected readonly stickySnippet = STICKY_SNIPPET;
  protected readonly dragSnippet = DRAG_SNIPPET;
  protected readonly employees = makeEmployees(23, 21);
  protected readonly budget = {
    id: -1,
    firstName: 'Budget',
    department: '',
    salary: 1500000,
  };
  protected readonly totals = {
    id: 0,
    firstName: 'Total',
    department: '',
    salary: this.employees.reduce((sum, row) => sum + row.salary, 0),
  };
  protected readonly grouped = makeEmployees(400, 7).map((row) => ({
    ...row,
    hireDate: toLocalDate(row.hireDate),
  }));
  protected readonly todo = signal<Task[]>([
    { id: 1, title: 'Write specs' },
    { id: 2, title: 'Review the API' },
    { id: 3, title: 'Ship it' },
  ]);
  protected readonly done = signal<Task[]>([{ id: 4, title: 'Plan the wave' }]);

  protected onDrop(event: OgeRowDropEvent): void {
    if (event.sameComponent) return;
    const from = event.sourceComponentId === 'todo' ? this.todo : this.done;
    const to = event.targetComponentId === 'todo' ? this.todo : this.done;
    const row = event.sourceRow as Task;
    from.update((rows) => rows.filter((r) => r.id !== row.id));
    to.update((rows) => {
      const next = [...rows];
      next.splice(event.toIndex, 0, row);
      return next;
    });
  }
}
