import { StrictMode } from 'react';
import { act, render } from '@testing-library/react';
import type { OgeSchedulerView } from '@oge-ui/scheduler-engine';
import { OgeScheduler } from './scheduler';

describe('<OgeScheduler adaptiveView>', () => {
  let width = 1000;
  const observers = new Set<() => void>();

  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(
      () => width,
    );
    vi.stubGlobal(
      'ResizeObserver',
      class {
        private readonly callback: () => void;
        constructor(callback: () => void) {
          this.callback = callback;
        }
        observe(): void {
          observers.add(this.callback);
        }
        disconnect(): void {
          observers.delete(this.callback);
        }
      },
    );
  });

  afterEach(() => {
    observers.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('switches to agenda below its own breakpoint and back (StrictMode)', () => {
    const views: OgeSchedulerView[] = [];
    render(
      <StrictMode>
        <OgeScheduler
          dataSource={[]}
          defaultCurrentDate={new Date(2026, 4, 11)}
          adaptiveView
          onCurrentViewChange={(view) => views.push(view)}
        />
      </StrictMode>,
    );
    expect(views).toEqual([]);
    width = 420;
    act(() => observers.forEach((fn) => fn()));
    expect(views).toEqual(['agenda']);
    width = 900;
    act(() => observers.forEach((fn) => fn()));
    expect(views).toEqual(['agenda', 'week']);
  });
});
