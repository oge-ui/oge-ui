import type { BpmnDiagramJson } from './engine/bpmn-json';
import type { BpmnEdgeType, BpmnNodeType } from './engine/bpmn-model';
import type { Point } from './engine/geometry';
import type { BpmnImportWarning } from './engine/bpmn-xml-reader';
import type { BpmnPaletteItemType } from './config';

/** Summary of one diagram element carried in editor event payloads. */
export interface OgeBpmnElementInfo {
  readonly id: string;
  readonly type: BpmnNodeType | BpmnEdgeType | 'pool';
  readonly name?: string;
}

/** Payload of `selectionChanged`: the selected ids plus their element summaries. */
export interface OgeBpmnSelectionEvent {
  readonly ids: readonly string[];
  readonly elements: readonly OgeBpmnElementInfo[];
}

/** Origin of a model change reported by `elementsChanged`. */
export type OgeBpmnChangeSource =
  'execute' | 'undo' | 'redo' | 'import' | 'new';

/** Payload of `elementsChanged`: what changed the model and the command label. */
export interface OgeBpmnElementsChangedEvent {
  readonly source: OgeBpmnChangeSource;
  readonly label: string;
}

/**
 * Payload of the debounced `diagramChanged` autosave stream: the diagram in
 * both persistence formats plus what caused the change. Emitted for every
 * source (including `import` and `new`) — apps that only want user edits can
 * filter on `source`.
 */
export interface OgeBpmnDiagramChangedEvent {
  readonly json: BpmnDiagramJson;
  readonly xml: string;
  readonly source: OgeBpmnChangeSource;
}

/** Payload of `importCompleted`: the fidelity warnings collected during import. */
export interface OgeBpmnImportEvent {
  readonly warnings: readonly BpmnImportWarning[];
}

/** One entry of the elements palette. */
export interface OgeBpmnPaletteItem {
  readonly type: BpmnPaletteItemType;
}

/**
 * A programmatic HTML badge attached to a diagram element (process-monitoring
 * overlays), registered via `OgeBpmnEditor.addOverlay()`. The badge tracks the
 * element's screen position through pan/zoom/model changes; when the element
 * disappears from the model the badge is hidden (not removed) and reappears
 * if an element with the same id returns.
 *
 * `html` is bound through Angular's `[innerHTML]`, so the framework's default
 * HTML sanitizer applies: script tags and inline event handlers are stripped.
 * Do not feed untrusted user content through a sanitizer bypass.
 */
export interface OgeBpmnOverlay {
  /** Id of the node, pool or edge the badge is anchored to. */
  readonly elementId: string;
  /** Badge markup, rendered through Angular's sanitizing `[innerHTML]` binding. */
  readonly html: string;
  /** Which corner (or the center) of the element's bounds the badge anchors to. */
  readonly position:
    'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  /** Extra offset in diagram units, applied before the screen transform. */
  readonly offset?: Point;
}
