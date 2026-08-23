import { act, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode, useRef, useState } from 'react';
import { resetScrollLockForTests } from '@oge-ui/behavior';
import { OgeModal, type OgeModalHandle, type OgeModalProps } from './modal';
import {
  OgeModalProvider,
  useOgeModalData,
  useOgeModalRef,
  useOgeModals,
  type OgeModalsHandle,
} from './modal-provider';

function Host(props: Partial<OgeModalProps<string>>) {
  const [opened, setOpened] = useState(false);
  const ref = useRef<OgeModalHandle<string>>(null);
  return (
    <>
      <button type="button" onClick={() => setOpened(true)}>
        Open
      </button>
      <OgeModal<string>
        ref={ref}
        title="Team settings"
        opened={opened}
        onOpenedChange={setOpened}
        renderFooter={({ close }) => (
          <button type="button" onClick={() => close('saved')}>
            Save
          </button>
        )}
        {...props}
      >
        <input placeholder="Name" />
      </OgeModal>
    </>
  );
}

/** Initial focus runs one frame after mount — flush the async rAF stub. */
const nextFrame = () => act(() => vi.advanceTimersByTime(0));

describe('OgeModal', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      setTimeout(() => cb(0), 0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    resetScrollLockForTests();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.style.overflow = '';
  });

  it('renders a dialog with the title wired to aria-labelledby and traps focus', () => {
    render(<Host />);
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    const dialog = screen.getByRole('dialog', { name: 'Team settings' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    nextFrame();
    // First tabbable in DOM order is the header close button — same as Angular.
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
    // Tab wraps inside the dialog: from the last tabbable back to the first.
    const save = screen.getByRole('button', { name: 'Save' });
    save.focus();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab' });
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it('Escape closes through the pipeline and restores focus to the opener', () => {
    const onClosed = vi.fn();
    render(<Host onClosed={onClosed} />);
    const opener = screen.getByRole('button', { name: 'Open' });
    act(() => opener.focus());
    fireEvent.click(opener);
    nextFrame();
    expect(opener).not.toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onClosed).toHaveBeenCalledWith({
      reason: 'escape',
      result: undefined,
    });
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
  });

  it('the footer close(result) carries a typed result', () => {
    const onClosed = vi.fn();
    render(<Host onClosed={onClosed} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onClosed).toHaveBeenCalledWith({ reason: 'api', result: 'saved' });
  });

  it('onClosing can cancel and closeGuard vetoes asynchronously (single-flight)', async () => {
    let resolveGuard!: (allowed: boolean) => void;
    const guard = vi.fn(
      () => new Promise<boolean>((resolve) => (resolveGuard = resolve)),
    );
    const onClosing = vi.fn();
    const pending = vi.fn();
    render(
      <Host
        closeGuard={guard}
        onClosing={onClosing}
        onClosePendingChange={pending}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClosing).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'closeButton' }),
    );
    expect(pending).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(guard).toHaveBeenCalledTimes(1); // single-flight
    await act(async () => {
      resolveGuard(false);
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(pending).toHaveBeenLastCalledWith(false);
  });

  it('busy blocks user closes but not close()', () => {
    let handle!: OgeModalHandle<string>;
    function BusyHost() {
      const ref = useRef<OgeModalHandle<string>>(null);
      return (
        <OgeModal<string>
          ref={(h) => {
            if (h) handle = h;
            ref.current = h;
          }}
          title="Busy"
          defaultOpened
          busy
        />
      );
    }
    render(<BusyHost />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-busy', 'true');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    act(() => handle.close());
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('the maximize button toggles fullScreen', () => {
    const onFullScreenChange = vi.fn();
    render(<Host showMaximizeButton onFullScreenChange={onFullScreenChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    fireEvent.click(screen.getByRole('button', { name: 'Maximize' }));
    expect(onFullScreenChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole('dialog')).toHaveClass('oge-modal-fullscreen');
    expect(screen.getByRole('button', { name: 'Restore' })).toBeInTheDocument();
  });

  it('works under StrictMode (hold released and re-acquired on remount)', () => {
    render(
      <StrictMode>
        <Host />
      </StrictMode>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });
});

describe('OgeModalProvider / useOgeModals', () => {
  beforeEach(() => resetScrollLockForTests());

  function Content() {
    const data = useOgeModalData<{ name: string }>();
    const ref = useOgeModalRef<string>();
    return (
      <button type="button" onClick={() => ref.close(`renamed-${data.name}`)}>
        Rename {data.name}
      </button>
    );
  }

  function Opener({ onHandle }: { onHandle: (h: OgeModalsHandle) => void }) {
    onHandle(useOgeModals());
    return null;
  }

  it('opens body-appended content with data and resolves closed with the result', async () => {
    let modals!: OgeModalsHandle;
    render(
      <OgeModalProvider>
        <Opener onHandle={(h) => (modals = h)} />
      </OgeModalProvider>,
    );
    let ref!: ReturnType<OgeModalsHandle['open']>;
    act(() => {
      ref = modals.open<string, { name: string }>(<Content />, {
        title: 'Rename',
        data: { name: 'report.xlsx' },
      });
    });
    expect(screen.getByRole('dialog', { name: 'Rename' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Rename report.xlsx' }));
    await expect(ref.closed).resolves.toEqual({
      reason: 'api',
      result: 'renamed-report.xlsx',
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('a function content receives data and close', async () => {
    let modals!: OgeModalsHandle;
    render(
      <OgeModalProvider>
        <Opener onHandle={(h) => (modals = h)} />
      </OgeModalProvider>,
    );
    let ref!: ReturnType<OgeModalsHandle['open']>;
    act(() => {
      ref = modals.open<string, string>(
        ({ data, close }) => (
          <button type="button" onClick={() => close(`ok-${data}`)}>
            Confirm
          </button>
        ),
        { data: 'x' },
      );
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await expect(ref.closed).resolves.toEqual({
      reason: 'api',
      result: 'ok-x',
    });
  });
});
