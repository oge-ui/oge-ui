import { fireEvent, render, screen } from '@testing-library/react';
import { StrictMode, useState } from 'react';
import { OgeColorGradient } from './color-gradient';
import { OgeColorPalette } from './color-palette';

describe('<OgeColorGradient>', () => {
  function Host(props: {
    initial?: string | null;
    onChange?: (v: string | null) => void;
    alpha?: boolean;
    contrast?: boolean;
  }) {
    const [value, setValue] = useState<string | null>(
      props.initial === undefined ? '#ff0000' : props.initial,
    );
    return (
      <OgeColorGradient
        label="Brand"
        editAlphaChannel={props.alpha}
        format={props.alpha ? 'rgba' : 'hex'}
        showContrast={props.contrast}
        value={value}
        onValueChange={(next) => {
          setValue(next);
          props.onChange?.(next);
        }}
      />
    );
  }

  it('renders the labelled group of parts (StrictMode)', () => {
    render(
      <StrictMode>
        <Host />
      </StrictMode>,
    );
    const group = screen.getByRole('group', { name: 'Brand' });
    expect(group).toHaveClass('oge-color-gradient');
    expect(screen.getAllByRole('slider')).toHaveLength(2); // surface + hue
    expect(
      (group.querySelector('.oge-color-box-channel') as HTMLInputElement).value,
    ).toBe('#ff0000');
  });

  it('keyboard on the hue slider commits a normalized color', () => {
    const onChange = vi.fn();
    render(<Host onChange={onChange} />);
    const hue = document.querySelector('.oge-color-slider-thumb')!;
    fireEvent.keyDown(hue, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith('#ff1500');
  });

  it('alpha editing commits rgba', () => {
    const onChange = vi.fn();
    render(<Host alpha onChange={onChange} />);
    const thumbs = document.querySelectorAll('.oge-color-slider-thumb');
    fireEvent.keyDown(thumbs[1], { key: 'PageDown' });
    expect(onChange).toHaveBeenLastCalledWith('rgba(255, 0, 0, 0.75)');
  });

  it('applies hex text on Enter and reverts unusable text on blur', () => {
    const onChange = vi.fn();
    render(<Host onChange={onChange} />);
    const hex = document.querySelector<HTMLInputElement>(
      '.oge-color-box-channel',
    )!;
    hex.value = '#00ff00';
    fireEvent.keyDown(hex, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith('#00ff00');
    const next = document.querySelector<HTMLInputElement>(
      '.oge-color-box-channel',
    )!;
    next.value = 'nope';
    fireEvent.blur(next);
    expect(next.value).toBe('#00ff00');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('shows the WCAG contrast readout', () => {
    render(<Host initial="#767676" contrast />);
    expect(
      document.querySelector('.oge-color-gradient-contrast-ratio')?.textContent,
    ).toBe('4.54:1');
    expect(
      Array.from(
        document.querySelectorAll('.oge-color-gradient-contrast-badge'),
      ).map((badge) => badge.textContent),
    ).toEqual(['AA pass', 'AAA fail']);
  });

  it('disabled parts leave the Tab sequence', () => {
    render(<OgeColorGradient disabled defaultValue="#ff0000" />);
    const hue = document.querySelector('.oge-color-slider-thumb')!;
    expect(hue.getAttribute('tabindex')).toBe('-1');
    expect(hue.getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByRole('group', { name: 'Color gradient' })).toBeTruthy();
  });
});

describe('<OgeColorPalette>', () => {
  it('renders a preset grid and picks the listed string (StrictMode)', () => {
    const onValueChange = vi.fn();
    render(
      <StrictMode>
        <OgeColorPalette
          label="Tag color"
          palette="monochrome"
          onValueChange={onValueChange}
        />
      </StrictMode>,
    );
    const grid = screen.getByRole('grid', { name: 'Tag color' });
    const cells = Array.from(
      grid.querySelectorAll<HTMLElement>('.oge-color-palette-cell'),
    );
    expect(cells).toHaveLength(10);
    expect(cells.filter((cell) => cell.tabIndex === 0)).toHaveLength(1);
    fireEvent.click(cells[3]);
    expect(onValueChange).toHaveBeenLastCalledWith('#555555');
  });

  it('navigates the APG grid without crossing rows', () => {
    render(<OgeColorPalette palette="basic" defaultValue={null} />);
    const cells = Array.from(
      document.querySelectorAll<HTMLElement>('.oge-color-palette-cell'),
    );
    cells[0].focus();
    fireEvent.keyDown(cells[0], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(cells[8]);
    fireEvent.keyDown(cells[8], { key: 'End' });
    expect(document.activeElement).toBe(cells[15]);
    fireEvent.keyDown(cells[15], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(cells[15]);
  });

  it('readonly ignores picks; disabled leaves the Tab sequence', () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <OgeColorPalette
        readonly
        palette="office"
        onValueChange={onValueChange}
      />,
    );
    const first = document.querySelector<HTMLElement>(
      '.oge-color-palette-cell',
    )!;
    fireEvent.click(first);
    expect(onValueChange).not.toHaveBeenCalled();
    rerender(
      <OgeColorPalette
        disabled
        palette="office"
        onValueChange={onValueChange}
      />,
    );
    expect(
      Array.from(
        document.querySelectorAll<HTMLElement>('.oge-color-palette-cell'),
      ).every((cell) => cell.tabIndex === -1),
    ).toBe(true);
  });
});
