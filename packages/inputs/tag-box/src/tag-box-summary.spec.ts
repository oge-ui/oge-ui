import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { OgeTagBoxDisplayMode } from '@oge-ui/behavior';
import { provideOgeInputsConfig } from '@oge-ui/inputs/field';
import { OgeTagBox } from './tag-box';

const CITIES = ['Ankara', 'Berlin', 'Cairo', 'Dublin'];

@Component({
  imports: [OgeTagBox],
  template: `
    <oge-tag-box
      label="Cities"
      [items]="cities"
      [displayMode]="mode()"
      [countThreshold]="threshold()"
      [(value)]="value"
    />
  `,
})
class Host {
  readonly cities = CITIES;
  readonly mode = signal<OgeTagBoxDisplayMode>('count');
  readonly threshold = signal(1);
  readonly value = signal<readonly unknown[]>([]);
}

describe('OgeTagBox displayMode', () => {
  let fixture: ComponentFixture<Host>;
  const el = () => fixture.nativeElement as HTMLElement;
  const chips = () => el().querySelectorAll('.oge-tag:not(.oge-tag-more)');
  const summary = () => el().querySelector('.oge-tag-summary');
  const input = () => el().querySelector('input') as HTMLInputElement;

  function set(value: readonly unknown[]): void {
    fixture.componentInstance.value.set(value);
    fixture.detectChanges();
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  it('count: chips up to the threshold, then the localized count', () => {
    set(['Ankara']);
    expect(chips().length).toBe(1);
    expect(summary()).toBeNull();
    set(['Ankara', 'Berlin', 'Cairo']);
    expect(chips().length).toBe(0);
    expect(summary()?.textContent?.trim()).toBe('3 selected');
    expect(summary()?.getAttribute('title')).toBe('Ankara, Berlin, Cairo');
    fixture.componentInstance.threshold.set(3);
    fixture.detectChanges();
    expect(chips().length).toBe(3);
  });

  it('describes the field with the summary for screen readers', () => {
    set(['Ankara', 'Berlin']);
    const id = summary()?.id;
    expect(id).toBeTruthy();
    expect(input().getAttribute('aria-describedby')).toContain(id as string);
    set([]);
    expect(input().getAttribute('aria-describedby') ?? '').not.toContain(
      id as string,
    );
  });

  it('text: one comma-separated line, no chips', () => {
    fixture.componentInstance.mode.set('text');
    set(['Ankara', 'Dublin']);
    expect(chips().length).toBe(0);
    expect(summary()?.textContent?.trim()).toBe('Ankara, Dublin');
  });

  it('Backspace removes nothing hidden behind a summary', () => {
    set(['Ankara', 'Berlin']);
    input().dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }),
    );
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toEqual(['Ankara', 'Berlin']);
    fixture.componentInstance.mode.set('chips');
    fixture.detectChanges();
    input().dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }),
    );
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toEqual(['Ankara']);
  });

  it('takes the count text from the messages (ICU plural)', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideOgeInputsConfig({
          messages: {
            selectedCount: '{count, plural, one {# şehir} other {# şehir}}',
          },
        }),
      ],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    set(['Ankara', 'Berlin']);
    expect(summary()?.textContent?.trim()).toBe('2 şehir');
  });
});
