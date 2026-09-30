import type { BpmnPaletteItemType } from './config';

/**
 * All placeable items, in palette order — the editor's `paletteItems`
 * default in both render layers. Event sub-processes and transactions are
 * reached by morphing a sub-process (panel type select); `'pool'` creates a
 * collaboration participant.
 */
export const OGE_DEFAULT_BPMN_PALETTE_ITEMS: readonly BpmnPaletteItemType[] = [
  'startEvent',
  'endEvent',
  'intermediateThrowEvent',
  'intermediateCatchEvent',
  'boundaryEvent',
  'task',
  'userTask',
  'serviceTask',
  'scriptTask',
  'callActivity',
  'subProcess',
  'exclusiveGateway',
  'parallelGateway',
  'dataObject',
  'dataStore',
  'group',
  'pool',
  'textAnnotation',
];

/**
 * The palette toolbar's roving-tabindex keys (APG toolbar, vertical):
 * ArrowDown/ArrowUp wrap, Home/End jump to the ends. Returns the index to
 * focus next, or `null` when the key is not a navigation key (or the palette
 * is empty) and must not be consumed.
 */
export function bpmnPaletteNavIndex(
  key: string,
  index: number,
  count: number,
): number | null {
  if (count === 0) {
    return null;
  }
  switch (key) {
    case 'ArrowDown':
      return (index + 1) % count;
    case 'ArrowUp':
      return (index - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}
