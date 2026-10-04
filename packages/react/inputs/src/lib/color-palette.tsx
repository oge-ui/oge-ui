'use client';

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
} from 'react';
import {
  OGE_COLOR_PALETTE_PRESETS,
  parseColor,
  type OgeColorPalettePreset,
} from '@oge-ui/behavior';
import { ColorPalette, type ColorPalettePick } from './color-parts';
import { useOgeField, type OgeControlProps } from './use-field';

/** Imperative handle, mirroring the Angular component's public methods. */
export interface OgeColorPaletteHandle {
  /** Moves keyboard focus to the roving (selected or first) tile. */
  focus(): void;
  blur(): void;
}

export interface OgeColorPaletteProps extends OgeControlProps<string | null> {
  /** A built-in preset name, or your own CSS color list. */
  palette?: OgeColorPalettePreset | readonly string[];
  /** Tiles per row; `undefined` = the preset's own count (10 for a custom list). */
  columns?: number;
  /** Tile edge in px; `undefined` = tiles share the available width. */
  tileSize?: number;
  /** Accessible name of the grid; falls back to the messages catalog. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Inline swatch palette as a form editor — the React render of the Angular
 * `<oge-color-palette>`: a built-in preset (`'default' | 'basic' | 'office' |
 * 'material' | 'monochrome'`) or your own color list in an APG `role="grid"`
 * with a roving tabindex (arrows, Home/End, Ctrl+Home/End, Enter/Space), the
 * picked swatch string as the value. The grid and its key map are the same
 * parts the color box panel renders.
 *
 * ```tsx
 * <OgeColorPalette label="Tag color" palette="office" value={tag} onValueChange={setTag} />
 * ```
 */
export const OgeColorPalette = forwardRef<
  OgeColorPaletteHandle,
  OgeColorPaletteProps
>(function OgeColorPaletteRender(props, ref) {
  const {
    palette = 'default',
    columns,
    tileSize,
    label = '',
    className,
    style,
  } = props;

  const hostRef = useRef<HTMLDivElement>(null);
  const focusTile = (): void =>
    hostRef.current
      ?.querySelector<HTMLElement>('.oge-color-palette-cell[tabindex="0"]')
      ?.focus();
  const field = useOgeField<string | null>({
    props,
    emptyValue: null,
    isEmpty: (value) => value === null || value === '',
    focusNative: focusTile,
  });
  const readonly = props.readonly ?? false;

  const colors =
    typeof palette === 'string'
      ? (OGE_COLOR_PALETTE_PRESETS[palette]?.colors ??
        OGE_COLOR_PALETTE_PRESETS.default.colors)
      : palette;
  const resolvedColumns =
    columns !== undefined
      ? Math.max(1, Math.floor(columns))
      : typeof palette === 'string'
        ? (OGE_COLOR_PALETTE_PRESETS[palette]?.columns ?? 10)
        : 10;
  const selected = field.value === null ? null : parseColor(field.value);

  const onPicked = (pick: ColorPalettePick): void => {
    if (field.effectiveDisabled || readonly) return;
    field.commit.commitNow(pick.color, pick.event);
  };

  const onFocusIn = (event: ReactFocusEvent): void => {
    const related = event.relatedTarget as Node | null;
    if (related && hostRef.current?.contains(related)) return;
    field.handleFocus(event);
  };
  const onFocusOut = (event: ReactFocusEvent): void => {
    const related = event.relatedTarget as Node | null;
    if (related && hostRef.current?.contains(related)) return;
    field.handleBlur(event);
  };

  useImperativeHandle(ref, () => ({
    focus: focusTile,
    blur: () => (document.activeElement as HTMLElement | null)?.blur?.(),
  }));

  const hostClasses = [
    'oge-color-palette-editor',
    field.showError && 'oge-color-palette-editor-invalid',
    tileSize !== undefined && 'oge-color-palette-editor-sized',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={hostRef}
      className={hostClasses}
      style={
        {
          ...style,
          ...(tileSize !== undefined
            ? { '--oge-color-palette-tile': `${tileSize}px` }
            : null),
        } as CSSProperties
      }
      title={props.tooltip}
      onFocus={onFocusIn}
      onBlur={onFocusOut}
    >
      <ColorPalette
        colors={colors}
        columns={resolvedColumns}
        selected={selected}
        label={label || field.msg.paletteLabel}
        disabled={field.effectiveDisabled}
        readonly={readonly}
        tabIndex={props.tabIndex}
        invalid={field.showError}
        required={props.required}
        onPicked={onPicked}
      />
    </div>
  );
});
