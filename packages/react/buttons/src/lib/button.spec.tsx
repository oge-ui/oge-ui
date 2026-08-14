import { act, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode, createRef } from 'react';
import { OgeButton, type OgeButtonHandle } from './button';
import { OgeButtonsConfigProvider } from './buttons-config';

const native = () => screen.getByRole('button');

/**
 * jsdom has no `PointerEvent`, so RTL's `fireEvent.pointerDown` cannot carry
 * `button`/`pointerId` and the press machine correctly ignores it. Dispatch a
 * `MouseEvent` of the right type instead — the same thing the Angular button's
 * specs do, which keeps the two suites testing the identical entry point.
 */
function pointer(
  el: HTMLElement,
  type: 'pointerdown' | 'pointerup' | 'pointercancel',
): void {
  fireEvent(
    el,
    new MouseEvent(type, { bubbles: true, cancelable: true, button: 0 }),
  );
}

describe('<OgeButton>', () => {
  it('renders the label and the house class names', () => {
    render(<OgeButton text="Save" severity="accent" size="lg" />);
    expect(screen.getByText('Save')).toHaveClass('oge-button-text');
    const host = native().parentElement;
    expect(host).toHaveClass('oge-button');
    expect(host).toHaveClass('oge-button-severity-accent');
    expect(host).toHaveClass('oge-button-lg');
    expect(host).toHaveClass('oge-button-colored');
  });

  it('fires onClick through the press pipeline', () => {
    const onClick = vi.fn();
    render(<OgeButton text="Go" onClick={onClick} />);
    fireEvent.click(native());
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  // StrictMode simulates an unmount (destroying the press machine) and then
  // remounts with the same machine instance still in the ref. Every Next.js
  // and CRA dev session renders under StrictMode, so a machine that stays
  // destroyed after the simulated unmount means every button is dead there.
  it('still fires after a StrictMode remount cycle', () => {
    const onClick = vi.fn();
    render(
      <StrictMode>
        <OgeButton text="Go" onClick={onClick} />
      </StrictMode>,
    );
    fireEvent.click(native());
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not fire while disabled', () => {
    const onClick = vi.fn();
    render(<OgeButton text="Go" disabled onClick={onClick} />);
    fireEvent.click(native());
    expect(onClick).not.toHaveBeenCalled();
    expect(native()).toBeDisabled();
  });

  it('exposes focus() on the imperative handle', () => {
    const ref = createRef<OgeButtonHandle>();
    render(<OgeButton ref={ref} text="Go" />);
    act(() => ref.current?.focus());
    expect(document.activeElement).toBe(native());
  });

  it('renders a numeric badge capped at 99+ and announces it', () => {
    render(<OgeButton text="Inbox" badge={140} />);
    expect(screen.getAllByText('99+').length).toBe(2); // visual pill + sr text
  });

  it('renders a plain dot for badge={true}', () => {
    const { container } = render(<OgeButton text="Inbox" badge />);
    expect(
      container.querySelector('.oge-button-badge-dot'),
    ).toBeInTheDocument();
  });
});

describe('<OgeButton> — async action', () => {
  it('goes busy while the action is pending and reports the result', async () => {
    let resolve!: (value: string) => void;
    const action = () =>
      new Promise<string>((r) => {
        resolve = r;
      });
    const onActionDone = vi.fn();
    render(
      <OgeButton text="Save" action={action} onActionDone={onActionDone} />,
    );

    fireEvent.click(native());
    expect(native()).toBeDisabled();
    expect(native()).toHaveAttribute('aria-busy', 'true');

    await act(async () => {
      resolve('saved');
    });
    expect(onActionDone).toHaveBeenCalledWith('saved');
    expect(native()).not.toBeDisabled();
  });

  it('is single-flight — a second click while pending is ignored', async () => {
    const action = vi.fn(() => new Promise(() => undefined));
    const onClick = vi.fn();
    render(<OgeButton text="Save" action={action} onClick={onClick} />);
    fireEvent.click(native());
    fireEvent.click(native());
    expect(action).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('reports a rejected action without staying busy', async () => {
    const onActionFailed = vi.fn();
    const action = () => Promise.reject(new Error('nope'));
    render(
      <OgeButton text="Save" action={action} onActionFailed={onActionFailed} />,
    );
    await act(async () => {
      fireEvent.click(native());
    });
    expect(onActionFailed).toHaveBeenCalled();
    expect(native()).not.toBeDisabled();
  });
});

describe('<OgeButton> — gestures', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it('holdToConfirm fires only after the hold elapses', () => {
    const onClick = vi.fn();
    render(<OgeButton text="Delete" holdToConfirm onClick={onClick} />);
    const el = native();

    pointer(el, 'pointerdown');
    pointer(el, 'pointerup');
    expect(onClick).not.toHaveBeenCalled(); // released too early

    pointer(el, 'pointerdown');
    act(() => void vi.advanceTimersByTime(900));
    pointer(el, 'pointerup');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('swallows the native click in gesture mode', () => {
    const onClick = vi.fn();
    render(<OgeButton text="Delete" holdToConfirm onClick={onClick} />);
    fireEvent.click(native());
    expect(onClick).not.toHaveBeenCalled();
  });

  it('autoRepeat keeps firing while held', () => {
    const onClick = vi.fn();
    render(<OgeButton text="+" autoRepeat onClick={onClick} />);
    const el = native();
    pointer(el, 'pointerdown');
    expect(onClick).toHaveBeenCalledTimes(1); // leading fire
    act(() => void vi.advanceTimersByTime(400 + 80 * 3));
    pointer(el, 'pointerup');
    expect(onClick.mock.calls.length).toBeGreaterThan(1);
    const settled = onClick.mock.calls.length;
    act(() => void vi.advanceTimersByTime(500));
    expect(onClick).toHaveBeenCalledTimes(settled); // stopped on release
  });

  it('throttling clickGuard drops the second click inside the window', () => {
    const onClick = vi.fn();
    render(<OgeButton text="Go" clickGuard onClick={onClick} />);
    fireEvent.click(native());
    fireEvent.click(native());
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('<OgeButton> — configuration', () => {
  it('reads the hold duration from the config provider', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onClick = vi.fn();
    render(
      <OgeButtonsConfigProvider config={{ holdToConfirmMs: 200 }}>
        <OgeButton text="Delete" holdToConfirm onClick={onClick} />
      </OgeButtonsConfigProvider>,
    );
    const el = native();
    pointer(el, 'pointerdown');
    act(() => void vi.advanceTimersByTime(250));
    pointer(el, 'pointerup');
    expect(onClick).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('overrides the loading announcement per instance', () => {
    render(
      <OgeButton text="Save" loading messages={{ loading: 'Yükleniyor' }} />,
    );
    expect(screen.getByText('Yükleniyor')).toBeInTheDocument();
  });
});
