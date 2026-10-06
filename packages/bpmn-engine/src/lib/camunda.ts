/**
 * Camunda 7 (`camunda:*`) and Camunda 8 / Zeebe (`zeebe:*`) properties
 * (G5b). Extension elements were always preserved verbatim; these helpers
 * read and write the common ones as typed values over the model's editable
 * extension tree, and {@link OGE_BPMN_CAMUNDA_PROVIDERS} (the opt-in
 * `camundaProviders` preset) puts them into the properties panel. The same
 * bindings drive element templates.
 */
import type { BpmnDiagram, BpmnNode } from './bpmn-model';
import { isBpmnActivityType, isBpmnEventType } from './bpmn-model';
import type { BpmnXmlElement } from './bpmn-xml-element';
import {
  BPMN_CAMUNDA_NAMESPACE,
  BPMN_ZEEBE_NAMESPACE,
  bpmnXmlChildren,
  bpmnXmlFind,
  bpmnXmlReplace,
  bpmnXmlWithAttribute,
} from './bpmn-xml-element';
import type { BpmnCommand } from './command-stack';
import { setCalledElementCommand, updateLabelCommand } from './commands';
import {
  setDocumentationCommand,
  setExtensionElementsCommand,
  setForeignAttributeCommand,
} from './commands-extensions';
import type {
  OgeBpmnListRow,
  OgeBpmnPropertiesEntry,
  OgeBpmnPropertiesGroup,
  OgeBpmnPropertiesProvider,
} from './properties-providers';

/** Namespace declarations the Zeebe helpers add to `<definitions>`. */
const ZEEBE_NS = { zeebe: BPMN_ZEEBE_NAMESPACE } as const;
/** Namespace declarations the Camunda 7 helpers add to `<definitions>`. */
const CAMUNDA_NS = { camunda: BPMN_CAMUNDA_NAMESPACE } as const;

/**
 * Where a value lives — the binding vocabulary of Camunda element templates,
 * shared by the Camunda providers and {@link OgeBpmnElementTemplate}.
 */
export type OgeBpmnPropertyBinding =
  /** `name`, `calledElement`, or a qualified vendor attribute (`camunda:assignee`). */
  | { readonly type: 'property'; readonly name: string }
  /** The element's `<bpmn:documentation>`. */
  | { readonly type: 'documentation' }
  /** `<zeebe:taskDefinition type|retries>`. */
  | {
      readonly type: 'zeebe:taskDefinition';
      readonly property: 'type' | 'retries';
    }
  /** `<zeebe:input target="name" source="value">`. */
  | { readonly type: 'zeebe:input'; readonly name: string }
  /** `<zeebe:output source="source" target="value">`. */
  | { readonly type: 'zeebe:output'; readonly source: string }
  /** `<zeebe:header key="key" value="value">`. */
  | { readonly type: 'zeebe:taskHeader'; readonly key: string }
  /** `<camunda:inputParameter name="name">value</camunda:inputParameter>`. */
  | { readonly type: 'camunda:inputParameter'; readonly name: string }
  /** `<camunda:outputParameter name="value">source</camunda:outputParameter>`. */
  | { readonly type: 'camunda:outputParameter'; readonly source: string };

/** The editable extension tree of a flow node or sequence flow. */
function extensionsOf(
  model: BpmnDiagram,
  id: string,
): readonly BpmnXmlElement[] {
  const node = model.nodes[id];
  if (node !== undefined && node.type !== 'textAnnotation') {
    return node.extensionElements ?? [];
  }
  const edge = model.edges[id];
  return edge?.type === 'sequenceFlow' ? (edge.extensionElements ?? []) : [];
}

function attr(
  element: BpmnXmlElement | undefined,
  name: string,
): string | undefined {
  return element?.attributes?.[name];
}

/** A command that rewrites one top-level extension element (null removes it). */
function updateExtension(
  id: string,
  name: string,
  namespaces: Readonly<Record<string, string>>,
  update: (current: BpmnXmlElement | undefined) => BpmnXmlElement | null,
  label: string,
): BpmnCommand {
  return {
    label,
    apply(model: BpmnDiagram): BpmnDiagram {
      const list = extensionsOf(model, id);
      const next = update(bpmnXmlFind(list, name));
      return setExtensionElementsCommand(
        id,
        bpmnXmlReplace(list, name, next),
        namespaces,
      ).apply(model);
    },
  };
}

/** Replaces the children of `parent` named `childName` with `children` (null when empty). */
function withChildList(
  parent: BpmnXmlElement | undefined,
  name: string,
  childNames: readonly string[],
  children: readonly BpmnXmlElement[],
): BpmnXmlElement | null {
  const kept = (parent?.children ?? []).filter(
    (child) => !childNames.includes(child.name),
  );
  const all = [...children, ...kept];
  if (all.length === 0 && Object.keys(parent?.attributes ?? {}).length === 0) {
    return null;
  }
  return {
    name,
    ...(parent?.attributes !== undefined
      ? { attributes: parent.attributes }
      : {}),
    ...(all.length > 0 ? { children: all } : {}),
  };
}

// ---------------------------------------------------------------- Zeebe

/** `zeebe:taskDefinition` of an element: job type and retries. */
export function bpmnZeebeTaskDefinition(
  model: BpmnDiagram,
  id: string,
): { readonly type: string; readonly retries: string } {
  const element = bpmnXmlFind(extensionsOf(model, id), 'zeebe:taskDefinition');
  return {
    type: attr(element, 'type') ?? '',
    retries: attr(element, 'retries') ?? '',
  };
}

/** Sets `zeebe:taskDefinition type` / `retries` (`''` removes the attribute). */
export function setZeebeTaskDefinitionCommand(
  id: string,
  patch: { readonly type?: string; readonly retries?: string },
): BpmnCommand {
  return updateExtension(
    id,
    'zeebe:taskDefinition',
    ZEEBE_NS,
    (current) => {
      let element: BpmnXmlElement = current ?? { name: 'zeebe:taskDefinition' };
      for (const key of ['type', 'retries'] as const) {
        const value = patch[key];
        if (value !== undefined) {
          element = bpmnXmlWithAttribute(
            element,
            key,
            value === '' ? undefined : value,
          );
        }
      }
      return Object.keys(element.attributes ?? {}).length === 0 &&
        (element.children ?? []).length === 0
        ? null
        : element;
    },
    'Edit task definition',
  );
}

/** One `zeebe:input` / `zeebe:output` mapping. */
export interface BpmnZeebeMapping {
  readonly source: string;
  readonly target: string;
}

/** The `zeebe:ioMapping` inputs and outputs of an element. */
export function bpmnZeebeIoMapping(
  model: BpmnDiagram,
  id: string,
): {
  readonly inputs: readonly BpmnZeebeMapping[];
  readonly outputs: readonly BpmnZeebeMapping[];
} {
  const mapping = bpmnXmlFind(extensionsOf(model, id), 'zeebe:ioMapping');
  const read = (name: string) =>
    bpmnXmlChildren(mapping, name).map((child) => ({
      source: attr(child, 'source') ?? '',
      target: attr(child, 'target') ?? '',
    }));
  return { inputs: read('zeebe:input'), outputs: read('zeebe:output') };
}

/** Replaces the inputs and/or outputs of `zeebe:ioMapping` (an empty mapping is removed). */
export function setZeebeIoMappingCommand(
  id: string,
  patch: {
    readonly inputs?: readonly BpmnZeebeMapping[];
    readonly outputs?: readonly BpmnZeebeMapping[];
  },
): BpmnCommand {
  return updateExtension(
    id,
    'zeebe:ioMapping',
    ZEEBE_NS,
    (current) => {
      const toElements = (name: string, rows: readonly BpmnZeebeMapping[]) =>
        rows.map((row) => ({
          name,
          attributes: { source: row.source, target: row.target },
        }));
      const inputs =
        patch.inputs !== undefined
          ? toElements('zeebe:input', patch.inputs)
          : bpmnXmlChildren(current, 'zeebe:input');
      const outputs =
        patch.outputs !== undefined
          ? toElements('zeebe:output', patch.outputs)
          : bpmnXmlChildren(current, 'zeebe:output');
      return withChildList(
        current,
        'zeebe:ioMapping',
        ['zeebe:input', 'zeebe:output'],
        [...inputs, ...outputs],
      );
    },
    'Edit input/output mapping',
  );
}

/** One `zeebe:header`. */
export interface BpmnZeebeHeader {
  readonly key: string;
  readonly value: string;
}

/** The `zeebe:taskHeaders` of an element. */
export function bpmnZeebeTaskHeaders(
  model: BpmnDiagram,
  id: string,
): readonly BpmnZeebeHeader[] {
  const headers = bpmnXmlFind(extensionsOf(model, id), 'zeebe:taskHeaders');
  return bpmnXmlChildren(headers, 'zeebe:header').map((child) => ({
    key: attr(child, 'key') ?? '',
    value: attr(child, 'value') ?? '',
  }));
}

/** Replaces the `zeebe:taskHeaders` (an empty list removes the element). */
export function setZeebeTaskHeadersCommand(
  id: string,
  headers: readonly BpmnZeebeHeader[],
): BpmnCommand {
  return updateExtension(
    id,
    'zeebe:taskHeaders',
    ZEEBE_NS,
    (current) =>
      withChildList(
        current,
        'zeebe:taskHeaders',
        ['zeebe:header'],
        headers.map((header) => ({
          name: 'zeebe:header',
          attributes: { key: header.key, value: header.value },
        })),
      ),
    'Edit task headers',
  );
}

// -------------------------------------------------------------- Camunda 7

/** One text `camunda:inputParameter` / `camunda:outputParameter`. */
export interface BpmnCamundaParameter {
  readonly name: string;
  readonly value: string;
}

const isTextParameter = (element: BpmnXmlElement): boolean =>
  (element.children ?? []).length === 0;

/**
 * The text parameters of `camunda:inputOutput`. Parameters holding a
 * `camunda:list` / `camunda:map` / `camunda:script` are not listed — and are
 * kept untouched by {@link setCamundaInputOutputCommand}.
 */
export function bpmnCamundaInputOutput(
  model: BpmnDiagram,
  id: string,
): {
  readonly inputs: readonly BpmnCamundaParameter[];
  readonly outputs: readonly BpmnCamundaParameter[];
} {
  const io = bpmnXmlFind(extensionsOf(model, id), 'camunda:inputOutput');
  const read = (name: string) =>
    bpmnXmlChildren(io, name)
      .filter(isTextParameter)
      .map((child) => ({
        name: attr(child, 'name') ?? '',
        value: child.text ?? '',
      }));
  return {
    inputs: read('camunda:inputParameter'),
    outputs: read('camunda:outputParameter'),
  };
}

/**
 * Replaces the text parameters of `camunda:inputOutput` (complex ones are
 * kept). Rows are written as given — an empty row the panel just added stays
 * until it is filled or removed.
 */
export function setCamundaInputOutputCommand(
  id: string,
  patch: {
    readonly inputs?: readonly BpmnCamundaParameter[];
    readonly outputs?: readonly BpmnCamundaParameter[];
  },
): BpmnCommand {
  return updateExtension(
    id,
    'camunda:inputOutput',
    CAMUNDA_NS,
    (current) => {
      const rebuild = (
        name: string,
        rows: readonly BpmnCamundaParameter[] | undefined,
      ): BpmnXmlElement[] => {
        const existing = bpmnXmlChildren(current, name);
        if (rows === undefined) return [...existing];
        const complex = existing.filter((child) => !isTextParameter(child));
        const text = rows.map((row) => ({
          name,
          attributes: { name: row.name },
          ...(row.value !== '' ? { text: row.value } : {}),
        }));
        return [...text, ...complex];
      };
      return withChildList(
        current,
        'camunda:inputOutput',
        ['camunda:inputParameter', 'camunda:outputParameter'],
        [
          ...rebuild('camunda:inputParameter', patch.inputs),
          ...rebuild('camunda:outputParameter', patch.outputs),
        ],
      );
    },
    'Edit input/output parameters',
  );
}

/** A vendor attribute of a node (`camunda:assignee`), or `''`. */
export function bpmnForeignAttribute(
  model: BpmnDiagram,
  id: string,
  name: string,
): string {
  return (
    model.nodes[id]?.foreignAttributes?.[name] ??
    model.edges[id]?.foreignAttributes?.[name] ??
    model.pools[id]?.foreignAttributes?.[name] ??
    ''
  );
}

/** Sets a `camunda:*` attribute, declaring the Camunda namespace when needed. */
export function setCamundaAttributeCommand(
  id: string,
  name: 'assignee' | 'candidateGroups' | 'formKey' | (string & {}),
  value: string,
): BpmnCommand {
  return setForeignAttributeCommand(
    id,
    name.includes(':') ? name : `camunda:${name}`,
    value,
    CAMUNDA_NS,
  );
}

// ------------------------------------------------------------- bindings

/** Reads the value a binding points at (undefined when it is not set). */
export function bpmnBindingValue(
  model: BpmnDiagram,
  id: string,
  binding: OgeBpmnPropertyBinding,
): string | undefined {
  const node = model.nodes[id];
  switch (binding.type) {
    case 'property': {
      if (binding.name === 'name') {
        return node?.type === 'textAnnotation' ? node.text : node?.name;
      }
      if (binding.name === 'calledElement') {
        return node?.type !== 'textAnnotation'
          ? node?.calledElement
          : undefined;
      }
      const value = bpmnForeignAttribute(model, id, binding.name);
      return value === '' ? undefined : value;
    }
    case 'documentation':
      return node?.documentation;
    case 'zeebe:taskDefinition': {
      const value = bpmnZeebeTaskDefinition(model, id)[binding.property];
      return value === '' ? undefined : value;
    }
    case 'zeebe:input':
      return bpmnZeebeIoMapping(model, id).inputs.find(
        (row) => row.target === binding.name,
      )?.source;
    case 'zeebe:output':
      return bpmnZeebeIoMapping(model, id).outputs.find(
        (row) => row.source === binding.source,
      )?.target;
    case 'zeebe:taskHeader':
      return bpmnZeebeTaskHeaders(model, id).find(
        (row) => row.key === binding.key,
      )?.value;
    case 'camunda:inputParameter':
      return bpmnCamundaInputOutput(model, id).inputs.find(
        (row) => row.name === binding.name,
      )?.value;
    case 'camunda:outputParameter':
      return bpmnCamundaInputOutput(model, id).outputs.find(
        (row) => row.value === binding.source,
      )?.name;
  }
}

/** Writes a value through a binding (`''` clears it). */
export function setBpmnBindingCommand(
  id: string,
  binding: OgeBpmnPropertyBinding,
  value: string,
): BpmnCommand {
  switch (binding.type) {
    case 'property':
      if (binding.name === 'name') return updateLabelCommand(id, value);
      if (binding.name === 'calledElement') {
        return setCalledElementCommand(id, value === '' ? undefined : value);
      }
      return setForeignAttributeCommand(
        id,
        binding.name,
        value,
        namespaceFor(binding.name),
      );
    case 'documentation':
      return setDocumentationCommand(id, value);
    case 'zeebe:taskDefinition':
      return setZeebeTaskDefinitionCommand(id, { [binding.property]: value });
  }
  return {
    label: 'Edit template property',
    apply(model: BpmnDiagram): BpmnDiagram {
      switch (binding.type) {
        case 'zeebe:input': {
          const inputs = bpmnZeebeIoMapping(model, id).inputs.filter(
            (row) => row.target !== binding.name,
          );
          return setZeebeIoMappingCommand(id, {
            inputs:
              value === ''
                ? inputs
                : [...inputs, { source: value, target: binding.name }],
          }).apply(model);
        }
        case 'zeebe:output': {
          const outputs = bpmnZeebeIoMapping(model, id).outputs.filter(
            (row) => row.source !== binding.source,
          );
          return setZeebeIoMappingCommand(id, {
            outputs:
              value === ''
                ? outputs
                : [...outputs, { source: binding.source, target: value }],
          }).apply(model);
        }
        case 'zeebe:taskHeader': {
          const headers = bpmnZeebeTaskHeaders(model, id).filter(
            (row) => row.key !== binding.key,
          );
          return setZeebeTaskHeadersCommand(
            id,
            value === '' ? headers : [...headers, { key: binding.key, value }],
          ).apply(model);
        }
        case 'camunda:inputParameter': {
          const inputs = bpmnCamundaInputOutput(model, id).inputs.filter(
            (row) => row.name !== binding.name,
          );
          return setCamundaInputOutputCommand(id, {
            inputs:
              value === ''
                ? inputs
                : [...inputs, { name: binding.name, value }],
          }).apply(model);
        }
        case 'camunda:outputParameter': {
          const outputs = bpmnCamundaInputOutput(model, id).outputs.filter(
            (row) => row.value !== binding.source,
          );
          return setCamundaInputOutputCommand(id, {
            outputs:
              value === ''
                ? outputs
                : [...outputs, { name: value, value: binding.source }],
          }).apply(model);
        }
        default:
          return model;
      }
    },
  };
}

/** The namespace a qualified attribute name needs declared (Camunda / Zeebe only). */
function namespaceFor(name: string): Readonly<Record<string, string>> {
  if (name.startsWith('camunda:')) return CAMUNDA_NS;
  if (name.startsWith('zeebe:')) return ZEEBE_NS;
  return {};
}

// -------------------------------------------------------------- providers

const rowsOf = (rows: readonly object[]): readonly OgeBpmnListRow[] =>
  rows as unknown as readonly OgeBpmnListRow[];

const isServiceLike = (node: BpmnNode): boolean =>
  node.type === 'serviceTask' || node.type === 'scriptTask';

const supportsIo = (node: BpmnNode): boolean =>
  node.type !== 'textAnnotation' &&
  (isBpmnActivityType(node.type) ||
    (isBpmnEventType(node.type) && node.type !== 'startEvent'));

/**
 * Camunda 8 (Zeebe) fields: the task definition (job type, retries) and task
 * headers of service / script tasks, and the input / output mappings of
 * activities and non-start events.
 */
export const OGE_BPMN_ZEEBE_PROVIDER: OgeBpmnPropertiesProvider = {
  id: 'oge-zeebe',
  getGroups({ diagram, target, messages }) {
    if (target.kind !== 'node') return [];
    const node = target.node;
    const c = messages.camunda;
    const groups: OgeBpmnPropertiesGroup[] = [];
    if (isServiceLike(node)) {
      const definition = bpmnZeebeTaskDefinition(diagram, node.id);
      groups.push({
        id: 'zeebe-task-definition',
        label: c.taskDefinitionHeading,
        entries: [
          {
            id: 'zeebe-job-type',
            label: c.jobType,
            type: 'expression',
            value: definition.type,
            set: (value) =>
              setZeebeTaskDefinitionCommand(node.id, { type: String(value) }),
          },
          {
            id: 'zeebe-retries',
            label: c.retries,
            type: 'text',
            value: definition.retries,
            placeholder: '3',
            set: (value) =>
              setZeebeTaskDefinitionCommand(node.id, {
                retries: String(value),
              }),
          },
        ],
      });
    }
    if (supportsIo(node)) {
      const io = bpmnZeebeIoMapping(diagram, node.id);
      const columns = [
        { key: 'source', label: c.mappingSource },
        { key: 'target', label: c.mappingTarget },
      ];
      const list = (
        id: string,
        label: string,
        rows: readonly BpmnZeebeMapping[],
        key: 'inputs' | 'outputs',
      ): OgeBpmnPropertiesEntry => ({
        id,
        label,
        type: 'list',
        value: rowsOf(rows),
        columns,
        set: (value) =>
          setZeebeIoMappingCommand(node.id, {
            [key]: (value as readonly OgeBpmnListRow[]).map((row) => ({
              source: row['source'] ?? '',
              target: row['target'] ?? '',
            })),
          }),
      });
      groups.push({
        id: 'zeebe-io-mapping',
        label: `${c.inputsHeading} / ${c.outputsHeading}`,
        entries: [
          list('zeebe-inputs', c.inputsHeading, io.inputs, 'inputs'),
          list('zeebe-outputs', c.outputsHeading, io.outputs, 'outputs'),
        ],
      });
    }
    if (isServiceLike(node)) {
      groups.push({
        id: 'zeebe-task-headers',
        label: c.headersHeading,
        entries: [
          {
            id: 'zeebe-headers',
            label: c.headersHeading,
            type: 'list',
            value: rowsOf(bpmnZeebeTaskHeaders(diagram, node.id)),
            columns: [
              { key: 'key', label: c.headerKey },
              { key: 'value', label: c.headerValue },
            ],
            set: (value) =>
              setZeebeTaskHeadersCommand(
                node.id,
                (value as readonly OgeBpmnListRow[]).map((row) => ({
                  key: row['key'] ?? '',
                  value: row['value'] ?? '',
                })),
              ),
          },
        ],
      });
    }
    return groups;
  },
};

/**
 * Camunda 7 fields: user-task assignment (`camunda:assignee`,
 * `camunda:candidateGroups`, `camunda:formKey`) and the text parameters of
 * `camunda:inputOutput` on activities.
 */
export const OGE_BPMN_CAMUNDA7_PROVIDER: OgeBpmnPropertiesProvider = {
  id: 'oge-camunda7',
  getGroups({ diagram, target, messages }) {
    if (target.kind !== 'node') return [];
    const node = target.node;
    const c = messages.camunda;
    const groups: OgeBpmnPropertiesGroup[] = [];
    if (node.type === 'userTask') {
      const field = (
        id: string,
        label: string,
        name: 'assignee' | 'candidateGroups' | 'formKey',
      ): OgeBpmnPropertiesEntry => ({
        id,
        label,
        type: 'text',
        value: bpmnForeignAttribute(diagram, node.id, `camunda:${name}`),
        set: (value) =>
          setCamundaAttributeCommand(node.id, name, String(value)),
      });
      groups.push({
        id: 'camunda-assignment',
        label: c.assignmentHeading,
        entries: [
          field('camunda-assignee', c.assignee, 'assignee'),
          field(
            'camunda-candidate-groups',
            c.candidateGroups,
            'candidateGroups',
          ),
          field('camunda-form-key', c.formKey, 'formKey'),
        ],
      });
    }
    if (node.type !== 'textAnnotation' && isBpmnActivityType(node.type)) {
      const io = bpmnCamundaInputOutput(diagram, node.id);
      const columns = [
        { key: 'name', label: c.parameterName },
        { key: 'value', label: c.parameterValue },
      ];
      const list = (
        id: string,
        label: string,
        rows: readonly BpmnCamundaParameter[],
        key: 'inputs' | 'outputs',
      ): OgeBpmnPropertiesEntry => ({
        id,
        label,
        type: 'list',
        value: rowsOf(rows),
        columns,
        set: (value) =>
          setCamundaInputOutputCommand(node.id, {
            [key]: (value as readonly OgeBpmnListRow[]).map((row) => ({
              name: row['name'] ?? '',
              value: row['value'] ?? '',
            })),
          }),
      });
      groups.push({
        id: 'camunda-input-output',
        label: `${c.inputParameters} / ${c.outputParameters}`,
        entries: [
          list('camunda-inputs', c.inputParameters, io.inputs, 'inputs'),
          list('camunda-outputs', c.outputParameters, io.outputs, 'outputs'),
        ],
      });
    }
    return groups;
  },
};

/**
 * The opt-in `camundaProviders` preset: Zeebe (Camunda 8) and Camunda 7
 * fields. Pass it (or one of its two members) to `propertiesProviders`.
 */
export const OGE_BPMN_CAMUNDA_PROVIDERS: readonly OgeBpmnPropertiesProvider[] =
  [OGE_BPMN_ZEEBE_PROVIDER, OGE_BPMN_CAMUNDA7_PROVIDER];
