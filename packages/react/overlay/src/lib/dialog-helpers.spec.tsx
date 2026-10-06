import { act, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { resetScrollLockForTests } from '@oge-ui/behavior';
import {
  OgeModalProvider,
  useOgeModals,
  type OgeModalsHandle,
} from './modal-provider';
import { OgeOverlayConfigProvider } from './overlay-config';

function Opener({ onHandle }: { onHandle: (h: OgeModalsHandle) => void }) {
  onHandle(useOgeModals());
  return null;
}

const frame = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector);

describe('useOgeModals() dialog helpers', () => {
  let modals!: OgeModalsHandle;

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

  function mount(strict = false, messages?: Record<string, string>) {
    const tree = (
      <OgeOverlayConfigProvider config={messages ? { messages } : undefined}>
        <OgeModalProvider>
          <Opener onHandle={(h) => (modals = h)} />
        </OgeModalProvider>
      </OgeOverlayConfigProvider>
    );
    return render(strict ? <StrictMode>{tree}</StrictMode> : tree);
  }

  it('confirm: alertdialog described by the message; OK resolves true', async () => {
    mount();
    let result!: Promise<boolean>;
    act(() => {
      result = modals.confirm({
        title: 'Archive?',
        message: 'Archive 3 rows.',
      });
    });
    await frame();
    const dialog = screen.getByRole('alertdialog', { name: 'Archive?' });
    expect(
      document.getElementById(dialog.getAttribute('aria-describedby')!)
        ?.textContent,
    ).toBe('Archive 3 rows.');
    expect(document.activeElement).toBe($('.oge-dialog-ok'));
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    await expect(result).resolves.toBe(true);
  });

  it('confirm danger: Cancel focused, destructive OK, Escape resolves false', async () => {
    mount(true);
    let result!: Promise<boolean>;
    act(() => {
      result = modals.confirm({
        message: 'Delete?',
        danger: true,
        okText: 'Delete',
      });
    });
    await frame();
    expect(document.activeElement).toBe($('.oge-dialog-cancel'));
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass(
      'oge-dialog-button-danger',
    );
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    await expect(result).resolves.toBe(false);
  });

  it('alert: single OK, severity icon, Escape acknowledges', async () => {
    mount();
    let done!: Promise<void>;
    act(() => {
      done = modals.alert({ message: 'Saved.', severity: 'success' });
    });
    await frame();
    expect($('.oge-dialog-cancel')).toBeNull();
    expect($('.oge-dialog-icon')).toHaveClass('oge-dialog-icon-success');
    expect(
      screen.getByRole('alertdialog', { name: 'Notice' }),
    ).toBeInTheDocument();
    fireEvent.keyDown($('.oge-dialog-ok')!, { key: 'Escape' });
    await expect(done).resolves.toBeUndefined();
  });

  it('a custom icon node replaces the built-in one', async () => {
    mount();
    act(() => {
      void modals.alert({
        message: 'x',
        severity: 'info',
        icon: <b className="my-icon">!</b>,
      });
    });
    await frame();
    expect($('.oge-dialog-icon .my-icon')).not.toBeNull();
    expect($('.oge-dialog-icon svg')).toBeNull();
  });

  it('prompt: field focused, Enter submits, validation blocks and wires aria', async () => {
    mount(true);
    let value!: Promise<string | null>;
    act(() => {
      value = modals.prompt({
        label: 'Name',
        required: true,
        validate: (v) => (v.length < 3 ? 'At least 3 characters.' : null),
      });
    });
    await frame();
    const input = screen.getByLabelText('Name') as HTMLInputElement;
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(document.activeElement).toBe(input);
    fireEvent.keyDown(input, { key: 'Enter' });
    await frame();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(
      document.getElementById(input.getAttribute('aria-describedby')!)
        ?.textContent,
    ).toBe('This field is required.');
    fireEvent.change(input, { target: { value: 'ab' } });
    expect(screen.getByText('At least 3 characters.')).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'abc' } });
    expect(input).not.toHaveAttribute('aria-invalid');
    fireEvent.keyDown(input, { key: 'Enter' });
    await expect(value).resolves.toBe('abc');
  });

  it('prompt: Cancel resolves null; defaults come from the overlay messages', async () => {
    mount(false, {
      dialogOk: 'Tamam',
      dialogCancel: 'Vazgeç',
      dialogPromptTitle: 'Değer girin',
    });
    let value!: Promise<string | null>;
    act(() => {
      value = modals.prompt({ defaultValue: 'x' });
    });
    await frame();
    expect(
      screen.getByRole('dialog', { name: 'Değer girin' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tamam' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Vazgeç' }));
    await expect(value).resolves.toBeNull();
  });

  it('async validation disables OK while pending', async () => {
    mount();
    let release!: (error: string | null) => void;
    let value!: Promise<string | null>;
    act(() => {
      value = modals.prompt({
        defaultValue: 'x',
        validate: () => new Promise((resolve) => (release = resolve)),
      });
    });
    await frame();
    fireEvent.click($('.oge-dialog-ok')!);
    expect($('.oge-dialog-ok')).toHaveAttribute('aria-disabled', 'true');
    await act(async () => release(null));
    await expect(value).resolves.toBe('x');
  });
});
