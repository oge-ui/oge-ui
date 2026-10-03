import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeScheduler } from './scheduler';
import type { OgeSchedulerView } from '../scheduler-types';

@Component({
  imports: [OgeScheduler],
  template: `
    <oge-scheduler
      [dataSource]="[]"
      [currentDate]="date"
      [adaptiveView]="true"
      [(currentView)]="view"
    />
  `,
})
class Host {
  readonly date = new Date(2026, 4, 11);
  readonly view = signal<OgeSchedulerView>('week');
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('OgeScheduler adaptiveView', () => {
  let width = 1000;
  let observed: (() => void) | null = null;

  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(
      () => width,
    );
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          observed = callback;
        }
        observe(): void {
          /* the spec drives the callback */
        }
        disconnect(): void {
          observed = null;
        }
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('switches to agenda when its own width gets narrow and back when wide', async () => {
    width = 1000;
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    expect(fixture.componentInstance.view()).toBe('week');

    width = 420;
    observed?.();
    await settle(fixture);
    expect(fixture.componentInstance.view()).toBe('agenda');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '.oge-scheduler-agenda, [class*="agenda"]',
      ),
    ).not.toBeNull();

    width = 900;
    observed?.();
    await settle(fixture);
    expect(fixture.componentInstance.view()).toBe('week');
  });
});
