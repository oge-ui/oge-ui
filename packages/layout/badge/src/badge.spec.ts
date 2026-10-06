import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeBadge } from './badge';
import { provideOgeBadgeConfig } from './config';
import type { OgeBadgeValue } from './badge-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeBadge],
  template: `
    <oge-badge
      id="overlay"
      [value]="value()"
      [max]="max()"
      [invisible]="invisible()"
      [announce]="announce()"
      [description]="description()"
      position="bottom-start"
      severity="accent"
    >
      <button type="button" aria-describedby="hint">Inbox</button>
    </oge-badge>
    <span id="hint">Opens your mail</span>
    <oge-badge id="standalone" [value]="value()" />
    <oge-badge id="dot" [dot]="true" />
  `,
})
class BadgeHost {
  readonly value = signal<OgeBadgeValue>(5);
  readonly max = signal<number | undefined>(undefined);
  readonly invisible = signal(false);
  readonly announce = signal(false);
  readonly description = signal<string | undefined>(undefined);
}

describe('OgeBadge', () => {
  let fixture: ComponentFixture<BadgeHost>;
  let host: BadgeHost;
  const q = (sel: string): HTMLElement =>
    fixture.nativeElement.querySelector(sel) as HTMLElement;
  const button = (): HTMLButtonElement =>
    q('#overlay button') as HTMLButtonElement;
  const describedText = (): string =>
    (button().getAttribute('aria-describedby') ?? '')
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent?.trim())
      .join(' | ');

  beforeEach(async () => {
    fixture = TestBed.createComponent(BadgeHost);
    host = fixture.componentInstance;
    document.body.appendChild(fixture.nativeElement);
    await settle(fixture);
  });

  afterEach(() => fixture.nativeElement.remove());

  it('overlay: aria-hidden glyph, description on the wrapped control', () => {
    expect(q('#overlay').classList).toContain('oge-badge-overlay');
    expect(q('#overlay').classList).toContain('oge-badge-bottom-start');
    expect(q('#overlay').classList).toContain('oge-badge-accent');
    const glyph = q('#overlay .oge-badge-indicator');
    expect(glyph.getAttribute('aria-hidden')).toBe('true');
    expect(glyph.textContent).toBe('5');
    expect(describedText()).toBe('Opens your mail | 5 new items');
    expect(q('#overlay .oge-badge-sr')).toBeNull();
  });

  it('standalone: visually hidden description inline', () => {
    expect(q('#standalone').classList).not.toContain('oge-badge-overlay');
    expect(q('#standalone .oge-badge-sr').textContent).toBe('5 new items');
    expect(q('#dot .oge-badge-indicator').textContent).toBe('');
    expect(q('#dot .oge-badge-sr').textContent).toBe('New');
  });

  it('caps at max and honours an explicit description', async () => {
    host.value.set(120);
    await settle(fixture);
    expect(q('#overlay .oge-badge-indicator').textContent).toBe('99+');
    expect(describedText()).toContain('More than 99 new items');
    host.max.set(9);
    host.value.set(12);
    host.description.set('12 unread mails');
    await settle(fixture);
    expect(q('#overlay .oge-badge-indicator').textContent).toBe('9+');
    expect(describedText()).toBe('Opens your mail | 12 unread mails');
  });

  it('a hidden badge renders nothing and detaches its description', async () => {
    host.value.set(0);
    await settle(fixture);
    expect(q('#overlay .oge-badge-indicator')).toBeNull();
    expect(button().getAttribute('aria-describedby')).toBe('hint');
    host.value.set(3);
    host.invisible.set(true);
    await settle(fixture);
    expect(q('#overlay .oge-badge-indicator')).toBeNull();
    expect(button().getAttribute('aria-describedby')).toBe('hint');
  });

  it('announce speaks later changes only', async () => {
    host.announce.set(true);
    await settle(fixture);
    const live = q('#overlay [aria-live]');
    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.textContent?.trim()).toBe('');
    host.value.set(6);
    await settle(fixture);
    expect(q('#overlay [aria-live]').textContent?.trim()).toBe('6 new items');
  });

  it('cleans the describedby link up on destroy', () => {
    const btn = button();
    fixture.destroy();
    expect(btn.getAttribute('aria-describedby')).toBe('hint');
  });
});

@Component({
  imports: [OgeBadge],
  providers: [
    provideOgeBadgeConfig({
      max: 9,
      severity: 'success',
      messages: { count: '{count, plural, other {# yeni}}' },
    }),
  ],
  template: `<oge-badge [value]="12" />`,
})
class ConfigHost {}

describe('OgeBadge config', () => {
  it('reads max, severity and messages from the provider', async () => {
    const fixture = TestBed.createComponent(ConfigHost);
    await settle(fixture);
    const el = fixture.nativeElement.querySelector('oge-badge') as HTMLElement;
    expect(el.classList).toContain('oge-badge-success');
    expect(el.querySelector('.oge-badge-indicator')?.textContent).toBe('9+');
  });
});
