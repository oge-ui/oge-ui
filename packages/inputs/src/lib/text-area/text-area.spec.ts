import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { OgeTextArea, measureTextAreaHeight } from './text-area';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function typeInto(el: HTMLTextAreaElement, value: string): void {
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function mockMetrics(
  el: HTMLTextAreaElement,
  scrollHeight: number,
  lineHeight = 20,
): void {
  Object.defineProperty(el, 'scrollHeight', {
    get: () => scrollHeight,
    configurable: true,
  });
  vi.spyOn(window, 'getComputedStyle').mockReturnValue({
    lineHeight: `${lineHeight}px`,
    paddingTop: '0px',
    paddingBottom: '0px',
  } as CSSStyleDeclaration);
}

describe('OgeTextArea', () => {
  afterEach(() => vi.restoreAllMocks());

  @Component({
    imports: [OgeTextArea],
    template: `
      <oge-text-area
        [(value)]="value"
        label="Notes"
        [rows]="rows()"
        [autoResize]="autoResize()"
        [minRows]="minRows()"
        [maxRows]="maxRows()"
        [showCounter]="showCounter()"
        [maxLength]="maxLength()"
        (enterKey)="enters = enters + 1"
      />
    `,
  })
  class AreaHost {
    readonly value = signal('');
    readonly rows = signal(3);
    readonly autoResize = signal(false);
    readonly minRows = signal<number | undefined>(undefined);
    readonly maxRows = signal<number | undefined>(undefined);
    readonly showCounter = signal(false);
    readonly maxLength = signal<number | undefined>(undefined);
    enters = 0;
  }

  async function render(setup?: (host: AreaHost) => void) {
    const fixture = TestBed.createComponent(AreaHost);
    setup?.(fixture.componentInstance);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      el,
      native: () =>
        el.querySelector('.oge-input-native') as HTMLTextAreaElement,
    };
  }

  it('renders a textarea with rows and spellcheck default true', async () => {
    const { native, el } = await render();
    expect(native().tagName).toBe('TEXTAREA');
    expect(native().rows).toBe(3);
    expect(native().spellcheck).toBe(true);
    expect(el.querySelector('.oge-text-area')).toBeTruthy();
  });

  it('two-way value and counter work', async () => {
    const { fixture, host, native, el } = await render((h) => {
      h.showCounter.set(true);
      h.maxLength.set(50);
    });
    typeInto(native(), 'çok satırlı\nmetin');
    await settle(fixture);
    expect(host.value()).toBe('çok satırlı\nmetin');
    expect(
      el
        .querySelector('.oge-input-counter > [aria-hidden]')
        ?.textContent?.trim(),
    ).toBe('17/50');
  });

  it('autoResize applies the class and JS fallback sets an explicit height', async () => {
    const { fixture, host, native, el } = await render((h) => {
      h.autoResize.set(true);
      h.minRows.set(2);
      h.maxRows.set(6);
    });
    expect(
      el
        .querySelector('.oge-text-area')
        ?.classList.contains('oge-text-area-auto'),
    ).toBe(true);

    mockMetrics(native(), 90, 20); // content wants 90px, bounds 40..120
    typeInto(native(), 'a\nb\nc\nd');
    await settle(fixture);
    expect(native().style.height).toBe('90px');

    mockMetrics(native(), 500, 20); // clamped to maxRows: 6*20 = 120
    host.value.set('x'.repeat(500));
    await settle(fixture);
    expect(native().style.height).toBe('120px');
  });

  it('measureTextAreaHeight clamps below min and above max', () => {
    const el = document.createElement('textarea');
    document.body.appendChild(el);
    mockMetrics(el, 10, 20);
    expect(measureTextAreaHeight(el, 3, 8)).toBe(60); // min 3*20

    mockMetrics(el, 900, 20);
    expect(measureTextAreaHeight(el, 3, 8)).toBe(160); // max 8*20
    el.remove();
  });

  it('Enter emits enterKey and keeps the newline (no preventDefault)', async () => {
    const { fixture, host, native } = await render();
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    native().dispatchEvent(event);
    await settle(fixture);
    expect(host.enters).toBe(1);
    expect(event.defaultPrevented).toBe(false);
  });

  it('works as a ControlValueAccessor', async () => {
    @Component({
      imports: [OgeTextArea, ReactiveFormsModule],
      template: `<oge-text-area label="Bio" [formControl]="control" />`,
    })
    class CvaHost {
      readonly control = new FormControl('başlangıç', { nonNullable: true });
    }
    const fixture = TestBed.createComponent(CvaHost);
    await settle(fixture);
    const native = (fixture.nativeElement as HTMLElement).querySelector(
      '.oge-input-native',
    ) as HTMLTextAreaElement;
    expect(native.value).toBe('başlangıç');

    typeInto(native, 'değişti');
    await settle(fixture);
    expect(fixture.componentInstance.control.value).toBe('değişti');
  });
});
