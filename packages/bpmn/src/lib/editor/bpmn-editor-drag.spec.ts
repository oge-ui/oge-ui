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

function shapeOf(fixture: ComponentFixture<unknown>, id: string): SVGGElement {
  const shape = el(fixture).querySelector(`g[id$="-el-${id}"]`);
  if (!shape) throw new Error(`expected rendered element: ${id}`);
  return shape as SVGGElement;
}

function announcement(fixture: ComponentFixture<unknown>): string {
  return (
    el(fixture).querySelector('.oge-bpmn-live')?.textContent ?? ''
  ).trim();
}

describe('OgeBpmnEditor — pointer gestures', () => {
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
    return { fixture, editor, wrap };
  }

  it('commits a move drag once on release, ghost-previewing in between', async () => {
    const { fixture, editor } = await render();
    const shape = shapeOf(fixture, 'Activity_approve');

    shape.dispatchEvent(pointer('pointerdown', { clientX: 290, clientY: 170 }));
    await settle(fixture);
    expect(editor.getSelection()).toEqual(['Activity_approve']);
    expect(editor.canUndo()).toBe(false);

    document.dispatchEvent(
      pointer('pointermove', { clientX: 340, clientY: 170 }),
    );
    await settle(fixture);
    // Ghost preview renders; the model is untouched mid-drag.
    expect(el(fixture).querySelector('.oge-bpmn-ghost')).toBeTruthy();
    expect(editor.exportXml()).toContain('x="240" y="130"');

    document.dispatchEvent(
      pointer('pointermove', { clientX: 390, clientY: 170 }),
    );
    document.dispatchEvent(
      pointer('pointerup', { clientX: 390, clientY: 170 }),
    );
    await settle(fixture);

    expect(el(fixture).querySelector('.oge-bpmn-ghost')).toBeNull();
    expect(editor.exportXml()).toContain('x="340" y="130"');
    expect(announcement(fixture)).toBe('Approve moved');
    expect(editor.canUndo()).toBe(true);
    editor.undo();
    expect(editor.canUndo()).toBe(false); // exactly one undo step per gesture
    expect(editor.exportXml()).toContain('x="240" y="130"');
  });

  it('Escape mid-drag cancels the gesture without a command', async () => {
    const { fixture, editor } = await render();
    const shape = shapeOf(fixture, 'Activity_approve');

    shape.dispatchEvent(pointer('pointerdown', { clientX: 290, clientY: 170 }));
    document.dispatchEvent(
      pointer('pointermove', { clientX: 360, clientY: 200 }),
    );
    await settle(fixture);
    expect(el(fixture).querySelector('.oge-bpmn-ghost')).toBeTruthy();

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await settle(fixture);

    expect(el(fixture).querySelector('.oge-bpmn-ghost')).toBeNull();
    expect(editor.exportXml()).toContain('x="240" y="130"');
    expect(editor.canUndo()).toBe(false);

    // A later pointerup must not commit either — listeners are gone.
    document.dispatchEvent(
      pointer('pointerup', { clientX: 360, clientY: 200 }),
    );
    await settle(fixture);
    expect(editor.canUndo()).toBe(false);
  });

  it('connects two elements through the context pad connect tool', async () => {
    const { fixture, editor } = await render();
    const source = shapeOf(fixture, 'Activity_approve');
    source.dispatchEvent(
      pointer('pointerdown', { clientX: 290, clientY: 170 }),
    );
    document.dispatchEvent(
      pointer('pointerup', { clientX: 290, clientY: 170 }),
    );
    await settle(fixture);

    const pad = el(fixture).querySelector(
      '.oge-bpmn-context-pad',
    ) as HTMLElement;
    (pad.querySelector('[aria-label="Connect"]') as HTMLButtonElement).click();
    await settle(fixture);

    // Hovering a valid target marks it, and the rubber band previews the route.
    const svg = el(fixture).querySelector('.oge-bpmn-canvas') as SVGElement;
    svg.dispatchEvent(pointer('pointermove', { clientX: 538, clientY: 170 }));
    await settle(fixture);
    expect(el(fixture).querySelector('.oge-bpmn-rubber-band')).toBeTruthy();
    expect(
      shapeOf(fixture, 'EndEvent_1').classList.contains('oge-bpmn-drop-ok'),
    ).toBe(true);

    const before = el(fixture).querySelectorAll('.oge-bpmn-edge').length;
    shapeOf(fixture, 'EndEvent_1').dispatchEvent(
      pointer('pointerdown', { clientX: 538, clientY: 170 }),
    );
    await settle(fixture);

    expect(el(fixture).querySelectorAll('.oge-bpmn-edge').length).toBe(
      before + 1,
    );
    expect(announcement(fixture)).toBe('Connected Approve to End event');
    expect(el(fixture).querySelector('.oge-bpmn-rubber-band')).toBeNull();
    expect(editor.getSelection().length).toBe(1);
  });

  it('announces a denied connection and adds no edge', async () => {
    const { fixture, editor } = await render();
    editor.select(['Activity_approve']);
    await settle(fixture);
    const pad = el(fixture).querySelector(
      '.oge-bpmn-context-pad',
    ) as HTMLElement;
    (pad.querySelector('[aria-label="Connect"]') as HTMLButtonElement).click();
    await settle(fixture);

    // Hovering the start event flags the target as invalid.
    const svg = el(fixture).querySelector('.oge-bpmn-canvas') as SVGElement;
    svg.dispatchEvent(pointer('pointermove', { clientX: 170, clientY: 170 }));
    await settle(fixture);
    expect(
      shapeOf(fixture, 'StartEvent_1').classList.contains('oge-bpmn-drop-deny'),
    ).toBe(true);

    const before = el(fixture).querySelectorAll('.oge-bpmn-edge').length;
    shapeOf(fixture, 'StartEvent_1').dispatchEvent(
      pointer('pointerdown', { clientX: 170, clientY: 170 }),
    );
    await settle(fixture);

    expect(el(fixture).querySelectorAll('.oge-bpmn-edge').length).toBe(before);
    expect(announcement(fixture)).toBe('Connection not allowed');
    expect(editor.canUndo()).toBe(false);
  });

  it('readOnly still allows selecting but never starts a move drag', async () => {
    const { fixture, editor } = await render();
    (fixture.componentInstance as Host).readOnly.set(true);
    await settle(fixture);
    const shape = shapeOf(fixture, 'Activity_approve');
    shape.dispatchEvent(pointer('pointerdown', { clientX: 290, clientY: 170 }));
    document.dispatchEvent(
      pointer('pointermove', { clientX: 390, clientY: 170 }),
    );
    document.dispatchEvent(
      pointer('pointerup', { clientX: 390, clientY: 170 }),
    );
    await settle(fixture);

    expect(editor.getSelection()).toEqual(['Activity_approve']);
    expect(editor.exportXml()).toContain('x="240" y="130"');
    expect(editor.canUndo()).toBe(false);
  });
});
