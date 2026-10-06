import { StrictMode, createRef, useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  resetScrollLockForTests,
  type OgeActionSheetClosedEvent,
  type OgeActionSheetItem,
  type OgeActionSheetItemClickEvent,
} from '@oge-ui/behavior';
import { OgeActionSheet, type OgeActionSheetHandle } from './action-sheet';
import { OgeOverlayConfigProvider } from './overlay-config';

const ITEMS: OgeActionSheetItem[] = [
  { key: 'share', text: 'Share', icon: 'M4 12h16' },
  { key: 'copy', text: 'Copy link', disabled: true },
  { key: 'report', text: 'Report', group: 'bottom' },
  { key: 'delete', text: 'Delete', destructive: true, description: 'Forever' },
];

const menuItems = () => screen.getAllByRole('menuitem');

function Harness(props: {
  onClosed?: (e: OgeActionSheetClosedEvent) => void;
  onItemClick?: (e: OgeActionSheetItemClickEvent) => void;
  sheetRef?: React.Ref<OgeActionSheetHandle>;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        More
      </button>
      <OgeActionSheet
        ref={props.sheetRef}
        opened={open}
        onOpenedChange={setOpen}
        items={ITEMS}
        title={props.title}
        description="Choose what to do"
        onClosed={props.onClosed}
        onItemClick={props.onItemClick}
      />
    </>
  );
}

beforeEach(() => {
  resetScrollLockForTests();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
    setTimeout(() => cb(0), 0),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe('<OgeActionSheet>', () => {
  it('opens as a labelled modal dialog with an APG menu', () => {
    render(<Harness title="Photo" />);
    expect(screen.queryByRole('dialog')).toBeNull();
    const trigger = screen.getByRole('button', { name: 'More' });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Photo' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog.parentElement?.parentElement).toBe(document.body);
    expect(dialog).toHaveAccessibleDescription('Choose what to do');
    expect(screen.getByRole('menu', { name: 'Photo' })).toBeTruthy();
    expect(menuItems().map((i) => i.textContent)).toEqual([
      'Share',
      'Copy link',
      'DeleteForever',
      'Report',
    ]);
    expect(screen.getByRole('separator')).toBeTruthy();
    expect(menuItems()[1]).toHaveAttribute('aria-disabled', 'true');
    expect(document.activeElement).toBe(menuItems()[0]);
    expect(menuItems()[0]).toHaveAttribute('tabindex', '0');
    expect(menuItems()[2]).toHaveAttribute('tabindex', '-1');
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('runs the keyboard, activates, closes and restores focus', () => {
    const closed: OgeActionSheetClosedEvent[] = [];
    const clicks: OgeActionSheetItemClickEvent[] = [];
    render(
      <Harness
        title="Photo"
        onClosed={(e) => closed.push(e)}
        onItemClick={(e) => clicks.push(e)}
      />,
    );
    const trigger = screen.getByRole('button', { name: 'More' });
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.keyDown(menuItems()[0], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(menuItems()[2]);
    fireEvent.keyDown(menuItems()[2], { key: 'ArrowUp' });
    expect(document.activeElement).toBe(menuItems()[0]);
    fireEvent.keyDown(menuItems()[0], { key: 'End' });
    expect(document.activeElement).toBe(menuItems()[3]);
    fireEvent.keyDown(menuItems()[3], { key: 'Enter' });
    expect(clicks.map((c) => c.item.key)).toEqual(['report']);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(closed).toEqual([{ reason: 'action', item: ITEMS[2] }]);
    expect(document.activeElement).toBe(trigger);
    expect(document.body.style.overflow).toBe('');
  });

  it('closes on Escape and Cancel; names itself from the messages', () => {
    const closed: OgeActionSheetClosedEvent[] = [];
    render(<Harness onClosed={(e) => closed.push(e)} />);
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    expect(screen.getByRole('dialog', { name: 'Actions' })).toBeTruthy();
    fireEvent.keyDown(menuItems()[0], { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(closed.map((c) => c.reason)).toEqual(['escape', 'cancel']);
  });

  it('resolves open() with the chosen action, null when dismissed', async () => {
    const ref = createRef<OgeActionSheetHandle>();
    render(
      <OgeOverlayConfigProvider
        config={{ messages: { actionSheetCancel: 'Vazgeç' } }}
      >
        <OgeActionSheet
          ref={ref}
          items={ITEMS}
          title="Photo"
          renderItem={({ item, index }) => (
            <b className="custom">
              {index}:{item.text}
            </b>
          )}
        >
          <p className="extra">Projected</p>
        </OgeActionSheet>
      </OgeOverlayConfigProvider>,
    );
    let result!: Promise<OgeActionSheetItem | null>;
    act(() => {
      result = ref.current!.open();
    });
    expect(document.querySelector('.extra')?.textContent).toBe('Projected');
    expect(document.querySelectorAll('.custom')[0].textContent).toBe('0:Share');
    fireEvent.click(menuItems()[0]);
    await expect(result).resolves.toBe(ITEMS[0]);

    act(() => {
      result = ref.current!.open();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Vazgeç' }));
    await expect(result).resolves.toBeNull();

    act(() => ref.current!.toggle());
    expect(screen.getByRole('dialog')).toBeTruthy();
    act(() => ref.current!.toggle());
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('honours keepOpen, onClosing veto and onOpening veto', async () => {
    const ref = createRef<OgeActionSheetHandle>();
    let veto = true;
    render(
      <OgeActionSheet
        ref={ref}
        items={ITEMS}
        onOpening={(e) => (e.cancel = veto)}
        onClosing={(e) => (e.cancel = e.reason === 'escape')}
        onItemClick={(e) => (e.keepOpen = e.item.key === 'share')}
      />,
    );
    let result!: Promise<OgeActionSheetItem | null>;
    act(() => {
      result = ref.current!.open();
    });
    await expect(result).resolves.toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    veto = false;
    act(() => {
      void ref.current!.open();
    });
    fireEvent.click(menuItems()[0]);
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(menuItems()[1]); // disabled
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.keyDown(menuItems()[0], { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('survives StrictMode double effects', () => {
    render(
      <StrictMode>
        <Harness title="Photo" />
      </StrictMode>,
    );
    const trigger = screen.getByRole('button', { name: 'More' });
    trigger.focus();
    fireEvent.click(trigger);
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.activeElement).toBe(menuItems()[0]);
    fireEvent.keyDown(menuItems()[0], { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(trigger);
  });
});
