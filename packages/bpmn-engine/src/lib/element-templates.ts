/**
 * Element templates (G5b) — a JSON shape modeled on Camunda Modeler element
 * templates: a template names the element types it applies to and a list of
 * properties, each bound to an attribute, the documentation or a Camunda /
 * Zeebe extension value ({@link OgeBpmnPropertyBinding}). Applying a template
 * writes every property's default value in one undoable step and records the
 * template id on the element (`zeebe:modelerTemplate` when a Zeebe binding is
 * involved, else `camunda:modelerTemplate`); the template provider then shows
 * the template's editable properties instead of raw fields.
 */
import type { BpmnDiagram, BpmnFlowNodeType, BpmnNodeType } from './bpmn-model';
import type { BpmnCommand } from './command-stack';
import { morphNodeCommand } from './commands';
import { setForeignAttributeCommand } from './commands-extensions';
import {
  BPMN_CAMUNDA_NAMESPACE,
  BPMN_ZEEBE_NAMESPACE,
} from './bpmn-xml-element';
import type { OgeBpmnPropertyBinding } from './camunda';
import {
  bpmnBindingValue,
  bpmnForeignAttribute,
  setBpmnBindingCommand,
} from './camunda';
import type {
  OgeBpmnPropertiesEntry,
  OgeBpmnPropertiesProvider,
} from './properties-providers';
import type { OgeBpmnSvgNode } from './svg-node';

/** One property of an element template. */
export interface OgeBpmnTemplateProperty {
  /** Field label (omit for `Hidden`). */
  readonly label?: string;
  readonly description?: string;
  /** `String` → text, `Text` → textarea, `Boolean` → checkbox, `Dropdown` → select, `Hidden` → not shown. */
  readonly type: 'String' | 'Text' | 'Boolean' | 'Dropdown' | 'Hidden';
  /** Default value written when the template is applied. */
  readonly value?: string | boolean;
  /** `Dropdown` choices. */
  readonly choices?: readonly {
    readonly name: string;
    readonly value: string;
  }[];
  /** False shows the value read-only. Default true. */
  readonly editable?: boolean;
  /** Where the value lives. */
  readonly binding: OgeBpmnPropertyBinding;
}

/** A reusable, pre-configured element (a "connector", a typed service task…). */
export interface OgeBpmnElementTemplate {
  /** Stable id, written to the element as `…:modelerTemplate`. */
  readonly id: string;
  readonly name: string;
  readonly version?: number;
  readonly description?: string;
  /** Element types the template may be applied to. */
  readonly appliesTo: readonly BpmnNodeType[];
  /** Morph target applied first (`serviceTask`), when the element is not that type yet. */
  readonly elementType?: BpmnFlowNodeType;
  /** Palette / context-pad icon for entries that create templated elements. */
  readonly icon?: readonly OgeBpmnSvgNode[];
  readonly properties: readonly OgeBpmnTemplateProperty[];
}

const usesZeebe = (template: OgeBpmnElementTemplate): boolean =>
  template.properties.some((p) => p.binding.type.startsWith('zeebe:'));

const templateAttribute = (
  template: OgeBpmnElementTemplate,
): {
  readonly id: string;
  readonly version: string;
  readonly ns: Readonly<Record<string, string>>;
} =>
  usesZeebe(template)
    ? {
        id: 'zeebe:modelerTemplate',
        version: 'zeebe:modelerTemplateVersion',
        ns: { zeebe: BPMN_ZEEBE_NAMESPACE },
      }
    : {
        id: 'camunda:modelerTemplate',
        version: 'camunda:modelerTemplateVersion',
        ns: { camunda: BPMN_CAMUNDA_NAMESPACE },
      };

const stringValue = (value: string | boolean | undefined): string =>
  value === undefined ? '' : typeof value === 'boolean' ? String(value) : value;

/** The id of the template applied to an element, or undefined. */
export function bpmnAppliedTemplateId(
  model: BpmnDiagram,
  id: string,
): string | undefined {
  const value =
    bpmnForeignAttribute(model, id, 'zeebe:modelerTemplate') ||
    bpmnForeignAttribute(model, id, 'camunda:modelerTemplate');
  return value === '' ? undefined : value;
}

/** True when the template may be applied to the element. */
export function bpmnTemplateApplies(
  model: BpmnDiagram,
  id: string,
  template: OgeBpmnElementTemplate,
): boolean {
  const node = model.nodes[id];
  return node !== undefined && template.appliesTo.includes(node.type);
}

/**
 * Applies a template: morphs to `elementType` when given, writes each
 * property's default value through its binding and records the template id
 * (and version) — one undoable step. Not-applicable templates are no-ops.
 */
export function applyElementTemplateCommand(
  id: string,
  template: OgeBpmnElementTemplate,
): BpmnCommand {
  return {
    label: 'Apply template',
    apply(model: BpmnDiagram): BpmnDiagram {
      if (!bpmnTemplateApplies(model, id, template)) return model;
      let next = model;
      if (template.elementType !== undefined) {
        next = morphNodeCommand(id, template.elementType).apply(next);
      }
      for (const property of template.properties) {
        if (property.value === undefined) continue;
        next = setBpmnBindingCommand(
          id,
          property.binding,
          stringValue(property.value),
        ).apply(next);
      }
      const attribute = templateAttribute(template);
      next = removeTemplateMarks(next, id);
      next = setForeignAttributeCommand(
        id,
        attribute.id,
        template.id,
        attribute.ns,
      ).apply(next);
      if (template.version !== undefined) {
        next = setForeignAttributeCommand(
          id,
          attribute.version,
          String(template.version),
          attribute.ns,
        ).apply(next);
      }
      return next;
    },
  };
}

function removeTemplateMarks(model: BpmnDiagram, id: string): BpmnDiagram {
  let next = model;
  for (const name of [
    'zeebe:modelerTemplate',
    'zeebe:modelerTemplateVersion',
    'camunda:modelerTemplate',
    'camunda:modelerTemplateVersion',
  ]) {
    next = setForeignAttributeCommand(id, name, undefined).apply(next);
  }
  return next;
}

/** Unlinks the template (its values stay on the element as plain properties). */
export function removeElementTemplateCommand(id: string): BpmnCommand {
  return {
    label: 'Remove template',
    apply: (model) => removeTemplateMarks(model, id),
  };
}

/**
 * A properties provider for a template catalog: a "Template" select on
 * every element some template applies to, and the applied template's
 * visible properties as typed fields.
 */
export function bpmnElementTemplatesProvider(
  templates: readonly OgeBpmnElementTemplate[],
): OgeBpmnPropertiesProvider {
  return {
    id: 'oge-element-templates',
    getGroups({ diagram, target, messages }) {
      if (target.kind !== 'node') return [];
      const id = target.id;
      const applicable = templates.filter((t) =>
        bpmnTemplateApplies(diagram, id, t),
      );
      const appliedId = bpmnAppliedTemplateId(diagram, id);
      const applied = templates.find((t) => t.id === appliedId);
      if (applicable.length === 0 && applied === undefined) return [];
      const x = messages.extensions;
      const entries: OgeBpmnPropertiesEntry[] = [
        {
          id: 'element-template',
          label: x.template,
          type: 'select',
          value: appliedId ?? '',
          options: [
            { value: '', label: x.noTemplate },
            ...applicable.map((t) => ({ value: t.id, label: t.name })),
            ...(appliedId !== undefined && applied === undefined
              ? [{ value: appliedId, label: appliedId }]
              : []),
          ],
          set: (value) => {
            if (value === '') return removeElementTemplateCommand(id);
            const template = templates.find((t) => t.id === value);
            return template === undefined
              ? null
              : applyElementTemplateCommand(id, template);
          },
        },
      ];
      if (applied !== undefined) {
        applied.properties.forEach((property, index) => {
          if (property.type === 'Hidden') return;
          const raw = bpmnBindingValue(diagram, id, property.binding) ?? '';
          const editable = property.editable !== false;
          const set = editable
            ? (value: string | boolean | readonly object[]) =>
                setBpmnBindingCommand(id, property.binding, String(value))
            : undefined;
          const base = {
            id: `template-${applied.id}-${index}`,
            label: property.label ?? '',
            ...(property.description !== undefined
              ? { description: property.description }
              : {}),
            disabled: !editable,
            ...(set !== undefined ? { set } : {}),
          };
          if (property.type === 'Boolean') {
            entries.push({ ...base, type: 'checkbox', value: raw === 'true' });
          } else if (property.type === 'Dropdown') {
            entries.push({
              ...base,
              type: 'select',
              value: raw,
              options: (property.choices ?? []).map((choice) => ({
                value: choice.value,
                label: choice.name,
              })),
            });
          } else {
            entries.push({
              ...base,
              type: property.type === 'Text' ? 'textarea' : 'text',
              value: raw,
            });
          }
        });
      }
      return [{ id: 'element-template', label: x.template, entries }];
    },
  };
}
