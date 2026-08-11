import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { OgeBpmnDiagramChangedEvent } from '../bpmn-types';
import { provideOgeBpmnConfig } from '../config';
import { demoProcessXml } from '../engine/xml-fixtures';
import { OgeBpmnEditor } from './bpmn-editor';

@Component({
  imports: [OgeBpmnEditor],
  template: `
    <oge-bpmn-editor
      [readOnly]="readOnly()"
      [showPropertiesPanel]="showPanel()"
      (diagramChanged)="diagramEvents.push($event)"
    />
  `,
})
class Host {
  readonly readOnly = signal(false);
  readonly showPanel = signal(true);
  readonly diagramEvents: OgeBpmnDiagramChangedEvent[] = [];
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

function pointer(type: string, init: MouseEventInit = {}): MouseEvent {
  return new MouseEvent(type, { bubbles: true, cancelable: true, ...init });
}

function keydown(
  target: HTMLElement,
  key: string,
  init: KeyboardEventInit = {},
): void {
  target.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...init,
    }),
  );
}

function announcement(fixture: ComponentFixture<unknown>): string {
  return (
    el(fixture).querySelector('.oge-bpmn-live')?.textContent ?? ''
  ).trim();
}

function shapeOf(fixture: ComponentFixture<unknown>, id: string): SVGGElement {
  const shape = el(fixture).querySelector(`g[id$="-el-${id}"]`);
  if (!shape) throw new Error(`expected rendered element: ${id}`);
  return shape as SVGGElement;
}

function panelOf(fixture: ComponentFixture<unknown>): HTMLElement | null {
  return el(fixture).querySelector('.oge-bpmn-properties');
}

function change(
  field: HTMLInputElement | HTMLTextAreaElement,
  value: string,
): void {
  field.value = value;
  field.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('OgeBpmnEditor — v0.2 feature pack', () => {
  async function render(config?: { autoSaveDebounceMs?: number }) {
    if (config) {
      TestBed.configureTestingModule({
        providers: [provideOgeBpmnConfig(config)],
      });
    }
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const editor = fixture.debugElement.children[0]
      .componentInstance as OgeBpmnEditor;
    const wrap = el(fixture).querySelector(
      '.oge-bpmn-canvas-wrap',
    ) as HTMLElement;
    wrap.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        right: 800,
        bottom: 600,
        width: 800,
        height: 600,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    await editor.importXml(demoProcessXml('bpmn'));
    await settle(fixture);
    return { fixture, editor, wrap, host: fixture.componentInstance };
  }

  // ------------------------------------------------------------ JSON API

  it('round-trips the diagram through exportJson / importJson', async () => {
    const { fixture, editor } = await render();
    const json = editor.exportJson();
    expect(json.version).toBe(1);
    const xmlBefore = editor.exportXml();

    editor.newDiagram();
    await settle(fixture);
    expect(el(fixture).querySelectorAll('.oge-bpmn-shape').length).toBe(0);

    const result = editor.importJson(JSON.parse(JSON.stringify(json)));
    await settle(fixture);
    expect(result.error).toBeUndefined();
    expect(el(fixture).querySelectorAll('.oge-bpmn-shape').length).toBe(5);
    expect(editor.exportXml()).toBe(xmlBefore);
    expect(editor.canUndo()).toBe(false); // history was reset
    expect(editor.isDirty()).toBe(false);
    expect(announcement(fixture)).toBe('Diagram imported');
  });

  it('importJson rejects invalid payloads and leaves the diagram untouched', async () => {
    const { fixture, editor } = await render();
    const before = editor.exportXml();
    expect(editor.importJson(null).error).toBeTruthy();
    expect(editor.importJson({ version: 9, diagram: {} }).error).toContain(
      'Unsupported version',
    );
    await settle(fixture);
    expect(editor.exportXml()).toBe(before);
  });

  // ------------------------------------------------------------- autosave

  it('debounces diagramChanged and carries json, xml and source', async () => {
    const { fixture, editor, wrap, host } = await render();
    editor.select(['Activity_approve']);
    await settle(fixture);
    // Let the import's own debounce window elapse under real timers first.
    await new Promise((resolve) => setTimeout(resolve, 520));
    expect(host.diagramEvents.at(-1)?.source).toBe('import');
    vi.useFakeTimers();
    try {
      host.diagramEvents.length = 0;
      keydown(wrap, 'ArrowRight');
      keydown(wrap, 'ArrowRight');
      fixture.detectChanges();
      expect(host.diagramEvents.length).toBe(0);
      vi.advanceTimersByTime(499);
      expect(host.diagramEvents.length).toBe(0);
      vi.advanceTimersByTime(1);
      expect(host.diagramEvents.length).toBe(1);
      const event = host.diagramEvents[0];
      expect(event.source).toBe('execute');
      expect(event.xml).toContain('x="260" y="130"'); // both moves collapsed
      expect(event.json.version).toBe(1);
      expect(event.json.diagram.shapeDi['Activity_approve'].bounds.x).toBe(260);
    } finally {
      vi.useRealTimers();
    }
  });

  it('never emits diagramChanged for pure selection changes', async () => {
    const { fixture, editor, host } = await render();
    await new Promise((resolve) => setTimeout(resolve, 520));
    vi.useFakeTimers();
    try {
      host.diagramEvents.length = 0;
      editor.select(['Activity_approve']);
      editor.select([]);
      fixture.detectChanges();
      vi.advanceTimersByTime(2000);
      expect(host.diagramEvents.length).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('autoSaveDebounceMs 0 emits synchronously for every change including import', async () => {
    const { fixture, editor, host } = await render({ autoSaveDebounceMs: 0 });
    expect(host.diagramEvents.length).toBe(1);
    expect(host.diagramEvents[0].source).toBe('import');
    editor.select(['Activity_approve']);
    editor.deleteSelection();
    await settle(fixture);
    expect(host.diagramEvents.length).toBe(2);
    expect(host.diagramEvents[1].source).toBe('execute');
    editor.undo();
    expect(host.diagramEvents.at(-1)?.source).toBe('undo');
  });

  // ------------------------------------------------------ properties panel

  it('shows process properties when nothing is selected and commits them undoably', async () => {
    const { fixture, editor } = await render();
    const panel = panelOf(fixture) as HTMLElement;
    expect(panel).toBeTruthy();
    // composite name keeps sibling editors' panels distinguishable landmarks
    expect(panel.getAttribute('aria-label')).toBe(
      'BPMN diagram editor — Properties',
    );
    expect(panel.textContent).toContain('Process');
    expect(panel.textContent).toContain('Process_demo');

    const name = panel.querySelector('input[type="text"]') as HTMLInputElement;
    change(name, 'Invoice flow');
    await settle(fixture);
    expect(editor.exportXml()).toContain('name="Invoice flow"');

    const executable = panel.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement;
    expect(executable.checked).toBe(true);
    executable.checked = false;
    executable.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(fixture);
    expect(editor.exportXml()).toContain('isExecutable="false"');

    editor.undo();
    editor.undo();
    await settle(fixture);
    expect(editor.exportXml()).toContain('isExecutable="true"');
    expect(editor.exportXml()).not.toContain('Invoice flow');
  });

  it('edits a selected node name through the panel and Escape reverts the field', async () => {
    const { fixture, editor } = await render();
    editor.select(['Activity_approve']);
    await settle(fixture);
    const panel = panelOf(fixture) as HTMLElement;
    expect(panel.textContent).toContain('User task');
    expect(panel.textContent).toContain('Activity_approve');
    const name = panel.querySelector('input[type="text"]') as HTMLInputElement;
    expect(name.value).toBe('Approve');

    change(name, 'Approve order');
    await settle(fixture);
    expect(editor.exportXml()).toContain('name="Approve order"');
    editor.undo();
    await settle(fixture);
    expect(editor.exportXml()).toContain('name="Approve"');

    name.value = 'Discarded';
    keydown(name, 'Escape');
    expect(name.value).toBe('Approve');
    expect(editor.exportXml()).not.toContain('Discarded');
  });

  it('edits sequence-flow condition and default-flow checkbox', async () => {
    const { fixture, editor } = await render();
    editor.select(['Flow_yes']);
    await settle(fixture);
    const panel = panelOf(fixture) as HTMLElement;
    const condition = panel.querySelector('textarea') as HTMLTextAreaElement;
    expect(condition.value).toBe('amount > 100');
    change(condition, 'amount > 500');
    await settle(fixture);
    expect(editor.exportXml()).toContain('amount &gt; 500');

    // Source is an exclusive gateway, so the default-flow checkbox shows.
    const defaultFlow = panel.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement;
    expect(defaultFlow).toBeTruthy();
    expect(defaultFlow.checked).toBe(false); // Flow_no is the current default
    defaultFlow.checked = true;
    defaultFlow.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(fixture);
    expect(editor.exportXml()).toContain('default="Flow_yes"');
  });

  it('shows a count summary for multi-selections and a textarea for annotations', async () => {
    const { fixture, editor } = await render();
    editor.select(['StartEvent_1', 'Activity_approve']);
    await settle(fixture);
    expect(panelOf(fixture)?.textContent).toContain('2 elements selected');

    editor.select(['Note_1']);
    await settle(fixture);
    const text = panelOf(fixture)?.querySelector(
      'textarea',
    ) as HTMLTextAreaElement;
    expect(text.value).toBe('Check limits');
    change(text, 'Check credit limits');
    await settle(fixture);
    expect(editor.exportXml()).toContain('Check credit limits');
  });

  it('hides the panel in readOnly and behind showPropertiesPanel=false', async () => {
    const { fixture, host } = await render();
    expect(panelOf(fixture)).toBeTruthy();
    host.readOnly.set(true);
    await settle(fixture);
    expect(panelOf(fixture)).toBeNull();
    host.readOnly.set(false);
    host.showPanel.set(false);
    await settle(fixture);
    expect(panelOf(fixture)).toBeNull();
  });

  // ------------------------------------------------------------- clipboard

  it('copies and pastes clones with fresh ids at a growing offset', async () => {
    const { fixture, editor, wrap } = await render();
    editor.select(['StartEvent_1', 'Activity_approve']);
    await settle(fixture);

    keydown(wrap, 'c', { ctrlKey: true });
    await settle(fixture);
    expect(announcement(fixture)).toBe('3 element(s) copied');

    keydown(wrap, 'v', { ctrlKey: true });
    await settle(fixture);
    expect(el(fixture).querySelectorAll('.oge-bpmn-shape').length).toBe(7);
    expect(el(fixture).querySelectorAll('.oge-bpmn-edge').length).toBe(6);
    expect(announcement(fixture)).toBe('3 element(s) pasted');
    const firstPaste = editor.getSelection();
    expect(firstPaste.length).toBe(3);
    for (const id of firstPaste) {
      expect(['StartEvent_1', 'Activity_approve', 'Flow_s1']).not.toContain(id);
    }
    const xml = editor.exportXml();
    expect(xml).toContain('x="172" y="172"'); // StartEvent_1 +20/+20
    expect(xml).toContain('x="260" y="150"'); // Activity_approve +20/+20

    keydown(wrap, 'v', { ctrlKey: true });
    await settle(fixture);
    expect(el(fixture).querySelectorAll('.oge-bpmn-shape').length).toBe(9);
    expect(editor.exportXml()).toContain('x="192" y="192"'); // +40/+40
    // Every paste is one undo step.
    editor.undo();
    editor.undo();
    await settle(fixture);
    expect(el(fixture).querySelectorAll('.oge-bpmn-shape').length).toBe(5);
  });

  it('cuts with Ctrl+X and selects everything with Ctrl+A', async () => {
    const { fixture, editor, wrap } = await render();
    editor.select(['Activity_approve']);
    await settle(fixture);
    keydown(wrap, 'x', { ctrlKey: true });
    await settle(fixture);
    // Approve plus its three attached edges cascade away.
    expect(el(fixture).querySelectorAll('.oge-bpmn-shape').length).toBe(4);
    expect(announcement(fixture)).toBe('4 element(s) cut');
    keydown(wrap, 'v', { ctrlKey: true });
    await settle(fixture);
    expect(el(fixture).querySelectorAll('.oge-bpmn-shape').length).toBe(5);

    keydown(wrap, 'a', { ctrlKey: true });
    expect(editor.getSelection().length).toBe(
      el(fixture).querySelectorAll('.oge-bpmn-shape').length +
        el(fixture).querySelectorAll('.oge-bpmn-edge').length,
    );
  });

  it('readOnly blocks copy, cut and paste', async () => {
    const { fixture, editor, wrap, host } = await render();
    editor.select(['Activity_approve']);
    host.readOnly.set(true);
    await settle(fixture);
    keydown(wrap, 'c', { ctrlKey: true });
    keydown(wrap, 'v', { ctrlKey: true });
    keydown(wrap, 'x', { ctrlKey: true });
    await settle(fixture);
    expect(el(fixture).querySelectorAll('.oge-bpmn-shape').length).toBe(5);
    expect(editor.canUndo()).toBe(false);
  });

  // --------------------------------------------------------------- marquee

  it('marquee-selects intersecting nodes plus fully contained edges', async () => {
    const { fixture, editor } = await render();
    const svg = el(fixture).querySelector('.oge-bpmn-canvas') as SVGElement;

    svg.dispatchEvent(pointer('pointerdown', { clientX: 100, clientY: 100 }));
    document.dispatchEvent(
      pointer('pointermove', { clientX: 350, clientY: 220 }),
    );
    await settle(fixture);
    expect(el(fixture).querySelector('.oge-bpmn-marquee')).toBeTruthy();
    document.dispatchEvent(
      pointer('pointerup', { clientX: 350, clientY: 220 }),
    );
    await settle(fixture);

    expect(el(fixture).querySelector('.oge-bpmn-marquee')).toBeNull();
    // 2 of the 5 nodes intersect, plus the edge connecting them.
    expect(editor.getSelection()).toEqual([
      'StartEvent_1',
      'Activity_approve',
      'Flow_s1',
    ]);

    // Shift-marquee adds to the selection.
    svg.dispatchEvent(
      pointer('pointerdown', { clientX: 390, clientY: 120, shiftKey: true }),
    );
    document.dispatchEvent(
      pointer('pointermove', { clientX: 480, clientY: 220 }),
    );
    document.dispatchEvent(
      pointer('pointerup', { clientX: 480, clientY: 220 }),
    );
    await settle(fixture);
    expect(editor.getSelection()).toContain('Gateway_check');
    expect(editor.getSelection()).toContain('StartEvent_1');
  });

  it('a sub-3px press still clears the selection and Escape cancels a marquee', async () => {
    const { fixture, editor } = await render();
    editor.select(['Activity_approve']);
    await settle(fixture);
    const svg = el(fixture).querySelector('.oge-bpmn-canvas') as SVGElement;

    svg.dispatchEvent(pointer('pointerdown', { clientX: 600, clientY: 400 }));
    document.dispatchEvent(
      pointer('pointerup', { clientX: 601, clientY: 400 }),
    );
    await settle(fixture);
    expect(editor.getSelection()).toEqual([]);
    expect(announcement(fixture)).toBe('Selection cleared');

    editor.select(['Activity_approve']);
    await settle(fixture);
    svg.dispatchEvent(pointer('pointerdown', { clientX: 100, clientY: 100 }));
    document.dispatchEvent(
      pointer('pointermove', { clientX: 350, clientY: 220 }),
    );
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await settle(fixture);
    expect(el(fixture).querySelector('.oge-bpmn-marquee')).toBeNull();
    expect(editor.getSelection()).toEqual(['Activity_approve']);
  });

  // ------------------------------------------------------ edge-drag connect

  it('starts a connect drag from the shape border ring and commits on a valid target', async () => {
    const { fixture, editor } = await render();
    const ring = shapeOf(fixture, 'Activity_approve').querySelector(
      '.oge-bpmn-shape-ring',
    ) as SVGRectElement;
    expect(ring).toBeTruthy();

    ring.dispatchEvent(pointer('pointerdown', { clientX: 340, clientY: 170 }));
    document.dispatchEvent(
      pointer('pointermove', { clientX: 538, clientY: 170 }),
    );
    await settle(fixture);
    expect(el(fixture).querySelector('.oge-bpmn-rubber-band')).toBeTruthy();
    expect(
      shapeOf(fixture, 'EndEvent_1').classList.contains('oge-bpmn-drop-ok'),
    ).toBe(true);

    const before = el(fixture).querySelectorAll('.oge-bpmn-edge').length;
    document.dispatchEvent(
      pointer('pointerup', { clientX: 538, clientY: 170 }),
    );
    await settle(fixture);
    expect(el(fixture).querySelectorAll('.oge-bpmn-edge').length).toBe(
      before + 1,
    );
    expect(announcement(fixture)).toBe('Connected Approve to End event');
    expect(editor.canUndo()).toBe(true);
  });

  it('a plain click on the ring leaves the connect tool armed; readOnly renders no ring', async () => {
    const { fixture, host } = await render();
    const ring = shapeOf(fixture, 'Activity_approve').querySelector(
      '.oge-bpmn-shape-ring',
    ) as SVGRectElement;
    ring.dispatchEvent(pointer('pointerdown', { clientX: 340, clientY: 170 }));
    document.dispatchEvent(
      pointer('pointerup', { clientX: 340, clientY: 170 }),
    );
    await settle(fixture);
    expect(
      el(fixture)
        .querySelector('.oge-bpmn-canvas')
        ?.classList.contains('oge-bpmn-tool-connect'),
    ).toBe(true);

    host.readOnly.set(true);
    await settle(fixture);
    expect(el(fixture).querySelector('.oge-bpmn-shape-ring')).toBeNull();
  });

  // ------------------------------------------------------------ bend points

  it('drags a waypoint handle and commits manual waypoints once on release', async () => {
    const { fixture, editor } = await render();
    editor.select(['Flow_s1']);
    await settle(fixture);
    const handles = el(fixture).querySelectorAll('.oge-bpmn-bend-handle');
    expect(handles.length).toBe(2);

    handles[1].dispatchEvent(
      pointer('pointerdown', { clientX: 240, clientY: 170 }),
    );
    document.dispatchEvent(
      pointer('pointermove', { clientX: 240, clientY: 220 }),
    );
    await settle(fixture);
    expect(el(fixture).querySelector('.oge-bpmn-bend-preview')).toBeTruthy();
    // Model untouched mid-drag.
    expect(editor.exportXml()).toContain('<di:waypoint x="240" y="170" />');

    document.dispatchEvent(
      pointer('pointerup', { clientX: 240, clientY: 220 }),
    );
    await settle(fixture);
    expect(el(fixture).querySelector('.oge-bpmn-bend-preview')).toBeNull();
    expect(editor.exportXml()).toContain('<di:waypoint x="240" y="220" />');
    editor.undo();
    expect(editor.canUndo()).toBe(false); // exactly one step
    expect(editor.exportXml()).toContain('<di:waypoint x="240" y="170" />');
  });

  it('keeps hand-edited waypoints when both endpoints move together', async () => {
    const { fixture, editor, wrap } = await render();
    editor.select(['Flow_s1']);
    await settle(fixture);
    const handles = el(fixture).querySelectorAll('.oge-bpmn-bend-handle');
    handles[1].dispatchEvent(
      pointer('pointerdown', { clientX: 240, clientY: 170 }),
    );
    document.dispatchEvent(
      pointer('pointermove', { clientX: 240, clientY: 220 }),
    );
    document.dispatchEvent(
      pointer('pointerup', { clientX: 240, clientY: 220 }),
    );
    await settle(fixture);

    editor.select(['StartEvent_1', 'Activity_approve']);
    await settle(fixture);
    keydown(wrap, 'ArrowDown');
    await settle(fixture);
    // Translated, not re-routed: the manual bend moved by the grid step.
    expect(editor.exportXml()).toContain('<di:waypoint x="240" y="230" />');
  });

  it('double-click on an edge inserts a bend point at the click position', async () => {
    const { fixture, editor } = await render();
    const edge = el(fixture).querySelector(
      `g[id$="-el-Flow_s1"]`,
    ) as SVGGElement;
    edge.dispatchEvent(pointer('dblclick', { clientX: 214, clientY: 170 }));
    await settle(fixture);
    const xml = editor.exportXml();
    const waypoints = xml
      .split('\n')
      .filter((line) => line.includes('Flow_s1_di'))
      .join('');
    expect(waypoints).toContain('Flow_s1');
    expect(xml).toContain('<di:waypoint x="214" y="170" />');
  });

  // ------------------------------------------------------------- SVG export

  it('exportSvg returns a self-contained SVG of the current diagram', async () => {
    const { editor } = await render();
    const svg = editor.exportSvg();
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(
      true,
    );
    expect(svg).toContain('<polyline ');
    expect(svg).toContain('>Approve</text>');
    expect(svg).not.toContain('var(--');
  });
});
