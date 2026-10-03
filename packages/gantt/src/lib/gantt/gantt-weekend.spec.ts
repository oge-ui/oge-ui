import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { OgeGanttCore } from '@oge-ui/gantt-engine';
import { OgeGantt } from './gantt';

interface Task {
  id: string;
  title: string;
  start: Date;
  end: Date;
}

const TASKS: Task[] = [
  {
    id: 'a',
    title: 'Design',
    start: new Date(2026, 0, 5),
    end: new Date(2026, 0, 30),
  },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

async function offDays(
  inputs: Record<string, unknown>,
): Promise<{ count: number; core: OgeGanttCore<Task, unknown> }> {
  const fixture = TestBed.createComponent(OgeGantt<Task>);
  fixture.componentRef.setInput('tasks', TASKS);
  fixture.componentRef.setInput('scaleType', 'days');
  fixture.componentRef.setInput('locale', 'en-US');
  for (const [name, value] of Object.entries(inputs))
    fixture.componentRef.setInput(name, value);
  await settle(fixture);
  const el = fixture.nativeElement as HTMLElement;
  return {
    count: el.querySelectorAll('.oge-gantt-offday').length,
    // the core is protected on the component; the spec reads it directly
    core: (
      fixture.componentInstance as unknown as {
        core: OgeGanttCore<Task, unknown>;
      }
    ).core,
  };
}

describe('OgeGantt weekendDays', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shades exactly the configured weekend days', async () => {
    const none = await offDays({ weekendDays: [] });
    const friday = await offDays({ weekendDays: [5] });
    const fridaySaturday = await offDays({ weekendDays: [5, 6] });
    expect(none.count).toBe(0);
    expect(friday.count).toBeGreaterThan(0);
    expect(fridaySaturday.count).toBeGreaterThan(friday.count);
    const days = new Set(
      fridaySaturday.core.shadedTicks().map((tick) => tick.date.getDay()),
    );
    expect([...days].sort()).toEqual([5, 6]);
  });

  it('resolves the weekend from the locale when the input is unset', async () => {
    const FakeLocale = function (tag: string) {
      return {
        tag,
        getWeekInfo: () => ({ weekend: tag === 'he-IL' ? [5, 6] : [6, 7] }),
      };
    };
    vi.spyOn(Intl, 'Locale').mockImplementation(
      FakeLocale as unknown as typeof Intl.Locale,
    );
    const { core, count } = await offDays({ locale: 'he-IL' });
    expect(core.resolvedWeekendDays()).toEqual([5, 6]);
    expect(count).toBe((await offDays({ weekendDays: [5, 6] })).count);
  });
});
