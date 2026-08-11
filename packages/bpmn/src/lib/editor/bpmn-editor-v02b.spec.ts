import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { demoProcessXml } from '../engine/xml-fixtures';
import { OgeBpmnEditor } from './bpmn-editor';

@Component({
  imports: [OgeBpmnEditor],
  template: `<oge-bpmn-editor [readOnly]="readOnly()" />`,
})
class Host {
  readonly readOnly = signal(false);
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

function handles(fixture: ComponentFixture<unknown>): SVGRectElement[] {
  return Array.from(
    el(fixture).querySelectorAll<SVGRectElement>('.oge-bpmn-resize-handle'),
  );
}

function taskBounds(editor: OgeBpmnEditor): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  return editor.exportJson().diagram.shapeDi['Activity_approve'].bounds;
}

describe('OgeBpmnEditor — v0.2b customization pack', () => {
  async function render() {
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

  // ------------------------------------------------------------------ colors

  it('recolors via a preset swatch (fill only) and undoes it', async () => {
    const { fixture, editor } = await render();
    editor.select(['Activity_approve']);
    await settle(fixture);

    const swatch = el(fixture).querySelector(
      '.oge-bpmn-props-swatch',
    ) as HTMLButtonElement;
    expect(swatch).toBeTruthy();
    expect(swatch.getAttribute('aria-label')).toBe('Fill #fee2e2');
    swatch.click();
    await settle(fixture);

    expect(editor.exportXml()).toContain(
      'bpmnElement="Activity_approve" bioc:fill="#fee2e2"',
    );
    expect(editor.exportXml()).toContain('xmlns:bioc=');
    expect(announcement(fixture)).toBe('1 element(s) recolored');

    editor.undo();
    await settle(fixture);
    expect(editor.exportXml()).not.toContain('bioc');
  });

  it('recolors a multi-selection via the stroke color input and clears colors', async () => {
    const { fixture, editor } = await render();
    editor.select(['Activity_approve', 'Flow_s1']);
    await settle(fixture);

    const inputs = Array.from(
      el(fixture).querySelectorAll<HTMLInputElement>('.oge-bpmn-props-color'),
    );
    expect(inputs).toHaveLength(2);
    inputs[1].value = '#123456';
    inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
    await settle(fixture);

    const xml = editor.exportXml();
    expect(xml).toContain(
      'bpmnElement="Activity_approve" bioc:stroke="#123456"',
    );
    expect(xml).toContain('bpmnElement="Flow_s1" bioc:stroke="#123456"');
    expect(announcement(fixture)).toBe('2 element(s) recolored');
    // The rendered shape and edge carry the color as an inline style.
    expect(
      shapeOf(fixture, 'Activity_approve')
        .querySelector('.oge-bpmn-task')
        ?.getAttribute('style'),
    ).toContain('stroke: #123456');
    expect(
      shapeOf(fixture, 'Flow_s1')
        .querySelector('.oge-bpmn-edge-line')
        ?.getAttribute('style'),
    ).toContain('stroke: #123456');

    const clear = el(fixture).querySelector(
      '.oge-bpmn-props-clear',
    ) as HTMLButtonElement;
    clear.click();
    await settle(fixture);
    expect(editor.exportXml()).not.toContain('bioc');
  });

  // ------------------------------------------------------------------ resize

  it('shows corner handles only for a single resizable node', async () => {
    const { fixture, editor } = await render();
    editor.select(['Activity_approve']);
    await settle(fixture);
    expect(handles(fixture)).toHaveLength(4);

    editor.select(['StartEvent_1']); // events are not resizable
    await settle(fixture);
    expect(handles(fixture)).toHaveLength(0);

    editor.select(['Gateway_check']); // neither are gateways
    await settle(fixture);
    expect(handles(fixture)).toHaveLength(0);

    editor.select(['Note_1']); // text annotations are
    await settle(fixture);
    expect(handles(fixture)).toHaveLength(4);

    editor.select(['Activity_approve', 'Note_1']); // but not multi-selections
    await settle(fixture);
    expect(handles(fixture)).toHaveLength(0);
  });

  it('commits a corner-resize drag once on release, snapped to the grid', async () => {
    const { fixture, editor } = await render();
    editor.select(['Activity_approve']);
    await settle(fixture);

    const se = handles(fixture)[2]; // corners are nw, ne, se, sw
    se.dispatchEvent(pointer('pointerdown', { clientX: 340, clientY: 210 }));
    document.dispatchEvent(
      pointer('pointermove', { clientX: 383, clientY: 237 }),
    );
    await settle(fixture);
    // Ghost preview renders; the model is untouched mid-drag.
    expect(el(fixture).querySelector('.oge-bpmn-ghost')).toBeTruthy();
    expect(taskBounds(editor)).toEqual({
      x: 240,
      y: 130,
      width: 100,
      height: 80,
    });

    document.dispatchEvent(
      pointer('pointerup', { clientX: 383, clientY: 237 }),
    );
    await settle(fixture);
    expect(el(fixture).querySelector('.oge-bpmn-ghost')).toBeNull();
    expect(taskBounds(editor)).toEqual({
      x: 240,
      y: 130,
      width: 140,
      height: 110,
    });
    expect(announcement(fixture)).toBe('Approve resized');
    expect(editor.canUndo()).toBe(true);
    editor.undo();
    expect(editor.canUndo()).toBe(false); // exactly one undo step per gesture
    expect(taskBounds(editor)).toEqual({
      x: 240,
      y: 130,
      width: 100,
      height: 80,
    });
  });

  it('clamps a resize to the minimum size', async () => {
    const { fixture, editor } = await render();
    editor.select(['Activity_approve']);
    await settle(fixture);

    const se = handles(fixture)[2];
    se.dispatchEvent(pointer('pointerdown', { clientX: 340, clientY: 210 }));
    document.dispatchEvent(
      pointer('pointermove', { clientX: 100, clientY: 100 }),
    );
    document.dispatchEvent(
      pointer('pointerup', { clientX: 100, clientY: 100 }),
    );
    await settle(fixture);
    expect(taskBounds(editor)).toEqual({
      x: 240,
      y: 130,
      width: 80,
      height: 60,
    });
  });

  it('Escape cancels a resize drag without a command', async () => {
    const { fixture, editor } = await render();
    editor.select(['Activity_approve']);
    await settle(fixture);

    const se = handles(fixture)[2];
    se.dispatchEvent(pointer('pointerdown', { clientX: 340, clientY: 210 }));
    document.dispatchEvent(
      pointer('pointermove', { clientX: 400, clientY: 260 }),
    );
    await settle(fixture);
    expect(el(fixture).querySelector('.oge-bpmn-ghost')).toBeTruthy();

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await settle(fixture);
    expect(el(fixture).querySelector('.oge-bpmn-ghost')).toBeNull();
    expect(taskBounds(editor)).toEqual({
      x: 240,
      y: 130,
      width: 100,
      height: 80,
    });
    expect(editor.canUndo()).toBe(false);
  });

  // ------------------------------------------------------------------- morph

  it('morphs a node via the type select, keeping its edges, and undoes it', async () => {
    const { fixture, editor } = await render();
    editor.select(['StartEvent_1']);
    await settle(fixture);

    const select = el(fixture).querySelector(
      '.oge-bpmn-props-select',
    ) as HTMLSelectElement;
    expect(select).toBeTruthy();
    const options = Array.from(select.options);
    expect(options.map((o) => o.value)).toEqual([
      'startEvent',
      'endEvent',
      'intermediateThrowEvent',
      'intermediateCatchEvent',
    ]);
    // StartEvent_1 has an outgoing flow, so the end-event morph is disabled.
    const endOption = options.find((o) => o.value === 'endEvent');
    expect(endOption?.disabled).toBe(true);
    expect(endOption?.title).toBe('source-is-end-event');

    select.value = 'intermediateThrowEvent';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(fixture);

    expect(
      shapeOf(fixture, 'StartEvent_1').querySelector('.oge-bpmn-event-dot'),
    ).toBeTruthy();
    expect(editor.exportXml()).toContain(
      '<bpmn:intermediateThrowEvent id="StartEvent_1"',
    );
    expect(editor.exportXml()).toContain('sourceRef="StartEvent_1"'); // edge survived
    expect(announcement(fixture)).toBe('Start is now Intermediate throw event');

    editor.undo();
    await settle(fixture);
    expect(editor.exportXml()).toContain('<bpmn:startEvent id="StartEvent_1"');
    expect(
      shapeOf(fixture, 'StartEvent_1').querySelector('.oge-bpmn-event-dot'),
    ).toBeNull();
  });

  it('offers no type select for text annotations', async () => {
    const { fixture, editor } = await render();
    editor.select(['Note_1']);
    await settle(fixture);
    expect(el(fixture).querySelector('.oge-bpmn-props-select')).toBeNull();
    // ... but the appearance section still applies (annotations are colorable).
    expect(el(fixture).querySelector('.oge-bpmn-props-swatch')).toBeTruthy();
  });

  // ---------------------------------------------------------------- readOnly

  it('readOnly hides resize handles and the appearance/type controls', async () => {
    const { fixture, editor, host } = await render();
    editor.select(['Activity_approve']);
    await settle(fixture);
    expect(handles(fixture)).toHaveLength(4);

    host.readOnly.set(true);
    await settle(fixture);
    expect(handles(fixture)).toHaveLength(0);
    expect(el(fixture).querySelector('.oge-bpmn-props-swatch')).toBeNull();
    expect(el(fixture).querySelector('.oge-bpmn-props-select')).toBeNull();
  });
});
