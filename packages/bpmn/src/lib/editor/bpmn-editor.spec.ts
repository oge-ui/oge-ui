import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  OgeBpmnElementsChangedEvent,
  OgeBpmnImportEvent,
  OgeBpmnSelectionEvent,
} from '../bpmn-types';
import { OGE_DEFAULT_BPMN_MESSAGES, type OgeBpmnMessages } from '../config';
import { demoProcessXml } from '../engine/xml-fixtures';
import { OgeBpmnEditor } from './bpmn-editor';

@Component({
  imports: [OgeBpmnEditor],
  template: `
    <oge-bpmn-editor
      [readOnly]="readOnly()"
      [allowModeToggle]="allowModeToggle()"
      [messages]="messages()"
      [(zoom)]="zoom"
      (selectionChanged)="selections.push($event)"
      (elementsChanged)="changes.push($event)"
      (importCompleted)="imports.push($event)"
      (dirtyChanged)="dirty.push($event)"
    />
  `,
})
class Host {
  readonly readOnly = signal(false);
  readonly allowModeToggle = signal(false);
  readonly messages = signal<Partial<OgeBpmnMessages>>({});
  readonly zoom = signal(1);
  readonly selections: OgeBpmnSelectionEvent[] = [];
  readonly changes: OgeBpmnElementsChangedEvent[] = [];
  readonly imports: OgeBpmnImportEvent[] = [];
  readonly dirty: boolean[] = [];
}

@Component({
  imports: [OgeBpmnEditor],
  template: `<oge-bpmn-editor [showBranding]="false" />`,
})
class NoBrandHost {}

@Component({
  imports: [OgeBpmnEditor],
  template: `<oge-bpmn-editor brandLogoUrl="/favicon-192.png" />`,
})
class LogoHost {}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

function editorOf(fixture: ComponentFixture<Host>): OgeBpmnEditor {
  return fixture.debugElement.children[0].componentInstance as OgeBpmnEditor;
}

function el(fixture: ComponentFixture<unknown>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function wrapOf(fixture: ComponentFixture<unknown>): HTMLElement {
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
  return wrap;
}

function svgOf(fixture: ComponentFixture<unknown>): SVGElement {
  return el(fixture).querySelector('.oge-bpmn-canvas') as SVGElement;
}

function shapes(fixture: ComponentFixture<unknown>): NodeListOf<Element> {
  return el(fixture).querySelectorAll('.oge-bpmn-shape');
}

function edges(fixture: ComponentFixture<unknown>): NodeListOf<Element> {
  return el(fixture).querySelectorAll('.oge-bpmn-edge');
}

function announcement(fixture: ComponentFixture<unknown>): string {
  return (
    el(fixture).querySelector('.oge-bpmn-live')?.textContent ?? ''
  ).trim();
}

function keydown(
  target: HTMLElement,
  key: string,
  init: KeyboardEventInit = {},
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

describe('OgeBpmnEditor', () => {
  async function render() {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const wrap = wrapOf(fixture);
    return { fixture, editor: editorOf(fixture), wrap };
  }

  async function renderImported() {
    const rendered = await render();
    await rendered.editor.importXml(demoProcessXml('bpmn'));
    await settle(rendered.fixture);
    return rendered;
  }

  it('imports XML, renders the diagram and exports it back', async () => {
    const { fixture, editor } = await render();
    expect(el(fixture).querySelector('.oge-bpmn-empty')).toBeTruthy();

    const result = await editor.importXml(demoProcessXml('bpmn'));
    expect(result.model).not.toBeNull();
    await settle(fixture);

    expect(el(fixture).querySelector('.oge-bpmn-empty')).toBeNull();
    expect(shapes(fixture).length).toBe(5);
    expect(edges(fixture).length).toBe(5);
    expect(fixture.componentInstance.imports.length).toBe(1);
    expect(fixture.componentInstance.changes.at(-1)?.source).toBe('import');
    expect(announcement(fixture)).toBe('Diagram imported');

    const xml = editor.exportXml();
    expect(xml).toContain('<bpmn:userTask');
    expect(xml).toContain('<bpmndi:BPMNShape');
    expect(editor.isDirty()).toBe(false);
  });

  it('reports import warnings through importCompleted and the live region', async () => {
    const { fixture, editor } = await render();
    const noDi = demoProcessXml('bpmn').replace(
      /<bpmndi:BPMNDiagram[\s\S]*<\/bpmndi:BPMNDiagram>/,
      '',
    );
    const result = await editor.importXml(noDi);
    await settle(fixture);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(fixture.componentInstance.imports[0].warnings.length).toBe(
      result.warnings.length,
    );
    expect(announcement(fixture)).toBe(
      `Imported with ${result.warnings.length} warning(s)`,
    );
  });

  it('places a node with the palette click-then-place tool', async () => {
    const { fixture, editor } = await render();
    const paletteBtn = el(fixture).querySelector(
      '.oge-bpmn-palette-btn[aria-label="Task"]',
    ) as HTMLButtonElement;
    paletteBtn.click();
    await settle(fixture);
    expect(paletteBtn.getAttribute('aria-pressed')).toBe('true');

    svgOf(fixture).dispatchEvent(
      new MouseEvent('pointerdown', {
        bubbles: true,
        clientX: 300,
        clientY: 200,
      }),
    );
    await settle(fixture);

    expect(shapes(fixture).length).toBe(1);
    expect(editor.getSelection().length).toBe(1);
    expect(announcement(fixture)).toBe('Task created');
    // The tool disarms after placing.
    expect(
      el(fixture)
        .querySelector('.oge-bpmn-palette-btn[aria-label="Task"]')
        ?.getAttribute('aria-pressed'),
    ).toBe('false');
    expect(editor.exportXml()).toContain('<bpmn:task');
  });

  it('cycles the selection with Tab and mirrors it in aria-activedescendant', async () => {
    const { fixture, editor, wrap } = await renderImported();
    const first = keydown(wrap, 'Tab');
    await settle(fixture);
    expect(first.defaultPrevented).toBe(true);
    expect(editor.getSelection()).toEqual(['StartEvent_1']);
    expect(wrap.getAttribute('aria-activedescendant')).toMatch(
      /-el-StartEvent_1$/,
    );
    expect(announcement(fixture)).toBe('Start selected');

    keydown(wrap, 'Tab');
    await settle(fixture);
    expect(editor.getSelection()).toEqual(['Activity_approve']);
    expect(wrap.getAttribute('aria-activedescendant')).toMatch(
      /-el-Activity_approve$/,
    );

    keydown(wrap, 'Tab', { shiftKey: true });
    await settle(fixture);
    expect(editor.getSelection()).toEqual(['StartEvent_1']);
  });

  it('moves the selection by gridSize with arrows as one undoable step', async () => {
    const { fixture, editor, wrap } = await renderImported();
    editor.select(['Activity_approve']);
    await settle(fixture);
    expect(editor.canUndo()).toBe(false);

    keydown(wrap, 'ArrowRight');
    await settle(fixture);
    expect(editor.exportXml()).toContain('x="250" y="130"');
    expect(announcement(fixture)).toBe('Approve moved');
    expect(editor.canUndo()).toBe(true);
    expect(editor.isDirty()).toBe(true);

    keydown(wrap, 'ArrowDown', { shiftKey: true });
    await settle(fixture);
    expect(editor.exportXml()).toContain('x="250" y="131"');

    editor.undo();
    editor.undo();
    expect(editor.canUndo()).toBe(false);
    expect(editor.exportXml()).toContain('x="240" y="130"');
    expect(editor.isDirty()).toBe(false);
  });

  it('deletes the selection with Delete, cascading to attached edges', async () => {
    const { fixture, editor, wrap } = await renderImported();
    editor.select(['Activity_approve']);
    await settle(fixture);

    keydown(wrap, 'Delete');
    await settle(fixture);
    expect(shapes(fixture).length).toBe(4);
    expect(edges(fixture).length).toBe(2); // Flow_s1, Flow_a1, Assoc_1 cascade away
    expect(announcement(fixture)).toBe('4 element(s) deleted');
    expect(editor.getSelection()).toEqual([]);
  });

  it('undoes with Ctrl+Z and redoes with Ctrl+Y / Ctrl+Shift+Z', async () => {
    const { fixture, editor, wrap } = await renderImported();
    editor.select(['Activity_approve']);
    editor.deleteSelection();
    await settle(fixture);
    expect(shapes(fixture).length).toBe(4);

    keydown(wrap, 'z', { ctrlKey: true });
    await settle(fixture);
    expect(shapes(fixture).length).toBe(5);
    expect(announcement(fixture)).toBe('Undo: Delete elements');
    expect(fixture.componentInstance.changes.at(-1)?.source).toBe('undo');

    keydown(wrap, 'y', { ctrlKey: true });
    await settle(fixture);
    expect(shapes(fixture).length).toBe(4);
    expect(announcement(fixture)).toBe('Redo: Delete elements');

    keydown(wrap, 'z', { ctrlKey: true });
    await settle(fixture);
    expect(shapes(fixture).length).toBe(5);

    keydown(wrap, 'z', { ctrlKey: true, shiftKey: true });
    await settle(fixture);
    expect(shapes(fixture).length).toBe(4);
    expect(fixture.componentInstance.changes.at(-1)?.source).toBe('redo');
  });

  it('Escape cancels the armed tool first, then clears the selection, then lets Tab out', async () => {
    const { fixture, editor, wrap } = await renderImported();
    (
      el(fixture).querySelector(
        '.oge-bpmn-palette-btn[aria-label="Task"]',
      ) as HTMLButtonElement
    ).click();
    editor.select(['Activity_approve']);
    await settle(fixture);

    keydown(wrap, 'Escape');
    await settle(fixture);
    expect(
      el(fixture)
        .querySelector('.oge-bpmn-palette-btn[aria-label="Task"]')
        ?.getAttribute('aria-pressed'),
    ).toBe('false');
    expect(editor.getSelection()).toEqual(['Activity_approve']);

    keydown(wrap, 'Escape');
    await settle(fixture);
    expect(editor.getSelection()).toEqual([]);
    expect(announcement(fixture)).toBe('Selection cleared');

    // After an Escape-cleared selection, Tab must be allowed to leave.
    const tab = keydown(wrap, 'Tab');
    expect(tab.defaultPrevented).toBe(false);
    expect(editor.getSelection()).toEqual([]);
  });

  it('edits a label inline: F2 opens, Enter commits, Escape cancels', async () => {
    const { fixture, editor, wrap } = await renderImported();
    editor.select(['Activity_approve']);
    await settle(fixture);

    keydown(wrap, 'F2');
    await settle(fixture);
    const textarea = el(fixture).querySelector(
      '.oge-bpmn-label-edit',
    ) as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    expect(textarea.value).toBe('Approve');
    expect(document.activeElement).toBe(textarea);

    textarea.value = 'Approve invoice';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    keydown(textarea, 'Enter');
    await settle(fixture);
    expect(el(fixture).querySelector('.oge-bpmn-label-edit')).toBeNull();
    expect(editor.exportXml()).toContain('name="Approve invoice"');
    expect(announcement(fixture)).toBe('Label updated');

    keydown(wrap, 'F2');
    await settle(fixture);
    const again = el(fixture).querySelector(
      '.oge-bpmn-label-edit',
    ) as HTMLTextAreaElement;
    again.value = 'Discarded';
    again.dispatchEvent(new Event('input', { bubbles: true }));
    keydown(again, 'Escape');
    await settle(fixture);
    expect(el(fixture).querySelector('.oge-bpmn-label-edit')).toBeNull();
    expect(editor.exportXml()).toContain('name="Approve invoice"');
    expect(editor.exportXml()).not.toContain('Discarded');
  });

  it('shows the context pad for a single selected shape and appends a connected task', async () => {
    const { fixture, editor } = await renderImported();
    expect(el(fixture).querySelector('.oge-bpmn-context-pad')).toBeNull();

    editor.select(['Activity_approve']);
    await settle(fixture);
    const pad = el(fixture).querySelector(
      '.oge-bpmn-context-pad',
    ) as HTMLElement;
    expect(pad).toBeTruthy();
    expect(pad.getAttribute('role')).toBe('toolbar');

    (
      pad.querySelector('[aria-label="Append task"]') as HTMLButtonElement
    ).click();
    await settle(fixture);
    expect(shapes(fixture).length).toBe(6);
    expect(edges(fixture).length).toBe(6);
    expect(announcement(fixture)).toBe('Task created');
    // One composite command — a single undo removes node and edge together.
    editor.undo();
    await settle(fixture);
    expect(shapes(fixture).length).toBe(5);
    expect(edges(fixture).length).toBe(5);
  });

  it('readOnly disables the palette, the keyboard editing and the context pad', async () => {
    const { fixture, editor, wrap } = await renderImported();
    fixture.componentInstance.readOnly.set(true);
    editor.select(['Activity_approve']);
    await settle(fixture);

    // a viewer renders no palette at all (dead chrome + axe scroll-region)
    expect(el(fixture).querySelector('.oge-bpmn-palette')).toBeNull();
    expect(el(fixture).querySelector('.oge-bpmn-context-pad')).toBeNull();

    keydown(wrap, 'Delete');
    keydown(wrap, 'ArrowRight');
    keydown(wrap, 'F2');
    await settle(fixture);
    expect(shapes(fixture).length).toBe(5);
    expect(el(fixture).querySelector('.oge-bpmn-label-edit')).toBeNull();
    expect(editor.exportXml()).toContain('x="240" y="130"');
  });

  it('applies per-instance message overrides', async () => {
    const { fixture, wrap } = await render();
    fixture.componentInstance.messages.set({
      canvasLabel: 'Süreç editörü',
      paletteLabel: 'Öğe paleti',
      paletteLabels: {
        ...OGE_DEFAULT_BPMN_MESSAGES.paletteLabels,
        task: 'Görev',
      },
    });
    await settle(fixture);
    expect(wrap.getAttribute('aria-label')).toContain('Süreç editörü');
    expect(wrap.getAttribute('aria-roledescription')).toBe('Süreç editörü');
    expect(
      el(fixture)
        .querySelector('.oge-bpmn-palette')
        ?.getAttribute('aria-label'),
    ).toBe('Öğe paleti');
    expect(
      el(fixture).querySelector('.oge-bpmn-palette-btn[aria-label="Görev"]'),
    ).toBeTruthy();
  });

  it('keeps the zoom model and the viewport in sync, including wheel zoom', async () => {
    const { fixture } = await renderImported();
    const viewport = () =>
      el(fixture)
        .querySelector('.oge-bpmn-viewport')
        ?.getAttribute('transform') ?? '';
    expect(viewport()).toContain('scale(1)');

    fixture.componentInstance.zoom.set(2);
    await settle(fixture);
    expect(viewport()).toContain('scale(2)');

    svgOf(fixture).dispatchEvent(
      new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaY: -100,
        clientX: 400,
        clientY: 300,
      }),
    );
    await settle(fixture);
    expect(fixture.componentInstance.zoom()).toBeCloseTo(2.2, 5);
    expect(viewport()).toContain(`scale(${2 * 1.1})`);

    // Clamped at the configured maximum.
    fixture.componentInstance.zoom.set(99);
    await settle(fixture);
    expect(fixture.componentInstance.zoom()).toBe(4);
  });

  it('markSaved resets the dirty flag and emits dirtyChanged on both flips', async () => {
    const { fixture, editor, wrap } = await renderImported();
    editor.select(['Activity_approve']);
    await settle(fixture);
    keydown(wrap, 'ArrowRight');
    await settle(fixture);
    expect(fixture.componentInstance.dirty).toEqual([true]);

    editor.markSaved();
    expect(editor.isDirty()).toBe(false);
    expect(fixture.componentInstance.dirty).toEqual([true, false]);
  });

  it('panel separators resize the rail and properties panel via APG splitter keys', async () => {
    const { fixture } = await renderImported();
    const resizers = Array.from(
      el(fixture).querySelectorAll<HTMLElement>('.oge-bpmn-resizer'),
    );
    expect(resizers.length).toBe(2); // rail + properties
    const [rail, props] = resizers;
    expect(rail.getAttribute('role')).toBe('separator');
    expect(rail.getAttribute('aria-label')).toBe('Resize palette rail');
    expect(props.getAttribute('aria-label')).toBe('Resize properties panel');

    const railStart = Number(rail.getAttribute('aria-valuenow'));
    rail.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    await settle(fixture);
    expect(Number(rail.getAttribute('aria-valuenow'))).toBe(railStart + 16);
    rail.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Home', bubbles: true }),
    );
    await settle(fixture);
    expect(rail.getAttribute('aria-valuenow')).toBe(
      rail.getAttribute('aria-valuemin'),
    );

    // properties: ArrowLeft moves the separator left → the panel grows
    const propsStart = Number(props.getAttribute('aria-valuenow'));
    props.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
    );
    await settle(fixture);
    expect(Number(props.getAttribute('aria-valuenow'))).toBe(propsStart + 16);

    // drag with Escape restores the start width (jsdom has no PointerEvent —
    // MouseEvent with the pointer type, the drag-spec idiom)
    props.dispatchEvent(
      new MouseEvent('pointerdown', {
        button: 0,
        clientX: 500,
        bubbles: true,
      }),
    );
    document.dispatchEvent(
      new MouseEvent('pointermove', { clientX: 440, bubbles: true }),
    );
    await settle(fixture);
    expect(Number(props.getAttribute('aria-valuenow'))).toBe(propsStart + 76);
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await settle(fixture);
    expect(Number(props.getAttribute('aria-valuenow'))).toBe(propsStart + 16);
  });

  it('header toolbar: name edit, undo/redo buttons, zoom display, panel toggle', async () => {
    const { fixture, editor } = await renderImported();
    const header = el(fixture).querySelector('.oge-bpmn-header') as HTMLElement;
    expect(header.getAttribute('role')).toBe('toolbar');

    // diagram name commits through the command stack (undoable)
    const name = header.querySelector(
      '.oge-bpmn-header-name',
    ) as HTMLInputElement;
    name.value = 'Sipariş akışı';
    name.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(fixture);
    expect(editor.exportXml()).toContain('name="Sipariş akışı"');

    // undo/redo buttons mirror the stack
    const buttons = Array.from(
      header.querySelectorAll<HTMLButtonElement>('.oge-bpmn-header-btn'),
    );
    const undoBtn = buttons.find(
      (b) => b.getAttribute('aria-label') === 'Undo',
    );
    const redoBtn = buttons.find(
      (b) => b.getAttribute('aria-label') === 'Redo',
    );
    expect(undoBtn?.disabled).toBe(false);
    expect(redoBtn?.disabled).toBe(true);
    undoBtn?.click();
    await settle(fixture);
    expect(editor.exportXml()).not.toContain('Sipariş akışı');
    expect(redoBtn?.disabled).toBe(false);

    // zoom percentage reflects zoom-in clicks
    const zoomIn = buttons.find(
      (b) => b.getAttribute('aria-label') === 'Zoom in',
    );
    const pct = header.querySelector('.oge-bpmn-header-zoom') as HTMLElement;
    expect(pct.textContent?.trim()).toBe('100%');
    zoomIn?.click();
    await settle(fixture);
    expect(pct.textContent?.trim()).toBe('120%');

    // panel toggle collapses the properties panel
    const panelToggle = buttons.find(
      (b) => b.getAttribute('aria-label') === 'Toggle properties panel',
    );
    expect(el(fixture).querySelector('.oge-bpmn-properties')).toBeTruthy();
    panelToggle?.click();
    await settle(fixture);
    expect(el(fixture).querySelector('.oge-bpmn-properties')).toBeNull();
    panelToggle?.click();
    await settle(fixture);
    expect(el(fixture).querySelector('.oge-bpmn-properties')).toBeTruthy();
  });

  it('branding badge is a bare logo, removable exclusively via the input', async () => {
    const { fixture } = await render();
    const link = el(fixture).querySelector(
      '.oge-bpmn-brand-link',
    ) as HTMLElement;
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('https://ogeui.com');
    expect(link.getAttribute('aria-label')).toBe(
      'Built with OGE UI — ogeui.com',
    );
    // bare logo — no chrome, no in-UI close affordance, drawn mark by default
    expect(link.querySelector('button')).toBeNull();
    expect(link.querySelector('svg')).toBeTruthy();
    expect(link.querySelector('img')).toBeNull();

    const bare = TestBed.createComponent(NoBrandHost);
    await settle(bare);
    expect(
      (bare.nativeElement as HTMLElement).querySelector('.oge-bpmn-brand-link'),
    ).toBeNull();

    // a configured logo URL swaps the drawn mark for the app's image
    const branded = TestBed.createComponent(LogoHost);
    await settle(branded);
    const img = (branded.nativeElement as HTMLElement).querySelector(
      '.oge-bpmn-brand-img',
    ) as HTMLImageElement;
    expect(img?.getAttribute('src')).toBe('/favicon-192.png');
  });

  it('mode toggle locks editing like readOnly; zoom stays available', async () => {
    const { fixture, editor } = await renderImported();
    fixture.componentInstance.allowModeToggle.set(true);
    await settle(fixture);
    const header = el(fixture).querySelector('.oge-bpmn-header') as HTMLElement;
    const modeBtn = Array.from(
      header.querySelectorAll<HTMLButtonElement>('.oge-bpmn-header-btn'),
    ).find((b) => b.getAttribute('aria-label') === 'Switch to view mode');
    expect(modeBtn).toBeTruthy();
    modeBtn?.click();
    await settle(fixture);
    // view mode: palette + panel gone, keyboard delete blocked
    expect(el(fixture).querySelector('.oge-bpmn-palette')).toBeNull();
    expect(el(fixture).querySelector('.oge-bpmn-properties')).toBeNull();
    editor.select(['Activity_approve']);
    const wrap = el(fixture).querySelector(
      '.oge-bpmn-canvas-wrap',
    ) as HTMLElement;
    wrap.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }),
    );
    await settle(fixture);
    expect(editor.exportXml()).toContain('Activity_approve');
    // zoom still works in view mode
    const pct = header.querySelector('.oge-bpmn-header-zoom') as HTMLElement;
    Array.from(
      header.querySelectorAll<HTMLButtonElement>('.oge-bpmn-header-btn'),
    )
      .find((b) => b.getAttribute('aria-label') === 'Zoom in')
      ?.click();
    await settle(fixture);
    expect(pct.textContent?.trim()).toBe('120%');
  });
});
