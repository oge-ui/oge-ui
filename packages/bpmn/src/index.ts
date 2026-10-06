// Editor
export { OgeBpmnEditor } from './lib/editor/bpmn-editor';
export {
  OgeBpmnPropertiesEntryTemplate,
  type OgeBpmnPropertiesEntryContext,
} from './lib/editor/bpmn-properties';

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
  type OgeBpmnCamundaMessages,
  type OgeBpmnConfig,
  type OgeBpmnConfigInput,
  type OgeBpmnContextPadMessages,
  type OgeBpmnExtensionMessages,
  type OgeBpmnHeaderMessages,
  type OgeBpmnLintMessages,
  type OgeBpmnLintRuleMessages,
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

// G5b — validation, extensibility, Camunda / Zeebe (engine surface)
export {
  OGE_BPMN_CAMUNDA7_PROVIDER,
  OGE_BPMN_CAMUNDA_PROVIDERS,
  OGE_BPMN_DEFAULT_LINT_RULES,
  OGE_BPMN_ZEEBE_PROVIDER,
  applyElementTemplateCommand,
  bpmnElementTemplatesProvider,
  bpmnForeignAttribute,
  bpmnSvg,
  lintBpmnDiagram,
  setDocumentationCommand,
  setElementColorsCommand,
  setForeignAttributeCommand,
} from '@oge-ui/bpmn-engine';
export type {
  OgeBpmnContextPadEntry,
  OgeBpmnContextPadProvider,
  OgeBpmnEditorApi,
  OgeBpmnElementRenderer,
  OgeBpmnElementTemplate,
  OgeBpmnLintChangedEvent,
  OgeBpmnLintIssue,
  OgeBpmnLintRule,
  OgeBpmnLintRuleOverride,
  OgeBpmnLintRulesInput,
  OgeBpmnLintSeverity,
  OgeBpmnPaletteEntry,
  OgeBpmnPaletteProvider,
  OgeBpmnPngExportOptions,
  OgeBpmnPropertiesEntry,
  OgeBpmnPropertiesGroup,
  OgeBpmnPropertiesProvider,
  OgeBpmnPropertiesValue,
  OgeBpmnRenderContext,
  OgeBpmnRenderers,
  OgeBpmnSvgNode,
  OgeBpmnTemplateProperty,
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
