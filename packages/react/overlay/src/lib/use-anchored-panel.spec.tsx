import { act, render, screen } from '@testing-library/react';
import { StrictMode, useRef } from 'react';
import { OgePopup } from './popup';
import {
  useAnchoredPanel,
  type OgeAnchoredPanelHandle,
} from './use-anchored-panel';

/**
 * jsdom has no real layout, so positions resolve to 0-geometry — these specs
 * cover the machine's React seam (state mirroring, open/close lifecycle,
 * StrictMode) rather than the flip/clamp math, which `@oge-ui/behavior`'s own
 * suite already proves.
 */
function Host({
  onHandle,
}: {
  onHandle?: (h: OgeAnchoredPanelHandle) => void;
}) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const panel = useAnchoredPanel({
    anchor: () => anchorRef.current,
    panel: () => popupRef.current,
    restoreFocus: () => anchorRef.current?.focus(),
  });
  onHandle?.(panel);
  return (
    <>
      <button ref={anchorRef} onClick={() => panel.toggle()}>
        Anchor
      </button>
      {panel.isOpen && (
        <OgePopup panel={panel} ref={popupRef}>
          <span>Panel content</span>
        </OgePopup>
      )}
    </>
  );
}

const flushFrames = async () => {
  // the machine measures on requestAnimationFrame; give it a couple of turns
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
};

describe('useAnchoredPanel', () => {
  it('open() renders the popup with the machine id and position classes', async () => {
    let handle!: OgeAnchoredPanelHandle;
    render(<Host onHandle={(h) => (handle = h)} />);
    expect(screen.queryByText('Panel content')).toBeNull();

    act(() => handle.open());
    expect(screen.getByText('Panel content')).toBeInTheDocument();
    const popup = document.querySelector('.oge-popup') as HTMLElement;
    expect(popup.id).toBe(handle.panelId);

    await flushFrames();
    expect(popup).toHaveClass('oge-popup-ready');
  });

  it('outside pointerdown closes; a click inside does not', async () => {
    let handle!: OgeAnchoredPanelHandle;
    render(<Host onHandle={(h) => (handle = h)} />);
    act(() => handle.open());
    await flushFrames();

    act(() => {
      document
        .querySelector('.oge-popup')!
        .dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    });
    expect(screen.getByText('Panel content')).toBeInTheDocument();

    act(() => {
      document.body.dispatchEvent(
        new MouseEvent('pointerdown', { bubbles: true }),
      );
    });
    expect(screen.queryByText('Panel content')).toBeNull();
  });

  it('Escape closes the panel and restores focus to the anchor', async () => {
    let handle!: OgeAnchoredPanelHandle;
    render(<Host onHandle={(h) => (handle = h)} />);
    act(() => handle.open());
    await flushFrames();

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
    });
    expect(screen.queryByText('Panel content')).toBeNull();
    expect(screen.getByRole('button', { name: 'Anchor' })).toHaveFocus();
  });

  it('works under StrictMode (destroy → remount keeps the machine usable)', async () => {
    let handle!: OgeAnchoredPanelHandle;
    render(
      <StrictMode>
        <Host onHandle={(h) => (handle = h)} />
      </StrictMode>,
    );
    act(() => handle.open());
    expect(screen.getByText('Panel content')).toBeInTheDocument();
    act(() => handle.close());
    expect(screen.queryByText('Panel content')).toBeNull();
    act(() => handle.open());
    expect(screen.getByText('Panel content')).toBeInTheDocument();
  });
});
