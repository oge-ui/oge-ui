import { Component, signal, viewChild } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { RowKey } from '@oge-ui/core';
import { OgeGantt } from './gantt';
import type {
  OgeGanttColumn,
  OgeGanttResource,
  OgeGanttSchedulingConflictEvent,
  OgeGanttSortChangedEvent,
  OgeGanttViewMode,
} from '../gantt-types';

interface Task {
  id: string;
  parentId?: string | null;
  title: string;
  start: Date;
  end: Date;
  progress?: number;
  deadline?: Date;
  resourceId?: unknown;
  segments?: { start: Date; end: Date }[];
}
interface Link {
  id: string;
  predecessorId: string;
  successorId: string;
  type?: string;
  lag?: number;
}

const d = (day: number) => new Date(2026, 0, day);

@Component({
  imports: [OgeGantt],
  template: `
    <oge-gantt
      [tasks]="tasks()"
      [dependencies]="links()"
      [columns]="columns"
      [resources]="resources"
      [autoScheduling]="true"
      [inlineEditing]="true"
      [allowSorting]="true"
      [allowColumnResizing]="true"
      [filterRow]="true"
      [searchPanel]="true"
      selectionMode="multiple"
      [(selectedTaskKeys)]="selectedKeys"
      [(viewMode)]="viewMode"
      [showResourceHistogram]="true"
      scaleType="days"
      locale="en-US"
      style="height: 520px"
      (schedulingConflict)="conflicts.push($event)"
      (sortChanged)="sorts.push($event)"
    />
  `,
})
class Host {
  readonly gantt = viewChild.required(OgeGantt<Task, Link>);
  readonly tasks = signal<Task[]>([
    { id: 'a', title: 'Design', start: d(5), end: d(9), resourceId: 'ann' },
    { id: 'b', title: 'Build', start: d(9), end: d(14), deadline: d(12) },
    {
      id: 's',
      title: 'Split',
      start: d(5),
      end: d(12),
      segments: [
        { start: d(5), end: d(7) },
        { start: d(9), end: d(12) },
      ],
    },
  ]);
  readonly links = signal<Link[]>([
    { id: 'l1', predecessorId: 'a', successorId: 'b', type: 'FS', lag: 1 },
  ]);
  readonly columns: OgeGanttColumn[] = [
    { field: 'wbs', frozen: true },
    { field: 'title' },
    { field: 'start' },
    { field: 'predecessors' },
  ];
  readonly resources: OgeGanttResource[] = [{ id: 'ann', text: 'Ann' }];
  readonly selectedKeys = signal<readonly RowKey[]>([]);
  readonly viewMode = signal<OgeGanttViewMode>('tasks');
  readonly conflicts: OgeGanttSchedulingConflictEvent<Task>[] = [];
  readonly sorts: OgeGanttSortChangedEvent[] = [];
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('OgeGantt — G3b', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;
  let el: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
    await settle(fixture);
  });

  const rows = () => [...el.querySelectorAll<HTMLElement>('.oge-gantt-row')];

  it('renders WBS, frozen columns, lag labels, the deadline and split pieces', () => {
    expect(
      rows().map((row) =>
        row.querySelector('.oge-gantt-cell-text')?.textContent?.trim(),
      ),
    ).toEqual(['1', '2', '3']);
    const frozen = el.querySelector<HTMLElement>(
      '.oge-gantt-pane-headcell.oge-gantt-frozen',
    );
    expect(frozen?.textContent).toContain('WBS');
    expect(
      el.querySelector('.oge-gantt-arrow-label')?.textContent?.trim(),
    ).toBe('+1d');
    expect(el.querySelectorAll('.oge-gantt-segment')).toHaveLength(2);
    // auto-scheduling: Build starts a day after Design (FS+1) and overshoots
    // its deadline → overdue bar, missed marker, conflict event
    expect(el.querySelector('.oge-gantt-deadline-missed')).not.toBeNull();
    expect(host.conflicts.at(-1)?.conflicts.map((c) => c.kind)).toContain(
      'deadline',
    );
  });

  it('sorts from the header and filters from the filter row', async () => {
    const title = el.querySelectorAll<HTMLElement>(
      '.oge-gantt-pane-headcell',
    )[1];
    title.click();
    await settle(fixture);
    expect(title.getAttribute('aria-sort')).toBe('ascending');
    expect(host.sorts).toEqual([{ field: 'title', direction: 'asc' }]);
    const input = el.querySelectorAll<HTMLInputElement>(
      '.oge-gantt-filter-input',
    )[1];
    expect(input.getAttribute('aria-label')).toBe('Filter Task');
    input.value = 'spl';
    input.dispatchEvent(new Event('input'));
    await settle(fixture);
    expect(rows()).toHaveLength(1);
    const search = el.querySelector<HTMLInputElement>('.oge-gantt-search');
    expect(search?.getAttribute('aria-label')).toBe('Search tasks');
  });

  it('edits a cell inline from F2 and commits with Enter', async () => {
    const row = rows()[0];
    row.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'F2', bubbles: true }),
    );
    await settle(fixture);
    await flush();
    const editor = el.querySelector<HTMLInputElement>('.oge-gantt-cell-editor');
    expect(editor).not.toBeNull();
    expect(editor?.getAttribute('aria-label')).toBe('Task of Design');
    editor!.value = 'Design 2';
    editor!.dispatchEvent(new Event('input'));
    editor!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    await settle(fixture);
    expect(el.querySelector('.oge-gantt-cell-editor')).toBeNull();
    expect(host.gantt().getExportData().tasks[0].title).toBe('Design 2');
  });

  it('multi-selects with Ctrl-click into the two-way keys', async () => {
    rows()[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    rows()[2].dispatchEvent(
      new MouseEvent('click', { bubbles: true, ctrlKey: true }),
    );
    await settle(fixture);
    expect(host.selectedKeys()).toEqual(['a', 's']);
    expect(
      el
        .querySelector('[role="treegrid"]')
        ?.getAttribute('aria-multiselectable'),
    ).toBe('true');
    expect(
      rows().filter((row) => row.getAttribute('aria-selected') === 'true'),
    ).toHaveLength(2);
  });

  it('toggles the resource view and renders the histogram', async () => {
    expect(el.querySelectorAll('.oge-gantt-histogram-row')).toHaveLength(1);
    expect(
      el.querySelector('.oge-gantt-histogram-row')?.getAttribute('aria-label'),
    ).toContain('Ann');
    const toggle = el.querySelector<HTMLButtonElement>('.oge-gantt-btn-toggle');
    toggle?.click();
    await settle(fixture);
    expect(host.viewMode()).toBe('resources');
    expect(toggle?.getAttribute('aria-pressed')).toBe('true');
    expect(rows()[0].classList).toContain('oge-gantt-row-group');
  });

  it('offers the zoom presets in the toolbar', async () => {
    const select = el.querySelector<HTMLSelectElement>('.oge-gantt-select');
    expect(select?.getAttribute('aria-label')).toBe('Timeline scale');
    expect([...(select?.options ?? [])].map((o) => o.text.trim())).toContain(
      'Quarters',
    );
    select!.value = '4';
    select!.dispatchEvent(new Event('change'));
    await settle(fixture);
    expect(el.querySelector('.oge-gantt-scale-minor')?.textContent).toContain(
      'Q1',
    );
  });
});
