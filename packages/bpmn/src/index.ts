// Editor
export { OgeBpmnEditor } from './lib/editor/bpmn-editor';

// Config
export {
  OGE_BPMN_CONFIG,
  OGE_DEFAULT_BPMN_COLOR_PRESETS,
  OGE_DEFAULT_BPMN_CONFIG,
  OGE_DEFAULT_BPMN_MESSAGES,
  provideOgeBpmnConfig,
  type BpmnElementNameKey,
  type BpmnPaletteItemType,
  type OgeBpmnAnnouncementMessages,
  type OgeBpmnConfig,
  type OgeBpmnConfigInput,
  type OgeBpmnContextPadMessages,
  type OgeBpmnHeaderMessages,
  type OgeBpmnMessages,
  type OgeBpmnPropertiesMessages,
} from './lib/config';

// Event payloads
export type {
  OgeBpmnChangeSource,
  OgeBpmnDiagramChangedEvent,
  OgeBpmnElementInfo,
  OgeBpmnElementsChangedEvent,
  OgeBpmnImportEvent,
  OgeBpmnOverlay,
  OgeBpmnPaletteItem,
  OgeBpmnSelectionEvent,
} from './lib/bpmn-types';

// Engine surface users need for import/export and model inspection
export {
  VALID_EVENT_DEFINITIONS,
  createEmptyDiagram,
} from './lib/engine/bpmn-model';
export type {
  BpmnActivityMarker,
  BpmnDataNodeType,
  BpmnDiagram,
  BpmnEdge,
  BpmnEdgeType,
  BpmnEventDefinitionKind,
  BpmnLane,
  BpmnMessageFlow,
  BpmnNode,
  BpmnNodeType,
  BpmnPool,
  BpmnSubProcessType,
} from './lib/engine/bpmn-model';
export type { Point, Rect } from './lib/engine/geometry';
export { alignElements, distributeElements } from './lib/engine/alignment';
export type { BpmnAlignMode, BpmnDistributeAxis } from './lib/engine/alignment';
export { readBpmnXml } from './lib/engine/bpmn-xml-reader';
export type {
  BpmnImportResult,
  BpmnImportWarning,
  BpmnImportWarningCode,
} from './lib/engine/bpmn-xml-reader';
export { writeBpmnXml } from './lib/engine/bpmn-xml-writer';
export { fromBpmnJson, toBpmnJson } from './lib/engine/bpmn-json';
export type {
  BpmnDiagramJson,
  BpmnJsonParseResult,
} from './lib/engine/bpmn-json';
export { renderDiagramSvg } from './lib/engine/svg-export';
export type { BpmnSvgExportOptions } from './lib/engine/svg-export';
export type { BpmnClipboard } from './lib/engine/commands';
