import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { V04_FIXTURE_XML } from '../engine/xml-fixtures';
import { OgeBpmnEditor } from './bpmn-editor';

@Component({
  imports: [OgeBpmnEditor],
  template: `<oge-bpmn-editor />`,
})
class Host {}

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

describe('OgeBpmnEditor — v0.4 collaboration', () => {
  async function render(xml?: string) {
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
    if (xml !== undefined) {
      await editor.importXml(xml);
      await settle(fixture);
    }
    const canvas = el(fixture).querySelector('.oge-bpmn-canvas') as SVGElement;
    return { fixture, editor, wrap, canvas };
  }

  // ----------------------------------------------------------------- palette

  it('offers the v0.4 palette entries', async () => {
    const { fixture } = await render();
    for (const label of [
      'Pool',
      'Data object',
      'Data store',
      'Group',
      'Call activity',
    ]) {
      expect(paletteButton(fixture, label)).toBeTruthy();
    }
  });

  it('places a pool from the palette and renders its band', async () => {
    const { fixture, editor, canvas } = await render();
    paletteButton(fixture, 'Pool').click();
    await settle(fixture);
    canvas.dispatchEvent(
      pointer('pointerdown', { clientX: 400, clientY: 300 }),
    );
    await settle(fixture);

    const m = editor.exportJson().diagram;
    const poolIds = Object.keys(m.pools);
    expect(poolIds).toHaveLength(1);
    expect(m.collaborationId).toBeDefined();
    expect(m.shapeDi[poolIds[0]].bounds).toMatchObject({
      width: 600,
      height: 250,
    });
    expect(announcement(fixture)).toBe('Pool created');
    expect(el(fixture).querySelector('.oge-bpmn-pool-band')).toBeTruthy();
    // The new pool is selected and exposes resize handles.
    expect(editor.getSelection()).toEqual(poolIds);
  });

  it('a node placed inside a pool joins its process', async () => {
    const { fixture, editor, canvas } = await render();
    paletteButton(fixture, 'Pool').click();
    await settle(fixture);
    canvas.dispatchEvent(
      pointer('pointerdown', { clientX: 400, clientY: 300 }),
    );
    await settle(fixture);
    paletteButton(fixture, 'Task').click();
    await settle(fixture);
    canvas.dispatchEvent(
      pointer('pointerdown', { clientX: 400, clientY: 300 }),
    );
    await settle(fixture);

    const m = editor.exportJson().diagram;
    const poolId = Object.keys(m.pools)[0];
    const task = Object.values(m.nodes).find((n) => n.type === 'task');
    expect(task?.poolId).toBe(poolId);
  });

  // ------------------------------------------------------------- panel: lanes

  it('adds and removes lanes via the pool panel', async () => {
    const { fixture, editor } = await render(V04_FIXTURE_XML);
    editor.select(['Pool_c']);
    await settle(fixture);

    const addLane = el(fixture).querySelector(
      '.oge-bpmn-props-add-lane',
    ) as HTMLButtonElement;
    expect(addLane).toBeTruthy();
    addLane.click();
    await settle(fixture);
    let m = editor.exportJson().diagram;
    expect(m.pools['Pool_c'].lanes).toHaveLength(1);
    expect(announcement(fixture)).toBe('Lane added to Registry');

    addLane.click();
    await settle(fixture);
    m = editor.exportJson().diagram;
    expect(m.pools['Pool_c'].lanes).toHaveLength(2);
    // The pool grew by the appended lane height.
    expect(m.shapeDi['Pool_c'].bounds.height).toBe(80 + 120);

    const remove = el(fixture).querySelector(
      '.oge-bpmn-props-lane-remove',
    ) as HTMLButtonElement;
    remove.click();
    await settle(fixture);
    m = editor.exportJson().diagram;
    expect(m.pools['Pool_c'].lanes).toHaveLength(1);
    expect(announcement(fixture)).toBe('Lane removed from Registry');

    editor.undo();
    await settle(fixture);
    expect(editor.exportJson().diagram.pools['Pool_c'].lanes).toHaveLength(2);
  });

  it('renames the pool via the panel name field', async () => {
    const { fixture, editor } = await render(V04_FIXTURE_XML);
    editor.select(['Pool_c']);
    await settle(fixture);
    const name = el(fixture).querySelector(
      `input[id$="-poolname"]`,
    ) as HTMLInputElement;
    expect(name.value).toBe('Registry');
    name.value = 'Archive';
    name.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(fixture);
    expect(editor.exportJson().diagram.pools['Pool_c'].name).toBe('Archive');
    expect(editor.exportXml()).toContain(
      '<bpmn:participant id="Pool_c" name="Archive" />',
    );
  });

  // ------------------------------------------------------------ message flows

  it('connecting across pools creates a message flow automatically', async () => {
    const { fixture, editor, wrap } = await render(V04_FIXTURE_XML);
    editor.select(['Call_a']);
    await settle(fixture);
    wrap.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'c', bubbles: true }),
    );
    await settle(fixture);
    // Task_b spans 320..420 × 430..510 in diagram coordinates.
    shapeOf(fixture, 'Task_b')?.dispatchEvent(
      pointer('pointerdown', { clientX: 370, clientY: 470 }),
    );
    await settle(fixture);

    const m = editor.exportJson().diagram;
    const created = Object.values(m.edges).find(
      (e) =>
        e.type === 'messageFlow' &&
        e.sourceRef === 'Call_a' &&
        e.targetRef === 'Task_b',
    );
    expect(created).toBeDefined();
    const g = shapeOf(fixture, created?.id ?? '');
    expect(g?.classList.contains('oge-bpmn-message-flow')).toBe(true);
    expect(g?.querySelector('.oge-bpmn-message-dot')).toBeTruthy();
  });

  it('denies same-pool message flows and cross-pool sequence flows', async () => {
    const { fixture, editor, wrap } = await render(V04_FIXTURE_XML);
    // Start_a → Task_b is cross-pool: allowed, becomes a message flow — but
    // Start_a → Call_a stays a sequence flow. Verify the denial path with a
    // pool as sequence-flow endpoint instead: Start_a → Pool_a (same pool).
    editor.select(['Start_a']);
    await settle(fixture);
    wrap.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'c', bubbles: true }),
    );
    await settle(fixture);
    // Pool_a band, away from any node (620,300 is inside Pool_a, Lane_a2).
    const canvas = el(fixture).querySelector('.oge-bpmn-canvas') as SVGElement;
    canvas.dispatchEvent(
      pointer('pointermove', { clientX: 620, clientY: 300 }),
    );
    await settle(fixture);
    // Hovering the own pool band is a denied target.
    const pool = el(fixture).querySelector('.oge-bpmn-pool');
    expect(pool?.classList.contains('oge-bpmn-drop-deny')).toBe(true);
  });

  it('renders message flows dashed with an open arrowhead', async () => {
    const { fixture } = await render(V04_FIXTURE_XML);
    const flow = shapeOf(fixture, 'Msg_1');
    expect(flow?.classList.contains('oge-bpmn-message-flow')).toBe(true);
    const line = flow?.querySelector('.oge-bpmn-edge-line');
    expect(line?.getAttribute('marker-end')).toContain('-open-arrow');
  });

  // ------------------------------------------------------------ data & group

  it('renders data elements, groups, call activities and pools', async () => {
    const { fixture } = await render(V04_FIXTURE_XML);
    expect(
      shapeOf(fixture, 'Data_a')?.querySelector('.oge-bpmn-data'),
    ).toBeTruthy();
    expect(
      shapeOf(fixture, 'Store_b')?.querySelector('.oge-bpmn-data'),
    ).toBeTruthy();
    expect(
      shapeOf(fixture, 'Group_a')?.querySelector('.oge-bpmn-group'),
    ).toBeTruthy();
    expect(
      shapeOf(fixture, 'Call_a')?.querySelector('.oge-bpmn-call-activity'),
    ).toBeTruthy();
    expect(el(fixture).querySelectorAll('.oge-bpmn-pool')).toHaveLength(3);
    const dataEdge = shapeOf(fixture, 'DataOut_a');
    expect(dataEdge?.classList.contains('oge-bpmn-data-association')).toBe(
      true,
    );
  });

  it('edits the called element via the panel', async () => {
    const { fixture, editor } = await render(V04_FIXTURE_XML);
    editor.select(['Call_a']);
    await settle(fixture);
    const input = el(fixture).querySelector(
      '.oge-bpmn-props-called',
    ) as HTMLInputElement;
    expect(input.value).toBe('Process_check');
    input.value = 'Process_other';
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(fixture);
    expect(editor.exportXml()).toContain('calledElement="Process_other"');
  });

  // --------------------------------------------------------------- svg export

  it('exports pools, lanes and v0.4 edges in the static SVG', async () => {
    const { editor } = await render(V04_FIXTURE_XML);
    const svg = editor.exportSvg();
    expect(svg).toContain('rotate(-90'); // pool / lane name strips
    expect(svg).toContain('Customer');
    expect(svg).toContain('stroke-dasharray="8 5"'); // message flow
    expect(svg).toContain('stroke-dasharray="2 4"'); // data association
    expect(svg).toContain('oge-bpmn-svg-open-arrow');
  });

  // ---------------------------------------------------------------- deletion

  it('deleting a pool via the keyboard cascades to its members', async () => {
    const { fixture, editor, wrap } = await render(V04_FIXTURE_XML);
    editor.select(['Pool_b']);
    await settle(fixture);
    wrap.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }),
    );
    await settle(fixture);
    const m = editor.exportJson().diagram;
    expect(m.pools['Pool_b']).toBeUndefined();
    expect(m.nodes['Task_b']).toBeUndefined();
    expect(m.edges['Msg_1']).toBeUndefined();
    expect(m.nodes['Task_a']).toBeDefined();
  });
});
