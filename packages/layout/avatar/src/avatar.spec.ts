import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeAvatar } from './avatar';
import { OgeAvatarGroup } from './avatar-group';
import { provideOgeAvatarConfig } from './config';
import type {
  OgeAvatarImageFailedEvent,
  OgeAvatarItem,
  OgeAvatarStatus,
} from './avatar-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeAvatar],
  template: `
    <oge-avatar
      class="consumer"
      [name]="name()"
      [src]="src()"
      [initials]="initials()"
      [status]="status()"
      [decorative]="decorative()"
      [ariaLabel]="ariaLabel()"
      size="lg"
      shape="rounded"
      (imageFailed)="failures.push($event)"
    />
  `,
})
class AvatarHost {
  readonly name = signal<string | undefined>('Ada Lovelace');
  readonly src = signal<string | undefined>(undefined);
  readonly initials = signal<string | undefined>(undefined);
  readonly status = signal<OgeAvatarStatus | undefined>(undefined);
  readonly decorative = signal(false);
  readonly ariaLabel = signal<string | undefined>(undefined);
  readonly failures: OgeAvatarImageFailedEvent[] = [];
}

describe('OgeAvatar', () => {
  let fixture: ComponentFixture<AvatarHost>;
  let host: AvatarHost;
  const el = (): HTMLElement =>
    fixture.nativeElement.querySelector('oge-avatar') as HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(AvatarHost);
    host = fixture.componentInstance;
    await settle(fixture);
  });

  it('is a named img with derived initials and keeps consumer classes', () => {
    expect(el().getAttribute('role')).toBe('img');
    expect(el().getAttribute('aria-label')).toBe('Ada Lovelace');
    expect(el().querySelector('.oge-avatar-initials')?.textContent).toBe('AL');
    expect(el().classList).toContain('consumer');
    expect(el().classList).toContain('oge-avatar-lg');
    expect(el().classList).toContain('oge-avatar-rounded');
    expect(el().classList).toContain('oge-avatar-type-initials');
  });

  it('runs the image → initials → icon fallback chain', async () => {
    host.src.set('broken.png');
    await settle(fixture);
    const img = el().querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('alt')).toBe('');
    img.dispatchEvent(new Event('error'));
    await settle(fixture);
    expect(el().querySelector('img')).toBeNull();
    expect(el().querySelector('.oge-avatar-initials')).not.toBeNull();
    expect(host.failures[0].src).toBe('broken.png');

    // a new src gets a fresh attempt
    host.src.set('other.png');
    await settle(fixture);
    expect(el().querySelector('img')).not.toBeNull();

    host.src.set(undefined);
    host.name.set(undefined);
    await settle(fixture);
    expect(
      el().querySelector('.oge-avatar-icon path')?.getAttribute('d'),
    ).toMatch(/^M/);
    expect(el().getAttribute('aria-label')).toBe('Avatar');
  });

  it('appends the presence to the name and draws an aria-hidden dot', async () => {
    host.status.set('busy');
    await settle(fixture);
    expect(el().getAttribute('aria-label')).toBe('Ada Lovelace (Busy)');
    const dot = el().querySelector('.oge-avatar-status') as HTMLElement;
    expect(dot.classList).toContain('oge-avatar-status-busy');
    expect(dot.getAttribute('aria-hidden')).toBe('true');
  });

  it('decorative drops the role and hides the host', async () => {
    host.decorative.set(true);
    await settle(fixture);
    expect(el().hasAttribute('role')).toBe(false);
    expect(el().hasAttribute('aria-label')).toBe(false);
    expect(el().getAttribute('aria-hidden')).toBe('true');
  });

  it('prefers ariaLabel and explicit initials', async () => {
    host.ariaLabel.set('You');
    host.initials.set('me');
    await settle(fixture);
    expect(el().getAttribute('aria-label')).toBe('You');
    expect(el().querySelector('.oge-avatar-initials')?.textContent).toBe('me');
  });
});

@Component({
  imports: [OgeAvatar, OgeAvatarGroup],
  template: `
    <oge-avatar-group
      [items]="items()"
      [max]="max()"
      [total]="total()"
      size="sm"
      [ariaLabel]="label()"
    >
      @for (name of children(); track name) {
        <oge-avatar [name]="name" />
      }
    </oge-avatar-group>
  `,
})
class GroupHost {
  readonly items = signal<OgeAvatarItem[]>([
    { key: 1, name: 'Ada Lovelace' },
    { key: 2, name: 'Grace Hopper', status: 'online' },
  ]);
  readonly children = signal<string[]>(['Alan Turing', 'Edsger Dijkstra']);
  readonly max = signal<number | undefined>(3);
  readonly total = signal<number | undefined>(undefined);
  readonly label = signal<string | undefined>('Team');
}

describe('OgeAvatarGroup', () => {
  let fixture: ComponentFixture<GroupHost>;
  let host: GroupHost;
  const group = (): HTMLElement =>
    fixture.nativeElement.querySelector('oge-avatar-group') as HTMLElement;
  const shown = (): HTMLElement[] =>
    Array.from(group().querySelectorAll<HTMLElement>('oge-avatar')).filter(
      (a) => !a.hasAttribute('hidden'),
    );

  beforeEach(async () => {
    fixture = TestBed.createComponent(GroupHost);
    host = fixture.componentInstance;
    await settle(fixture);
  });

  it('is a named group and collapses the surplus into +N', () => {
    expect(group().getAttribute('role')).toBe('group');
    expect(group().getAttribute('aria-label')).toBe('Team');
    expect(shown().map((a) => a.getAttribute('aria-label'))).toEqual([
      'Ada Lovelace',
      'Grace Hopper (Online)',
    ]);
    const overflow = group().querySelector(
      '.oge-avatar-overflow',
    ) as HTMLElement;
    expect(overflow.getAttribute('role')).toBe('img');
    expect(overflow.getAttribute('aria-label')).toBe('2 more');
    expect(overflow.textContent?.trim()).toBe('+2');
  });

  it('hides projected children beyond the window and sizes them', async () => {
    host.max.set(undefined);
    await settle(fixture);
    expect(shown()).toHaveLength(4);
    expect(group().querySelector('.oge-avatar-overflow')).toBeNull();
    expect(shown()[3].classList).toContain('oge-avatar-sm');

    host.max.set(4);
    host.total.set(10);
    await settle(fixture);
    expect(shown()).toHaveLength(3);
    expect(
      group().querySelector('.oge-avatar-overflow')?.getAttribute('aria-label'),
    ).toBe('7 more');
  });

  it('drops the group role without a label', async () => {
    host.label.set(undefined);
    await settle(fixture);
    expect(group().hasAttribute('role')).toBe(false);
  });
});

@Component({
  imports: [OgeAvatar],
  providers: [
    provideOgeAvatarConfig({
      size: 'xs',
      messages: { busy: 'Meşgul' },
      locale: 'tr',
    }),
  ],
  template: `<oge-avatar name="ilker irmak" status="busy" />`,
})
class ConfigHost {}

describe('OgeAvatar config', () => {
  it('reads defaults, messages and locale from the provider', async () => {
    const fixture = TestBed.createComponent(ConfigHost);
    await settle(fixture);
    const el = fixture.nativeElement.querySelector('oge-avatar') as HTMLElement;
    expect(el.classList).toContain('oge-avatar-xs');
    expect(el.getAttribute('aria-label')).toBe('ilker irmak (Meşgul)');
    expect(el.querySelector('.oge-avatar-initials')?.textContent).toBe('İİ');
  });
});
