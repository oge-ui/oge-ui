import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { OgeColorGradient } from './color-gradient';

@Component({
  imports: [OgeColorGradient],
  template: `
    <oge-color-gradient
      label="Brand"
      [editAlphaChannel]="alpha()"
      [format]="alpha() ? 'rgba' : 'hex'"
      [showContrast]="contrast()"
      [contrastBackground]="background()"
      [disabled]="disabled()"
      [(value)]="value"
    />
  `,
})
class Host {
  readonly value = signal<string | null>('#ff0000');
  readonly alpha = signal(false);
  readonly contrast = signal(false);
  readonly background = signal('#ffffff');
  readonly disabled = signal(false);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

const q = <T extends Element = HTMLElement>(
  fixture: ComponentFixture<unknown>,
  selector: string,
): T => fixture.nativeElement.querySelector(selector) as T;

function key(target: HTMLElement, name: string): void {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key: name, bubbles: true }),
  );
}

describe('OgeColorGradient', () => {
  it('renders a labelled group of the surface, hue slider and channel inputs', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const host = q(fixture, 'oge-color-gradient');
    expect(host.getAttribute('role')).toBe('group');
    expect(host.getAttribute('aria-label')).toBe('Brand');
    expect(q(fixture, '.oge-color-surface-thumb').getAttribute('role')).toBe(
      'slider',
    );
    expect(
      fixture.nativeElement.querySelectorAll('.oge-color-slider'),
    ).toHaveLength(1);
    const hex = q<HTMLInputElement>(fixture, '.oge-color-box-channel');
    expect(hex.value).toBe('#ff0000');
    expect(q(fixture, '.oge-color-gradient-contrast')).toBeNull();
  });

  it('keyboard on the hue slider commits a normalized color', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const hue = q(fixture, '.oge-color-slider-thumb');
    key(hue, 'ArrowRight'); // +5°
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('#ff1500');
  });

  it('keeps the working hue while the value passes through a gray', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const surface = q(fixture, '.oge-color-surface-thumb');
    // drive saturation to 0 — the color becomes a gray with no hue
    for (let i = 0; i < 20; i++) {
      key(surface, 'ArrowLeft');
      await settle(fixture);
    }
    expect(fixture.componentInstance.value()).toBe('#ffffff');
    expect(
      q(fixture, '.oge-color-slider-thumb').getAttribute('aria-valuenow'),
    ).toBe('0');
    key(q(fixture, '.oge-color-slider-thumb'), 'PageUp'); // hue 25° on a gray
    await settle(fixture);
    key(surface, 'ArrowRight');
    await settle(fixture);
    expect(
      q(fixture, '.oge-color-slider-thumb').getAttribute('aria-valuenow'),
    ).toBe('25');
  });

  it('applies a hex edit on change and reverts unusable text', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const hex = q<HTMLInputElement>(fixture, '.oge-color-box-channel');
    hex.value = '#00ff00';
    hex.dispatchEvent(new Event('change'));
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('#00ff00');
    hex.value = 'nope';
    hex.dispatchEvent(new Event('change'));
    await settle(fixture);
    expect(hex.value).toBe('#00ff00');
    expect(fixture.componentInstance.value()).toBe('#00ff00');
  });

  it('with editAlphaChannel renders the alpha slider and commits rgba', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.alpha.set(true);
    await settle(fixture);
    const sliders = fixture.nativeElement.querySelectorAll(
      '.oge-color-slider-thumb',
    );
    expect(sliders).toHaveLength(2);
    key(sliders[1], 'PageDown'); // -25%
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('rgba(255, 0, 0, 0.75)');
  });

  it('shows the contrast ratio and AA / AAA verdicts against the background', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.contrast.set(true);
    fixture.componentInstance.value.set('#767676');
    await settle(fixture);
    const readout = q(fixture, '.oge-color-gradient-contrast');
    expect(
      readout
        .querySelector('.oge-color-gradient-contrast-ratio')
        ?.textContent?.trim(),
    ).toBe('4.54:1');
    const badges = Array.from(
      readout.querySelectorAll('.oge-color-gradient-contrast-badge'),
    ).map((badge) => badge.textContent?.trim());
    expect(badges).toEqual(['AA pass', 'AAA fail']);
    fixture.componentInstance.background.set('#767676');
    await settle(fixture);
    expect(
      readout
        .querySelector('.oge-color-gradient-contrast-ratio')
        ?.textContent?.trim(),
    ).toBe('1.00:1');
  });

  it('disabled takes the parts out of the Tab sequence and ignores keys', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.disabled.set(true);
    await settle(fixture);
    const hue = q(fixture, '.oge-color-slider-thumb');
    expect(hue.getAttribute('tabindex')).toBe('-1');
    expect(hue.getAttribute('aria-disabled')).toBe('true');
    key(hue, 'ArrowRight');
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('#ff0000');
    expect(
      q<HTMLInputElement>(fixture, '.oge-color-box-channel').disabled,
    ).toBe(true);
  });

  @Component({
    imports: [OgeColorGradient, ReactiveFormsModule],
    template: `<oge-color-gradient [formControl]="control" />`,
  })
  class CvaHost {
    readonly control = new FormControl<string | null>('#0000ff');
  }

  it('binds a reactive control', async () => {
    const fixture = TestBed.createComponent(CvaHost);
    await settle(fixture);
    expect(q(fixture, 'oge-color-gradient').getAttribute('aria-label')).toBe(
      'Color gradient',
    );
    const hex = q<HTMLInputElement>(fixture, '.oge-color-box-channel');
    expect(hex.value).toBe('#0000ff');
    hex.value = '#123456';
    hex.dispatchEvent(new Event('change'));
    await settle(fixture);
    expect(fixture.componentInstance.control.value).toBe('#123456');
    fixture.componentInstance.control.setValue('#abcdef');
    await settle(fixture);
    expect(hex.value).toBe('#abcdef');
  });
});
