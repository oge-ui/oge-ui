import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeTooltip } from './tooltip';

@Component({
  imports: [OgeTooltip],
  template: `
    <button
      type="button"
      [ogeTooltip]="text()"
      [tooltipDisabled]="disabled()"
      aria-describedby="existing-hint"
    >
      Trigger
    </button>
  `,
})
class TooltipHost {
  readonly text = signal('Helpful hint');
  readonly disabled = signal(false);
}

describe('OgeTooltip', () => {
  let fixture: ComponentFixture<TooltipHost>;
  let trigger: HTMLButtonElement;

  const bubble = (): HTMLElement | null =>
    document.body.querySelector('.oge-tooltip');

  function flush(): void {
    vi.advanceTimersByTime(600);
    fixture.detectChanges();
  }

  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame'],
    });
    fixture = TestBed.createComponent(TooltipHost);
    fixture.detectChanges();
    trigger = (fixture.nativeElement as HTMLElement).querySelector(
      'button',
    ) as HTMLButtonElement;
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  it('shows after the hover dwell with role=tooltip and the text', () => {
    trigger.dispatchEvent(new MouseEvent('pointerenter'));
    fixture.detectChanges();
    expect(bubble()).toBeNull(); // not yet — dwell pending
    flush();
    const el = bubble();
    expect(el).not.toBeNull();
    expect(el?.getAttribute('role')).toBe('tooltip');
    expect(el?.textContent).toContain('Helpful hint');
    expect(el?.style.display).toBe('');
  });

  it('appends its id to aria-describedby, preserving existing ids, and restores on hide', () => {
    trigger.dispatchEvent(new MouseEvent('pointerenter'));
    flush();
    const described = trigger.getAttribute('aria-describedby') ?? '';
    expect(described).toContain('existing-hint');
    expect(described).toContain(bubble()?.id ?? '__missing__');

    trigger.dispatchEvent(new MouseEvent('pointerleave'));
    flush();
    expect(trigger.getAttribute('aria-describedby')).toBe('existing-hint');
  });

  it('hides after pointerleave and on Escape', () => {
    trigger.dispatchEvent(new MouseEvent('pointerenter'));
    flush();
    expect(bubble()?.style.display).toBe('');

    trigger.dispatchEvent(new MouseEvent('pointerleave'));
    flush();
    expect(bubble()?.style.display).toBe('none');

    trigger.dispatchEvent(new MouseEvent('pointerenter'));
    flush();
    expect(bubble()?.style.display).toBe('');
    trigger.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    fixture.detectChanges();
    expect(bubble()?.style.display).toBe('none');
  });

  it('shows immediately on focus — no dwell', () => {
    trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    vi.advanceTimersByTime(50); // < dwell; only the position frame
    fixture.detectChanges();
    expect(bubble()?.style.display).toBe('');
  });

  it('never shows while disabled or with empty text', () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    trigger.dispatchEvent(new MouseEvent('pointerenter'));
    flush();
    expect(bubble()).toBeNull();

    fixture.componentInstance.disabled.set(false);
    fixture.componentInstance.text.set('   ');
    fixture.detectChanges();
    trigger.dispatchEvent(new MouseEvent('pointerenter'));
    flush();
    expect(bubble()).toBeNull();
  });

  it('removes the bubble from the DOM when the host is destroyed', () => {
    trigger.dispatchEvent(new MouseEvent('pointerenter'));
    flush();
    expect(bubble()).not.toBeNull();
    fixture.destroy();
    expect(bubble()).toBeNull();
  });
});
