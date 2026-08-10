import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeBreadcrumb } from './breadcrumb';
import type { OgeBreadcrumbItemData } from './breadcrumb-types';

const TRAIL: readonly OgeBreadcrumbItemData[] = [
  { text: 'Home', url: '/' },
  { text: 'Archived', disabled: true, hint: 'No longer available' },
  { text: 'Keyboards' },
];

@Component({
  imports: [OgeBreadcrumb],
  template: `<oge-breadcrumb [items]="items()" />`,
})
class A11yHost {
  readonly items = signal<readonly OgeBreadcrumbItemData[]>(TRAIL);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('OgeBreadcrumb — accessibility contract', () => {
  let fixture: ComponentFixture<A11yHost>;
  let el: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(A11yHost);
    await settle(fixture);
    el = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => fixture.destroy());

  it('is a labelled nav landmark holding an ordered list', () => {
    const nav = el.querySelector('nav');
    expect(nav?.getAttribute('aria-label')).toBe('Breadcrumb');
    const list = nav?.querySelector('ol.oge-breadcrumb-list');
    expect(list).not.toBeNull();
    // Every crumb sits in its own li (the parked ellipsis li included).
    expect(list?.querySelectorAll('li .oge-breadcrumb-item')).toHaveLength(3);
  });

  it('marks the current page and exposes disabled crumbs', () => {
    const crumbs = Array.from(
      el.querySelectorAll<HTMLElement>('.oge-breadcrumb-item'),
    );
    expect(crumbs[2].getAttribute('aria-current')).toBe('page');
    expect(crumbs[2].classList.contains('oge-breadcrumb-item-current')).toBe(
      true,
    );
    expect(crumbs[0].getAttribute('aria-current')).toBeNull();
    expect(crumbs[1].getAttribute('aria-disabled')).toBe('true');
    expect(crumbs[1].getAttribute('title')).toBe('No longer available');
  });

  it('separators are decoration — aria-hidden, one per boundary', () => {
    const separators = el.querySelectorAll(
      '.oge-breadcrumb-li:not(.oge-breadcrumb-li-parked):not(.oge-breadcrumb-ellipsis-li) .oge-breadcrumb-separator',
    );
    expect(separators).toHaveLength(2); // no separator before the first crumb
    separators.forEach((separator) => {
      expect(separator.getAttribute('aria-hidden')).toBe('true');
    });
  });

  it('has no roving tabindex — crumbs are plain links in the Tab order', () => {
    // The APG breadcrumb keyboard section is "not applicable": nothing may
    // remove links from the sequence or add arrow-key movement.
    const link = el.querySelector('a.oge-breadcrumb-item');
    expect(link?.getAttribute('tabindex')).toBeNull();
    const parked = el.querySelector('.oge-breadcrumb-ellipsis');
    expect(parked?.getAttribute('tabindex')).toBe('-1'); // parked, unreachable
  });
});
