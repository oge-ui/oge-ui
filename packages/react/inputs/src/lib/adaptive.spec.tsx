import { StrictMode, useState } from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import type { OgeCalendarRange } from '@oge-ui/behavior';
import { OgeSelectBox } from './select-box';
import { OgeTagBox } from './tag-box';
import { OgeDateBox } from './date-box';
import { OgeDateRangeBox } from './date-range-box';
import { OgeInputsConfigProvider } from './inputs-config';

const CITIES = [
  { id: 1, name: 'Ankara' },
  { id: 2, name: 'Berlin' },
  { id: 3, name: 'Boston' },
];

function stubViewport(narrow: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        matches: query.includes('max-width') ? narrow : false,
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList,
  );
}

function SelectHost(props: { searchEnabled?: boolean }) {
  const [city, setCity] = useState<unknown>(null);
  return (
    <OgeSelectBox
      label="City"
      adaptiveMode="auto"
      items={CITIES}
      displayExpr="name"
      valueExpr="id"
      searchEnabled={props.searchEnabled}
      searchTimeout={0}
      value={city}
      onValueChange={setCity}
    />
  );
}

const layer = () => document.querySelector<HTMLElement>('.oge-popup');

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.style.overflow = '';
});

describe('adaptive popup editors (React)', () => {
  it('select box: a titled modal bottom sheet that commits and restores focus (StrictMode)', async () => {
    stubViewport(true);
    const { container } = render(
      <StrictMode>
        <SelectHost />
      </StrictMode>,
    );
    const field =
      container.querySelector<HTMLInputElement>('.oge-input-native')!;
    field.focus();
    fireEvent.click(field);
    await waitFor(() =>
      expect(layer()?.classList).toContain('oge-popup-adaptive-sheet'),
    );
    const dialog = layer()!.querySelector('.oge-popup-sheet')!;
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    const title = layer()!.querySelector('.oge-popup-sheet-title')!;
    expect(title.textContent).toBe('City');
    expect(dialog.getAttribute('aria-labelledby')).toBe(title.id);
    const listbox = layer()!.querySelector<HTMLElement>('[role="listbox"]')!;
    await waitFor(() => expect(document.activeElement).toBe(listbox));
    expect(document.body.style.overflow).toBe('hidden');
    expect(
      container.querySelector('.oge-input-container')!.closest('[inert]'),
    ).not.toBeNull();

    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    fireEvent.keyDown(listbox, { key: 'Enter' });
    await waitFor(() => expect(layer()).toBeNull());
    expect(field.value).toBe('Berlin');
    expect(document.activeElement).toBe(field);
    expect(document.body.style.overflow).toBe('');
    expect(container.querySelector('[inert]')).toBeNull();
  });

  it('select box: the sheet search field filters and the close button dismisses', async () => {
    stubViewport(true);
    const { container } = render(<SelectHost searchEnabled />);
    fireEvent.click(container.querySelector('.oge-input-native')!);
    const search = await waitFor(() => {
      const el = layer()?.querySelector<HTMLInputElement>(
        '.oge-sheet-search-input',
      );
      expect(el).toBeTruthy();
      return el!;
    });
    expect(search.getAttribute('role')).toBe('combobox');
    await waitFor(() => expect(document.activeElement).toBe(search));
    fireEvent.change(search, { target: { value: 'bo' } });
    await waitFor(() =>
      expect(
        Array.from(layer()!.querySelectorAll('.oge-select-option')).map(
          (option) => option.textContent,
        ),
      ).toEqual(['Boston']),
    );
    fireEvent.click(layer()!.querySelector('.oge-popup-sheet-close')!);
    await waitFor(() => expect(layer()).toBeNull());
  });

  it('stays anchored when wide or with the provider default', async () => {
    stubViewport(false);
    const wide = render(<SelectHost />);
    fireEvent.click(wide.container.querySelector('.oge-input-native')!);
    await waitFor(() => expect(layer()).not.toBeNull());
    expect(layer()!.classList).not.toContain('oge-popup-adaptive');
    wide.unmount();

    stubViewport(true);
    const plain = render(
      <OgeSelectBox label="City" items={['a', 'b']} defaultOpened />,
    );
    await waitFor(() => expect(layer()).not.toBeNull());
    expect(layer()!.classList).not.toContain('oge-popup-adaptive');
    plain.unmount();

    // …and a provider can switch the whole family on
    render(
      <OgeInputsConfigProvider config={{ adaptiveMode: 'auto' }}>
        <OgeSelectBox label="City" items={['a', 'b']} defaultOpened />
      </OgeInputsConfigProvider>,
    );
    await waitFor(() =>
      expect(layer()!.classList).toContain('oge-popup-adaptive'),
    );
  });

  it('tag box: stays open across picks and closes from Done', async () => {
    stubViewport(true);
    function Host() {
      const [value, setValue] = useState<readonly unknown[]>([]);
      return (
        <OgeTagBox
          label="Colors"
          adaptiveMode="auto"
          items={['Red', 'Green', 'Blue']}
          value={value}
          onValueChange={setValue}
        />
      );
    }
    const { container } = render(<Host />);
    fireEvent.click(container.querySelector('.oge-input-native')!);
    await waitFor(() => expect(layer()).not.toBeNull());
    const options = () =>
      Array.from(layer()!.querySelectorAll<HTMLElement>('.oge-select-option'));
    fireEvent.click(options()[0]);
    fireEvent.click(options()[2]);
    await waitFor(() =>
      expect(container.querySelectorAll('.oge-tag').length).toBe(2),
    );
    expect(layer()).not.toBeNull();
    const done = layer()!.querySelector<HTMLButtonElement>('.oge-sheet-done')!;
    expect(done.textContent).toBe('Done');
    fireEvent.click(done);
    await waitFor(() => expect(layer()).toBeNull());
  });

  it('date box: a full-screen dialog with a single dialog role', async () => {
    stubViewport(true);
    const { container } = render(
      <OgeDateBox
        label="Due"
        adaptiveMode="auto"
        defaultValue={new Date(2026, 4, 10)}
      />,
    );
    fireEvent.click(container.querySelector('.oge-input-native')!);
    await waitFor(() =>
      expect(layer()?.classList).toContain('oge-popup-adaptive-fullscreen'),
    );
    expect(layer()!.querySelectorAll('[role="dialog"]').length).toBe(1);
    expect(layer()!.querySelector('.oge-popup-sheet-handle')).toBeNull();
    expect(layer()!.querySelector('.oge-popup-sheet-title')!.textContent).toBe(
      'Due',
    );
  });

  it('date range box: picks both ends, then applies from Done', async () => {
    stubViewport(true);
    const changes: OgeCalendarRange[] = [];
    const { container } = render(
      <OgeDateRangeBox
        label="Trip"
        adaptiveMode="auto"
        onValueChange={(range) => changes.push(range)}
      />,
    );
    fireEvent.click(container.querySelector('.oge-input-native')!);
    await waitFor(() => expect(layer()).not.toBeNull());
    const days = () =>
      Array.from(
        layer()!.querySelectorAll<HTMLButtonElement>(
          '.oge-calendar-cell:not(.oge-calendar-cell-other):not(:disabled)',
        ),
      );
    fireEvent.click(days()[2]);
    fireEvent.click(days()[5]);
    // still open — the adaptive dialog applies explicitly
    expect(layer()).not.toBeNull();
    fireEvent.click(layer()!.querySelector('.oge-sheet-done')!);
    await waitFor(() => expect(layer()).toBeNull());
    const last = changes[changes.length - 1];
    expect(last[0]).not.toBeNull();
    expect(last[1]).not.toBeNull();
  });
});
