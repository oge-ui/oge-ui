/**
 * The pluggable properties panel (G5b). A provider is plain data: for the
 * selected element it returns groups of typed entries, and every entry's
 * `set` turns a committed value into an undoable engine command. Both render
 * layers draw the same `.oge-bpmn-props-*` field for each entry type; a
 * `custom` entry is drawn by the app (an Angular template / a React render
 * prop) and commits through the same `set`.
 *
 * The built-in G5b fields — event-definition payloads, "Move to…" and
 * documentation — are themselves providers ({@link OGE_BPMN_DEFAULT_PROPERTIES_PROVIDERS}),
 * so an app can replace or remove them by id like any other.
 */
import type {
  BpmnDiagram,
  BpmnEdge,
  BpmnNode,
  BpmnPool,
  BpmnRootElementType,
  BpmnTimerKind,
} from './bpmn-model';
import { isBpmnEventType } from './bpmn-model';
import type { BpmnCommand } from './command-stack';
import {
  BPMN_PROCESS_TARGET,
  addRootElementCommand,
  bpmnRootElements,
  setDocumentationCommand,
  setEventDetailsCommand,
  updateRootElementCommand,
} from './commands-extensions';
import type { OgeBpmnResolvedMessages } from './config';
import { bpmnMoveTargets, moveToContainerCommand } from './modeling';

/** The field types an entry renders as. */
export type OgeBpmnPropertiesFieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'expression'
  | 'list'
  | 'custom';

/** One option of a `select` entry. */
export interface OgeBpmnPropertiesOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

/** One column of a `list` entry. */
export interface OgeBpmnListColumn {
  readonly key: string;
  readonly label: string;
}

/** One row of a `list` entry: column key → cell text. */
export type OgeBpmnListRow = Readonly<Record<string, string>>;

/** A committed entry value: text, a checkbox state or list rows. */
export type OgeBpmnPropertiesValue =
  string | boolean | readonly OgeBpmnListRow[];

/** One field of a provider group. */
export interface OgeBpmnPropertiesEntry {
  /** Unique within the panel; the DOM id suffix and the custom-template key. */
  readonly id: string;
  readonly label: string;
  readonly type: OgeBpmnPropertiesFieldType;
  /** `checkbox` → boolean, `list` → rows, everything else → string. */
  readonly value: OgeBpmnPropertiesValue;
  /** `select` only. */
  readonly options?: readonly OgeBpmnPropertiesOption[];
  /** `list` only: the row columns. */
  readonly columns?: readonly OgeBpmnListColumn[];
  /** Help text rendered under the field (and wired with `aria-describedby`). */
  readonly description?: string;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  /** Free data for a `custom` entry's template / render prop. */
  readonly data?: unknown;
  /**
   * Turns a committed value into the command to execute (one undo step), or
   * null for nothing. Entries without `set` are read-only.
   */
  set?(value: OgeBpmnPropertiesValue): BpmnCommand | null;
}

/** A titled group of entries. */
export interface OgeBpmnPropertiesGroup {
  readonly id: string;
  /** Heading of the group; empty renders the entries without a heading. */
  readonly label: string;
  readonly entries: readonly OgeBpmnPropertiesEntry[];
}

/** What the panel edits: the process (nothing selected) or one element. */
export type OgeBpmnPropertiesTarget =
  | { readonly kind: 'process'; readonly id: string }
  | { readonly kind: 'node'; readonly id: string; readonly node: BpmnNode }
  | { readonly kind: 'edge'; readonly id: string; readonly edge: BpmnEdge }
  | { readonly kind: 'pool'; readonly id: string; readonly pool: BpmnPool };

/** What a provider receives. */
export interface OgeBpmnPropertiesContext {
  readonly diagram: BpmnDiagram;
  readonly target: OgeBpmnPropertiesTarget;
  readonly messages: OgeBpmnResolvedMessages;
}

/** A source of panel groups, merged by `id` (a provider with a built-in id replaces it). */
export interface OgeBpmnPropertiesProvider {
  readonly id: string;
  getGroups(
    context: OgeBpmnPropertiesContext,
  ): readonly OgeBpmnPropertiesGroup[];
}

/** The panel target of a selection, or null for a multi-selection. */
export function bpmnPropertiesTarget(
  model: BpmnDiagram,
  selection: readonly string[],
): OgeBpmnPropertiesTarget | null {
  if (selection.length === 0) {
    return { kind: 'process', id: model.processId };
  }
  if (selection.length > 1) return null;
  const id = selection[0];
  const node = model.nodes[id];
  if (node !== undefined) return { kind: 'node', id, node };
  const edge = model.edges[id];
  if (edge !== undefined) return { kind: 'edge', id, edge };
  const pool = model.pools[id];
  if (pool !== undefined) return { kind: 'pool', id, pool };
  return { kind: 'process', id: model.processId };
}

const fill = (
  template: string,
  values: Readonly<Record<string, string | number>>,
): string =>
  template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );

// ------------------------------------------------------ built-in providers

const REF_KINDS: readonly BpmnRootElementType[] = [
  'message',
  'signal',
  'error',
  'escalation',
];

const NEW_ROOT = '\u0000new';

/** The event-definition payload fields (timer, reference, condition, link). */
const eventDetailsProvider: OgeBpmnPropertiesProvider = {
  id: 'oge-event-details',
  getGroups({ diagram, target, messages }) {
    if (target.kind !== 'node') return [];
    const node = target.node;
    if (
      node.type === 'textAnnotation' ||
      !isBpmnEventType(node.type) ||
      node.eventDefinition === undefined
    ) {
      return [];
    }
    const x = messages.extensions;
    const kind = node.eventDefinition;
    const details = node.eventDetails ?? {};
    const entries: OgeBpmnPropertiesEntry[] = [];
    if (kind === 'timer') {
      const timerKind: BpmnTimerKind = details.timer?.kind ?? 'timeDuration';
      const expression = details.timer?.expression ?? '';
      entries.push(
        {
          id: 'timer-kind',
          label: x.timerType,
          type: 'select',
          value: timerKind,
          options: (['timeDate', 'timeDuration', 'timeCycle'] as const).map(
            (value) => ({ value, label: x.timerKinds[value] }),
          ),
          set: (value) =>
            setEventDetailsCommand(node.id, {
              timer: { kind: value as BpmnTimerKind, expression },
            }),
        },
        {
          id: 'timer-expression',
          label: x.timerExpression,
          type: 'expression',
          value: expression,
          placeholder:
            timerKind === 'timeDate'
              ? '2026-12-31T09:00:00Z'
              : timerKind === 'timeCycle'
                ? 'R3/PT10M'
                : 'PT15M',
          set: (value) =>
            setEventDetailsCommand(node.id, {
              timer:
                value === ''
                  ? null
                  : { kind: timerKind, expression: String(value) },
            }),
        },
      );
    }
    if ((REF_KINDS as readonly string[]).includes(kind)) {
      const refKind = kind as BpmnRootElementType;
      const roots = bpmnRootElements(diagram, refKind);
      const ref = details.ref ?? '';
      entries.push({
        id: 'event-ref',
        label: x.rootRef[refKind],
        type: 'select',
        value: ref,
        options: [
          { value: '', label: messages.properties.noneOption },
          ...roots.map((root) => ({
            value: root.id,
            label:
              root.name !== undefined && root.name !== '' ? root.name : root.id,
          })),
          ...(ref !== '' && !roots.some((root) => root.id === ref)
            ? [{ value: ref, label: ref }]
            : []),
          { value: NEW_ROOT, label: x.newRoot[refKind] },
        ],
        set: (value) =>
          value === NEW_ROOT
            ? addRootElementCommand({ type: refKind }, node.id)
            : setEventDetailsCommand(node.id, { ref: String(value) }),
      });
      const selected = roots.find((root) => root.id === ref);
      if (selected !== undefined) {
        entries.push({
          id: 'event-ref-name',
          label: fill(x.rootName, { type: x.rootRef[refKind] }),
          type: 'text',
          value: selected.name ?? '',
          set: (value) =>
            updateRootElementCommand(selected.id, { name: String(value) }),
        });
        if (refKind === 'error' || refKind === 'escalation') {
          entries.push({
            id: 'event-ref-code',
            label: refKind === 'error' ? x.errorCode : x.escalationCode,
            type: 'text',
            value: selected.code ?? '',
            set: (value) =>
              updateRootElementCommand(selected.id, { code: String(value) }),
          });
        }
      }
    }
    if (kind === 'conditional') {
      entries.push({
        id: 'event-condition',
        label: x.condition,
        type: 'expression',
        value: details.condition ?? '',
        set: (value) =>
          setEventDetailsCommand(node.id, {
            condition: value === '' ? null : String(value),
          }),
      });
    }
    if (kind === 'link') {
      entries.push({
        id: 'event-link-name',
        label: x.linkName,
        type: 'text',
        value: details.linkName ?? '',
        set: (value) =>
          setEventDetailsCommand(node.id, { linkName: String(value) }),
      });
    }
    return entries.length === 0
      ? []
      : [{ id: 'event-details', label: x.eventDetailsHeading, entries }];
  },
};

/** "Move to…" (keyboard re-parenting) and documentation. */
const generalProvider: OgeBpmnPropertiesProvider = {
  id: 'oge-general',
  getGroups({ diagram, target, messages }) {
    const x = messages.extensions;
    const entries: OgeBpmnPropertiesEntry[] = [];
    if (target.kind === 'node') {
      const targets = bpmnMoveTargets(diagram, target.id);
      if (targets.length > 1) {
        const poolName = (poolId: string | undefined) => {
          const pool = poolId !== undefined ? diagram.pools[poolId] : undefined;
          return pool?.name !== undefined && pool.name !== ''
            ? pool.name
            : x.unnamed;
        };
        const current = targets.find((t) => t.current);
        entries.push({
          id: 'move-to',
          label: x.moveTo,
          type: 'select',
          value: current?.id ?? '',
          options: [
            ...(current === undefined ? [{ value: '', label: '—' }] : []),
            ...targets.map((t) => ({
              value: t.id,
              label:
                t.kind === 'process'
                  ? x.processTarget
                  : t.kind === 'lane'
                    ? fill(x.laneTarget, {
                        pool: poolName(t.poolId),
                        lane: t.name !== '' ? t.name : x.unnamed,
                      })
                    : t.name !== ''
                      ? t.name
                      : `${messages.elementNames[t.kind === 'pool' ? 'pool' : 'subProcess']} ${x.unnamed}`,
            })),
          ],
          set: (value) =>
            value === '' || value === current?.id
              ? null
              : moveToContainerCommand(target.id, String(value)),
        });
      }
    }
    const documentation =
      target.kind === 'process'
        ? diagram.processDocumentation
        : target.kind === 'node'
          ? target.node.documentation
          : target.kind === 'edge'
            ? target.edge.documentation
            : target.pool.documentation;
    entries.push({
      id: 'documentation',
      label: x.documentation,
      type: 'textarea',
      value: documentation ?? '',
      set: (value) =>
        setDocumentationCommand(
          target.kind === 'process' ? BPMN_PROCESS_TARGET : target.id,
          String(value),
        ),
    });
    return [{ id: 'general', label: '', entries }];
  },
};

/**
 * The built-in providers: event-definition details (`oge-event-details`)
 * and "Move to…" + documentation (`oge-general`).
 */
export const OGE_BPMN_DEFAULT_PROPERTIES_PROVIDERS: readonly OgeBpmnPropertiesProvider[] =
  [eventDetailsProvider, generalProvider];

/**
 * The effective provider list: the defaults followed by the input
 * providers; an input provider whose id matches a default replaces it in
 * place.
 */
export function resolveBpmnPropertiesProviders(
  input: readonly OgeBpmnPropertiesProvider[] | undefined,
  defaults: readonly OgeBpmnPropertiesProvider[] = OGE_BPMN_DEFAULT_PROPERTIES_PROVIDERS,
): readonly OgeBpmnPropertiesProvider[] {
  if (input === undefined || input.length === 0) return defaults;
  const byId = new Map(input.map((provider) => [provider.id, provider]));
  const merged = defaults.map((provider) => byId.get(provider.id) ?? provider);
  const defaultIds = new Set(defaults.map((provider) => provider.id));
  return [
    ...merged,
    ...input.filter((provider) => !defaultIds.has(provider.id)),
  ];
}

/**
 * Collects the groups every provider contributes for a selection (empty for
 * a multi-selection). A provider that throws contributes nothing.
 */
export function buildBpmnPropertiesGroups(
  model: BpmnDiagram,
  selection: readonly string[],
  messages: OgeBpmnResolvedMessages,
  providers: readonly OgeBpmnPropertiesProvider[],
): readonly OgeBpmnPropertiesGroup[] {
  const target = bpmnPropertiesTarget(model, selection);
  if (target === null) return [];
  const groups: OgeBpmnPropertiesGroup[] = [];
  for (const provider of providers) {
    try {
      for (const group of provider.getGroups({
        diagram: model,
        target,
        messages,
      })) {
        if (group.entries.length > 0) groups.push(group);
      }
    } catch {
      // a broken provider never takes the panel down
    }
  }
  return groups;
}

/** Commits a list edit: the rows with one cell changed. */
export function bpmnListWithCell(
  rows: readonly OgeBpmnListRow[],
  index: number,
  key: string,
  value: string,
): readonly OgeBpmnListRow[] {
  return rows.map((row, i) => (i === index ? { ...row, [key]: value } : row));
}

/** Commits a list edit: the rows with one row removed. */
export function bpmnListWithout(
  rows: readonly OgeBpmnListRow[],
  index: number,
): readonly OgeBpmnListRow[] {
  return rows.filter((_, i) => i !== index);
}

/** Commits a list edit: the rows with an empty row appended. */
export function bpmnListWithRow(
  rows: readonly OgeBpmnListRow[],
  columns: readonly OgeBpmnListColumn[],
): readonly OgeBpmnListRow[] {
  return [...rows, Object.fromEntries(columns.map((c) => [c.key, '']))];
}

/** Accessible name of one list cell (`Source 2`). */
export function bpmnListCellLabel(
  messages: OgeBpmnResolvedMessages,
  entry: OgeBpmnPropertiesEntry,
  column: OgeBpmnListColumn,
  index: number,
): string {
  return fill(messages.extensions.itemField, {
    field: `${entry.label} ${column.label}`,
    index: index + 1,
  });
}

/** Accessible name of one list row's remove button. */
export function bpmnListRemoveLabel(
  messages: OgeBpmnResolvedMessages,
  entry: OgeBpmnPropertiesEntry,
  index: number,
): string {
  return fill(messages.extensions.removeItem, {
    label: `${entry.label} ${index + 1}`,
  });
}
