/**
 * `xl/theme/theme1.xml`: the twelve colour slots `theme="N"` refers to and
 * the heading/body fonts `scheme="major|minor"` fonts stand for.
 */
import {
  OGE_OFFICE_THEME_COLORS,
  type OgeThemeColorSlot,
  type OgeThemeColors,
} from '../color/color';
import { ogeXmlChild, type OgeXmlNode } from './xml-tree';

/** The theme parts the engine uses. */
export interface OgeTheme {
  readonly colors: OgeThemeColors;
  readonly majorFont?: string;
  readonly minorFont?: string;
}

const SLOTS: readonly OgeThemeColorSlot[] = [
  'dk1',
  'lt1',
  'dk2',
  'lt2',
  'accent1',
  'accent2',
  'accent3',
  'accent4',
  'accent5',
  'accent6',
  'hlink',
  'folHlink',
];

/** `RRGGBB` of a slot: `srgbClr/@val`, or a system colour's `lastClr`. */
function slotColor(slot: OgeXmlNode | undefined): string | undefined {
  for (const child of slot?.children ?? []) {
    const value =
      child.name === 'srgbClr'
        ? child.attributes['val']
        : child.name === 'sysClr'
          ? (child.attributes['lastClr'] ??
            (child.attributes['val'] === 'window' ? 'FFFFFF' : '000000'))
          : undefined;
    if (value && /^[0-9A-Fa-f]{6}$/.test(value)) return value.toUpperCase();
  }
  return undefined;
}

/** Reads a theme; missing slots keep the Office theme's colours. */
export function readOgeTheme(root: OgeXmlNode): OgeTheme {
  const elements = ogeXmlChild(root, 'themeElements');
  const scheme = ogeXmlChild(elements, 'clrScheme');
  const colors: Record<OgeThemeColorSlot, string> = {
    ...OGE_OFFICE_THEME_COLORS,
  };
  for (const slot of SLOTS) {
    const value = slotColor(ogeXmlChild(scheme, slot));
    if (value) colors[slot] = value;
  }
  const fonts = ogeXmlChild(elements, 'fontScheme');
  const latin = (kind: string) =>
    ogeXmlChild(ogeXmlChild(fonts, kind), 'latin')?.attributes['typeface'] ||
    undefined;
  return {
    colors,
    majorFont: latin('majorFont'),
    minorFont: latin('minorFont'),
  };
}
