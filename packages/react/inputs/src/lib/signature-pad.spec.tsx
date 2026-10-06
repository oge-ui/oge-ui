import { act, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode, createRef, useState } from 'react';
import {
  buildOgeSignatureSvg,
  ogeSvgDataUrl,
  parseOgeSignatureSvg,
} from '@oge-ui/behavior';
import { OgeSignaturePad, type OgeSignaturePadHandle } from './signature-pad';

/** jsdom has no PointerEvent constructor — a MouseEvent with the fields added. */
function pointer(target: EventTarget, type: string, x: number, y: number) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    button: 0,
  });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  Object.defineProperty(event, 'pointerType', { value: 'mouse' });
  act(() => {
    target.dispatchEvent(event);
  });
}

function surface(): HTMLElement {
  return document.querySelector('.oge-signature-pad-surface') as HTMLElement;
}

function draw(points: [number, number][]) {
  const el = surface();
  const [first, ...rest] = points;
  pointer(el, 'pointerdown', ...first);
  for (const p of rest) pointer(el, 'pointermove', ...p);
  pointer(el, 'pointerup', ...points[points.length - 1]);
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    width: 200,
    height: 100,
    right: 200,
    bottom: 100,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
});

afterEach(() => vi.restoreAllMocks());

function Host(props: { onStroke?: (count: number) => void }) {
  const [value, setValue] = useState<string | null>(null);
  return (
    <>
      <OgeSignaturePad
        label="Customer signature"
        format="svg"
        value={value}
        onValueChange={setValue}
        onStrokeEnded={(e) => props.onStroke?.(e.strokeCount)}
      />
      <output data-testid="value">{value ?? 'null'}</output>
    </>
  );
}

const valueText = () => screen.getByTestId('value').textContent ?? '';

describe('<OgeSignaturePad>', () => {
  it('renders the labelled surface with its empty status', () => {
    render(<Host />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe(
      'Customer signature, not signed',
    );
    expect(screen.getByText('Sign here')).toBeTruthy();
    expect(
      (
        screen.getByRole('button', {
          name: 'Undo last stroke',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it('draws, commits an SVG value, undoes and clears (StrictMode)', () => {
    const onStroke = vi.fn();
    render(
      <StrictMode>
        <Host onStroke={onStroke} />
      </StrictMode>,
    );
    draw([
      [10, 10],
      [60, 40],
      [120, 70],
    ]);
    expect(parseOgeSignatureSvg(valueText())?.strokes).toHaveLength(1);
    expect(onStroke).toHaveBeenCalledWith(1);
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe(
      'Customer signature, signed',
    );
    draw([[150, 50]]);
    expect(parseOgeSignatureSvg(valueText())?.strokes).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Undo last stroke' }));
    expect(parseOgeSignatureSvg(valueText())?.strokes).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Clear signature' }));
    expect(valueText()).toBe('null');
  });

  it('Escape mid-stroke cancels it; Ctrl+Z undoes', () => {
    render(<Host />);
    draw([
      [10, 10],
      [80, 60],
    ]);
    const el = surface();
    pointer(el, 'pointerdown', 20, 20);
    pointer(el, 'pointermove', 90, 90);
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
    });
    pointer(el, 'pointerup', 90, 90);
    expect(parseOgeSignatureSvg(valueText())?.strokes).toHaveLength(1);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Clear signature' }), {
      key: 'z',
      ctrlKey: true,
    });
    expect(valueText()).toBe('null');
  });

  it('types a signature in the keyboard mode', () => {
    render(<Host />);
    const typeButton = screen.getByRole('button', { name: 'Type' });
    expect(typeButton.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(typeButton);
    const input = screen.getByLabelText('Type your full name');
    fireEvent.change(input, { target: { value: 'Ada Lovelace' } });
    expect(parseOgeSignatureSvg(valueText())?.typedText).toBe('Ada Lovelace');
    expect(
      document.querySelector('.oge-signature-pad-typed')?.textContent,
    ).toBe('Ada Lovelace');
  });

  it('restores its own SVG, shows safe images only, exposes the handle', () => {
    const ref = createRef<OgeSignaturePadHandle>();
    const stored = ogeSvgDataUrl(
      buildOgeSignatureSvg(
        [
          {
            points: [
              { x: 0.1, y: 0.1, t: 0 },
              { x: 0.5, y: 0.5, t: 10 },
            ],
          },
        ],
        {
          size: { width: 200, height: 100 },
          color: '#000',
          minWidth: 1,
          maxWidth: 3,
        },
      ),
    );
    const { rerender } = render(
      <OgeSignaturePad ref={ref} format="svg" value={stored} />,
    );
    expect(
      (
        screen.getByRole('button', {
          name: 'Undo last stroke',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
    expect(ref.current?.toSvg()).toContain('<path');
    expect(
      ref.current?.toDataUrl('svg')?.startsWith('data:image/svg+xml'),
    ).toBe(true);
    // no canvas in jsdom → PNG requests fall back to SVG
    expect(
      ref.current?.toDataUrl('png')?.startsWith('data:image/svg+xml'),
    ).toBe(true);
    expect(ref.current?.isEmpty()).toBe(false);

    rerender(
      <OgeSignaturePad
        ref={ref}
        format="svg"
        value="data:image/png;base64,iVBORw0KGgo="
      />,
    );
    expect(
      document.querySelector('.oge-signature-pad-image')?.getAttribute('src'),
    ).toBe('data:image/png;base64,iVBORw0KGgo=');
    rerender(
      <OgeSignaturePad ref={ref} format="svg" value="javascript:alert(1)" />,
    );
    expect(document.querySelector('.oge-signature-pad-image')).toBeNull();
  });

  it('does not draw while readonly', () => {
    const onValueChange = vi.fn();
    render(<OgeSignaturePad readonly onValueChange={onValueChange} />);
    draw([
      [10, 10],
      [50, 50],
    ]);
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
