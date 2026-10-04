import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { OgeScheduler } from './scheduler';
import type { OgeSchedulerProps } from './scheduler-types';

interface Appt {
  id: number;
  text: string;
  startDate: Date;
  endDate: Date;
}

const data: Appt[] = [
  {
    id: 1,
    text: 'Standup',
    startDate: new Date(2026, 7, 6, 9),
    endDate: new Date(2026, 7, 6, 9, 30),
  },
];

function scheduler(props: Partial<OgeSchedulerProps<Appt>> = {}) {
  return (
    <OgeScheduler<Appt>
      dataSource={data}
      defaultCurrentDate={new Date(2026, 7, 6)}
      firstDayOfWeek={1}
      dayStartHour={8}
      dayEndHour={18}
      showCurrentTimeIndicator={false}
      locale="en-US"
      {...props}
    />
  );
}

const cells = (host: Element) =>
  Array.from(host.querySelectorAll<HTMLElement>('.oge-scheduler-cell'));
const focused = (host: Element) =>
  host.querySelector<HTMLElement>('.oge-scheduler-cell[tabindex="0"]');

/** Home on the first cell, then one arrow: the column the roving cell is in. */
function columnAfter(host: Element, arrow: string): number {
  fireEvent.keyDown(cells(host)[0], { key: 'Home' });
  fireEvent.keyDown(focused(host) as HTMLElement, { key: arrow });
  return cells(host).indexOf(focused(host) as HTMLElement) % 7;
}

describe('<OgeScheduler> RTL', () => {
  it('rtlEnabled sets dir on the host and mirrors Left/Right', () => {
    const { container, rerender } = render(scheduler({ rtlEnabled: true }));
    const root = container.querySelector('.oge-scheduler');
    expect(root?.getAttribute('dir')).toBe('rtl');
    expect(columnAfter(container, 'ArrowLeft')).toBe(1);
    expect(columnAfter(container, 'ArrowRight')).toBe(0);

    rerender(scheduler({ rtlEnabled: false }));
    expect(root?.getAttribute('dir')).toBe('ltr');
    expect(columnAfter(container, 'ArrowRight')).toBe(1);

    rerender(scheduler());
    expect(root?.hasAttribute('dir')).toBe(false);
  });

  it('follows a dir="rtl" ancestor and its changes when unset', async () => {
    const { container } = render(<div dir="rtl">{scheduler()}</div>);
    await waitFor(() => expect(columnAfter(container, 'ArrowLeft')).toBe(1));
    const wrapper = container.firstElementChild as HTMLElement;
    await act(async () => {
      wrapper.setAttribute('dir', 'ltr');
      await Promise.resolve();
    });
    await waitFor(() => expect(columnAfter(container, 'ArrowRight')).toBe(1));
  });

  it('Ctrl+Left moves a chip one day later in RTL', () => {
    const onAppointmentUpdated = vi.fn();
    const { container } = render(
      scheduler({ rtlEnabled: true, onAppointmentUpdated }),
    );
    fireEvent.keyDown(
      container.querySelector('.oge-scheduler-chip-box') as HTMLElement,
      { key: 'ArrowLeft', ctrlKey: true },
    );
    expect(
      onAppointmentUpdated.mock.lastCall?.[0].appointmentData.startDate,
    ).toEqual(new Date(2026, 7, 7, 9));
  });
});
