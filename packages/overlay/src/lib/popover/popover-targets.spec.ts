import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgePopover } from './popover';
import { OgePopoverContent } from './popover-templates';

let created = 0;

@Component({
  selector: 'oge-test-heavy',
  template: `<span class="heavy">heavy</span>`,
})
class Heavy {
  constructor() {
    created++;
  }
}

@Component({
  imports: [OgePopover, OgePopoverContent, Heavy],
  template: `
    <button type="button" class="h1" (click)="pop.toggle($event)">
      <span class="icon">▾</span> Name
    </button>
    <button type="button" class="h2" (click)="pop.show($event)">City</button>
    <button type="button" class="away">Away</button>
    <oge-popover
      #pop
      title="Column"
      [padding]="padding()"
      [closeOnFocusOut]="closeOnFocusOut()"
      (closed)="closedReasons.push($event.reason)"
    >
      <ng-template ogePopoverContent let-close>
        <oge-test-heavy />
        <button type="button" class="inside" (click)="close()">Done</button>
      </ng-template>
    </oge-popover>
  `,
})
class Host {
  readonly padding = signal<'none' | 'sm' | 'md'>('md');
  readonly closeOnFocusOut = signal(true);
  readonly closedReasons: string[] = [];
}

describe('OgePopover targets, focus-out, padding and lazy content', () => {
  let fixture: ComponentFixture<Host>;
  const q = (selector: string) =>
    (fixture.nativeElement as HTMLElement).querySelector(
      selector,
    ) as HTMLElement;
  const panel = (): HTMLElement | null =>
    document.body.querySelector('.oge-popover');

  function settle(ms = 20): void {
    fixture.detectChanges();
    vi.advanceTimersByTime(ms);
    fixture.detectChanges();
    vi.advanceTimersByTime(ms);
    fixture.detectChanges();
  }

  beforeEach(() => {
    created = 0;
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame'],
    });
    fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    settle();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
    document.body.querySelectorAll('.oge-popover').forEach((el) => el.remove());
  });

  it('creates the lazy content only while open and destroys it on close', () => {
    expect(created).toBe(0);
    q('.h1').click();
    settle();
    expect(created).toBe(1);
    expect(panel()?.querySelector('.heavy')).not.toBeNull();
    (panel()?.querySelector('.inside') as HTMLElement).click();
    settle();
    expect(panel()).toBeNull();
    q('.h1').click();
    settle();
    expect(created).toBe(2);
  });

  it('anchors show($event) to the currentTarget, not the inner icon', () => {
    q('.icon').click(); // bubbles to .h1: currentTarget is the button
    settle();
    expect(panel()).not.toBeNull();
    q('.h1').click(); // toggle on the same target closes
    settle();
    expect(panel()).toBeNull();
  });

  it('moves an open popover to another target instead of closing it', () => {
    q('.h1').click();
    settle();
    const first = panel();
    q('.h2').click();
    settle();
    expect(panel()).toBe(first);
    expect(fixture.componentInstance.closedReasons).toEqual([]);
    // toggle from the first header moves it back rather than closing
    q('.h1').click();
    settle();
    expect(panel()).not.toBeNull();
    q('.h1').click();
    settle();
    expect(panel()).toBeNull();
  });

  it('returns focus to the target it was shown for', () => {
    q('.h2').focus();
    q('.h2').click();
    settle();
    (panel()?.querySelector('.inside') as HTMLElement).focus();
    (panel()?.querySelector('.inside') as HTMLElement).click();
    settle();
    expect(document.activeElement).toBe(q('.h2'));
  });

  it('closes on focus-out by default and stays open with closeOnFocusOut=false', () => {
    const blurTo = (target: HTMLElement) =>
      panel()?.dispatchEvent(
        new FocusEvent('focusout', { bubbles: true, relatedTarget: target }),
      );
    q('.h1').click();
    settle();
    blurTo(q('.away'));
    settle();
    expect(panel()).toBeNull();
    expect(fixture.componentInstance.closedReasons).toContain('focusOut');

    fixture.componentInstance.closeOnFocusOut.set(false);
    settle();
    q('.h1').click();
    settle();
    blurTo(q('.away'));
    settle();
    expect(panel()).not.toBeNull();
  });

  it('maps padding to a panel class (md has none)', () => {
    q('.h1').click();
    settle();
    expect(panel()?.className).not.toMatch(/oge-popover-padding/);
    fixture.componentInstance.padding.set('none');
    settle();
    expect(panel()?.classList).toContain('oge-popover-padding-none');
    fixture.componentInstance.padding.set('sm');
    settle();
    expect(panel()?.classList).toContain('oge-popover-padding-sm');
  });
});
