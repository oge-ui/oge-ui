import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { useState } from 'react';
import { OgeColorBox, type OgeColorBoxProps } from './color-box';

const input = () => screen.getByRole('combobox') as HTMLInputElement;
const query = <T extends HTMLElement>(selector: string): T => {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`expected element: ${selector}`);
  return el;
};

interface HostState {
  values: (string | null)[];
}

function newState(): HostState {
  return { values: [] };
}

const current = (state: HostState, initial: string | null = null) =>
  state.values.length ? state.values[state.values.length - 1] : initial;

function renderHost(
  state: HostState,
  initial: string | null = null,
  extra: Partial<OgeColorBoxProps> = {},
) {
  function Host() {
    const [value, setValue] = useState<string | null>(initial);
    return (
      <OgeColorBox
        label="Color"
        value={value}
        onValueChange={(next) => {
          state.values.push(next);
          setValue(next);
        }}
        {...extra}
      />
    );
  }
  return render(<Host />);
}

/** Opens the picker and lets the popup's rAF measurement settle. */
async function open(): Promise<void> {
  fireEvent.keyDown(input(), { key: 'ArrowDown' });
  await waitFor(() => query('.oge-color-box-panel'));
  await act(async () => {
    await Promise.resolve();
  });
}

function type(text: string): void {
  fireEvent.change(input(), { target: { value: text } });
}

function keydown(el: HTMLElement, key: string, init: object = {}): void {
  fireEvent.keyDown(el, { key, ...init });
}

/** Applies an uncontrolled panel field the way a user does: type, then blur. */
function commitField(el: HTMLInputElement, text: string): void {
  el.value = text;
  fireEvent.blur(el);
}

beforeEach(() => {
  vi.stubGlobal(
    'requestAnimationFrame',
    (cb: FrameRequestCallback) =>
      setTimeout(() => cb(performance.now()), 0) as unknown as number,
  );
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('<OgeColorBox>', () => {
  it('shows the committed string verbatim, paints the swatch and renders the rail button', () => {
    renderHost(newState(), 'rgb(255, 0, 0)');
    expect(input().value).toBe('rgb(255, 0, 0)');
    expect(
      query<HTMLElement>('.oge-color-box-swatch-fill').style.background,
    ).toContain('rgb(255, 0, 0)');
    expect(document.querySelector('.oge-input-dropdown')).toBeTruthy();
  });

  it('commits typed text normalized to the format on Enter', () => {
    const state = newState();
    renderHost(state);
    type('RED');
    keydown(input(), 'Enter');
    expect(current(state)).toBe('#ff0000');
  });

  it('commits per format: rgba and hsl', () => {
    const rgba = newState();
    const { unmount } = renderHost(rgba, null, { format: 'rgba' });
    type('#ff0000');
    fireEvent.blur(input());
    expect(current(rgba)).toBe('rgba(255, 0, 0, 1)');
    unmount();

    const hsl = newState();
    renderHost(hsl, null, { format: 'hsl' });
    type('#00ff00');
    fireEvent.blur(input());
    expect(current(hsl)).toBe('hsl(120, 100%, 50%)');
  });

  it('coerces alpha opaque without editAlphaChannel, widens with it', () => {
    const opaque = newState();
    const { unmount } = renderHost(opaque);
    type('rgba(255, 0, 0, 0.5)'); // parses fine, commits opaque
    fireEvent.blur(input());
    expect(current(opaque)).toBe('#ff0000');
    unmount();

    const withAlpha = newState();
    renderHost(withAlpha, null, { editAlphaChannel: true });
    type('rgba(255, 0, 0, 0.5)');
    fireEvent.blur(input());
    expect(current(withAlpha)).toBe('#ff000080');
  });

  it('marks unparseable text invalid while typing and reverts on blur', () => {
    const state = newState();
    renderHost(state, '#3aa0ff');
    type('not-a-color');
    expect(document.querySelector('.oge-input-invalid')).toBeTruthy();
    expect(query<HTMLElement>('.oge-input-error').textContent).toContain(
      'Enter a valid color',
    );
    fireEvent.blur(input());
    expect(current(state, '#3aa0ff')).toBe('#3aa0ff'); // never committed
    expect(input().value).toBe('#3aa0ff'); // reverted, not cleared
    expect(document.querySelector('.oge-input-invalid')).toBeNull();
  });

  it('empty text commits null; the clear button clears', () => {
    const state = newState();
    const { unmount } = renderHost(state, '#ff0000', {
      showClearButton: true,
    });
    type('');
    fireEvent.blur(input());
    expect(current(state, '#ff0000')).toBeNull();
    unmount();

    const cleared = newState();
    renderHost(cleared, '#00ff00', { showClearButton: true });
    fireEvent.click(query<HTMLElement>('.oge-input-clear'));
    expect(current(cleared, '#00ff00')).toBeNull();
  });

  it('ArrowDown opens the labeled dialog and reports the panel events', async () => {
    const log: string[] = [];
    renderHost(newState(), null, {
      onDropDownOpened: () => log.push('opened'),
      onDropDownClosed: () => log.push('closed'),
    });
    await open();
    const dialog = query<HTMLElement>('.oge-color-box-panel');
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-label')).toBe('Color');
    expect(input().getAttribute('aria-expanded')).toBe('true');

    keydown(query('.oge-color-surface-thumb'), 'Escape');
    await waitFor(() =>
      expect(document.querySelector('.oge-color-box-panel')).toBeNull(),
    );
    expect(log).toEqual(['opened', 'closed']);
  });

  it('keeps programmatic writes verbatim and re-derives the panel from them', async () => {
    renderHost(newState(), 'cornflowerblue');
    expect(input().value).toBe('cornflowerblue'); // never reformatted
    await open();
    expect(
      query<HTMLInputElement>('.oge-color-box-field-hex .oge-color-box-channel')
        .value,
    ).toBe('#6495ed');
  });
});

describe('<OgeColorBox> panel', () => {
  const PALETTE = [
    '#ff0000',
    '#00ff00',
    '#0000ff',
    '#ffff00',
    '#00ffff',
    '#ff00ff',
  ];

  it('moves DOM focus onto the surface thumb on open and restores it on Escape', async () => {
    renderHost(newState(), '#3aa0ff');
    await open();
    const thumb = query<HTMLElement>('.oge-color-surface-thumb');
    expect(document.activeElement).toBe(thumb);
    keydown(thumb, 'Escape');
    await waitFor(() => expect(document.activeElement).toBe(input()));
  });

  it('renders hue and (opt-in) alpha sliders with the APG slider contract', async () => {
    const { unmount } = renderHost(newState(), '#ff0000');
    await open();
    expect(document.querySelectorAll('.oge-color-slider')).toHaveLength(1);
    const hue = query<HTMLElement>('.oge-color-slider .oge-color-slider-thumb');
    expect(hue.getAttribute('role')).toBe('slider');
    expect(hue.getAttribute('aria-valuemin')).toBe('0');
    expect(hue.getAttribute('aria-valuemax')).toBe('360');
    expect(hue.getAttribute('aria-valuenow')).toBe('0');
    expect(hue.getAttribute('aria-valuetext')).toBe('0 degrees');
    unmount();

    renderHost(newState(), '#ff0000', { editAlphaChannel: true });
    await open();
    const alpha = query<HTMLElement>(
      '.oge-color-slider-alpha .oge-color-slider-thumb',
    );
    expect(alpha.getAttribute('aria-valuemax')).toBe('100');
    expect(alpha.getAttribute('aria-valuetext')).toBe('100%');
  });

  it('hue keyboard steps by keyStep, PageUp by 5×, Home/End to the rails — committing live', async () => {
    const state = newState();
    renderHost(state, '#ff0000'); // h=0, s=100, v=100
    await open();
    const hue = () =>
      query<HTMLElement>('.oge-color-slider .oge-color-slider-thumb');
    keydown(hue(), 'ArrowRight');
    expect(hue().getAttribute('aria-valuenow')).toBe('5');
    expect(current(state, '#ff0000')).toBe('#ff1500');
    keydown(hue(), 'PageUp');
    expect(hue().getAttribute('aria-valuenow')).toBe('30');
    keydown(hue(), 'End');
    expect(hue().getAttribute('aria-valuenow')).toBe('360');
    keydown(hue(), 'Home');
    expect(hue().getAttribute('aria-valuenow')).toBe('0');
    expect(current(state, '#ff0000')).toBe('#ff0000');
  });

  it('the 2D surface moves saturation with Left/Right and brightness with Up/Down/PageDown; Home is a no-op', async () => {
    renderHost(newState(), '#ff0000'); // s=100, v=100
    await open();
    const thumb = () => query<HTMLElement>('.oge-color-surface-thumb');
    expect(thumb().getAttribute('aria-roledescription')).toBe(
      '2-dimensional color picker',
    );
    expect(thumb().getAttribute('aria-valuetext')).toBe(
      'Saturation 100%, Brightness 100%',
    );
    keydown(thumb(), 'ArrowLeft');
    expect(thumb().getAttribute('aria-valuetext')).toBe(
      'Saturation 95%, Brightness 100%',
    );
    keydown(thumb(), 'ArrowDown');
    expect(thumb().getAttribute('aria-valuetext')).toBe(
      'Saturation 95%, Brightness 95%',
    );
    keydown(thumb(), 'PageDown');
    expect(thumb().getAttribute('aria-valuetext')).toBe(
      'Saturation 95%, Brightness 70%',
    );
    const before = thumb().getAttribute('aria-valuetext');
    keydown(thumb(), 'Home');
    expect(thumb().getAttribute('aria-valuetext')).toBe(before);
  });

  it('hex and channel inputs apply parsed values and revert garbage', async () => {
    const state = newState();
    renderHost(state, '#000000');
    await open();
    const hex = () =>
      query<HTMLInputElement>(
        '.oge-color-box-field-hex .oge-color-box-channel',
      );
    commitField(hex(), '#00ff00');
    expect(current(state, '#000000')).toBe('#00ff00');

    commitField(hex(), 'zzz');
    expect(hex().value).toBe('#00ff00'); // reverted
    expect(current(state, '#000000')).toBe('#00ff00');

    const red = document.querySelectorAll<HTMLInputElement>(
      '.oge-color-box-channel',
    )[1]; // hex, r, g, b
    commitField(red, '255');
    expect(current(state, '#000000')).toBe('#ffff00');
  });

  it('palette view: grid semantics, arrow navigation and Enter pick close the panel', async () => {
    const state = newState();
    renderHost(state, null, {
      view: 'palette',
      palette: PALETTE,
      paletteColumns: 3,
    });
    await open();
    const grid = query<HTMLElement>('.oge-color-palette');
    expect(grid.getAttribute('role')).toBe('grid');
    expect(grid.getAttribute('aria-label')).toBe('Color palette');
    expect(document.querySelectorAll('[role="row"]')).toHaveLength(2); // 6 / 3

    const first = query<HTMLElement>('[data-index="0"]');
    expect(document.activeElement).toBe(first); // focus target in palette view
    keydown(first, 'ArrowRight');
    const second = query<HTMLElement>('[data-index="1"]');
    expect(document.activeElement).toBe(second);
    expect(second.getAttribute('tabindex')).toBe('0');
    expect(query('[data-index="0"]').getAttribute('tabindex')).toBe('-1');
    keydown(second, 'ArrowDown');
    const fifth = query<HTMLElement>('[data-index="4"]');
    expect(document.activeElement).toBe(fifth);
    keydown(fifth, 'Enter');
    expect(current(state)).toBe('#00ffff');
    await waitFor(() =>
      expect(document.querySelector('.oge-color-box-panel')).toBeNull(),
    );
    expect(document.activeElement).toBe(input());
  });

  it('palette marks the current color selected with a contrast checkmark', async () => {
    renderHost(newState(), '#ffff00', {
      view: 'both',
      palette: PALETTE,
      paletteColumns: 3,
    });
    await open();
    const selected = query<HTMLElement>('.oge-color-palette-selected');
    expect(selected.getAttribute('aria-selected')).toBe('true');
    expect(
      selected
        .querySelector('.oge-color-palette-check')
        ?.getAttribute('stroke'),
    ).toBe('black'); // yellow swatch → black check
  });

  it('useButtons drafts interactions and commits only on OK; Cancel discards', async () => {
    const state = newState();
    renderHost(state, '#ff0000', { applyValueMode: 'useButtons' });
    await open();
    const hue = () =>
      query<HTMLElement>('.oge-color-slider .oge-color-slider-thumb');
    keydown(hue(), 'End'); // h → 360 (same color as 0)
    keydown(hue(), 'PageDown'); // h → 335
    expect(state.values).toHaveLength(0); // drafted only
    fireEvent.click(query<HTMLButtonElement>('.oge-color-box-ok'));
    expect(current(state, '#ff0000')).toBe('#ff006a');
    await waitFor(() =>
      expect(document.querySelector('.oge-color-box-panel')).toBeNull(),
    );

    await open();
    keydown(hue(), 'PageUp');
    fireEvent.click(
      query<HTMLButtonElement>(
        '.oge-color-box-actions .oge-color-box-action:not(.oge-color-box-ok)',
      ),
    );
    expect(current(state, '#ff0000')).toBe('#ff006a'); // unchanged
  });

  it('useButtons palette pick drafts without closing', async () => {
    const state = newState();
    renderHost(state, null, {
      applyValueMode: 'useButtons',
      view: 'palette',
      palette: PALETTE,
      paletteColumns: 3,
    });
    await open();
    fireEvent.click(query<HTMLElement>('[data-index="0"]'));
    expect(state.values).toHaveLength(0);
    expect(document.querySelector('.oge-color-box-panel')).toBeTruthy();
    fireEvent.click(query<HTMLButtonElement>('.oge-color-box-ok'));
    expect(current(state)).toBe('#ff0000');
  });

  it('useButtons renders the committed | draft preview pair', async () => {
    renderHost(newState(), '#ff0000', { applyValueMode: 'useButtons' });
    await open();
    const panes = () =>
      document.querySelectorAll<HTMLElement>('.oge-color-box-preview-pane');
    expect(panes()).toHaveLength(2);
    expect(panes()[0].style.background).toContain('rgb(255, 0, 0)');
    keydown(
      query<HTMLElement>('.oge-color-slider .oge-color-slider-thumb'),
      'PageUp',
    ); // draft h → 25
    expect(panes()[0].style.background).toContain('rgb(255, 0, 0)'); // unchanged
    expect(panes()[1].style.background).toContain('rgb(255, 106, 0)'); // draft
  });

  it('showDropDownButton=false hides the rail chevron; keyboard still opens', async () => {
    renderHost(newState(), null, { showDropDownButton: false });
    expect(document.querySelector('.oge-input-dropdown')).toBeNull();
    await open();
    expect(document.querySelector('.oge-color-box-panel')).toBeTruthy();
  });

  it('the eyedropper renders only with the platform API and applies the pick', async () => {
    // jsdom ships no EyeDropper — the button must not render
    const { unmount } = renderHost(newState());
    await open();
    expect(document.querySelector('.oge-color-box-eyedropper')).toBeNull();
    unmount();

    vi.stubGlobal(
      'EyeDropper',
      class {
        open(): Promise<{ sRGBHex: string }> {
          return Promise.resolve({ sRGBHex: '#00ff00' });
        }
      },
    );
    const state = newState();
    renderHost(state);
    await open();
    await act(async () => {
      fireEvent.click(query<HTMLButtonElement>('.oge-color-box-eyedropper'));
      await Promise.resolve();
    });
    expect(current(state)).toBe('#00ff00');
  });
});
