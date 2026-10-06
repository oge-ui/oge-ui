import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { OgeTimelineAlign, OgeTimelineItem } from '@oge-ui/behavior';
import { OgeTimeline } from './timeline';
import { provideOgeTimelineConfig } from './config';
import {
  OgeTimelineContentTemplate,
  OgeTimelineMarkerTemplate,
  OgeTimelineOppositeTemplate,
} from './templates';

const ITEMS: OgeTimelineItem[] = [
  {
    key: 'a',
    title: 'Ordered',
    description: 'Payment received',
    time: new Date(2026, 2, 14, 9, 30),
    severity: 'success',
  },
  { key: 'b', title: 'Shipped', time: 'Yesterday', opposite: 'Warehouse 3' },
  { key: 'c', title: 'Delivered', variant: 'outlined', icon: 'M5 12h14' },
];

@Component({
  imports: [OgeTimeline],
  template: `
    <oge-timeline
      [items]="items()"
      [align]="align()"
      [orientation]="orientation()"
      locale="en-US"
      [dateFormat]="{ year: 'numeric', month: 'short', day: 'numeric' }"
      ariaLabel="Order history"
    />
  `,
})
class TimelineHost {
  readonly items = signal<OgeTimelineItem[]>(ITEMS);
  readonly align = signal<OgeTimelineAlign | undefined>(undefined);
  readonly orientation = signal<'vertical' | 'horizontal' | undefined>(
    undefined,
  );
}

@Component({
  imports: [
    OgeTimeline,
    OgeTimelineContentTemplate,
    OgeTimelineMarkerTemplate,
    OgeTimelineOppositeTemplate,
  ],
  template: `
    <oge-timeline [items]="items" align="alternate">
      <ng-template ogeTimelineContentTemplate let-item let-index="index">
        <em class="custom-content">{{ index }}:{{ item.title }}</em>
      </ng-template>
      <ng-template ogeTimelineMarkerTemplate let-index="index">
        <b class="custom-marker">{{ index + 1 }}</b>
      </ng-template>
      <ng-template ogeTimelineOppositeTemplate let-side="side" let-last="last">
        <i class="custom-opposite">{{ side }}{{ last ? '!' : '' }}</i>
      </ng-template>
    </oge-timeline>
  `,
})
class TemplatesHost {
  readonly items = ITEMS;
}

@Component({
  imports: [OgeTimeline],
  providers: [
    provideOgeTimelineConfig({ align: 'start', orientation: 'horizontal' }),
  ],
  template: `<oge-timeline [items]="items" />`,
})
class ConfigHost {
  readonly items = ITEMS;
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('OgeTimeline', () => {
  let fixture: ComponentFixture<TimelineHost>;
  let el: HTMLElement;
  const items = () =>
    Array.from(el.querySelectorAll<HTMLElement>('li.oge-timeline-item'));

  beforeEach(async () => {
    fixture = TestBed.createComponent(TimelineHost);
    await settle(fixture);
    el = fixture.nativeElement as HTMLElement;
  });

  it('renders an ordered list with one item per entry', () => {
    const list = el.querySelector('ol.oge-timeline-list') as HTMLElement;
    expect(list.getAttribute('aria-label')).toBe('Order history');
    expect(items()).toHaveLength(3);
    expect(items()[0].querySelector('.oge-timeline-title')?.textContent).toBe(
      'Ordered',
    );
    expect(
      items()[0].querySelector('.oge-timeline-description')?.textContent,
    ).toBe('Payment received');
  });

  it('formats Date times into <time datetime> and keeps strings verbatim', () => {
    const first = items()[0].querySelector('time') as HTMLElement;
    expect(first.getAttribute('datetime')).toBe('2026-03-14T09:30:00');
    expect(first.textContent?.trim()).toBe('Mar 14, 2026');
    const second = items()[1].querySelector('time') as HTMLElement;
    expect(second.hasAttribute('datetime')).toBe(false);
    expect(second.textContent?.trim()).toBe('Yesterday');
  });

  it('keeps the separator decoration out of the accessibility tree', () => {
    for (const sep of el.querySelectorAll('.oge-timeline-separator'))
      expect(sep.getAttribute('aria-hidden')).toBe('true');
    // no connector after the last entry
    expect(items()[2].querySelector('.oge-timeline-connector')).toBeNull();
    expect(items()[0].querySelector('.oge-timeline-connector')).not.toBeNull();
  });

  it('maps severity, variant and icon onto the marker', () => {
    expect(items()[0].classList).toContain('oge-timeline-severity-success');
    expect(items()[1].classList).toContain('oge-timeline-severity-accent');
    const marker = items()[2].querySelector(
      '.oge-timeline-marker',
    ) as HTMLElement;
    expect(marker.classList).toContain('oge-timeline-marker-outlined');
    expect(marker.classList).toContain('oge-timeline-marker-icon');
    expect(marker.querySelector('path')?.getAttribute('d')).toBe('M5 12h14');
  });

  it('defaults to vertical / end and has no opposite column', () => {
    const host = el.querySelector('oge-timeline') as HTMLElement;
    expect(host.classList).toContain('oge-timeline-vertical');
    expect(host.classList).not.toContain('oge-timeline-alternating');
    expect(
      items().every((li) => li.classList.contains('oge-timeline-item-end')),
    ).toBe(true);
    expect(el.querySelector('.oge-timeline-opposite')).toBeNull();
  });

  it('alternates sides and moves the time to the opposite column', async () => {
    fixture.componentInstance.align.set('alternate');
    await settle(fixture);
    const host = el.querySelector('oge-timeline') as HTMLElement;
    expect(host.classList).toContain('oge-timeline-alternating');
    expect(
      items().map((li) => li.classList.contains('oge-timeline-item-end')),
    ).toEqual([true, false, true]);
    const opposite = items()[0].querySelector(
      '.oge-timeline-opposite',
    ) as HTMLElement;
    expect(opposite.querySelector('time')?.getAttribute('datetime')).toBe(
      '2026-03-14T09:30:00',
    );
    expect(items()[0].querySelector('.oge-timeline-content time')).toBeNull();
    // an explicit opposite wins; the time stays in the content
    expect(
      items()[1].querySelector('.oge-timeline-opposite')?.textContent?.trim(),
    ).toBe('Warehouse 3');
    expect(
      items()[1].querySelector('.oge-timeline-content time'),
    ).not.toBeNull();
  });

  it('switches to the horizontal layout', async () => {
    fixture.componentInstance.orientation.set('horizontal');
    await settle(fixture);
    const host = el.querySelector('oge-timeline') as HTMLElement;
    expect(host.classList).toContain('oge-timeline-horizontal');
    expect(host.classList).not.toContain('oge-timeline-vertical');
  });

  it('tracks item updates', async () => {
    fixture.componentInstance.items.set(ITEMS.slice(0, 1));
    await settle(fixture);
    expect(items()).toHaveLength(1);
    expect(items()[0].querySelector('.oge-timeline-connector')).toBeNull();
  });
});

describe('OgeTimeline templates and config', () => {
  it('renders the content, marker and opposite slots with their context', async () => {
    const fixture = TestBed.createComponent(TemplatesHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(
      Array.from(el.querySelectorAll('.custom-content')).map(
        (n) => n.textContent,
      ),
    ).toEqual(['0:Ordered', '1:Shipped', '2:Delivered']);
    expect(el.querySelectorAll('.oge-timeline-title')).toHaveLength(0);
    expect(
      Array.from(el.querySelectorAll('.custom-marker')).map(
        (n) => n.textContent,
      ),
    ).toEqual(['1', '2', '3']);
    expect(el.querySelectorAll('.oge-timeline-marker-custom')).toHaveLength(3);
    expect(
      Array.from(el.querySelectorAll('.custom-opposite')).map(
        (n) => n.textContent,
      ),
    ).toEqual(['end', 'start', 'end!']);
  });

  it('reads orientation and align defaults from the config', async () => {
    const fixture = TestBed.createComponent(ConfigHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('oge-timeline')?.classList).toContain(
      'oge-timeline-horizontal',
    );
    expect(el.querySelectorAll('.oge-timeline-item-start')).toHaveLength(3);
  });
});
