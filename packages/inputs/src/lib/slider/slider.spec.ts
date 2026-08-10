import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeSlider } from './slider';
import type { OgeSliderSlideEndedEvent } from './slider-types';
import type { OgeInputValueCommittedEvent } from '../field/input-types';

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
  imports: [OgeSlider],
  template: `
    <oge-slider
      [(value)]="value"
      [min]="min()"
      [max]="max()"
      [step]="step()"
      [largeStep]="largeStep()"
      [debounce]="debounce()"
      [showButtons]="showButtons()"
      [disabled]="disabled()"
      [readonly]="readonly()"
      (valueCommitted)="commits.push($event)"
      (slideEnded)="ends.push($event)"
    />
  `,
})
class SliderHost {
  readonly value = signal(20);
  readonly min = signal<number | undefined>(0);
  readonly max = signal<number | undefined>(100);
  readonly step = signal(1);
  readonly largeStep = signal<number | undefined>(undefined);
  readonly debounce = signal<number | undefined>(undefined);
  readonly showButtons = signal(false);
  readonly disabled = signal(false);
  readonly readonly = signal(false);
  readonly slider = viewChild.required(OgeSlider);
  readonly commits: OgeInputValueCommittedEvent<number>[] = [];
  readonly ends: OgeSliderSlideEndedEvent<number>[] = [];
}

@Component({
  imports: [OgeSlider],
  template: `<oge-slider [value]="42" name="volume" />`,
})
class NamedHost {}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('OgeSlider', () => {
  let fixture: ComponentFixture<SliderHost>;
  let host: SliderHost;
  let el: HTMLElement;

  const thumb = (): HTMLElement =>
    el.querySelector('.oge-slider-thumb') as HTMLElement;
  const track = (): HTMLElement =>
    el.querySelector('.oge-slider-track') as HTMLElement;

  /** jsdom lays nothing out — the track geometry comes from the spec. */
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
    fixture = TestBed.createComponent(SliderHost);
    host = fixture.componentInstance;
    await settle(fixture);
    el = fixture.nativeElement as HTMLElement;
  });

  it('keyboard steps commit immediately — the discrete-action rule', async () => {
    key(thumb(), 'ArrowRight');
    expect(host.value()).toBe(21);
    key(thumb(), 'ArrowLeft');
    key(thumb(), 'ArrowUp');
    key(thumb(), 'ArrowDown');
    expect(host.value()).toBe(20);
    expect(host.commits).toHaveLength(4); // every step committed, no debounce

    key(thumb(), 'PageUp'); // largeStep defaults to step × 10
    expect(host.value()).toBe(30);
    key(thumb(), 'PageDown');
    expect(host.value()).toBe(20);
    key(thumb(), 'End');
    expect(host.value()).toBe(100);
    key(thumb(), 'Home');
    expect(host.value()).toBe(0);
  });

  it('an explicit largeStep drives PageUp/PageDown', async () => {
    host.largeStep.set(25);
    await settle(fixture);
    key(thumb(), 'PageUp');
    expect(host.value()).toBe(45);
  });

  it('arrow direction flips in RTL', async () => {
    const isRtl = vi.spyOn(
      host.slider() as unknown as { isRtl(): boolean },
      'isRtl',
    );
    isRtl.mockReturnValue(true);
    key(thumb(), 'ArrowRight');
    expect(host.value()).toBe(19); // mirrored
    key(thumb(), 'ArrowLeft');
    expect(host.value()).toBe(20);
  });

  it('dragging commits live and slideEnded reports the release value', async () => {
    stubTrackRect();
    thumb().dispatchEvent(pointer('pointerdown', { clientX: 20 }));
    document.dispatchEvent(pointer('pointermove', { clientX: 55 }));
    expect(host.value()).toBe(55); // live commit on move
    document.dispatchEvent(pointer('pointermove', { clientX: 72 }));
    document.dispatchEvent(pointer('pointerup', { clientX: 72 }));
    await settle(fixture);
    expect(host.value()).toBe(72);
    expect(host.ends).toHaveLength(1);
    expect(host.ends[0].value).toBe(72);
  });

  it('clicking the track jumps to the position', async () => {
    stubTrackRect();
    track().dispatchEvent(pointer('pointerdown', { clientX: 40 }));
    document.dispatchEvent(pointer('pointerup', { clientX: 40 }));
    await settle(fixture);
    expect(host.value()).toBe(40);
  });

  it('Escape cancels the drag, restores the start value and emits no slideEnded', async () => {
    stubTrackRect();
    thumb().dispatchEvent(pointer('pointerdown', { clientX: 20 }));
    document.dispatchEvent(pointer('pointermove', { clientX: 90 }));
    expect(host.value()).toBe(90);
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await settle(fixture);
    expect(host.value()).toBe(20); // restored
    expect(host.ends).toHaveLength(0);
  });

  it('[debounce] throttles drag commits; release flushes', async () => {
    vi.useFakeTimers();
    try {
      host.debounce.set(50);
      await settle(fixture);
      stubTrackRect();
      thumb().dispatchEvent(pointer('pointerdown', { clientX: 20 }));
      document.dispatchEvent(pointer('pointermove', { clientX: 60 }));
      expect(host.value()).toBe(20); // staged, not yet committed
      document.dispatchEvent(pointer('pointerup', { clientX: 60 }));
      expect(host.value()).toBe(60); // release flushed the staged value
      expect(host.ends[0]?.value).toBe(60);
    } finally {
      vi.useRealTimers();
    }
  });

  it('showButtons steps once and repeats while held (spin config)', async () => {
    vi.useFakeTimers();
    try {
      host.showButtons.set(true);
      fixture.detectChanges();
      const buttons = el.querySelectorAll<HTMLElement>(
        '.oge-slider-step-button',
      );
      buttons[1].dispatchEvent(pointer('pointerdown'));
      expect(host.value()).toBe(21); // immediate first step
      vi.advanceTimersByTime(2000); // delay + a few repeat intervals
      expect(host.value()).toBeGreaterThan(21);
      const held = host.value();
      document.dispatchEvent(pointer('pointerup'));
      vi.advanceTimersByTime(1000);
      expect(host.value()).toBe(held); // released — repeating stopped
    } finally {
      vi.useRealTimers();
    }
  });

  it('programmatic writes clamp and snap to the grid', async () => {
    const slider = host.slider() as unknown as {
      writeValue(value: unknown): void;
    };
    slider.writeValue(137);
    expect(host.slider().value()).toBe(100);
    host.step.set(5);
    await settle(fixture);
    slider.writeValue(23.4);
    expect(host.slider().value()).toBe(25);
    slider.writeValue('not a number');
    expect(host.slider().value()).toBe(0); // falls back to min
  });

  it('a name renders the hidden input for plain form posts', async () => {
    const local = TestBed.createComponent(NamedHost);
    await settle(local);
    const hidden = (local.nativeElement as HTMLElement).querySelector(
      'input[type="hidden"][name="volume"]',
    ) as HTMLInputElement;
    expect(hidden?.value).toBe('42');
    local.destroy();
  });

  it('disabled and readonly are inert for every interaction path', async () => {
    stubTrackRect();
    host.disabled.set(true);
    await settle(fixture);
    key(thumb(), 'ArrowRight');
    track().dispatchEvent(pointer('pointerdown', { clientX: 90 }));
    expect(host.value()).toBe(20);
    expect(thumb().getAttribute('tabindex')).toBe('-1');

    host.disabled.set(false);
    host.readonly.set(true);
    await settle(fixture);
    key(thumb(), 'ArrowRight');
    track().dispatchEvent(pointer('pointerdown', { clientX: 90 }));
    expect(host.value()).toBe(20);
    expect(el.querySelector('.oge-slider-readonly')).not.toBeNull();
  });
});
