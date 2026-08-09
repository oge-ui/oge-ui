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
  OgeSplitterSize,
} from './splitter-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

/**
 * jsdom has no layout, so a splitter made only of share panes measures no
 * pixels and falls back to a unit-free scale of 100 — one "pixel" of drag is
 * exactly one share point, which is what makes these numbers readable.
 */
function pointer(
  type: string,
  init: { clientX?: number; clientY?: number; button?: number } = {},
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
      [(sizes)]="sizes"
      [orientation]="vertical() ? 'vertical' : 'horizontal'"
      [resizable]="resizable()"
      [disabled]="disabled()"
      (resizeStarted)="started.push($event)"
      (resized)="moved.push($event)"
      (resizeEnded)="ended.push($event)"
    />
  `,
})
class Host {
  readonly splitter = viewChild.required(OgeSplitter);
  readonly panes = signal<readonly OgeSplitterPaneData[]>([]);
  readonly sizes = signal<readonly OgeSplitterSize[] | undefined>(undefined);
  readonly vertical = signal(false);
  readonly resizable = signal(true);
  readonly disabled = signal(false);
  readonly started: OgeSplitterResizeStartEvent[] = [];
  readonly moved: OgeSplitterResizeEvent[] = [];
  readonly ended: OgeSplitterResizeEvent[] = [];
}

describe('OgeSplitter pointer resize', () => {
  async function render(panes: readonly OgeSplitterPaneData[]) {
    const fixture = TestBed.createComponent(Host);
    const host = fixture.componentInstance;
    host.panes.set(panes);
    await settle(fixture);
    const el: HTMLElement = fixture.nativeElement;
    const root = el.querySelector('.oge-splitter') as HTMLElement;
    const separators = () =>
      Array.from(el.querySelectorAll<HTMLElement>('.oge-splitter-separator'));

    async function drag(index: number, to: number, axis: 'x' | 'y' = 'x') {
      const at = (value: number) =>
        axis === 'x' ? { clientX: value } : { clientY: value };
      separators()[index].dispatchEvent(pointer('pointerdown', at(0)));
      document.dispatchEvent(pointer('pointermove', at(to)));
      document.dispatchEvent(pointer('pointerup', at(to)));
      await settle(fixture);
    }

    return {
      fixture,
      host,
      el,
      root,
      separators,
      drag,
      template: () =>
        root.style.gridTemplateColumns || root.style.gridTemplateRows,
    };
  }

  const even: OgeSplitterPaneData[] = [
    { key: 'a', size: 50 },
    { key: 'b', size: 50 },
  ];

  it('moves both neighbours when a separator is dragged', async () => {
    const view = await render(even);
    await view.drag(0, 10);
    expect(view.template()).toBe('minmax(0, 60fr) 6px minmax(0, 40fr)');
  });

  it('drags the other way for a negative delta', async () => {
    const view = await render(even);
    await view.drag(0, -20);
    expect(view.template()).toBe('minmax(0, 30fr) 6px minmax(0, 70fr)');
  });

  it('publishes the result to the two-way sizes model when the gesture ends', async () => {
    const view = await render(even);
    expect(view.host.sizes()).toBeUndefined();
    await view.drag(0, 10);
    expect(view.host.sizes()).toEqual([60, 40]);
  });

  it('emits resizeStarted once, resized per move and resizeEnded once', async () => {
    const view = await render(even);
    view.separators()[0].dispatchEvent(pointer('pointerdown', { clientX: 0 }));
    document.dispatchEvent(pointer('pointermove', { clientX: 5 }));
    document.dispatchEvent(pointer('pointermove', { clientX: 10 }));
    document.dispatchEvent(pointer('pointerup', { clientX: 10 }));
    await settle(view.fixture);

    expect(view.host.started).toHaveLength(1);
    expect(view.host.moved).toHaveLength(2);
    expect(view.host.ended).toHaveLength(1);
    expect(view.host.started[0].separatorIndex).toBe(0);
    expect(view.host.moved[0].sizes).toEqual([55, 45]);
    expect(view.host.ended[0].sizes).toEqual([60, 40]);
    expect(view.host.ended[0].previousSizes).toEqual([50, 50]);
  });

  it('clamps to minSize and maxSize', async () => {
    const view = await render([
      { key: 'a', size: 50, maxSize: 70 },
      { key: 'b', size: 50, minSize: 20 },
    ]);
    await view.drag(0, 90);
    expect(view.template()).toBe('minmax(0, 70fr) 6px minmax(0, 30fr)');
  });

  it('leaves the third pane alone', async () => {
    const view = await render([
      { key: 'a', size: 40 },
      { key: 'b', size: 30 },
      { key: 'c', size: 30 },
    ]);
    await view.drag(1, 10);
    expect(view.template()).toBe(
      'minmax(0, 40fr) 6px minmax(0, 40fr) 6px minmax(0, 20fr)',
    );
  });

  it('reverts the gesture when Escape is pressed mid-drag', async () => {
    const view = await render(even);
    view.separators()[0].dispatchEvent(pointer('pointerdown', { clientX: 0 }));
    document.dispatchEvent(pointer('pointermove', { clientX: 20 }));
    await settle(view.fixture);
    expect(view.template()).toBe('minmax(0, 70fr) 6px minmax(0, 30fr)');

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await settle(view.fixture);
    expect(view.template()).toBe('minmax(0, 50fr) 6px minmax(0, 50fr)');
  });

  it('reverts on pointercancel', async () => {
    const view = await render(even);
    view.separators()[0].dispatchEvent(pointer('pointerdown', { clientX: 0 }));
    document.dispatchEvent(pointer('pointermove', { clientX: 20 }));
    document.dispatchEvent(pointer('pointercancel', { clientX: 20 }));
    await settle(view.fixture);
    expect(view.template()).toBe('minmax(0, 50fr) 6px minmax(0, 50fr)');
  });

  it('ignores a non-primary mouse button', async () => {
    const view = await render(even);
    view
      .separators()[0]
      .dispatchEvent(pointer('pointerdown', { clientX: 0, button: 2 }));
    document.dispatchEvent(pointer('pointermove', { clientX: 20 }));
    document.dispatchEvent(pointer('pointerup', { clientX: 20 }));
    await settle(view.fixture);
    expect(view.template()).toBe('minmax(0, 50fr) 6px minmax(0, 50fr)');
    expect(view.host.started).toHaveLength(0);
  });

  it('follows the vertical axis when the orientation is vertical', async () => {
    const view = await render(even);
    view.host.vertical.set(true);
    await settle(view.fixture);
    await view.drag(0, 10, 'y');
    expect(view.root.style.gridTemplateRows).toBe(
      'minmax(0, 60fr) 6px minmax(0, 40fr)',
    );
  });

  it('does not resize a pinned pane', async () => {
    const view = await render([
      { key: 'a', size: 50, resizable: false },
      { key: 'b', size: 50 },
    ]);
    await view.drag(0, 20);
    expect(view.template()).toBe('minmax(0, 50fr) 6px minmax(0, 50fr)');
  });

  it('does not resize while [resizable] is false or the splitter is disabled', async () => {
    const view = await render(even);
    view.host.resizable.set(false);
    await settle(view.fixture);
    await view.drag(0, 20);
    expect(view.template()).toBe('minmax(0, 50fr) 6px minmax(0, 50fr)');

    view.host.resizable.set(true);
    view.host.disabled.set(true);
    await settle(view.fixture);
    await view.drag(0, 20);
    expect(view.template()).toBe('minmax(0, 50fr) 6px minmax(0, 50fr)');
  });

  it('inverts the delta in RTL so the separator follows the pointer', async () => {
    const view = await render(even);
    view.root.style.direction = 'rtl';
    await view.drag(0, 20);
    // dragging towards the viewport right in RTL shrinks the first pane
    expect(view.template()).toBe('minmax(0, 30fr) 6px minmax(0, 70fr)');
  });

  it('resizes a fixed pane in pixels against the measured container', async () => {
    const view = await render([
      { key: 'side', size: '200px', minSize: '120px' },
      { key: 'main', size: 100 },
    ]);
    // 806px host − 200px fixed − 6px separator = 600px of flexible space
    vi.spyOn(view.root, 'getBoundingClientRect').mockReturnValue({
      width: 806,
      height: 400,
    } as DOMRect);

    await view.drag(0, 50);
    expect(view.template()).toBe('250px 6px minmax(0, 100fr)');

    await view.drag(0, -1000);
    expect(view.template()).toBe('120px 6px minmax(0, 100fr)');
  });

  it('exposes resize() as the programmatic equivalent', async () => {
    const view = await render(even);
    expect(view.host.splitter().resize(0, 15)).toBe(true);
    await settle(view.fixture);
    expect(view.template()).toBe('minmax(0, 65fr) 6px minmax(0, 35fr)');
    expect(view.host.splitter().resize(5, 15)).toBe(false);
  });
});
