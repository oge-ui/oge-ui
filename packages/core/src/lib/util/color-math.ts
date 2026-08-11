/**
 * Pure color arithmetic — CSS color-text parsing, HSV↔RGB conversion,
 * canonical formatting and the swatch-contrast decision. DOM-free so the
 * color editor only feeds it strings and channel structs, the same rule
 * every other kernel in this folder follows.
 *
 * The panel keeps HSVA as its working model and converts at the edges:
 * a round trip through RGB collapses the hue when saturation or value is
 * zero, so strings are produced only at commit boundaries.
 */
import { CSS_COLOR_NAMES } from './color-names';

/** Channel model: `r`/`g`/`b` 0–255 integers, `a` 0–1. */
export interface OgeRgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Panel model: `h` 0–360 degrees, `s`/`v` 0–100 percent, `a` 0–1. */
export interface OgeHsva {
  h: number;
  s: number;
  v: number;
  a: number;
}

/** Output formats a color editor can commit. */
export type OgeColorFormat = 'hex' | 'rgb' | 'rgba' | 'hsl';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const round2 = (value: number): number => Math.round(value * 100) / 100;

const channel = (value: number): number => clamp(Math.round(value), 0, 255);

const HEX_RE = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/;
const RGB_RE =
  /^rgba?\(\s*([+-]?[\d.]+%?)\s*(?:,\s*([+-]?[\d.]+%?)\s*,\s*([+-]?[\d.]+%?)\s*(?:,\s*([+-]?[\d.]+%?)\s*)?|\s+([+-]?[\d.]+%?)\s+([+-]?[\d.]+%?)\s*(?:\/\s*([+-]?[\d.]+%?)\s*)?)\)$/;
const HSL_RE =
  /^hsla?\(\s*([+-]?[\d.]+)(?:deg)?\s*(?:,\s*([+-]?[\d.]+)%\s*,\s*([+-]?[\d.]+)%\s*(?:,\s*([+-]?[\d.]+%?)\s*)?|\s+([+-]?[\d.]+)%\s+([+-]?[\d.]+)%\s*(?:\/\s*([+-]?[\d.]+%?)\s*)?)\)$/;

function parseAlphaToken(token: string | undefined): number {
  if (token === undefined) return 1;
  const percent = token.endsWith('%');
  const numeric = Number.parseFloat(token);
  if (!Number.isFinite(numeric)) return 1;
  return clamp(percent ? numeric / 100 : numeric, 0, 1);
}

function parseRgbToken(token: string): number {
  const percent = token.endsWith('%');
  const numeric = Number.parseFloat(token);
  return channel(percent ? (numeric / 100) * 255 : numeric);
}

function parseHex(text: string): OgeRgba {
  const hex = text.slice(1);
  const wide = hex.length >= 6;
  const digit = (index: number): number =>
    wide
      ? Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16)
      : Number.parseInt(hex[index] + hex[index], 16);
  const hasAlpha = hex.length === 4 || hex.length === 8;
  return {
    r: digit(0),
    g: digit(1),
    b: digit(2),
    a: hasAlpha ? round2(digit(3) / 255) : 1,
  };
}

function hslToRgba(h: number, s: number, l: number, a: number): OgeRgba {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 100) / 100;
  const light = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;
  const sector = Math.floor(hue / 60) % 6;
  const [r, g, b] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][sector];
  return {
    r: channel((r + m) * 255),
    g: channel((g + m) * 255),
    b: channel((b + m) * 255),
    a,
  };
}

/**
 * Parses CSS color text — `#rgb`/`#rgba`/`#rrggbb`/`#rrggbbaa`, `rgb()` /
 * `rgba()` (comma and space/slash syntax), `hsl()` / `hsla()`, the CSS named
 * colors and `transparent`. Returns `null` for anything unparseable; the
 * caller decides whether that is a parse error or an empty value.
 */
export function parseColor(text: string): OgeRgba | null {
  const trimmed = text.trim().toLowerCase();
  if (!trimmed) return null;
  if (trimmed === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  const named = CSS_COLOR_NAMES[trimmed];
  if (named) return parseHex(`#${named}`);
  if (HEX_RE.test(trimmed)) return parseHex(trimmed);
  const rgb = RGB_RE.exec(trimmed);
  if (rgb) {
    const [r, g, b, alpha] =
      rgb[1] !== undefined && rgb[2] !== undefined
        ? [rgb[1], rgb[2], rgb[3], rgb[4]]
        : [rgb[1], rgb[5], rgb[6], rgb[7]];
    if (r === undefined || g === undefined || b === undefined) return null;
    return {
      r: parseRgbToken(r),
      g: parseRgbToken(g),
      b: parseRgbToken(b),
      a: round2(parseAlphaToken(alpha)),
    };
  }
  const hsl = HSL_RE.exec(trimmed);
  if (hsl) {
    const [h, s, l, alpha] =
      hsl[2] !== undefined
        ? [hsl[1], hsl[2], hsl[3], hsl[4]]
        : [hsl[1], hsl[5], hsl[6], hsl[7]];
    if (h === undefined || s === undefined || l === undefined) return null;
    return hslToRgba(
      Number.parseFloat(h),
      Number.parseFloat(s),
      Number.parseFloat(l),
      round2(parseAlphaToken(alpha)),
    );
  }
  return null;
}

/** Converts an RGBA struct to the panel's HSVA model. Grayscale keeps `h: 0`. */
export function rgbaToHsva(rgba: OgeRgba): OgeHsva {
  const r = rgba.r / 255;
  const g = rgba.g / 255;
  const b = rgba.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta > 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6);
    else if (max === g) h = 60 * ((b - r) / delta + 2);
    else h = 60 * ((r - g) / delta + 4);
  }
  if (h < 0) h += 360;
  return {
    h: round2(h),
    s: round2(max === 0 ? 0 : (delta / max) * 100),
    v: round2(max * 100),
    a: rgba.a,
  };
}

/** Converts the panel's HSVA model back to RGBA channels. */
export function hsvaToRgba(hsva: OgeHsva): OgeRgba {
  const h = (((hsva.h % 360) + 360) % 360) / 60;
  const s = clamp(hsva.s, 0, 100) / 100;
  const v = clamp(hsva.v, 0, 100) / 100;
  const c = v * s;
  const x = c * (1 - Math.abs((h % 2) - 1));
  const m = v - c;
  const sector = Math.floor(h) % 6;
  const [r, g, b] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][sector];
  return {
    r: channel((r + m) * 255),
    g: channel((g + m) * 255),
    b: channel((b + m) * 255),
    a: hsva.a,
  };
}

function rgbToHsl(rgba: OgeRgba): { h: number; s: number; l: number } {
  const { h, s, v } = rgbaToHsva(rgba);
  const sv = s / 100;
  const vv = v / 100;
  const l = vv * (1 - sv / 2);
  const sl = l === 0 || l === 1 ? 0 : (vv - l) / Math.min(l, 1 - l);
  return { h: Math.round(h), s: Math.round(sl * 100), l: Math.round(l * 100) };
}

const hexPair = (value: number): string => value.toString(16).padStart(2, '0');

/**
 * Formats channels canonically: lowercase hex, comma-syntax `rgb()`/`rgba()`,
 * integer-rounded `hsl()`. `includeAlpha` widens the shape only when the
 * alpha is actually below 1 — `#rrggbbaa`, `rgba(…)`, `hsla(…)` — so opaque
 * colors stay in the compact form of the requested format.
 */
export function formatColor(
  rgba: OgeRgba,
  format: OgeColorFormat,
  includeAlpha: boolean,
): string {
  const alpha = includeAlpha ? round2(clamp(rgba.a, 0, 1)) : 1;
  const withAlpha = alpha < 1;
  switch (format) {
    case 'hex': {
      const base = `#${hexPair(channel(rgba.r))}${hexPair(channel(rgba.g))}${hexPair(channel(rgba.b))}`;
      return withAlpha ? `${base}${hexPair(Math.round(alpha * 255))}` : base;
    }
    case 'rgb':
    case 'rgba': {
      const body = `${channel(rgba.r)}, ${channel(rgba.g)}, ${channel(rgba.b)}`;
      return format === 'rgba' || withAlpha
        ? `rgba(${body}, ${withAlpha ? alpha : 1})`
        : `rgb(${body})`;
    }
    case 'hsl': {
      const { h, s, l } = rgbToHsl(rgba);
      return withAlpha
        ? `hsla(${h}, ${s}%, ${l}%, ${alpha})`
        : `hsl(${h}, ${s}%, ${l}%)`;
    }
  }
}

/** `parseColor` + `formatColor` in one step; `null` when unparseable. */
export function normalizeColor(
  text: string,
  format: OgeColorFormat,
  includeAlpha: boolean,
): string | null {
  const rgba = parseColor(text);
  return rgba === null ? null : formatColor(rgba, format, includeAlpha);
}

/**
 * WCAG relative luminance in `[0, 1]`. Alpha is ignored — the caller
 * composites over its own background first when that matters.
 */
export function relativeLuminance(rgba: OgeRgba): number {
  const linear = (value: number): number => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return (
    0.2126 * linear(rgba.r) + 0.7152 * linear(rgba.g) + 0.0722 * linear(rgba.b)
  );
}

/**
 * Which foreground reads on this color — the selected-swatch checkmark
 * decision. White wins on dark colors, black on light ones, by comparing
 * the WCAG contrast ratio against each.
 */
export function contrastForeground(rgba: OgeRgba): 'black' | 'white' {
  const luminance = relativeLuminance(rgba);
  const contrastWithWhite = 1.05 / (luminance + 0.05);
  const contrastWithBlack = (luminance + 0.05) / 0.05;
  return contrastWithWhite >= contrastWithBlack ? 'white' : 'black';
}

/** Channel equality after integer rounding — selected-swatch matching. */
export function colorsEqual(a: OgeRgba, b: OgeRgba): boolean {
  return (
    channel(a.r) === channel(b.r) &&
    channel(a.g) === channel(b.g) &&
    channel(a.b) === channel(b.b) &&
    round2(a.a) === round2(b.a)
  );
}
