/**
 * G5b commands: documentation, extension elements, vendor attributes, event
 * definition payloads and the definitions-level root elements (messages,
 * signals, errors, escalations). Every function returns an undoable
 * {@link BpmnCommand}; unchanged values are no-ops returning the same model.
 */
import type {
  BpmnDiagram,
  BpmnEventDetails,
  BpmnNode,
  BpmnRootElement,
  BpmnRootElementType,
  BpmnTimerKind,
} from './bpmn-model';
import { generateBpmnId, isBpmnEventType, takenIds } from './bpmn-model';
import type { BpmnXmlElement } from './bpmn-xml-element';
import type { BpmnCommand } from './command-stack';

/** Id the process-level commands use for the default process itself. */
export const BPMN_PROCESS_TARGET = '\u0000process';

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Replaces one optional key of a record (removing it for `undefined`). */
function withKey<T extends object, K extends string>(
  value: T,
  key: K,
  next: unknown,
): T {
  const { [key]: _previous, ...rest } = value as Record<string, unknown>;
  return (next === undefined ? rest : { ...rest, [key]: next }) as T;
}

/**
 * Applies `patch` to the node, edge or pool with the given id (or the default
 * process for {@link BPMN_PROCESS_TARGET}); the patcher returns the element
 * unchanged to signal a no-op.
 */
function patchElement(
  model: BpmnDiagram,
  id: string,
  patch: <T extends object>(element: T, kind: string) => T,
): BpmnDiagram {
  if (id === BPMN_PROCESS_TARGET) {
    const next = patch(model, 'process');
    return next;
  }
  const node = model.nodes[id];
  if (node !== undefined) {
    const next = patch(node, 'node');
    return next === node
      ? model
      : { ...model, nodes: { ...model.nodes, [id]: next } };
  }
  const edge = model.edges[id];
  if (edge !== undefined) {
    const next = patch(edge, 'edge');
    return next === edge
      ? model
      : { ...model, edges: { ...model.edges, [id]: next } };
  }
  const pool = model.pools[id];
  if (pool !== undefined) {
    const next = patch(pool, 'pool');
    return next === pool
      ? model
      : { ...model, pools: { ...model.pools, [id]: next } };
  }
  return model;
}

/**
 * Sets or clears (`''`) the `<bpmn:documentation>` of any element — node,
 * edge, pool — or of the default process ({@link BPMN_PROCESS_TARGET}).
 */
export function setDocumentationCommand(id: string, text: string): BpmnCommand {
  return {
    label: 'Edit documentation',
    apply(model: BpmnDiagram): BpmnDiagram {
      const next = text === '' ? undefined : text;
      return patchElement(model, id, (element, kind) => {
        const key =
          kind === 'process' ? 'processDocumentation' : 'documentation';
        const current = (element as Record<string, unknown>)[key];
        return current === next ? element : withKey(element, key, next);
      });
    },
  };
}

/**
 * Replaces the `<bpmn:extensionElements>` tree of a flow node, a sequence
 * flow or the default process. An empty list removes the element. Use
 * {@link declareBpmnNamespace} (or the Camunda helpers, which do it) so the
 * prefixes the tree uses are declared on `<definitions>`.
 */
export function setExtensionElementsCommand(
  id: string,
  elements: readonly BpmnXmlElement[],
  namespaces: Readonly<Record<string, string>> = {},
): BpmnCommand {
  return {
    label: 'Edit extension elements',
    apply(model: BpmnDiagram): BpmnDiagram {
      const next = elements.length === 0 ? undefined : elements;
      const node = model.nodes[id];
      if (node !== undefined && node.type === 'textAnnotation') {
        return model;
      }
      const edge = model.edges[id];
      if (edge !== undefined && edge.type !== 'sequenceFlow') {
        return model;
      }
      if (model.pools[id] !== undefined) {
        return model;
      }
      const patched = patchElement(model, id, (element, kind) => {
        const key =
          kind === 'process' ? 'processExtensionElements' : 'extensionElements';
        const current = (element as Record<string, unknown>)[key];
        return sameJson(current, next) ? element : withKey(element, key, next);
      });
      return patched === model ? model : withNamespaces(patched, namespaces);
    },
  };
}

/**
 * Sets (or removes, for `undefined` / `''`) one vendor attribute by qualified
 * name (`camunda:assignee`) on a node, edge, pool or the default process,
 * declaring `namespaces` on `<definitions>` when given.
 */
export function setForeignAttributeCommand(
  id: string,
  name: string,
  value: string | undefined,
  namespaces: Readonly<Record<string, string>> = {},
): BpmnCommand {
  return {
    label: 'Edit attribute',
    apply(model: BpmnDiagram): BpmnDiagram {
      const next = value === '' ? undefined : value;
      const patched = patchElement(model, id, (element, kind) => {
        const key =
          kind === 'process' ? 'processForeignAttributes' : 'foreignAttributes';
        const attrs =
          ((element as Record<string, unknown>)[key] as
            Readonly<Record<string, string>> | undefined) ?? {};
        if (attrs[name] === next) return element;
        const updated = withKey(attrs, name, next);
        return withKey(
          element,
          key,
          Object.keys(updated).length > 0 ? updated : undefined,
        );
      });
      return patched === model || next === undefined
        ? patched
        : withNamespaces(patched, namespaces);
    },
  };
}

/** Declares `xmlns:<prefix>` on `<definitions>` when not declared yet. */
export function declareBpmnNamespace(
  model: BpmnDiagram,
  prefix: string,
  uri: string,
): BpmnDiagram {
  const key = `xmlns:${prefix}`;
  if (model.definitionsAttrs[key] !== undefined) return model;
  return {
    ...model,
    definitionsAttrs: { ...model.definitionsAttrs, [key]: uri },
  };
}

function withNamespaces(
  model: BpmnDiagram,
  namespaces: Readonly<Record<string, string>>,
): BpmnDiagram {
  let next = model;
  for (const [prefix, uri] of Object.entries(namespaces)) {
    next = declareBpmnNamespace(next, prefix, uri);
  }
  return next;
}

/** A patch of an event definition's payload; `null` clears a field. */
export interface BpmnEventDetailsPatch {
  readonly timer?: {
    readonly kind: BpmnTimerKind;
    readonly expression: string;
  } | null;
  readonly ref?: string | null;
  readonly condition?: string | null;
  readonly linkName?: string | null;
}

/**
 * Edits the payload of an event's event definition (timer expression,
 * root-element reference, condition, link name). Fields that do not apply to
 * the event's current definition kind are ignored; events without a
 * definition are no-ops.
 */
export function setEventDetailsCommand(
  id: string,
  patch: BpmnEventDetailsPatch,
): BpmnCommand {
  return {
    label: 'Edit event definition',
    apply(model: BpmnDiagram): BpmnDiagram {
      const node = model.nodes[id];
      if (
        node === undefined ||
        node.type === 'textAnnotation' ||
        !isBpmnEventType(node.type) ||
        node.eventDefinition === undefined
      ) {
        return model;
      }
      const kind = node.eventDefinition;
      let details: BpmnEventDetails = node.eventDetails ?? {};
      if (patch.timer !== undefined && kind === 'timer') {
        details = withKey(details, 'timer', patch.timer ?? undefined);
      }
      if (
        patch.ref !== undefined &&
        (kind === 'message' ||
          kind === 'signal' ||
          kind === 'error' ||
          kind === 'escalation')
      ) {
        details = withKey(
          details,
          'ref',
          patch.ref === null || patch.ref === '' ? undefined : patch.ref,
        );
      }
      if (patch.condition !== undefined && kind === 'conditional') {
        details = withKey(details, 'condition', patch.condition ?? undefined);
      }
      if (patch.linkName !== undefined && kind === 'link') {
        details = withKey(
          details,
          'linkName',
          patch.linkName === null || patch.linkName === ''
            ? undefined
            : patch.linkName,
        );
      }
      const next = Object.keys(details).length > 0 ? details : undefined;
      if (sameJson(next, node.eventDetails)) return model;
      const updated = withKey(node, 'eventDetails', next) as BpmnNode;
      return { ...model, nodes: { ...model.nodes, [id]: updated } };
    },
  };
}

/** The root elements of one type, in document order. */
export function bpmnRootElements(
  model: BpmnDiagram,
  type: BpmnRootElementType,
): readonly BpmnRootElement[] {
  return (model.rootElements ?? []).filter((root) => root.type === type);
}

const ROOT_PREFIX: Readonly<Record<BpmnRootElementType, string>> = {
  message: 'Message',
  signal: 'Signal',
  error: 'Error',
  escalation: 'Escalation',
};

/** Generates a free id for a new root element of the given type. */
export function newBpmnRootElementId(
  model: BpmnDiagram,
  type: BpmnRootElementType,
): string {
  const taken = new Set(takenIds(model));
  for (const root of model.rootElements ?? []) taken.add(root.id);
  return generateBpmnId(ROOT_PREFIX[type], taken);
}

/**
 * Adds a message / signal / error / escalation to `<definitions>`; with
 * `refFrom` the event definition of that event references it in the same
 * undoable step (the panel's "New message" option).
 */
export function addRootElementCommand(
  root: Omit<BpmnRootElement, 'id'> & { readonly id?: string },
  refFrom?: string,
): BpmnCommand {
  return {
    label: 'Add root element',
    apply(model: BpmnDiagram): BpmnDiagram {
      const id = root.id ?? newBpmnRootElementId(model, root.type);
      if ((model.rootElements ?? []).some((r) => r.id === id)) return model;
      const added: BpmnDiagram = {
        ...model,
        rootElements: [...(model.rootElements ?? []), { ...root, id }],
      };
      return refFrom === undefined
        ? added
        : setEventDetailsCommand(refFrom, { ref: id }).apply(added);
    },
  };
}

/** Renames a root element or changes its error / escalation code (`''` clears). */
export function updateRootElementCommand(
  id: string,
  patch: { readonly name?: string; readonly code?: string },
): BpmnCommand {
  return {
    label: 'Edit root element',
    apply(model: BpmnDiagram): BpmnDiagram {
      const list = model.rootElements ?? [];
      const index = list.findIndex((root) => root.id === id);
      if (index === -1) return model;
      let root = list[index];
      if (patch.name !== undefined) {
        root = withKey(
          root,
          'name',
          patch.name === '' ? undefined : patch.name,
        );
      }
      if (patch.code !== undefined) {
        root = withKey(
          root,
          'code',
          patch.code === '' ? undefined : patch.code,
        );
      }
      if (root === list[index] || sameJson(root, list[index])) return model;
      const rootElements = [...list];
      rootElements[index] = root;
      return { ...model, rootElements };
    },
  };
}
