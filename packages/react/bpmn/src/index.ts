// Editor
export {
  OgeBpmnEditor,
  type OgeBpmnEditorHandle,
  type OgeBpmnEditorProps,
} from './lib/bpmn-editor';

// Config — the React counterpart of `provideOgeBpmnConfig()`
export {
  OgeBpmnConfigProvider,
  useOgeBpmnConfig,
  type OgeBpmnConfigProviderProps,
} from './lib/bpmn-config';

// The message catalog, the defaults, the event payloads and the engine
// surface users need for import/export and model inspection are
// single-sourced in `@oge-ui/bpmn-engine` (ADR 0003) — shared with the Angular
// editor and re-exported here so React consumers import one package: the same
// surface the Angular barrel exposes.
export {
  OGE_DEFAULT_BPMN_COLOR_PRESETS,
  OGE_DEFAULT_BPMN_CONFIG,
  OGE_DEFAULT_BPMN_MESSAGES,
  VALID_EVENT_DEFINITIONS,
  alignElements,
  createEmptyDiagram,
  distributeElements,
  fromBpmnJson,
  readBpmnXml,
  renderDiagramSvg,
  toBpmnJson,
  writeBpmnXml,
  type BpmnActivityMarker,
  type BpmnAlignMode,
  type BpmnClipboard,
  type BpmnDataNodeType,
  type BpmnDiagram,
  type BpmnDiagramJson,
  type BpmnDistributeAxis,
  type BpmnEdge,
  type BpmnEdgeType,
  type BpmnElementNameKey,
  type BpmnEventDefinitionKind,
  type BpmnImportResult,
  type BpmnImportWarning,
  type BpmnImportWarningCode,
  type BpmnJsonParseResult,
  type BpmnLane,
  type BpmnMessageFlow,
  type BpmnNode,
  type BpmnNodeType,
  type BpmnPaletteItemType,
  type BpmnPool,
  type BpmnSubProcessType,
  type BpmnSvgExportOptions,
  type OgeBpmnAnnouncementMessages,
  type OgeBpmnChangeSource,
  type OgeBpmnConfig,
  type OgeBpmnConfigInput,
  type OgeBpmnContextPadMessages,
  type OgeBpmnDiagramChangedEvent,
  type OgeBpmnEditorMode,
  type OgeBpmnElementInfo,
  type OgeBpmnElementsChangedEvent,
  type OgeBpmnHeaderMessages,
  type OgeBpmnImportEvent,
  type OgeBpmnMessages,
  type OgeBpmnOverlay,
  type OgeBpmnPaletteItem,
  type OgeBpmnPropertiesMessages,
  type OgeBpmnSelectionEvent,
  type Point,
  type Rect,
} from '@oge-ui/bpmn-engine';
