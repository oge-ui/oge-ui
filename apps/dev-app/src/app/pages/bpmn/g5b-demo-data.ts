import {
  bpmnElementTemplatesProvider,
  bpmnForeignAttribute,
  bpmnSvg,
  setElementColorsCommand,
  setForeignAttributeCommand,
  type OgeBpmnContextPadProvider,
  type OgeBpmnElementTemplate,
  type OgeBpmnLintRulesInput,
  type OgeBpmnPaletteProvider,
  type OgeBpmnPropertiesProvider,
  type OgeBpmnRenderers,
} from '@oge-ui/bpmn-engine';

/**
 * The extension objects the live G5b demos run — shared by the Angular pages
 * (`pages/bpmn/{validation,extending,camunda}.ts`) and their React twins, so
 * both layers demonstrate exactly the same providers. The Code tabs show the
 * same objects inside complete components (`*-snippets.ts`).
 */

/** Namespace of the demo's own vendor attributes (`oge:dueWithin`, …). */
const DEMO_NS = { oge: 'https://ogeui.com/schema/bpmn/demo' } as const;

/** Validation demo: one custom rule, one re-graded built-in. */
export const DEMO_LINT_RULES: OgeBpmnLintRulesInput = [
  {
    id: 'task-needs-documentation',
    severity: 'info',
    check: (model) =>
      Object.values(model.nodes)
        .filter(
          (node) =>
            (node.type === 'userTask' || node.type === 'serviceTask') &&
            (node.documentation ?? '').trim() === '',
        )
        .map((node) => ({
          elementId: node.id,
          message: 'Document what this task does',
        })),
  },
  { id: 'label-required', severity: 'info' },
];

/** A "Service level" group on user tasks, stored as `oge:*` attributes. */
export const DEMO_SLA_PROVIDER: OgeBpmnPropertiesProvider = {
  id: 'demo-sla',
  getGroups: ({ diagram, target }) => {
    if (target.kind !== 'node' || target.node.type !== 'userTask') return [];
    const id = target.id;
    const read = (name: string) => bpmnForeignAttribute(diagram, id, name);
    const write = (name: string, value: string) =>
      setForeignAttributeCommand(id, name, value, DEMO_NS);
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
              { value: 'P3D', label: '3 days' },
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
            description: 'A custom entry: the app draws the slider.',
            set: (value) => write('oge:effort', String(value)),
          },
        ],
      },
    ];
  },
};

/** The "Send mail" element template (Zeebe bindings). */
export const DEMO_MAIL_TEMPLATE: OgeBpmnElementTemplate = {
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
      label: 'Subject',
      type: 'String',
      value: 'Your order',
      binding: { type: 'zeebe:input', name: 'subject' },
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

/** The template provider of the extending demo. */
export const DEMO_TEMPLATE_PROVIDER = bpmnElementTemplatesProvider([
  DEMO_MAIL_TEMPLATE,
]);

/** An envelope icon (24×24) for the custom palette entry. */
const MAIL_ICON = [
  bpmnSvg.rect(4, 6, 16, 12, { rx: 2 }),
  bpmnSvg.polyline('4,7 12,13 20,7'),
];

/** One custom palette entry: a templated "Mail task", hotkey M. */
export const DEMO_PALETTE_PROVIDER: OgeBpmnPaletteProvider = () => [
  {
    id: 'mail-task',
    label: 'Mail task',
    icon: MAIL_ICON,
    hotkey: 'm',
    action: (api) =>
      api.armPlace('serviceTask', { template: DEMO_MAIL_TEMPLATE }),
  },
];

/** One custom context-pad action: mark the element reviewed (a green fill). */
export const DEMO_CONTEXT_PAD_PROVIDER: OgeBpmnContextPadProvider = ({
  diagram,
  elementId,
}) =>
  diagram.nodes[elementId] === undefined
    ? []
    : [
        {
          id: 'mark-reviewed',
          label: 'Mark reviewed',
          icon: [bpmnSvg.polyline('3,8 7,12 13,4')],
          hotkey: 'r',
          action: (api, id) => {
            api.execute(setElementColorsCommand([id], { fill: '#dcfce7' }));
            api.announce('Marked reviewed');
          },
        },
      ];

/** Service tasks drawn as a rounded card with a gear badge. */
export const DEMO_RENDERERS: OgeBpmnRenderers = {
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
};
