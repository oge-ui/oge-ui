import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeAlert } from './alert';
import { provideOgeAlertConfig } from './config';
import { OgeAlertActions, OgeAlertIcon } from './templates';
import type {
  OgeAlertClosingEvent,
  OgeAlertLive,
  OgeAlertSeverity,
} from './alert-types';

@Component({
  imports: [OgeAlert, OgeAlertActions],
  template: `
    <button id="before">Before</button>
    <oge-alert
      [severity]="severity()"
      [title]="title()"
      [live]="live()"
      [dismissible]="true"
      [(visible)]="visible"
      (closing)="onClosing($event)"
      (closed)="closedCount = closedCount + 1"
    >
      Disk almost full.
      <div ogeAlertActions><button id="act">Clean up</button></div>
    </oge-alert>
    <button id="after">After</button>
  `,
})
class AlertHost {
  readonly severity = signal<OgeAlertSeverity | undefined>(undefined);
  readonly title = signal<string | undefined>(undefined);
  readonly live = signal<OgeAlertLive>('auto');
  readonly visible = signal(true);
  readonly alert = viewChild.required(OgeAlert);
  closedCount = 0;
  veto = false;
  onClosing(event: OgeAlertClosingEvent): void {
    event.cancel = this.veto;
  }
}

@Component({
  imports: [OgeAlert, OgeAlertIcon],
  template: `
    <oge-alert severity="success">
      <svg ogeAlertIcon class="mine"></svg>
      Saved.
    </oge-alert>
  `,
})
class IconHost {}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('OgeAlert', () => {
  let fixture: ComponentFixture<AlertHost>;
  let host: AlertHost;
  let el: HTMLElement;
  const alertEl = () => el.querySelector('oge-alert') as HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(AlertHost);
    host = fixture.componentInstance;
    await settle(fixture);
    el = fixture.nativeElement as HTMLElement;
    document.body.appendChild(el);
  });

  afterEach(() => el.remove());

  it('defaults to an info status with an sr-only prefix and a decorative glyph', () => {
    expect(alertEl().getAttribute('role')).toBe('status');
    expect(alertEl().classList).toContain('oge-alert-info');
    expect(alertEl().classList).toContain('oge-alert');
    expect(el.querySelector('.oge-sr-only')?.textContent?.trim()).toBe(
      'Information',
    );
    expect(
      el.querySelector('.oge-alert-icon')?.getAttribute('aria-hidden'),
    ).toBe('true');
    expect(el.querySelector('.oge-alert-actions #act')).not.toBeNull();
  });

  it('derives role from severity and honours live', async () => {
    host.severity.set('error');
    await settle(fixture);
    expect(alertEl().getAttribute('role')).toBe('alert');
    expect(alertEl().classList).toContain('oge-alert-error');
    host.live.set('polite');
    await settle(fixture);
    expect(alertEl().getAttribute('role')).toBe('status');
    host.live.set('off');
    await settle(fixture);
    expect(alertEl().hasAttribute('role')).toBe(false);
  });

  it('puts the prefix in the title when there is one', async () => {
    host.severity.set('warning');
    host.title.set('Storage');
    await settle(fixture);
    expect(el.querySelector('.oge-alert-title')?.textContent?.trim()).toBe(
      'Warning Storage',
    );
  });

  it('dismiss closes, emits, and hands focus past the alert', async () => {
    const dismiss = el.querySelector<HTMLButtonElement>('.oge-alert-dismiss')!;
    expect(dismiss.getAttribute('aria-label')).toBe('Dismiss');
    dismiss.focus();
    dismiss.click();
    await settle(fixture);
    expect(host.visible()).toBe(false);
    expect(host.closedCount).toBe(1);
    expect(alertEl().hasAttribute('hidden')).toBe(true);
    expect(el.querySelector('.oge-alert-body')).toBeNull();
    expect(document.activeElement?.id).toBe('after');
    // the role survives hiding, so showing again announces
    expect(alertEl().getAttribute('role')).toBe('status');
    host.alert().show();
    await settle(fixture);
    expect(el.querySelector('.oge-alert-body')).not.toBeNull();
  });

  it('a cancelled closing keeps the alert', async () => {
    host.veto = true;
    host.alert().close();
    await settle(fixture);
    expect(host.visible()).toBe(true);
    expect(host.closedCount).toBe(0);
  });

  it('a projected [ogeAlertIcon] replaces the default glyph', async () => {
    const f = TestBed.createComponent(IconHost);
    await settle(f);
    const root = f.nativeElement as HTMLElement;
    expect(root.querySelector('.oge-alert-icon .mine')).not.toBeNull();
    expect(root.querySelector('.oge-alert-icon path')).toBeNull();
  });
});

describe('OgeAlert config', () => {
  it('reads severity, styling mode and messages from the config', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideOgeAlertConfig({
          severity: 'success',
          stylingMode: 'filled',
          messages: { dismiss: 'Kapat', success: 'Başarılı' },
        }),
      ],
    });
    const f = TestBed.createComponent(AlertHost);
    await settle(f);
    const root = f.nativeElement as HTMLElement;
    const alert = root.querySelector('oge-alert')!;
    expect(alert.classList).toContain('oge-alert-success');
    expect(alert.classList).toContain('oge-alert-filled');
    expect(
      root.querySelector('.oge-alert-dismiss')?.getAttribute('aria-label'),
    ).toBe('Kapat');
    expect(root.querySelector('.oge-sr-only')?.textContent?.trim()).toBe(
      'Başarılı',
    );
  });
});
