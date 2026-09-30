import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeProgressBar } from './progress-bar';
import { provideOgeProgressBarConfig } from './config';
import type { OgeProgressBarCompletedEvent } from './progress-bar-types';

@Component({
  imports: [OgeProgressBar],
  template: `
    <oge-progress-bar
      [value]="value()"
      [min]="min()"
      [max]="max()"
      [bufferValue]="buffer()"
      [chunkCount]="chunks()"
      [showLabel]="showLabel()"
      [formatLabel]="format()"
      (completed)="completions.push($event)"
    />
  `,
})
class ProgressHost {
  readonly value = signal<number | null>(null);
  readonly min = signal(0);
  readonly max = signal(100);
  readonly buffer = signal<number | undefined>(undefined);
  readonly chunks = signal<number | undefined>(undefined);
  readonly showLabel = signal<boolean | undefined>(undefined);
  readonly format = signal<
    ((value: number, ratio: number) => string) | undefined
  >(undefined);
  readonly bar = viewChild.required(OgeProgressBar);
  readonly completions: OgeProgressBarCompletedEvent[] = [];
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('OgeProgressBar', () => {
  let fixture: ComponentFixture<ProgressHost>;
  let host: ProgressHost;
  let el: HTMLElement;

  const bar = (): HTMLElement =>
    el.querySelector('oge-progress-bar') as HTMLElement;
  const fill = (): HTMLElement | null =>
    el.querySelector('.oge-progress-bar-fill');

  beforeEach(async () => {
    fixture = TestBed.createComponent(ProgressHost);
    host = fixture.componentInstance;
    await settle(fixture);
    el = fixture.nativeElement as HTMLElement;
  });

  it('determinate: transform-driven fill and the full aria triple', async () => {
    host.value.set(30);
    await settle(fixture);
    expect(bar().getAttribute('aria-valuenow')).toBe('30');
    expect(bar().getAttribute('aria-valuemin')).toBe('0');
    expect(bar().getAttribute('aria-valuemax')).toBe('100');
    expect(fill()?.style.transform).toBe('scaleX(0.3)');
    expect(bar().classList.contains('oge-progress-bar-indeterminate')).toBe(
      false,
    );
  });

  it('indeterminate: aria-valuenow is OMITTED, never a sentinel', () => {
    expect(host.bar()).toBeTruthy();
    expect(bar().getAttribute('aria-valuenow')).toBeNull();
    expect(bar().classList.contains('oge-progress-bar-indeterminate')).toBe(
      true,
    );
  });

  it('ratio respects custom min/max and clamps', async () => {
    host.min.set(200);
    host.max.set(400);
    host.value.set(300);
    await settle(fixture);
    expect(fill()?.style.transform).toBe('scaleX(0.5)');
    host.value.set(900);
    await settle(fixture);
    expect(fill()?.style.transform).toBe('scaleX(1)');
  });

  it('renders the buffer layer behind the fill', async () => {
    host.value.set(30);
    host.buffer.set(60);
    await settle(fixture);
    const buffer = el.querySelector('.oge-progress-bar-buffer') as HTMLElement;
    expect(buffer.style.transform).toBe('scaleX(0.6)');
  });

  it('chunkCount renders segments with the rounded fill count', async () => {
    host.chunks.set(5);
    host.value.set(50);
    await settle(fixture);
    const chunks = el.querySelectorAll('.oge-progress-bar-chunk');
    const filled = el.querySelectorAll('.oge-progress-bar-chunk-filled');
    expect(chunks).toHaveLength(5);
    expect(filled).toHaveLength(3); // round(0.5 × 5)
    expect(fill()).toBeNull(); // chunked bars have no continuous fill
  });

  it('label defaults to the rounded percent; formatLabel feeds aria-valuetext too', async () => {
    host.value.set(42);
    host.showLabel.set(true);
    await settle(fixture);
    expect(
      el.querySelector('.oge-progress-bar-label')?.textContent?.trim(),
    ).toBe('42%');
    expect(bar().getAttribute('aria-valuetext')).toBeNull(); // number IS the meaning

    host.format.set((value, ratio) => `${value} of 100 (${ratio * 100}%)`);
    await settle(fixture);
    expect(
      el.querySelector('.oge-progress-bar-label')?.textContent?.trim(),
    ).toBe('42 of 100 (42%)');
    expect(bar().getAttribute('aria-valuetext')).toBe('42 of 100 (42%)');
  });

  it('completed fires once per arrival at max, again after a reset', async () => {
    host.value.set(50);
    await settle(fixture);
    host.value.set(100);
    await settle(fixture);
    expect(host.completions).toEqual([{ value: 100 }]);
    host.value.set(100);
    await settle(fixture);
    expect(host.completions).toHaveLength(1); // staying at max is silent
    host.value.set(10);
    await settle(fixture);
    host.value.set(100);
    await settle(fixture);
    expect(host.completions).toHaveLength(2); // re-crossing fires again
  });

  it('provideOgeProgressBarConfig supplies the accessible name', async () => {
    fixture.destroy();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideOgeProgressBarConfig({ messages: { progress: 'İlerleme' } }),
      ],
    });
    const local = TestBed.createComponent(ProgressHost);
    await settle(local);
    expect(
      (local.nativeElement as HTMLElement)
        .querySelector('oge-progress-bar')
        ?.getAttribute('aria-label'),
    ).toBe('İlerleme');
    local.destroy();
  });
});
