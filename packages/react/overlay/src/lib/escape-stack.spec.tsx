import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import {
  claimOverlayEscape,
  pushOverlay,
  removeOverlay,
  resetScrollLockForTests,
} from '@oge-ui/behavior';
import { OgeModal } from './modal';
import { OgePopover } from './popover';

/** 2.7 in the React layer — the same shared stack as the Angular spec. */
describe('shared Escape stack (React)', () => {
  const appLayer = { name: 'app layer' };
  let appLayerOpen = false;
  const onAppKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !claimOverlayEscape(event, appLayer)) return;
    appLayerOpen = false;
    removeOverlay(appLayer);
  };

  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame'],
    });
    document.addEventListener('keydown', onAppKeydown);
    resetScrollLockForTests();
  });

  afterEach(() => {
    document.removeEventListener('keydown', onAppKeydown);
    removeOverlay(appLayer);
    vi.useRealTimers();
    document.body.style.overflow = '';
  });

  const flush = () => act(() => vi.advanceTimersByTime(50));
  const escape = () => {
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
    });
    flush();
  };

  function Host() {
    const [modal, setModal] = useState(true);
    return (
      <OgeModal title="Edit" opened={modal} onOpenedChange={setModal}>
        <OgePopover
          title="Options"
          trigger={<button type="button">More</button>}
        >
          <p>Body</p>
        </OgePopover>
      </OgeModal>
    );
  }

  it('closes app layer, then popover, then modal — one per Escape', () => {
    render(<Host />);
    flush();
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    flush();
    expect(screen.getByRole('dialog', { name: 'Options' })).toBeInTheDocument();
    pushOverlay(appLayer);
    appLayerOpen = true;

    escape();
    expect(appLayerOpen).toBe(false);
    expect(screen.getByRole('dialog', { name: 'Options' })).toBeInTheDocument();

    escape();
    expect(screen.queryByRole('dialog', { name: 'Options' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Edit' })).toBeInTheDocument();

    escape();
    expect(screen.queryByRole('dialog', { name: 'Edit' })).toBeNull();
  });
});
