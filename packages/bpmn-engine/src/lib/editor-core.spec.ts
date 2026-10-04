import { OGE_DEFAULT_BPMN_CONFIG, resolveOgeBpmnConfig } from './config';
import type { OgeBpmnConfig } from './config';
import {
  OgeBpmnEditorCore,
  wrapBpmnLabel,
  type BpmnKeyInput,
  type BpmnPointerInput,
  type OgeBpmnEditorHost,
  type OgeBpmnEditorMode,
} from './editor-core';
import { createPlainBpmnReactivity } from './reactivity';
import { demoProcessXml } from './xml-fixtures';

/**
 * The editor core against a plain-closure reactivity (no memoization, no
 * change notification) — proof that the behaviour does not lean on either
 * framework's caching. The render layers' own specs cover the markup.
 */
function setup(
  options: {
    readOnly?: boolean;
    config?: OgeBpmnConfig;
  } = {},
) {
  let mode: OgeBpmnEditorMode = 'edit';
  const wrap = document.createElement('div');
  document.body.appendChild(wrap);
  const events: { name: string; payload: unknown }[] = [];
  const record = (name: string) => (payload: unknown) =>
    events.push({ name, payload });
  const host: OgeBpmnEditorHost = {
    uid: 'oge-bpmn-test',
    readOnly: () => options.readOnly ?? false,
    mode: () => mode,
    setMode: (next) => {
      mode = next;
    },
    snapEnabled: () => true,
    brandLogoUrl: () => undefined,
    messages: () => ({}),
    config: () =>
      options.config ?? resolveOgeBpmnConfig({ autoSaveDebounceMs: 0 }),
    hostElement: () => wrap,
    wrap: () => wrap,
    labelEdit: () => null,
    searchInput: () => null,
    minimapSvg: () => null,
    emit: {
      selectionChanged: record('selectionChanged'),
      elementsChanged: record('elementsChanged'),
      importCompleted: record('importCompleted'),
      dirtyChanged: record('dirtyChanged'),
      diagramChanged: record('diagramChanged'),
    },
  };
  const core = new OgeBpmnEditorCore(createPlainBpmnReactivity(), host);
  return { core, events, wrap, getMode: () => mode };
}

function key(k: string, extra: Partial<BpmnKeyInput> = {}): BpmnKeyInput {
  return {
    key: k,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
    ...extra,
  };
}

function pointer(extra: Partial<BpmnPointerInput> = {}): BpmnPointerInput {
  return {
    button: 0,
    clientX: 0,
    clientY: 0,
    shiftKey: false,
    pointerId: 1,
    target: null,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
    ...extra,
  };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('OgeBpmnEditorCore', () => {
  it('imports XML into view models and reports the import', async () => {
    const { core, events } = setup();
    const result = await core.importXml(demoProcessXml('bpmn'));
    expect(result.model).not.toBeNull();
    expect(core.nodeViews().map((n) => n.id)).toContain('Activity_approve');
    expect(core.edgeViews().length).toBeGreaterThan(0);
    expect(events.map((e) => e.name)).toContain('importCompleted');
    expect(core.announcement()).toBe('Diagram imported');
  });

  it('selects, emits and exposes the active descendant', async () => {
    const { core, events } = setup();
    await core.importXml(demoProcessXml('bpmn'));
    core.select(['Activity_approve', 'nope']);
    expect(core.getSelection()).toEqual(['Activity_approve']);
    expect(core.activeDescendant()).toBe('oge-bpmn-test-el-Activity_approve');
    const last = events.filter((e) => e.name === 'selectionChanged').pop();
    expect(last?.payload).toMatchObject({ ids: ['Activity_approve'] });
    expect(core.padView()?.id).toBe('Activity_approve');
  });

  it('moves the selection with the arrow keys as one undoable command', async () => {
    const { core } = setup();
    await core.importXml(demoProcessXml('bpmn'));
    core.select(['Activity_approve']);
    const x = () =>
      core.exportJson().diagram.shapeDi['Activity_approve'].bounds.x;
    const before = x();
    core.onCanvasKeydown(key('ArrowRight'));
    expect(x()).toBe(before + 10);
    expect(core.canUndo()).toBe(true);
    core.undo();
    expect(x()).toBe(before);
    expect(core.announcement()).toMatch(/^Undo: /);
    core.redo();
    expect(x()).toBe(before + 10);
  });

  it('emits dirtyChanged around a save point and autosaves synchronously at 0ms', async () => {
    const { core, events } = setup();
    await core.importXml(demoProcessXml('bpmn'));
    core.select(['Activity_approve']);
    core.onCanvasKeydown(key('ArrowDown'));
    expect(core.isDirty()).toBe(true);
    core.markSaved();
    expect(core.isDirty()).toBe(false);
    const dirty = events.filter((e) => e.name === 'dirtyChanged');
    expect(dirty.map((e) => e.payload)).toEqual([true, false]);
    const saves = events.filter((e) => e.name === 'diagramChanged');
    expect(saves.at(-1)?.payload).toMatchObject({ source: 'execute' });
  });

  it('debounces diagramChanged with the configured delay', async () => {
    vi.useFakeTimers();
    try {
      const { core, events } = setup({
        config: resolveOgeBpmnConfig({ autoSaveDebounceMs: 200 }),
      });
      await core.importXml(demoProcessXml('bpmn'));
      core.select(['Activity_approve']);
      core.onCanvasKeydown(key('ArrowDown'));
      core.onCanvasKeydown(key('ArrowDown'));
      expect(events.some((e) => e.name === 'diagramChanged')).toBe(false);
      vi.advanceTimersByTime(200);
      expect(events.filter((e) => e.name === 'diagramChanged')).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('locks every mutation in view mode and toggles the mode through the host', async () => {
    const { core, getMode } = setup();
    await core.importXml(demoProcessXml('bpmn'));
    core.toggleMode();
    expect(getMode()).toBe('view');
    expect(core.locked()).toBe(true);
    core.select(['Activity_approve']);
    const json = JSON.stringify(core.exportJson());
    core.onCanvasKeydown(key('Delete'));
    core.deleteSelection();
    expect(JSON.stringify(core.exportJson())).toBe(json);
    expect(core.padView()).toBeNull();
  });

  it('arms, toggles and cancels tool-strip tools', () => {
    const { core } = setup();
    core.onStripTool('hand');
    expect(core.tool().kind).toBe('hand');
    core.onStripTool('hand');
    expect(core.tool().kind).toBe('select');
    core.onToolPicked('task');
    expect(core.paletteActive()).toBe('task');
    core.onCanvasKeydown(key('Escape'));
    expect(core.tool().kind).toBe('select');
  });

  it('refuses mutating tools while read-only', () => {
    const { core } = setup({ readOnly: true });
    core.onStripTool('space');
    expect(core.tool().kind).toBe('select');
    core.onStripTool('lasso');
    expect(core.tool().kind).toBe('lasso');
  });

  it('places a palette item with Enter at the canvas center', () => {
    const { core } = setup();
    core.onToolPicked('task');
    core.onCanvasKeydown(key('Enter'));
    expect(core.nodeViews()).toHaveLength(1);
    expect(core.nodeViews()[0].type).toBe('task');
    expect(core.announcement()).toBe('Task created');
    expect(core.tool().kind).toBe('select');
  });

  it('pans with a document-level gesture and cleans it up on release', () => {
    const { core } = setup();
    core.onStripTool('hand');
    core.onCanvasPointerDown(pointer({ clientX: 10, clientY: 10 }));
    document.dispatchEvent(
      new MouseEvent('pointermove', { clientX: 60, clientY: 30 }),
    );
    expect(core.vp()).toMatchObject({ x: 50, y: 20 });
    document.dispatchEvent(new MouseEvent('pointerup'));
    document.dispatchEvent(
      new MouseEvent('pointermove', { clientX: 200, clientY: 200 }),
    );
    expect(core.vp()).toMatchObject({ x: 50, y: 20 });
  });

  it('applies an external zoom and never bounces an equal value', () => {
    const { core } = setup();
    core.applyZoom(2);
    expect(core.vp().zoom).toBe(2);
    expect(core.zoomPercent()).toBe(200);
    const vp = core.vp();
    core.applyZoom(2);
    expect(core.vp()).toBe(vp);
  });

  it('positions overlays and hides them while their element is gone', async () => {
    const { core } = setup();
    await core.importXml(demoProcessXml('bpmn'));
    const handle = core.addOverlay({
      elementId: 'Activity_approve',
      html: '<b>1</b>',
      position: 'top-right',
    });
    expect(core.overlayViews()).toHaveLength(1);
    core.select(['Activity_approve']);
    core.deleteSelection();
    expect(core.overlayViews()).toHaveLength(0);
    core.undo();
    expect(core.overlayViews()).toHaveLength(1);
    core.removeOverlay(handle);
    expect(core.overlayViews()).toHaveLength(0);
  });

  it('searches by name or id and dims the non-matches', async () => {
    const { core } = setup();
    await core.importXml(demoProcessXml('bpmn'));
    core.toggleSearch(true);
    core.onSearchInput('approve');
    expect(core.searchResults().map((r) => r.id)).toContain('Activity_approve');
    expect(core.dimmedIds().has('Activity_approve')).toBe(false);
    expect(core.dimmedIds().size).toBeGreaterThan(0);
    const first = core.searchResults()[0].id;
    core.onSearchKeydown(key('Enter'));
    expect(core.getSelection()).toEqual([first]);
    expect(core.searchOpen()).toBe(false);
  });

  it('resizes the panel rails with the APG splitter keys, clamped', () => {
    const { core } = setup();
    core.onPanelResizeKey(key('ArrowRight'), 'rail');
    expect(core.railWidth()).toBe(80);
    core.onPanelResizeKey(key('End'), 'rail');
    expect(core.railWidth()).toBe(core.RAIL_MAX);
    core.onPanelResizeKey(key('ArrowRight'), 'properties');
    expect(core.propertiesWidth()).toBe(224);
    core.onPanelResizeKey(key('Home'), 'properties');
    expect(core.propertiesWidth()).toBe(core.PROPS_MIN);
  });

  it('mirrors the chrome in RTL: separator keys and the context-pad side; the canvas nudge stays physical', async () => {
    const { core, wrap } = setup();
    wrap.setAttribute('dir', 'rtl');
    core.revive();
    expect(core.chromeRtl()).toBe(true);
    // the rail sits on the right: ArrowLeft moves its separator left = wider
    core.onPanelResizeKey(key('ArrowLeft'), 'rail');
    expect(core.railWidth()).toBe(80);
    core.onPanelResizeKey(key('ArrowLeft'), 'properties');
    expect(core.propertiesWidth()).toBe(224);

    await core.importXml(demoProcessXml('bpmn'));
    core.select(['Activity_approve']);
    const node = core.nodeViews().find((n) => n.id === 'Activity_approve');
    const pad = core.padView();
    expect(pad?.side).toBe('left');
    expect(node).toBeDefined();
    const zoom = core.vp().zoom;

    // canvas nudges move in diagram space — ArrowRight still moves right
    const before = core.nodeViews().find((n) => n.id === 'Activity_approve');
    core.onCanvasKeydown(key('ArrowRight'));
    const after = core.nodeViews().find((n) => n.id === 'Activity_approve');
    expect((after?.x ?? 0) - (before?.x ?? 0)).toBeGreaterThan(0);

    // a later dir change is observed
    wrap.setAttribute('dir', 'ltr');
    await Promise.resolve();
    expect(core.chromeRtl()).toBe(false);
    const ltrPad = core.padView();
    expect(ltrPad?.side).toBe('right');
    // RTL anchors 8px off the shape's left edge, LTR 8px off its right edge
    expect((ltrPad?.x ?? 0) - (pad?.x ?? 0)).toBeCloseTo(
      ((node?.width ?? 0) + (after?.x ?? 0) - (before?.x ?? 0)) * zoom + 16,
    );
    core.destroy();
    wrap.removeAttribute('dir');
  });

  it('survives a destroy → revive cycle on the same instance (StrictMode)', async () => {
    const { core, events } = setup();
    core.destroy();
    core.revive();
    await core.importXml(demoProcessXml('bpmn'));
    expect(core.nodeViews().length).toBeGreaterThan(0);
    expect(events.some((e) => e.name === 'elementsChanged')).toBe(true);
  });

  it('stops reporting model changes after destroy', async () => {
    const { core, events } = setup();
    core.destroy();
    await core.importXml(demoProcessXml('bpmn'));
    expect(events.some((e) => e.name === 'elementsChanged')).toBe(false);
  });

  it('merges per-instance messages over the config', () => {
    const config = OGE_DEFAULT_BPMN_CONFIG;
    const { core } = setup({ config });
    expect(core.canvasAriaLabel()).toBe(
      `${config.messages.canvasLabel}. ${config.messages.canvasHint}`,
    );
  });
});

describe('wrapBpmnLabel', () => {
  it('wraps to at most three lines with an ellipsis', () => {
    const lines = wrapBpmnLabel(
      'one two three four five six seven eight nine ten eleven twelve',
      60,
    );
    expect(lines.length).toBeLessThanOrEqual(3);
    expect(lines.at(-1)?.endsWith('…')).toBe(true);
    expect(wrapBpmnLabel('   ', 100)).toEqual([]);
  });
});
