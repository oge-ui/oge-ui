import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeTabs } from './tabs';
import type {
  OgeTabItem,
  OgeTabReorderedEvent,
  OgeTabReorderingEvent,
} from './tabs-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function pointer(
  type: string,
  init: { x?: number; y?: number; pointerId?: number; button?: number },
): PointerEvent {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: init.x ?? 0,
    clientY: init.y ?? 0,
    button: init.button ?? 0,
  });
  Object.defineProperty(event, 'pointerId', { value: init.pointerId ?? 1 });
  return event as PointerEvent;
}

/** Lays the tabs out horizontally: 100px wide slots at x = index * 100. */
function stubRects(tabs: readonly HTMLElement[]): void {
  tabs.forEach((tab, index) => {
    tab.getBoundingClientRect = () =>
      ({
        x: index * 100,
        y: 0,
        left: index * 100,
        right: index * 100 + 100,
        top: 0,
        bottom: 30,
        width: 100,
        height: 30,
        toJSON: () => ({}),
      }) as DOMRect;
  });
}

@Component({
  imports: [OgeTabs],
  template: `
    <oge-tabs
      [items]="items()"
      [(selectedIndex)]="index"
      [allowTabReordering]="true"
      (tabReordering)="onReordering($event)"
      (tabReordered)="reordered.push($event)"
      (selectionChanged)="selections.push($event.index)"
    />
  `,
})
class ReorderHost {
  readonly items = signal<readonly OgeTabItem[]>([
    { key: 'a', text: 'Alpha' },
    { key: 'b', text: 'Beta' },
    { key: 'c', text: 'Gamma' },
  ]);
  readonly index = signal(0);
  cancelNext = false;
  readonly reordering: OgeTabReorderingEvent[] = [];
  readonly reordered: OgeTabReorderedEvent[] = [];
  readonly selections: number[] = [];

  onReordering(event: OgeTabReorderingEvent): void {
    this.reordering.push(event);
    if (this.cancelNext) event.cancel = true;
  }
}

describe('OgeTabs drag reorder', () => {
  async function render(setup?: (host: ReorderHost) => void) {
    const fixture = TestBed.createComponent(ReorderHost);
    setup?.(fixture.componentInstance);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const tabs = () => Array.from(el.querySelectorAll<HTMLElement>('.oge-tab'));
    stubRects(tabs());
    return { fixture, host: fixture.componentInstance, tabs };
  }

  function texts(tabs: readonly HTMLElement[]): (string | undefined)[] {
    return tabs.map(
      (tab) => tab.querySelector('.oge-tab-text')?.textContent ?? undefined,
    );
  }

  async function drag(
    fixture: ComponentFixture<unknown>,
    tab: HTMLElement,
    fromX: number,
    toX: number,
  ): Promise<void> {
    tab.dispatchEvent(pointer('pointerdown', { x: fromX }));
    tab.dispatchEvent(pointer('pointermove', { x: fromX + 5 }));
    tab.dispatchEvent(pointer('pointermove', { x: toX }));
    await settle(fixture);
    tab.dispatchEvent(pointer('pointerup', { x: toX }));
    await settle(fixture);
  }

  it('dragging the first tab past the last reorders to b, c, a', async () => {
    const { fixture, host, tabs } = await render();
    await drag(fixture, tabs()[0], 10, 280);
    expect(texts(tabs())).toEqual(['Beta', 'Gamma', 'Alpha']);
    expect(host.reordered).toEqual([{ fromIndex: 0, toIndex: 2, key: 'a' }]);
    // the selected tab (Alpha) keeps its selection at the new position
    expect(host.index()).toBe(2);
    // reordering is not a selection change
    expect(host.selections).toEqual([]);
  });

  it('applies the dragging class while past the threshold', async () => {
    const { fixture, tabs } = await render();
    const tab = tabs()[0];
    tab.dispatchEvent(pointer('pointerdown', { x: 10 }));
    tab.dispatchEvent(pointer('pointermove', { x: 60 }));
    await settle(fixture);
    expect(tab.classList.contains('oge-tab-dragging')).toBe(true);
    tab.dispatchEvent(pointer('pointerup', { x: 60 }));
    await settle(fixture);
    expect(tab.classList.contains('oge-tab-dragging')).toBe(false);
  });

  it('a canceled tabReordering keeps the order', async () => {
    const { fixture, host, tabs } = await render();
    host.cancelNext = true;
    await drag(fixture, tabs()[0], 10, 280);
    expect(texts(tabs())).toEqual(['Alpha', 'Beta', 'Gamma']);
    expect(host.reordered.length).toBe(0);
  });

  it('a sub-threshold press stays a click', async () => {
    const { fixture, host, tabs } = await render();
    const tab = tabs()[1];
    tab.dispatchEvent(pointer('pointerdown', { x: 110 }));
    tab.dispatchEvent(pointer('pointermove', { x: 112 }));
    tab.dispatchEvent(pointer('pointerup', { x: 112 }));
    tab.click();
    await settle(fixture);
    expect(host.reordered.length).toBe(0);
    expect(host.index()).toBe(1);
  });

  it('suppresses the click that follows a drag', async () => {
    const { fixture, host, tabs } = await render();
    await drag(fixture, tabs()[1], 110, 130);
    tabs()[1].click();
    await settle(fixture);
    expect(host.selections).toEqual([]);
    expect(host.index()).toBe(0);
  });

  it('Escape cancels an in-flight drag', async () => {
    const { fixture, host, tabs } = await render();
    const tab = tabs()[0];
    tab.dispatchEvent(pointer('pointerdown', { x: 10 }));
    tab.dispatchEvent(pointer('pointermove', { x: 150 }));
    await settle(fixture);
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await settle(fixture);
    expect(tab.classList.contains('oge-tab-dragging')).toBe(false);
    tab.dispatchEvent(pointer('pointerup', { x: 150 }));
    await settle(fixture);
    expect(host.reordered.length).toBe(0);
  });
});
