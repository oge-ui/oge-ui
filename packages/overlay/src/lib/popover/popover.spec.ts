import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type {
  OgePopoverClosedEvent,
  OgePopoverClosingEvent,
  OgePopoverOpenedEvent,
  OgePopoverOpeningEvent,
  OgePopoverShowOn,
} from '@oge-ui/behavior';
import { provideOgeOverlayConfig } from '../config';
import { OgePopover, OgePopoverTrigger } from './popover';
import { OgePopoverFooter, OgePopoverTitle } from './popover-templates';

@Component({
  imports: [OgePopover, OgePopoverTrigger, OgePopoverFooter, OgePopoverTitle],
  template: `
    <button type="button" class="before">Before</button>
    <button type="button" class="trigger" [ogePopover]="pop">Details</button>
    <button type="button" class="after">After</button>
    <oge-popover
      #pop
      title="Order details"
      [showOn]="showOn()"
      [modal]="modal()"
      [arrow]="true"
      [width]="260"
      [(visible)]="visible"
      (opening)="log.push('opening:' + $event.reason); onOpening($event)"
      (opened)="log.push('opened:' + $event.reason)"
      (closing)="log.push('closing:' + $event.reason); onClosing($event)"
      (closed)="log.push('closed:' + $event.reason)"
    >
      <p class="body-text">Shipped today.</p>
      <input class="field" aria-label="Note" />
      <div *ogePopoverFooter="let close">
        <button type="button" class="done" (click)="close()">Done</button>
      </div>
    </oge-popover>
  `,
})
class Host {
  readonly showOn = signal<OgePopoverShowOn>('click');
  readonly modal = signal(false);
  readonly visible = signal(false);
  readonly log: string[] = [];
  vetoOpen = false;
  vetoClose = false;

  onOpening(event: OgePopoverOpeningEvent): void {
    event.cancel = this.vetoOpen;
  }

  onClosing(event: OgePopoverClosingEvent): void {
    event.cancel = this.vetoClose;
  }
}

describe('OgePopover', () => {
  let fixture: ComponentFixture<Host>;
  const host = () => fixture.componentInstance;
  const q = (selector: string) =>
    (fixture.nativeElement as HTMLElement).querySelector(
      selector,
    ) as HTMLElement;
  const trigger = () => q('.trigger');
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
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame'],
    });
    fixture = TestBed.createComponent(Host);
    settle();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
    document.body.querySelectorAll('.oge-popover').forEach((el) => el.remove());
  });

  it('a click trigger is an APG disclosure: haspopup, expanded, controls', () => {
    expect(trigger().getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(trigger().getAttribute('aria-controls')).toBe(null);
    trigger().click();
    settle();
    const el = panel();
    expect(el).not.toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(trigger().getAttribute('aria-controls')).toBe(el?.id);
    expect(el?.getAttribute('role')).toBe('dialog');
    expect(el?.getAttribute('aria-modal')).toBe(null);
    trigger().click();
    settle();
    expect(panel()).toBeNull();
    expect(host().log).toEqual([
      'opening:click',
      'opened:click',
      'closing:trigger',
      'closed:trigger',
    ]);
  });

  it('renders title (labelling the dialog), body, footer, close button and arrow, in body', () => {
    trigger().click();
    settle();
    const el = panel() as HTMLElement;
    expect(el.parentElement).toBe(document.body);
    const title = el.querySelector('.oge-popover-title') as HTMLElement;
    expect(title.textContent?.trim()).toBe('Order details');
    expect(el.getAttribute('aria-labelledby')).toBe(title.id);
    expect(el.querySelector('.body-text')?.textContent).toBe('Shipped today.');
    expect(el.querySelector('.oge-popover-footer .done')).not.toBeNull();
    const close = el.querySelector('.oge-popover-close') as HTMLElement;
    expect(close.getAttribute('aria-label')).toBe('Close');
    expect(
      el.querySelector('.oge-popover-arrow')?.getAttribute('data-side'),
    ).toBe('top');
    expect(
      (el.querySelector('.oge-popover-content') as HTMLElement).style.width,
    ).toBe('260px');
  });

  it('the close button and a footer close() close with focus back on the trigger', () => {
    trigger().click();
    settle();
    (panel()?.querySelector('.oge-popover-close') as HTMLElement).focus();
    (panel()?.querySelector('.oge-popover-close') as HTMLElement).click();
    settle();
    expect(panel()).toBeNull();
    expect(host().log.at(-1)).toBe('closed:closeButton');
    expect(document.activeElement).toBe(trigger());

    trigger().click();
    settle();
    (panel()?.querySelector('.done') as HTMLElement).focus();
    (panel()?.querySelector('.done') as HTMLElement).click();
    settle();
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('Escape closes through the shared stack; outside pointer-down closes', () => {
    trigger().click();
    settle();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    settle();
    expect(panel()).toBeNull();
    expect(host().log.at(-1)).toBe('closed:escape');

    trigger().click();
    settle();
    q('.after').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    settle();
    expect(panel()).toBeNull();
    expect(host().log.at(-1)).toBe('closed:outside');
  });

  it('honours cancel on opening and closing', () => {
    host().vetoOpen = true;
    trigger().click();
    settle();
    expect(panel()).toBeNull();
    host().vetoOpen = false;
    host().vetoClose = true;
    trigger().click();
    settle();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    settle();
    expect(panel()).not.toBeNull();
  });

  it('[(visible)] opens and closes it, and reports user closes back', () => {
    host().visible.set(true);
    settle();
    expect(panel()).not.toBeNull();
    expect(host().log).toContain('opened:api');
    host().visible.set(false);
    settle();
    expect(panel()).toBeNull();
    trigger().click();
    settle();
    expect(host().visible()).toBe(true);
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    settle();
    expect(host().visible()).toBe(false);
  });

  it('a vetoed [(visible)] write is written back', () => {
    host().vetoOpen = true;
    host().visible.set(true);
    settle();
    expect(panel()).toBeNull();
    expect(host().visible()).toBe(false);
  });

  it('modal: aria-modal, focus moves in, Tab is trapped', () => {
    host().modal.set(true);
    settle();
    trigger().click();
    settle();
    const el = panel() as HTMLElement;
    expect(el.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(el.querySelector('.oge-popover-close'));
    (el.querySelector('.done') as HTMLElement).focus();
    const tab = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    (el.querySelector('.done') as HTMLElement).dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(el.querySelector('.oge-popover-close'));
  });

  it('non-modal: Tab from the trigger enters the panel, Tab from its end continues after the trigger and closes', () => {
    trigger().focus();
    trigger().click();
    settle();
    expect(document.activeElement).toBe(trigger()); // focus stays (APG)
    const intoPanel = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    trigger().dispatchEvent(intoPanel);
    expect(intoPanel.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(
      panel()?.querySelector('.oge-popover-close'),
    );
    const done = panel()?.querySelector('.done') as HTMLElement;
    done.focus();
    const out = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    done.dispatchEvent(out);
    settle();
    expect(document.activeElement).toBe(q('.after'));
    expect(panel()).toBeNull();
    expect(host().log.at(-1)).toBe('closed:focusOut');
  });

  it('hover: opens after the dwell, survives moving into the panel, closes after leaving', () => {
    host().showOn.set('hover');
    settle();
    expect(trigger().getAttribute('aria-haspopup')).toBe(null);
    trigger().dispatchEvent(new MouseEvent('pointerenter'));
    settle(50);
    expect(panel()).toBeNull();
    settle(150);
    expect(panel()).not.toBeNull();
    trigger().dispatchEvent(new MouseEvent('pointerleave'));
    vi.advanceTimersByTime(100);
    panel()?.dispatchEvent(new MouseEvent('pointerenter'));
    settle(400);
    expect(panel()).not.toBeNull();
    panel()?.dispatchEvent(new MouseEvent('pointerleave'));
    settle(400);
    expect(panel()).toBeNull();
    expect(host().log.at(-1)).toBe('closed:pointerLeave');
  });

  it('focus: opens on focus, closes when focus leaves', () => {
    host().showOn.set('focus');
    settle();
    trigger().focus();
    settle();
    expect(panel()).not.toBeNull();
    q('.before').focus();
    settle();
    expect(panel()).toBeNull();
  });

  it('manual: the trigger does nothing; the exported API drives it', () => {
    host().showOn.set('manual');
    settle();
    trigger().click();
    settle();
    expect(panel()).toBeNull();
    const pop = fixture.debugElement.children
      .map((c) => c.componentInstance)
      .find((c) => c instanceof OgePopover) as OgePopover;
    pop.open();
    settle();
    // no trigger opened it — the `anchor` input would place it; the panel
    // still renders
    expect(panel()).not.toBeNull();
    pop.toggle();
    settle();
    expect(panel()).toBeNull();
  });
});

@Component({
  imports: [OgePopover, OgePopoverTrigger, OgePopoverTitle],
  providers: [provideOgeOverlayConfig({ messages: { popoverClose: 'Kapat' } })],
  template: `
    <button type="button" class="trigger" [ogePopover]="pop">Open</button>
    <oge-popover #pop ariaLabel="Share" (closed)="closed = $event">
      <ng-container *ogePopoverTitle
        >Share <b class="rich">report</b></ng-container
      >
      Body
    </oge-popover>
  `,
})
class TitleTemplateHost {
  closed: OgePopoverClosedEvent | null = null;
  opened: OgePopoverOpenedEvent | null = null;
}

describe('OgePopover title template and messages', () => {
  it('renders the title slot, labels by it and localizes the close button', () => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame'],
    });
    const fixture = TestBed.createComponent(TitleTemplateHost);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.trigger') as HTMLElement).click();
    fixture.detectChanges();
    vi.advanceTimersByTime(20);
    fixture.detectChanges();
    const panel = document.body.querySelector('.oge-popover') as HTMLElement;
    expect(panel.querySelector('.oge-popover-title .rich')).not.toBeNull();
    expect(panel.getAttribute('aria-labelledby')).not.toBe(null);
    expect(panel.getAttribute('aria-label')).toBe(null);
    expect(
      panel.querySelector('.oge-popover-close')?.getAttribute('aria-label'),
    ).toBe('Kapat');
    fixture.destroy();
    expect(document.body.querySelector('.oge-popover')).toBeNull();
    vi.useRealTimers();
  });
});
