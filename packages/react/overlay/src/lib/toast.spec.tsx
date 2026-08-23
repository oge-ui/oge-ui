import { act, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { OgeOverlayConfigProvider } from './overlay-config';
import { OgeToastProvider, useOgeToasts, type OgeToastsHandle } from './toast';

function Grab({ onHandle }: { onHandle: (h: OgeToastsHandle) => void }) {
  onHandle(useOgeToasts());
  return null;
}

function mount(strict = false, config?: { toastMaxVisible?: number }) {
  let toasts!: OgeToastsHandle;
  const tree = (
    <OgeOverlayConfigProvider config={config}>
      <OgeToastProvider>
        <Grab onHandle={(h) => (toasts = h)} />
      </OgeToastProvider>
    </OgeOverlayConfigProvider>
  );
  render(strict ? <StrictMode>{tree}</StrictMode> : tree);
  return toasts;
}

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const toastEls = () => document.querySelectorAll('.oge-toast');

describe('OgeToastProvider / useOgeToasts', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      setTimeout(() => cb(0), 0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows a toast in the default bottom-end region and auto-dismisses', async () => {
    const toasts = mount();
    let ref!: ReturnType<OgeToastsHandle['show']>;
    act(() => {
      ref = toasts.show({ message: 'bye', displayTime: 1000 });
    });
    expect(
      document.querySelector('.oge-toast-region-bottom-end .oge-toast'),
    ).not.toBeNull();
    expect(screen.getByText('bye')).toBeInTheDocument();
    advance(0);
    expect(document.querySelector('.oge-toast-cell')).toHaveClass(
      'oge-toast-cell-ready',
    );
    advance(1000);
    expect(document.querySelector('.oge-toast-cell')).toHaveClass(
      'oge-toast-cell-closing',
    );
    advance(200);
    expect(toastEls()).toHaveLength(0);
    await expect(ref.closed).resolves.toEqual({ reason: 'timeout' });
  });

  it('announces politely by default and assertively for errors', () => {
    const toasts = mount();
    act(() => {
      toasts.info('Synced');
    });
    advance(100);
    expect(screen.getByRole('status')).toHaveTextContent('Synced');
    act(() => {
      toasts.error('Failed', { title: 'Save' });
    });
    advance(100);
    expect(screen.getByRole('alert')).toHaveTextContent('Save. Failed');
  });

  it('hover pauses and resumes with the remaining time', () => {
    const toasts = mount();
    act(() => {
      toasts.show({ message: 'pausable', displayTime: 1000 });
    });
    advance(600);
    const el = document.querySelector('.oge-toast') as HTMLElement;
    fireEvent.mouseEnter(el);
    advance(5000);
    expect(toastEls()).toHaveLength(1);
    fireEvent.mouseLeave(el);
    advance(399);
    expect(toastEls()).toHaveLength(1);
    advance(1 + 200);
    expect(toastEls()).toHaveLength(0);
  });

  it('the action button runs its handler and closes with reason action', async () => {
    const toasts = mount();
    const handler = vi.fn();
    let ref!: ReturnType<OgeToastsHandle['show']>;
    act(() => {
      ref = toasts.show({
        message: 'Row deleted',
        sticky: true,
        action: { text: 'Undo', handler },
        data: { id: 7 },
      });
    });
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ data: { id: 7 } }),
    );
    advance(200);
    await expect(ref.closed).resolves.toEqual({ reason: 'action' });
  });

  it('coalesces identical toasts into one with a ×N badge', () => {
    const toasts = mount();
    act(() => {
      toasts.error('Import row failed', { coalesce: true, sticky: true });
      toasts.error('Import row failed', { coalesce: true, sticky: true });
      toasts.error('Import row failed', { coalesce: true, sticky: true });
    });
    expect(toastEls()).toHaveLength(1);
    expect(document.querySelector('.oge-toast-count')?.textContent).toBe('×3');
  });

  it('caps visible toasts at toastMaxVisible and promotes FIFO', () => {
    const toasts = mount(false, { toastMaxVisible: 2 });
    act(() => {
      toasts.info('one', { displayTime: 1000 });
      toasts.info('two', { sticky: true });
      toasts.info('three', { sticky: true });
    });
    const messages = () =>
      Array.from(document.querySelectorAll('.oge-toast-message')).map(
        (el) => el.textContent,
      );
    expect(messages()).toEqual(['one', 'two']);
    advance(1000 + 200);
    expect(messages()).toEqual(['two', 'three']);
  });

  it('promise() morphs the loading toast in place when it settles', async () => {
    const toasts = mount();
    let resolve!: (value: number) => void;
    const work = new Promise<number>((r) => (resolve = r));
    act(() => {
      toasts.promise(work, {
        loading: 'Publishing…',
        success: (count) => `Published ${count} pages`,
        error: 'Failed',
      });
    });
    expect(document.querySelector('.oge-toast-spinner')).not.toBeNull();
    await act(async () => {
      resolve(3);
      await work;
    });
    expect(screen.getByText('Published 3 pages')).toBeInTheDocument();
    expect(document.querySelector('.oge-toast')).toHaveClass(
      'oge-toast-success',
    );
  });

  it('renderContent replaces the body and can close the toast', () => {
    const toasts = mount();
    act(() => {
      toasts.show({
        message: 'custom',
        sticky: true,
        renderContent: ({ close }) => (
          <button type="button" onClick={close}>
            Dismiss me
          </button>
        ),
      });
    });
    expect(screen.queryByText('custom')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss me' }));
    advance(200);
    expect(toastEls()).toHaveLength(0);
  });

  it('clear() closes everything', () => {
    const toasts = mount();
    act(() => {
      toasts.info('a', { sticky: true });
      toasts.info('b', { sticky: true, position: 'top-start' });
      toasts.clear();
    });
    advance(200);
    expect(toastEls()).toHaveLength(0);
  });

  it('works under StrictMode', () => {
    const toasts = mount(true);
    act(() => {
      toasts.success('Saved', { displayTime: 500 });
    });
    expect(screen.getByText('Saved')).toBeInTheDocument();
    advance(500 + 200);
    expect(toastEls()).toHaveLength(0);
    act(() => {
      toasts.success('Saved again', { sticky: true });
    });
    expect(screen.getByText('Saved again')).toBeInTheDocument();
  });
});
