import { render, waitFor } from '@testing-library/react';
import type { OgeSchedulerView } from '@oge-ui/scheduler-engine';
import { OgeScheduler } from './scheduler';

interface Appt {
  id: number;
  text: string;
  startDate: Date;
  endDate: Date;
}

function renderScheduler(props: {
  view: OgeSchedulerView;
  weekendDays?: readonly number[];
  locale?: string;
}) {
  return render(
    <OgeScheduler<Appt>
      dataSource={[]}
      defaultCurrentDate={new Date(2026, 7, 6)}
      currentView={props.view}
      views={['week', 'workWeek', 'month']}
      firstDayOfWeek={1}
      dayStartHour={8}
      dayEndHour={18}
      showCurrentTimeIndicator={false}
      locale={props.locale ?? 'en-US'}
      weekendDays={props.weekendDays}
    />,
  ).container;
}

const count = (host: Element, selector: string): number =>
  host.querySelectorAll(selector).length;

describe('OgeScheduler weekendDays', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shades an explicit weekend instead of Saturday + Sunday', async () => {
    const byDefault = renderScheduler({ view: 'week' });
    await waitFor(() =>
      expect(
        count(byDefault, '.oge-scheduler-rows .oge-scheduler-cell-weekend'),
      ).toBe(40),
    );
    const friday = renderScheduler({ view: 'week', weekendDays: [5] });
    await waitFor(() =>
      expect(
        count(friday, '.oge-scheduler-rows .oge-scheduler-cell-weekend'),
      ).toBe(20),
    );
  });

  it('drops the configured weekend from the workWeek view', async () => {
    const host = renderScheduler({ view: 'workWeek', weekendDays: [5] });
    await waitFor(() =>
      expect(count(host, '.oge-scheduler-rows .oge-scheduler-cell')).toBe(120),
    );
    expect(count(host, '.oge-scheduler-rows .oge-scheduler-cell-weekend')).toBe(
      0,
    );
  });

  it('shades the month view from the same list', async () => {
    const host = renderScheduler({ view: 'month', weekendDays: [5] });
    await waitFor(() =>
      expect(
        count(host, '.oge-scheduler-month-cell.oge-scheduler-cell-weekend'),
      ).toBe(6),
    );
  });

  it('resolves the weekend from the locale when the prop is unset', async () => {
    const FakeLocale = function (tag: string) {
      return {
        tag,
        getWeekInfo: () => ({ weekend: tag === 'he-IL' ? [5, 6] : [6, 7] }),
      };
    };
    vi.spyOn(Intl, 'Locale').mockImplementation(
      FakeLocale as unknown as typeof Intl.Locale,
    );
    const host = renderScheduler({ view: 'workWeek', locale: 'he-IL' });
    // Friday + Saturday dropped: Mon–Thu + Sun remain
    await waitFor(() =>
      expect(count(host, '.oge-scheduler-rows .oge-scheduler-cell')).toBe(100),
    );
  });
});
