import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { provideOgeInputsConfig } from '../../field/src/config';
import { OgeRating, OgeRatingItemTemplate } from './rating';
import type { OgeRatingSemantics } from '@oge-ui/behavior';

@Component({
  imports: [OgeRating],
  template: `
    <oge-rating
      label="Quality"
      locale="en-US"
      [max]="max()"
      [precision]="precision()"
      [allowClear]="allowClear()"
      [readonly]="readonly()"
      [disabled]="disabled()"
      [semantics]="semantics()"
      [(value)]="value"
      (hoverChanged)="hovers.push($event.value)"
    />
  `,
})
class Host {
  readonly value = signal<number | null>(3);
  readonly max = signal(5);
  readonly precision = signal(1);
  readonly allowClear = signal(true);
  readonly readonly = signal(false);
  readonly disabled = signal(false);
  readonly semantics = signal<OgeRatingSemantics>('slider');
  readonly hovers: (number | null)[] = [];
}

@Component({
  imports: [OgeRating, OgeRatingItemTemplate],
  template: `
    <oge-rating [(value)]="value">
      <ng-template ogeRatingItemTemplate let-item let-filled="filled">
        <span class="custom" [attr.data-filled]="filled">{{ item.index }}</span>
      </ng-template>
    </oge-rating>
  `,
})
class TemplateHost {
  readonly value = signal<number | null>(2);
}

@Component({
  imports: [OgeRating, ReactiveFormsModule],
  template: `<oge-rating [formControl]="control" />`,
})
class FormHost {
  readonly control = new FormControl<number | null>(4);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function slider(fixture: ComponentFixture<unknown>): HTMLElement {
  return fixture.nativeElement.querySelector('[role="slider"]');
}

function items(fixture: ComponentFixture<unknown>): HTMLElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('.oge-rating-item'));
}

function fills(fixture: ComponentFixture<unknown>): string[] {
  return Array.from(
    fixture.nativeElement.querySelectorAll('.oge-rating-fill'),
    (el) => (el as HTMLElement).style.width,
  );
}

/** A click at `ratio` across item `index` (items laid out 24px apart). */
function clickItem(item: HTMLElement, ratio: number, type = 'click'): void {
  const index = Number(item.dataset['index']);
  item.getBoundingClientRect = () =>
    ({ left: index * 24, width: 24, top: 0, height: 24 }) as DOMRect;
  const event = new MouseEvent(type, {
    bubbles: true,
    clientX: index * 24 + ratio * 24,
  });
  if (type === 'pointermove') {
    Object.defineProperty(event, 'pointerType', { value: 'mouse' });
  }
  item.dispatchEvent(event);
}

function key(target: HTMLElement, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
}

describe('OgeRating', () => {
  it('renders an APG slider with the spoken value', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const el = slider(fixture);
    expect(el.getAttribute('aria-label')).toBe('Quality');
    expect(el.getAttribute('aria-valuenow')).toBe('3');
    expect(el.getAttribute('aria-valuemin')).toBe('0');
    expect(el.getAttribute('aria-valuemax')).toBe('5');
    expect(el.getAttribute('aria-valuetext')).toBe('3 of 5');
    expect(el.tabIndex).toBe(0);
    expect(items(fixture)).toHaveLength(5);
    expect(fills(fixture)).toEqual(['100%', '100%', '100%', '0%', '0%']);
  });

  it('commits on click and clears on a re-click of the current value', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    clickItem(items(fixture)[4], 0.5);
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe(5);
    clickItem(items(fixture)[4], 0.9);
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBeNull();
    expect(slider(fixture).getAttribute('aria-valuetext')).toBe('Not rated');
  });

  it('keeps the value on a re-click without allowClear', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.allowClear.set(false);
    await settle(fixture);
    clickItem(items(fixture)[2], 0.5);
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe(3);
    expect(slider(fixture).getAttribute('aria-valuemin')).toBe('1');
  });

  it('picks half values from the pointer position', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.precision.set(0.5);
    await settle(fixture);
    clickItem(items(fixture)[1], 0.3);
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe(1.5);
    expect(fills(fixture)).toEqual(['100%', '50%', '0%', '0%', '0%']);
  });

  it('previews the hovered value and restores on leave', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    clickItem(items(fixture)[0], 0.5, 'pointermove');
    await settle(fixture);
    expect(fills(fixture)[1]).toBe('0%');
    expect(
      fixture.nativeElement
        .querySelector('.oge-rating')
        .classList.contains('oge-rating-hovering'),
    ).toBe(true);
    slider(fixture).dispatchEvent(new MouseEvent('pointerleave'));
    await settle(fixture);
    expect(fills(fixture)[2]).toBe('100%');
    expect(fixture.componentInstance.hovers).toEqual([1, null]);
    expect(fixture.componentInstance.value()).toBe(3);
  });

  it('runs the slider keyboard map, RTL-mirrored', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const el = slider(fixture);
    expect(key(el, 'ArrowRight').defaultPrevented).toBe(true);
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe(4);
    key(el, 'End');
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe(5);
    key(el, '2');
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe(2);
    key(el, 'Delete');
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBeNull();
    expect(key(el, 'Tab').defaultPrevented).toBe(false);

    fixture.nativeElement.setAttribute('dir', 'rtl');
    key(el, 'ArrowLeft');
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe(1);
  });

  it('ignores interaction while read-only or disabled', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.readonly.set(true);
    await settle(fixture);
    key(slider(fixture), 'ArrowRight');
    clickItem(items(fixture)[4], 0.5);
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe(3);
    expect(slider(fixture).getAttribute('aria-readonly')).toBe('true');

    fixture.componentInstance.readonly.set(false);
    fixture.componentInstance.disabled.set(true);
    await settle(fixture);
    expect(slider(fixture).tabIndex).toBe(-1);
    expect(slider(fixture).getAttribute('aria-disabled')).toBe('true');
    key(slider(fixture), 'ArrowRight');
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe(3);
  });

  it('renders a radio group with a roving tab stop for whole items', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.semantics.set('radiogroup');
    await settle(fixture);
    expect(slider(fixture)).toBeNull();
    const radios = Array.from(
      fixture.nativeElement.querySelectorAll('[role="radio"]'),
    ) as HTMLElement[];
    expect(radios).toHaveLength(5);
    expect(radios.map((radio) => radio.tabIndex)).toEqual([-1, -1, 0, -1, -1]);
    expect(radios[2].getAttribute('aria-checked')).toBe('true');
    expect(radios[0].getAttribute('aria-label')).toBe('1 of 5');
    key(radios[2], 'ArrowRight');
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe(4);
    radios[0].click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe(1);
  });

  it('falls back to the slider for fractional radio groups', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.semantics.set('radiogroup');
    fixture.componentInstance.precision.set(0.5);
    await settle(fixture);
    expect(slider(fixture)).not.toBeNull();
  });

  it('snaps written values to the precision and max', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set(7.2);
    await settle(fixture);
    expect(slider(fixture).getAttribute('aria-valuenow')).toBe('5');
    expect(slider(fixture).getAttribute('aria-valuetext')).toBe('5 of 5');
  });

  it('renders the item template in the empty and filled layers', async () => {
    const fixture = TestBed.createComponent(TemplateHost);
    await settle(fixture);
    const custom = fixture.nativeElement.querySelectorAll('.custom');
    expect(custom).toHaveLength(10);
    expect(custom[0].getAttribute('data-filled')).toBe('false');
    expect(custom[1].getAttribute('data-filled')).toBe('true');
    expect(fixture.nativeElement.querySelector('.oge-rating-svg')).toBeNull();
  });

  it('binds reactive forms and takes messages from the config', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideOgeInputsConfig({
          messages: { ratingLabel: 'Puan', ratingValueText: '{value}/{max}' },
        }),
      ],
    });
    const fixture = TestBed.createComponent(FormHost);
    await settle(fixture);
    const el = slider(fixture);
    expect(el.getAttribute('aria-label')).toBe('Puan');
    expect(el.getAttribute('aria-valuenow')).toBe('4');
    key(el, 'ArrowLeft');
    await settle(fixture);
    expect(fixture.componentInstance.control.value).toBe(3);
    expect(fixture.componentInstance.control.dirty).toBe(true);
    fixture.componentInstance.control.disable();
    await settle(fixture);
    expect(el.getAttribute('aria-disabled')).toBe('true');
  });
});
