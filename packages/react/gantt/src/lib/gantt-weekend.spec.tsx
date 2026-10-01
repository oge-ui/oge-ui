import { act, render } from '@testing-library/react';
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

async function offDayCount(props: {
  weekendDays?: readonly number[];
  locale?: string;
}): Promise<number> {
  const { container, unmount } = render(
    <OgeGantt<Task>
      tasks={TASKS}
      scaleType="days"
      locale={props.locale ?? 'en-US'}
      weekendDays={props.weekendDays}
      style={{ height: 480 }}
    />,
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  const count = container.querySelectorAll('.oge-gantt-offday').length;
  unmount();
  return count;
}

describe('OgeGantt weekendDays', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shades exactly the configured weekend days', async () => {
    const none = await offDayCount({ weekendDays: [] });
    const friday = await offDayCount({ weekendDays: [5] });
    const fridaySaturday = await offDayCount({ weekendDays: [5, 6] });
    expect(none).toBe(0);
    expect(friday).toBeGreaterThan(0);
    expect(fridaySaturday).toBeGreaterThan(friday);
  });

  it('resolves the weekend from the locale when the prop is unset', async () => {
    const explicit = await offDayCount({ weekendDays: [5] });
    const FakeLocale = function (tag: string) {
      return {
        tag,
        getWeekInfo: () => ({ weekend: tag === 'fa-IR' ? [5] : [6, 7] }),
      };
    };
    vi.spyOn(Intl, 'Locale').mockImplementation(
      FakeLocale as unknown as typeof Intl.Locale,
    );
    expect(await offDayCount({ locale: 'fa-IR' })).toBe(explicit);
  });
});
