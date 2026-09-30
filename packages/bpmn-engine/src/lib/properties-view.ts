/**
 * The properties panel's view model and its field → command mapping,
 * framework-free (ADR 0003): what the panel shows for a selection, which
 * selects and checkboxes it offers, and which undoable engine command each
 * field commit becomes. Both render layers draw the same `.oge-bpmn-props-*`
 * markup from these values, so the panel's behaviour exists once.
 */
import type { OgeBpmnMessages } from './config';
import type {
  BpmnActivityMarker,
  BpmnDiagram,
  BpmnEventDefinitionKind,
  BpmnFlowNode,
  BpmnFlowNodeType,
  BpmnMessageFlow,
  BpmnPool,
  BpmnSequenceFlow,
  BpmnTextAnnotation,
} from './bpmn-model';
import {
  VALID_EVENT_DEFINITIONS,
  isBpmnActivityType,
  isBpmnEventType,
  isBpmnSubProcessType,
} from './bpmn-model';
import type { BpmnCommand } from './command-stack';
import {
  setActivityMarkersCommand,
  setDefaultFlowCommand,
  setElementColorsCommand,
} from './commands';
import { canMorph, morphGroupOf } from './rules';

/** The loop-family markers offered by the marker select (compensation is a checkbox). */
export type BpmnLoopMarker = Exclude<BpmnActivityMarker, 'compensation'>;

/** What the properties panel shows for the current selection. */
export type BpmnPropertiesView =
  | { readonly kind: 'process' }
  | { readonly kind: 'multi'; readonly count: number }
  | {
      readonly kind: 'node';
      readonly node: BpmnFlowNode;
      readonly typeName: string;
    }
  | { readonly kind: 'annotation'; readonly node: BpmnTextAnnotation }
  | {
      readonly kind: 'flow';
      readonly edge: BpmnSequenceFlow;
      readonly canDefault: boolean;
      readonly isDefault: boolean;
    }
  | { readonly kind: 'messageFlow'; readonly edge: BpmnMessageFlow }
  | {
      readonly kind: 'pool';
      readonly pool: BpmnPool;
      readonly typeName: string;
    }
  | { readonly kind: 'other'; readonly id: string; readonly typeName: string };

/** The appearance (colors) section: the colorable selection and the first element's colors. */
export interface BpmnAppearanceView {
  readonly ids: readonly string[];
  readonly fill: string;
  readonly stroke: string;
}

/** The morph (type) select of a single selected flow node. */
export interface BpmnMorphView {
  readonly current: BpmnFlowNodeType;
  readonly options: readonly {
    readonly type: BpmnFlowNodeType;
    readonly label: string;
    readonly disabled: boolean;
    readonly reason: string | null;
  }[];
}

/** The event-definition select of a single selected event. */
export interface BpmnEventDefinitionView {
  readonly id: string;
  readonly current: BpmnEventDefinitionKind | null;
  readonly kinds: readonly BpmnEventDefinitionKind[];
}

/** The marker select + compensation checkbox of a single selected activity. */
export interface BpmnMarkerView {
  readonly id: string;
  readonly loopMarker: BpmnLoopMarker | null;
  readonly loopKinds: readonly BpmnLoopMarker[];
  readonly compensation: boolean;
}

/** Everything the panel renders, derived from the model, the selection and the messages. */
export interface BpmnPropertiesModel {
  readonly view: BpmnPropertiesView;
  /** Accessible name of the panel region (canvas label — panel label). */
  readonly regionLabel: string;
  readonly appearance: BpmnAppearanceView | null;
  readonly morph: BpmnMorphView | null;
  readonly eventDefinition: BpmnEventDefinitionView | null;
  readonly boundary: {
    readonly id: string;
    readonly interrupting: boolean;
  } | null;
  readonly subProcess: {
    readonly id: string;
    readonly collapsed: boolean;
  } | null;
  readonly marker: BpmnMarkerView | null;
  readonly calledElement: {
    readonly id: string;
    readonly calledElement: string;
  } | null;
  /** Display name of the message-flow heading. */
  readonly messageFlowTypeName: string;
  /** The multi-selection summary line. */
  readonly multiSummary: string;
}

/** What the panel shows for a selection. */
export function bpmnPropertiesView(
  m: BpmnDiagram,
  sel: readonly string[],
  messages: OgeBpmnMessages,
): BpmnPropertiesView {
  if (sel.length === 0) {
    return { kind: 'process' };
  }
  if (sel.length > 1) {
    return { kind: 'multi', count: sel.length };
  }
  const id = sel[0];
  const names = messages.elementNames;
  const node = m.nodes[id];
  if (node) {
    return node.type === 'textAnnotation'
      ? { kind: 'annotation', node }
      : { kind: 'node', node, typeName: names[node.type] };
  }
  const pool = m.pools[id];
  if (pool) {
    return { kind: 'pool', pool, typeName: names['pool'] };
  }
  const edge = m.edges[id];
  if (edge?.type === 'sequenceFlow') {
    const source = m.nodes[edge.sourceRef];
    const canDefault = source?.type === 'exclusiveGateway';
    const isDefault = canDefault && source.defaultFlowId === id;
    return { kind: 'flow', edge, canDefault, isDefault };
  }
  if (edge?.type === 'messageFlow') {
    return { kind: 'messageFlow', edge };
  }
  if (edge) {
    return { kind: 'other', id, typeName: names[edge.type] };
  }
  return { kind: 'process' };
}

/**
 * The appearance (colors) section state: every selected element with DI
 * (nodes and edges alike) plus the first element's current colors, or null
 * when nothing colorable is selected.
 */
export function bpmnAppearanceView(
  m: BpmnDiagram,
  sel: readonly string[],
): BpmnAppearanceView | null {
  const ids = sel.filter(
    (id) => m.shapeDi[id] !== undefined || m.edgeDi[id] !== undefined,
  );
  if (ids.length === 0) {
    return null;
  }
  const first = m.shapeDi[ids[0]] ?? m.edgeDi[ids[0]];
  return { ids, fill: first.fill ?? '', stroke: first.stroke ?? '' };
}

/** The complete panel model for one render. */
export function buildBpmnPropertiesModel(
  m: BpmnDiagram,
  sel: readonly string[],
  messages: OgeBpmnMessages,
): BpmnPropertiesModel {
  const view = bpmnPropertiesView(m, sel, messages);
  const node = view.kind === 'node' ? view.node : null;
  let morph: BpmnMorphView | null = null;
  if (node !== null) {
    const group = morphGroupOf(node.type);
    if (group !== null && group.length >= 2) {
      const labels = messages.paletteLabels;
      morph = {
        // A non-null morph group implies a flow-node type.
        current: node.type as BpmnFlowNodeType,
        options: group.map((type) => {
          const result = canMorph(m, node.id, type);
          return {
            type,
            label: labels[type],
            disabled: !result.allowed,
            reason: result.allowed ? null : (result.reason ?? null),
          };
        }),
      };
    }
  }
  let marker: BpmnMarkerView | null = null;
  if (node !== null && isBpmnActivityType(node.type)) {
    const markers = node.markers ?? [];
    const loopMarker =
      markers.find(
        (candidate): candidate is BpmnLoopMarker =>
          candidate === 'loop' ||
          candidate === 'multiInstanceParallel' ||
          candidate === 'multiInstanceSequential',
      ) ?? null;
    marker = {
      id: node.id,
      loopMarker,
      loopKinds: ['loop', 'multiInstanceParallel', 'multiInstanceSequential'],
      compensation: markers.includes('compensation'),
    };
  }
  const props = messages.properties;
  return {
    view,
    regionLabel: `${messages.canvasLabel} — ${props.panelLabel}`,
    appearance: bpmnAppearanceView(m, sel),
    morph,
    eventDefinition:
      node !== null && isBpmnEventType(node.type)
        ? {
            id: node.id,
            current: node.eventDefinition ?? null,
            kinds: VALID_EVENT_DEFINITIONS[node.type],
          }
        : null,
    boundary:
      node !== null && node.type === 'boundaryEvent'
        ? { id: node.id, interrupting: node.cancelActivity !== false }
        : null,
    subProcess:
      node !== null && isBpmnSubProcessType(node.type)
        ? { id: node.id, collapsed: node.collapsed === true }
        : null,
    marker,
    calledElement:
      node !== null && node.type === 'callActivity'
        ? { id: node.id, calledElement: node.calledElement ?? '' }
        : null,
    messageFlowTypeName: messages.elementNames['messageFlow'],
    multiSummary: props.selectionCount.replace(
      '{count}',
      String(view.kind === 'multi' ? view.count : 0),
    ),
  };
}

/** Aria label of a lane's name input. */
export function bpmnLaneNameLabel(
  messages: OgeBpmnMessages,
  lane: { readonly id: string; readonly name?: string },
): string {
  return messages.properties.laneName.replace('{name}', lane.name ?? lane.id);
}

/** Aria label / title of a lane's remove button. */
export function bpmnRemoveLaneLabel(
  messages: OgeBpmnMessages,
  lane: { readonly id: string; readonly name?: string },
): string {
  return messages.properties.removeLane.replace('{name}', lane.name ?? lane.id);
}

/** Aria label / title of a preset swatch button. */
export function bpmnPresetLabel(
  messages: OgeBpmnMessages,
  color: string,
): string {
  return messages.properties.presetLabel.replace('{color}', color);
}

/** Returns the color when it is a 6-digit hex (what `type="color"` accepts). */
export function bpmnColorInputValue(color: string, fallback: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : fallback;
}

/** The default-flow checkbox of a sequence flow. */
export function bpmnDefaultFlowCommand(
  edge: BpmnSequenceFlow,
  checked: boolean,
): BpmnCommand {
  return setDefaultFlowCommand(edge.sourceRef, checked ? edge.id : undefined);
}

/** A preset swatch applies its color as fill only; the stroke is untouched. */
export function bpmnPresetCommand(
  ids: readonly string[],
  color: string,
): BpmnCommand {
  return setElementColorsCommand(ids, { fill: color });
}

/** The "clear colors" button: both overrides removed. */
export function bpmnClearColorsCommand(ids: readonly string[]): BpmnCommand {
  return setElementColorsCommand(ids, { fill: null, stroke: null });
}

/** Marker select: swaps the loop-family marker, keeping the compensation flag. */
export function bpmnMarkerCommand(
  view: { readonly id: string; readonly compensation: boolean },
  value: string,
): BpmnCommand {
  const markers: BpmnActivityMarker[] =
    value === '' ? [] : [value as BpmnActivityMarker];
  if (view.compensation) {
    markers.push('compensation');
  }
  return setActivityMarkersCommand(view.id, markers);
}

/** Compensation checkbox: toggles the flag, keeping the loop-family marker. */
export function bpmnCompensationCommand(
  view: { readonly id: string; readonly loopMarker: BpmnLoopMarker | null },
  checked: boolean,
): BpmnCommand {
  const markers: BpmnActivityMarker[] =
    view.loopMarker === null ? [] : [view.loopMarker];
  if (checked) {
    markers.push('compensation');
  }
  return setActivityMarkersCommand(view.id, markers);
}

/**
 * The text fields' keys: Escape reverts the field to the model value without
 * committing, Enter on a single-line input commits immediately (a native
 * `change`). Returns what the key did so the host can stop it.
 */
export function bpmnFieldKey(
  key: string,
  target: HTMLInputElement | HTMLTextAreaElement,
  modelValue: string,
): 'revert' | 'commit' | null {
  if (key === 'Escape') {
    target.value = modelValue;
    return 'revert';
  }
  if (key === 'Enter' && target.tagName === 'INPUT') {
    target.dispatchEvent(new Event('change', { bubbles: false }));
    return 'commit';
  }
  return null;
}
