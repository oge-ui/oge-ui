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

// Event payloads and the engine surface users need for import/export and
// model inspection. The engine is the framework-free `@oge-ui/bpmn-engine`
// package, shared with the React editor (ADR 0003); re-exported so Angular
// consumers import one package — the surface this barrel always had.
export type {
  OgeBpmnChangeSource,
  OgeBpmnDiagramChangedEvent,
  OgeBpmnElementInfo,
  OgeBpmnElementsChangedEvent,
  OgeBpmnImportEvent,
  OgeBpmnOverlay,
  OgeBpmnPaletteItem,
  OgeBpmnSelectionEvent,
} from '@oge-ui/bpmn-engine';
export {
  VALID_EVENT_DEFINITIONS,
  alignElements,
  createEmptyDiagram,
  distributeElements,
  fromBpmnJson,
  readBpmnXml,
  renderDiagramSvg,
  toBpmnJson,
  writeBpmnXml,
} from '@oge-ui/bpmn-engine';
export type {
  BpmnActivityMarker,
  BpmnAlignMode,
  BpmnClipboard,
  BpmnDataNodeType,
  BpmnDiagram,
  BpmnDiagramJson,
  BpmnDistributeAxis,
  BpmnEdge,
  BpmnEdgeType,
  BpmnEventDefinitionKind,
  BpmnImportResult,
  BpmnImportWarning,
  BpmnImportWarningCode,
  BpmnJsonParseResult,
  BpmnLane,
  BpmnMessageFlow,
  BpmnNode,
  BpmnNodeType,
  BpmnPool,
  BpmnSubProcessType,
  BpmnSvgExportOptions,
  Point,
  Rect,
} from '@oge-ui/bpmn-engine';
