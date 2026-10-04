'use client';

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  applyColorChannelText,
  colorPaletteNavIndex,
  colorsEqual,
  contrastForeground,
  formatColor,
  hsvaToRgba,
  parseColor,
  ratioToValue,
  startSliderDrag,
  valueToRatio,
  type OgeColorChannel,
  type OgeHsva,
  type OgeInputsMessages,
  type OgeRgba,
} from '@oge-ui/behavior';

/** A 2D saturation/brightness change from the gradient surface. */
export interface ColorSurfaceChange {
  s: number;
  v: number;
  event: Event;
}

interface ColorSurfaceProps {
  /** Saturation percent (0–100) — the horizontal axis. */
  saturation: number;
  /** Brightness (HSV value) percent (0–100) — the vertical axis. */
  brightness: number;
  /** Arrow-key increment in percent; PageUp/PageDown move brightness by 5×. */
  keyStep: number;
  /** Accessible name of the surface thumb. */
  label: string;
  /** `aria-roledescription` — announces the 2-axis nature. */
  roleDescription: string;
  /** `aria-valuetext` naming both axes. */
  valueText: string;
  /** Inert: no focus, no pointer or keyboard changes. */
  disabled?: boolean;
  style?: CSSProperties;
  onChanged(change: ColorSurfaceChange): void;
  /** A pointer gesture completed (not emitted on Escape-cancel). */
  onReleased(event: Event): void;
}

/**
 * Internal 2D saturation/brightness surface of the color panel — the React
 * render of the Angular `oge-color-surface`. The APG has no 2-axis slider
 * pattern, so this is a `role="slider"` composition: the thumb carries
 * `aria-roledescription`, brightness as `aria-valuenow` and a mandatory
 * `aria-valuetext` naming both axes; Left/Right move saturation (RTL-aware),
 * Up/Down and PageUp/PageDown move brightness. Home/End are deliberate
 * no-ops — in two dimensions the "end" is ambiguous.
 */
export function ColorSurface(props: ColorSurfaceProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  latest.current = props;

  const [dragging, setDragging] = useState(false);
  const gestureCleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => gestureCleanup.current?.(), []);

  const isRtl = (): boolean =>
    !!hostRef.current && getComputedStyle(hostRef.current).direction === 'rtl';

  const atPointer = (
    event: { clientX: number; clientY: number },
    rect: DOMRect,
  ): { s: number; v: number } => {
    let x = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0;
    if (isRtl()) x = 1 - x;
    const y = rect.height > 0 ? (rect.bottom - event.clientY) / rect.height : 0;
    return {
      s: ratioToValue(x, 0, 100, 1),
      v: ratioToValue(y, 0, 100, 1),
    };
  };

  const onPointerDown = (event: ReactPointerEvent): void => {
    if (event.button !== 0 || latest.current.disabled) return;
    const host = hostRef.current;
    if (!host) return;
    event.preventDefault();
    thumbRef.current?.focus();
    const rect = host.getBoundingClientRect();
    const start = {
      s: latest.current.saturation,
      v: latest.current.brightness,
    };
    setDragging(true);
    gestureCleanup.current = startSliderDrag(event.nativeEvent, {
      valueAt: () => 0, // 2D — the pair is projected inside `apply`
      apply: (_value, e) =>
        latest.current.onChanged({ ...atPointer(e, rect), event: e }),
      finish: (e, cancelled) => {
        gestureCleanup.current = null;
        setDragging(false);
        if (cancelled) {
          latest.current.onChanged({ ...start, event: e });
          return;
        }
        latest.current.onReleased(e);
      },
    });
  };

  const onKeydown = (event: ReactKeyboardEvent): void => {
    if (latest.current.disabled) return;
    const step = latest.current.keyStep;
    const rtl = isRtl();
    let ds = 0;
    let dv = 0;
    switch (event.key) {
      case 'ArrowRight':
        ds = rtl ? -step : step;
        break;
      case 'ArrowLeft':
        ds = rtl ? step : -step;
        break;
      case 'ArrowUp':
        dv = step;
        break;
      case 'ArrowDown':
        dv = -step;
        break;
      case 'PageUp':
        dv = step * 5;
        break;
      case 'PageDown':
        dv = -step * 5;
        break;
      default:
        return; // Home/End deliberately unhandled — ambiguous in 2D
    }
    event.preventDefault();
    const clamp = (value: number): number =>
      Math.min(Math.max(Math.round(value), 0), 100);
    const s = clamp(latest.current.saturation + ds);
    const v = clamp(latest.current.brightness + dv);
    if (s !== latest.current.saturation || v !== latest.current.brightness) {
      latest.current.onChanged({ s, v, event: event.nativeEvent });
    }
  };

  return (
    <div
      ref={hostRef}
      className={['oge-color-surface', dragging && 'oge-color-surface-dragging']
        .filter(Boolean)
        .join(' ')}
      style={props.style}
      onPointerDown={onPointerDown}
    >
      <div
        ref={thumbRef}
        className="oge-color-surface-thumb"
        role="slider"
        tabIndex={props.disabled ? -1 : 0}
        aria-disabled={props.disabled ? true : undefined}
        data-focus-target=""
        aria-label={props.label}
        aria-roledescription={props.roleDescription}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={props.brightness}
        aria-valuetext={props.valueText}
        style={{
          insetInlineStart: `${props.saturation}%`,
          top: `${100 - props.brightness}%`,
        }}
        onKeyDown={onKeydown}
      ></div>
    </div>
  );
}

/** A 1D value change from the hue/alpha slider. */
export interface ColorSliderChange {
  value: number;
  event: Event;
}

interface ColorSliderProps {
  kind: 'hue' | 'alpha';
  /** Current value — hue degrees (0–360) or alpha percent (0–100). */
  value: number;
  /** Arrow-key increment in value units; PageUp/PageDown move by 5×. */
  keyStep: number;
  /** Accessible name of the slider thumb. */
  label: string;
  /** `aria-valuetext` — the number alone is not the meaning. */
  valueText: string;
  /** Inert: no focus, no pointer or keyboard changes. */
  disabled?: boolean;
  style?: CSSProperties;
  onChanged(change: ColorSliderChange): void;
  /** A pointer gesture completed (not emitted on Escape-cancel). */
  onReleased(event: Event): void;
}

/**
 * Internal 1D slider of the color panel — the React render of the Angular
 * `oge-color-slider`: the hue ring (0–360°) or the alpha ramp (0–100%) as an
 * APG `role="slider"`, deliberately NOT the form slider (a panel part is not
 * a form control). The gesture harness and arithmetic come from
 * `@oge-ui/behavior`.
 */
export function ColorSlider(props: ColorSliderProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  latest.current = props;

  const [dragging, setDragging] = useState(false);
  const gestureCleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => gestureCleanup.current?.(), []);

  const max = props.kind === 'hue' ? 360 : 100;
  const percent = valueToRatio(props.value, 0, max) * 100;

  const isRtl = (): boolean =>
    !!hostRef.current && getComputedStyle(hostRef.current).direction === 'rtl';

  const maxOf = (): number => (latest.current.kind === 'hue' ? 360 : 100);

  const valueAtPointer = (
    event: { clientX: number },
    rect: DOMRect,
  ): number => {
    let ratio = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0;
    if (isRtl()) ratio = 1 - ratio;
    return ratioToValue(ratio, 0, maxOf(), 1);
  };

  const onPointerDown = (event: ReactPointerEvent): void => {
    if (event.button !== 0 || latest.current.disabled) return;
    const track = trackRef.current;
    if (!track) return;
    event.preventDefault();
    thumbRef.current?.focus();
    const rect = track.getBoundingClientRect();
    const startValue = latest.current.value;
    setDragging(true);
    gestureCleanup.current = startSliderDrag(event.nativeEvent, {
      valueAt: (e) => valueAtPointer(e, rect),
      apply: (value, e) => latest.current.onChanged({ value, event: e }),
      finish: (e, cancelled) => {
        gestureCleanup.current = null;
        setDragging(false);
        if (cancelled) {
          latest.current.onChanged({ value: startValue, event: e });
          return;
        }
        latest.current.onReleased(e);
      },
    });
  };

  const snap = (value: number): number =>
    Math.min(Math.max(Math.round(value), 0), maxOf());

  const keyboardTarget = (
    current: number,
    event: ReactKeyboardEvent,
  ): number | null => {
    const key = event.key;
    if (key === 'Home') return 0;
    if (key === 'End') return maxOf();
    const step = latest.current.keyStep;
    if (key === 'PageUp') return snap(current + step * 5);
    if (key === 'PageDown') return snap(current - step * 5);
    const rtl = isRtl();
    let direction = 0;
    if (key === 'ArrowUp') direction = 1;
    else if (key === 'ArrowDown') direction = -1;
    else if (key === 'ArrowRight') direction = rtl ? -1 : 1;
    else if (key === 'ArrowLeft') direction = rtl ? 1 : -1;
    if (direction === 0) return null;
    return snap(current + direction * step);
  };

  const onKeydown = (event: ReactKeyboardEvent): void => {
    if (latest.current.disabled) return;
    const next = keyboardTarget(latest.current.value, event);
    if (next === null) return;
    event.preventDefault();
    if (next !== latest.current.value) {
      latest.current.onChanged({ value: next, event: event.nativeEvent });
    }
  };

  return (
    <div
      ref={hostRef}
      className={[
        'oge-color-slider',
        props.kind === 'alpha' && 'oge-color-slider-alpha',
        dragging && 'oge-color-slider-dragging',
      ]
        .filter(Boolean)
        .join(' ')}
      style={props.style}
      onPointerDown={onPointerDown}
    >
      <div ref={trackRef} className="oge-color-slider-track">
        <div
          ref={thumbRef}
          className="oge-color-slider-thumb"
          role="slider"
          tabIndex={props.disabled ? -1 : 0}
          aria-disabled={props.disabled ? true : undefined}
          aria-label={props.label}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={props.value}
          aria-valuetext={props.valueText}
          aria-orientation="horizontal"
          style={{ insetInlineStart: `${percent}%` }}
          onKeyDown={onKeydown}
        ></div>
      </div>
    </div>
  );
}

/** A palette swatch pick. */
export interface ColorPalettePick {
  color: string;
  event: Event;
}

interface PaletteCell {
  index: number;
  text: string;
  rgba: OgeRgba;
  foreground: 'black' | 'white';
}

interface ColorPaletteProps {
  /** Swatches as CSS color strings; unparseable entries are dropped. */
  colors: readonly string[];
  columns: number;
  /** The current committed/draft color — matched by rounded channel equality. */
  selected: OgeRgba | null;
  /** Accessible name of the grid. */
  label: string;
  /** Element id naming the grid instead of `label`. */
  labelledBy?: string;
  /** Takes every cell out of the Tab sequence and ignores picks. */
  disabled?: boolean;
  /** Cells stay focusable and navigable, picks are ignored. */
  readonly?: boolean;
  /** `tabindex` of the roving cell. */
  tabIndex?: number;
  invalid?: boolean;
  required?: boolean;
  onPicked(pick: ColorPalettePick): void;
}

/**
 * Internal swatch grid shared by the color box panel and `<OgeColorPalette>`
 * — the React render of the Angular `oge-color-swatch-grid`: an APG `role="grid"` composition with a roving
 * tabindex and real DOM focus on the cells: arrows move by cell/row, Home/End
 * jump the row edges, Ctrl+Home/Ctrl+End the grid corners, Enter/Space picks.
 * The selected cell carries `aria-selected` and a checkmark colored by
 * `contrastForeground`.
 */
export function ColorPalette(props: ColorPaletteProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  latest.current = props;

  const cells: PaletteCell[] = props.colors
    .map((text) => ({ text, rgba: parseColor(text) }))
    .filter(
      (entry): entry is { text: string; rgba: OgeRgba } => entry.rgba !== null,
    )
    .map((entry, index) => ({
      index,
      text: entry.text,
      rgba: entry.rgba,
      foreground: contrastForeground(entry.rgba),
    }));

  const columns = Math.max(1, props.columns);
  const rows: PaletteCell[][] = [];
  for (let i = 0; i < cells.length; i += columns) {
    rows.push(cells.slice(i, i + columns));
  }

  /** Roving tab stop — the selected cell when there is one, else the first. */
  const [activeOverride, setActiveOverride] = useState<number | null>(null);
  const active = (() => {
    if (activeOverride !== null) return activeOverride;
    if (props.selected) {
      const match = cells.find((cell) =>
        colorsEqual(cell.rgba, props.selected as OgeRgba),
      );
      if (match) return match.index;
    }
    return 0;
  })();

  const isSelected = (cell: PaletteCell): boolean =>
    props.selected !== null && colorsEqual(cell.rgba, props.selected);

  const pick = (cell: PaletteCell, event: Event): void => {
    if (latest.current.disabled) return;
    setActiveOverride(cell.index);
    if (latest.current.readonly) return;
    latest.current.onPicked({ color: cell.text, event });
  };

  const onKeydown = (cell: PaletteCell, event: ReactKeyboardEvent): void => {
    if (latest.current.disabled) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      pick(cell, event.nativeEvent);
      return;
    }
    const isNavKey =
      event.key.startsWith('Arrow') ||
      event.key === 'Home' ||
      event.key === 'End';
    if (!isNavKey) return;
    event.preventDefault();
    const rtl =
      !!hostRef.current &&
      getComputedStyle(hostRef.current).direction === 'rtl';
    // the APG grid key map is shared with the Angular grid (`behavior`)
    const next = colorPaletteNavIndex(
      event.key,
      cell.index,
      cells.length,
      columns,
      rtl,
      event.ctrlKey || event.metaKey,
    );
    if (next === null) return;
    setActiveOverride(next);
    // focus after React applies the new tabindex — same tick is fine, the
    // element already exists
    hostRef.current
      ?.querySelector<HTMLElement>(`[data-index="${next}"]`)
      ?.focus();
  };

  return (
    <div
      ref={hostRef}
      className="oge-color-palette"
      role="grid"
      aria-label={props.labelledBy ? undefined : props.label}
      aria-labelledby={props.labelledBy}
      aria-disabled={props.disabled ? true : undefined}
      aria-readonly={props.readonly ? true : undefined}
      aria-invalid={props.invalid ? true : undefined}
      style={
        {
          '--oge-color-palette-columns': columns,
        } as CSSProperties
      }
    >
      {rows.map((row, rowIndex) => (
        <div className="oge-color-palette-row" role="row" key={rowIndex}>
          {row.map((cell) => (
            <div
              key={cell.index}
              className={[
                'oge-color-palette-cell',
                isSelected(cell) && 'oge-color-palette-selected',
              ]
                .filter(Boolean)
                .join(' ')}
              role="gridcell"
              tabIndex={
                cell.index === active && !props.disabled
                  ? (props.tabIndex ?? 0)
                  : -1
              }
              aria-selected={isSelected(cell)}
              aria-label={cell.text}
              data-index={cell.index}
              data-focus-target={cell.index === active ? '' : undefined}
              style={{ background: cell.text }}
              onClick={(event) => pick(cell, event.nativeEvent)}
              onKeyDown={(event) => onKeydown(cell, event)}
            >
              {isSelected(cell) && (
                <svg
                  className="oge-color-palette-check"
                  viewBox="0 0 16 16"
                  fill="none"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  stroke={cell.foreground}
                >
                  <path d="m3 8.5 3.5 3.5L13 4.5" />
                </svg>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** A working-color change from one of the channel inputs. */
export interface ColorChannelChange {
  hsva: OgeHsva;
  event: Event;
}

interface ColorChannelInputsProps {
  /** The working color the inputs show. */
  hsva: OgeHsva;
  /** Renders the alpha-percent input and an alpha-carrying hex. */
  editAlpha: boolean;
  /** The resolved message catalog (aria labels of the inputs). */
  messages: OgeInputsMessages;
  disabled?: boolean;
  readonly?: boolean;
  /** Rendered before the fields (the color box's eyedropper). */
  children?: ReactNode;
  onChanged(change: ColorChannelChange): void;
}

const RGB_CHANNELS = [
  { key: 'r', tag: 'R', label: 'redInputLabel' },
  { key: 'g', tag: 'G', label: 'greenInputLabel' },
  { key: 'b', tag: 'B', label: 'blueInputLabel' },
] as const;

/**
 * Internal hex + R/G/B (+ alpha percent) inputs shared by the color box panel
 * and `<OgeColorGradient>` — the React render of the Angular
 * `oge-color-channel-inputs`. Uncontrolled inputs synced from the working
 * color, committed on the native `change` event (blur / Enter), never per
 * keystroke; unusable text is reverted in place. The parse rules are
 * `applyColorChannelText` from `@oge-ui/behavior`.
 */
export function ColorChannelInputs(props: ColorChannelInputsProps) {
  const rgba = hsvaToRgba(props.hsva);
  const alphaPercent = Math.round(props.hsva.a * 100);
  const hexText = formatColor(rgba, 'hex', props.editAlpha);
  const latest = useRef(props);
  latest.current = props;

  const shown = (channel: OgeColorChannel): string =>
    channel === 'hex'
      ? hexText
      : channel === 'a'
        ? String(alphaPercent)
        : String(rgba[channel]);

  const onChange = (
    channel: OgeColorChannel,
    element: HTMLInputElement,
    event: Event,
  ): void => {
    if (latest.current.readonly || latest.current.disabled) return;
    if (element.value === shown(channel)) return; // nothing edited
    const next = applyColorChannelText(
      latest.current.hsva,
      channel,
      element.value,
    );
    if (next === null) {
      element.value = shown(channel); // revert — a wrong color is never applied
      return;
    }
    latest.current.onChanged({ hsva: next, event });
  };

  // React fires `onChange` per keystroke; the Angular `(change)` semantics
  // (apply on blur / Enter) are recovered with uncontrolled inputs — keyed by
  // the shown text, so a new working color remounts them with fresh values.
  const field = (
    channel: OgeColorChannel,
    tag: string,
    label: string,
    numeric: { max: number } | null,
  ) => (
    <label
      key={channel}
      className={
        channel === 'hex'
          ? 'oge-color-box-field oge-color-box-field-hex'
          : 'oge-color-box-field'
      }
    >
      <input
        key={`${channel}-${shown(channel)}`}
        className="oge-color-box-channel"
        type={numeric ? 'number' : 'text'}
        min={numeric ? 0 : undefined}
        max={numeric?.max}
        spellCheck={numeric ? undefined : false}
        autoComplete={numeric ? undefined : 'off'}
        defaultValue={shown(channel)}
        disabled={props.disabled}
        readOnly={props.readonly}
        aria-label={label}
        onBlur={(event) =>
          onChange(channel, event.target as HTMLInputElement, event.nativeEvent)
        }
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Enter') {
            onChange(channel, event.currentTarget, event.nativeEvent);
          }
        }}
      />
      <span className="oge-color-box-field-tag" aria-hidden="true">
        {tag}
      </span>
    </label>
  );

  return (
    <div className="oge-color-box-fields">
      {props.children}
      {field('hex', 'HEX', props.messages.hexInputLabel, null)}
      {RGB_CHANNELS.map((channel) =>
        field(channel.key, channel.tag, props.messages[channel.label], {
          max: 255,
        }),
      )}
      {props.editAlpha &&
        field('a', 'A', props.messages.alphaInputLabel, { max: 100 })}
    </div>
  );
}
