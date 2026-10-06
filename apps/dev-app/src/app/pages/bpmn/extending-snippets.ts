import { demoSource } from '../../shared/demo-source';

export const PROVIDERS_SNIPPET = demoSource({
  use: {
    '@oge-ui/bpmn': ['OgeBpmnEditor', 'OgeBpmnPropertiesEntryTemplate'],
  },
  helpers: {
    '@oge-ui/bpmn': ['bpmnForeignAttribute', 'setForeignAttributeCommand'],
  },
  types: { '@oge-ui/bpmn': ['OgeBpmnPropertiesProvider'] },
  template: `<oge-bpmn-editor style="height: 480px" [propertiesProviders]="providers">
  <!-- draws the 'custom' entry whose id matches; commit() is one undo step -->
  <ng-template
    ogeBpmnPropertiesEntry="sla-effort"
    let-entry
    let-commit="commit"
    let-id="inputId"
  >
    <input
      type="range"
      min="1"
      max="40"
      [attr.aria-labelledby]="id"
      [value]="entry.value"
      (change)="commit($any($event.target).value)"
    />
    {{ entry.value }} h
  </ng-template>
</oge-bpmn-editor>`,
  before: `const NS = { oge: 'https://ogeui.com/schema/bpmn/demo' };

/** A "Service level" group on user tasks, stored as oge:* attributes. */
const slaProvider: OgeBpmnPropertiesProvider = {
  id: 'demo-sla',
  getGroups: ({ diagram, target }) => {
    if (target.kind !== 'node' || target.node.type !== 'userTask') return [];
    const id = target.id;
    const read = (name: string) => bpmnForeignAttribute(diagram, id, name);
    const write = (name: string, value: string) =>
      setForeignAttributeCommand(id, name, value, NS);
    return [
      {
        id: 'sla',
        label: 'Service level',
        entries: [
          {
            id: 'sla-due',
            label: 'Due within',
            type: 'select',
            value: read('oge:dueWithin'),
            options: [
              { value: '', label: 'No deadline' },
              { value: 'P1D', label: '1 day' },
              { value: 'P1W', label: '1 week' },
            ],
            set: (value) => write('oge:dueWithin', String(value)),
          },
          {
            id: 'sla-escalate',
            label: 'Escalate when late',
            type: 'checkbox',
            value: read('oge:escalate') === 'true',
            set: (value) => write('oge:escalate', value === true ? 'true' : ''),
          },
          {
            id: 'sla-effort',
            label: 'Effort (hours)',
            type: 'custom',
            value: read('oge:effort') || '4',
            set: (value) => write('oge:effort', String(value)),
          },
        ],
      },
    ];
  },
};`,
  body: `protected readonly providers = [slaProvider];`,
});

export const PALETTE_SNIPPET = demoSource({
  use: { '@oge-ui/bpmn': ['OgeBpmnEditor'] },
  helpers: { '@oge-ui/bpmn': ['bpmnSvg', 'setElementColorsCommand'] },
  types: {
    '@oge-ui/bpmn': ['OgeBpmnContextPadProvider', 'OgeBpmnPaletteProvider'],
  },
  template: `<oge-bpmn-editor
  style="height: 460px"
  [paletteProvider]="palette"
  [contextPadProvider]="pad"
/>`,
  body: `// icons are bpmnSvg trees — sanitized, never markup strings
protected readonly palette: OgeBpmnPaletteProvider = () => [
  {
    id: 'mail-task',
    label: 'Mail task',
    icon: [
      bpmnSvg.rect(4, 6, 16, 12, { rx: 2 }),
      bpmnSvg.polyline('4,7 12,13 20,7'),
    ],
    hotkey: 'm', // canvas shortcut; built-in keys are never shadowed
    action: (api) => api.armPlace('serviceTask'),
  },
];

protected readonly pad: OgeBpmnContextPadProvider = ({ diagram, elementId }) =>
  diagram.nodes[elementId] === undefined
    ? []
    : [
        {
          id: 'mark-reviewed',
          label: 'Mark reviewed',
          icon: [bpmnSvg.polyline('3,8 7,12 13,4')],
          hotkey: 'r',
          action: (api, id) => {
            // execute() keeps every change undoable
            api.execute(setElementColorsCommand([id], { fill: '#dcfce7' }));
            api.announce('Marked reviewed');
          },
        },
      ];`,
});

export const RENDERERS_SNIPPET = demoSource({
  use: { '@oge-ui/bpmn': ['OgeBpmnEditor'] },
  helpers: { '@oge-ui/bpmn': ['bpmnSvg'] },
  types: { '@oge-ui/bpmn': ['OgeBpmnRenderers'] },
  template: `<oge-bpmn-editor style="height: 420px" [renderers]="renderers" />`,
  body: `// draws in shape-local coordinates; null falls back to the built-in glyph.
// Labels, markers, selection and badges are still drawn by the editor, and
// exportSvg() / exportPng() use the same renderer.
protected readonly renderers: OgeBpmnRenderers = {
  serviceTask: ({ width, height, fill }) => [
    bpmnSvg.rect(0, 0, width, height, {
      rx: 18,
      fill: fill ?? '#eef2ff',
      stroke: '#4f46e5',
      'stroke-width': 2,
    }),
    bpmnSvg.circle(16, 16, 6, { fill: 'none', stroke: '#4f46e5' }),
    bpmnSvg.path('M16 7v3M16 22v3M7 16h3M22 16h3', { stroke: '#4f46e5' }),
  ],
};`,
});

export const TEMPLATES_SNIPPET = demoSource({
  use: { '@oge-ui/bpmn': ['OgeBpmnEditor'] },
  helpers: { '@oge-ui/bpmn': ['bpmnElementTemplatesProvider'] },
  types: { '@oge-ui/bpmn': ['OgeBpmnElementTemplate'] },
  template: `<!-- select a task: the "Template" select applies "Send mail" -->
<oge-bpmn-editor style="height: 460px" [propertiesProviders]="providers" />`,
  before: `/** Modeled on Camunda Modeler element templates (Zeebe bindings). */
const mailTemplate: OgeBpmnElementTemplate = {
  id: 'io.ogeui.mail',
  name: 'Send mail',
  version: 1,
  appliesTo: ['task', 'serviceTask'],
  elementType: 'serviceTask',
  properties: [
    {
      type: 'Hidden',
      value: 'io.ogeui:mail:1',
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
  ],
};`,
  body: `protected readonly providers = [bpmnElementTemplatesProvider([mailTemplate])];`,
});
