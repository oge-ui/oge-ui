import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeButton } from './button';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeButton],
  template: `<oge-button text="Inbox" [badge]="badge()" />`,
})
class BadgeHost {
  readonly badge = signal<string | number | boolean | undefined>(undefined);
}

describe('OgeButton badge', () => {
  async function render(badge: string | number | boolean | undefined) {
    const fixture = TestBed.createComponent(BadgeHost);
    fixture.componentInstance.badge.set(badge);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, el };
  }

  it('renders no badge node when undefined', async () => {
    const { el } = await render(undefined);
    expect(el.querySelector('.oge-button-badge')).toBeNull();
  });

  it('renders a string badge as a pill', async () => {
    const { el } = await render('new');
    const badge = el.querySelector('.oge-button-badge');
    expect(badge?.textContent?.trim()).toBe('new');
    expect(badge?.classList.contains('oge-button-badge-dot')).toBe(false);
  });

  it('renders numbers and caps them at 99+', async () => {
    const { el } = await render(5);
    expect(el.querySelector('.oge-button-badge')?.textContent?.trim()).toBe(
      '5',
    );
    const capped = await render(100);
    expect(
      capped.el.querySelector('.oge-button-badge')?.textContent?.trim(),
    ).toBe('99+');
  });

  it('renders `true` as an aria-hidden dot without text', async () => {
    const { el } = await render(true);
    const dot = el.querySelector('.oge-button-badge-dot');
    expect(dot).toBeTruthy();
    expect(dot?.getAttribute('aria-hidden')).toBe('true');
    expect(dot?.textContent?.trim()).toBe('');
  });

  it('duplicates the badge text inside the native button for the accessible name', async () => {
    const { el } = await render(7);
    const native = el.querySelector('.oge-button-native');
    const sr = Array.from(native?.querySelectorAll('.oge-button-sr') ?? []);
    expect(sr.some((n) => n.textContent?.trim() === '7')).toBe(true);
    // the visible pill itself stays out of the accessible name
    expect(
      el.querySelector('.oge-button-badge')?.getAttribute('aria-hidden'),
    ).toBe('true');
  });
});
