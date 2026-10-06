import type { OgeRect } from '../overlay/position';

/**
 * Styles the mirror copies from the field — every property that changes
 * where a character lands (the textarea-caret-position technique).
 */
const MIRRORED = [
  'direction',
  'boxSizing',
  'width',
  'height',
  'overflowX',
  'overflowY',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderStyle',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'fontSizeAdjust',
  'lineHeight',
  'fontFamily',
  'textAlign',
  'textTransform',
  'textIndent',
  'textDecoration',
  'letterSpacing',
  'wordSpacing',
  'tabSize',
] as const;

/**
 * The viewport rectangle of the caret at `position` inside a text field —
 * the anchor a caret-attached popup (mention suggestions) positions
 * against. Measured with an off-screen mirror `<div>` that copies the
 * field's text metrics, so it works for wrapped textarea lines and for a
 * scrolled field alike. SSR-safe: `null` without a DOM. The rect has the
 * caret's line height and zero width.
 */
export function ogeCaretRect(
  field: HTMLTextAreaElement | HTMLInputElement,
  position: number,
): OgeRect | null {
  if (
    typeof document === 'undefined' ||
    typeof getComputedStyle !== 'function'
  ) {
    return null;
  }
  const doc = field.ownerDocument ?? document;
  const style = getComputedStyle(field);
  const mirror = doc.createElement('div');
  const isInput = field.nodeName === 'INPUT';
  const target = mirror.style as unknown as Record<string, string>;
  const source = style as unknown as Record<string, string>;
  for (const prop of MIRRORED) target[prop] = source[prop];
  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  mirror.style.top = '0';
  mirror.style.left = '-9999px';
  mirror.style.whiteSpace = isInput ? 'pre' : 'pre-wrap';
  mirror.style.overflowWrap = isInput ? 'normal' : 'break-word';
  mirror.style.overflow = 'hidden';
  mirror.setAttribute('aria-hidden', 'true');
  const text = field.value ?? '';
  mirror.textContent = text.slice(0, position);
  const marker = doc.createElement('span');
  // a zero-width marker would measure no line box — use the rest of the
  // word (or a dot) so the span gets the line's height
  marker.textContent = text.slice(position) || '.';
  mirror.appendChild(marker);
  doc.body.appendChild(mirror);
  const lineHeight =
    parseFloat(style.lineHeight) || (parseFloat(style.fontSize) || 14) * 1.2;
  const top = marker.offsetTop + (parseFloat(style.borderTopWidth) || 0);
  const left = marker.offsetLeft + (parseFloat(style.borderLeftWidth) || 0);
  mirror.remove();
  const box = field.getBoundingClientRect();
  return {
    top: box.top + top - field.scrollTop,
    left: box.left + left - field.scrollLeft,
    width: 0,
    height: lineHeight,
  };
}
