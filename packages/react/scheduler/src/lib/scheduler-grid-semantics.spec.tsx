import { fireEvent, render, waitFor } from '@testing-library/react';
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
  readOnly?: boolean;
}) {
  return render(
    <OgeScheduler<Appt>
      dataSource={[]}
      defaultCurrentDate={new Date(2026, 7, 6)}
      currentView={props.view}
      views={['week', 'month']}
      firstDayOfWeek={1}
      dayStartHour={8}
      dayEndHour={10}
      showCurrentTimeIndicator={false}
      readOnly={props.readOnly}
      locale="en-US"
    />,
  ).container;
}

const gridOf = (host: Element): HTMLElement =>
  host.querySelector<HTMLElement>('[role="grid"]') as HTMLElement;

describe('OgeScheduler grid semantics', () => {
  it('renders a columnheader row inside the week grid', async () => {
    const host = renderScheduler({ view: 'week' });
    await waitFor(() => expect(gridOf(host)).not.toBeNull());
    const rows = gridOf(host).querySelectorAll(':scope > [role="row"]');
    expect(rows.length).toBe(5);
    const headers = rows[0].querySelectorAll('[role="columnheader"]');
    expect(headers.length).toBe(7);
    expect(headers[0].textContent?.trim()).toBe('Monday, August 3, 2026');
    expect(
      host
        .querySelector('.oge-scheduler-header-row')
        ?.getAttribute('aria-hidden'),
    ).toBe('true');
  });

  it('marks the roving current cell aria-selected and follows clicks', async () => {
    const host = renderScheduler({ view: 'week' });
    await waitFor(() => expect(gridOf(host)).not.toBeNull());
    const cells = () =>
      Array.from(
        gridOf(host).querySelectorAll<HTMLElement>('[role="gridcell"]'),
      );
    expect(cells().every((cell) => cell.hasAttribute('aria-selected'))).toBe(
      true,
    );
    const selected = () =>
      cells().filter((cell) => cell.getAttribute('aria-selected') === 'true');
    expect(selected()).toEqual([cells()[0]]);
    fireEvent.click(cells()[9]);
    await waitFor(() => expect(selected()).toEqual([cells()[9]]));
  });

  it('sets aria-readonly only when the scheduler is read-only', async () => {
    const editable = renderScheduler({ view: 'week' });
    await waitFor(() => expect(gridOf(editable)).not.toBeNull());
    expect(gridOf(editable).hasAttribute('aria-readonly')).toBe(false);
    const readOnly = renderScheduler({ view: 'week', readOnly: true });
    await waitFor(() =>
      expect(gridOf(readOnly).getAttribute('aria-readonly')).toBe('true'),
    );
  });

  it('gives the month grid weekday columnheaders, selection and read-only', async () => {
    const host = renderScheduler({ view: 'month', readOnly: true });
    await waitFor(() => expect(gridOf(host)).not.toBeNull());
    const rows = gridOf(host).querySelectorAll(':scope > [role="row"]');
    expect(rows.length).toBe(7);
    const headers = rows[0].querySelectorAll('[role="columnheader"]');
    expect(Array.from(headers, (h) => h.textContent?.trim())).toEqual([
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ]);
    expect(
      gridOf(host).querySelectorAll('[role="gridcell"][aria-selected="true"]'),
    ).toHaveLength(1);
    expect(gridOf(host).getAttribute('aria-readonly')).toBe('true');
  });
});
