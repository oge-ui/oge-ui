import type { BpmnDiagram } from './bpmn-model';
import { createEmptyDiagram } from './bpmn-model';
import { readBpmnXml } from './bpmn-xml-reader';
import { writeBpmnXml } from './bpmn-xml-writer';
import {
  OGE_BPMN_CAMUNDA_PROVIDERS,
  bpmnBindingValue,
  bpmnCamundaInputOutput,
  bpmnForeignAttribute,
  bpmnZeebeIoMapping,
  bpmnZeebeTaskDefinition,
  bpmnZeebeTaskHeaders,
  setBpmnBindingCommand,
  setCamundaAttributeCommand,
  setCamundaInputOutputCommand,
  setZeebeIoMappingCommand,
  setZeebeTaskDefinitionCommand,
  setZeebeTaskHeadersCommand,
} from './camunda';
import { addNodeCommand } from './commands';
import { OGE_DEFAULT_BPMN_MESSAGES, fillBpmnMessages } from './config';
import {
  applyElementTemplateCommand,
  bpmnAppliedTemplateId,
  bpmnElementTemplatesProvider,
  removeElementTemplateCommand,
  type OgeBpmnElementTemplate,
} from './element-templates';
import {
  buildBpmnPropertiesGroups,
  resolveBpmnPropertiesProviders,
  type OgeBpmnListRow,
  type OgeBpmnPropertiesEntry,
} from './properties-providers';
import { CAMUNDA_FIXTURE_XML } from './xml-fixtures';

const messages = fillBpmnMessages(OGE_DEFAULT_BPMN_MESSAGES);

function fixture(): BpmnDiagram {
  return readBpmnXml(CAMUNDA_FIXTURE_XML).model as BpmnDiagram;
}

/** Re-reads a model's XML: what an edit looks like after a save/load cycle. */
function roundTrip(model: BpmnDiagram): BpmnDiagram {
  return readBpmnXml(writeBpmnXml(model)).model as BpmnDiagram;
}

function blank(type: 'serviceTask' | 'userTask' = 'serviceTask'): BpmnDiagram {
  return addNodeCommand(type, { x: 100, y: 100 }, 'T').apply(
    createEmptyDiagram(),
  );
}

function entry(
  model: BpmnDiagram,
  id: string,
  entryId: string,
): OgeBpmnPropertiesEntry {
  const groups = buildBpmnPropertiesGroups(
    model,
    [id],
    messages,
    resolveBpmnPropertiesProviders(OGE_BPMN_CAMUNDA_PROVIDERS),
  );
  const found = groups.flatMap((g) => g.entries).find((e) => e.id === entryId);
  if (found === undefined) throw new Error(`no entry ${entryId}`);
  return found;
}

describe('Zeebe helpers', () => {
  it('reads the fixture values', () => {
    const m = fixture();
    expect(bpmnZeebeTaskDefinition(m, 'Task_z')).toEqual({
      type: 'payment',
      retries: '5',
    });
    expect(bpmnZeebeIoMapping(m, 'Task_z')).toEqual({
      inputs: [{ source: '=order.total', target: 'amount' }],
      outputs: [{ source: '=receipt', target: 'paymentReceipt' }],
    });
    expect(bpmnZeebeTaskHeaders(m, 'Task_z')).toEqual([
      { key: 'currency', value: 'EUR' },
    ]);
  });

  it('creates a task definition, declaring the zeebe namespace', () => {
    const m = setZeebeTaskDefinitionCommand('T', {
      type: 'mail',
      retries: '3',
    }).apply(blank());
    expect(m.definitionsAttrs['xmlns:zeebe']).toBe(
      'http://camunda.org/schema/zeebe/1.0',
    );
    const x = writeBpmnXml(m);
    expect(x).toContain('<zeebe:taskDefinition retries="3" type="mail" />');
    expect(bpmnZeebeTaskDefinition(roundTrip(m), 'T')).toEqual({
      type: 'mail',
      retries: '3',
    });
  });

  it('removes the element when the last attribute is cleared', () => {
    let m = setZeebeTaskDefinitionCommand('T', { type: 'mail' }).apply(blank());
    m = setZeebeTaskDefinitionCommand('T', { type: '' }).apply(m);
    const node = m.nodes['T'];
    expect(
      node.type !== 'textAnnotation' && node.extensionElements,
    ).toBeFalsy();
  });

  it('round-trips edited io mappings and headers', () => {
    let m = fixture();
    m = setZeebeIoMappingCommand('Task_z', {
      inputs: [
        { source: '=order.total', target: 'amount' },
        { source: '=order.id', target: 'orderId' },
      ],
    }).apply(m);
    m = setZeebeTaskHeadersCommand('Task_z', []).apply(m);
    const back = roundTrip(m);
    expect(bpmnZeebeIoMapping(back, 'Task_z').inputs).toHaveLength(2);
    expect(bpmnZeebeIoMapping(back, 'Task_z').outputs).toHaveLength(1);
    expect(bpmnZeebeTaskHeaders(back, 'Task_z')).toEqual([]);
    expect(writeBpmnXml(back)).not.toContain('zeebe:taskHeaders');
  });
});

describe('Camunda 7 helpers', () => {
  it('reads assignment attributes and text parameters', () => {
    const m = fixture();
    expect(bpmnForeignAttribute(m, 'Task_u', 'camunda:assignee')).toBe('demo');
    expect(bpmnCamundaInputOutput(m, 'Task_u')).toEqual({
      inputs: [{ name: 'limit', value: '${order.limit}' }],
      outputs: [{ name: 'approved', value: '${true}' }],
    });
  });

  it('sets attributes with the camunda namespace declared', () => {
    const m = setCamundaAttributeCommand('T', 'formKey', 'embedded:x').apply(
      blank('userTask'),
    );
    expect(m.definitionsAttrs['xmlns:camunda']).toBe(
      'http://camunda.org/schema/1.0/bpmn',
    );
    expect(writeBpmnXml(m)).toContain('camunda:formKey="embedded:x"');
  });

  it('edits text parameters and keeps complex ones', () => {
    const m = setCamundaInputOutputCommand('Task_u', {
      inputs: [{ name: 'limit', value: '100' }],
    }).apply(fixture());
    const x = writeBpmnXml(m);
    expect(x).toContain(
      '<camunda:inputParameter name="limit">100</camunda:inputParameter>',
    );
    expect(x).toContain('<camunda:value>a</camunda:value>');
    expect(bpmnCamundaInputOutput(roundTrip(m), 'Task_u').inputs).toEqual([
      { name: 'limit', value: '100' },
    ]);
  });
});

describe('Camunda providers', () => {
  it('offers Zeebe fields on a service task and commits them', () => {
    const m = fixture();
    const jobType = entry(m, 'Task_z', 'zeebe-job-type');
    expect(jobType.value).toBe('payment');
    const next = jobType.set?.('refund')?.apply(m) as BpmnDiagram;
    expect(bpmnZeebeTaskDefinition(next, 'Task_z').type).toBe('refund');
  });

  it('adds an empty list row that survives until it is filled', () => {
    const m = fixture();
    const inputs = entry(m, 'Task_z', 'zeebe-inputs');
    const rows = inputs.value as readonly OgeBpmnListRow[];
    const next = inputs
      .set?.([...rows, { source: '', target: '' }])
      ?.apply(m) as BpmnDiagram;
    expect(bpmnZeebeIoMapping(next, 'Task_z').inputs).toHaveLength(2);
  });

  it('offers Camunda 7 assignment on a user task', () => {
    const m = fixture();
    const assignee = entry(m, 'Task_u', 'camunda-assignee');
    expect(assignee.value).toBe('demo');
    const next = assignee.set?.('')?.apply(m) as BpmnDiagram;
    expect(bpmnForeignAttribute(next, 'Task_u', 'camunda:assignee')).toBe('');
  });
});

describe('bindings and element templates', () => {
  const template: OgeBpmnElementTemplate = {
    id: 'com.example.mail',
    name: 'Send mail',
    version: 2,
    appliesTo: ['task', 'serviceTask'],
    elementType: 'serviceTask',
    properties: [
      {
        type: 'Hidden',
        value: 'mail',
        binding: { type: 'zeebe:taskDefinition', property: 'type' },
      },
      {
        label: 'Recipient',
        type: 'String',
        value: '=customer.email',
        binding: { type: 'zeebe:input', name: 'to' },
      },
      {
        label: 'Priority',
        type: 'Dropdown',
        value: 'normal',
        choices: [
          { name: 'Normal', value: 'normal' },
          { name: 'High', value: 'high' },
        ],
        binding: { type: 'zeebe:taskHeader', key: 'priority' },
      },
      {
        label: 'Notes',
        type: 'Text',
        value: 'Generated',
        binding: { type: 'documentation' },
      },
    ],
  };

  it('reads and writes every binding kind', () => {
    let m = blank();
    const bindings = [
      { type: 'property', name: 'name' },
      { type: 'property', name: 'camunda:asyncBefore' },
      { type: 'documentation' },
      { type: 'zeebe:taskDefinition', property: 'retries' },
      { type: 'zeebe:input', name: 'a' },
      { type: 'zeebe:output', source: '=b' },
      { type: 'zeebe:taskHeader', key: 'c' },
      { type: 'camunda:inputParameter', name: 'd' },
      { type: 'camunda:outputParameter', source: '${e}' },
    ] as const;
    bindings.forEach((binding, i) => {
      m = setBpmnBindingCommand('T', binding, `v${i}`).apply(m);
    });
    const back = roundTrip(m);
    bindings.forEach((binding, i) => {
      expect(bpmnBindingValue(back, 'T', binding)).toBe(`v${i}`);
    });
  });

  it('applies a template in one step: morph, defaults, template id', () => {
    const m = addNodeCommand('task', { x: 0, y: 0 }, 'T').apply(
      createEmptyDiagram(),
    );
    const applied = applyElementTemplateCommand('T', template).apply(m);
    expect(applied.nodes['T'].type).toBe('serviceTask');
    expect(bpmnZeebeTaskDefinition(applied, 'T').type).toBe('mail');
    expect(bpmnAppliedTemplateId(applied, 'T')).toBe('com.example.mail');
    expect(
      bpmnForeignAttribute(applied, 'T', 'zeebe:modelerTemplateVersion'),
    ).toBe('2');
    const removed = removeElementTemplateCommand('T').apply(applied);
    expect(bpmnAppliedTemplateId(removed, 'T')).toBeUndefined();
    expect(bpmnZeebeTaskDefinition(removed, 'T').type).toBe('mail');
  });

  it('shows the template select and its visible properties', () => {
    const provider = bpmnElementTemplatesProvider([template]);
    const m = applyElementTemplateCommand('T', template).apply(blank());
    const groups = buildBpmnPropertiesGroups(m, ['T'], messages, [provider]);
    const entries = groups.flatMap((g) => g.entries);
    expect(entries.map((e) => e.type)).toEqual([
      'select',
      'text',
      'select',
      'textarea',
    ]);
    const recipient = entries[1];
    expect(recipient.value).toBe('=customer.email');
    const next = recipient.set?.('=x')?.apply(m) as BpmnDiagram;
    expect(
      bpmnBindingValue(next, 'T', { type: 'zeebe:input', name: 'to' }),
    ).toBe('=x');
    // choosing "None" unlinks
    const unlinked = entries[0].set?.('')?.apply(m) as BpmnDiagram;
    expect(bpmnAppliedTemplateId(unlinked, 'T')).toBeUndefined();
  });

  it('offers nothing for elements no template applies to', () => {
    const provider = bpmnElementTemplatesProvider([template]);
    const m = blank('userTask');
    expect(buildBpmnPropertiesGroups(m, ['T'], messages, [provider])).toEqual(
      [],
    );
  });
});
