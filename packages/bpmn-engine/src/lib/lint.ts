/**
 * Diagram validation (G5b): a bpmnlint-like rule engine over the immutable
 * model. A rule is plain data plus a pure `check` — no DOM, no framework —
 * so the same rules run in both editors, on a server and in a CI pipeline
 * (`lintBpmnDiagram(readBpmnXml(xml).model, OGE_BPMN_DEFAULT_LINT_RULES)`).
 */
import type { OgeBpmnLintMessages, OgeBpmnMessages } from './config';
import { OGE_DEFAULT_BPMN_LINT_MESSAGES } from './config';
import type {
  BpmnDiagram,
  BpmnEdge,
  BpmnFlowNode,
  BpmnNode,
} from './bpmn-model';
import {
  effectivePoolId,
  isBpmnActivityType,
  isBpmnEventType,
  isBpmnFlowNodeType,
  isBpmnSubProcessType,
} from './bpmn-model';

/** How serious a finding is. `'off'` (in overrides only) disables a rule. */
export type OgeBpmnLintSeverity = 'error' | 'warning' | 'info';

/** One finding a rule's `check` reports. */
export interface OgeBpmnLintReport {
  /** The offending element (node, edge, pool, or the process id). */
  readonly elementId: string;
  /** Human-readable, already localized message. */
  readonly message: string;
}

/** What a rule's `check` receives besides the model. */
export interface OgeBpmnLintContext {
  /** The lint strings of the editor's (merged) message catalog. */
  readonly messages: OgeBpmnLintMessages;
  /** Display name of an element (its name, or its type's fallback name). */
  displayName(id: string): string;
}

/** A validation rule: an id, a default severity and a pure check. */
export interface OgeBpmnLintRule {
  /** Stable id (`'label-required'`), used to override or disable the rule. */
  readonly id: string;
  /** Severity of every report of this rule. */
  readonly severity: OgeBpmnLintSeverity;
  /** Returns the rule's findings for the diagram (empty when it passes). */
  check(
    model: BpmnDiagram,
    context: OgeBpmnLintContext,
  ): readonly OgeBpmnLintReport[];
}

/** Changes a rule's severity, or disables it with `'off'`. */
export interface OgeBpmnLintRuleOverride {
  readonly id: string;
  readonly severity: OgeBpmnLintSeverity | 'off';
}

/**
 * The `lintRules` input / prop: full rules are added (or replace the
 * built-in rule with the same id); overrides change a severity or disable a
 * rule (`{ id: 'label-required', severity: 'off' }`).
 */
export type OgeBpmnLintRulesInput = readonly (
  OgeBpmnLintRule | OgeBpmnLintRuleOverride
)[];

/** One problem of a validated diagram, as listed in the problems panel. */
export interface OgeBpmnLintIssue {
  /** Unique within one result (`ruleId:elementId:index`). */
  readonly key: string;
  readonly ruleId: string;
  readonly severity: OgeBpmnLintSeverity;
  readonly elementId: string;
  readonly message: string;
}

/** Payload of `lintChanged`: the full issue list plus per-severity counts. */
export interface OgeBpmnLintChangedEvent {
  readonly issues: readonly OgeBpmnLintIssue[];
  readonly errors: number;
  readonly warnings: number;
  readonly infos: number;
}

// --------------------------------------------------------------- helpers

function flowNodes(model: BpmnDiagram): BpmnFlowNode[] {
  const out: BpmnFlowNode[] = [];
  for (const id of model.order) {
    const node = model.nodes[id];
    if (
      node !== undefined &&
      node.type !== 'textAnnotation' &&
      isBpmnFlowNodeType(node.type)
    ) {
      out.push(node);
    }
  }
  return out;
}

function sequenceFlows(model: BpmnDiagram): BpmnEdge[] {
  const out: BpmnEdge[] = [];
  for (const id of model.order) {
    const edge = model.edges[id];
    if (edge?.type === 'sequenceFlow') out.push(edge);
  }
  return out;
}

interface FlowIndex {
  readonly incoming: ReadonlyMap<string, BpmnEdge[]>;
  readonly outgoing: ReadonlyMap<string, BpmnEdge[]>;
}

function indexFlows(model: BpmnDiagram): FlowIndex {
  const incoming = new Map<string, BpmnEdge[]>();
  const outgoing = new Map<string, BpmnEdge[]>();
  const push = (map: Map<string, BpmnEdge[]>, key: string, flow: BpmnEdge) => {
    const list = map.get(key);
    if (list === undefined) map.set(key, [flow]);
    else list.push(flow);
  };
  for (const flow of sequenceFlows(model)) {
    push(outgoing, flow.sourceRef, flow);
    push(incoming, flow.targetRef, flow);
  }
  return { incoming, outgoing };
}

const indexCache = new WeakMap<BpmnDiagram, FlowIndex>();
function flowsOf(model: BpmnDiagram): FlowIndex {
  let index = indexCache.get(model);
  if (index === undefined) {
    index = indexFlows(model);
    indexCache.set(model, index);
  }
  return index;
}

const isGateway = (node: BpmnNode): boolean =>
  node.type === 'exclusiveGateway' || node.type === 'parallelGateway';

const isCompensation = (node: BpmnFlowNode): boolean =>
  node.markers?.includes('compensation') === true ||
  (node.type === 'boundaryEvent' && node.eventDefinition === 'compensate');

/** Keys of the process scopes of a model: one per process (default + pool processes). */
function processScopes(model: BpmnDiagram): {
  readonly key: string;
  readonly elementId: string;
}[] {
  const pools = Object.values(model.pools);
  if (pools.length === 0) {
    return [{ key: '', elementId: model.processId }];
  }
  return pools
    .filter((pool) => pool.processRef !== undefined)
    .map((pool) => ({ key: pool.id, elementId: pool.id }));
}

function scopeKey(model: BpmnDiagram, id: string): string {
  return Object.keys(model.pools).length === 0
    ? ''
    : (effectivePoolId(model, id) ?? '');
}

// ----------------------------------------------------------------- rules

const report = (elementId: string, message: string): OgeBpmnLintReport => ({
  elementId,
  message,
});

/** Every process (or pool with a process) that has content needs a start event. */
const startEventRequired: OgeBpmnLintRule = {
  id: 'start-event-required',
  severity: 'error',
  check(model, ctx) {
    const nodes = flowNodes(model).filter((n) => n.parentId === undefined);
    return processScopes(model)
      .filter((scope) => {
        const inScope = nodes.filter(
          (n) => scopeKey(model, n.id) === scope.key,
        );
        return (
          inScope.length > 0 && !inScope.some((n) => n.type === 'startEvent')
        );
      })
      .map((scope) =>
        report(scope.elementId, ctx.messages.rules.startEventRequired),
      );
  },
};

/** Every process (or pool with a process) that has content needs an end event. */
const endEventRequired: OgeBpmnLintRule = {
  id: 'end-event-required',
  severity: 'error',
  check(model, ctx) {
    const nodes = flowNodes(model).filter((n) => n.parentId === undefined);
    return processScopes(model)
      .filter((scope) => {
        const inScope = nodes.filter(
          (n) => scopeKey(model, n.id) === scope.key,
        );
        return (
          inScope.length > 0 && !inScope.some((n) => n.type === 'endEvent')
        );
      })
      .map((scope) =>
        report(scope.elementId, ctx.messages.rules.endEventRequired),
      );
  },
};

/** A flow node with neither incoming nor outgoing sequence flows. */
const noDisconnected: OgeBpmnLintRule = {
  id: 'no-disconnected',
  severity: 'error',
  check(model, ctx) {
    const { incoming, outgoing } = flowsOf(model);
    const out: OgeBpmnLintReport[] = [];
    for (const node of flowNodes(model)) {
      if (
        node.type === 'eventSubProcess' ||
        node.type === 'boundaryEvent' ||
        isCompensation(node)
      ) {
        continue;
      }
      const parent =
        node.parentId !== undefined ? model.nodes[node.parentId] : undefined;
      if (parent?.type === 'eventSubProcess' && node.type === 'startEvent') {
        continue;
      }
      if (!incoming.has(node.id) && !outgoing.has(node.id)) {
        out.push(report(node.id, ctx.messages.rules.disconnected));
      }
    }
    return out;
  },
};

/** A gateway must fork (2+ outgoing) or join (2+ incoming). */
const superfluousGateway: OgeBpmnLintRule = {
  id: 'superfluous-gateway',
  severity: 'warning',
  check(model, ctx) {
    const { incoming, outgoing } = flowsOf(model);
    return flowNodes(model)
      .filter((node) => {
        if (!isGateway(node)) return false;
        const ins = incoming.get(node.id)?.length ?? 0;
        const outs = outgoing.get(node.id)?.length ?? 0;
        return ins + outs > 0 && ins <= 1 && outs <= 1;
      })
      .map((node) => report(node.id, ctx.messages.rules.superfluousGateway));
  },
};

/**
 * The outgoing flows of a forking exclusive gateway need a condition unless
 * they are the default flow; the default flow must not carry one.
 */
const conditionalFlows: OgeBpmnLintRule = {
  id: 'conditional-flows',
  severity: 'error',
  check(model, ctx) {
    const { outgoing } = flowsOf(model);
    const out: OgeBpmnLintReport[] = [];
    for (const node of flowNodes(model)) {
      if (node.type !== 'exclusiveGateway') continue;
      const flows = outgoing.get(node.id) ?? [];
      if (flows.length < 2) continue;
      for (const flow of flows) {
        if (flow.type !== 'sequenceFlow') continue;
        const condition = (flow.conditionExpression ?? '').trim();
        if (flow.id === node.defaultFlowId) {
          if (condition !== '') {
            out.push(report(flow.id, ctx.messages.rules.defaultFlowCondition));
          }
        } else if (condition === '') {
          out.push(report(flow.id, ctx.messages.rules.conditionMissing));
        }
      }
    }
    return out;
  },
};

/** A non-gateway with 2+ outgoing flows splits implicitly (use a gateway). */
const noImplicitSplit: OgeBpmnLintRule = {
  id: 'no-implicit-split',
  severity: 'warning',
  check(model, ctx) {
    const { outgoing } = flowsOf(model);
    return flowNodes(model)
      .filter((node) => {
        if (isGateway(node)) return false;
        const flows = outgoing.get(node.id) ?? [];
        return (
          flows.length >= 2 &&
          flows.some(
            (flow) =>
              flow.type === 'sequenceFlow' &&
              (flow.conditionExpression ?? '').trim() === '' &&
              flow.id !== node.defaultFlowId,
          )
        );
      })
      .map((node) => report(node.id, ctx.messages.rules.implicitSplit));
  },
};

/** A non-gateway with 2+ incoming flows joins implicitly (use a gateway). */
const noImplicitJoin: OgeBpmnLintRule = {
  id: 'no-implicit-join',
  severity: 'warning',
  check(model, ctx) {
    const { incoming } = flowsOf(model);
    return flowNodes(model)
      .filter(
        (node) => !isGateway(node) && (incoming.get(node.id)?.length ?? 0) >= 2,
      )
      .map((node) => report(node.id, ctx.messages.rules.implicitJoin));
  },
};

/** Activities, events, forking exclusive gateways and pools need a label. */
const labelRequired: OgeBpmnLintRule = {
  id: 'label-required',
  severity: 'warning',
  check(model, ctx) {
    const { outgoing } = flowsOf(model);
    const out: OgeBpmnLintReport[] = [];
    const blank = (name: string | undefined) => (name ?? '').trim() === '';
    for (const node of flowNodes(model)) {
      const needs =
        isBpmnActivityType(node.type) ||
        (isBpmnEventType(node.type) && node.type !== 'boundaryEvent') ||
        (node.type === 'exclusiveGateway' &&
          (outgoing.get(node.id)?.length ?? 0) >= 2);
      if (needs && blank(node.name)) {
        out.push(report(node.id, ctx.messages.rules.labelRequired));
      }
    }
    for (const pool of Object.values(model.pools)) {
      if (blank(pool.name)) {
        out.push(report(pool.id, ctx.messages.rules.labelRequired));
      }
    }
    return out;
  },
};

/** Ids must be unique across every element the XML will carry. */
const noDuplicateIds: OgeBpmnLintRule = {
  id: 'no-duplicate-ids',
  severity: 'error',
  check(model, ctx) {
    const owners = new Map<string, string[]>();
    const add = (id: string, owner: string) => {
      const list = owners.get(id);
      if (list === undefined) owners.set(id, [owner]);
      else list.push(owner);
    };
    add(model.processId, model.processId);
    if (model.collaborationId !== undefined) {
      add(model.collaborationId, model.collaborationId);
    }
    for (const pool of Object.values(model.pools)) {
      add(pool.id, pool.id);
      if (
        pool.processRef !== undefined &&
        pool.processRef !== model.processId
      ) {
        add(pool.processRef, pool.id);
      }
      for (const lane of pool.lanes) add(lane.id, pool.id);
    }
    for (const id of model.order) {
      add(id, id);
      const node = model.nodes[id];
      if (node !== undefined && node.type !== 'textAnnotation') {
        if (node.eventDefinition !== undefined) {
          add(node.eventDetails?.id ?? `${id}_def`, id);
        }
        if (node.type === 'dataObject') add(`${id}_ref`, id);
      }
    }
    for (const root of model.rootElements ?? []) add(root.id, root.id);
    const out: OgeBpmnLintReport[] = [];
    for (const [id, list] of owners) {
      if (list.length < 2) continue;
      const message = ctx.messages.rules.duplicateId.replace('{id}', id);
      for (const owner of new Set(list)) {
        if (
          model.nodes[owner] !== undefined ||
          model.edges[owner] !== undefined ||
          model.pools[owner] !== undefined
        ) {
          out.push(report(owner, message));
        }
      }
    }
    return out;
  },
};

/** Sub-processes need a start event; a plain sub-process's must be blank. */
const subProcessStartEvent: OgeBpmnLintRule = {
  id: 'sub-process-start-event',
  severity: 'error',
  check(model, ctx) {
    const out: OgeBpmnLintReport[] = [];
    const nodes = flowNodes(model);
    for (const container of nodes) {
      if (!isBpmnSubProcessType(container.type)) continue;
      const starts = nodes.filter(
        (n) => n.parentId === container.id && n.type === 'startEvent',
      );
      const hasChildren = Object.values(model.nodes).some(
        (n) => n.parentId === container.id,
      );
      if (starts.length === 0) {
        if (hasChildren || container.type === 'eventSubProcess') {
          out.push(report(container.id, ctx.messages.rules.subProcessStart));
        }
        continue;
      }
      if (container.type !== 'eventSubProcess') {
        for (const start of starts) {
          if (start.eventDefinition !== undefined) {
            out.push(report(start.id, ctx.messages.rules.subProcessBlankStart));
          }
        }
      }
    }
    return out;
  },
};

/** Message flows connect two different pools. */
const messageFlowPools: OgeBpmnLintRule = {
  id: 'message-flow-pools',
  severity: 'error',
  check(model, ctx) {
    const out: OgeBpmnLintReport[] = [];
    for (const id of model.order) {
      const edge = model.edges[id];
      if (edge?.type !== 'messageFlow') continue;
      const a = effectivePoolId(model, edge.sourceRef);
      const b = effectivePoolId(model, edge.targetRef);
      if (a === undefined || b === undefined || a === b) {
        out.push(report(id, ctx.messages.rules.messageFlowPools));
      }
    }
    return out;
  },
};

/** A boundary event sits on an activity and leaves it by a flow. */
const boundaryEventAttached: OgeBpmnLintRule = {
  id: 'boundary-event-attached',
  severity: 'error',
  check(model, ctx) {
    const { outgoing } = flowsOf(model);
    const out: OgeBpmnLintReport[] = [];
    for (const node of flowNodes(model)) {
      if (node.type !== 'boundaryEvent') continue;
      const host =
        node.attachedToRef !== undefined
          ? model.nodes[node.attachedToRef]
          : undefined;
      if (host === undefined || !isBpmnActivityType(host.type)) {
        out.push(report(node.id, ctx.messages.rules.boundaryAttached));
        continue;
      }
      if (!isCompensation(node) && !outgoing.has(node.id)) {
        out.push(report(node.id, ctx.messages.rules.boundaryOutgoing));
      }
    }
    return out;
  },
};

/** A connected flow node no path from a start event reaches. */
const noUnreachable: OgeBpmnLintRule = {
  id: 'no-unreachable',
  severity: 'warning',
  check(model, ctx) {
    const { incoming, outgoing } = flowsOf(model);
    const nodes = flowNodes(model);
    const childrenOf = new Map<string | undefined, BpmnFlowNode[]>();
    for (const node of nodes) {
      const list = childrenOf.get(node.parentId) ?? [];
      list.push(node);
      childrenOf.set(node.parentId, list);
    }
    const reached = new Set<string>();
    const queue: string[] = [];
    const visit = (id: string) => {
      if (reached.has(id)) return;
      reached.add(id);
      queue.push(id);
    };
    const seedScope = (parentId: string | undefined) => {
      for (const child of childrenOf.get(parentId) ?? []) {
        if (child.type === 'startEvent' || child.type === 'eventSubProcess') {
          visit(child.id);
        }
      }
    };
    seedScope(undefined);
    while (queue.length > 0) {
      const id = queue.shift() as string;
      const node = model.nodes[id];
      for (const flow of outgoing.get(id) ?? []) visit(flow.targetRef);
      if (node !== undefined && isBpmnSubProcessType(node.type)) seedScope(id);
      for (const candidate of nodes) {
        if (
          candidate.type === 'boundaryEvent' &&
          candidate.attachedToRef === id
        ) {
          visit(candidate.id);
        }
      }
    }
    const scopesWithStart = new Set(
      nodes
        .filter((n) => n.type === 'startEvent' && n.parentId === undefined)
        .map((n) => scopeKey(model, n.id)),
    );
    return nodes
      .filter(
        (node) =>
          !reached.has(node.id) &&
          node.parentId === undefined &&
          scopesWithStart.has(scopeKey(model, node.id)) &&
          (incoming.has(node.id) || outgoing.has(node.id)) &&
          !isCompensation(node),
      )
      .map((node) => report(node.id, ctx.messages.rules.unreachable));
  },
};

/**
 * The built-in rule set, in report order: start/end events, disconnected
 * nodes, superfluous gateways, exclusive-gateway conditions and default
 * flows, implicit splits and joins, labels, duplicate ids, sub-process start
 * events, message flows between pools, attached boundary events and
 * unreachable nodes.
 */
export const OGE_BPMN_DEFAULT_LINT_RULES: readonly OgeBpmnLintRule[] = [
  startEventRequired,
  endEventRequired,
  noDisconnected,
  superfluousGateway,
  conditionalFlows,
  noImplicitSplit,
  noImplicitJoin,
  labelRequired,
  noDuplicateIds,
  subProcessStartEvent,
  messageFlowPools,
  boundaryEventAttached,
  noUnreachable,
];

function isRule(
  entry: OgeBpmnLintRule | OgeBpmnLintRuleOverride,
): entry is OgeBpmnLintRule {
  return typeof (entry as Partial<OgeBpmnLintRule>).check === 'function';
}

/**
 * Resolves the effective rule list: the defaults, with input rules added
 * (or replacing a default of the same id) and overrides applied —
 * `severity: 'off'` removes a rule.
 */
export function resolveBpmnLintRules(
  input: OgeBpmnLintRulesInput | undefined,
  defaults: readonly OgeBpmnLintRule[] = OGE_BPMN_DEFAULT_LINT_RULES,
): readonly OgeBpmnLintRule[] {
  if (input === undefined || input.length === 0) return defaults;
  const rules = new Map<string, OgeBpmnLintRule>();
  for (const rule of defaults) rules.set(rule.id, rule);
  for (const entry of input) {
    if (isRule(entry)) {
      rules.set(entry.id, entry);
      continue;
    }
    if (entry.severity === 'off') {
      rules.delete(entry.id);
      continue;
    }
    const base = rules.get(entry.id);
    if (base !== undefined) {
      rules.set(entry.id, {
        id: base.id,
        severity: entry.severity,
        check: (model, context) => base.check(model, context),
      });
    }
  }
  return [...rules.values()];
}

const SEVERITY_RANK: Readonly<Record<OgeBpmnLintSeverity, number>> = {
  error: 0,
  warning: 1,
  info: 2,
};

/** The fallback display name of an element (name, then its type's name). */
function bpmnDisplayName(
  model: BpmnDiagram,
  names: OgeBpmnMessages['elementNames'] | undefined,
  id: string,
): string {
  const node = model.nodes[id];
  if (node !== undefined) {
    const named = node.type === 'textAnnotation' ? undefined : node.name;
    return named !== undefined && named.trim() !== ''
      ? named
      : (names?.[node.type] ?? id);
  }
  const pool = model.pools[id];
  if (pool !== undefined) return pool.name ?? names?.pool ?? id;
  const edge = model.edges[id];
  if (edge !== undefined) {
    const named =
      edge.type === 'sequenceFlow' || edge.type === 'messageFlow'
        ? edge.name
        : undefined;
    return named !== undefined && named.trim() !== ''
      ? named
      : (names?.[edge.type] ?? id);
  }
  return id === model.processId ? (model.processName ?? id) : id;
}

/**
 * Runs the rules over a diagram and returns every issue, ordered by severity
 * (errors first), then rule order. A rule that throws is skipped (a broken
 * custom rule never takes the editor down).
 */
export function lintBpmnDiagram(
  model: BpmnDiagram,
  rules: readonly OgeBpmnLintRule[] = OGE_BPMN_DEFAULT_LINT_RULES,
  messages: {
    readonly lint?: OgeBpmnLintMessages;
    readonly elementNames?: OgeBpmnMessages['elementNames'];
  } = {},
): readonly OgeBpmnLintIssue[] {
  const lintMessages = messages.lint ?? OGE_DEFAULT_BPMN_LINT_MESSAGES;
  const context: OgeBpmnLintContext = {
    messages: lintMessages,
    displayName: (id) => bpmnDisplayName(model, messages.elementNames, id),
  };
  const issues: OgeBpmnLintIssue[] = [];
  rules.forEach((rule) => {
    let reports: readonly OgeBpmnLintReport[];
    try {
      reports = rule.check(model, context);
    } catch {
      return;
    }
    reports.forEach((r, index) =>
      issues.push({
        key: `${rule.id}:${r.elementId}:${index}`,
        ruleId: rule.id,
        severity: rule.severity,
        elementId: r.elementId,
        message: r.message,
      }),
    );
  });
  return issues
    .map((issue, index) => ({ issue, index }))
    .sort(
      (a, b) =>
        SEVERITY_RANK[a.issue.severity] - SEVERITY_RANK[b.issue.severity] ||
        a.index - b.index,
    )
    .map((entry) => entry.issue);
}

/** Per-severity counts of an issue list (the `lintChanged` payload). */
export function bpmnLintSummary(
  issues: readonly OgeBpmnLintIssue[],
): OgeBpmnLintChangedEvent {
  let errors = 0;
  let warnings = 0;
  let infos = 0;
  for (const issue of issues) {
    if (issue.severity === 'error') errors++;
    else if (issue.severity === 'warning') warnings++;
    else infos++;
  }
  return { issues, errors, warnings, infos };
}

/** The highest severity among the issues of one element, or null. */
export function bpmnWorstSeverity(
  issues: readonly OgeBpmnLintIssue[],
): OgeBpmnLintSeverity | null {
  let worst: OgeBpmnLintSeverity | null = null;
  for (const issue of issues) {
    if (
      worst === null ||
      SEVERITY_RANK[issue.severity] < SEVERITY_RANK[worst]
    ) {
      worst = issue.severity;
    }
  }
  return worst;
}
