import { Component, signal, viewChild } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import {
  OGE_BPMN_CAMUNDA_PROVIDERS,
  bpmnSvg,
  bpmnZeebeTaskDefinition,
  type OgeBpmnContextPadProvider,
  type OgeBpmnLintChangedEvent,
  type OgeBpmnPaletteProvider,
  type OgeBpmnPropertiesProvider,
  type OgeBpmnRenderers,
} from '@oge-ui/bpmn-engine';
import { CAMUNDA_FIXTURE_XML } from '@oge-ui/bpmn-engine/testing';
import { OgeBpmnEditor } from './bpmn-editor';
import { OgeBpmnPropertiesEntryTemplate } from './bpmn-properties';

const slaProvider: OgeBpmnPropertiesProvider = {
  id: 'sla',
  getGroups: ({ target }) =>
    target.kind === 'node' && target.node.type === 'userTask'
      ? [
          {
            id: 'sla',
            label: 'SLA',
            entries: [
              {
                id: 'sla-hours',
                label: 'Hours',
                type: 'custom',
                value: '4',
                set: () => null,
              },
            ],
          },
        ]
      : [],
};

@Component({
  imports: [OgeBpmnEditor, OgeBpmnPropertiesEntryTemplate],
  template: `
    <oge-bpmn-editor
      [lint]="lint()"
      [propertiesProviders]="providers()"
      [paletteProvider]="palette"
      [contextPadProvider]="pad"
      [renderers]="renderers()"
      (lintChanged)="lintEvents.push($event)"
    >
      <ng-template
        ogeBpmnPropertiesEntry="sla-hours"
        let-entry
        let-id="inputId"
      >
        <output class="custom-sla" [attr.aria-labelledby]="id">{{
          entry.value
        }}</output>
      </ng-template>
    </oge-bpmn-editor>
  `,
})
class Host {
  readonly editor = viewChild.required(OgeBpmnEditor);
  readonly lint = signal(false);
  readonly providers = signal<readonly OgeBpmnPropertiesProvider[]>([
    ...OGE_BPMN_CAMUNDA_PROVIDERS,
    slaProvider,
  ]);
  readonly renderers = signal<OgeBpmnRenderers | undefined>(undefined);
  readonly lintEvents: OgeBpmnLintChangedEvent[] = [];
  readonly picked: string[] = [];
  readonly palette: OgeBpmnPaletteProvider = () => [
    {
      id: 'mail',
      label: 'Mail task',
      icon: [bpmnSvg.rect(4, 6, 16, 12, { rx: 2 })],
      hotkey: 'm',
      action: (api) => {
        this.picked.push('mail');
        api.armPlace('serviceTask');
      },
    },
  ];
  readonly pad: OgeBpmnContextPadProvider = ({ elementId }) => [
    {
      id: 'flag',
      label: 'Flag element',
      icon: [bpmnSvg.circle(8, 8, 5)],
      action: () => this.picked.push(`flag:${elementId}`),
    },
  ];
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

function el(fixture: ComponentFixture<unknown>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

async function render() {
  const fixture = TestBed.createComponent(Host);
  await settle(fixture);
  const host = fixture.componentInstance;
  await host.editor().importXml(CAMUNDA_FIXTURE_XML);
  await settle(fixture);
  return { fixture, host, editor: host.editor() };
}

function change(
  input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
) {
  input.value = value;
  input.dispatchEvent(new Event('change'));
}

describe('OgeBpmnEditor — G5b validation', () => {
  it('shows badges, the problems toggle and panel, and emits lintChanged', async () => {
    const { fixture, host } = await render();
    expect(el(fixture).querySelector('.oge-bpmn-lint-badge')).toBeNull();
    host.lint.set(true);
    await settle(fixture);
    expect(host.lintEvents.length).toBe(1);
    const badges = el(fixture).querySelectorAll('.oge-bpmn-lint-badge');
    expect(badges.length).toBeGreaterThan(0);
    const flagged = badges[0].closest('[role="img"]');
    expect(flagged?.getAttribute('aria-label')).toContain('problem(s)');
    const toggle = el(fixture).querySelector<HTMLButtonElement>(
      '.oge-bpmn-header-problems',
    );
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    toggle?.click();
    await settle(fixture);
    const panel = el(fixture).querySelector('.oge-bpmn-problems');
    expect(panel?.getAttribute('role')).toBe('region');
    expect(toggle?.getAttribute('aria-controls')).toBe(panel?.id);
    const row = panel?.querySelector<HTMLButtonElement>(
      '.oge-bpmn-problem[data-element="Task_u"]',
    );
    expect(row?.textContent).toContain('Approve');
    row?.click();
    await settle(fixture);
    expect(host.editor().getSelection()).toEqual(['Task_u']);
  });

  it('validate() returns issues with live linting off', async () => {
    const { editor } = await render();
    expect(editor.validate().length).toBeGreaterThan(0);
  });
});

describe('OgeBpmnEditor — G5b properties providers', () => {
  it('edits the Zeebe job type through the Camunda preset', async () => {
    const { fixture, editor } = await render();
    editor.select(['Task_z']);
    await settle(fixture);
    const field = el(fixture).querySelector<HTMLTextAreaElement>(
      '[data-entry="zeebe-job-type"] textarea',
    );
    expect(field?.value).toBe('payment');
    expect(field?.classList).toContain('oge-bpmn-props-expression');
    change(field as HTMLTextAreaElement, 'refund');
    await settle(fixture);
    expect(editor.exportXml()).toContain('type="refund"');
    editor.undo();
    expect(editor.exportXml()).toContain('type="payment"');
  });

  it('adds and removes list rows', async () => {
    const { fixture, editor } = await render();
    editor.select(['Task_z']);
    await settle(fixture);
    const list = () =>
      el(fixture).querySelector('[data-entry="zeebe-inputs"]') as HTMLElement;
    expect(list().querySelectorAll('.oge-bpmn-props-list-row').length).toBe(1);
    list()
      .querySelector<HTMLButtonElement>('.oge-bpmn-props-list-add')
      ?.click();
    await settle(fixture);
    expect(list().querySelectorAll('.oge-bpmn-props-list-row').length).toBe(2);
    const cells = list().querySelectorAll<HTMLInputElement>(
      '.oge-bpmn-props-list-cell',
    );
    expect(cells[2].getAttribute('aria-label')).toBe('Input mappings Source 2');
    change(cells[3], 'orderId');
    await settle(fixture);
    expect(editor.exportXml()).toContain('target="orderId"');
    list()
      .querySelectorAll<HTMLButtonElement>('.oge-bpmn-props-list-remove')[1]
      .click();
    await settle(fixture);
    expect(editor.exportXml()).not.toContain('target="orderId"');
  });

  it('renders a custom entry through its template', async () => {
    const { fixture, editor } = await render();
    editor.select(['Task_u']);
    await settle(fixture);
    const custom = el(fixture).querySelector('.custom-sla');
    expect(custom?.textContent).toBe('4');
    const label = el(fixture).querySelector(
      '[data-entry="sla-hours"] .oge-bpmn-props-label',
    );
    expect(custom?.getAttribute('aria-labelledby')).toBe(label?.id);
  });

  it('edits documentation', async () => {
    const { fixture, editor } = await render();
    editor.select(['Task_u']);
    await settle(fixture);
    const doc = el(fixture).querySelector<HTMLTextAreaElement>(
      '[data-entry="documentation"] textarea',
    );
    change(doc as HTMLTextAreaElement, 'Approve the order');
    await settle(fixture);
    expect(editor.exportXml()).toContain(
      '<bpmn:documentation>Approve the order</bpmn:documentation>',
    );
  });
});

describe('OgeBpmnEditor — G5b palette, context pad, renderers, PNG', () => {
  it('renders custom palette entries in the roving toolbar', async () => {
    const { fixture, host } = await render();
    const button = el(fixture).querySelector<HTMLButtonElement>(
      '.oge-bpmn-palette-custom[data-entry="mail"]',
    );
    expect(button?.getAttribute('aria-label')).toBe('Mail task');
    expect(button?.getAttribute('aria-keyshortcuts')).toBe('M');
    expect(button?.querySelector('rect')?.getAttribute('rx')).toBe('2');
    button?.click();
    expect(host.picked).toEqual(['mail']);
  });

  it('renders custom context-pad actions for the selection', async () => {
    const { fixture, host, editor } = await render();
    editor.select(['Task_z']);
    await settle(fixture);
    const button = el(fixture).querySelector<HTMLButtonElement>(
      '.oge-bpmn-pad-custom[data-entry="flag"]',
    );
    button?.click();
    expect(host.picked).toEqual(['flag:Task_z']);
  });

  it('draws a renderer override instead of the built-in glyph', async () => {
    const { fixture, host } = await render();
    host.renderers.set({
      serviceTask: ({ width, height }) => [
        bpmnSvg.ellipse(width / 2, height / 2, width / 2, height / 2, {
          class: 'my-service',
        }),
      ],
    });
    await settle(fixture);
    const shape = el(fixture).querySelector('g[id$="-el-Task_z"]');
    expect(shape?.querySelector('ellipse.my-service')).not.toBeNull();
    expect(shape?.querySelector('rect.oge-bpmn-task')).toBeNull();
  });

  it('resolves exportPng() to null without a canvas', async () => {
    const { editor } = await render();
    await expect(editor.exportPng()).resolves.toBeNull();
    expect(bpmnZeebeTaskDefinition).toBeDefined();
  });
});
