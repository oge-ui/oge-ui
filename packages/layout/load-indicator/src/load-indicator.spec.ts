import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeLoadIndicator } from './load-indicator';

@Component({
  imports: [OgeLoadIndicator],
  template: `
    <oge-load-indicator
      [size]="size()"
      [inheritSize]="inheritSize()"
      [severity]="severity()"
      [ariaLabel]="ariaLabel()"
    />
  `,
})
class LoadHost {
  readonly size = signal<'sm' | 'md' | 'lg'>('md');
  readonly inheritSize = signal(false);
  readonly severity = signal<'accent' | 'success' | 'warning' | 'danger'>(
    'accent',
  );
  readonly ariaLabel = signal<string | undefined>(undefined);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('OgeLoadIndicator', () => {
  let fixture: ComponentFixture<LoadHost>;
  let host: LoadHost;
  let el: HTMLElement;

  const indicator = (): HTMLElement =>
    el.querySelector('oge-load-indicator') as HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(LoadHost);
    host = fixture.componentInstance;
    await settle(fixture);
    el = fixture.nativeElement as HTMLElement;
  });

  it('announces as an indeterminate progressbar — no aria-valuenow ever', () => {
    expect(indicator().getAttribute('role')).toBe('progressbar');
    expect(indicator().getAttribute('aria-valuemin')).toBe('0');
    expect(indicator().getAttribute('aria-valuemax')).toBe('100');
    expect(indicator().getAttribute('aria-valuenow')).toBeNull();
    expect(indicator().getAttribute('aria-label')).toBe('Loading');
    // The ring itself is decoration.
    expect(
      el.querySelector('.oge-load-indicator-ring')?.getAttribute('aria-hidden'),
    ).toBe('true');
  });

  it('size presets and inheritSize map to host classes', async () => {
    host.size.set('lg');
    await settle(fixture);
    expect(indicator().classList.contains('oge-load-indicator-lg')).toBe(true);
    host.inheritSize.set(true);
    await settle(fixture);
    expect(indicator().classList.contains('oge-load-indicator-inherit')).toBe(
      true,
    );
  });

  it('severity recolors via host class; ariaLabel overrides the message', async () => {
    host.severity.set('danger');
    host.ariaLabel.set('Uploading avatar');
    await settle(fixture);
    expect(indicator().classList.contains('oge-load-indicator-danger')).toBe(
      true,
    );
    expect(indicator().getAttribute('aria-label')).toBe('Uploading avatar');
  });
});
