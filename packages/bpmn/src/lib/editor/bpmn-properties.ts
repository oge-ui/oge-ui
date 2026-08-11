import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
  output,
} from '@angular/core';
import {
  OGE_DEFAULT_BPMN_COLOR_PRESETS,
  type OgeBpmnMessages,
} from '../config';
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
} from '../engine/bpmn-model';
import {
  VALID_EVENT_DEFINITIONS,
  isBpmnActivityType,
  isBpmnEventType,
  isBpmnSubProcessType,
} from '../engine/bpmn-model';
import type { BpmnCommand } from '../engine/command-stack';
import {
  addLaneCommand,
  morphNodeCommand,
  removeLaneCommand,
  renameLaneCommand,
  setActivityMarkersCommand,
  setBoundaryInterruptingCommand,
  setCalledElementCommand,
  setConditionCommand,
  setDefaultFlowCommand,
  setElementColorsCommand,
  setEventDefinitionCommand,
  toggleSubProcessCollapseCommand,
  updateLabelCommand,
  updateProcessCommand,
} from '../engine/commands';
import { canMorph, morphGroupOf } from '../engine/rules';

/** The loop-family markers offered by the marker select (compensation is a checkbox). */
type BpmnLoopMarker = Exclude<BpmnActivityMarker, 'compensation'>;

type PropertiesView =
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

let nextUid = 0;

/**
 * Internal, dependency-free properties panel rendered by `OgeBpmnEditor` as a
 * right-side region. Shows process properties when nothing is selected, the
 * editable fields of a single selected element, or a count summary for a
 * multi-selection. Every commit goes through an engine command emitted via
 * `commandRequested`, so each field change is individually undoable; Escape
 * inside a field reverts it to the model value without committing.
 */
@Component({
  selector: 'oge-bpmn-properties',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrl: './bpmn-properties.scss',
  host: {
    class: 'oge-bpmn-properties',
    role: 'region',
    // Composite name keeps sibling editors' panels distinguishable
    // (axe landmark-unique); tabindex makes the scrollable region
    // keyboard-reachable (axe scrollable-region-focusable).
    '[attr.aria-label]': 'regionLabel()',
    tabindex: '0',
  },
  template: `
    @switch (view().kind) {
      @case ('process') {
        <h3 class="oge-bpmn-props-heading">{{ msg().processHeading }}</h3>
        <div class="oge-bpmn-props-field">
          <span class="oge-bpmn-props-label">{{ msg().id }}</span>
          <span class="oge-bpmn-props-id">{{ diagram().processId }}</span>
        </div>
        <div class="oge-bpmn-props-field">
          <label class="oge-bpmn-props-label" [for]="uid + '-pname'">
            {{ msg().name }}
          </label>
          <input
            [id]="uid + '-pname'"
            class="oge-bpmn-props-input"
            type="text"
            [value]="diagram().processName ?? ''"
            (change)="onProcessName($event)"
            (keydown)="onFieldKeydown($event, diagram().processName ?? '')"
          />
        </div>
        <label class="oge-bpmn-props-check">
          <input
            type="checkbox"
            [checked]="diagram().isExecutable"
            (change)="onExecutable($event)"
          />
          {{ msg().executable }}
        </label>
      }
      @case ('multi') {
        <p class="oge-bpmn-props-summary">{{ multiSummary() }}</p>
      }
      @case ('node') {
        <h3 class="oge-bpmn-props-heading">{{ nodeView().typeName }}</h3>
        <div class="oge-bpmn-props-field">
          <span class="oge-bpmn-props-label">{{ msg().id }}</span>
          <span class="oge-bpmn-props-id">{{ nodeView().node.id }}</span>
        </div>
        <div class="oge-bpmn-props-field">
          <label class="oge-bpmn-props-label" [for]="uid + '-name'">
            {{ msg().name }}
          </label>
          <input
            [id]="uid + '-name'"
            class="oge-bpmn-props-input"
            type="text"
            [value]="nodeView().node.name ?? ''"
            (change)="onName(nodeView().node.id, $event)"
            (keydown)="onFieldKeydown($event, nodeView().node.name ?? '')"
          />
        </div>
        @if (morphView(); as mv) {
          <div class="oge-bpmn-props-field">
            <label class="oge-bpmn-props-label" [for]="uid + '-type'">
              {{ msg().typeLabel }}
            </label>
            <select
              [id]="uid + '-type'"
              class="oge-bpmn-props-input oge-bpmn-props-select"
              (change)="onMorph(nodeView().node.id, $event)"
            >
              @for (option of mv.options; track option.type) {
                <option
                  [value]="option.type"
                  [selected]="option.type === mv.current"
                  [disabled]="option.disabled"
                  [attr.title]="option.reason"
                >
                  {{ option.label }}
                </option>
              }
            </select>
          </div>
        }
        @if (eventDefView(); as ev) {
          <div class="oge-bpmn-props-field">
            <label class="oge-bpmn-props-label" [for]="uid + '-evdef'">
              {{ msg().eventDefinition }}
            </label>
            <select
              [id]="uid + '-evdef'"
              class="oge-bpmn-props-input oge-bpmn-props-select oge-bpmn-props-eventdef"
              (change)="onEventDefinition(ev.id, $event)"
            >
              <option value="" [selected]="ev.current === null">
                {{ msg().noneOption }}
              </option>
              @for (kind of ev.kinds; track kind) {
                <option [value]="kind" [selected]="kind === ev.current">
                  {{ msg().eventDefinitionNames[kind] }}
                </option>
              }
            </select>
          </div>
        }
        @if (boundaryView(); as bv) {
          <label class="oge-bpmn-props-check">
            <input
              type="checkbox"
              class="oge-bpmn-props-interrupting"
              [checked]="bv.interrupting"
              (change)="onInterrupting(bv.id, $event)"
            />
            {{ msg().interrupting }}
          </label>
        }
        @if (subProcessView(); as sv) {
          <label class="oge-bpmn-props-check">
            <input
              type="checkbox"
              class="oge-bpmn-props-collapsed"
              [checked]="sv.collapsed"
              (change)="onCollapsed(sv.id, $event)"
            />
            {{ msg().collapsed }}
          </label>
        }
        @if (calledElementView(); as cv) {
          <div class="oge-bpmn-props-field">
            <label class="oge-bpmn-props-label" [for]="uid + '-called'">
              {{ msg().calledElement }}
            </label>
            <input
              [id]="uid + '-called'"
              class="oge-bpmn-props-input oge-bpmn-props-called"
              type="text"
              [value]="cv.calledElement"
              (change)="onCalledElement(cv.id, $event)"
              (keydown)="onFieldKeydown($event, cv.calledElement)"
            />
          </div>
        }
        @if (markerView(); as mk) {
          <div class="oge-bpmn-props-field">
            <label class="oge-bpmn-props-label" [for]="uid + '-marker'">
              {{ msg().marker }}
            </label>
            <select
              [id]="uid + '-marker'"
              class="oge-bpmn-props-input oge-bpmn-props-select oge-bpmn-props-marker"
              (change)="onMarker(mk, $event)"
            >
              <option value="" [selected]="mk.loopMarker === null">
                {{ msg().noneOption }}
              </option>
              @for (marker of mk.loopKinds; track marker) {
                <option [value]="marker" [selected]="marker === mk.loopMarker">
                  {{ msg().markerNames[marker] }}
                </option>
              }
            </select>
          </div>
          <label class="oge-bpmn-props-check">
            <input
              type="checkbox"
              class="oge-bpmn-props-compensation"
              [checked]="mk.compensation"
              (change)="onForCompensation(mk, $event)"
            />
            {{ msg().forCompensation }}
          </label>
        }
      }
      @case ('annotation') {
        <div class="oge-bpmn-props-field">
          <label class="oge-bpmn-props-label" [for]="uid + '-text'">
            {{ msg().annotationText }}
          </label>
          <textarea
            [id]="uid + '-text'"
            class="oge-bpmn-props-input oge-bpmn-props-textarea"
            [value]="annotationView().node.text"
            (change)="onName(annotationView().node.id, $event)"
            (keydown)="onFieldKeydown($event, annotationView().node.text)"
          ></textarea>
        </div>
      }
      @case ('flow') {
        <div class="oge-bpmn-props-field">
          <span class="oge-bpmn-props-label">{{ msg().id }}</span>
          <span class="oge-bpmn-props-id">{{ flowView().edge.id }}</span>
        </div>
        <div class="oge-bpmn-props-field">
          <label class="oge-bpmn-props-label" [for]="uid + '-fname'">
            {{ msg().name }}
          </label>
          <input
            [id]="uid + '-fname'"
            class="oge-bpmn-props-input"
            type="text"
            [value]="flowView().edge.name ?? ''"
            (change)="onName(flowView().edge.id, $event)"
            (keydown)="onFieldKeydown($event, flowView().edge.name ?? '')"
          />
        </div>
        <div class="oge-bpmn-props-field">
          <label class="oge-bpmn-props-label" [for]="uid + '-cond'">
            {{ msg().condition }}
          </label>
          <textarea
            [id]="uid + '-cond'"
            class="oge-bpmn-props-input oge-bpmn-props-textarea"
            [value]="flowView().edge.conditionExpression ?? ''"
            (change)="onCondition(flowView().edge.id, $event)"
            (keydown)="
              onFieldKeydown($event, flowView().edge.conditionExpression ?? '')
            "
          ></textarea>
        </div>
        @if (flowView().canDefault) {
          <label class="oge-bpmn-props-check">
            <input
              type="checkbox"
              [checked]="flowView().isDefault"
              (change)="onDefaultFlow(flowView().edge, $event)"
            />
            {{ msg().defaultFlow }}
          </label>
        }
      }
      @case ('messageFlow') {
        <h3 class="oge-bpmn-props-heading">{{ messageFlowTypeName() }}</h3>
        <div class="oge-bpmn-props-field">
          <span class="oge-bpmn-props-label">{{ msg().id }}</span>
          <span class="oge-bpmn-props-id">{{ messageFlowView().edge.id }}</span>
        </div>
        <div class="oge-bpmn-props-field">
          <label class="oge-bpmn-props-label" [for]="uid + '-mfname'">
            {{ msg().name }}
          </label>
          <input
            [id]="uid + '-mfname'"
            class="oge-bpmn-props-input"
            type="text"
            [value]="messageFlowView().edge.name ?? ''"
            (change)="onName(messageFlowView().edge.id, $event)"
            (keydown)="
              onFieldKeydown($event, messageFlowView().edge.name ?? '')
            "
          />
        </div>
      }
      @case ('pool') {
        <h3 class="oge-bpmn-props-heading">{{ poolView().typeName }}</h3>
        <div class="oge-bpmn-props-field">
          <span class="oge-bpmn-props-label">{{ msg().id }}</span>
          <span class="oge-bpmn-props-id">{{ poolView().pool.id }}</span>
        </div>
        <div class="oge-bpmn-props-field">
          <label class="oge-bpmn-props-label" [for]="uid + '-poolname'">
            {{ msg().name }}
          </label>
          <input
            [id]="uid + '-poolname'"
            class="oge-bpmn-props-input"
            type="text"
            [value]="poolView().pool.name ?? ''"
            (change)="onName(poolView().pool.id, $event)"
            (keydown)="onFieldKeydown($event, poolView().pool.name ?? '')"
          />
        </div>
        <h3 class="oge-bpmn-props-heading">{{ msg().lanesHeading }}</h3>
        @for (lane of poolView().pool.lanes; track lane.id) {
          <div class="oge-bpmn-props-field oge-bpmn-props-lane">
            <input
              class="oge-bpmn-props-input oge-bpmn-props-lane-name"
              type="text"
              [value]="lane.name ?? ''"
              [attr.aria-label]="laneNameLabel(lane)"
              (change)="onLaneName(poolView().pool.id, lane.id, $event)"
              (keydown)="onFieldKeydown($event, lane.name ?? '')"
            />
            <button
              type="button"
              class="oge-bpmn-props-lane-remove"
              [attr.aria-label]="removeLaneLabel(lane)"
              [title]="removeLaneLabel(lane)"
              (click)="onRemoveLane(poolView().pool.id, lane.id)"
            >
              ×
            </button>
          </div>
        }
        <button
          type="button"
          class="oge-bpmn-props-add-lane"
          (click)="onAddLane(poolView().pool.id)"
        >
          {{ msg().addLane }}
        </button>
      }
      @case ('other') {
        <h3 class="oge-bpmn-props-heading">{{ otherView().typeName }}</h3>
        <div class="oge-bpmn-props-field">
          <span class="oge-bpmn-props-label">{{ msg().id }}</span>
          <span class="oge-bpmn-props-id">{{ otherView().id }}</span>
        </div>
      }
    }
    @if (appearance(); as ap) {
      <h3 class="oge-bpmn-props-heading">{{ msg().appearanceHeading }}</h3>
      <div
        class="oge-bpmn-props-swatches"
        role="group"
        [attr.aria-label]="msg().appearanceHeading"
      >
        @for (color of colorPresets(); track color) {
          <button
            type="button"
            class="oge-bpmn-props-swatch"
            [style.background]="color"
            [attr.aria-label]="presetLabelFor(color)"
            [title]="presetLabelFor(color)"
            (click)="onPreset(ap.ids, color)"
          ></button>
        }
      </div>
      <div class="oge-bpmn-props-field">
        <label class="oge-bpmn-props-label" [for]="uid + '-fill'">
          {{ msg().fillLabel }}
        </label>
        <input
          [id]="uid + '-fill'"
          class="oge-bpmn-props-color"
          type="color"
          [value]="colorValue(ap.fill, '#ffffff')"
          (change)="onColor(ap.ids, 'fill', $event)"
        />
      </div>
      <div class="oge-bpmn-props-field">
        <label class="oge-bpmn-props-label" [for]="uid + '-stroke'">
          {{ msg().strokeLabel }}
        </label>
        <input
          [id]="uid + '-stroke'"
          class="oge-bpmn-props-color"
          type="color"
          [value]="colorValue(ap.stroke, '#000000')"
          (change)="onColor(ap.ids, 'stroke', $event)"
        />
      </div>
      <button
        type="button"
        class="oge-bpmn-props-clear"
        (click)="onClearColors(ap.ids)"
      >
        {{ msg().clearColors }}
      </button>
    }
  `,
})
export class OgeBpmnProperties {
  /** Unique per-instance prefix for field ids. */
  protected readonly uid = `oge-bpmn-props-${nextUid++}`;

  /** The current diagram model. */
  readonly diagram = input.required<BpmnDiagram>();
  /** The currently selected element ids. */
  readonly selection = input.required<readonly string[]>();
  /** The editor's merged messages. */
  readonly messages = input.required<OgeBpmnMessages>();
  /** Fill presets rendered as swatch buttons in the appearance section. */
  readonly colorPresets = input<readonly string[]>(
    OGE_DEFAULT_BPMN_COLOR_PRESETS,
  );

  /** An engine command a field commit wants executed (each one undoable). */
  readonly commandRequested = output<BpmnCommand>();

  /** The properties messages block. */
  protected readonly msg = computed(() => this.messages().properties);

  /**
   * Accessible name of the region — the editor's canvas label composed with
   * the panel label, so several editors on one page expose distinguishable
   * landmarks.
   */
  protected readonly regionLabel = computed(
    () => `${this.messages().canvasLabel} — ${this.msg().panelLabel}`,
  );

  /** What the panel shows for the current selection. */
  protected readonly view = computed<PropertiesView>(() => {
    const m = this.diagram();
    const sel = this.selection();
    if (sel.length === 0) {
      return { kind: 'process' };
    }
    if (sel.length > 1) {
      return { kind: 'multi', count: sel.length };
    }
    const id = sel[0];
    const names = this.messages().elementNames;
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
  });

  /**
   * The appearance (colors) section state: every selected element with DI
   * (nodes and edges alike) plus the first element's current colors, or null
   * when nothing colorable is selected.
   */
  protected readonly appearance = computed<{
    readonly ids: readonly string[];
    readonly fill: string;
    readonly stroke: string;
  } | null>(() => {
    const m = this.diagram();
    const ids = this.selection().filter(
      (id) => m.shapeDi[id] !== undefined || m.edgeDi[id] !== undefined,
    );
    if (ids.length === 0) {
      return null;
    }
    const first = m.shapeDi[ids[0]] ?? m.edgeDi[ids[0]];
    return { ids, fill: first.fill ?? '', stroke: first.stroke ?? '' };
  });

  /** The morph (type) select of a single selected flow node, or null. */
  protected readonly morphView = computed<{
    readonly current: BpmnFlowNodeType;
    readonly options: readonly {
      readonly type: BpmnFlowNodeType;
      readonly label: string;
      readonly disabled: boolean;
      readonly reason: string | null;
    }[];
  } | null>(() => {
    const v = this.view();
    if (v.kind !== 'node') {
      return null;
    }
    const group = morphGroupOf(v.node.type);
    if (group === null || group.length < 2) {
      return null;
    }
    const m = this.diagram();
    const labels = this.messages().paletteLabels;
    return {
      // A non-null morph group implies a flow-node type.
      current: v.node.type as BpmnFlowNodeType,
      options: group.map((type) => {
        const result = canMorph(m, v.node.id, type);
        return {
          type,
          label: labels[type],
          disabled: !result.allowed,
          reason: result.allowed ? null : (result.reason ?? null),
        };
      }),
    };
  });

  /** The event-definition select of a single selected event, or null. */
  protected readonly eventDefView = computed<{
    readonly id: string;
    readonly current: BpmnEventDefinitionKind | null;
    readonly kinds: readonly BpmnEventDefinitionKind[];
  } | null>(() => {
    const v = this.view();
    if (v.kind !== 'node' || !isBpmnEventType(v.node.type)) {
      return null;
    }
    return {
      id: v.node.id,
      current: v.node.eventDefinition ?? null,
      kinds: VALID_EVENT_DEFINITIONS[v.node.type],
    };
  });

  /** The "Interrupting" checkbox of a single selected boundary event, or null. */
  protected readonly boundaryView = computed<{
    readonly id: string;
    readonly interrupting: boolean;
  } | null>(() => {
    const v = this.view();
    if (v.kind !== 'node' || v.node.type !== 'boundaryEvent') {
      return null;
    }
    return { id: v.node.id, interrupting: v.node.cancelActivity !== false };
  });

  /** The "Collapsed" checkbox of a single selected sub-process, or null. */
  protected readonly subProcessView = computed<{
    readonly id: string;
    readonly collapsed: boolean;
  } | null>(() => {
    const v = this.view();
    if (v.kind !== 'node' || !isBpmnSubProcessType(v.node.type)) {
      return null;
    }
    return { id: v.node.id, collapsed: v.node.collapsed === true };
  });

  /** The marker select + compensation checkbox of a single selected activity, or null. */
  protected readonly markerView = computed<{
    readonly id: string;
    readonly loopMarker: BpmnLoopMarker | null;
    readonly loopKinds: readonly BpmnLoopMarker[];
    readonly compensation: boolean;
  } | null>(() => {
    const v = this.view();
    if (v.kind !== 'node' || !isBpmnActivityType(v.node.type)) {
      return null;
    }
    const markers = v.node.markers ?? [];
    const loopMarker =
      markers.find(
        (marker): marker is BpmnLoopMarker =>
          marker === 'loop' ||
          marker === 'multiInstanceParallel' ||
          marker === 'multiInstanceSequential',
      ) ?? null;
    return {
      id: v.node.id,
      loopMarker,
      loopKinds: ['loop', 'multiInstanceParallel', 'multiInstanceSequential'],
      compensation: markers.includes('compensation'),
    };
  });

  /** The "Called element" field of a single selected call activity, or null. */
  protected readonly calledElementView = computed<{
    readonly id: string;
    readonly calledElement: string;
  } | null>(() => {
    const v = this.view();
    if (v.kind !== 'node' || v.node.type !== 'callActivity') {
      return null;
    }
    return { id: v.node.id, calledElement: v.node.calledElement ?? '' };
  });

  /** Display name of the message-flow heading. */
  protected readonly messageFlowTypeName = computed(
    () => this.messages().elementNames['messageFlow'],
  );

  protected readonly multiSummary = computed(() => {
    const v = this.view();
    const count = v.kind === 'multi' ? v.count : 0;
    return this.msg().selectionCount.replace('{count}', String(count));
  });

  // Narrowing helpers for the template (the @case guard guarantees the kind).
  protected nodeView(): Extract<PropertiesView, { kind: 'node' }> {
    return this.view() as Extract<PropertiesView, { kind: 'node' }>;
  }
  protected annotationView(): Extract<PropertiesView, { kind: 'annotation' }> {
    return this.view() as Extract<PropertiesView, { kind: 'annotation' }>;
  }
  protected flowView(): Extract<PropertiesView, { kind: 'flow' }> {
    return this.view() as Extract<PropertiesView, { kind: 'flow' }>;
  }
  protected otherView(): Extract<PropertiesView, { kind: 'other' }> {
    return this.view() as Extract<PropertiesView, { kind: 'other' }>;
  }
  protected poolView(): Extract<PropertiesView, { kind: 'pool' }> {
    return this.view() as Extract<PropertiesView, { kind: 'pool' }>;
  }
  protected messageFlowView(): Extract<
    PropertiesView,
    { kind: 'messageFlow' }
  > {
    return this.view() as Extract<PropertiesView, { kind: 'messageFlow' }>;
  }

  /** Aria label of a lane's name input. */
  protected laneNameLabel(lane: { id: string; name?: string }): string {
    return this.msg().laneName.replace('{name}', lane.name ?? lane.id);
  }

  /** Aria label / title of a lane's remove button. */
  protected removeLaneLabel(lane: { id: string; name?: string }): string {
    return this.msg().removeLane.replace('{name}', lane.name ?? lane.id);
  }

  protected onAddLane(poolId: string): void {
    this.commandRequested.emit(addLaneCommand(poolId));
  }

  protected onRemoveLane(poolId: string, laneId: string): void {
    this.commandRequested.emit(removeLaneCommand(poolId, laneId));
  }

  protected onLaneName(poolId: string, laneId: string, event: Event): void {
    this.commandRequested.emit(
      renameLaneCommand(poolId, laneId, this.valueOf(event)),
    );
  }

  protected onCalledElement(id: string, event: Event): void {
    const value = this.valueOf(event);
    this.commandRequested.emit(
      setCalledElementCommand(id, value === '' ? undefined : value),
    );
  }

  protected onProcessName(event: Event): void {
    this.commandRequested.emit(
      updateProcessCommand({ name: this.valueOf(event) }),
    );
  }

  protected onExecutable(event: Event): void {
    this.commandRequested.emit(
      updateProcessCommand({
        isExecutable: (event.target as HTMLInputElement).checked,
      }),
    );
  }

  protected onName(id: string, event: Event): void {
    this.commandRequested.emit(updateLabelCommand(id, this.valueOf(event)));
  }

  protected onCondition(flowId: string, event: Event): void {
    const value = this.valueOf(event);
    this.commandRequested.emit(
      setConditionCommand(flowId, value === '' ? undefined : value),
    );
  }

  protected onDefaultFlow(edge: BpmnSequenceFlow, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.commandRequested.emit(
      setDefaultFlowCommand(edge.sourceRef, checked ? edge.id : undefined),
    );
  }

  /** Aria label / title of a preset swatch button. */
  protected presetLabelFor(color: string): string {
    return this.msg().presetLabel.replace('{color}', color);
  }

  /** Returns the color when it is a 6-digit hex (what `type="color"` accepts). */
  protected colorValue(color: string, fallback: string): string {
    return /^#[0-9a-fA-F]{6}$/.test(color) ? color : fallback;
  }

  /** A preset swatch applies its color as fill only; the stroke is untouched. */
  protected onPreset(ids: readonly string[], color: string): void {
    this.commandRequested.emit(setElementColorsCommand(ids, { fill: color }));
  }

  protected onColor(
    ids: readonly string[],
    key: 'fill' | 'stroke',
    event: Event,
  ): void {
    this.commandRequested.emit(
      setElementColorsCommand(ids, { [key]: this.valueOf(event) }),
    );
  }

  protected onClearColors(ids: readonly string[]): void {
    this.commandRequested.emit(
      setElementColorsCommand(ids, { fill: null, stroke: null }),
    );
  }

  protected onMorph(id: string, event: Event): void {
    const type = (event.target as HTMLSelectElement).value as BpmnFlowNodeType;
    this.commandRequested.emit(morphNodeCommand(id, type));
  }

  protected onEventDefinition(id: string, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.commandRequested.emit(
      setEventDefinitionCommand(
        id,
        value === '' ? undefined : (value as BpmnEventDefinitionKind),
      ),
    );
  }

  protected onInterrupting(id: string, event: Event): void {
    this.commandRequested.emit(
      setBoundaryInterruptingCommand(
        id,
        (event.target as HTMLInputElement).checked,
      ),
    );
  }

  protected onCollapsed(id: string, event: Event): void {
    this.commandRequested.emit(
      toggleSubProcessCollapseCommand(
        id,
        (event.target as HTMLInputElement).checked,
      ),
    );
  }

  /** Marker select: swaps the loop-family marker, keeping the compensation flag. */
  protected onMarker(
    view: { readonly id: string; readonly compensation: boolean },
    event: Event,
  ): void {
    const value = (event.target as HTMLSelectElement).value;
    const markers: BpmnActivityMarker[] =
      value === '' ? [] : [value as BpmnActivityMarker];
    if (view.compensation) {
      markers.push('compensation');
    }
    this.commandRequested.emit(setActivityMarkersCommand(view.id, markers));
  }

  /** Compensation checkbox: toggles the flag, keeping the loop-family marker. */
  protected onForCompensation(
    view: { readonly id: string; readonly loopMarker: BpmnLoopMarker | null },
    event: Event,
  ): void {
    const markers: BpmnActivityMarker[] =
      view.loopMarker === null ? [] : [view.loopMarker];
    if ((event.target as HTMLInputElement).checked) {
      markers.push('compensation');
    }
    this.commandRequested.emit(setActivityMarkersCommand(view.id, markers));
  }

  /** Enter commits text inputs immediately; Escape reverts to the model value. */
  protected onFieldKeydown(event: KeyboardEvent, modelValue: string): void {
    event.stopPropagation();
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    if (event.key === 'Escape') {
      event.preventDefault();
      target.value = modelValue;
      return;
    }
    if (event.key === 'Enter' && target.tagName === 'INPUT') {
      event.preventDefault();
      target.dispatchEvent(new Event('change', { bubbles: false }));
    }
  }

  private valueOf(event: Event): string {
    return (event.target as HTMLInputElement | HTMLTextAreaElement).value;
  }
}
