import { StrictMode, createRef, useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { demoProcessXml } from '@oge-ui/bpmn-engine/testing';
import {
  OgeBpmnEditor,
  type OgeBpmnEditorHandle,
  type OgeBpmnEditorProps,
} from './bpmn-editor';
import { OgeBpmnConfigProvider } from './bpmn-config';

/** jsdom has no layout: give the canvas a size so fit/center math runs. */
function sizeCanvas(container: HTMLElement): HTMLElement {
  const wrap = container.querySelector('.oge-bpmn-canvas-wrap') as HTMLElement;
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
  Object.defineProperty(wrap, 'clientWidth', { value: 800 });
  Object.defineProperty(wrap, 'clientHeight', { value: 600 });
  return wrap;
}

function setup(props: OgeBpmnEditorProps = {}) {
  const ref = createRef<OgeBpmnEditorHandle>();
  const utils = render(<OgeBpmnEditor ref={ref} {...props} />);
  const wrap = sizeCanvas(utils.container);
  return {
    ...utils,
    ref,
    wrap,
    handle: () => ref.current as OgeBpmnEditorHandle,
  };
}

async function imported(props: OgeBpmnEditorProps = {}) {
  const rendered = setup(props);
  await act(async () => {
    await rendered.handle().importXml(demoProcessXml('bpmn'));
  });
  return rendered;
}

/**
 * jsdom has no PointerEvent constructor, and Testing Library's fallback event
 * drops `button`/`clientX` — dispatch a MouseEvent typed `pointerdown`, the
 * same thing the Angular specs do; React routes it to `onPointerDown`.
 */
function pointerDown(target: Element, init: MouseEventInit): void {
  act(() => {
    target.dispatchEvent(
      new MouseEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        ...init,
      }),
    );
  });
}

const shapes = (c: HTMLElement) => c.querySelectorAll('.oge-bpmn-shape');
const live = (c: HTMLElement) =>
  (c.querySelector('.oge-bpmn-live')?.textContent ?? '').trim();

describe('<OgeBpmnEditor>', () => {
  it('renders the same chrome as the Angular editor', () => {
    const { container } = setup();
    const host = container.querySelector('.oge-bpmn-editor');
    expect(host).not.toBeNull();
    expect(container.querySelector('.oge-bpmn-header')).not.toBeNull();
    expect(container.querySelectorAll('.oge-bpmn-palette-btn')).toHaveLength(
      18,
    );
    expect(container.querySelector('.oge-bpmn-toolstrip')).not.toBeNull();
    expect(container.querySelector('.oge-bpmn-properties')).not.toBeNull();
    expect(container.querySelector('.oge-bpmn-empty')?.textContent).toBe(
      'Empty diagram — pick an element from the palette',
    );
    const wrap = container.querySelector('.oge-bpmn-canvas-wrap');
    expect(wrap?.getAttribute('role')).toBe('application');
    expect(wrap?.getAttribute('aria-keyshortcuts')).toContain('Control+Z');
    expect(container.querySelector('.oge-bpmn-brand-link')).not.toBeNull();
  });

  it('imports XML, renders shapes and edges and exports them back', async () => {
    const onImportCompleted = vi.fn();
    const onElementsChanged = vi.fn();
    const { container, handle } = await imported({
      onImportCompleted,
      onElementsChanged,
    });
    expect(shapes(container)).toHaveLength(5);
    expect(container.querySelectorAll('.oge-bpmn-edge')).toHaveLength(5);
    expect(onImportCompleted).toHaveBeenCalledTimes(1);
    expect(onElementsChanged.mock.calls.at(-1)?.[0].source).toBe('import');
    expect(live(container)).toBe('Diagram imported');
    expect(handle().exportXml()).toContain('<bpmn:userTask');
    expect(handle().isDirty()).toBe(false);
    expect(container.querySelector('.oge-bpmn-minimap')).not.toBeNull();
  });

  it('places a node with the palette click-then-place tool', () => {
    const { container, handle } = setup();
    const task = screen.getByRole('button', { name: 'Task' });
    fireEvent.click(task);
    expect(task.getAttribute('aria-pressed')).toBe('true');
    pointerDown(container.querySelector('.oge-bpmn-canvas') as Element, {
      button: 0,
      clientX: 300,
      clientY: 200,
    });
    expect(shapes(container)).toHaveLength(1);
    expect(handle().getSelection()).toHaveLength(1);
    expect(live(container)).toBe('Task created');
    expect(task.getAttribute('aria-pressed')).toBe('false');
  });

  it('moves the selection with arrow keys, undoes and redoes', async () => {
    const onSelectionChanged = vi.fn();
    const { handle, wrap } = await imported({ onSelectionChanged });
    act(() => handle().select(['Activity_approve']));
    expect(onSelectionChanged.mock.calls.at(-1)?.[0].ids).toEqual([
      'Activity_approve',
    ]);
    expect(wrap.getAttribute('aria-activedescendant')).toMatch(
      /-el-Activity_approve$/,
    );
    const x = () =>
      handle().exportJson().diagram.shapeDi['Activity_approve'].bounds.x;
    const before = x();
    fireEvent.keyDown(wrap, { key: 'ArrowRight' });
    expect(x()).toBe(before + 10);
    fireEvent.keyDown(wrap, { key: 'z', ctrlKey: true });
    expect(x()).toBe(before);
    fireEvent.keyDown(wrap, { key: 'y', ctrlKey: true });
    expect(x()).toBe(before + 10);
  });

  it('shows the context pad on a selection and appends a connected task', async () => {
    const { container, handle } = await imported();
    act(() => handle().select(['Activity_approve']));
    const pad = container.querySelector('.oge-bpmn-context-pad');
    expect(pad).not.toBeNull();
    const count = shapes(container).length;
    fireEvent.click(screen.getByRole('button', { name: 'Append task' }));
    expect(shapes(container)).toHaveLength(count + 1);
    expect(live(container)).toBe('Task created');
  });

  it('puts the context pad left of the shape in an RTL page; the canvas stays LTR', async () => {
    document.documentElement.setAttribute('dir', 'rtl');
    try {
      const { container, handle } = await imported();
      act(() => handle().select(['Activity_approve']));
      const pad = container.querySelector('.oge-bpmn-context-pad');
      expect(pad?.classList.contains('oge-bpmn-context-pad-left')).toBe(true);
      act(() => document.documentElement.setAttribute('dir', 'ltr'));
      await act(async () => undefined);
      expect(
        container
          .querySelector('.oge-bpmn-context-pad')
          ?.classList.contains('oge-bpmn-context-pad-left'),
      ).toBe(false);
    } finally {
      document.documentElement.removeAttribute('dir');
    }
  });

  it('commits a properties-panel field on the native change, once', async () => {
    const onElementsChanged = vi.fn();
    const { container, handle } = await imported({ onElementsChanged });
    act(() => handle().select(['Activity_approve']));
    const name = container.querySelector(
      '.oge-bpmn-properties input.oge-bpmn-props-input',
    ) as HTMLInputElement;
    const calls = onElementsChanged.mock.calls.length;
    name.value = 'Renamed';
    fireEvent.input(name);
    expect(onElementsChanged.mock.calls.length).toBe(calls);
    act(() => {
      name.dispatchEvent(new Event('change'));
    });
    expect(onElementsChanged.mock.calls.length).toBe(calls + 1);
    expect(handle().exportXml()).toContain('name="Renamed"');
  });

  it('reverts a panel field on Escape without committing', async () => {
    const { container, handle } = await imported();
    act(() => handle().select(['Activity_approve']));
    const name = container.querySelector(
      '.oge-bpmn-properties input.oge-bpmn-props-input',
    ) as HTMLInputElement;
    const original = name.value;
    name.value = 'Typed';
    fireEvent.keyDown(name, { key: 'Escape' });
    expect(name.value).toBe(original);
  });

  it('hides palette and properties panel while read-only', async () => {
    const { container } = await imported({ readOnly: true });
    expect(container.querySelector('.oge-bpmn-palette')).toBeNull();
    expect(container.querySelector('.oge-bpmn-properties')).toBeNull();
    expect(
      container
        .querySelector('.oge-bpmn-editor')
        ?.classList.contains('oge-bpmn-readonly'),
    ).toBe(true);
  });

  it('toggles an uncontrolled mode and reports it', () => {
    const onModeChange = vi.fn();
    const { container } = setup({ allowModeToggle: true, onModeChange });
    fireEvent.click(
      screen.getByRole('button', { name: 'Switch to view mode' }),
    );
    expect(onModeChange).toHaveBeenCalledWith('view');
    expect(container.querySelector('.oge-bpmn-palette')).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Switch to edit mode' }),
    );
    expect(onModeChange).toHaveBeenLastCalledWith('edit');
    expect(container.querySelector('.oge-bpmn-palette')).not.toBeNull();
  });

  it('follows a controlled mode', () => {
    function Host() {
      const [mode, setMode] = useState<'edit' | 'view'>('view');
      return (
        <>
          <button type="button" onClick={() => setMode('edit')}>
            edit
          </button>
          <OgeBpmnEditor mode={mode} onModeChange={setMode} />
        </>
      );
    }
    const { container } = render(<Host />);
    expect(container.querySelector('.oge-bpmn-palette')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'edit' }));
    expect(container.querySelector('.oge-bpmn-palette')).not.toBeNull();
  });

  it('applies the initial zoom at mount and reports zoom changes', () => {
    const onZoomChange = vi.fn();
    const { container } = setup({ zoom: 2, onZoomChange });
    expect(container.querySelector('.oge-bpmn-header-zoom')?.textContent).toBe(
      '200%',
    );
    expect(onZoomChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(onZoomChange).toHaveBeenCalledWith(2.4);
  });

  it('zooms with a non-passive wheel listener', () => {
    const onZoomChange = vi.fn();
    const { container } = setup({ onZoomChange });
    const svg = container.querySelector('.oge-bpmn-canvas') as Element;
    const event = new WheelEvent('wheel', {
      deltaY: -100,
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      svg.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
    expect(onZoomChange).toHaveBeenCalledWith(1.1);
  });

  it('opens element search with Ctrl+F and picks a result', async () => {
    const { container, wrap, handle } = await imported();
    fireEvent.keyDown(wrap, { key: 'f', ctrlKey: true });
    const input = container.querySelector(
      '.oge-bpmn-search-input',
    ) as HTMLInputElement;
    expect(input).not.toBeNull();
    fireEvent.change(input, { target: { value: 'approve' } });
    const option = container.querySelector('.oge-bpmn-search-result');
    expect(option?.textContent).toContain('Activity_approve');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(handle().getSelection()).toEqual(['Activity_approve']);
    expect(container.querySelector('.oge-bpmn-search')).toBeNull();
  });

  it('renders overlays through the sanitizer — no script, no unsafe href', async () => {
    const { container, handle } = await imported();
    act(() => {
      handle().addOverlay({
        elementId: 'Activity_approve',
        html: '<span class="badge" onclick="alert(1)">7</span><script>alert(2)</script><a href="javascript:alert(3)">x</a>',
        position: 'top-right',
      });
    });
    const overlay = container.querySelector('.oge-bpmn-overlay') as HTMLElement;
    expect(overlay.querySelector('span.badge')?.textContent).toBe('7');
    expect(overlay.querySelector('span')?.getAttribute('onclick')).toBeNull();
    expect(overlay.querySelector('script')).toBeNull();
    expect(overlay.querySelector('a')?.getAttribute('href')).toBe(
      'about:blank',
    );
    act(() => handle().clearOverlays());
    expect(container.querySelector('.oge-bpmn-overlay')).toBeNull();
  });

  it('hardens overlay links (rel) and drops role, like the Angular layer', async () => {
    const { container, handle } = await imported();
    act(() => {
      handle().addOverlay({
        elementId: 'Activity_approve',
        html: '<a href="https://ogeui.com" target="_blank" rel="opener">d</a><span role="button">x</span>',
        position: 'top-right',
      });
    });
    const overlay = container.querySelector('.oge-bpmn-overlay') as HTMLElement;
    expect(overlay.querySelector('a')?.getAttribute('rel')).toBe(
      'noopener noreferrer',
    );
    expect(overlay.querySelector('[role]')).toBeNull();
  });

  it('sanitizes a data-driven brand logo URL', () => {
    const { container } = setup({ brandLogoUrl: 'javascript:alert(1)' });
    const img = container.querySelector('.oge-bpmn-brand-img');
    expect(img?.getAttribute('src')).toBe('about:blank');
  });

  it('emits dirtyChanged and markSaved resets it', async () => {
    const onDirtyChanged = vi.fn();
    const { handle, wrap } = await imported({ onDirtyChanged });
    act(() => handle().select(['Activity_approve']));
    fireEvent.keyDown(wrap, { key: 'ArrowDown' });
    expect(onDirtyChanged).toHaveBeenLastCalledWith(true);
    act(() => handle().markSaved());
    expect(onDirtyChanged).toHaveBeenLastCalledWith(false);
  });

  it('streams diagramChanged with the provider debounce (0 = sync)', async () => {
    const onDiagramChanged = vi.fn();
    const ref = createRef<OgeBpmnEditorHandle>();
    render(
      <OgeBpmnConfigProvider config={{ autoSaveDebounceMs: 0 }}>
        <OgeBpmnEditor ref={ref} onDiagramChanged={onDiagramChanged} />
      </OgeBpmnConfigProvider>,
    );
    await act(async () => {
      await ref.current?.importXml(demoProcessXml('bpmn'));
    });
    const event = onDiagramChanged.mock.calls.at(-1)?.[0];
    expect(event.source).toBe('import');
    expect(event.xml).toContain('<bpmn:definitions');
    expect(event.json.diagram).toBeDefined();
  });

  it('re-resolves the provider config when its prop changes', () => {
    function Host() {
      const [lang, setLang] = useState<'en' | 'tr'>('en');
      return (
        <>
          <button type="button" onClick={() => setLang('tr')}>
            tr
          </button>
          <OgeBpmnConfigProvider
            config={
              lang === 'tr'
                ? { messages: { emptyText: 'Boş diyagram' } }
                : undefined
            }
          >
            <OgeBpmnEditor />
          </OgeBpmnConfigProvider>
        </>
      );
    }
    const { container } = render(<Host />);
    expect(container.querySelector('.oge-bpmn-empty')?.textContent).toBe(
      'Empty diagram — pick an element from the palette',
    );
    fireEvent.click(screen.getByRole('button', { name: 'tr' }));
    expect(container.querySelector('.oge-bpmn-empty')?.textContent).toBe(
      'Boş diyagram',
    );
  });

  it('merges per-instance messages over the config', () => {
    const { container } = setup({ messages: { canvasLabel: 'My diagram' } });
    expect(
      container
        .querySelector('.oge-bpmn-canvas-wrap')
        ?.getAttribute('aria-label'),
    ).toBe('My diagram. Press Escape then Tab to leave the diagram');
  });

  it('drags a shape and commits one move on release', async () => {
    const { container, handle } = await imported();
    const shape = container.querySelector(
      '[id$="-el-Activity_approve"]',
    ) as Element;
    const x = () =>
      handle().exportJson().diagram.shapeDi['Activity_approve'].bounds.x;
    const before = x();
    pointerDown(shape, { button: 0, clientX: 100, clientY: 100 });
    act(() => {
      document.dispatchEvent(
        new MouseEvent('pointermove', { clientX: 160, clientY: 100 }),
      );
    });
    expect(container.querySelector('.oge-bpmn-ghost')).not.toBeNull();
    expect(x()).toBe(before);
    act(() => {
      document.dispatchEvent(new MouseEvent('pointerup'));
    });
    expect(x()).not.toBe(before);
    expect(container.querySelector('.oge-bpmn-ghost')).toBeNull();
  });

  it('resizes the palette rail with the separator keys', () => {
    const { container } = setup();
    const separator = container.querySelector(
      '.oge-bpmn-resizer',
    ) as HTMLElement;
    fireEvent.keyDown(separator, { key: 'ArrowRight' });
    expect(separator.getAttribute('aria-valuenow')).toBe('80');
    fireEvent.keyDown(separator, { key: 'Home' });
    expect(separator.getAttribute('aria-valuenow')).toBe('48');
  });

  it('works under StrictMode (the revived core keeps reporting changes)', async () => {
    const onElementsChanged = vi.fn();
    const ref = createRef<OgeBpmnEditorHandle>();
    const { container } = render(
      <StrictMode>
        <OgeBpmnEditor ref={ref} onElementsChanged={onElementsChanged} />
      </StrictMode>,
    );
    sizeCanvas(container);
    await act(async () => {
      await ref.current?.importXml(demoProcessXml('bpmn'));
    });
    expect(shapes(container)).toHaveLength(5);
    expect(onElementsChanged).toHaveBeenCalled();
    act(() => ref.current?.select(['Activity_approve']));
    fireEvent.keyDown(
      container.querySelector('.oge-bpmn-canvas-wrap') as Element,
      { key: 'Delete' },
    );
    expect(shapes(container)).toHaveLength(4);
  });
});
