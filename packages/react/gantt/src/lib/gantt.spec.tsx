import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { StrictMode, createRef, useState } from 'react';
import type { RowKey } from '@oge-ui/core';
import { buildGanttExcelWorkbook } from '@oge-ui/gantt-engine/export-excel';
import { OgeGantt } from './gantt';
import { OgeGanttConfigProvider } from './gantt-config';
import type { OgeGanttHandle, OgeGanttProps } from './gantt-types';
import type {
  OgeGanttDependencyInsertedEvent,
  OgeGanttScaleType,
  OgeGanttTaskUpdatedEvent,
} from '@oge-ui/gantt-engine';

interface Task {
  id: string;
  parentId?: string | null;
  title: string;
  start: Date | string;
  end: Date | string;
  progress?: number;
  baselineStart?: Date;
  baselineEnd?: Date;
  resourceId?: unknown;
}

interface Link {
  id: string;
  predecessorId: string;
  successorId: string;
  type?: string;
}

const TASKS: Task[] = [
  {
    id: 'p',
    title: 'Phase 1',
    start: new Date(2026, 0, 5),
    end: new Date(2026, 0, 5),
  },
  {
    id: 'a',
    parentId: 'p',
    title: 'Design',
    start: new Date(2026, 0, 5),
    end: new Date(2026, 0, 9),
    progress: 60,
    baselineStart: new Date(2026, 0, 5),
    baselineEnd: new Date(2026, 0, 8),
  },
  {
    id: 'b',
    parentId: 'p',
    title: 'Build',
    start: new Date(2026, 0, 9),
    end: new Date(2026, 0, 16),
    progress: 20,
  },
  {
    id: 'm',
    parentId: 'p',
    title: 'Release',
    start: new Date(2026, 0, 16),
    end: new Date(2026, 0, 16),
  },
];

const LINKS: Link[] = [
  { id: 'l1', predecessorId: 'a', successorId: 'b', type: 'FS' },
  { id: 'l2', predecessorId: 'b', successorId: 'm', type: 'FS' },
];

const rows = () =>
  Array.from(document.querySelectorAll<HTMLElement>('.oge-gantt-row'));

async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function Harness(
  props: Partial<OgeGanttProps<Task, Link>> & {
    handle?: React.Ref<OgeGanttHandle<Task, Link>>;
  },
) {
  const { handle, ...rest } = props;
  return (
    <OgeGantt<Task, Link>
      ref={handle}
      tasks={TASKS}
      dependencies={LINKS}
      locale="en-US"
      style={{ height: 480 }}
      {...rest}
    />
  );
}

describe('<OgeGantt>', () => {
  it('renders the tree pane, bars, milestone, summary, baseline and arrows', () => {
    render(<Harness />);
    expect(rows()).toHaveLength(4);
    expect(rows()[0].textContent).toContain('Phase 1');
    expect(rows()[0].getAttribute('aria-level')).toBe('1');
    expect(rows()[1].getAttribute('aria-level')).toBe('2');
    expect(document.querySelectorAll('.oge-gantt-bar')).toHaveLength(2);
    expect(document.querySelectorAll('.oge-gantt-summary')).toHaveLength(1);
    expect(document.querySelectorAll('.oge-gantt-milestone')).toHaveLength(1);
    expect(document.querySelectorAll('.oge-gantt-baseline')).toHaveLength(1);
    expect(document.querySelectorAll('.oge-gantt-arrow')).toHaveLength(2);
    // summary rolls its dates up from its children
    expect(rows()[0].textContent).toContain('16');
    // same host / treegrid semantics as the Angular template
    expect(
      document.querySelector('.oge-gantt [role="treegrid"]'),
    ).not.toBeNull();
  });

  it('paints a roving tab stop on the first frame', () => {
    render(<Harness />);
    expect(rows()[0].getAttribute('tabindex')).toBe('0');
    expect(rows()[1].getAttribute('tabindex')).toBe('-1');
  });

  it('collapse hides the subtree; the handle’s expandAll restores it', async () => {
    const handle = createRef<OgeGanttHandle<Task, Link>>();
    render(<Harness handle={handle} />);
    fireEvent.click(document.querySelector('.oge-gantt-toggle') as Element);
    expect(rows()).toHaveLength(1);
    act(() => handle.current?.expandAll());
    expect(rows()).toHaveLength(4);
    act(() => handle.current?.collapseAll());
    expect(rows()).toHaveLength(1);
    act(() => handle.current?.expandToTask('b'));
    expect(rows()).toHaveLength(4);
  });

  it('row click selects — pane row and chart lane share the highlight', () => {
    const onSelectionChanged = vi.fn();
    const onSelectedTaskKeyChange = vi.fn();
    render(
      <Harness
        onSelectionChanged={onSelectionChanged}
        onSelectedTaskKeyChange={onSelectedTaskKeyChange}
      />,
    );
    fireEvent.click(rows()[1]);
    expect(rows()[1].classList.contains('oge-gantt-row-selected')).toBe(true);
    expect(
      document.querySelectorAll('.oge-gantt-lane.oge-gantt-row-selected'),
    ).toHaveLength(1);
    expect(onSelectedTaskKeyChange).toHaveBeenCalledWith('a');
    expect(onSelectionChanged.mock.calls[0][0].task.key).toBe('a');
  });

  it('applies an initial selectedTaskKey at mount, controlled or not', () => {
    const { unmount } = render(<Harness defaultSelectedTaskKey="b" />);
    expect(rows()[2].classList.contains('oge-gantt-row-selected')).toBe(true);
    unmount();
    render(<Harness selectedTaskKey="m" />);
    expect(rows()[3].classList.contains('oge-gantt-row-selected')).toBe(true);
    // controlled: a click reports but does not move the selection by itself
    fireEvent.click(rows()[1]);
    expect(rows()[3].classList.contains('oge-gantt-row-selected')).toBe(true);
  });

  it('double-click opens the edit dialog; saving patches the task', async () => {
    const onTaskUpdated = vi.fn();
    const onTaskEditDialogShowing = vi.fn();
    render(
      <Harness
        onTaskUpdated={onTaskUpdated}
        onTaskEditDialogShowing={onTaskEditDialogShowing}
      />,
    );
    fireEvent.doubleClick(rows()[1]);
    await settle();
    expect(onTaskEditDialogShowing).toHaveBeenCalledTimes(1);
    expect(onTaskEditDialogShowing.mock.calls[0][0].isNew).toBe(false);
    const form = document.querySelector('.oge-gantt-dialog-form');
    expect(form).not.toBeNull();
    const title = form?.querySelector<HTMLInputElement>('input');
    fireEvent.change(title as HTMLInputElement, {
      target: { value: 'Design v2' },
    });
    await settle();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await settle();
    const updated = onTaskUpdated.mock.calls.at(-1)?.[0] as
      OgeGanttTaskUpdatedEvent<Task> | undefined;
    expect(updated?.taskData.title).toBe('Design v2');
    expect(rows()[1].textContent).toContain('Design v2');
  });

  it('a canceled dialog-showing event keeps the dialog closed', async () => {
    render(
      <Harness
        onTaskEditDialogShowing={(event) => {
          event.cancel = true;
        }}
      />,
    );
    fireEvent.doubleClick(rows()[1]);
    await settle();
    expect(document.querySelector('.oge-gantt-dialog-form')).toBeNull();
  });

  it('critical path marks the driving chain', () => {
    render(<Harness showCriticalPath />);
    expect(
      document.querySelectorAll('.oge-gantt-critical').length,
    ).toBeGreaterThanOrEqual(2);
    expect(document.querySelectorAll('.oge-gantt-arrow-critical')).toHaveLength(
      2,
    );
  });

  it('insertDependency rejects cycles; undo / redo revert and re-apply', async () => {
    const handle = createRef<OgeGanttHandle<Task, Link>>();
    const inserted: OgeGanttDependencyInsertedEvent<Link>[] = [];
    render(
      <Harness
        handle={handle}
        onDependencyInserted={(event) => inserted.push(event)}
      />,
    );
    act(() => handle.current?.insertDependency('m', 'a'));
    expect(inserted).toHaveLength(0);
    // announced through the document's shared live region
    await waitFor(() =>
      expect(
        document.querySelector('[data-oge-live-announcer="polite"]')
          ?.textContent,
      ).toContain('cycle'),
    );
    act(() => handle.current?.insertDependency('a', 'm', 'SS'));
    expect(inserted).toHaveLength(1);
    expect(document.querySelectorAll('.oge-gantt-arrow')).toHaveLength(3);
    act(() => handle.current?.undo());
    expect(document.querySelectorAll('.oge-gantt-arrow')).toHaveLength(2);
    act(() => handle.current?.redo());
    expect(document.querySelectorAll('.oge-gantt-arrow')).toHaveLength(3);
  });

  it('keyboard: Ctrl+ArrowRight moves the focused bar one unit', () => {
    const onTaskUpdated = vi.fn();
    render(<Harness onTaskUpdated={onTaskUpdated} />);
    fireEvent.click(rows()[1]);
    fireEvent.keyDown(rows()[1], { key: 'ArrowRight', ctrlKey: true });
    const updated = onTaskUpdated.mock.calls.at(-1)?.[0].taskData as Task;
    expect(updated.start).toEqual(new Date(2026, 0, 6));
    expect(updated.end).toEqual(new Date(2026, 0, 10));
  });

  it('string dates round-trip their storage shape through edits', () => {
    const onTaskUpdated = vi.fn();
    render(
      <Harness
        tasks={[
          { id: 's', title: 'Stringy', start: '2026-01-05', end: '2026-01-08' },
        ]}
        dependencies={[]}
        onTaskUpdated={onTaskUpdated}
      />,
    );
    fireEvent.click(rows()[0]);
    fireEvent.keyDown(rows()[0], { key: 'ArrowRight', ctrlKey: true });
    const updated = onTaskUpdated.mock.calls.at(-1)?.[0].taskData as Task;
    expect(updated.start).toBe('2026-01-06');
    expect(updated.end).toBe('2026-01-09');
  });

  it('onTaskUpdating can veto an edit', () => {
    const onTaskUpdated = vi.fn();
    render(
      <Harness
        onTaskUpdating={(event) => {
          event.cancel = true;
        }}
        onTaskUpdated={onTaskUpdated}
      />,
    );
    fireEvent.keyDown(rows()[1], { key: 'ArrowRight', ctrlKey: true });
    expect(onTaskUpdated).not.toHaveBeenCalled();
  });

  it('right-click opens the built-in menu; indent reparents to the previous sibling', async () => {
    const onTaskUpdated = vi.fn();
    const onTaskContextMenu = vi.fn();
    render(
      <Harness
        onTaskUpdated={onTaskUpdated}
        onTaskContextMenu={onTaskContextMenu}
      />,
    );
    fireEvent.contextMenu(rows()[2]);
    expect(onTaskContextMenu).toHaveBeenCalledTimes(1);
    const menu = document.querySelector('.oge-gantt-menu');
    expect(menu).not.toBeNull();
    const indent = Array.from(
      menu?.querySelectorAll<HTMLButtonElement>('.oge-gantt-menu-item') ?? [],
    ).find((button) => button.textContent?.includes('Indent'));
    fireEvent.click(indent as HTMLButtonElement);
    expect(document.querySelector('.oge-gantt-menu')).toBeNull();
    const updated = onTaskUpdated.mock.calls.at(-1)?.[0].taskData as Task;
    expect(updated.id).toBe('b');
    expect(updated.parentId).toBe('a');
    const buildRow = rows().find((row) => row.textContent?.includes('Build'));
    expect(buildRow?.getAttribute('aria-level')).toBe('3');
    await settle();
  });

  it('Alt+Shift+ArrowLeft outdents the focused row', () => {
    const onTaskUpdated = vi.fn();
    render(<Harness onTaskUpdated={onTaskUpdated} />);
    fireEvent.click(rows()[1]);
    fireEvent.keyDown(rows()[1], {
      key: 'ArrowLeft',
      altKey: true,
      shiftKey: true,
    });
    const updated = onTaskUpdated.mock.calls.at(-1)?.[0].taskData as Task;
    expect(updated.id).toBe('a');
    expect(updated.parentId).toBeNull();
  });

  it('shows the empty state with a create button when no tasks exist', () => {
    render(<Harness tasks={[]} dependencies={[]} />);
    const empty = document.querySelector('.oge-gantt-empty');
    expect(empty).not.toBeNull();
    expect(empty?.textContent).toContain('No tasks yet');
    expect(empty?.querySelector('button')).not.toBeNull();
  });

  it('readOnly hides every editing affordance', () => {
    render(<Harness readOnly />);
    expect(document.querySelector('.oge-gantt-btn-add')).toBeNull();
    expect(document.querySelector('.oge-gantt-handle')).toBeNull();
    expect(document.querySelector('.oge-gantt-link-dot')).toBeNull();
    fireEvent.contextMenu(rows()[1]);
    expect(document.querySelector('.oge-gantt-menu')).toBeNull();
  });

  it('scaleType is a controlled/uncontrolled pair', () => {
    function Controlled() {
      const [scale, setScale] = useState<OgeGanttScaleType>('quarters');
      return (
        <>
          <output data-testid="scale">{scale}</output>
          <Harness scaleType={scale} onScaleTypeChange={setScale} />
        </>
      );
    }
    render(<Controlled />);
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(screen.getByTestId('scale').textContent).toBe('years');
    expect(
      (screen.getByRole('button', { name: 'Zoom out' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it('uncontrolled defaultScaleType zooms internally', () => {
    const onScaleTypeChange = vi.fn();
    render(
      <Harness defaultScaleType="days" onScaleTypeChange={onScaleTypeChange} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(onScaleTypeChange).toHaveBeenCalledWith('hours');
    expect(
      (screen.getByRole('button', { name: 'Zoom in' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it('renderTask and renderTooltip replace the bar title and the tooltip', () => {
    render(
      <Harness
        renderTask={({ task }) => (
          <em className="custom-title">{task.title}!</em>
        )}
        renderTooltip={({ task }) => (
          <span className="custom-tip">{task.progress}% complete</span>
        )}
      />,
    );
    expect(document.querySelectorAll('.custom-title')).toHaveLength(2);
    fireEvent.mouseEnter(document.querySelector('.oge-gantt-bar') as Element);
    expect(document.querySelector('.custom-tip')?.textContent).toBe(
      '60% complete',
    );
  });

  it('the config provider localizes, and re-resolves when its config changes', () => {
    function Localized() {
      const [label, setLabel] = useState('Heute');
      return (
        <OgeGanttConfigProvider
          config={{
            messages: {
              toolbar: {
                label: 'Werkzeuge',
                today: label,
                zoomIn: 'Vergrößern',
                zoomOut: 'Verkleinern',
                zoomToFit: 'Einpassen',
                expandAll: 'Alle öffnen',
                collapseAll: 'Alle schließen',
                addTask: 'Neue Aufgabe',
                undo: 'Rückgängig',
                redo: 'Wiederholen',
              },
            },
          }}
        >
          <button type="button" onClick={() => setLabel('Jetzt')}>
            switch
          </button>
          <Harness />
        </OgeGanttConfigProvider>
      );
    }
    render(<Localized />);
    expect(screen.getByRole('button', { name: 'Heute' })).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'switch' }));
    expect(screen.getByRole('button', { name: 'Jetzt' })).not.toBeNull();
  });

  it('the handle feeds the shared export builders', () => {
    const handle = createRef<OgeGanttHandle<Task, Link>>();
    render(<Harness handle={handle} />);
    const data = handle.current?.getExportData();
    expect(data?.tasks).toHaveLength(4);
    const sheet = buildGanttExcelWorkbook(data!).getWorksheet('Tasks');
    expect(sheet?.getRow(1).getCell(1).value).toBe('Task');
  });

  it('survives StrictMode double effects', async () => {
    const onTaskUpdated = vi.fn();
    const handle = createRef<OgeGanttHandle<Task, Link>>();
    render(
      <StrictMode>
        <Harness handle={handle} onTaskUpdated={onTaskUpdated} />
      </StrictMode>,
    );
    await settle();
    expect(rows()).toHaveLength(4);
    // the revived core still edits, gestures and undoes after the remount
    fireEvent.keyDown(rows()[1], { key: 'ArrowRight', ctrlKey: true });
    expect(onTaskUpdated).toHaveBeenCalledTimes(1);
    act(() => handle.current?.undo());
    await waitFor(() =>
      expect(rows()[1].getAttribute('aria-label')).toContain('Jan 9, 2026'),
    );
  });

  it('keeps the undo history across re-renders with inline defaults', () => {
    const handle = createRef<OgeGanttHandle<Task, Link>>();
    function Rerendering() {
      const [, setTick] = useState(0);
      return (
        <>
          <button type="button" onClick={() => setTick((n) => n + 1)}>
            tick
          </button>
          <OgeGantt<Task, Link> ref={handle} tasks={TASKS} locale="en-US" />
        </>
      );
    }
    render(<Rerendering />);
    act(() =>
      handle.current?.insertTask({
        id: 'n',
        title: 'New',
        start: new Date(2026, 0, 20),
        end: new Date(2026, 0, 21),
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'tick' }));
    const undo = screen.getByRole('button', {
      name: 'Undo',
    }) as HTMLButtonElement;
    expect(undo.disabled).toBe(false);
  });

  it('keeps row keys for the selected-key type', () => {
    const key: RowKey = 'a';
    render(<Harness selectedTaskKey={key} />);
    expect(rows()[1].getAttribute('aria-selected')).toBe('true');
  });

  describe('right-to-left', () => {
    const gantt = () => document.querySelector('.oge-gantt') as HTMLElement;

    it('rtlEnabled sets dir + the rtl class and mirrors the arrow group', () => {
      const { rerender } = render(<Harness rtlEnabled />);
      expect(gantt().getAttribute('dir')).toBe('rtl');
      expect(gantt().classList).toContain('oge-gantt-rtl');
      const svg = document.querySelector('.oge-gantt-arrows') as SVGElement;
      expect(svg.querySelector('g')?.getAttribute('transform')).toBe(
        `matrix(-1 0 0 1 ${svg.getAttribute('width')} 0)`,
      );
      rerender(<Harness rtlEnabled={false} />);
      expect(gantt().getAttribute('dir')).toBe('ltr');
      expect(svg.querySelector('g')?.hasAttribute('transform')).toBe(false);
    });

    it('unset follows a dir="rtl" ancestor, live', async () => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('dir', 'rtl');
      document.body.append(wrapper);
      render(<Harness />, { container: wrapper });
      await settle();
      expect(gantt().classList).toContain('oge-gantt-rtl');
      expect(gantt().hasAttribute('dir')).toBe(false);
      wrapper.setAttribute('dir', 'ltr');
      await settle();
      expect(gantt().classList).not.toContain('oge-gantt-rtl');
    });

    it('Ctrl+ArrowLeft moves the focused bar later in RTL', () => {
      const onTaskUpdated = vi.fn();
      render(<Harness rtlEnabled onTaskUpdated={onTaskUpdated} />);
      fireEvent.click(rows()[1]);
      fireEvent.keyDown(rows()[1], { key: 'ArrowLeft', ctrlKey: true });
      const updated = onTaskUpdated.mock.calls.at(-1)?.[0].taskData as Task;
      expect(updated.start).toEqual(new Date(2026, 0, 6));
    });
  });
});
