import type { BpmnActivityMarker, BpmnEventDefinitionKind } from './bpmn-model';

/**
 * SVG path of an event-definition glyph centered at (`cx`, `cy`), sized for
 * the standard 36×36 event circle. Throwing events render the path filled,
 * catching events outlined (`eventDefinitionFilled` decides).
 */
export function eventDefinitionPath(
  kind: BpmnEventDefinitionKind,
  cx: number,
  cy: number,
): string {
  switch (kind) {
    case 'message': // envelope
      return (
        `M${cx - 7} ${cy - 5} h14 v10 h-14 Z` +
        ` M${cx - 7} ${cy - 5} l7 6 l7 -6`
      );
    case 'timer': // clock with hands
      return (
        `M${cx - 7} ${cy} a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0` +
        ` M${cx} ${cy} V${cy - 5} M${cx} ${cy} L${cx + 4} ${cy + 2}`
      );
    case 'error': // zigzag bolt
      return (
        `M${cx - 5} ${cy + 6} L${cx - 2} ${cy - 6} L${cx + 2} ${cy + 1}` +
        ` L${cx + 5} ${cy - 6} L${cx + 2} ${cy + 6} L${cx - 2} ${cy - 1} Z`
      );
    case 'signal': // triangle
      return `M${cx} ${cy - 7} L${cx + 7} ${cy + 5} L${cx - 7} ${cy + 5} Z`;
    case 'escalation': // upward chevron
      return `M${cx} ${cy - 7} L${cx + 6} ${cy + 6} L${cx} ${cy + 1} L${cx - 6} ${cy + 6} Z`;
    case 'conditional': // lined rectangle
      return (
        `M${cx - 6} ${cy - 6} h12 v12 h-12 Z` +
        ` M${cx - 4} ${cy - 3} h8 M${cx - 4} ${cy} h8 M${cx - 4} ${cy + 3} h8`
      );
    case 'link': // rightward arrow
      return `M${cx - 7} ${cy - 3} h7 v-3 l7 6 l-7 6 v-3 h-7 Z`;
    case 'compensate': // double triangle pointing left
      return (
        `M${cx + 1} ${cy - 6} v12 l-8 -6 Z` +
        ` M${cx + 8} ${cy - 6} v12 l-7 -6 Z`
      );
    case 'terminate': // solid inner circle (always filled)
      return `M${cx - 6} ${cy} a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 Z`;
  }
}

/**
 * True when the glyph of the given kind on the given event type is filled:
 * throwing positions (end / intermediate throw) fill their glyphs, catching
 * positions outline them; `terminate` is always filled per BPMN convention.
 */
export function eventDefinitionFilled(
  eventType: string,
  kind: BpmnEventDefinitionKind,
): boolean {
  if (kind === 'terminate') {
    return true;
  }
  return eventType === 'endEvent' || eventType === 'intermediateThrowEvent';
}

/**
 * SVG paths of an activity's marker row, centered at the bottom of bounds
 * (`x`/`y` = shape origin, `width`/`height` = shape size). One 14px slot per
 * marker, the row centered horizontally; the collapsed [+] marker of
 * sub-processes is produced separately by {@link collapsedMarkerPath}.
 */
export function activityMarkerPaths(
  markers: readonly BpmnActivityMarker[],
  width: number,
  height: number,
): readonly string[] {
  const slot = 16;
  const startX = width / 2 - ((markers.length - 1) * slot) / 2;
  const cy = height - 10;
  return markers.map((marker, index) => {
    const cx = startX + index * slot;
    switch (marker) {
      case 'loop': // circular arrow, open at the top-left, with an arrowhead
        return (
          `M${cx - 5} ${cy - 2} a5 5 0 1 0 2 -4` +
          ` M${cx - 3} ${cy - 6} l-3 -1 M${cx - 3} ${cy - 6} l0 3`
        );
      case 'multiInstanceParallel': // three vertical bars
        return `M${cx - 4} ${cy - 5} v10 M${cx} ${cy - 5} v10 M${cx + 4} ${cy - 5} v10`;
      case 'multiInstanceSequential': // three horizontal bars
        return `M${cx - 5} ${cy - 4} h10 M${cx - 5} ${cy} h10 M${cx - 5} ${cy + 4} h10`;
      case 'compensation': // double triangle pointing left
        return `M${cx} ${cy - 5} v10 l-6 -5 Z M${cx + 6} ${cy - 5} v10 l-6 -5 Z`;
    }
  });
}

/**
 * SVG path of the data-object glyph (a page with a folded top-right corner),
 * drawn in shape-local coordinates filling the given bounds.
 */
export function dataObjectPath(width: number, height: number): string {
  const fold = 10;
  return (
    `M0 0 H${width - fold} L${width} ${fold} V${height} H0 Z` +
    ` M${width - fold} 0 V${fold} H${width}`
  );
}

/**
 * SVG path of the data-store glyph (a cylinder with stacked top discs),
 * drawn in shape-local coordinates filling the given bounds.
 */
export function dataStorePath(width: number, height: number): string {
  const rx = width / 2;
  const ry = 6;
  return (
    `M0 ${ry} A${rx} ${ry} 0 0 1 ${width} ${ry}` +
    ` V${height - ry} A${rx} ${ry} 0 0 1 0 ${height - ry} Z` +
    ` M0 ${ry} A${rx} ${ry} 0 0 0 ${width} ${ry}` +
    ` M0 ${ry + 4} A${rx} ${ry} 0 0 0 ${width} ${ry + 4}`
  );
}

/** SVG path of the [+] marker of a collapsed sub-process, bottom-centered. */
export function collapsedMarkerPath(width: number, height: number): string {
  const cx = width / 2;
  const top = height - 16;
  return (
    `M${cx - 7} ${top} h14 v14 h-14 Z` +
    ` M${cx} ${top + 3} v8 M${cx - 4} ${top + 7} h8`
  );
}
