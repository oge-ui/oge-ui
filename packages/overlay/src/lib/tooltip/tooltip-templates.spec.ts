import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { OgeTooltipShowMode } from '@oge-ui/behavior';
import { OgeTooltip } from './tooltip';

@Component({
  imports: [OgeTooltip],
  template: `
    <button
      type="button"
      class="rich"
      [ogeTooltip]="rich"
      [tooltipContext]="user()"
      [tooltipArrow]="true"
      tooltipPlacement="bottom"
      [tooltipMaxWidth]="200"
    >
      Rich
    </button>
    <ng-template #rich let-user>
      <strong class="tip-name">{{ user.name }}</strong> · {{ user.role }}
    </ng-template>

    <button
      type="button"
      class="moded"
      ogeTooltip="Copied"
      [tooltipShowMode]="mode()"
      #tip="ogeTooltip"
    >
      Copy
    </button>
    <button type="button" class="opener" (click)="tip.toggle()">Toggle</button>
  `,
})
class Host {
  readonly user = signal({ name: 'Ada', role: 'Engineer' });
  readonly mode = signal<OgeTooltipShowMode>('click');
}

describe('OgeTooltip templates, arrow and show modes', () => {
  let fixture: ComponentFixture<Host>;
  const q = (selector: string) =>
    (fixture.nativeElement as HTMLElement).querySelector(
      selector,
    ) as HTMLButtonElement;
  const bubbles = () =>
    Array.from(document.body.querySelectorAll<HTMLElement>('.oge-tooltip'));
  const visible = () => bubbles().filter((b) => b.style.display !== 'none');

  function flush(): void {
    vi.advanceTimersByTime(600);
    fixture.detectChanges();
  }

  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame'],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  it('renders a template with its context, a max width and an arrow', () => {
    q('.rich').dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    flush();
    const [bubble] = visible();
    expect(bubble.querySelector('.tip-name')?.textContent).toBe('Ada');
    expect(bubble.textContent).toContain('Engineer');
    expect(bubble.style.maxWidth).toBe('200px');
    const arrow = bubble.querySelector('.oge-tooltip-arrow');
    expect(arrow?.getAttribute('aria-hidden')).toBe('true');
    // placement bottom → the arrow sits on the bubble's top edge
    expect(arrow?.getAttribute('data-side')).toBe('top');
    // a template-only tooltip still describes the trigger
    expect(q('.rich').getAttribute('aria-describedby')).toBe(bubble.id);
  });

  it('keeps the template live while visible', () => {
    q('.rich').dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    flush();
    fixture.componentInstance.user.set({ name: 'Grace', role: 'Admiral' });
    flush();
    expect(visible()[0].querySelector('.tip-name')?.textContent).toBe('Grace');
  });

  it("'click' mode toggles on activation, not on hover or focus", () => {
    const trigger = q('.moded');
    trigger.dispatchEvent(new MouseEvent('pointerenter'));
    trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    flush();
    expect(visible()).toHaveLength(0);
    trigger.click();
    flush();
    expect(visible()).toHaveLength(1);
    trigger.click();
    flush();
    expect(visible()).toHaveLength(0);
  });

  it("'manual' mode follows only the exported API (exportAs: 'ogeTooltip')", () => {
    fixture.componentInstance.mode.set('manual');
    fixture.detectChanges();
    const trigger = q('.moded');
    trigger.click();
    trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    flush();
    expect(visible()).toHaveLength(0);
    q('.opener').click();
    flush();
    expect(visible()).toHaveLength(1);
    expect(visible()[0].textContent).toContain('Copied');
    q('.opener').click();
    flush();
    expect(visible()).toHaveLength(0);
  });
});
