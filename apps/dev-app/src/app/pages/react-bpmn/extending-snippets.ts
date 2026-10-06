import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React "Extending the editor" page — section-for-section
 * mirror of `../bpmn/extending-snippets.ts`. Pure data, loaded by the
 * generator and the compile gate in plain Node.
 */
export const BPMN_EXTENDING_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Properties providers',
    source: reactDemoSource({
      use: {
        '@oge-ui/react-bpmn': [
          'OgeBpmnEditor',
          'bpmnForeignAttribute',
          'setForeignAttributeCommand',
        ],
      },
      types: { '@oge-ui/react-bpmn': ['OgeBpmnPropertiesProvider'] },
      name: 'ProvidersEditor',
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
};

const providers = [slaProvider];`,
      jsx: `<OgeBpmnEditor
  style={{ height: 480 }}
  propertiesProviders={providers}
  // draws the 'custom' entries; commit() is one undo step
  renderPropertiesEntry={(entry, { commit, inputId }) => (
    <input
      type="range"
      min={1}
      max={40}
      aria-labelledby={inputId}
      defaultValue={String(entry.value)}
      onChange={(event) => commit(event.currentTarget.value)}
    />
  )}
/>`,
    }),
  },
  {
    title: 'Palette & context pad',
    source: reactDemoSource({
      use: {
        '@oge-ui/react-bpmn': [
          'OgeBpmnEditor',
          'bpmnSvg',
          'setElementColorsCommand',
        ],
      },
      types: {
        '@oge-ui/react-bpmn': [
          'OgeBpmnContextPadProvider',
          'OgeBpmnPaletteProvider',
        ],
      },
      name: 'CustomPalette',
      before: `// icons are bpmnSvg trees — sanitized, never markup strings
const palette: OgeBpmnPaletteProvider = () => [
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

const pad: OgeBpmnContextPadProvider = ({ diagram, elementId }) =>
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
      jsx: `<OgeBpmnEditor
  style={{ height: 460 }}
  paletteProvider={palette}
  contextPadProvider={pad}
/>`,
    }),
  },
  {
    title: 'Renderers',
    source: reactDemoSource({
      use: { '@oge-ui/react-bpmn': ['OgeBpmnEditor', 'bpmnSvg'] },
      types: { '@oge-ui/react-bpmn': ['OgeBpmnRenderers'] },
      name: 'CustomRenderer',
      before: `// draws in shape-local coordinates; null falls back to the built-in glyph.
// Labels, markers, selection and badges are still drawn by the editor, and
// exportSvg() / exportPng() use the same renderer.
const renderers: OgeBpmnRenderers = {
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
      jsx: `<OgeBpmnEditor style={{ height: 420 }} renderers={renderers} />`,
    }),
  },
  {
    title: 'Element templates',
    source: reactDemoSource({
      use: {
        '@oge-ui/react-bpmn': ['OgeBpmnEditor', 'bpmnElementTemplatesProvider'],
      },
      types: { '@oge-ui/react-bpmn': ['OgeBpmnElementTemplate'] },
      name: 'TemplatedEditor',
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
};

const providers = [bpmnElementTemplatesProvider([mailTemplate])];`,
      jsx: `<>
  {/* select a task: the "Template" select applies "Send mail" */}
  <OgeBpmnEditor style={{ height: 460 }} propertiesProviders={providers} />
</>`,
    }),
  },
];
