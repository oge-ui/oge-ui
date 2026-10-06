import { act, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode, createRef, useState } from 'react';
import type {
  OgePopoverClosingEvent,
  OgePopoverOpeningEvent,
  OgePopoverShowOn,
} from '@oge-ui/behavior';
import { OgeOverlayConfigProvider } from './overlay-config';
import { OgePopover, type OgePopoverHandle } from './popover';

const panel = (): HTMLElement | null =>
  document.body.querySelector('.oge-popover');

const flush = (ms = 20) => act(() => vi.advanceTimersByTime(ms));

function Host({
  showOn = 'click',
  modal = false,
  log = [],
  vetoOpen = false,
  vetoClose = false,
  handle,
}: {
  showOn?: OgePopoverShowOn;
  modal?: boolean;
  log?: string[];
  vetoOpen?: boolean;
  vetoClose?: boolean;
  handle?: React.Ref<OgePopoverHandle>;
}) {
  return (
    <>
      <button type="button">Before</button>
      <OgePopover
        ref={handle}
        trigger={<button type="button">Details</button>}
        title="Order details"
        showOn={showOn}
        modal={modal}
        arrow
        width={260}
        onOpening={(e: OgePopoverOpeningEvent) => {
          log.push(`opening:${e.reason}`);
          e.cancel = vetoOpen;
        }}
        onOpened={(e) => log.push(`opened:${e.reason}`)}
        onClosing={(e: OgePopoverClosingEvent) => {
          log.push(`closing:${e.reason}`);
          e.cancel = vetoClose;
        }}
        onClosed={(e) => log.push(`closed:${e.reason}`)}
        renderFooter={({ close }) => (
          <button type="button" onClick={close}>
            Done
          </button>
        )}
      >
        <p>Shipped today.</p>
      </OgePopover>
      <button type="button">After</button>
    </>
  );
}

const trigger = () => screen.getByRole('button', { name: 'Details' });

describe('OgePopover', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame'],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('a click trigger is an APG disclosure: haspopup, expanded, controls', () => {
    const log: string[] = [];
    render(<Host log={log} />);
    expect(trigger().getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(trigger().hasAttribute('aria-controls')).toBe(false);
    fireEvent.click(trigger());
    flush();
    const el = panel() as HTMLElement;
    expect(el.getAttribute('role')).toBe('dialog');
    expect(el.hasAttribute('aria-modal')).toBe(false);
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(trigger().getAttribute('aria-controls')).toBe(el.id);
    fireEvent.click(trigger());
    flush();
    expect(panel()).toBeNull();
    expect(log).toEqual([
      'opening:click',
      'opened:click',
      'closing:trigger',
      'closed:trigger',
    ]);
  });

  it('renders title (labelling the dialog), body, footer, close button and arrow in body', () => {
    render(<Host />);
    fireEvent.click(trigger());
    flush();
    const el = panel() as HTMLElement;
    expect(el.parentElement).toBe(document.body);
    const title = el.querySelector('.oge-popover-title') as HTMLElement;
    expect(title.textContent).toBe('Order details');
    expect(el.getAttribute('aria-labelledby')).toBe(title.id);
    expect(el.textContent).toContain('Shipped today.');
    expect(
      el.querySelector('.oge-popover-close')?.getAttribute('aria-label'),
    ).toBe('Close');
    expect(
      el.querySelector('.oge-popover-arrow')?.getAttribute('data-side'),
    ).toBe('top');
    expect(
      (el.querySelector('.oge-popover-content') as HTMLElement).style.width,
    ).toBe('260px');
  });

  it('the close button and a footer close() return focus to the trigger', () => {
    const log: string[] = [];
    render(<Host log={log} />);
    fireEvent.click(trigger());
    flush();
    const close = panel()?.querySelector('.oge-popover-close') as HTMLElement;
    act(() => close.focus());
    fireEvent.click(close);
    flush();
    expect(panel()).toBeNull();
    expect(log.at(-1)).toBe('closed:closeButton');
    expect(document.activeElement).toBe(trigger());

    fireEvent.click(trigger());
    flush();
    const done = screen.getByRole('button', { name: 'Done' });
    act(() => done.focus());
    fireEvent.click(done);
    flush();
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('Escape and an outside pointer-down close it', () => {
    const log: string[] = [];
    render(<Host log={log} />);
    fireEvent.click(trigger());
    flush();
    fireEvent.keyDown(document, { key: 'Escape' });
    flush();
    expect(panel()).toBeNull();
    expect(log.at(-1)).toBe('closed:escape');
    fireEvent.click(trigger());
    flush();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'After' }));
    flush();
    expect(panel()).toBeNull();
    expect(log.at(-1)).toBe('closed:outside');
  });

  it('honours cancel on opening and closing', () => {
    const { rerender } = render(<Host vetoOpen />);
    fireEvent.click(trigger());
    flush();
    expect(panel()).toBeNull();
    rerender(<Host vetoClose />);
    fireEvent.click(trigger());
    flush();
    fireEvent.keyDown(document, { key: 'Escape' });
    flush();
    expect(panel()).not.toBeNull();
  });

  it('modal: aria-modal, focus moves in, Tab is trapped', () => {
    render(<Host modal />);
    fireEvent.click(trigger());
    flush();
    const el = panel() as HTMLElement;
    expect(el.getAttribute('aria-modal')).toBe('true');
    const close = el.querySelector('.oge-popover-close');
    expect(document.activeElement).toBe(close);
    const done = screen.getByRole('button', { name: 'Done' });
    act(() => done.focus());
    const notPrevented = fireEvent.keyDown(done, { key: 'Tab' });
    expect(notPrevented).toBe(false);
    expect(document.activeElement).toBe(close);
  });

  it('non-modal: Tab enters the portaled panel and continues after the trigger', () => {
    const log: string[] = [];
    render(<Host log={log} />);
    act(() => trigger().focus());
    fireEvent.click(trigger());
    flush();
    expect(document.activeElement).toBe(trigger());
    fireEvent.keyDown(trigger(), { key: 'Tab' });
    expect(document.activeElement).toBe(
      panel()?.querySelector('.oge-popover-close'),
    );
    const done = screen.getByRole('button', { name: 'Done' });
    act(() => done.focus());
    fireEvent.keyDown(done, { key: 'Tab' });
    flush();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'After' }),
    );
    expect(panel()).toBeNull();
    expect(log.at(-1)).toBe('closed:focusOut');
  });

  it('hover: dwell, grace period into the panel, close after leaving', () => {
    const log: string[] = [];
    render(<Host showOn="hover" log={log} />);
    expect(trigger().hasAttribute('aria-haspopup')).toBe(false);
    fireEvent.pointerEnter(trigger());
    flush(50);
    expect(panel()).toBeNull();
    flush(150);
    expect(panel()).not.toBeNull();
    fireEvent.pointerLeave(trigger());
    flush(100);
    fireEvent.pointerEnter(panel() as HTMLElement);
    flush(400);
    expect(panel()).not.toBeNull();
    fireEvent.pointerLeave(panel() as HTMLElement);
    flush(400);
    expect(panel()).toBeNull();
    expect(log.at(-1)).toBe('closed:pointerLeave');
  });

  it('focus: opens on focus, closes when focus leaves', () => {
    render(<Host showOn="focus" />);
    act(() => trigger().focus());
    flush();
    expect(panel()).not.toBeNull();
    act(() => screen.getByRole('button', { name: 'Before' }).focus());
    flush();
    expect(panel()).toBeNull();
  });

  it('manual: the trigger does nothing; the ref handle drives it', () => {
    const handle = createRef<OgePopoverHandle>();
    render(<Host showOn="manual" handle={handle} />);
    fireEvent.click(trigger());
    flush();
    expect(panel()).toBeNull();
    act(() => handle.current?.open());
    flush();
    expect(panel()).not.toBeNull();
    act(() => handle.current?.toggle());
    flush();
    expect(panel()).toBeNull();
  });

  it('controlled: open + onOpenChange', () => {
    function Controlled() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <span data-testid="state">{String(open)}</span>
          <OgePopover
            open={open}
            onOpenChange={setOpen}
            trigger={<button type="button">Details</button>}
            ariaLabel="Details"
          >
            Body
          </OgePopover>
          <button type="button" onClick={() => setOpen(true)}>
            External
          </button>
        </>
      );
    }
    render(<Controlled />);
    fireEvent.click(screen.getByRole('button', { name: 'External' }));
    flush();
    expect(panel()).not.toBeNull();
    expect(panel()?.getAttribute('aria-label')).toBe('Details');
    fireEvent.keyDown(document, { key: 'Escape' });
    flush();
    expect(panel()).toBeNull();
    expect(screen.getByTestId('state').textContent).toBe('false');
  });

  it('localizes the close button through the overlay config', () => {
    render(
      <OgeOverlayConfigProvider
        config={{ messages: { popoverClose: 'Kapat' } }}
      >
        <OgePopover
          defaultOpen
          anchor={null}
          renderTitle={() => <b className="rich">Share</b>}
        >
          Body
        </OgePopover>
      </OgeOverlayConfigProvider>,
    );
    flush();
    const el = panel() as HTMLElement;
    expect(el.querySelector('.oge-popover-title .rich')).not.toBeNull();
    expect(
      el.querySelector('.oge-popover-close')?.getAttribute('aria-label'),
    ).toBe('Kapat');
  });

  it('works under StrictMode (cleanup → remount keeps the machine usable)', () => {
    render(
      <StrictMode>
        <Host />
      </StrictMode>,
    );
    fireEvent.click(trigger());
    flush();
    expect(panel()).not.toBeNull();
    fireEvent.keyDown(document, { key: 'Escape' });
    flush();
    expect(panel()).toBeNull();
    fireEvent.click(trigger());
    flush();
    expect(panel()).not.toBeNull();
  });
});
