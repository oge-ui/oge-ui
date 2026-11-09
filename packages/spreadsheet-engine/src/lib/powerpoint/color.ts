/**
 * DrawingML colours. Measured on PowerPoint 16.0: `shade` and `tint` work on
 * linear light (`shade 15%` of 156082 is 042433), `lumMod` / `lumOff` and the
 * saturation and hue transforms on HSL over sRGB (`lumMod 60% lumOff 40%` of
 * E97132 is F2AA84).
 */
import type { OgeThemeColors } from '../color/color';
import type { OgeXmlNode } from '../codec/xml-tree';
import type { OgeSlideColor } from './model';

/** What a colour element resolves against. */
export interface OgeSlideColorContext {
  readonly theme: OgeThemeColors;
  /** The `clrMap`: `bg1` → `lt1`, `tx1` → `dk1`, … */
  readonly map: Readonly<Record<string, string>>;
  /** What `phClr` stands for inside a theme format. */
  readonly placeholder?: OgeSlideColor;
}

const COLOR_ELEMENTS = new Set([
  'srgbClr',
  'schemeClr',
  'sysClr',
  'prstClr',
  'hslClr',
  'scrgbClr',
]);

const PRESET_COLORS: Readonly<Record<string, string>> = {
  black: '000000',
  white: 'FFFFFF',
  red: 'FF0000',
  green: '008000',
  blue: '0000FF',
  yellow: 'FFFF00',
  gray: '808080',
  grey: '808080',
};

interface Rgb {
  r: number;
  g: number;
  b: number;
}

const clamp = (value: number): number => Math.min(1, Math.max(0, value));

function toLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function fromLinear(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
}

function toHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / d + 6) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: h * 60, s, l };
}

function fromHsl(h: number, s: number, l: number): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const sector = Math.floor((((h % 360) + 360) % 360) / 60);
  const [r, g, b] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][sector] as [number, number, number];
  return { r: r + m, g: g + m, b: b + m };
}

function parseHex(hex: string): Rgb {
  return {
    r: parseInt(hex.slice(0, 2), 16) / 255,
    g: parseInt(hex.slice(2, 4), 16) / 255,
    b: parseInt(hex.slice(4, 6), 16) / 255,
  };
}

function formatHex({ r, g, b }: Rgb): string {
  return [r, g, b]
    .map((c) =>
      Math.round(clamp(c) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')
    .toUpperCase();
}

function baseColor(
  node: OgeXmlNode,
  context: OgeSlideColorContext,
): OgeSlideColor | undefined {
  const value = node.attributes['val'];
  switch (node.name) {
    case 'srgbClr':
      return value && /^[0-9A-Fa-f]{6}$/.test(value)
        ? { rgb: value.toUpperCase(), alpha: 1 }
        : undefined;
    case 'schemeClr': {
      if (value === 'phClr') return context.placeholder;
      if (!value) return undefined;
      const slot = context.map[value] ?? value;
      const rgb = (context.theme as Readonly<Record<string, string>>)[slot];
      return rgb ? { rgb, alpha: 1 } : undefined;
    }
    case 'sysClr': {
      const rgb =
        node.attributes['lastClr'] ??
        (value === 'window' ? 'FFFFFF' : '000000');
      return { rgb: rgb.toUpperCase(), alpha: 1 };
    }
    case 'prstClr': {
      const rgb = value ? PRESET_COLORS[value] : undefined;
      return rgb ? { rgb, alpha: 1 } : undefined;
    }
    case 'hslClr':
      return {
        rgb: formatHex(
          fromHsl(
            Number(node.attributes['hue'] ?? 0) / 60000,
            Number(node.attributes['sat'] ?? 0) / 100000,
            Number(node.attributes['lum'] ?? 0) / 100000,
          ),
        ),
        alpha: 1,
      };
    case 'scrgbClr':
      return {
        rgb: formatHex({
          r: fromLinear(clamp(Number(node.attributes['r'] ?? 0) / 100000)),
          g: fromLinear(clamp(Number(node.attributes['g'] ?? 0) / 100000)),
          b: fromLinear(clamp(Number(node.attributes['b'] ?? 0) / 100000)),
        }),
        alpha: 1,
      };
    default:
      return undefined;
  }
}

function applyTransforms(
  base: OgeSlideColor,
  transforms: readonly OgeXmlNode[],
): OgeSlideColor {
  let rgb = parseHex(base.rgb);
  let alpha = base.alpha;
  for (const transform of transforms) {
    const v = Number(transform.attributes['val'] ?? 0) / 100000;
    switch (transform.name) {
      case 'alpha':
        alpha = clamp(v);
        break;
      case 'alphaMod':
        alpha = clamp(alpha * v);
        break;
      case 'alphaOff':
        alpha = clamp(alpha + v);
        break;
      case 'shade':
        rgb = {
          r: fromLinear(toLinear(rgb.r) * v),
          g: fromLinear(toLinear(rgb.g) * v),
          b: fromLinear(toLinear(rgb.b) * v),
        };
        break;
      case 'tint':
        rgb = {
          r: fromLinear(toLinear(rgb.r) * v + 1 - v),
          g: fromLinear(toLinear(rgb.g) * v + 1 - v),
          b: fromLinear(toLinear(rgb.b) * v + 1 - v),
        };
        break;
      case 'comp': {
        const { h, s, l } = toHsl(rgb);
        rgb = fromHsl(h + 180, s, l);
        break;
      }
      case 'inv':
        rgb = { r: 1 - rgb.r, g: 1 - rgb.g, b: 1 - rgb.b };
        break;
      case 'gray': {
        const y = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
        rgb = { r: y, g: y, b: y };
        break;
      }
      case 'lumMod':
      case 'lumOff':
      case 'satMod':
      case 'satOff':
      case 'hueMod':
      case 'hueOff': {
        const hsl = toHsl(rgb);
        if (transform.name === 'lumMod') hsl.l = clamp(hsl.l * v);
        else if (transform.name === 'lumOff') hsl.l = clamp(hsl.l + v);
        else if (transform.name === 'satMod') hsl.s = clamp(hsl.s * v);
        else if (transform.name === 'satOff') hsl.s = clamp(hsl.s + v);
        else if (transform.name === 'hueMod') hsl.h = hsl.h * v;
        else hsl.h = hsl.h + Number(transform.attributes['val'] ?? 0) / 60000;
        rgb = fromHsl(hsl.h, hsl.s, hsl.l);
        break;
      }
      default:
        break;
    }
  }
  return { rgb: formatHex(rgb), alpha };
}

/** Resolves one colour element, transforms included. */
export function ogeReadSlideColor(
  node: OgeXmlNode,
  context: OgeSlideColorContext,
): OgeSlideColor | undefined {
  const base = baseColor(node, context);
  return base && applyTransforms(base, node.children);
}

/** The first colour element among a node's children, resolved. */
export function ogeFindSlideColor(
  parent: OgeXmlNode | undefined,
  context: OgeSlideColorContext,
): OgeSlideColor | undefined {
  const node = parent?.children.find((c) => COLOR_ELEMENTS.has(c.name));
  return node && ogeReadSlideColor(node, context);
}
