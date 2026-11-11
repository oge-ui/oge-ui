import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeButton } from './button';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeButton],
  template: `
    <oge-button
      class="b-link"
      text="Learn more"
      stylingMode="link"
      shape="pill"
      [fluid]="true"
    />
    <oge-button
      class="b-save"
      text="Save"
      loadingText="Saving…"
      iconClass="fa fa-save"
      [loading]="saving()"
    />
    <oge-button
      class="b-bold"
      text="Bold"
      [pressed]="bold()"
      (clicked)="clicks = clicks + 1"
    />
  `,
})
class Host {
  readonly saving = signal(false);
  readonly bold = signal(false);
  clicks = 0;
}

describe('OgeButton variants', () => {
  let fixture: ComponentFixture<Host>;
  let el: HTMLElement;
  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    el = fixture.nativeElement as HTMLElement;
    await settle(fixture);
  });
  const host = (name: string) => el.querySelector(`.b-${name}`) as HTMLElement;
  const native = (name: string) =>
    host(name).querySelector('button') as HTMLButtonElement;

  it('link variant, pill shape and fluid width', () => {
    expect(host('link').classList).toContain('oge-button-link-mode');
    expect(host('link').classList).toContain('oge-button-pill');
    expect(host('link').classList).toContain('oge-button-fluid');
  });

  it('shows the icon-font glyph and the loading text', async () => {
    const icon = native('save').querySelector('i.oge-button-icon-font');
    expect(icon?.className).toContain('fa-save');
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
    fixture.componentInstance.saving.set(true);
    await settle(fixture);
    expect(native('save').querySelector('.oge-button-text')?.textContent).toBe(
      'Saving…',
    );
    // the label already says it: no extra "Loading" for screen readers
    expect(native('save').querySelector('.oge-button-sr')).toBeNull();
  });

  it('pressed is one-way: aria-pressed follows the host, a click does not flip it', async () => {
    expect(native('bold').getAttribute('aria-pressed')).toBe('false');
    native('bold').click();
    await settle(fixture);
    expect(fixture.componentInstance.clicks).toBe(1);
    expect(native('bold').getAttribute('aria-pressed')).toBe('false');
    fixture.componentInstance.bold.set(true);
    await settle(fixture);
    expect(native('bold').getAttribute('aria-pressed')).toBe('true');
    expect(host('bold').classList).toContain('oge-button-selected');
  });
});
