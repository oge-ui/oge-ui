import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeSplitter } from './splitter';
import type { OgeSplitterPaneData, OgeSplitterSize } from './splitter-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeSplitter],
  template: `<oge-splitter [panes]="panes" [(sizes)]="sizes" />`,
})
class PerfHost {
  readonly panes: readonly OgeSplitterPaneData[] = [
    { key: 'a', text: 'A' },
    { key: 'b', text: 'B' },
    { key: 'c', text: 'C' },
  ];
  readonly sizes = signal<readonly OgeSplitterSize[]>([30, 40, 30]);
}

/**
 * The gesture budget. A drag emits a pointermove per frame or faster, so any
 * layout read inside the move handler is multiplied by the length of the
 * drag — the classic source of resize jank. This locks in that the splitter
 * measures once at gesture start and never again until it ends.
 */
describe('OgeSplitter layout-read budget', () => {
  let calls: number;
  let spy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    calls = 0;
    const real = window.getComputedStyle.bind(window);
    spy = vi.spyOn(window, 'getComputedStyle').mockImplementation(((
      el: Element,
      pseudo?: string | null,
    ) => {
      calls++;
      return real(el, pseudo ?? undefined);
    }) as typeof window.getComputedStyle);
  });
  afterEach(() => spy.mockRestore());

  it('reads layout once per gesture, not once per pointermove', async () => {
    const fixture = TestBed.createComponent(PerfHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const separator = el.querySelector(
      '.oge-splitter-separator',
    ) as HTMLElement;

    separator.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, clientX: 100 }),
    );
    await settle(fixture);
    const afterStart = calls;

    for (let i = 0; i < 40; i++) {
      document.dispatchEvent(
        new MouseEvent('pointermove', { bubbles: true, clientX: 100 + i }),
      );
    }
    // not one style read across forty moves
    expect(calls - afterStart).toBe(0);

    document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
    await settle(fixture);
  });

  it('re-measures at most once for a settled size change', async () => {
    const fixture = TestBed.createComponent(PerfHost);
    await settle(fixture);
    calls = 0;
    fixture.componentInstance.sizes.set([50, 25, 25]);
    await settle(fixture);
    expect(calls).toBeLessThanOrEqual(1);
  });
});
