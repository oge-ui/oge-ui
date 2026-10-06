import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  buildOgeSignatureSvg,
  ogeSvgDataUrl,
  parseOgeSignatureSvg,
  type OgeSignatureFormat,
  type OgeSignatureMode,
  type OgeSignatureStrokeEvent,
} from '@oge-ui/behavior';
import { OgeSignaturePad } from './signature-pad';

@Component({
  imports: [OgeSignaturePad],
  template: `
    <oge-signature-pad
      label="Customer signature"
      [format]="format()"
      [readonly]="readonly()"
      [disabled]="disabled()"
      [(mode)]="mode"
      [(value)]="value"
      (strokeEnded)="strokes.push($event)"
    />
  `,
})
class Host {
  readonly value = signal<string | null>(null);
  readonly format = signal<OgeSignatureFormat>('svg');
  readonly mode = signal<OgeSignatureMode>('draw');
  readonly readonly = signal(false);
  readonly disabled = signal(false);
  readonly strokes: OgeSignatureStrokeEvent[] = [];
}

@Component({
  imports: [OgeSignaturePad, ReactiveFormsModule],
  template: `<oge-signature-pad format="svg" [formControl]="control" />`,
})
class FormHost {
  readonly control = new FormControl<string | null>(null);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

/** jsdom has no PointerEvent constructor — a MouseEvent with the fields added. */
function pointer(
  target: EventTarget,
  type: string,
  x: number,
  y: number,
): void {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    button: 0,
  });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  Object.defineProperty(event, 'pointerType', { value: 'mouse' });
  target.dispatchEvent(event);
}

function surface(fixture: ComponentFixture<unknown>): HTMLElement {
  return fixture.nativeElement.querySelector('.oge-signature-pad-surface');
}

function draw(
  fixture: ComponentFixture<unknown>,
  points: [number, number][],
): void {
  const el = surface(fixture);
  const [first, ...rest] = points;
  pointer(el, 'pointerdown', ...first);
  for (const p of rest) pointer(el, 'pointermove', ...p);
  pointer(el, 'pointerup', ...points[points.length - 1]);
}

beforeEach(() => {
  // jsdom implements no 2D context; the pad must cope (SVG fallback)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    width: 200,
    height: 100,
    right: 200,
    bottom: 100,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
});

afterEach(() => vi.restoreAllMocks());

describe('OgeSignaturePad', () => {
  it('renders a labelled image surface with an empty status and placeholder', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const el = surface(fixture);
    expect(el.getAttribute('role')).toBe('img');
    expect(el.getAttribute('aria-label')).toBe(
      'Customer signature, not signed',
    );
    expect(
      fixture.nativeElement
        .querySelector('.oge-signature-pad-placeholder')
        ?.textContent.trim(),
    ).toBe('Sign here');
    expect(
      (
        fixture.nativeElement.querySelector(
          '.oge-signature-pad-undo',
        ) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it('commits an SVG data URL per stroke, emits strokeEnded and undoes', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    draw(fixture, [
      [10, 10],
      [60, 40],
      [120, 70],
    ]);
    await settle(fixture);
    const host = fixture.componentInstance;
    expect(host.value()?.startsWith('data:image/svg+xml;base64,')).toBe(true);
    expect(parseOgeSignatureSvg(host.value())?.strokes).toHaveLength(1);
    expect(host.strokes).toHaveLength(1);
    expect(host.strokes[0].strokeCount).toBe(1);
    expect(surface(fixture).getAttribute('aria-label')).toBe(
      'Customer signature, signed',
    );
    // a tap is a dot — a stroke of one point
    draw(fixture, [[150, 50]]);
    await settle(fixture);
    expect(parseOgeSignatureSvg(host.value())?.strokes).toHaveLength(2);

    const undo = fixture.nativeElement.querySelector(
      '.oge-signature-pad-undo',
    ) as HTMLButtonElement;
    undo.click();
    await settle(fixture);
    expect(parseOgeSignatureSvg(host.value())?.strokes).toHaveLength(1);
    undo.click();
    await settle(fixture);
    expect(host.value()).toBeNull();
  });

  it('Ctrl+Z undoes from inside the pad; Escape mid-stroke cancels it', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    draw(fixture, [
      [10, 10],
      [80, 60],
    ]);
    await settle(fixture);
    const el = surface(fixture);
    pointer(el, 'pointerdown', 20, 20);
    pointer(el, 'pointermove', 90, 90);
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    pointer(el, 'pointerup', 90, 90);
    await settle(fixture);
    const host = fixture.componentInstance;
    expect(parseOgeSignatureSvg(host.value())?.strokes).toHaveLength(1);
    expect(host.strokes).toHaveLength(1);

    const clear = fixture.nativeElement.querySelector(
      '.oge-signature-pad-clear',
    ) as HTMLButtonElement;
    clear.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }),
    );
    await settle(fixture);
    expect(host.value()).toBeNull();
  });

  it('falls back to SVG when no canvas context exists (PNG requested)', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.format.set('png');
    await settle(fixture);
    draw(fixture, [
      [10, 10],
      [50, 50],
    ]);
    await settle(fixture);
    expect(
      fixture.componentInstance.value()?.startsWith('data:image/svg+xml'),
    ).toBe(true);
  });

  it('types a signature in the keyboard mode', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const typeButton = fixture.nativeElement.querySelectorAll(
      '.oge-signature-pad-mode',
    )[1] as HTMLButtonElement;
    expect(typeButton.getAttribute('aria-pressed')).toBe('false');
    typeButton.click();
    await settle(fixture);
    expect(fixture.componentInstance.mode()).toBe('type');
    const input = fixture.nativeElement.querySelector(
      '.oge-signature-pad-type-input',
    ) as HTMLInputElement;
    expect(input.closest('label')?.textContent).toContain(
      'Type your full name',
    );
    input.value = 'Ada Lovelace';
    input.dispatchEvent(new Event('input'));
    await settle(fixture);
    const data = parseOgeSignatureSvg(fixture.componentInstance.value());
    expect(data?.typedText).toBe('Ada Lovelace');
    expect(
      fixture.nativeElement.querySelector('.oge-signature-pad-typed')
        ?.textContent,
    ).toBe('Ada Lovelace');
  });

  it('restores an SVG value it exported and shows other images', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const stored = ogeSvgDataUrl(
      buildOgeSignatureSvg(
        [
          {
            points: [
              { x: 0.1, y: 0.1, t: 0 },
              { x: 0.5, y: 0.5, t: 10 },
            ],
          },
        ],
        {
          size: { width: 200, height: 100 },
          color: '#000',
          minWidth: 1,
          maxWidth: 3,
        },
      ),
    );
    fixture.componentInstance.value.set(stored);
    await settle(fixture);
    const undo = fixture.nativeElement.querySelector(
      '.oge-signature-pad-undo',
    ) as HTMLButtonElement;
    expect(undo.disabled).toBe(false);
    expect(
      fixture.nativeElement.querySelector('.oge-signature-pad-image'),
    ).toBeNull();

    fixture.componentInstance.value.set('data:image/png;base64,iVBORw0KGgo=');
    await settle(fixture);
    const img = fixture.nativeElement.querySelector(
      '.oge-signature-pad-image',
    ) as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('data:image/png;base64,iVBORw0KGgo=');
    expect(undo.disabled).toBe(true);

    fixture.componentInstance.value.set('javascript:alert(1)');
    await settle(fixture);
    expect(
      fixture.nativeElement.querySelector('.oge-signature-pad-image'),
    ).toBeNull();
  });

  it('does not draw while readonly or disabled', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.readonly.set(true);
    await settle(fixture);
    draw(fixture, [
      [10, 10],
      [50, 50],
    ]);
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBeNull();
    fixture.componentInstance.readonly.set(false);
    fixture.componentInstance.disabled.set(true);
    await settle(fixture);
    draw(fixture, [
      [10, 10],
      [50, 50],
    ]);
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBeNull();
    expect(surface(fixture).getAttribute('aria-disabled')).toBe('true');
  });

  it('binds reactive forms: a reset empties the pad, touched after a stroke', async () => {
    const fixture = TestBed.createComponent(FormHost);
    await settle(fixture);
    draw(fixture, [
      [10, 10],
      [50, 50],
    ]);
    await settle(fixture);
    const control = fixture.componentInstance.control;
    expect(control.value?.startsWith('data:image/svg+xml')).toBe(true);
    expect(control.dirty).toBe(true);
    control.reset();
    await settle(fixture);
    expect(control.value).toBeNull();
    expect(
      (
        fixture.nativeElement.querySelector(
          '.oge-signature-pad-undo',
        ) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
});
