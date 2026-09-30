import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeCard } from './card';
import { OgeCardActions } from './templates';
import { provideOgeCardConfig } from './config';
import type {
  OgeCardActionsAlign,
  OgeCardOrientation,
  OgeCardSeverity,
  OgeCardSize,
  OgeCardStylingMode,
} from './card-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  selector: 'oge-test-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OgeCard, OgeCardActions],
  template: `
    <oge-card
      [stylingMode]="stylingMode()"
      [orientation]="orientation()"
      [size]="size()"
      [severity]="severity()"
      [interactive]="interactive()"
      [loading]="loading()"
    >
      <p>Body</p>
      <div ogeCardActions [align]="align()">
        <button type="button">Go</button>
      </div>
    </oge-card>
  `,
})
class Host {
  readonly stylingMode = signal<OgeCardStylingMode>('outlined');
  readonly orientation = signal<OgeCardOrientation>('vertical');
  readonly size = signal<OgeCardSize>('md');
  readonly severity = signal<OgeCardSeverity | undefined>(undefined);
  readonly interactive = signal(false);
  readonly loading = signal(false);
  readonly align = signal<OgeCardActionsAlign>('start');
}

@Component({
  selector: 'oge-test-config-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OgeCard],
  providers: [
    provideOgeCardConfig({ stylingMode: 'raised', orientation: 'horizontal' }),
  ],
  template: `
    <oge-card class="from-config">a</oge-card>
    <oge-card class="overridden" stylingMode="filled" orientation="vertical"
      >b</oge-card
    >
  `,
})
class ConfigHost {}

function card(
  fixture: ComponentFixture<unknown>,
  selector = '.oge-card',
): HTMLElement {
  const found = (fixture.nativeElement as HTMLElement).querySelector(selector);
  if (!found) throw new Error(`no element matches ${selector}`);
  return found as HTMLElement;
}

describe('OgeCard modes', () => {
  it('defaults to outlined and marks the other chrome presets with a class', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const host = card(fixture);
    expect(host.classList.contains('oge-card-raised')).toBe(false);
    expect(host.classList.contains('oge-card-filled')).toBe(false);
    expect(host.classList.contains('oge-card-flat')).toBe(false);

    for (const mode of ['raised', 'filled', 'flat'] as const) {
      fixture.componentInstance.stylingMode.set(mode);
      await settle(fixture);
      expect(host.classList.contains(`oge-card-${mode}`)).toBe(true);
    }
  });

  it('marks the horizontal orientation on the host', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    expect(card(fixture).classList.contains('oge-card-horizontal')).toBe(false);
    fixture.componentInstance.orientation.set('horizontal');
    await settle(fixture);
    expect(card(fixture).classList.contains('oge-card-horizontal')).toBe(true);
  });

  it('aligns the action row via classes on the projected element', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const actions = card(fixture, '.oge-card-actions');
    expect(actions.className).toBe('oge-card-actions');
    const byAlign = {
      center: 'oge-card-actions-center',
      end: 'oge-card-actions-end',
      stretched: 'oge-card-actions-stretched',
    } as const;
    for (const [align, cls] of Object.entries(byAlign)) {
      fixture.componentInstance.align.set(align as OgeCardActionsAlign);
      await settle(fixture);
      expect(actions.classList.contains(cls)).toBe(true);
    }
  });

  it('marks density, severity rail and the interactive lift with classes', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const host = card(fixture);
    expect(host.classList.contains('oge-card-sm')).toBe(false);

    fixture.componentInstance.size.set('sm');
    fixture.componentInstance.severity.set('danger');
    fixture.componentInstance.interactive.set(true);
    await settle(fixture);
    expect(host.classList.contains('oge-card-sm')).toBe(true);
    expect(host.classList.contains('oge-card-severity-danger')).toBe(true);
    expect(host.classList.contains('oge-card-interactive')).toBe(true);
    // Interactive is visual only — still no role and no tabindex.
    expect(host.hasAttribute('role')).toBe(false);
    expect(host.hasAttribute('tabindex')).toBe(false);
  });

  it('swaps content and actions for an aria-busy skeleton while loading', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const host = card(fixture);
    expect(host.getAttribute('aria-busy')).toBeNull();

    fixture.componentInstance.loading.set(true);
    await settle(fixture);
    expect(host.getAttribute('aria-busy')).toBe('true');
    expect(host.querySelector('.oge-card-content')).toBeNull();
    expect(host.querySelector('.oge-card-actions')).toBeNull();
    const skeleton = host.querySelector('.oge-card-skeleton');
    expect(skeleton?.getAttribute('aria-hidden')).toBe('true');
    expect(skeleton?.querySelectorAll('.oge-card-skeleton-line').length).toBe(
      3,
    );

    fixture.componentInstance.loading.set(false);
    await settle(fixture);
    expect(host.querySelector('.oge-card-content')?.textContent).toContain(
      'Body',
    );
    expect(host.querySelector('.oge-card-actions')).not.toBeNull();
  });

  it('falls back to provideOgeCardConfig defaults, overridden per instance', async () => {
    const fixture = TestBed.createComponent(ConfigHost);
    await settle(fixture);
    const fromConfig = card(fixture, '.from-config');
    expect(fromConfig.classList.contains('oge-card-raised')).toBe(true);
    expect(fromConfig.classList.contains('oge-card-horizontal')).toBe(true);

    const overridden = card(fixture, '.overridden');
    expect(overridden.classList.contains('oge-card-raised')).toBe(false);
    expect(overridden.classList.contains('oge-card-filled')).toBe(true);
    expect(overridden.classList.contains('oge-card-horizontal')).toBe(false);
  });
});
