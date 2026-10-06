import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { OgeFabClickEvent, OgeFabPosition } from '@oge-ui/behavior';
import { provideOgeFabConfig } from './config';
import { OgeFab } from './fab';

@Component({
  imports: [OgeFab],
  template: `
    <oge-fab
      label="New message"
      icon="M12 5v14M5 12h14"
      [extended]="extended()"
      [position]="position()"
      [disabled]="disabled()"
      [offset]="offset()"
      (clicked)="clicks.push($event)"
    />
  `,
})
class FabHost {
  readonly extended = signal(false);
  readonly position = signal<OgeFabPosition | undefined>(undefined);
  readonly disabled = signal(false);
  readonly offset = signal<string | undefined>(undefined);
  readonly fab = viewChild.required(OgeFab);
  readonly clicks: OgeFabClickEvent[] = [];
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('OgeFab', () => {
  let fixture: ComponentFixture<FabHost>;
  let host: FabHost;
  let el: HTMLElement;
  const fabHost = () => el.querySelector('oge-fab') as HTMLElement;
  const button = () => el.querySelector('.oge-fab-button') as HTMLButtonElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(FabHost);
    host = fixture.componentInstance;
    await settle(fixture);
    el = fixture.nativeElement as HTMLElement;
  });

  it('is an icon-only button named by its label', () => {
    expect(button().getAttribute('type')).toBe('button');
    expect(button().getAttribute('aria-label')).toBe('New message');
    expect(el.querySelector('.oge-fab-icon path')?.getAttribute('d')).toBe(
      'M12 5v14M5 12h14',
    );
    expect(el.querySelector('.oge-fab-label')).toBeNull();
  });

  it('extended shows the label as text and drops the aria-label', async () => {
    host.extended.set(true);
    await settle(fixture);
    expect(button().hasAttribute('aria-label')).toBe(false);
    expect(el.querySelector('.oge-fab-label')?.textContent).toBe('New message');
    expect(fabHost().classList).toContain('oge-fab-extended');
  });

  it('maps position, mode, size and severity onto host classes', async () => {
    const classes = fabHost().classList;
    expect(classes).toContain('oge-fab');
    expect(classes).toContain('oge-fab-layer');
    expect(classes).toContain('oge-fab-fixed');
    expect(classes).toContain('oge-fab-position-bottom-end');
    expect(classes).toContain('oge-fab-size-md');
    expect(classes).toContain('oge-fab-severity-accent');
    host.position.set('top-start');
    await settle(fixture);
    expect(fabHost().classList).toContain('oge-fab-position-top-start');
  });

  it('writes the offset knob only when set', async () => {
    expect(fabHost().style.getPropertyValue('--oge-fab-offset')).toBe('');
    host.offset.set('24px');
    await settle(fixture);
    expect(fabHost().style.getPropertyValue('--oge-fab-offset')).toBe('24px');
  });

  it('emits clicked, and not while disabled; focus() focuses the button', async () => {
    button().click();
    expect(host.clicks.length).toBe(1);
    expect(host.clicks[0].event).toBeInstanceOf(MouseEvent);
    host.disabled.set(true);
    await settle(fixture);
    button().click();
    expect(host.clicks.length).toBe(1);
    host.disabled.set(false);
    await settle(fixture);
    host.fab().focus();
    expect(document.activeElement).toBe(button());
  });
});

@Component({
  imports: [OgeFab],
  template: `<oge-fab label="Add" />`,
  providers: [
    provideOgeFabConfig({
      position: 'bottom-start',
      positionMode: 'absolute',
      size: 'lg',
      severity: 'success',
    }),
  ],
})
class ConfiguredHost {}

describe('OgeFab config', () => {
  it('reads its defaults from provideOgeFabConfig', async () => {
    const fixture = TestBed.createComponent(ConfiguredHost);
    await settle(fixture);
    const classes = (
      (fixture.nativeElement as HTMLElement).querySelector(
        'oge-fab',
      ) as HTMLElement
    ).classList;
    expect(classes).toContain('oge-fab-position-bottom-start');
    expect(classes).toContain('oge-fab-absolute');
    expect(classes).toContain('oge-fab-size-lg');
    expect(classes).toContain('oge-fab-severity-success');
  });
});
