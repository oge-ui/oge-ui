import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { OgeTimelineItem } from '@oge-ui/behavior';
import { OgeTimeline } from './timeline';

@Component({
  imports: [OgeTimeline],
  template: `<oge-timeline [items]="items()" [ariaLabel]="label()" />`,
})
class Host {
  readonly items = signal<OgeTimelineItem[]>([
    { key: 'ordered', title: 'Ordered' },
    { key: 'shipped', title: 'Shipped' },
  ]);
  readonly label = signal('History');
}

const entering = (fixture: ComponentFixture<Host>): string[] =>
  Array.from(
    fixture.nativeElement.querySelectorAll('.oge-timeline-item-entering'),
    (el: Element) =>
      el.querySelector('.oge-timeline-title')?.textContent?.trim() ?? '',
  );

describe('OgeTimeline enter motion', () => {
  let fixture: ComponentFixture<Host>;

  beforeEach(() => {
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  it('nothing enters on the first render', () => {
    expect(entering(fixture)).toEqual([]);
  });

  it('an appended entry runs the enter keyframe, keyed by its key', () => {
    fixture.componentInstance.items.update((items) => [
      ...items,
      { key: 'delivered', title: 'Delivered' },
    ]);
    fixture.detectChanges();
    expect(entering(fixture)).toEqual(['Delivered']);
    // an unrelated re-render keeps the class (and the running animation)
    fixture.componentInstance.label.set('Order history');
    fixture.detectChanges();
    expect(entering(fixture)).toEqual(['Delivered']);
    // the next change of items: it is a known entry now
    fixture.componentInstance.items.update((items) => [
      { key: 'placed', title: 'Placed' },
      ...items,
    ]);
    fixture.detectChanges();
    expect(entering(fixture)).toEqual(['Placed']);
  });
});
