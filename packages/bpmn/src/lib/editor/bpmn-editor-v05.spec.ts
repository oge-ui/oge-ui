import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeBpmnEditor } from './bpmn-editor';

@Component({
  imports: [OgeBpmnEditor],
  template: `<oge-bpmn-editor [showMinimap]="showMinimap()" />`,
})
class Host {
  readonly showMinimap = signal(true);
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

function key(name: string, init: KeyboardEventInit = {}): KeyboardEvent {
  return new KeyboardEvent('keydown', { key: name, bubbles: true, ...init });
}

function announcement(fixture: ComponentFixture<unknown>): string {
  return (
    el(fixture).querySelector('.oge-bpmn-live')?.textContent ?? ''
  ).trim();
}

function shapeOf(
  fixture: ComponentFixture<unknown>,
  id: string,
): SVGGElement | null {
  return el(fixture).querySelector(`g[id$="-el-${id}"]`);
}

function paletteButton(
  fixture: ComponentFixture<unknown>,
  label: string,
): HTMLButtonElement {
  const button = el(fixture).querySelector<HTMLButtonElement>(
    `.oge-bpmn-palette-btn[aria-label="${label}"]`,
  );
  if (!button) throw new Error(`expected palette button: ${label}`);
  return button;
}

function toolButton(
  fixture: ComponentFixture<unknown>,
  label: string,
): HTMLButtonElement {
  const button = el(fixture).querySelector<HTMLButtonElement>(
    `.oge-bpmn-tool-btn[aria-label="${label}"]`,
  );
  if (!button) throw new Error(`expected tool button: ${label}`);
  return button;
}

function viewportTransform(fixture: ComponentFixture<unknown>): string {
  return (
    el(fixture)
      .querySelector('.oge-bpmn-viewport')
      ?.getAttribute('transform') ?? ''
  );
}

describe('OgeBpmnEditor — v0.5 tools pack', () => {
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
    const canvas = el(fixture).querySelector('.oge-bpmn-canvas') as SVGElement;
    return { fixture, editor, wrap, canvas };
  }

  /** Places a palette item by click-then-place at viewport-identity coordinates. */
  async function place(
    fixture: ComponentFixture<unknown>,
    canvas: SVGElement,
    label: string,
    x: number,
    y: number,
  ): Promise<string> {
    paletteButton(fixture, label).click();
    await settle(fixture);
    canvas.dispatchEvent(pointer('pointerdown', { clientX: x, clientY: y }));
    await settle(fixture);
    const editor = fixture.debugElement.children[0]
      .componentInstance as OgeBpmnEditor;
    const m = editor.exportJson().diagram;
    return m.order[m.order.length - 1];
  }

  async function editLabel(
    fixture: ComponentFixture<unknown>,
    wrap: HTMLElement,
    editor: OgeBpmnEditor,
    id: string,
    text: string,
  ): Promise<void> {
    editor.select([id]);
    await settle(fixture);
    wrap.dispatchEvent(key('F2'));
    await settle(fixture);
    const area = el(fixture).querySelector(
      '.oge-bpmn-label-edit',
    ) as HTMLTextAreaElement;
    area.value = text;
    area.dispatchEvent(new Event('input', { bubbles: true }));
    area.dispatchEvent(key('Enter'));
    await settle(fixture);
  }

  // -------------------------------------------------------------- tool strip

  it('renders the tool strip with shortcut-annotated buttons', async () => {
    const { fixture } = await render();
    for (const label of [
      'Hand tool',
      'Lasso tool',
      'Space tool',
      'Global connect tool',
      'Search elements',
    ]) {
      expect(toolButton(fixture, label)).toBeTruthy();
    }
    expect(toolButton(fixture, 'Hand tool').title).toBe('Hand tool (H)');
    expect(toolButton(fixture, 'Space tool').title).toBe('Space tool (S)');
  });

  it('H arms the hand tool, drag pans, Escape returns to select', async () => {
    const { fixture, wrap, canvas } = await render();
    wrap.dispatchEvent(key('h'));
    await settle(fixture);
    expect(toolButton(fixture, 'Hand tool').getAttribute('aria-pressed')).toBe(
      'true',
    );
    canvas.dispatchEvent(
      pointer('pointerdown', { clientX: 100, clientY: 100 }),
    );
    document.dispatchEvent(
      pointer('pointermove', { clientX: 150, clientY: 130 }),
    );
    document.dispatchEvent(pointer('pointerup'));
    await settle(fixture);
    expect(viewportTransform(fixture)).toBe('translate(50 30) scale(1)');
    wrap.dispatchEvent(key('Escape'));
    await settle(fixture);
    expect(toolButton(fixture, 'Hand tool').getAttribute('aria-pressed')).toBe(
      'false',
    );
  });

  it('lasso tool marquees even when the drag starts on a shape', async () => {
    const { fixture, editor, wrap, canvas } = await render();
    const a = await place(fixture, canvas, 'Task', 200, 200);
    const b = await place(fixture, canvas, 'Task', 400, 200);
    wrap.dispatchEvent(key('l'));
    await settle(fixture);
    // Start the marquee ON shape a and stretch it over both tasks.
    shapeOf(fixture, a)?.dispatchEvent(
      pointer('pointerdown', { clientX: 140, clientY: 150 }),
    );
    document.dispatchEvent(
      pointer('pointermove', { clientX: 460, clientY: 250 }),
    );
    document.dispatchEvent(pointer('pointerup'));
    await settle(fixture);
    expect([...editor.getSelection()].sort()).toEqual([a, b].sort());
  });

  it('space tool shifts elements beyond the drag origin and undoes as one step', async () => {
    const { fixture, editor, wrap, canvas } = await render();
    const a = await place(fixture, canvas, 'Task', 200, 200);
    const b = await place(fixture, canvas, 'Task', 500, 200);
    wrap.dispatchEvent(key('s'));
    await settle(fixture);
    canvas.dispatchEvent(
      pointer('pointerdown', { clientX: 300, clientY: 300 }),
    );
    document.dispatchEvent(
      pointer('pointermove', { clientX: 400, clientY: 305 }),
    );
    document.dispatchEvent(pointer('pointerup'));
    await settle(fixture);
    let m = editor.exportJson().diagram;
    expect(m.shapeDi[a].bounds.x).toBe(150);
    expect(m.shapeDi[b].bounds.x).toBe(550);
    expect(announcement(fixture)).toBe('1 element(s) shifted');
    editor.undo();
    await settle(fixture);
    m = editor.exportJson().diagram;
    expect(m.shapeDi[b].bounds.x).toBe(450);
  });

  it('global connect connects a clicked source to a clicked target', async () => {
    const { fixture, editor, canvas } = await render();
    const a = await place(fixture, canvas, 'Task', 200, 200);
    const b = await place(fixture, canvas, 'Task', 500, 200);
    toolButton(fixture, 'Global connect tool').click();
    await settle(fixture);
    shapeOf(fixture, a)?.dispatchEvent(
      pointer('pointerdown', { clientX: 200, clientY: 200 }),
    );
    await settle(fixture);
    shapeOf(fixture, b)?.dispatchEvent(
      pointer('pointerdown', { clientX: 500, clientY: 200 }),
    );
    await settle(fixture);
    const m = editor.exportJson().diagram;
    const edge = Object.values(m.edges).find(
      (e) => e.sourceRef === a && e.targetRef === b,
    );
    expect(edge?.type).toBe('sequenceFlow');
  });

  // ------------------------------------------------------ palette drag-to-canvas

  it('drags a palette entry onto the canvas and creates the node on release', async () => {
    const { fixture, editor } = await render();
    paletteButton(fixture, 'Task').dispatchEvent(
      pointer('pointerdown', { clientX: 10, clientY: 100 }),
    );
    document.dispatchEvent(
      pointer('pointermove', { clientX: 300, clientY: 300 }),
    );
    await settle(fixture);
    expect(el(fixture).querySelector('.oge-bpmn-ghost')).toBeTruthy();
    document.dispatchEvent(pointer('pointerup'));
    await settle(fixture);
    const m = editor.exportJson().diagram;
    const task = Object.values(m.nodes).find((n) => n.type === 'task');
    expect(task).toBeDefined();
    expect(m.shapeDi[(task as { id: string }).id].bounds).toMatchObject({
      x: 250,
      y: 260,
    });
  });

  it('a sub-threshold palette press creates nothing (click-then-place stays)', async () => {
    const { fixture, editor } = await render();
    paletteButton(fixture, 'Task').dispatchEvent(
      pointer('pointerdown', { clientX: 10, clientY: 100 }),
    );
    document.dispatchEvent(pointer('pointerup'));
    await settle(fixture);
    expect(editor.exportJson().diagram.order).toHaveLength(0);
  });

  // ------------------------------------------- bendpoint remove & segment drag

  it('double-click on a bend handle removes the waypoint (endpoints stay)', async () => {
    const { fixture, editor, canvas, wrap } = await render();
    const a = await place(fixture, canvas, 'Task', 200, 200);
    const b = await place(fixture, canvas, 'Task', 500, 200);
    editor.select([a]);
    await settle(fixture);
    wrap.dispatchEvent(key('c'));
    await settle(fixture);
    shapeOf(fixture, b)?.dispatchEvent(
      pointer('pointerdown', { clientX: 500, clientY: 200 }),
    );
    await settle(fixture);
    const edgeId = editor.getSelection()[0];
    // Insert a bend point via the existing edge double-click.
    shapeOf(fixture, edgeId)?.dispatchEvent(
      pointer('dblclick', { clientX: 350, clientY: 200 }),
    );
    await settle(fixture);
    let di = editor.exportJson().diagram.edgeDi[edgeId];
    expect(di.waypoints).toHaveLength(3);
    const handles = el(fixture).querySelectorAll('.oge-bpmn-bend-handle');
    expect(handles).toHaveLength(3);
    // Endpoint handles are not removable.
    handles[0].dispatchEvent(pointer('dblclick'));
    await settle(fixture);
    expect(editor.exportJson().diagram.edgeDi[edgeId].waypoints).toHaveLength(
      3,
    );
    // The middle handle is.
    handles[1].dispatchEvent(pointer('dblclick'));
    await settle(fixture);
    di = editor.exportJson().diagram.edgeDi[edgeId];
    expect(di.waypoints).toHaveLength(2);
    expect(announcement(fixture)).toBe('Waypoint removed');
  });

  it('drags an edge segment perpendicular, inserting dock waypoints on end segments', async () => {
    const { fixture, editor, canvas, wrap } = await render();
    const a = await place(fixture, canvas, 'Task', 200, 200);
    const b = await place(fixture, canvas, 'Task', 500, 200);
    editor.select([a]);
    await settle(fixture);
    wrap.dispatchEvent(key('c'));
    await settle(fixture);
    shapeOf(fixture, b)?.dispatchEvent(
      pointer('pointerdown', { clientX: 500, clientY: 200 }),
    );
    await settle(fixture);
    const edgeId = editor.getSelection()[0];
    const before = editor.exportJson().diagram.edgeDi[edgeId].waypoints;
    expect(before).toHaveLength(2);
    // Second press on the selected edge starts the segment drag.
    shapeOf(fixture, edgeId)?.dispatchEvent(
      pointer('pointerdown', { clientX: 350, clientY: 200 }),
    );
    document.dispatchEvent(
      pointer('pointermove', { clientX: 350, clientY: 260 }),
    );
    document.dispatchEvent(pointer('pointerup'));
    await settle(fixture);
    const di = editor.exportJson().diagram.edgeDi[edgeId];
    expect(di.manual).toBe(true);
    expect(di.waypoints).toEqual([
      { x: before[0].x, y: before[0].y },
      { x: before[0].x, y: before[0].y + 60 },
      { x: before[1].x, y: before[1].y + 60 },
      { x: before[1].x, y: before[1].y },
    ]);
  });

  // --------------------------------------------------------------- label drag

  it('drags an external event label and stores DI labelBounds', async () => {
    const { fixture, editor, canvas, wrap } = await render();
    const id = await place(fixture, canvas, 'Start event', 200, 200);
    await editLabel(fixture, wrap, editor, id, 'Go');
    const label = el(fixture).querySelector(
      `.oge-bpmn-label[data-owner="${id}"]`,
    ) as SVGTextElement;
    expect(label).toBeTruthy();
    label.dispatchEvent(pointer('pointerdown', { clientX: 200, clientY: 240 }));
    document.dispatchEvent(
      pointer('pointermove', { clientX: 230, clientY: 260 }),
    );
    document.dispatchEvent(pointer('pointerup'));
    await settle(fixture);
    // Estimate {155, 220, 90, 20} translated by (30, 20).
    expect(editor.exportJson().diagram.shapeDi[id].labelBounds).toEqual({
      x: 185,
      y: 240,
      width: 90,
      height: 20,
    });
    expect(announcement(fixture)).toBe('Go label moved');
    expect(editor.exportXml()).toContain('<bpmndi:BPMNLabel>');
  });

  // ------------------------------------------------------------------- search

  it('Ctrl+F searches, dims non-matches and Enter selects + centers', async () => {
    const { fixture, editor, canvas, wrap } = await render();
    const a = await place(fixture, canvas, 'Task', 200, 200);
    const b = await place(fixture, canvas, 'Task', 500, 300);
    await editLabel(fixture, wrap, editor, a, 'Approve');
    wrap.dispatchEvent(key('f', { ctrlKey: true }));
    await settle(fixture);
    const input = el(fixture).querySelector(
      '.oge-bpmn-search-input',
    ) as HTMLInputElement;
    expect(input).toBeTruthy();
    input.value = 'appr';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    expect(
      el(fixture).querySelectorAll('.oge-bpmn-search-result'),
    ).toHaveLength(1);
    expect(announcement(fixture)).toBe('1 result(s)');
    expect(shapeOf(fixture, b)?.classList.contains('oge-bpmn-dimmed')).toBe(
      true,
    );
    expect(shapeOf(fixture, a)?.classList.contains('oge-bpmn-dimmed')).toBe(
      false,
    );
    input.dispatchEvent(key('Enter'));
    await settle(fixture);
    expect(editor.getSelection()).toEqual([a]);
    // Centered: element center (200,200) at canvas center (400,300), zoom 1.
    expect(viewportTransform(fixture)).toBe('translate(200 100) scale(1)');
    expect(el(fixture).querySelector('.oge-bpmn-search')).toBeNull();
    expect(shapeOf(fixture, b)?.classList.contains('oge-bpmn-dimmed')).toBe(
      false,
    );
  });

  it('Escape closes the search overlay without touching the selection', async () => {
    const { fixture, canvas, wrap } = await render();
    await place(fixture, canvas, 'Task', 200, 200);
    wrap.dispatchEvent(key('f', { ctrlKey: true }));
    await settle(fixture);
    const input = el(fixture).querySelector(
      '.oge-bpmn-search-input',
    ) as HTMLInputElement;
    input.dispatchEvent(key('Escape'));
    await settle(fixture);
    expect(el(fixture).querySelector('.oge-bpmn-search')).toBeNull();
  });

  // ------------------------------------------------------------------ minimap

  it('shows the minimap only for non-empty diagrams and pans on click', async () => {
    const { fixture, canvas } = await render();
    expect(el(fixture).querySelector('.oge-bpmn-minimap')).toBeNull();
    await place(fixture, canvas, 'Task', 400, 300);
    expect(el(fixture).querySelector('.oge-bpmn-minimap')).toBeTruthy();
    const svg = el(fixture).querySelector(
      '.oge-bpmn-minimap svg',
    ) as SVGSVGElement;
    svg.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        right: 180,
        bottom: 120,
        width: 180,
        height: 120,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    // Task bounds 350/260 100×80 → scale 1, offset (-310, -240): clicking the
    // minimap point of diagram (350, 260) centers it in the 800×600 canvas.
    svg.dispatchEvent(pointer('pointerdown', { clientX: 40, clientY: 20 }));
    document.dispatchEvent(pointer('pointerup'));
    await settle(fixture);
    expect(viewportTransform(fixture)).toBe('translate(50 40) scale(1)');
  });

  it('hides the minimap when showMinimap is false', async () => {
    const { fixture, canvas } = await render();
    await place(fixture, canvas, 'Task', 400, 300);
    (fixture.componentInstance as Host).showMinimap.set(false);
    await settle(fixture);
    expect(el(fixture).querySelector('.oge-bpmn-minimap')).toBeNull();
  });

  // ----------------------------------------------------------------- overlays

  it('addOverlay renders a positioned badge; remove and element deletion hide it', async () => {
    const { fixture, editor, canvas, wrap } = await render();
    const id = await place(fixture, canvas, 'Task', 400, 300);
    const handle = editor.addOverlay({
      elementId: id,
      html: '<b>3</b>',
      position: 'top-left',
    });
    await settle(fixture);
    const badge = el(fixture).querySelector('.oge-bpmn-overlay') as HTMLElement;
    expect(badge).toBeTruthy();
    expect(badge.style.left).toBe('350px');
    expect(badge.style.top).toBe('260px');
    expect(badge.querySelector('b')?.textContent).toBe('3');
    const second = editor.addOverlay({
      elementId: id,
      html: 'x',
      position: 'bottom-right',
      offset: { x: 5, y: -5 },
    });
    await settle(fixture);
    const badges =
      el(fixture).querySelectorAll<HTMLElement>('.oge-bpmn-overlay');
    expect(badges).toHaveLength(2);
    expect(badges[1].style.left).toBe('455px');
    expect(badges[1].style.top).toBe('335px');
    editor.removeOverlay(second);
    await settle(fixture);
    expect(el(fixture).querySelectorAll('.oge-bpmn-overlay')).toHaveLength(1);
    // Deleting the element hides the remaining badge without removing it.
    editor.select([id]);
    await settle(fixture);
    wrap.dispatchEvent(key('Delete'));
    await settle(fixture);
    expect(el(fixture).querySelectorAll('.oge-bpmn-overlay')).toHaveLength(0);
    editor.undo();
    await settle(fixture);
    expect(el(fixture).querySelectorAll('.oge-bpmn-overlay')).toHaveLength(1);
    editor.clearOverlays();
    await settle(fixture);
    expect(el(fixture).querySelectorAll('.oge-bpmn-overlay')).toHaveLength(0);
    expect(handle).toContain('overlay-');
  });

  // ------------------------------------------------------- align & distribute

  it('aligns and distributes a multi-selection via the pad flyout', async () => {
    const { fixture, editor, canvas } = await render();
    const a = await place(fixture, canvas, 'Task', 200, 200);
    const b = await place(fixture, canvas, 'Task', 400, 260);
    const c = await place(fixture, canvas, 'Task', 600, 420);
    editor.select([a, b, c]);
    await settle(fixture);
    const toggle = el(fixture).querySelector(
      'button[aria-label="Align elements"]',
    ) as HTMLButtonElement;
    expect(toggle).toBeTruthy();
    toggle.click();
    await settle(fixture);
    (
      el(fixture).querySelector(
        'button[aria-label="Align top"]',
      ) as HTMLButtonElement
    ).click();
    await settle(fixture);
    let m = editor.exportJson().diagram;
    expect(m.shapeDi[a].bounds.y).toBe(160);
    expect(m.shapeDi[b].bounds.y).toBe(160);
    expect(m.shapeDi[c].bounds.y).toBe(160);
    expect(announcement(fixture)).toBe('2 element(s) aligned');

    // Distribute vertically after moving them apart again.
    editor.undo();
    await settle(fixture);
    editor.select([a, b, c]);
    await settle(fixture);
    (
      el(fixture).querySelector(
        'button[aria-label="Align elements"]',
      ) as HTMLButtonElement
    ).click();
    await settle(fixture);
    const distribute = el(fixture).querySelector(
      'button[aria-label="Distribute vertically"]',
    ) as HTMLButtonElement;
    expect(distribute.disabled).toBe(false);
    distribute.click();
    await settle(fixture);
    m = editor.exportJson().diagram;
    // y centers 200, 260, 420 → middle target 310.
    expect(m.shapeDi[b].bounds.y).toBe(270);
    expect(announcement(fixture)).toBe('1 element(s) distributed');
  });

  it('disables distribution below 3 elements and hides the pad below 2', async () => {
    const { fixture, editor, canvas } = await render();
    const a = await place(fixture, canvas, 'Task', 200, 200);
    const b = await place(fixture, canvas, 'Task', 400, 260);
    editor.select([a, b]);
    await settle(fixture);
    const toggle = el(fixture).querySelector(
      'button[aria-label="Align elements"]',
    ) as HTMLButtonElement;
    toggle.click();
    await settle(fixture);
    expect(
      (
        el(fixture).querySelector(
          'button[aria-label="Distribute horizontally"]',
        ) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    editor.select([a]);
    await settle(fixture);
    expect(
      el(fixture).querySelector('button[aria-label="Align elements"]'),
    ).toBeNull();
  });
});
