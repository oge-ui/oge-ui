/**
 * The BPMN editor's configuration vocabulary — every message string, every
 * default and the config shape — single-sourced here so the Angular
 * `provideOgeBpmnConfig()` and the React `<OgeBpmnConfigProvider>` resolve the
 * exact same values (ADR 0003). Framework-free: no injection token lives
 * here, only data and the pure merge.
 */
import type {
  BpmnActivityMarker,
  BpmnEdgeType,
  BpmnEventDefinitionKind,
  BpmnNodeType,
  BpmnRootElementType,
  BpmnTimerKind,
} from './bpmn-model';

/**
 * Everything the palette can place: node types plus the `'pool'`
 * pseudo-entry, which creates a collaboration participant.
 */
export type BpmnPaletteItemType = BpmnNodeType | 'pool';

/** Every key of `elementNames`: node/edge types plus pools and lanes. */
export type BpmnElementNameKey = BpmnNodeType | BpmnEdgeType | 'pool' | 'lane';

/** Aria labels and titles of the context-pad actions. */
export interface OgeBpmnContextPadMessages {
  /** "Connect" action — arms the connect tool from the selected element. */
  readonly connect: string;
  /** "Append task" action — creates a connected task next to the selection. */
  readonly appendTask: string;
  /** "Append gateway" action — creates a connected exclusive gateway. */
  readonly appendGateway: string;
  /** "Append end event" action — creates a connected end event. */
  readonly appendEndEvent: string;
  /** "Edit label" action — opens the inline label editor. */
  readonly editLabel: string;
  /** "Toggle default flow" action on a gateway's outgoing sequence flow. */
  readonly toggleDefault: string;
  /** "Delete" action — deletes the selected element(s). */
  readonly deleteElement: string;
}

/** Labels of the tool strip below the palette (hand / lasso / space / connect / search). */
export interface OgeBpmnToolsMessages {
  /** Accessible name of the tool strip toolbar. */
  readonly label: string;
  /** Hand tool — pointer drags pan the canvas. */
  readonly hand: string;
  /** Lasso tool — every left drag starts a marquee selection. */
  readonly lasso: string;
  /** Space tool — dragging inserts or removes space along one axis. */
  readonly space: string;
  /** Global connect tool — click a source, then a target. */
  readonly globalConnect: string;
  /** Search button — opens the element search overlay. */
  readonly search: string;
}

/** Labels of the align/distribute flyout on a multi-element selection. */
export interface OgeBpmnAlignMessages {
  /** Accessible name of the "Align" flyout toggle button. */
  readonly menuLabel: string;
  readonly alignLeft: string;
  readonly alignCenter: string;
  readonly alignRight: string;
  readonly alignTop: string;
  readonly alignMiddle: string;
  readonly alignBottom: string;
  /** Distribute at equal horizontal gaps (3+ elements). */
  readonly distributeHorizontal: string;
  /** Distribute at equal vertical gaps (3+ elements). */
  readonly distributeVertical: string;
}

/** Labels of the element search overlay (Ctrl+F). */
export interface OgeBpmnSearchMessages {
  /** Accessible name of the search input. */
  readonly label: string;
  /** Placeholder of the search input. */
  readonly placeholder: string;
  /** Shown in the result list when nothing matches. */
  readonly noResults: string;
}

/**
 * Templates written to the polite live region after each action. `{token}`
 * placeholders are replaced with the acting element's display name or count.
 */
export interface OgeBpmnAnnouncementMessages {
  /** Announced after a palette placement; `{type}` is the element type name. */
  readonly created: string;
  /** Announced after a move; `{name}` is the element display name. */
  readonly moved: string;
  /** Announced after a connection; `{source}` / `{target}` are display names. */
  readonly connected: string;
  /** Announced after a deletion; `{count}` is the number of deleted elements. */
  readonly deleted: string;
  /** Announced after undo; `{label}` is the undone command's label. */
  readonly undone: string;
  /** Announced after redo; `{label}` is the redone command's label. */
  readonly redone: string;
  /** Announced when an element becomes selected; `{name}` is its display name. */
  readonly selected: string;
  /** Announced when the selection is cleared. */
  readonly selectionCleared: string;
  /** Announced after an import that produced warnings; `{count}` is their number. */
  readonly importedWithWarnings: string;
  /** Announced after a clean import. */
  readonly imported: string;
  /** Announced when a requested connection is not allowed by the rules. */
  readonly connectDenied: string;
  /** Announced after an inline label edit is committed. */
  readonly labelEdited: string;
  /** Announced after a copy; `{count}` is the number of copied elements. */
  readonly copied: string;
  /** Announced after a cut; `{count}` is the number of cut elements. */
  readonly cut: string;
  /** Announced after a paste; `{count}` is the number of pasted elements. */
  readonly pasted: string;
  /** Announced after a recolor; `{count}` is the number of recolored elements. */
  readonly recolored: string;
  /** Announced after a resize; `{name}` is the element display name. */
  readonly resized: string;
  /** Announced after a type morph; `{name}` / `{type}` are display names. */
  readonly typeChanged: string;
  /** Announced after a boundary event attaches; `{name}` / `{host}` are display names. */
  readonly attached: string;
  /** Announced when a boundary event placement finds no activity border. */
  readonly attachDenied: string;
  /** Announced after a sub-process collapse/expand; `{name}` is its display name. */
  readonly collapsedToggled: string;
  /** Announced after a pool is placed from the palette. */
  readonly poolCreated: string;
  /** Announced after a lane is added to a pool; `{name}` is the pool's display name. */
  readonly laneAdded: string;
  /** Announced after a lane is removed from a pool; `{name}` is the pool's display name. */
  readonly laneRemoved: string;
  /** Announced after an align action; `{count}` is the number of moved elements. */
  readonly aligned: string;
  /** Announced after a distribute action; `{count}` is the number of moved elements. */
  readonly distributed: string;
  /** Announced after a space-tool commit; `{count}` is the number of shifted elements. */
  readonly spaceAdjusted: string;
  /** Announced when the search result set changes; `{count}` is the match count. */
  readonly searchResults: string;
  /** Announced after an external label was dragged; `{name}` is the owner's display name. */
  readonly labelMoved: string;
  /** Announced after a bend-point handle was removed by double click. */
  readonly waypointRemoved: string;
}

/** Labels of the properties panel: headings, field labels and templates. */
export interface OgeBpmnPropertiesMessages {
  /** Accessible name of the properties panel region. */
  readonly panelLabel: string;
  /** Heading shown when nothing is selected (process properties). */
  readonly processHeading: string;
  /** Label of the name field (process, flow node or sequence flow). */
  readonly name: string;
  /** Label of the read-only id row. */
  readonly id: string;
  /** Label of the process "is executable" checkbox. */
  readonly executable: string;
  /** Label of the sequence-flow condition expression textarea. */
  readonly condition: string;
  /** Label of the "default flow" checkbox on an exclusive gateway's flow. */
  readonly defaultFlow: string;
  /** Label of the text-annotation text textarea. */
  readonly annotationText: string;
  /** Multi-selection summary; `{count}` is the number of selected elements. */
  readonly selectionCount: string;
  /** Heading of the appearance (colors) section. */
  readonly appearanceHeading: string;
  /** Label of the fill color input. */
  readonly fillLabel: string;
  /** Label of the stroke color input. */
  readonly strokeLabel: string;
  /** Label of the "clear colors" button. */
  readonly clearColors: string;
  /** Aria label of a preset swatch button; `{color}` is the CSS color string. */
  readonly presetLabel: string;
  /** Label of the element type (morph) select. */
  readonly typeLabel: string;
  /** Label of the event definition select on events. */
  readonly eventDefinition: string;
  /** "None" option of the event definition and marker selects. */
  readonly noneOption: string;
  /** Display name per event definition kind, used by the definition select. */
  readonly eventDefinitionNames: Readonly<
    Record<BpmnEventDefinitionKind, string>
  >;
  /** Label of the boundary event "Interrupting" checkbox. */
  readonly interrupting: string;
  /** Label of the sub-process "Collapsed" checkbox. */
  readonly collapsed: string;
  /** Label of the activity marker select. */
  readonly marker: string;
  /** Display name per loop/multi-instance marker, used by the marker select. */
  readonly markerNames: Readonly<
    Record<Exclude<BpmnActivityMarker, 'compensation'>, string>
  >;
  /** Label of the "For compensation" checkbox on activities. */
  readonly forCompensation: string;
  /** Label of the call activity "Called element" text field. */
  readonly calledElement: string;
  /** Heading of the lanes section of the pool panel. */
  readonly lanesHeading: string;
  /** Label of the "Add lane" button on a selected pool. */
  readonly addLane: string;
  /** Label of the per-lane "Remove" button; `{name}` is the lane's name or id. */
  readonly removeLane: string;
  /** Aria label of a lane name input; `{name}` is the lane's current name or id. */
  readonly laneName: string;
}

/** Strings of the editor's header toolbar. */
export interface OgeBpmnHeaderMessages {
  /** Accessible name of the header toolbar. */
  label: string;
  /** Aria label of the editable diagram-name field. */
  nameLabel: string;
  /** Placeholder of the diagram-name field while the process has no name. */
  namePlaceholder: string;
  /** Aria label / title of the undo button. */
  undo: string;
  /** Aria label / title of the redo button. */
  redo: string;
  /** Aria label / title of the zoom-in button. */
  zoomIn: string;
  /** Aria label / title of the zoom-out button. */
  zoomOut: string;
  /** Aria label / title of the zoom-percentage (fit) button. */
  zoomFit: string;
  /** Aria label / title of the properties-panel toggle. */
  panelToggle: string;
  /** Aria label / title of the mode toggle while in view mode. */
  modeEdit: string;
  /** Aria label / title of the mode toggle while in edit mode. */
  modeView: string;
  /** Aria label / title of the fullscreen button while windowed. */
  fullscreenEnter: string;
  /** Aria label / title of the fullscreen button while maximized. */
  fullscreenExit: string;
}

/** Messages of the built-in validation rules (G5b). */
export interface OgeBpmnLintRuleMessages {
  /** A process (or pool) with content has no start event. */
  readonly startEventRequired: string;
  /** A process (or pool) with content has no end event. */
  readonly endEventRequired: string;
  /** A flow node has neither incoming nor outgoing sequence flows. */
  readonly disconnected: string;
  /** A gateway neither forks nor joins. */
  readonly superfluousGateway: string;
  /** An exclusive gateway's outgoing flow has no condition and is not the default. */
  readonly conditionMissing: string;
  /** An exclusive gateway's default flow carries a condition. */
  readonly defaultFlowCondition: string;
  /** A non-gateway splits the flow implicitly. */
  readonly implicitSplit: string;
  /** A non-gateway joins flows implicitly. */
  readonly implicitJoin: string;
  /** An activity, event, forking gateway or pool has no label. */
  readonly labelRequired: string;
  /** An id is used more than once; `{id}` is the id. */
  readonly duplicateId: string;
  /** A sub-process has content but no start event. */
  readonly subProcessStart: string;
  /** A plain sub-process's start event carries an event definition. */
  readonly subProcessBlankStart: string;
  /** A message flow does not connect two different pools. */
  readonly messageFlowPools: string;
  /** A boundary event is not attached to an activity. */
  readonly boundaryAttached: string;
  /** A boundary event has no outgoing flow. */
  readonly boundaryOutgoing: string;
  /** No path from a start event reaches the element. */
  readonly unreachable: string;
}

/** Strings of the validation surfaces: badges, the problems panel and its toggle. */
export interface OgeBpmnLintMessages {
  /** Accessible name of the problems panel and its header toggle. */
  readonly panelLabel: string;
  /** Shown in the problems panel when the diagram passes every rule. */
  readonly empty: string;
  /** Summary line; `{errors}`, `{warnings}`, `{infos}` are the counts. */
  readonly summary: string;
  /** Display name per severity. */
  readonly severityNames: Readonly<
    Record<'error' | 'warning' | 'info', string>
  >;
  /** One panel entry; `{severity}`, `{message}`, `{name}` are substituted. */
  readonly item: string;
  /**
   * Appended to a shape's accessible name; `{count}` is the number of
   * problems, `{messages}` their texts joined.
   */
  readonly shapeProblems: string;
  /** The built-in rules' messages. */
  readonly rules: OgeBpmnLintRuleMessages;
}

/** Strings of the G5b editor extensions (documentation, re-parenting, event payloads, list fields, templates). */
export interface OgeBpmnExtensionMessages {
  /** Label of the documentation textarea (every element and the process). */
  readonly documentation: string;
  /** Label of the "Move to…" select (keyboard re-parenting). */
  readonly moveTo: string;
  /** "Move to" option of the process root (diagrams without pools). */
  readonly processTarget: string;
  /** "Move to" option of a lane; `{pool}` / `{lane}` are names. */
  readonly laneTarget: string;
  /** Fallback name of an unnamed container in the "Move to" list. */
  readonly unnamed: string;
  /** Announced after a re-parent; `{name}` / `{target}` are display names. */
  readonly movedTo: string;
  /** Heading of the event-definition payload group. */
  readonly eventDetailsHeading: string;
  /** Label of the timer type select. */
  readonly timerType: string;
  /** Display name per timer kind. */
  readonly timerKinds: Readonly<Record<BpmnTimerKind, string>>;
  /** Label of the timer expression field. */
  readonly timerExpression: string;
  /** Label of the reference select per root element type. */
  readonly rootRef: Readonly<Record<BpmnRootElementType, string>>;
  /** "Create new" option of the reference select per root element type. */
  readonly newRoot: Readonly<Record<BpmnRootElementType, string>>;
  /** Label of the referenced root element's name field; `{type}` is its type name. */
  readonly rootName: string;
  /** Label of an error's code field. */
  readonly errorCode: string;
  /** Label of an escalation's code field. */
  readonly escalationCode: string;
  /** Label of a conditional event's condition field. */
  readonly condition: string;
  /** Label of a link event's name field. */
  readonly linkName: string;
  /** "Add" button of a list field. */
  readonly addItem: string;
  /** Remove button of a list row; `{label}` is the row's label. */
  readonly removeItem: string;
  /** Accessible name of a list cell; `{field}` is the column, `{index}` the 1-based row. */
  readonly itemField: string;
  /** Label of the element template select. */
  readonly template: string;
  /** "No template" option of the template select. */
  readonly noTemplate: string;
}

/** Strings of the opt-in Camunda 7 / Camunda 8 (Zeebe) properties providers. */
export interface OgeBpmnCamundaMessages {
  /** Heading of the Zeebe task definition group. */
  readonly taskDefinitionHeading: string;
  /** Label of `zeebe:taskDefinition type`. */
  readonly jobType: string;
  /** Label of `zeebe:taskDefinition retries`. */
  readonly retries: string;
  /** Heading of the Zeebe input mappings list. */
  readonly inputsHeading: string;
  /** Heading of the Zeebe output mappings list. */
  readonly outputsHeading: string;
  /** Column label of a mapping's source expression. */
  readonly mappingSource: string;
  /** Column label of a mapping's target variable. */
  readonly mappingTarget: string;
  /** Heading of the Zeebe task headers list. */
  readonly headersHeading: string;
  /** Column label of a header key. */
  readonly headerKey: string;
  /** Column label of a header value. */
  readonly headerValue: string;
  /** Heading of the Camunda 7 user assignment group. */
  readonly assignmentHeading: string;
  /** Label of `camunda:assignee`. */
  readonly assignee: string;
  /** Label of `camunda:candidateGroups`. */
  readonly candidateGroups: string;
  /** Label of `camunda:formKey`. */
  readonly formKey: string;
  /** Heading of the Camunda 7 input parameters list. */
  readonly inputParameters: string;
  /** Heading of the Camunda 7 output parameters list. */
  readonly outputParameters: string;
  /** Column label of a parameter name. */
  readonly parameterName: string;
  /** Column label of a parameter value. */
  readonly parameterValue: string;
}

/** Every user-facing string the BPMN editor renders, including aria labels. */
export interface OgeBpmnMessages {
  /** Accessible name of the diagram canvas (`role="application"`). */
  canvasLabel: string;
  /** Focus hint appended to the canvas label, explaining how to leave the diagram. */
  canvasHint: string;
  /** Centered hint shown while the diagram has no elements. */
  emptyText: string;
  /** Accessible name of the elements palette toolbar. */
  paletteLabel: string;
  /** Label (tooltip + aria label) of each palette entry, per palette item type. */
  paletteLabels: Readonly<Record<BpmnPaletteItemType, string>>;
  /** Labels of the tool strip below the palette. */
  tools: OgeBpmnToolsMessages;
  /** Labels of the align/distribute flyout on multi-element selections. */
  align: OgeBpmnAlignMessages;
  /** Labels of the element search overlay. */
  search: OgeBpmnSearchMessages;
  /** Accessible name of the minimap navigation overlay. */
  minimapLabel: string;
  /** Aria label of the separator resizing the palette/tool rail. */
  railResizeLabel: string;
  /** Aria label of the separator resizing the properties panel. */
  propertiesResizeLabel: string;
  /** Labels of the header toolbar (name field, undo/redo, zoom, toggles). */
  header: OgeBpmnHeaderMessages;
  /** Accessible name of the corner branding link. */
  brandLabel: string;
  /** Aria labels and titles of the context-pad actions. */
  contextPad: OgeBpmnContextPadMessages;
  /** Live-region announcement templates; `{token}` placeholders are substituted. */
  announcements: OgeBpmnAnnouncementMessages;
  /** Fallback display name per element type, used when an element has no name. */
  elementNames: Readonly<Record<BpmnElementNameKey, string>>;
  /** Labels of the properties panel. */
  properties: OgeBpmnPropertiesMessages;
  /** Validation strings (added in G5b — optional, English fallback). */
  lint?: OgeBpmnLintMessages;
  /** Editor-extension strings (added in G5b — optional, English fallback). */
  extensions?: OgeBpmnExtensionMessages;
  /** Camunda / Zeebe provider strings (added in G5b — optional, English fallback). */
  camunda?: OgeBpmnCamundaMessages;
}

/** The catalog with every optional block filled from English (what the editor reads). */
export type OgeBpmnResolvedMessages = OgeBpmnMessages & {
  lint: OgeBpmnLintMessages;
  extensions: OgeBpmnExtensionMessages;
  camunda: OgeBpmnCamundaMessages;
};

/** English validation strings. */
export const OGE_DEFAULT_BPMN_LINT_MESSAGES: OgeBpmnLintMessages = {
  panelLabel: 'Problems',
  empty: 'No problems found',
  summary: '{errors} error(s), {warnings} warning(s), {infos} info(s)',
  severityNames: { error: 'Error', warning: 'Warning', info: 'Info' },
  item: '{severity}: {message} ({name})',
  shapeProblems: '{count} problem(s): {messages}',
  rules: {
    startEventRequired: 'The process has no start event',
    endEventRequired: 'The process has no end event',
    disconnected: 'The element is not connected to any sequence flow',
    superfluousGateway: 'The gateway neither forks nor joins flows',
    conditionMissing:
      'A flow leaving an exclusive gateway needs a condition or must be the default flow',
    defaultFlowCondition: 'The default flow must not have a condition',
    implicitSplit: 'The element splits the flow implicitly; use a gateway',
    implicitJoin: 'The element joins flows implicitly; use a gateway',
    labelRequired: 'The element has no label',
    duplicateId: 'The id "{id}" is used more than once',
    subProcessStart: 'The sub-process has no start event',
    subProcessBlankStart:
      'The start event of a sub-process must not have an event definition',
    messageFlowPools: 'A message flow must connect two different pools',
    boundaryAttached: 'The boundary event is not attached to an activity',
    boundaryOutgoing: 'The boundary event has no outgoing flow',
    unreachable: 'No path from a start event reaches the element',
  },
};

/** English editor-extension strings. */
export const OGE_DEFAULT_BPMN_EXTENSION_MESSAGES: OgeBpmnExtensionMessages = {
  documentation: 'Documentation',
  moveTo: 'Move to',
  processTarget: 'Process',
  laneTarget: '{pool} / {lane}',
  unnamed: '(unnamed)',
  movedTo: '{name} moved to {target}',
  eventDetailsHeading: 'Event details',
  timerType: 'Timer type',
  timerKinds: {
    timeDate: 'Date',
    timeDuration: 'Duration',
    timeCycle: 'Cycle',
  },
  timerExpression: 'Timer expression',
  rootRef: {
    message: 'Message',
    signal: 'Signal',
    error: 'Error',
    escalation: 'Escalation',
  },
  newRoot: {
    message: 'New message',
    signal: 'New signal',
    error: 'New error',
    escalation: 'New escalation',
  },
  rootName: '{type} name',
  errorCode: 'Error code',
  escalationCode: 'Escalation code',
  condition: 'Condition',
  linkName: 'Link name',
  addItem: 'Add',
  removeItem: 'Remove {label}',
  itemField: '{field} {index}',
  template: 'Template',
  noTemplate: 'None',
};

/** English Camunda / Zeebe provider strings. */
export const OGE_DEFAULT_BPMN_CAMUNDA_MESSAGES: OgeBpmnCamundaMessages = {
  taskDefinitionHeading: 'Task definition',
  jobType: 'Job type',
  retries: 'Retries',
  inputsHeading: 'Input mappings',
  outputsHeading: 'Output mappings',
  mappingSource: 'Source',
  mappingTarget: 'Target',
  headersHeading: 'Task headers',
  headerKey: 'Key',
  headerValue: 'Value',
  assignmentHeading: 'User assignment',
  assignee: 'Assignee',
  candidateGroups: 'Candidate groups',
  formKey: 'Form key',
  inputParameters: 'Input parameters',
  outputParameters: 'Output parameters',
  parameterName: 'Name',
  parameterValue: 'Value',
};

/**
 * Fills the optional G5b blocks of a catalog from English, key by key (a
 * pre-G5b catalog, or a partial `lint` override, keeps working).
 */
export function fillBpmnMessages(
  messages: OgeBpmnMessages,
): OgeBpmnResolvedMessages {
  const lint = messages.lint;
  return {
    ...messages,
    lint: {
      ...OGE_DEFAULT_BPMN_LINT_MESSAGES,
      ...lint,
      severityNames: {
        ...OGE_DEFAULT_BPMN_LINT_MESSAGES.severityNames,
        ...lint?.severityNames,
      },
      rules: { ...OGE_DEFAULT_BPMN_LINT_MESSAGES.rules, ...lint?.rules },
    },
    extensions: {
      ...OGE_DEFAULT_BPMN_EXTENSION_MESSAGES,
      ...messages.extensions,
      timerKinds: {
        ...OGE_DEFAULT_BPMN_EXTENSION_MESSAGES.timerKinds,
        ...messages.extensions?.timerKinds,
      },
      rootRef: {
        ...OGE_DEFAULT_BPMN_EXTENSION_MESSAGES.rootRef,
        ...messages.extensions?.rootRef,
      },
      newRoot: {
        ...OGE_DEFAULT_BPMN_EXTENSION_MESSAGES.newRoot,
        ...messages.extensions?.newRoot,
      },
    },
    camunda: { ...OGE_DEFAULT_BPMN_CAMUNDA_MESSAGES, ...messages.camunda },
  };
}

export const OGE_DEFAULT_BPMN_MESSAGES: OgeBpmnMessages = {
  canvasLabel: 'BPMN diagram editor',
  canvasHint: 'Press Escape then Tab to leave the diagram',
  emptyText: 'Empty diagram — pick an element from the palette',
  paletteLabel: 'Elements palette',
  paletteLabels: {
    startEvent: 'Start event',
    endEvent: 'End event',
    intermediateThrowEvent: 'Intermediate throw event',
    intermediateCatchEvent: 'Intermediate catch event',
    boundaryEvent: 'Boundary event',
    task: 'Task',
    userTask: 'User task',
    serviceTask: 'Service task',
    scriptTask: 'Script task',
    callActivity: 'Call activity',
    subProcess: 'Sub-process',
    eventSubProcess: 'Event sub-process',
    transaction: 'Transaction',
    exclusiveGateway: 'Exclusive gateway',
    parallelGateway: 'Parallel gateway',
    dataObject: 'Data object',
    dataStore: 'Data store',
    group: 'Group',
    pool: 'Pool',
    textAnnotation: 'Text annotation',
  },
  tools: {
    label: 'Canvas tools',
    hand: 'Hand tool',
    lasso: 'Lasso tool',
    space: 'Space tool',
    globalConnect: 'Global connect tool',
    search: 'Search elements',
  },
  align: {
    menuLabel: 'Align elements',
    alignLeft: 'Align left',
    alignCenter: 'Align center',
    alignRight: 'Align right',
    alignTop: 'Align top',
    alignMiddle: 'Align middle',
    alignBottom: 'Align bottom',
    distributeHorizontal: 'Distribute horizontally',
    distributeVertical: 'Distribute vertically',
  },
  search: {
    label: 'Search elements',
    placeholder: 'Search by name or id…',
    noResults: 'No matching elements',
  },
  minimapLabel: 'Diagram minimap',
  railResizeLabel: 'Resize palette rail',
  propertiesResizeLabel: 'Resize properties panel',
  header: {
    label: 'Editor toolbar',
    nameLabel: 'Diagram name',
    namePlaceholder: 'Unnamed process',
    undo: 'Undo',
    redo: 'Redo',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    zoomFit: 'Zoom to fit',
    panelToggle: 'Toggle properties panel',
    modeEdit: 'Switch to edit mode',
    modeView: 'Switch to view mode',
    fullscreenEnter: 'Enter fullscreen',
    fullscreenExit: 'Exit fullscreen',
  },
  brandLabel: 'Built with OGE UI — ogeui.com',
  contextPad: {
    connect: 'Connect',
    appendTask: 'Append task',
    appendGateway: 'Append gateway',
    appendEndEvent: 'Append end event',
    editLabel: 'Edit label',
    toggleDefault: 'Toggle default flow',
    deleteElement: 'Delete',
  },
  announcements: {
    created: '{type} created',
    moved: '{name} moved',
    connected: 'Connected {source} to {target}',
    deleted: '{count} element(s) deleted',
    undone: 'Undo: {label}',
    redone: 'Redo: {label}',
    selected: '{name} selected',
    selectionCleared: 'Selection cleared',
    importedWithWarnings: 'Imported with {count} warning(s)',
    imported: 'Diagram imported',
    connectDenied: 'Connection not allowed',
    labelEdited: 'Label updated',
    copied: '{count} element(s) copied',
    cut: '{count} element(s) cut',
    pasted: '{count} element(s) pasted',
    recolored: '{count} element(s) recolored',
    resized: '{name} resized',
    typeChanged: '{name} is now {type}',
    attached: '{name} attached to {host}',
    attachDenied: 'Drop a boundary event on an activity border',
    collapsedToggled: '{name} collapse toggled',
    poolCreated: 'Pool created',
    laneAdded: 'Lane added to {name}',
    laneRemoved: 'Lane removed from {name}',
    aligned: '{count} element(s) aligned',
    distributed: '{count} element(s) distributed',
    spaceAdjusted: '{count} element(s) shifted',
    searchResults: '{count} result(s)',
    labelMoved: '{name} label moved',
    waypointRemoved: 'Waypoint removed',
  },
  elementNames: {
    startEvent: 'Start event',
    endEvent: 'End event',
    intermediateThrowEvent: 'Intermediate throw event',
    intermediateCatchEvent: 'Intermediate catch event',
    boundaryEvent: 'Boundary event',
    task: 'Task',
    userTask: 'User task',
    serviceTask: 'Service task',
    scriptTask: 'Script task',
    callActivity: 'Call activity',
    subProcess: 'Sub-process',
    eventSubProcess: 'Event sub-process',
    transaction: 'Transaction',
    exclusiveGateway: 'Exclusive gateway',
    parallelGateway: 'Parallel gateway',
    dataObject: 'Data object',
    dataStore: 'Data store',
    group: 'Group',
    pool: 'Pool',
    lane: 'Lane',
    textAnnotation: 'Text annotation',
    sequenceFlow: 'Sequence flow',
    association: 'Association',
    messageFlow: 'Message flow',
    dataAssociation: 'Data association',
  },
  properties: {
    panelLabel: 'Properties',
    processHeading: 'Process',
    name: 'Name',
    id: 'Id',
    executable: 'Executable',
    condition: 'Condition expression',
    defaultFlow: 'Default flow',
    annotationText: 'Text',
    selectionCount: '{count} elements selected',
    appearanceHeading: 'Appearance',
    fillLabel: 'Fill',
    strokeLabel: 'Stroke',
    clearColors: 'Clear colors',
    presetLabel: 'Fill {color}',
    typeLabel: 'Type',
    eventDefinition: 'Event definition',
    noneOption: 'None',
    eventDefinitionNames: {
      message: 'Message',
      timer: 'Timer',
      error: 'Error',
      signal: 'Signal',
      escalation: 'Escalation',
      conditional: 'Conditional',
      link: 'Link',
      compensate: 'Compensate',
      terminate: 'Terminate',
    },
    interrupting: 'Interrupting',
    collapsed: 'Collapsed',
    marker: 'Marker',
    markerNames: {
      loop: 'Loop',
      multiInstanceParallel: 'Multi-instance (parallel)',
      multiInstanceSequential: 'Multi-instance (sequential)',
    },
    forCompensation: 'For compensation',
    calledElement: 'Called element',
    lanesHeading: 'Lanes',
    addLane: 'Add lane',
    removeLane: 'Remove lane {name}',
    laneName: 'Lane {name} name',
  },
  lint: OGE_DEFAULT_BPMN_LINT_MESSAGES,
  extensions: OGE_DEFAULT_BPMN_EXTENSION_MESSAGES,
  camunda: OGE_DEFAULT_BPMN_CAMUNDA_MESSAGES,
};

/**
 * Default fill presets of the properties panel's appearance section: eight
 * soft pastel tones that keep dark strokes and labels readable. Override per
 * app via {@link OgeBpmnConfig.colorPresets}.
 */
export const OGE_DEFAULT_BPMN_COLOR_PRESETS: readonly string[] = [
  '#fee2e2',
  '#ffedd5',
  '#fef9c3',
  '#dcfce7',
  '#cffafe',
  '#dbeafe',
  '#ede9fe',
  '#fce7f3',
];

export interface OgeBpmnConfig {
  messages: OgeBpmnMessages;
  /**
   * Image URL for the corner branding badge; unset renders the built-in
   * drawn mark (no bundled bitmap, no network dependency by default).
   */
  brandLogoUrl?: string;
  /** Grid step in diagram units used for placement and arrow-key movement. Default 10. */
  gridSize?: number;
  /** Neighbor-alignment snapping threshold in diagram units. Default 5. */
  snapThreshold?: number;
  /** Lower zoom bound. Default 0.2. */
  zoomMin?: number;
  /** Upper zoom bound. Default 4. */
  zoomMax?: number;
  /**
   * Debounce in milliseconds for the editor's `diagramChanged` autosave
   * stream: rapid model changes collapse into one emission carrying the final
   * state; `0` emits synchronously after every change. Serialization happens
   * only on emit and never while dragging (move/bend gestures commit a single
   * command on release). Default 500.
   */
  autoSaveDebounceMs?: number;
  /**
   * Fill color presets (any CSS color strings) offered as swatch buttons in
   * the properties panel's appearance section. Presets set the fill only; the
   * stroke has its own picker. Default {@link OGE_DEFAULT_BPMN_COLOR_PRESETS}.
   */
  colorPresets?: readonly string[];
}

export const OGE_DEFAULT_BPMN_CONFIG: OgeBpmnConfig = {
  messages: OGE_DEFAULT_BPMN_MESSAGES,
};

/** Partial config accepted by the Angular provider and the React context provider. */
export type OgeBpmnConfigInput = Partial<Omit<OgeBpmnConfig, 'messages'>> & {
  messages?: Partial<OgeBpmnMessages>;
};

/**
 * Merges a partial config over a base (the built-in defaults unless given) —
 * `messages` one level deep, so a single override keeps every other string.
 * The one resolver both render layers call.
 */
export function resolveOgeBpmnConfig(
  config: OgeBpmnConfigInput = {},
  base: OgeBpmnConfig = OGE_DEFAULT_BPMN_CONFIG,
): OgeBpmnConfig {
  const { messages, ...rest } = config;
  return {
    ...base,
    ...rest,
    messages: { ...base.messages, ...messages },
  };
}
