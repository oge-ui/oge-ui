import { InjectionToken, type Provider } from '@angular/core';
import type {
  BpmnActivityMarker,
  BpmnEdgeType,
  BpmnEventDefinitionKind,
  BpmnNodeType,
} from './engine/bpmn-model';

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

/** Every user-facing string the BPMN editor renders, including aria labels. */
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

export const OGE_BPMN_CONFIG = new InjectionToken<OgeBpmnConfig>(
  'OGE_BPMN_CONFIG',
  {
    factory: () => OGE_DEFAULT_BPMN_CONFIG,
  },
);

export type OgeBpmnConfigInput = Partial<Omit<OgeBpmnConfig, 'messages'>> & {
  messages?: Partial<OgeBpmnMessages>;
};

/**
 * Application- or component-scoped BPMN editor defaults:
 *
 * ```ts
 * providers: [
 *   provideOgeBpmnConfig({
 *     gridSize: 20,
 *     messages: { emptyText: 'Boş diyagram — paletten bir öğe seçin' },
 *   }),
 * ]
 * ```
 */
export function provideOgeBpmnConfig(config: OgeBpmnConfigInput): Provider {
  const { messages, ...rest } = config;
  return {
    provide: OGE_BPMN_CONFIG,
    useValue: {
      ...OGE_DEFAULT_BPMN_CONFIG,
      ...rest,
      messages: { ...OGE_DEFAULT_BPMN_MESSAGES, ...messages },
    } satisfies OgeBpmnConfig,
  };
}
