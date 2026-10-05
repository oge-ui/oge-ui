import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { StrictMode, createRef } from 'react';
import type { RowKey } from '@oge-ui/core';
import type {
  OgeGanttColumn,
  OgeGanttSchedulingConflictEvent,
  OgeGanttViewMode,
} from '@oge-ui/gantt-engine';
import { exportGanttToMsProject } from '../export-msproject';
import { OgeGantt } from './gantt';
import type { OgeGanttHandle } from './gantt-types';

interface Task {
  id: string;
  parentId?: string | null;
  title: string;
  start: Date;
  end: Date;
  progress?: number;
  deadline?: Date;
  resourceId?: unknown;
}
interface Link {
  id: string;
  predecessorId: string;
  successorId: string;
  type?: string;
  lag?: number;
}

const d = (day: number) => new Date(2026, 0, day);
const TASKS: Task[] = [
  { id: 'a', title: 'Design', start: d(5), end: d(9), resourceId: 'ann' },
  { id: 'b', title: 'Build', start: d(9), end: d(14), deadline: d(12) },
  { id: 'c', title: 'Close', start: d(14), end: d(15) },
];
const LINKS: Link[] = [
  { id: 'l1', predecessorId: 'a', successorId: 'b', type: 'FS', lag: 1 },
];
const COLUMNS: OgeGanttColumn[] = [
  { field: 'wbs', frozen: true },
  { field: 'title' },
  { field: 'predecessors' },
];
const RESOURCES = [{ id: 'ann', text: 'Ann' }];

const rows = () =>
  Array.from(document.querySelectorAll<HTMLElement>('.oge-gantt-row'));

describe('<OgeGantt> — G3b', () => {
  it('schedules with lag, reports conflicts and renders the new marks (StrictMode)', async () => {
    const conflicts: OgeGanttSchedulingConflictEvent<Task>[] = [];
    render(
      <StrictMode>
        <OgeGantt<Task, Link>
          tasks={TASKS}
          dependencies={LINKS}
          columns={COLUMNS}
          autoScheduling
          locale="en-US"
          onSchedulingConflict={(event) => conflicts.push(event)}
          style={{ height: 480 }}
        />
      </StrictMode>,
    );
    expect(
      rows().map(
        (row) => row.querySelector('.oge-gantt-cell-text')?.textContent,
      ),
    ).toEqual(['1', '2', '3']);
    expect(document.querySelector('.oge-gantt-arrow-label')?.textContent).toBe(
      '+1d',
    );
    expect(document.querySelector('.oge-gantt-deadline')).not.toBeNull();
    await waitFor(() =>
      expect(conflicts.at(-1)?.conflicts.length ?? 0).toBeGreaterThan(0),
    );
  });

  it('edits inline, multi-selects and exposes the handle methods', async () => {
    const ref = createRef<OgeGanttHandle<Task, Link>>();
    const keys: (readonly RowKey[])[] = [];
    render(
      <StrictMode>
        <OgeGantt<Task, Link>
          ref={ref}
          tasks={TASKS}
          dependencies={LINKS}
          columns={COLUMNS}
          inlineEditing
          selectionMode="multiple"
          onSelectedTaskKeysChange={(next) => keys.push(next)}
          locale="en-US"
          style={{ height: 480 }}
        />
      </StrictMode>,
    );
    fireEvent.keyDown(rows()[0], { key: 'F2' });
    await waitFor(() =>
      expect(document.querySelector('.oge-gantt-cell-editor')).not.toBeNull(),
    );
    const editor = document.querySelector<HTMLInputElement>(
      '.oge-gantt-cell-editor',
    )!;
    expect(editor.getAttribute('aria-label')).toBe('Task of Design');
    fireEvent.change(editor, { target: { value: 'Design 2' } });
    fireEvent.keyDown(editor, { key: 'Enter' });
    expect(ref.current?.getExportData().tasks[0].title).toBe('Design 2');

    fireEvent.click(rows()[0]);
    fireEvent.click(rows()[2], { shiftKey: true });
    expect(keys.at(-1)).toEqual(['a', 'b', 'c']);
    act(() => {
      ref.current?.deleteTasks(
        ref.current
          .getSelectedTasks()
          .slice(1)
          .map((task) => task.source),
      );
    });
    expect(rows()).toHaveLength(1);
    act(() => ref.current?.sortBy('title', 'desc'));
    act(() => ref.current?.setColumnWidth('title', 240));
    expect(ref.current?.getTaskSlack('a')).not.toBeNull();
  });

  it('switches to the resource view and exports MS Project XML', () => {
    const ref = createRef<OgeGanttHandle<Task, Link>>();
    const modes: OgeGanttViewMode[] = [];
    render(
      <OgeGantt<Task, Link>
        ref={ref}
        tasks={TASKS}
        dependencies={LINKS}
        resources={RESOURCES}
        showResourceHistogram
        onViewModeChange={(mode) => modes.push(mode)}
        locale="en-US"
        style={{ height: 480 }}
      />,
    );
    expect(document.querySelectorAll('.oge-gantt-histogram-row')).toHaveLength(
      1,
    );
    fireEvent.click(document.querySelector('.oge-gantt-btn-toggle')!);
    expect(modes).toEqual(['resources']);
    expect(rows()[0].classList).toContain('oge-gantt-row-group');
    const xml = exportGanttToMsProject(ref.current!, { download: false });
    expect(xml).toContain('<Name>Ann</Name>');
    expect(xml).toContain('<LinkLag>4800</LinkLag>');
  });

  it('edits a link from the dependency editor', () => {
    const updated: unknown[] = [];
    render(
      <OgeGantt<Task, Link>
        tasks={TASKS}
        dependencies={LINKS}
        onDependencyUpdated={(event) => updated.push(event.dependencyData)}
        locale="en-US"
        style={{ height: 480 }}
      />,
    );
    const arrow = document.querySelector('.oge-gantt-arrow')!;
    fireEvent.doubleClick(arrow);
    const dialog = document.querySelector('.oge-gantt-dep-editor')!;
    expect(dialog.getAttribute('aria-label')).toBe('Edit dependency');
    const [type] = dialog.querySelectorAll('select');
    fireEvent.change(type, { target: { value: 'SS' } });
    fireEvent.change(dialog.querySelector('input')!, {
      target: { value: '-2' },
    });
    fireEvent.click(dialog.querySelector('.oge-gantt-btn-primary')!);
    expect(updated).toEqual([
      {
        id: 'l1',
        predecessorId: 'a',
        successorId: 'b',
        type: 'SS',
        lag: -2,
        lagUnit: 'days',
      },
    ]);
    expect(document.querySelector('.oge-gantt-dep-editor')).toBeNull();
  });
});
