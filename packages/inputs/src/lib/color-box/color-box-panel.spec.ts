import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeColorBox } from './color-box';
import type {
  OgeColorBoxApplyValueMode,
  OgeColorBoxView,
} from './color-box-types';

@Component({
  imports: [OgeColorBox],
  template: `
    <oge-color-box
      label="Color"
      [view]="view()"
      [editAlphaChannel]="editAlphaChannel()"
      [applyValueMode]="applyValueMode()"
      [keyStep]="keyStep()"
      [palette]="palette()"
      [paletteColumns]="3"
      [(value)]="value"
      [(opened)]="opened"
    />
  `,
})
class Host {
  readonly value = signal<string | null>(null);
  readonly opened = signal(false);
  readonly view = signal<OgeColorBoxView>('gradient');
  readonly editAlphaChannel = signal(false);
  readonly applyValueMode = signal<OgeColorBoxApplyValueMode>('instantly');
  readonly keyStep = signal(5);
  readonly palette = signal<readonly string[] | undefined>([
    '#ff0000',
    '#00ff00',
    '#0000ff',
    '#ffff00',
    '#00ffff',
    '#ff00ff',
  ]);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

function inputEl(fixture: ComponentFixture<unknown>): HTMLInputElement {
  return fixture.nativeElement.querySelector('.oge-input-native');
}

function colorBox(fixture: ComponentFixture<Host>): OgeColorBox {
  return fixture.debugElement.children[0].componentInstance;
}

function query<T extends HTMLElement>(
  fixture: ComponentFixture<unknown>,
  selector: string,
): T {
  const el = fixture.nativeElement.querySelector(selector) as T | null;
  if (!el) throw new Error(`expected element: ${selector}`);
  return el;
}

function keydown(
  el: HTMLElement,
  key: string,
  init: KeyboardEventInit = {},
): void {
  el.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, ...init }),
  );
}

describe('OgeColorBox panel', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'requestAnimationFrame',
      (cb: FrameRequestCallback) =>
        setTimeout(() => cb(performance.now()), 0) as unknown as number,
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function open(fixture: ComponentFixture<Host>): Promise<void> {
    await settle(fixture);
    colorBox(fixture).open();
    await settle(fixture);
  }

  it('moves DOM focus onto the surface thumb on open and restores it on Escape', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set('#3aa0ff');
    await open(fixture);
    const thumb = query(fixture, '.oge-color-surface-thumb');
    expect(document.activeElement).toBe(thumb);
    keydown(thumb, 'Escape');
    await settle(fixture);
    expect(fixture.componentInstance.opened()).toBe(false);
    expect(document.activeElement).toBe(inputEl(fixture));
  });

  it('renders hue and (opt-in) alpha sliders with the APG slider contract', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set('#ff0000');
    await open(fixture);
    expect(
      fixture.nativeElement.querySelectorAll('.oge-color-slider').length,
    ).toBe(1); // no alpha by default
    const hue = query(fixture, '.oge-color-slider .oge-color-slider-thumb');
    expect(hue.getAttribute('role')).toBe('slider');
    expect(hue.getAttribute('aria-valuemin')).toBe('0');
    expect(hue.getAttribute('aria-valuemax')).toBe('360');
    expect(hue.getAttribute('aria-valuenow')).toBe('0');
    expect(hue.getAttribute('aria-valuetext')).toBe('0 degrees');

    fixture.componentInstance.editAlphaChannel.set(true);
    await settle(fixture);
    const alpha = query(
      fixture,
      '.oge-color-slider-alpha .oge-color-slider-thumb',
    );
    expect(alpha.getAttribute('aria-valuemax')).toBe('100');
    expect(alpha.getAttribute('aria-valuetext')).toBe('100%');
  });

  it('hue keyboard steps by keyStep, PageUp by 5×, Home/End to the rails — committing live', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set('#ff0000'); // h=0, s=100, v=100
    await open(fixture);
    const hue = query(fixture, '.oge-color-slider .oge-color-slider-thumb');
    keydown(hue, 'ArrowRight');
    await settle(fixture);
    expect(hue.getAttribute('aria-valuenow')).toBe('5');
    expect(fixture.componentInstance.value()).toBe('#ff1500');
    keydown(hue, 'PageUp');
    await settle(fixture);
    expect(hue.getAttribute('aria-valuenow')).toBe('30');
    keydown(hue, 'End');
    await settle(fixture);
    expect(hue.getAttribute('aria-valuenow')).toBe('360');
    keydown(hue, 'Home');
    await settle(fixture);
    expect(hue.getAttribute('aria-valuenow')).toBe('0');
    expect(fixture.componentInstance.value()).toBe('#ff0000');
  });

  it('the 2D surface moves saturation with Left/Right and brightness with Up/Down/PageDown; Home is a no-op', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set('#ff0000'); // s=100, v=100
    await open(fixture);
    const thumb = query(fixture, '.oge-color-surface-thumb');
    expect(thumb.getAttribute('aria-roledescription')).toBe(
      '2-dimensional color picker',
    );
    expect(thumb.getAttribute('aria-valuetext')).toBe(
      'Saturation 100%, Brightness 100%',
    );
    keydown(thumb, 'ArrowLeft');
    await settle(fixture);
    expect(thumb.getAttribute('aria-valuetext')).toBe(
      'Saturation 95%, Brightness 100%',
    );
    keydown(thumb, 'ArrowDown');
    await settle(fixture);
    expect(thumb.getAttribute('aria-valuetext')).toBe(
      'Saturation 95%, Brightness 95%',
    );
    keydown(thumb, 'PageDown');
    await settle(fixture);
    expect(thumb.getAttribute('aria-valuetext')).toBe(
      'Saturation 95%, Brightness 70%',
    );
    const before = thumb.getAttribute('aria-valuetext');
    keydown(thumb, 'Home');
    await settle(fixture);
    expect(thumb.getAttribute('aria-valuetext')).toBe(before);
    expect(fixture.componentInstance.value()).not.toBeNull();
  });

  it('hex and channel inputs apply parsed values and revert garbage', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set('#000000');
    await open(fixture);
    const hex = query<HTMLInputElement>(
      fixture,
      '.oge-color-box-field-hex .oge-color-box-channel',
    );
    hex.value = '#00ff00';
    hex.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('#00ff00');

    hex.value = 'zzz';
    hex.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(fixture);
    expect(hex.value).toBe('#00ff00'); // reverted
    expect(fixture.componentInstance.value()).toBe('#00ff00');

    const channels = fixture.nativeElement.querySelectorAll(
      '.oge-color-box-channel',
    ) as NodeListOf<HTMLInputElement>;
    const red = channels[1]; // hex, r, g, b
    red.value = '255';
    red.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('#ffff00');
  });

  it('palette view: grid semantics, arrow navigation and Enter pick close the panel', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.view.set('palette');
    await open(fixture);
    const grid = query(fixture, '.oge-color-palette');
    expect(grid.getAttribute('role')).toBe('grid');
    expect(grid.getAttribute('aria-label')).toBe('Color palette');
    expect(fixture.nativeElement.querySelectorAll('[role="row"]').length).toBe(
      2,
    ); // 6 colors / 3 columns
    const first = query(fixture, '[data-index="0"]');
    expect(document.activeElement).toBe(first); // focus target in palette view
    keydown(first, 'ArrowRight');
    await settle(fixture);
    const second = query(fixture, '[data-index="1"]');
    expect(document.activeElement).toBe(second);
    expect(second.getAttribute('tabindex')).toBe('0');
    expect(first.getAttribute('tabindex')).toBe('-1');
    keydown(second, 'ArrowDown');
    await settle(fixture);
    const fifth = query(fixture, '[data-index="4"]');
    expect(document.activeElement).toBe(fifth);
    keydown(fifth, 'Enter');
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('#00ffff');
    expect(fixture.componentInstance.opened()).toBe(false);
    expect(document.activeElement).toBe(inputEl(fixture));
  });

  it('palette marks the current color selected with a contrast checkmark', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.view.set('both');
    fixture.componentInstance.value.set('#ffff00');
    await open(fixture);
    const selected = query(fixture, '.oge-color-palette-selected');
    expect(selected.getAttribute('aria-selected')).toBe('true');
    expect(
      selected
        .querySelector('.oge-color-palette-check')
        ?.getAttribute('stroke'),
    ).toBe('black'); // yellow swatch → black check
  });

  it('useButtons drafts interactions and commits only on OK; Cancel discards', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.applyValueMode.set('useButtons');
    fixture.componentInstance.value.set('#ff0000');
    await open(fixture);
    const hue = query(fixture, '.oge-color-slider .oge-color-slider-thumb');
    keydown(hue, 'End'); // h → 360 (same color as 0 — step back for a distinct one)
    await settle(fixture);
    keydown(hue, 'PageDown'); // h → 335
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('#ff0000'); // drafted only
    query<HTMLButtonElement>(fixture, '.oge-color-box-ok').click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('#ff006a');
    expect(fixture.componentInstance.opened()).toBe(false);

    await open(fixture);
    const hue2 = query(fixture, '.oge-color-slider .oge-color-slider-thumb');
    keydown(hue2, 'PageUp');
    await settle(fixture);
    query<HTMLButtonElement>(
      fixture,
      '.oge-color-box-actions .oge-color-box-action:not(.oge-color-box-ok)',
    ).click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('#ff006a'); // unchanged
    expect(fixture.componentInstance.opened()).toBe(false);
  });

  it('useButtons palette pick drafts without closing', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.applyValueMode.set('useButtons');
    fixture.componentInstance.view.set('palette');
    await open(fixture);
    const first = query(fixture, '[data-index="0"]');
    first.click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBeNull();
    expect(fixture.componentInstance.opened()).toBe(true);
    query<HTMLButtonElement>(fixture, '.oge-color-box-ok').click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('#ff0000');
  });

  it('useButtons renders the committed | draft preview pair', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.applyValueMode.set('useButtons');
    fixture.componentInstance.value.set('#ff0000');
    await open(fixture);
    const panes = fixture.nativeElement.querySelectorAll(
      '.oge-color-box-preview-pane',
    ) as NodeListOf<HTMLElement>;
    expect(panes.length).toBe(2);
    expect(panes[0].style.background).toContain('rgb(255, 0, 0)'); // committed
    const hue = query(fixture, '.oge-color-slider .oge-color-slider-thumb');
    keydown(hue, 'PageUp'); // draft h → 25
    await settle(fixture);
    expect(panes[0].style.background).toContain('rgb(255, 0, 0)'); // unchanged
    expect(panes[1].style.background).toContain('rgb(255, 106, 0)'); // draft
  });

  it('showDropDownButton=false hides the rail chevron; keyboard still opens', async () => {
    @Component({
      imports: [OgeColorBox],
      template: `<oge-color-box label="Color" [showDropDownButton]="false" />`,
    })
    class NoButtonHost {}
    const fixture = TestBed.createComponent(NoButtonHost);
    await settle(fixture);
    expect(
      fixture.nativeElement.querySelector('.oge-input-dropdown'),
    ).toBeNull();
    inputEl(fixture).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    await settle(fixture);
    expect(
      fixture.nativeElement.querySelector('.oge-color-box-panel'),
    ).toBeTruthy();
  });

  it('the eyedropper renders only with the platform API and applies the pick', async () => {
    // jsdom ships no EyeDropper — the button must not render
    const bare = TestBed.createComponent(Host);
    await open(bare);
    expect(
      bare.nativeElement.querySelector('.oge-color-box-eyedropper'),
    ).toBeNull();
    bare.destroy();

    vi.stubGlobal(
      'EyeDropper',
      class {
        open(): Promise<{ sRGBHex: string }> {
          return Promise.resolve({ sRGBHex: '#00ff00' });
        }
      },
    );
    TestBed.resetTestingModule();
    const fixture = TestBed.createComponent(Host);
    await open(fixture);
    const button = query<HTMLButtonElement>(
      fixture,
      '.oge-color-box-eyedropper',
    );
    button.click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('#00ff00');
  });
});
