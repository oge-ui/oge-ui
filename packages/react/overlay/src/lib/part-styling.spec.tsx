import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { resetScrollLockForTests } from '@oge-ui/behavior';
import { OgeContextMenu } from './context-menu';
import { OgeModal } from './modal';
import {
  OgeModalProvider,
  useOgeModals,
  type OgeModalsHandle,
} from './modal-provider';
import { OgePopover } from './popover';

/**
 * Part styling (`panelClass`, `backdropClass`, `bodyClass`, `bodyStyle`,
 * `panelAttributes`) — the same contract as the Angular specs: classes join
 * the component's own, attributes pass `ogeSafeAttributes`.
 */
describe('React overlay part styling', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      setTimeout(() => cb(0), 0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
    resetScrollLockForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.style.overflow = '';
  });

  it('modal: panel, backdrop and body classes, body style and safe attributes', () => {
    function Host() {
      const [opened, setOpened] = useState(true);
      return (
        <OgeModal
          title="Styled"
          opened={opened}
          onOpenedChange={setOpened}
          panelClass={['brand-dialog']}
          backdropClass="brand-backdrop"
          bodyClass="brand-body"
          bodyStyle={{ maxHeight: '50vh' }}
          panelAttributes={{
            'data-testid': 'edit-dialog',
            role: 'alertdialog',
            onclick: 'alert(1)',
          }}
        >
          <p>Body</p>
        </OgeModal>
      );
    }
    render(<Host />);
    const panel = screen.getByRole('dialog', { name: 'Styled' });
    expect(panel).toHaveClass('oge-modal', 'brand-dialog');
    expect(panel).toHaveAttribute('data-testid', 'edit-dialog');
    expect(panel).not.toHaveAttribute('onclick');
    expect(panel.closest('.oge-modal-layer')).toHaveClass('brand-backdrop');
    const body = panel.querySelector('.oge-modal-body') as HTMLElement;
    expect(body).toHaveClass('brand-body');
    expect(body.style.maxHeight).toBe('50vh');
  });

  it('modal service: open() passes the part options through', () => {
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
    act(() => {
      modals.open(<p>Hi</p>, {
        title: 'Service',
        panelClass: 'brand-dialog',
        backdropClass: 'brand-backdrop',
        bodyClass: 'brand-body',
        bodyStyle: { paddingBlock: '4px' },
        panelAttributes: { 'data-testid': 'service-dialog' },
      });
    });
    const panel = screen.getByRole('dialog', { name: 'Service' });
    expect(panel).toHaveClass('brand-dialog');
    expect(panel).toHaveAttribute('data-testid', 'service-dialog');
    expect(panel.closest('.oge-modal-layer')).toHaveClass('brand-backdrop');
    const body = panel.querySelector('.oge-modal-body') as HTMLElement;
    expect(body).toHaveClass('brand-body');
    expect(body.style.paddingBlock).toBe('4px');
  });

  it('popover: panelClass and safe panelAttributes, own role kept', () => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame'],
    });
    render(
      <OgePopover
        trigger={<button type="button">Details</button>}
        title="Order"
        panelClass="brand-popover"
        panelAttributes={{ 'data-testid': 'order-popover', role: 'menu' }}
      >
        <p>Body</p>
      </OgePopover>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Details' }));
    act(() => vi.advanceTimersByTime(20));
    const panel = document.body.querySelector('.oge-popover') as HTMLElement;
    expect(panel).toHaveClass('brand-popover');
    expect(panel).toHaveAttribute('data-testid', 'order-popover');
    expect(panel).toHaveAttribute('role', 'dialog');
    vi.useRealTimers();
  });

  it('context menu: panelClass and panelAttributes reach the menu panel', async () => {
    vi.unstubAllGlobals();
    render(
      <OgeContextMenu
        items={[{ text: 'Open' }]}
        panelClass="brand-menu"
        panelAttributes={{ 'data-testid': 'row-menu', onfocus: 'x' }}
      >
        <div tabIndex={0} data-testid="target">
          Target
        </div>
      </OgeContextMenu>,
    );
    fireEvent.contextMenu(screen.getByTestId('target'), {
      clientX: 40,
      clientY: 30,
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    const panel = document.body.querySelector('.oge-popup') as HTMLElement;
    expect(panel).toHaveClass('brand-menu');
    expect(panel).toHaveAttribute('data-testid', 'row-menu');
    expect(panel).not.toHaveAttribute('onfocus');
  });
});
