import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { demoProcessXml, V03_FIXTURE_XML } from '../engine/xml-fixtures';
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

describe('OgeBpmnEditor — v0.3 element coverage', () => {
  async function render(xml: string) {
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
    await editor.importXml(xml);
    await settle(fixture);
    const canvas = el(fixture).querySelector('.oge-bpmn-canvas') as SVGElement;
    return { fixture, editor, wrap, canvas };
  }

  // ----------------------------------------------------------------- palette

  it('offers boundary event and sub-process palette entries', async () => {
    const { fixture } = await render(demoProcessXml('bpmn'));
    expect(paletteButton(fixture, 'Boundary event')).toBeTruthy();
    expect(paletteButton(fixture, 'Sub-process')).toBeTruthy();
  });

  // ---------------------------------------------------------- boundary place

  it('attaches a boundary event dropped near an activity border', async () => {
    const { fixture, editor, canvas } = await render(demoProcessXml('bpmn'));
    paletteButton(fixture, 'Boundary event').click();
    await settle(fixture);
    // Activity_approve spans 240..340 × 130..210; click near its right border.
    canvas.dispatchEvent(
      pointer('pointerdown', { clientX: 338, clientY: 168 }),
    );
    await settle(fixture);

    const m = editor.exportJson().diagram;
    const boundary = Object.values(m.nodes).find(
      (n) => n.type === 'boundaryEvent',
    );
    expect(
      boundary?.type === 'boundaryEvent' ? boundary.attachedToRef : null,
    ).toBe('Activity_approve');
    // Docked at the right border midpoint (340, 170).
    expect(m.shapeDi[boundary?.id ?? ''].bounds).toMatchObject({
      x: 322,
      y: 152,
    });
    expect(announcement(fixture)).toBe('Boundary event attached to Approve');
    expect(editor.exportXml()).toContain('attachedToRef="Activity_approve"');
  });

  it('denies a boundary drop away from any activity border', async () => {
    const { fixture, editor, canvas } = await render(demoProcessXml('bpmn'));
    paletteButton(fixture, 'Boundary event').click();
    await settle(fixture);
    canvas.dispatchEvent(
      pointer('pointerdown', { clientX: 700, clientY: 500 }),
    );
    await settle(fixture);

    expect(announcement(fixture)).toBe(
      'Drop a boundary event on an activity border',
    );
    const m = editor.exportJson().diagram;
    expect(Object.values(m.nodes).some((n) => n.type === 'boundaryEvent')).toBe(
      false,
    );
  });

  it('moving the host carries its boundary event along', async () => {
    const { fixture, editor, wrap } = await render(V03_FIXTURE_XML);
    const before = editor.exportJson().diagram.shapeDi['Bound_v3'].bounds;
    editor.select(['Task_v3']);
    await settle(fixture);
    wrap.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    await settle(fixture);
    const after = editor.exportJson().diagram.shapeDi['Bound_v3'].bounds;
    expect(after.x).toBe(before.x + 10);
    expect(after.y).toBe(before.y);
  });

  // ------------------------------------------------------------- panel: events

  it('renders the event definition select and applies a definition glyph', async () => {
    const { fixture, editor } = await render(demoProcessXml('bpmn'));
    editor.select(['StartEvent_1']);
    await settle(fixture);

    const select = el(fixture).querySelector(
      '.oge-bpmn-props-eventdef',
    ) as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect(Array.from(select.options).map((o) => o.value)).toEqual([
      '',
      'message',
      'timer',
      'signal',
      'conditional',
      'escalation',
      'error',
    ]);

    select.value = 'message';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(fixture);

    const glyph = shapeOf(fixture, 'StartEvent_1')?.querySelector(
      '.oge-bpmn-event-def',
    );
    expect(glyph).toBeTruthy();
    expect(glyph?.classList.contains('oge-bpmn-event-def-filled')).toBe(false);
    expect(editor.exportXml()).toContain(
      '<bpmn:messageEventDefinition id="StartEvent_1_def" />',
    );

    editor.undo();
    await settle(fixture);
    expect(
      shapeOf(fixture, 'StartEvent_1')?.querySelector('.oge-bpmn-event-def'),
    ).toBeNull();
  });

  it('renders throw-event definition glyphs filled', async () => {
    const { fixture } = await render(V03_FIXTURE_XML);
    const glyph = shapeOf(fixture, 'Throw_v3')?.querySelector(
      '.oge-bpmn-event-def',
    );
    expect(glyph?.classList.contains('oge-bpmn-event-def-filled')).toBe(true);
  });

  it('toggles interrupting via the panel checkbox (dashed rendering)', async () => {
    const { fixture, editor } = await render(V03_FIXTURE_XML);
    // Bound_v3 is imported non-interrupting → dashed.
    expect(
      shapeOf(fixture, 'Bound_v3')?.querySelector('.oge-bpmn-event-dashed'),
    ).toBeTruthy();

    editor.select(['Bound_v3']);
    await settle(fixture);
    const checkbox = el(fixture).querySelector(
      '.oge-bpmn-props-interrupting',
    ) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(fixture);

    expect(
      shapeOf(fixture, 'Bound_v3')?.querySelector('.oge-bpmn-event-dashed'),
    ).toBeNull();
    expect(editor.exportXml()).not.toContain('cancelActivity');
  });

  // -------------------------------------------------------------- sub-process

  it('renders expanded sub-process children and hides them when collapsed', async () => {
    const { fixture, editor } = await render(V03_FIXTURE_XML);
    expect(shapeOf(fixture, 'SubStart_v3')).toBeTruthy();
    // Children of the collapsed inner sub-process are hidden from the start.
    expect(shapeOf(fixture, 'InnerTask_v3')).toBeNull();

    editor.select(['Sub_v3']);
    await settle(fixture);
    const checkbox = el(fixture).querySelector(
      '.oge-bpmn-props-collapsed',
    ) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(fixture);

    expect(shapeOf(fixture, 'SubStart_v3')).toBeNull();
    expect(announcement(fixture)).toBe('Outer collapse toggled');
    // The [+] marker renders on the collapsed container.
    expect(
      shapeOf(fixture, 'Sub_v3')?.querySelector('.oge-bpmn-marker'),
    ).toBeTruthy();
    // Children survive in the exported XML.
    expect(editor.exportXml()).toContain('<bpmn:startEvent id="SubStart_v3"');

    editor.undo();
    await settle(fixture);
    expect(shapeOf(fixture, 'SubStart_v3')).toBeTruthy();
  });

  it('append from a sub-process child inherits the container', async () => {
    const { fixture, editor, wrap } = await render(V03_FIXTURE_XML);
    editor.select(['SubStart_v3']);
    await settle(fixture);
    wrap.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', bubbles: true }),
    );
    await settle(fixture);

    const m = editor.exportJson().diagram;
    const appended = Object.values(m.nodes).find(
      (n) => n.type === 'task' && n.parentId === 'Sub_v3',
    );
    expect(appended).toBeDefined();
    // The connecting flow is legal (same container) and was created.
    expect(
      Object.values(m.edges).some(
        (e) => e.sourceRef === 'SubStart_v3' && e.targetRef === appended?.id,
      ),
    ).toBe(true);
  });

  // ------------------------------------------------------------------ markers

  it('sets activity markers via the panel and renders their glyphs', async () => {
    const { fixture, editor } = await render(demoProcessXml('bpmn'));
    editor.select(['Activity_approve']);
    await settle(fixture);

    const select = el(fixture).querySelector(
      '.oge-bpmn-props-marker',
    ) as HTMLSelectElement;
    expect(select).toBeTruthy();
    select.value = 'loop';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(fixture);
    expect(
      shapeOf(fixture, 'Activity_approve')?.querySelector('.oge-bpmn-marker'),
    ).toBeTruthy();
    expect(editor.exportXml()).toContain(
      '<bpmn:standardLoopCharacteristics />',
    );

    const compensation = el(fixture).querySelector(
      '.oge-bpmn-props-compensation',
    ) as HTMLInputElement;
    compensation.checked = true;
    compensation.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(fixture);
    expect(
      shapeOf(fixture, 'Activity_approve')?.querySelectorAll('.oge-bpmn-marker')
        .length,
    ).toBe(2);
    expect(editor.exportXml()).toContain('isForCompensation="true"');
  });

  // --------------------------------------------------------------- svg export

  it('exports v0.3 glyphs in the static SVG', async () => {
    const { editor } = await render(V03_FIXTURE_XML);
    const svg = editor.exportSvg();
    expect(svg).toContain('stroke-dasharray="4 3"'); // non-interrupting boundary
    expect(svg).toContain('stroke-dasharray="3 3"'); // event sub-process border
    // Hidden children of collapsed containers are not exported.
    expect(svg).not.toContain('InnerTask');
  });
});
