import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeDateBox } from './date-box';
import { OgeDateRangeBox } from './date-range-box';

@Component({
  imports: [OgeDateBox, OgeDateRangeBox],
  template: `
    <oge-date-box label="Due" adaptiveMode="auto" [(value)]="date" />
    <oge-date-range-box label="Trip" adaptiveMode="auto" [(value)]="range" />
  `,
})
class Host {
  readonly date = signal<Date | null>(new Date(2026, 4, 10));
  readonly range = signal<readonly [Date | null, Date | null]>([null, null]);
}

function stubViewport(narrow: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        matches: query.includes('max-width') ? narrow : false,
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList,
  );
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 3; i++) {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  fixture.detectChanges();
}

describe('date editors — adaptive mode', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'requestAnimationFrame',
      (cb: FrameRequestCallback) =>
        setTimeout(() => cb(performance.now()), 0) as unknown as number,
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.style.overflow = '';
  });

  it('opens the date box picker as a full-screen dialog', async () => {
    stubViewport(true);
    const fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    await settle(fixture);
    const dateBox: OgeDateBox =
      fixture.debugElement.children[0].componentInstance;
    dateBox.open();
    await settle(fixture);
    const layer: HTMLElement =
      fixture.nativeElement.querySelector('.oge-popup');
    expect(layer.classList).toContain('oge-popup-adaptive-fullscreen');
    const dialogs = layer.querySelectorAll('[role="dialog"]');
    // one dialog — the inner picker drops its own role while adaptive
    expect(dialogs.length).toBe(1);
    expect(dialogs[0].classList).toContain('oge-popup-sheet');
    expect(
      layer.querySelector('.oge-popup-sheet-title')?.textContent?.trim(),
    ).toBe('Due');
    // no swipe handle on a full-screen dialog
    expect(layer.querySelector('.oge-popup-sheet-handle')).toBeNull();
    expect(layer.contains(document.activeElement)).toBe(true);
    fixture.nativeElement.remove();
  });

  it('keeps the range dialog open after both ends and applies from Done', async () => {
    stubViewport(true);
    const fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    await settle(fixture);
    const rangeBox: OgeDateRangeBox =
      fixture.debugElement.children[1].componentInstance;
    rangeBox.open();
    await settle(fixture);
    const layer: HTMLElement =
      fixture.nativeElement.querySelectorAll('.oge-popup')[0];
    // a single month in the narrow dialog
    expect(
      layer.querySelectorAll('.oge-calendar-view, .oge-calendar-month').length,
    ).toBeLessThanOrEqual(1);
    const days = Array.from(
      layer.querySelectorAll<HTMLButtonElement>(
        '.oge-calendar-cell:not(.oge-calendar-cell-other):not(:disabled)',
      ),
    );
    days[2].click();
    await settle(fixture);
    days[5].click();
    await settle(fixture);
    expect(rangeBox.opened()).toBe(true);
    const done = layer.querySelector<HTMLButtonElement>('.oge-sheet-done')!;
    done.click();
    await settle(fixture);
    expect(rangeBox.opened()).toBe(false);
    const [start, end] = fixture.componentInstance.range();
    expect(start).not.toBeNull();
    expect(end).not.toBeNull();
    expect(end!.getTime()).toBeGreaterThan(start!.getTime());
    fixture.nativeElement.remove();
  });
});
