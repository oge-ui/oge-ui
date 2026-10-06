import { act, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode, useRef, useState } from 'react';
import type {
  OgeWindowMovedEvent,
  OgeWindowResizedEvent,
  OgeWindowState,
} from '@oge-ui/behavior';
import { OgeWindow, type OgeWindowHandle, type OgeWindowProps } from './window';

function pointer(
  type: string,
  x: number,
  y: number,
  target: EventTarget = document,
): void {
  const event = new MouseEvent(type, {
    clientX: x,
    clientY: y,
    bubbles: true,
    cancelable: true,
    button: 0,
  });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  Object.defineProperty(event, 'pointerType', { value: 'mouse' });
  act(() => {
    target.dispatchEvent(event);
  });
}

const handles: { a: OgeWindowHandle | null } = { a: null };

function Host(props: Partial<OgeWindowProps> & { second?: boolean }) {
  const { second, ...rest } = props;
  const [openA, setOpenA] = useState(false);
  const [openB, setOpenB] = useState(false);
  const [state, setState] = useState<OgeWindowState>('normal');
  const ref = useRef<OgeWindowHandle>(null);
  handles.a = ref.current;
  return (
    <>
      <button type="button" onClick={() => setOpenA(true)}>
        Open A
      </button>
      <button type="button" onClick={() => setOpenB(true)}>
        Open B
      </button>
      <span data-testid="state">{state}</span>
      <OgeWindow
        ref={ref}
        title="Alpha"
        opened={openA}
        onOpenedChange={setOpenA}
        state={state}
        onStateChange={setState}
        position={{ x: 100, y: 80 }}
        width={240}
        {...rest}
      >
        <input aria-label="alpha field" />
      </OgeWindow>
      {second && (
        <OgeWindow
          title="Beta"
          opened={openB}
          onOpenedChange={setOpenB}
          placement="bottom-end"
        >
          <p>beta</p>
        </OgeWindow>
      )}
    </>
  );
}

describe('OgeWindow', () => {
  beforeEach(() => {
    Object.defineProperty(document.documentElement, 'clientWidth', {
      value: 1000,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, 'clientHeight', {
      value: 800,
      configurable: true,
    });
  });

  const panels = () =>
    Array.from(document.querySelectorAll<HTMLElement>('.oge-window'));

  it('is a non-modal dialog placed at its position with focus inside', () => {
    render(<Host />);
    fireEvent.click(screen.getByRole('button', { name: 'Open A' }));
    const panel = screen.getByRole('dialog', { name: 'Alpha' });
    expect(panel).not.toHaveAttribute('aria-modal');
    expect(panel).toHaveAttribute('tabindex', '0');
    expect(panel).toHaveClass('oge-window-placed', 'oge-window-active');
    expect(panel.style.left).toBe('100px');
    expect(panel.style.top).toBe('80px');
    expect(panel.style.width).toBe('240px');
    expect(document.activeElement).toBe(screen.getByLabelText('alpha field'));
    expect(panel.querySelectorAll('.oge-window-resize')).toHaveLength(8);
    expect(document.querySelector('.oge-modal-layer')).toBeNull();
  });

  it('works under StrictMode: one registration, z-order and close still work', () => {
    render(
      <StrictMode>
        <Host second />
      </StrictMode>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open A' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open B' }));
    const [a, b] = panels();
    expect(a.style.zIndex).toBe('calc(var(--oge-z-window) + 0)');
    expect(b.style.zIndex).toBe('calc(var(--oge-z-window) + 1)');
    expect(b).toHaveClass('oge-window-active');
    pointer('pointerdown', 10, 10, a.querySelector('.oge-window-body')!);
    expect(a.style.zIndex).toBe('calc(var(--oge-z-window) + 1)');
    expect(a).toHaveClass('oge-window-active');
    expect(b).not.toHaveClass('oge-window-active');
    fireEvent.click(a.querySelector('.oge-window-close')!);
    expect(panels()).toHaveLength(1);
    expect(panels()[0].style.zIndex).toBe('calc(var(--oge-z-window) + 0)');
  });

  it('drags by the title bar; keyboard moves and resizes; events report the source', () => {
    const moves: OgeWindowMovedEvent[] = [];
    const resizes: OgeWindowResizedEvent[] = [];
    render(
      <Host
        onMoved={(e) => moves.push(e)}
        onResized={(e) => resizes.push(e)}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open A' }));
    const panel = panels()[0];
    const header = panel.querySelector('.oge-window-header')!;
    pointer('pointerdown', 150, 90, header);
    pointer('pointermove', 200, 130);
    pointer('pointerup', 200, 130);
    expect(panel.style.left).toBe('150px');
    expect(moves.at(-1)).toMatchObject({ x: 150, y: 120, source: 'pointer' });
    act(() => panel.focus());
    fireEvent.keyDown(panel, { key: 'ArrowLeft' });
    expect(panel.style.left).toBe('140px');
    expect(moves.at(-1)).toMatchObject({ source: 'keyboard' });
    fireEvent.keyDown(panel, { key: 'ArrowDown', ctrlKey: true });
    expect(resizes.at(-1)).toMatchObject({ source: 'keyboard' });
    // the content keeps its own arrows
    fireEvent.keyDown(screen.getByLabelText('alpha field'), {
      key: 'ArrowLeft',
    });
    expect(panel.style.left).toBe('140px');
  });

  it('controlled state: buttons, Alt+arrows and the prop drive minimize / maximize / restore', () => {
    const changing = vi.fn();
    const { rerender } = render(<Host onStateChanging={changing} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open A' }));
    fireEvent.click(screen.getByRole('button', { name: 'Maximize' }));
    expect(screen.getByTestId('state')).toHaveTextContent('maximized');
    expect(panels()[0]).toHaveClass('oge-window-maximized');
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
    expect(screen.getByTestId('state')).toHaveTextContent('normal');
    const panel = panels()[0];
    fireEvent.keyDown(panel, { key: 'ArrowDown', altKey: true });
    expect(screen.getByTestId('state')).toHaveTextContent('minimized');
    expect(panel.querySelector('.oge-window-body')).toHaveAttribute('hidden');
    expect(changing).toHaveBeenLastCalledWith(
      expect.objectContaining({ state: 'minimized', previousState: 'normal' }),
    );
    rerender(<Host onStateChanging={(e) => (e.cancel = true)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
    expect(screen.getByTestId('state')).toHaveTextContent('minimized');
  });

  it('Escape inside closes (cancelable); focus returns to the opener', () => {
    let veto = true;
    render(<Host onClosing={(e) => (e.cancel = veto)} />);
    const opener = screen.getByRole('button', { name: 'Open A' });
    act(() => opener.focus());
    fireEvent.click(opener);
    const field = screen.getByLabelText('alpha field');
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(panels()).toHaveLength(1);
    veto = false;
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(panels()).toHaveLength(0);
    expect(document.activeElement).toBe(opener);
  });

  it('a placement resolves without a position; the handle centres and closes', () => {
    render(<Host position={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open A' }));
    // jsdom measures 0×0: centred in the 1000×800 viewport
    expect(panels()[0].style.left).toBe('500px');
    act(() => handles.a?.moveTo(20, 30));
    expect(panels()[0].style.left).toBe('20px');
    act(() => handles.a?.center());
    expect(panels()[0].style.left).toBe('500px');
    act(() => handles.a?.close());
    expect(panels()).toHaveLength(0);
  });
});
