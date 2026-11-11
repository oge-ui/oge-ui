import { act, fireEvent, render } from '@testing-library/react';
import { createRef, useState } from 'react';
import {
  resetScrollLockForTests,
  type OgeMenuItem,
  type OgeModalCloseBlockedEvent,
} from '@oge-ui/behavior';
import { OgeMenuList, type OgeMenuListItemClickEvent } from './menu-list';
import { OgeModal, type OgeModalHandle } from './modal';
import {
  OgeModalProvider,
  useOgeModals,
  type OgeModalsHandle,
} from './modal-provider';

const frame = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

describe('Section 3: React modal, confirm and menu additions', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      setTimeout(() => cb(0), 0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
    resetScrollLockForTests();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.style.overflow = '';
  });

  it('loading still closes, closeBlocked says why, autoFocus false focuses the panel', async () => {
    const ref = createRef<OgeModalHandle>();
    const blocked: OgeModalCloseBlockedEvent[] = [];
    let setBusy!: (v: boolean) => void;
    let setCancel!: (v: boolean) => void;
    let setGuardFalse!: (v: boolean) => void;
    function Host() {
      const [opened, setOpened] = useState(true);
      const [busy, b] = useState(false);
      const [cancel, c] = useState(false);
      const [guardFalse, g] = useState(false);
      setBusy = b;
      setCancel = c;
      setGuardFalse = g;
      return (
        <OgeModal
          ref={ref}
          title="Edit"
          opened={opened}
          onOpenedChange={setOpened}
          busy={busy}
          loading
          autoFocus={false}
          closeGuard={guardFalse ? () => false : undefined}
          onClosing={(event) => {
            if (cancel) event.cancel = true;
          }}
          onCloseBlocked={(event) => blocked.push(event)}
        >
          <input className="first" />
        </OgeModal>
      );
    }
    render(<Host />);
    await frame();
    const panel = document.querySelector('.oge-modal') as HTMLElement;
    expect(document.activeElement).toBe(panel);
    expect(panel.getAttribute('aria-busy')).toBe('true');
    const escape = () =>
      fireEvent.keyDown(document, { key: 'Escape', bubbles: true });
    act(() => setBusy(true));
    escape();
    act(() => {
      setBusy(false);
      setCancel(true);
    });
    escape();
    act(() => {
      setCancel(false);
      setGuardFalse(true);
    });
    escape();
    expect(blocked).toEqual([
      { reason: 'escape', blockedBy: 'busy' },
      { reason: 'escape', blockedBy: 'closing' },
      { reason: 'escape', blockedBy: 'guard' },
    ]);
    act(() => setGuardFalse(false));
    act(() => ref.current?.close());
    await frame();
    expect(document.querySelector('.oge-modal')).toBeNull();
  });

  it('confirm gates hold OK until the text is typed and the box ticked', async () => {
    let modals!: OgeModalsHandle;
    function Opener() {
      modals = useOgeModals();
      return null;
    }
    render(
      <OgeModalProvider>
        <Opener />
      </OgeModalProvider>,
    );
    let result!: Promise<boolean>;
    act(() => {
      result = modals.confirm({
        message: 'Delete the project?',
        details: 'Removes 12 files.',
        typeToConfirm: 'acme-web',
        acknowledgeLabel: 'I understand',
        severity: 'danger',
      });
    });
    await frame();
    expect(document.querySelector('p.oge-dialog-details')?.textContent).toBe(
      'Removes 12 files.',
    );
    const ok = document.querySelector('.oge-dialog-ok') as HTMLButtonElement;
    const field = document.querySelector(
      '.oge-dialog-type-confirm',
    ) as HTMLInputElement;
    expect(ok.getAttribute('aria-disabled')).toBe('true');
    fireEvent.change(field, { target: { value: 'acme-web' } });
    expect(ok.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(
      document.querySelector('.oge-dialog-checkbox') as HTMLInputElement,
    );
    expect(ok.getAttribute('aria-disabled')).toBeNull();
    fireEvent.click(ok);
    await frame();
    await expect(result).resolves.toBe(true);
  });

  it('menu rows: hidden items and stranded separators drop, cssClass lands', () => {
    const items: OgeMenuItem[] = [
      { text: 'Open' },
      { text: '', separator: true },
      { text: 'Admin only', visible: false },
      { text: '', separator: true },
      { text: 'Delete', cssClass: 'menu-danger-zone' },
    ];
    const clicks: OgeMenuListItemClickEvent[] = [];
    const { container } = render(
      <OgeMenuList items={items} onItemClick={(e) => clicks.push(e)} />,
    );
    const rows = Array.from(
      container.querySelectorAll('.oge-menu-item, .oge-menu-separator'),
    );
    expect(rows.map((row) => row.textContent?.trim() || '—')).toEqual([
      'Open',
      '—',
      'Delete',
    ]);
    expect(rows[2].classList).toContain('menu-danger-zone');
    fireEvent.click(rows[2]);
    expect(clicks[0]).toMatchObject({ item: { text: 'Delete' }, index: 2 });
  });
});
