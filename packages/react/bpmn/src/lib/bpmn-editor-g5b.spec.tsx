import { StrictMode, createRef } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import {
  OGE_BPMN_CAMUNDA_PROVIDERS,
  bpmnSvg,
  type OgeBpmnLintChangedEvent,
  type OgeBpmnPropertiesProvider,
} from '@oge-ui/bpmn-engine';
import { CAMUNDA_FIXTURE_XML } from '@oge-ui/bpmn-engine/testing';
import {
  OgeBpmnEditor,
  type OgeBpmnEditorHandle,
  type OgeBpmnEditorProps,
} from './bpmn-editor';

const slaProvider: OgeBpmnPropertiesProvider = {
  id: 'sla',
  getGroups: ({ target }) =>
    target.kind === 'node' && target.node.type === 'userTask'
      ? [
          {
            id: 'sla',
            label: 'SLA',
            entries: [
              { id: 'sla-hours', label: 'Hours', type: 'custom', value: '4' },
            ],
          },
        ]
      : [],
};

async function setup(props: OgeBpmnEditorProps = {}) {
  const ref = createRef<OgeBpmnEditorHandle>();
  const utils = render(
    <StrictMode>
      <OgeBpmnEditor ref={ref} {...props} />
    </StrictMode>,
  );
  await act(async () => {
    await ref.current?.importXml(CAMUNDA_FIXTURE_XML);
  });
  return { ...utils, handle: () => ref.current as OgeBpmnEditorHandle };
}

function change(
  input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
): void {
  act(() => {
    input.value = value;
    input.dispatchEvent(new Event('change'));
  });
}

describe('<OgeBpmnEditor> — G5b validation', () => {
  it('shows badges, the problems toggle and panel, and reports changes', async () => {
    const events: OgeBpmnLintChangedEvent[] = [];
    const { container, handle } = await setup({
      lint: true,
      onLintChanged: (event) => events.push(event),
    });
    expect(events.length).toBeGreaterThan(0);
    const badge = container.querySelector('.oge-bpmn-lint-badge');
    expect(
      badge?.closest('[role="img"]')?.getAttribute('aria-label'),
    ).toContain('problem(s)');
    const toggle = container.querySelector(
      '.oge-bpmn-header-problems',
    ) as HTMLButtonElement;
    fireEvent.click(toggle);
    const panel = container.querySelector('.oge-bpmn-problems');
    expect(panel?.getAttribute('role')).toBe('region');
    expect(toggle.getAttribute('aria-controls')).toBe(panel?.id);
    fireEvent.click(
      panel?.querySelector('[data-element="Task_u"]') as HTMLButtonElement,
    );
    expect(handle().getSelection()).toEqual(['Task_u']);
  });

  it('validate() returns issues without live linting', async () => {
    const { container, handle } = await setup();
    expect(handle().validate().length).toBeGreaterThan(0);
    expect(container.querySelector('.oge-bpmn-lint-badge')).toBeNull();
  });
});

describe('<OgeBpmnEditor> — G5b properties providers', () => {
  it('edits the Zeebe job type through the Camunda preset', async () => {
    const { container, handle } = await setup({
      propertiesProviders: OGE_BPMN_CAMUNDA_PROVIDERS,
    });
    act(() => handle().select(['Task_z']));
    const field = container.querySelector(
      '[data-entry="zeebe-job-type"] textarea',
    ) as HTMLTextAreaElement;
    expect(field.value).toBe('payment');
    change(field, 'refund');
    expect(handle().exportXml()).toContain('type="refund"');
  });

  it('adds and removes list rows', async () => {
    const { container, handle } = await setup({
      propertiesProviders: OGE_BPMN_CAMUNDA_PROVIDERS,
    });
    act(() => handle().select(['Task_z']));
    const list = () =>
      container.querySelector('[data-entry="zeebe-inputs"]') as HTMLElement;
    fireEvent.click(
      list().querySelector('.oge-bpmn-props-list-add') as HTMLButtonElement,
    );
    expect(list().querySelectorAll('.oge-bpmn-props-list-row')).toHaveLength(2);
    const cells = list().querySelectorAll<HTMLInputElement>(
      '.oge-bpmn-props-list-cell',
    );
    expect(cells[2].getAttribute('aria-label')).toBe('Input mappings Source 2');
    change(cells[3], 'orderId');
    expect(handle().exportXml()).toContain('target="orderId"');
    fireEvent.click(
      list().querySelectorAll<HTMLButtonElement>(
        '.oge-bpmn-props-list-remove',
      )[1],
    );
    expect(handle().exportXml()).not.toContain('target="orderId"');
  });

  it('renders a custom entry through renderPropertiesEntry', async () => {
    const { container, handle } = await setup({
      propertiesProviders: [slaProvider],
      renderPropertiesEntry: (entry, { inputId }) => (
        <output className="custom-sla" aria-labelledby={inputId}>
          {String(entry.value)}
        </output>
      ),
    });
    act(() => handle().select(['Task_u']));
    const custom = container.querySelector('.custom-sla');
    expect(custom?.textContent).toBe('4');
    const label = container.querySelector(
      '[data-entry="sla-hours"] .oge-bpmn-props-label',
    );
    expect(custom?.getAttribute('aria-labelledby')).toBe(label?.id);
  });

  it('edits documentation', async () => {
    const { container, handle } = await setup();
    act(() => handle().select(['Task_u']));
    change(
      container.querySelector(
        '[data-entry="documentation"] textarea',
      ) as HTMLTextAreaElement,
      'Approve the order',
    );
    expect(handle().exportXml()).toContain(
      '<bpmn:documentation>Approve the order</bpmn:documentation>',
    );
  });
});

describe('<OgeBpmnEditor> — G5b palette, context pad, renderers, PNG', () => {
  it('renders custom palette and context-pad entries', async () => {
    const picked: string[] = [];
    const { container, handle } = await setup({
      paletteProvider: () => [
        {
          id: 'mail',
          label: 'Mail task',
          icon: [bpmnSvg.rect(4, 6, 16, 12, { rx: 2, 'stroke-width': 2 })],
          hotkey: 'm',
          action: () => picked.push('mail'),
        },
      ],
      contextPadProvider: ({ elementId }) => [
        {
          id: 'flag',
          label: 'Flag element',
          icon: [bpmnSvg.circle(8, 8, 5)],
          action: () => picked.push(`flag:${elementId}`),
        },
      ],
    });
    const entry = container.querySelector(
      '.oge-bpmn-palette-custom[data-entry="mail"]',
    ) as HTMLButtonElement;
    expect(entry.getAttribute('aria-keyshortcuts')).toBe('M');
    expect(entry.querySelector('rect')?.getAttribute('stroke-width')).toBe('2');
    fireEvent.click(entry);
    act(() => handle().select(['Task_z']));
    fireEvent.click(
      container.querySelector(
        '.oge-bpmn-pad-custom[data-entry="flag"]',
      ) as HTMLButtonElement,
    );
    expect(picked).toEqual(['mail', 'flag:Task_z']);
  });

  it('draws a renderer override instead of the built-in glyph', async () => {
    const { container } = await setup({
      renderers: {
        serviceTask: ({ width, height }) => [
          bpmnSvg.ellipse(width / 2, height / 2, width / 2, height / 2, {
            class: 'my-service',
          }),
        ],
      },
    });
    const shape = container.querySelector('g[id$="-el-Task_z"]');
    expect(shape?.querySelector('ellipse.my-service')).not.toBeNull();
    expect(shape?.querySelector('rect.oge-bpmn-task')).toBeNull();
  });

  it('resolves exportPng() to null without a canvas', async () => {
    const { handle } = await setup();
    await expect(handle().exportPng()).resolves.toBeNull();
  });
});
