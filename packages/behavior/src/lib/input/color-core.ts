import {
  hsvaToRgba as hsvaToRgbaCore,
  parseColor as parseColorCore,
  relativeLuminance,
  rgbaToHsva as rgbaToHsvaCore,
  type OgeHsva as Hsva,
  type OgeRgba as Rgba,
} from '@oge-ui/core';

// The pure color arithmetic lives in `@oge-ui/core` (`color-math`);
// re-exported here so the React render layer reaches it through its one
// behavior dependency, exactly like the slider math.
/** Which picker surfaces the color box popup renders. */
export type OgeColorBoxView = 'gradient' | 'palette' | 'both';

/** Popup commit policy: live on every interaction, or via the OK/Cancel footer. */
export type OgeColorBoxApplyValueMode = 'instantly' | 'useButtons';

/**
 * Default swatch set of the palette view when the app supplies none — a
 * 10-column material-ish ramp (dark → light per hue family) so
 * `view="palette"` is usable out of the box.
 */
export const OGE_DEFAULT_COLOR_PALETTE: readonly string[] = [
  '#000000',
  '#434343',
  '#666666',
  '#999999',
  '#b7b7b7',
  '#cccccc',
  '#d9d9d9',
  '#efefef',
  '#f3f3f3',
  '#ffffff',
  '#980000',
  '#ff0000',
  '#ff9900',
  '#ffff00',
  '#00ff00',
  '#00ffff',
  '#4a86e8',
  '#0000ff',
  '#9900ff',
  '#ff00ff',
  '#e6b8af',
  '#f4cccc',
  '#fce5cd',
  '#fff2cc',
  '#d9ead3',
  '#d0e0e3',
  '#c9daf8',
  '#cfe2f3',
  '#d9d2e9',
  '#ead1dc',
  '#dd7e6b',
  '#ea9999',
  '#f9cb9c',
  '#ffe599',
  '#b6d7a8',
  '#a2c4c9',
  '#a4c2f4',
  '#9fc5e8',
  '#b4a7d6',
  '#d5a6bd',
  '#a61c00',
  '#cc0000',
  '#e69138',
  '#f1c232',
  '#6aa84f',
  '#45818e',
  '#3c78d8',
  '#3d85c6',
  '#674ea7',
  '#a64d79',
];

export {
  colorsEqual,
  contrastForeground,
  formatColor,
  hsvaToRgba,
  parseColor,
  rgbaToHsva,
  type OgeColorFormat,
  type OgeHsva,
  type OgeRgba,
} from '@oge-ui/core';

// --- standalone color components (color gradient / color palette) ----------

/**
 * Alpha-composites `foreground` over an opaque `background` — what the eye
 * actually sees, and therefore what a contrast ratio must be measured on.
 * The background's own alpha is ignored (treated as opaque).
 */
export function compositeColorOver(foreground: Rgba, background: Rgba): Rgba {
  const a = Math.min(Math.max(foreground.a, 0), 1);
  const mix = (f: number, b: number): number => Math.round(f * a + b * (1 - a));
  return {
    r: mix(foreground.r, background.r),
    g: mix(foreground.g, background.g),
    b: mix(foreground.b, background.b),
    a: 1,
  };
}

/**
 * WCAG 2.x contrast ratio (1–21) of `foreground` against `background`. A
 * translucent foreground is composited over the background first, so the
 * ratio describes the rendered pair.
 */
export function contrastRatio(foreground: Rgba, background: Rgba): number {
  const bg = { ...background, a: 1 };
  const fg = compositeColorOver(foreground, bg);
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

/** WCAG success criteria a contrast ratio meets (1.4.3 / 1.4.6). */
export interface OgeContrastLevels {
  /** The ratio truncated to two decimals — what a UI displays. */
  ratio: number;
  /** AA, normal text: ≥ 4.5. */
  aa: boolean;
  /** AA, large text (and UI components, 1.4.11): ≥ 3. */
  aaLarge: boolean;
  /** AAA, normal text: ≥ 7. */
  aaa: boolean;
  /** AAA, large text: ≥ 4.5. */
  aaaLarge: boolean;
}

/**
 * Classifies a contrast ratio against the WCAG thresholds. The comparison
 * runs on the unrounded ratio — 4.499 must fail AA — while `ratio` is
 * truncated, never rounded up into a pass.
 */
export function contrastLevels(ratio: number): OgeContrastLevels {
  return {
    ratio: Math.floor(ratio * 100) / 100,
    aa: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaa: ratio >= 7,
    aaaLarge: ratio >= 4.5,
  };
}

/** Which channel input of a color editor was edited. */
export type OgeColorChannel = 'hex' | 'r' | 'g' | 'b' | 'a';

/**
 * Applies the text of one hex / R / G / B / alpha-percent input to the
 * working color. Returns `null` when the text is not a usable value — the
 * caller reverts the input, so a wrong color is never applied. Channel edits
 * keep the working alpha (and re-derive only the changed channel); a hex
 * edit carries its own alpha only when it spells one (`#rgba`/`#rrggbbaa`).
 */
export function applyColorChannelText(
  hsva: Hsva,
  channel: OgeColorChannel,
  text: string,
): Hsva | null {
  if (channel === 'hex') {
    const trimmed = text.trim();
    const parsed = parseColorCore(trimmed);
    if (parsed === null) return null;
    const hasAlpha = /^#?([0-9a-f]{4}|[0-9a-f]{8})$/i.test(trimmed);
    return hasAlpha
      ? rgbaToHsvaCore(parsed)
      : { ...rgbaToHsvaCore({ ...parsed, a: 1 }), a: hsva.a };
  }
  const numeric = Number.parseFloat(text);
  if (!Number.isFinite(numeric)) return null;
  if (channel === 'a') {
    return {
      ...hsva,
      a: Math.min(Math.max(Math.round(numeric), 0), 100) / 100,
    };
  }
  const rgba = { ...hsvaToRgbaCore(hsva) };
  rgba[channel] = Math.min(Math.max(Math.round(numeric), 0), 255);
  return { ...rgbaToHsvaCore(rgba), a: hsva.a };
}

/** Built-in swatch sets of the color palette. */
export type OgeColorPalettePreset =
  'default' | 'basic' | 'office' | 'material' | 'monochrome';

/** A palette preset: its swatches and the column count it is designed for. */
export interface OgeColorPalettePresetData {
  readonly colors: readonly string[];
  readonly columns: number;
}

/**
 * The palette presets — `default` is the color box's built-in ramp, `basic`
 * the classic 8×6 picker set, `office` the Office theme ramp (Kendo's
 * `office` preset), `material` the Material primaries (500 shades) and
 * `monochrome` a 10-step gray ramp.
 */
export const OGE_COLOR_PALETTE_PRESETS: Readonly<
  Record<OgeColorPalettePreset, OgeColorPalettePresetData>
> = {
  default: { colors: OGE_DEFAULT_COLOR_PALETTE, columns: 10 },
  basic: {
    columns: 8,
    // prettier-ignore
    colors: [
      '#ff8080', '#ffff80', '#80ff80', '#00ff80', '#80ffff', '#0080ff', '#ff80c0', '#ff80ff',
      '#ff0000', '#ffff00', '#80ff00', '#00ff40', '#00ffff', '#0080c0', '#8080c0', '#ff00ff',
      '#804040', '#ff8040', '#00ff00', '#008080', '#004080', '#8080ff', '#800040', '#ff0080',
      '#800000', '#ff8000', '#008000', '#008040', '#0000ff', '#0000a0', '#800080', '#8000ff',
      '#400000', '#804000', '#004000', '#004040', '#000080', '#000040', '#400040', '#400080',
      '#000000', '#808000', '#808040', '#808080', '#408080', '#c0c0c0', '#404040', '#ffffff',
    ],
  },
  office: {
    columns: 10,
    // prettier-ignore
    colors: [
      '#ffffff', '#000000', '#e7e6e6', '#44546a', '#4472c4', '#ed7d31', '#a5a5a5', '#ffc000', '#5b9bd5', '#70ad47',
      '#f2f2f2', '#7f7f7f', '#d0cece', '#d6dce4', '#d9e2f3', '#fbe5d5', '#ededed', '#fff2cc', '#deebf6', '#e2efd9',
      '#d8d8d8', '#595959', '#aeabab', '#adb9ca', '#b4c6e7', '#f7cbac', '#dbdbdb', '#fee599', '#bdd7ee', '#c5e0b3',
      '#bfbfbf', '#3f3f3f', '#757070', '#8496b0', '#8eaadb', '#f4b183', '#c9c9c9', '#ffd965', '#9cc3e5', '#a8d08d',
      '#a5a5a5', '#262626', '#3a3838', '#323f4f', '#2f5496', '#c55a11', '#7b7b7b', '#bf9000', '#2e75b5', '#538135',
      '#7f7f7f', '#0c0c0c', '#171616', '#222a35', '#1f3864', '#833c0b', '#525252', '#7f6000', '#1e4e79', '#375623',
    ],
  },
  material: {
    columns: 10,
    // prettier-ignore
    colors: [
      '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50',
      '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722', '#795548', '#9e9e9e', '#607d8b', '#000000',
    ],
  },
  monochrome: {
    columns: 10,
    // prettier-ignore
    colors: [
      '#000000', '#1c1c1c', '#383838', '#555555', '#717171', '#8d8d8d', '#aaaaaa', '#c6c6c6', '#e2e2e2', '#ffffff',
    ],
  },
};

/**
 * The cell a key moves to in a swatch grid of `count` cells laid out in
 * `columns` — the APG grid keys: arrows by cell/row (horizontal mirrored in
 * RTL), Home/End to the row edges, Ctrl+Home/Ctrl+End to the grid corners.
 * Returns `null` for a non-navigation key or a move past a row or grid edge
 * (the APG grid neither wraps nor crosses rows).
 */
export function colorPaletteNavIndex(
  key: string,
  index: number,
  count: number,
  columns: number,
  rtl: boolean,
  ctrlKey: boolean,
): number | null {
  if (count === 0) return null;
  const cols = Math.max(1, Math.floor(columns));
  const last = count - 1;
  const rowStart = index - (index % cols);
  const rowEnd = Math.min(rowStart + cols - 1, last);
  let next: number;
  switch (key) {
    case 'ArrowRight':
    case 'ArrowLeft': {
      // the APG grid stops at the row edge rather than crossing rows
      const forward = (key === 'ArrowRight') !== rtl;
      next = index + (forward ? 1 : -1);
      if (next < rowStart || next > rowEnd) return null;
      break;
    }
    case 'ArrowDown':
      next = index + cols;
      break;
    case 'ArrowUp':
      next = index - cols;
      break;
    case 'Home':
      next = ctrlKey ? 0 : rowStart;
      break;
    case 'End':
      next = ctrlKey ? last : rowEnd;
      break;
    default:
      return null;
  }
  return next < 0 || next > last ? null : next;
}
