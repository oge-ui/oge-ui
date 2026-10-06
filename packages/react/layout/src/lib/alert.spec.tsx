import { StrictMode, createRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { OgeAlert, type OgeAlertHandle } from './alert';
import { OgeAlertConfigProvider } from './layout-config';

const host = () => document.querySelector('.oge-alert') as HTMLElement;

describe('<OgeAlert>', () => {
  it('defaults to an info status with an sr-only prefix and a decorative glyph', () => {
    render(
      <OgeAlert actions={<button>Clean up</button>}>
        Disk almost full.
      </OgeAlert>,
    );
    expect(screen.getByRole('status')).toHaveClass('oge-alert-info');
    expect(document.querySelector('.oge-sr-only')?.textContent?.trim()).toBe(
      'Information',
    );
    expect(document.querySelector('.oge-alert-icon')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(document.querySelector('.oge-alert-actions button')).not.toBeNull();
  });

  it('derives the role from severity and honours live', () => {
    const { rerender } = render(<OgeAlert severity="error">x</OgeAlert>);
    expect(screen.getByRole('alert')).toHaveClass('oge-alert-error');
    rerender(
      <OgeAlert severity="error" live="polite">
        x
      </OgeAlert>,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    rerender(
      <OgeAlert severity="error" live="off">
        x
      </OgeAlert>,
    );
    expect(host()).not.toHaveAttribute('role');
  });

  it('puts the prefix in the title; a custom icon replaces the glyph', () => {
    render(
      <OgeAlert
        severity="warning"
        title="Storage"
        icon={<i className="mine" />}
      >
        x
      </OgeAlert>,
    );
    expect(document.querySelector('.oge-alert-title')?.textContent).toBe(
      'Warning Storage',
    );
    expect(document.querySelector('.oge-alert-icon .mine')).not.toBeNull();
    expect(document.querySelector('.oge-alert-icon path')).toBeNull();
  });

  it('dismiss closes uncontrolled, keeps the role and moves focus past it', () => {
    const closed: unknown[] = [];
    render(
      <>
        <OgeAlert dismissible onClosed={(e) => closed.push(e)}>
          x
        </OgeAlert>
        <button>After</button>
      </>,
    );
    const dismiss = screen.getByRole('button', { name: 'Dismiss' });
    act(() => dismiss.focus());
    fireEvent.click(dismiss);
    expect(closed).toHaveLength(1);
    expect(host()).toHaveAttribute('hidden');
    expect(host()).toHaveAttribute('role', 'status');
    expect(document.querySelector('.oge-alert-body')).toBeNull();
    expect(document.activeElement?.textContent).toBe('After');
  });

  it('a cancelled closing keeps it; the handle closes and shows', () => {
    const ref = createRef<OgeAlertHandle>();
    const { rerender } = render(
      <OgeAlert ref={ref} onClosing={(e) => (e.cancel = true)}>
        x
      </OgeAlert>,
    );
    act(() => ref.current?.close());
    expect(host()).not.toHaveAttribute('hidden');
    rerender(<OgeAlert ref={ref}>x</OgeAlert>);
    act(() => ref.current?.close());
    expect(host()).toHaveAttribute('hidden');
    act(() => ref.current?.show());
    expect(host()).not.toHaveAttribute('hidden');
  });

  it('controlled visibility reports through onVisibleChange', () => {
    const changes: boolean[] = [];
    render(
      <OgeAlert visible dismissible onVisibleChange={(v) => changes.push(v)}>
        x
      </OgeAlert>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(changes).toEqual([false]);
    // still controlled → still visible
    expect(host()).not.toHaveAttribute('hidden');
  });

  it('reads the config and survives StrictMode', () => {
    render(
      <StrictMode>
        <OgeAlertConfigProvider
          config={{
            severity: 'success',
            stylingMode: 'filled',
            messages: { dismiss: 'Kapat', success: 'Başarılı' },
          }}
        >
          <OgeAlert dismissible>Kaydedildi.</OgeAlert>
        </OgeAlertConfigProvider>
      </StrictMode>,
    );
    expect(host()).toHaveClass('oge-alert-success', 'oge-alert-filled');
    fireEvent.click(screen.getByRole('button', { name: 'Kapat' }));
    expect(host()).toHaveAttribute('hidden');
  });
});
