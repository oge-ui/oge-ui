import {
  ChangeDetectionStrategy,
  Component,
  signal,
  viewChild,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeSplitter } from './splitter';
import type {
  OgeSplitterPaneData,
  OgeSplitterResizeEvent,
  OgeSplitterResizeStartEvent,
} from './splitter-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function pointer(
  type: string,
  init: { clientX?: number; clientY?: number } = {},
): PointerEvent {
  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    ...init,
  }) as unknown as PointerEvent;
}

@Component({
  selector: 'oge-test-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OgeSplitter],
  template: `
    <oge-splitter
      [panes]="panes()"
      [disabled]="disabled()"
      [resizable]="resizable()"
      [keyboardNavigation]="keyboardNavigation()"
      [showCollapseGrips]="showCollapseGrips()"
      (resizeStarted)="started.push($event)"
      (resized)="moved.push($event)"
      (resizeEnded)="ended.push($event)"
    />
  `,
})
class Host {
  readonly splitter = viewChild.required(OgeSplitter);
  readonly panes = signal<readonly OgeSplitterPaneData[]>([]);
  readonly disabled = signal(false);
  readonly resizable = signal(true);
  readonly keyboardNavigation = signal(true);
  readonly showCollapseGrips = signal(true);
  readonly started: OgeSplitterResizeStartEvent[] = [];
  readonly moved: OgeSplitterResizeEvent[] = [];
  readonly ended: OgeSplitterResizeEvent[] = [];
}

describe('OgeSplitter robustness', () => {
  async function render(panes: readonly OgeSplitterPaneData[]) {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.panes.set(panes);
    await settle(fixture);
    const el: HTMLElement = fixture.nativeElement;
    const separators = () =>
      Array.from(el.querySelectorAll<HTMLElement>('.oge-splitter-separator'));
    return {
      fixture,
      host: fixture.componentInstance,
      el,
      separators,
      press: async (key: string) => {
        separators()[0].dispatchEvent(
          new KeyboardEvent('keydown', {
            key,
            bubbles: true,
            cancelable: true,
          }),
        );
        await settle(fixture);
      },
      template: () =>
        (el.querySelector('.oge-splitter') as HTMLElement).style
          .gridTemplateColumns,
    };
  }

  const even: OgeSplitterPaneData[] = [
    { key: 'a', size: 50 },
    { key: 'b', size: 50 },
  ];

  it('emits nothing for a nudge that is already against the stop', async () => {
    const view = await render([
      { key: 'a', size: 50, maxSize: 60 },
      { key: 'b', size: 50 },
    ]);

    await view.press('End');
    expect(view.template()).toBe('minmax(0, 60fr) 6px minmax(0, 40fr)');
    expect(view.host.ended).toHaveLength(1);

    // already at the maximum — holding End must not spray events
    await view.press('End');
    await view.press('End');
    expect(view.host.started).toHaveLength(1);
    expect(view.host.moved).toHaveLength(1);
    expect(view.host.ended).toHaveLength(1);
  });

  it('reports resize() as false when the separator cannot move further', async () => {
    const view = await render([
      { key: 'a', size: 50, maxSize: 60 },
      { key: 'b', size: 50 },
    ]);
    expect(view.host.splitter().resize(0, 50)).toBe(true);
    await settle(view.fixture);
    expect(view.host.splitter().resize(0, 50)).toBe(false);
  });

  it('keeps dragged sizes when an equal but newly created panes array arrives', async () => {
    const view = await render(even);
    view.host.splitter().resize(0, 20);
    await settle(view.fixture);
    expect(view.template()).toBe('minmax(0, 70fr) 6px minmax(0, 30fr)');

    // what a parent template binding `[panes]="[...]"` does on every pass
    view.host.panes.set([
      { key: 'a', size: 50 },
      { key: 'b', size: 50 },
    ]);
    await settle(view.fixture);
    expect(view.template()).toBe('minmax(0, 70fr) 6px minmax(0, 30fr)');
  });

  it('does reset the sizes when a declared size genuinely changes', async () => {
    const view = await render(even);
    view.host.splitter().resize(0, 20);
    await settle(view.fixture);

    view.host.panes.set([
      { key: 'a', size: 25 },
      { key: 'b', size: 75 },
    ]);
    await settle(view.fixture);
    expect(view.template()).toBe('minmax(0, 25fr) 6px minmax(0, 75fr)');
  });

  it('resets the sizes when the pane set itself changes', async () => {
    const view = await render(even);
    view.host.splitter().resize(0, 20);
    await settle(view.fixture);

    view.host.panes.set([
      { key: 'a', size: 50 },
      { key: 'b', size: 50 },
      { key: 'c', size: 50 },
    ]);
    await settle(view.fixture);
    expect(view.template()).toBe(
      'minmax(0, 33.33fr) 6px minmax(0, 33.33fr) 6px minmax(0, 33.33fr)',
    );
  });

  it('reverts an in-flight drag when the window loses focus', async () => {
    const view = await render(even);
    view.separators()[0].dispatchEvent(pointer('pointerdown', { clientX: 0 }));
    document.dispatchEvent(pointer('pointermove', { clientX: 20 }));
    await settle(view.fixture);
    expect(view.template()).toBe('minmax(0, 70fr) 6px minmax(0, 30fr)');

    window.dispatchEvent(new Event('blur'));
    await settle(view.fixture);
    expect(view.template()).toBe('minmax(0, 50fr) 6px minmax(0, 50fr)');
    expect(view.host.ended).toHaveLength(1);
  });

  it('does not write the same size twice while dragging past a stop', async () => {
    const view = await render([
      { key: 'a', size: 50, maxSize: 60 },
      { key: 'b', size: 50 },
    ]);
    view.separators()[0].dispatchEvent(pointer('pointerdown', { clientX: 0 }));
    document.dispatchEvent(pointer('pointermove', { clientX: 40 }));
    document.dispatchEvent(pointer('pointermove', { clientX: 60 }));
    document.dispatchEvent(pointer('pointermove', { clientX: 80 }));
    document.dispatchEvent(pointer('pointerup', { clientX: 80 }));
    await settle(view.fixture);

    // three moves, but only the first actually changed anything
    expect(view.host.moved).toHaveLength(1);
    expect(view.template()).toBe('minmax(0, 60fr) 6px minmax(0, 40fr)');
  });

  it('lets a nested splitter inherit the container-level inputs', async () => {
    const view = await render([
      { key: 'left' },
      {
        key: 'right',
        panes: [{ key: 'x', collapsible: true }, { key: 'y' }],
      },
    ]);
    const nested = () =>
      view.el.querySelectorAll('oge-splitter')[1] as HTMLElement;
    const nestedSeparator = () =>
      nested().querySelector('.oge-splitter-separator') as HTMLElement;

    expect(nested().classList).not.toContain('oge-disabled');
    expect(nestedSeparator().tabIndex).toBe(0);
    expect(nested().querySelector('.oge-splitter-grip')).not.toBeNull();

    view.host.disabled.set(true);
    await settle(view.fixture);
    expect(nested().classList).toContain('oge-disabled');

    view.host.disabled.set(false);
    view.host.keyboardNavigation.set(false);
    view.host.showCollapseGrips.set(false);
    await settle(view.fixture);
    expect(nestedSeparator().tabIndex).toBe(-1);
    expect(nested().querySelector('.oge-splitter-grip')).toBeNull();

    view.host.resizable.set(false);
    await settle(view.fixture);
    expect(nestedSeparator().getAttribute('aria-disabled')).toBe('true');
  });

  it('tears an in-flight gesture down when the splitter is destroyed', async () => {
    const view = await render(even);
    view.separators()[0].dispatchEvent(pointer('pointerdown', { clientX: 0 }));
    view.fixture.destroy();

    // no listener may survive the component
    expect(() =>
      document.dispatchEvent(pointer('pointermove', { clientX: 40 })),
    ).not.toThrow();
    expect(view.host.moved).toHaveLength(0);
  });
});
