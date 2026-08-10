import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeRangeSlider } from './range-slider';
import type { OgeInputValueCommittedEvent } from '../field/input-types';

type Pair = readonly [number, number];

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

function key(el: HTMLElement, k: string): void {
  el.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: k }),
  );
}

@Component({
  imports: [OgeRangeSlider],
  template: `
    <oge-range-slider
      [(value)]="value"
      [min]="0"
      [max]="100"
      [minRange]="minRange()"
      (valueCommitted)="commits.push($event)"
    />
  `,
})
class RangeHost {
  readonly value = signal<Pair>([20, 60]);
  readonly minRange = signal(0);
  readonly slider = viewChild.required(OgeRangeSlider);
  readonly commits: OgeInputValueCommittedEvent<Pair>[] = [];
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('OgeRangeSlider', () => {
  let fixture: ComponentFixture<RangeHost>;
  let host: RangeHost;
  let el: HTMLElement;

  const thumbs = (): HTMLElement[] =>
    Array.from(el.querySelectorAll<HTMLElement>('.oge-slider-thumb'));
  const track = (): HTMLElement =>
    el.querySelector('.oge-slider-track') as HTMLElement;

  function stubTrackRect(): void {
    Object.defineProperty(track(), 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        left: 0,
        top: 0,
        right: 100,
        bottom: 28,
        width: 100,
        height: 28,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });
  }

  beforeEach(async () => {
    fixture = TestBed.createComponent(RangeHost);
    host = fixture.componentInstance;
    await settle(fixture);
    el = fixture.nativeElement as HTMLElement;
  });

  it('each thumb carries the APG multi-thumb aria constraint', async () => {
    const [start, end] = thumbs();
    expect(start.getAttribute('aria-valuenow')).toBe('20');
    expect(start.getAttribute('aria-valuemin')).toBe('0');
    expect(start.getAttribute('aria-valuemax')).toBe('60'); // the sibling
    expect(end.getAttribute('aria-valuemin')).toBe('20'); // the sibling
    expect(end.getAttribute('aria-valuemax')).toBe('100');

    host.minRange.set(10);
    await settle(fixture);
    expect(start.getAttribute('aria-valuemax')).toBe('50');
    expect(end.getAttribute('aria-valuemin')).toBe('30');
  });

  it('keyboard moves each thumb and the sibling constrains it', async () => {
    const [start, end] = thumbs();
    key(start, 'ArrowRight');
    expect(host.value()).toEqual([21, 60]);
    key(end, 'ArrowLeft');
    expect(host.value()).toEqual([21, 59]);
    key(start, 'End'); // wants 100, constrained to the end thumb
    expect(host.value()).toEqual([59, 59]);
    key(end, 'Home'); // wants 0, constrained to the start thumb
    expect(host.value()).toEqual([59, 59]);
  });

  it('minRange keeps the gap on keyboard moves', async () => {
    host.minRange.set(10);
    host.value.set([40, 55]);
    await settle(fixture);
    const [start] = thumbs();
    key(start, 'PageUp'); // wants 50, gap clamps to 45
    expect(host.value()).toEqual([45, 55]);
  });

  it('an unchanged pair never re-emits valueCommitted', async () => {
    host.value.set([59, 59]);
    await settle(fixture);
    host.commits.length = 0;
    const [start] = thumbs();
    key(start, 'ArrowRight'); // already against the sibling — no-op
    expect(host.commits).toHaveLength(0);
  });

  it('clicking the track moves the nearest thumb', async () => {
    stubTrackRect();
    track().dispatchEvent(pointer('pointerdown', { clientX: 85 }));
    document.dispatchEvent(pointer('pointerup', { clientX: 85 }));
    await settle(fixture);
    expect(host.value()).toEqual([20, 85]); // end was nearer

    track().dispatchEvent(pointer('pointerdown', { clientX: 5 }));
    document.dispatchEvent(pointer('pointerup', { clientX: 5 }));
    await settle(fixture);
    expect(host.value()).toEqual([5, 85]); // start was nearer
  });

  it('Escape restores the whole pair', async () => {
    stubTrackRect();
    thumbs()[1].dispatchEvent(pointer('pointerdown', { clientX: 60 }));
    document.dispatchEvent(pointer('pointermove', { clientX: 95 }));
    expect(host.value()).toEqual([20, 95]);
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await settle(fixture);
    expect(host.value()).toEqual([20, 60]);
  });

  it('programmatic writes clamp, snap and sort the pair', () => {
    const slider = host.slider() as unknown as {
      writeValue(value: unknown): void;
    };
    slider.writeValue([80, 30]);
    expect(host.slider().value()).toEqual([30, 80]); // sorted
    slider.writeValue([-10, 140]);
    expect(host.slider().value()).toEqual([0, 100]); // clamped
    slider.writeValue('nonsense');
    expect(host.slider().value()).toEqual([0, 0]); // falls back to min
  });
});
