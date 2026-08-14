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
