import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeCalendar } from './calendar';

@Component({
  imports: [OgeCalendar],
  template: `<oge-calendar [(value)]="value" locale="en-US" />`,
})
class Host {
  readonly value = signal<Date | null>(new Date(2026, 7, 15));
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

const q = <T extends Element>(
  fixture: ComponentFixture<unknown>,
  sel: string,
) => fixture.nativeElement.querySelector(sel) as T;

const pane = (fixture: ComponentFixture<unknown>): HTMLElement =>
  q<HTMLElement>(fixture, '.oge-calendar-pane');

const navs = (fixture: ComponentFixture<unknown>): HTMLButtonElement[] =>
  Array.from(fixture.nativeElement.querySelectorAll('.oge-calendar-nav'));

const live = (fixture: ComponentFixture<unknown>): HTMLElement =>
  q<HTMLElement>(fixture, '[aria-live="polite"]');

function press(fixture: ComponentFixture<unknown>, key: string): void {
  q<HTMLElement>(fixture, '.oge-calendar-grid').dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true }),
  );
}

describe('OgeCalendar view motion', () => {
  it('never animates the first view', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    expect(pane(fixture).hasAttribute('data-oge-view-motion')).toBe(false);
  });

  it('re-creates the pane with the direction of travel when paging', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const first = pane(fixture);
    navs(fixture)[1].click();
    await settle(fixture);
    expect(pane(fixture)).not.toBe(first);
    expect(pane(fixture).getAttribute('data-oge-view-motion')).toBe('next');
    expect(live(fixture).textContent?.trim()).toBe('September 2026');
    navs(fixture)[0].click();
    await settle(fixture);
    navs(fixture)[0].click();
    await settle(fixture);
    expect(pane(fixture).getAttribute('data-oge-view-motion')).toBe('prev');
    expect(live(fixture).textContent?.trim()).toBe('July 2026');
  });

  it('zooms out on the view label and in on a drill-down', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    q<HTMLButtonElement>(fixture, '.oge-calendar-view-label').click();
    await settle(fixture);
    expect(pane(fixture).getAttribute('data-oge-view-motion')).toBe('zoom-out');
    expect(live(fixture).textContent?.trim()).toBe('2026');
    q<HTMLButtonElement>(fixture, '.oge-calendar-cell').click();
    await settle(fixture);
    expect(pane(fixture).getAttribute('data-oge-view-motion')).toBe('zoom-in');
  });

  it('keeps the pane while the focus moves inside the visible month', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const first = pane(fixture);
    press(fixture, 'ArrowRight');
    await settle(fixture);
    expect(pane(fixture)).toBe(first);
    expect(first.hasAttribute('data-oge-view-motion')).toBe(false);
  });

  it('slides on a keyboard page and still lands the focus on the new month', async () => {
    vi.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(Host);
      fixture.detectChanges();
      press(fixture, 'PageDown');
      fixture.detectChanges();
      vi.runAllTimers();
      expect(pane(fixture).getAttribute('data-oge-view-motion')).toBe('next');
      const focused = document.activeElement as HTMLElement | null;
      expect(focused?.getAttribute('aria-label')).toContain('September 15');
      expect(fixture.nativeElement.contains(focused)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
