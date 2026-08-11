import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeGantt } from './gantt';
import type {
  OgeGanttTaskUpdatedEvent,
  OgeGanttDependencyInsertedEvent,
} from '../gantt-types';

interface Task {
  id: string;
  parentId?: string | null;
  title: string;
  start: Date | string;
  end: Date | string;
  progress?: number;
  color?: string;
  baselineStart?: Date;
  baselineEnd?: Date;
}

interface Link {
  id: string;
  predecessorId: string;
  successorId: string;
  type?: string;
}

@Component({
  imports: [OgeGantt],
  template: `
    <oge-gantt
      [tasks]="tasks()"
      [dependencies]="links()"
      [showCriticalPath]="showCritical()"
      scaleType="days"
      locale="en-US"
      style="height: 480px"
      (taskUpdated)="updated.push($event)"
      (dependencyInserted)="inserted.push($event)"
    />
  `,
})
class Host {
  readonly tasks = signal<Task[]>([
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
  ]);
  readonly links = signal<Link[]>([
    { id: 'l1', predecessorId: 'a', successorId: 'b', type: 'FS' },
    { id: 'l2', predecessorId: 'b', successorId: 'm', type: 'FS' },
  ]);
  readonly showCritical = signal(false);
  readonly updated: OgeGanttTaskUpdatedEvent<Task>[] = [];
  readonly inserted: OgeGanttDependencyInsertedEvent<Link>[] = [];
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

describe('<oge-gantt>', () => {
  let fixture: ComponentFixture<Host>;
  let host: HTMLElement;

  beforeEach(async () => {
    vi.stubGlobal(
      'requestAnimationFrame',
      (cb: FrameRequestCallback) =>
        setTimeout(() => cb(performance.now()), 0) as unknown as number,
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
    fixture = TestBed.createComponent(Host);
    await settle(fixture);
    host = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function rows(): HTMLElement[] {
    return Array.from(host.querySelectorAll<HTMLElement>('.oge-gantt-row'));
  }

  it('renders the tree pane, bars, milestone, summary, baseline and arrows', () => {
    expect(rows().length).toBe(4);
    expect(rows()[0].textContent).toContain('Phase 1');
    expect(rows()[0].getAttribute('aria-level')).toBe('1');
    expect(rows()[1].getAttribute('aria-level')).toBe('2');
    expect(host.querySelectorAll('.oge-gantt-bar').length).toBe(2);
    expect(host.querySelectorAll('.oge-gantt-summary').length).toBe(1);
    expect(host.querySelectorAll('.oge-gantt-milestone').length).toBe(1);
    expect(host.querySelectorAll('.oge-gantt-baseline').length).toBe(1);
    expect(host.querySelectorAll('.oge-gantt-arrow').length).toBe(2);
    // summary rolls its dates up from children
    expect(rows()[0].textContent).toContain('16');
  });

  it('collapse hides the subtree; expandAll restores it', async () => {
    host.querySelector<HTMLElement>('.oge-gantt-toggle')?.click();
    await settle(fixture);
    expect(rows().length).toBe(1);
    const gantt = fixture.debugElement.children[0]
      .componentInstance as OgeGantt<Task, Link>;
    gantt.expandAll();
    await settle(fixture);
    expect(rows().length).toBe(4);
  });

  it('row click selects (pane + chart lane share the highlight)', async () => {
    rows()[1].click();
    await settle(fixture);
    expect(rows()[1].classList.contains('oge-gantt-row-selected')).toBe(true);
    expect(
      host.querySelectorAll('.oge-gantt-lane.oge-gantt-row-selected').length,
    ).toBe(1);
  });

  it('double-click opens the edit dialog; saving patches the task', async () => {
    rows()[1].dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await settle(fixture);
    const form = host.querySelector('.oge-gantt-dialog-form');
    expect(form).toBeTruthy();
    const title = form?.querySelector<HTMLInputElement>('input');
    title!.value = 'Design v2';
    title!.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    Array.from(
      host.querySelectorAll<HTMLButtonElement>(
        '.oge-gantt-dialog-footer .oge-gantt-btn',
      ),
    )
      .find((btn) => btn.textContent?.trim() === 'Save')
      ?.click();
    await settle(fixture);
    expect(fixture.componentInstance.updated.at(-1)?.taskData.title).toBe(
      'Design v2',
    );
  });

  it('critical path marks the driving chain', async () => {
    fixture.componentInstance.showCritical.set(true);
    await settle(fixture);
    // Design→Build→Release all drive the finish
    expect(
      host.querySelectorAll('.oge-gantt-critical').length,
    ).toBeGreaterThanOrEqual(2);
    expect(
      host.querySelectorAll('.oge-gantt-arrow-critical').length,
    ).toBe(2);
  });

  it('insertDependency rejects cycles and undo reverts a commit', async () => {
    const gantt = fixture.debugElement.children[0]
      .componentInstance as OgeGantt<Task, Link>;
    gantt.insertDependency('m', 'a'); // would close a→b→m→a
    await settle(fixture);
    expect(fixture.componentInstance.inserted.length).toBe(0);
    expect(host.querySelector('.oge-gantt-live')?.textContent).toContain(
      'cycle',
    );

    gantt.insertDependency('a', 'm', 'SS');
    await settle(fixture);
    expect(fixture.componentInstance.inserted.length).toBe(1);
    expect(host.querySelectorAll('.oge-gantt-arrow').length).toBe(3);
    gantt.undo();
    await settle(fixture);
    expect(host.querySelectorAll('.oge-gantt-arrow').length).toBe(2);
    gantt.redo();
    await settle(fixture);
    expect(host.querySelectorAll('.oge-gantt-arrow').length).toBe(3);
  });

  it('keyboard: Ctrl+ArrowRight moves the focused bar one unit', async () => {
    rows()[1].click();
    await settle(fixture);
    rows()[1].dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        ctrlKey: true,
        bubbles: true,
      }),
    );
    await settle(fixture);
    const updated = fixture.componentInstance.updated.at(-1)?.taskData;
    expect(updated?.start).toEqual(new Date(2026, 0, 6));
    expect(updated?.end).toEqual(new Date(2026, 0, 10));
  });

  it('string dates round-trip their storage shape through edits', async () => {
    fixture.componentInstance.tasks.set([
      {
        id: 's',
        title: 'Stringy',
        start: '2026-01-05',
        end: '2026-01-08',
      },
    ]);
    await settle(fixture);
    rows()[0].click();
    rows()[0].dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        ctrlKey: true,
        bubbles: true,
      }),
    );
    await settle(fixture);
    const updated = fixture.componentInstance.updated.at(-1)?.taskData;
    expect(updated?.start).toBe('2026-01-06');
    expect(updated?.end).toBe('2026-01-09');
  });

  it('right-click opens the built-in menu and indent reparents to the previous sibling', async () => {
    // 'Build' (b) sits after its sibling 'Design' (a) under 'Phase 1'
    rows()[2].dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
    );
    await settle(fixture);
    const menu = host.querySelector('.oge-gantt-menu');
    expect(menu).not.toBeNull();
    const indent = Array.from(
      menu?.querySelectorAll<HTMLButtonElement>('.oge-gantt-menu-item') ?? [],
    ).find((button) => button.textContent?.includes('Indent'));
    indent?.click();
    await settle(fixture);
    expect(host.querySelector('.oge-gantt-menu')).toBeNull();
    const updated = fixture.componentInstance.updated.at(-1)?.taskData;
    expect(updated?.id).toBe('b');
    expect(updated?.parentId).toBe('a');
    // 'Build' now renders one level deeper
    const buildRow = rows().find((row) => row.textContent?.includes('Build'));
    expect(buildRow?.getAttribute('aria-level')).toBe('3');
  });

  it('Alt+Shift+ArrowLeft outdents the focused row', async () => {
    rows()[1].click(); // 'Design', child of 'Phase 1'
    rows()[1].dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowLeft',
        altKey: true,
        shiftKey: true,
        bubbles: true,
      }),
    );
    await settle(fixture);
    const updated = fixture.componentInstance.updated.at(-1)?.taskData;
    expect(updated?.id).toBe('a');
    expect(updated?.parentId).toBeNull();
  });

  it('shows the empty state with a create button when no tasks exist', async () => {
    fixture.componentInstance.tasks.set([]);
    await settle(fixture);
    const empty = host.querySelector('.oge-gantt-empty');
    expect(empty).not.toBeNull();
    expect(empty?.textContent).toContain('No tasks yet');
    expect(empty?.querySelector('button')).not.toBeNull();
  });
});
