import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeChip } from './chip';
import { provideOgeChipConfig } from './config';
import type { OgeChipRemovedEvent } from './chip-types';

@Component({
  imports: [OgeChip],
  template: `
    <oge-chip
      [label]="label()"
      [selectable]="selectable()"
      [(selected)]="selected"
      [removable]="removable()"
      [disabled]="disabled()"
      [icon]="icon()"
      [avatar]="avatar()"
      severity="accent"
      (removed)="removals.push($event)"
    />
  `,
})
class ChipHost {
  readonly label = signal('Design');
  readonly selectable = signal(false);
  readonly selected = signal(false);
  readonly removable = signal(false);
  readonly disabled = signal(false);
  readonly icon = signal<string | undefined>(undefined);
  readonly avatar = signal<{ name?: string; src?: string } | undefined>(
    undefined,
  );
  readonly chip = viewChild.required(OgeChip);
  readonly removals: OgeChipRemovedEvent[] = [];
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('OgeChip', () => {
  let fixture: ComponentFixture<ChipHost>;
  let host: ChipHost;
  let el: HTMLElement;
  const q = <T extends Element>(s: string) => el.querySelector(s) as T | null;

  beforeEach(async () => {
    fixture = TestBed.createComponent(ChipHost);
    host = fixture.componentInstance;
    await settle(fixture);
    el = fixture.nativeElement as HTMLElement;
  });

  it('renders a static chip as plain text', () => {
    expect(q('oge-chip')?.classList).toContain('oge-chip');
    expect(q('oge-chip')?.classList).toContain('oge-chip-accent');
    expect(q('.oge-chip-label')?.textContent).toBe('Design');
    expect(q('button')).toBeNull();
  });

  it('a selectable chip is a toggle button with aria-pressed', async () => {
    host.selectable.set(true);
    await settle(fixture);
    const button = q<HTMLButtonElement>('button.oge-chip-main')!;
    expect(button.getAttribute('aria-pressed')).toBe('false');
    button.click();
    await settle(fixture);
    expect(host.selected()).toBe(true);
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(q('oge-chip')?.classList).toContain('oge-chip-selected');
  });

  it('a removable chip has a real remove button with a localized name', async () => {
    host.removable.set(true);
    await settle(fixture);
    const remove = q<HTMLButtonElement>('button.oge-chip-remove')!;
    expect(remove.getAttribute('aria-label')).toBe('Remove Design');
    remove.click();
    expect(host.removals.length).toBe(1);
  });

  it('Delete / Backspace on the toggle removes; disabled blocks everything', async () => {
    host.selectable.set(true);
    host.removable.set(true);
    await settle(fixture);
    const main = q<HTMLButtonElement>('button.oge-chip-main')!;
    expect(main.getAttribute('aria-keyshortcuts')).toBe('Delete Backspace');
    main.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
    main.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
    expect(host.removals.length).toBe(2);
    host.disabled.set(true);
    await settle(fixture);
    main.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
    expect(host.removals.length).toBe(2);
    expect(main.disabled).toBe(true);
  });

  it('renders an aria-hidden icon or initials avatar', async () => {
    host.icon.set('M0 0h24v24');
    await settle(fixture);
    expect(q('.oge-chip-lead')?.getAttribute('aria-hidden')).toBe('true');
    expect(q('.oge-chip-icon path')?.getAttribute('d')).toBe('M0 0h24v24');
    host.avatar.set({ name: 'Ada Lovelace' });
    await settle(fixture);
    expect(q('.oge-chip-avatar')?.textContent?.trim()).toBe('AL');
  });

  it('focus() targets the toggle, else the remove button', async () => {
    host.removable.set(true);
    await settle(fixture);
    host.chip().focus();
    expect(document.activeElement?.className).toContain('oge-chip-remove');
  });
});

describe('OgeChip config', () => {
  it('reads size, styling mode and messages from provideOgeChipConfig', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideOgeChipConfig({
          size: 'sm',
          stylingMode: 'outlined',
          messages: { remove: 'Kaldır: {label}' },
        }),
      ],
    });
    const fixture = TestBed.createComponent(ChipHost);
    fixture.componentInstance.removable.set(true);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const chip = el.querySelector('oge-chip')!;
    expect(chip.classList).toContain('oge-chip-sm');
    expect(chip.classList).toContain('oge-chip-outlined');
    expect(
      el.querySelector('.oge-chip-remove')?.getAttribute('aria-label'),
    ).toBe('Kaldır: Design');
  });
});
