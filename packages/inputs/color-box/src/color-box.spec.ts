import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import type { OgeColorFormat } from '@oge-ui/core';
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
      [format]="format()"
      [view]="view()"
      [editAlphaChannel]="editAlphaChannel()"
      [applyValueMode]="applyValueMode()"
      [showClearButton]="showClearButton()"
      [(value)]="value"
      [(opened)]="opened"
    />
  `,
})
class Host {
  readonly value = signal<string | null>(null);
  readonly opened = signal(false);
  readonly format = signal<OgeColorFormat>('hex');
  readonly view = signal<OgeColorBoxView>('gradient');
  readonly editAlphaChannel = signal(false);
  readonly applyValueMode = signal<OgeColorBoxApplyValueMode>('instantly');
  readonly showClearButton = signal(false);
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

function type(fixture: ComponentFixture<unknown>, text: string): void {
  const el = inputEl(fixture);
  el.value = text;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function blur(fixture: ComponentFixture<unknown>): void {
  inputEl(fixture).dispatchEvent(new FocusEvent('blur'));
}

describe('OgeColorBox', () => {
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

  it('shows the committed string verbatim, paints the swatch and renders the rail button', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set('rgb(255, 0, 0)');
    await settle(fixture);
    expect(inputEl(fixture).value).toBe('rgb(255, 0, 0)');
    const swatch = fixture.nativeElement.querySelector(
      '.oge-color-box-swatch-fill',
    ) as HTMLElement;
    expect(swatch.style.background).toContain('rgb(255, 0, 0)');
    expect(
      fixture.nativeElement.querySelector('.oge-input-dropdown'),
    ).toBeTruthy();
  });

  it('commits typed text normalized to the format on Enter', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    type(fixture, 'RED');
    inputEl(fixture).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('#ff0000');
  });

  it('commits per format: rgba and hsl', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.format.set('rgba');
    await settle(fixture);
    type(fixture, '#ff0000');
    blur(fixture);
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('rgba(255, 0, 0, 1)');

    fixture.componentInstance.format.set('hsl');
    await settle(fixture);
    type(fixture, '#00ff00');
    blur(fixture);
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('hsl(120, 100%, 50%)');
  });

  it('coerces alpha opaque without editAlphaChannel, widens with it', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    type(fixture, 'rgba(255, 0, 0, 0.5)'); // parses fine, commits opaque
    blur(fixture);
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('#ff0000');

    fixture.componentInstance.editAlphaChannel.set(true);
    await settle(fixture);
    type(fixture, 'rgba(255, 0, 0, 0.5)');
    blur(fixture);
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('#ff000080');
  });

  it('marks unparseable text invalid while typing and reverts on blur', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set('#3aa0ff');
    await settle(fixture);
    type(fixture, 'not-a-color');
    await settle(fixture);
    expect(
      fixture.nativeElement.querySelector('.oge-input-invalid'),
    ).toBeTruthy();
    expect(
      (fixture.nativeElement.querySelector('.oge-input-error') as HTMLElement)
        ?.textContent,
    ).toContain('Enter a valid color');
    blur(fixture);
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('#3aa0ff');
    expect(inputEl(fixture).value).toBe('#3aa0ff'); // reverted, not cleared
    expect(
      fixture.nativeElement.querySelector('.oge-input-invalid'),
    ).toBeNull();
  });

  it('empty text commits null; clear button clears', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.showClearButton.set(true);
    fixture.componentInstance.value.set('#ff0000');
    await settle(fixture);
    type(fixture, '');
    blur(fixture);
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBeNull();

    fixture.componentInstance.value.set('#00ff00');
    await settle(fixture);
    (
      fixture.nativeElement.querySelector('.oge-input-clear') as HTMLElement
    ).click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBeNull();
  });

  it('open/close/toggle drive the opened model and emit the panel events', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const log: string[] = [];
    colorBox(fixture).dropDownOpened.subscribe(() => log.push('opened'));
    colorBox(fixture).dropDownClosed.subscribe(() => log.push('closed'));
    colorBox(fixture).open();
    await settle(fixture);
    expect(fixture.componentInstance.opened()).toBe(true);
    expect(
      fixture.nativeElement.querySelector('.oge-color-box-panel'),
    ).toBeTruthy();
    expect(inputEl(fixture).getAttribute('aria-expanded')).toBe('true');
    colorBox(fixture).close();
    await settle(fixture);
    expect(fixture.componentInstance.opened()).toBe(false);
    expect(log).toEqual(['opened', 'closed']);
  });

  it('ArrowDown opens the panel; the dialog is labeled', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    inputEl(fixture).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    await settle(fixture);
    const dialog = fixture.nativeElement.querySelector(
      '.oge-color-box-panel',
    ) as HTMLElement;
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-label')).toBe('Color');
  });

  it('keeps programmatic writes verbatim and re-derives the panel from them', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set('cornflowerblue');
    await settle(fixture);
    expect(inputEl(fixture).value).toBe('cornflowerblue'); // never reformatted
    colorBox(fixture).open();
    await settle(fixture);
    const hex = fixture.nativeElement.querySelector(
      '.oge-color-box-field-hex .oge-color-box-channel',
    ) as HTMLInputElement;
    expect(hex.value).toBe('#6495ed');
  });

  it('reset returns the field to pristine', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set('#ff0000');
    await settle(fixture);
    colorBox(fixture).reset();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBeNull();
    expect(inputEl(fixture).value).toBe('');
  });
});

describe('OgeColorBox (reactive forms)', () => {
  @Component({
    imports: [OgeColorBox, ReactiveFormsModule],
    template: `<oge-color-box label="Color" [formControl]="control" />`,
  })
  class FormsHost {
    readonly control = new FormControl<string | null>(null, {
      validators: [Validators.required],
    });
  }

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

  it('bridges the CVA: writes land verbatim, commits normalize', async () => {
    const fixture = TestBed.createComponent(FormsHost);
    await settle(fixture);
    fixture.componentInstance.control.setValue('rgb(0, 0, 255)');
    await settle(fixture);
    expect(inputEl(fixture).value).toBe('rgb(0, 0, 255)');

    type(fixture, 'lime');
    blur(fixture);
    await settle(fixture);
    expect(fixture.componentInstance.control.value).toBe('#00ff00');
    expect(fixture.componentInstance.control.touched).toBe(true);
  });

  it('unparseable programmatic writes normalize to null', async () => {
    const fixture = TestBed.createComponent(FormsHost);
    await settle(fixture);
    fixture.componentInstance.control.setValue('garbage');
    await settle(fixture);
    expect(inputEl(fixture).value).toBe('');
  });
});
