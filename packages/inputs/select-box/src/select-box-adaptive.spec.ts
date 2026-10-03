import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { OgeAdaptiveMode } from '@oge-ui/overlay';
import { OgeSelectBox } from './select-box';

interface City {
  id: number;
  name: string;
}

const CITIES: City[] = [
  { id: 1, name: 'Ankara' },
  { id: 2, name: 'Berlin' },
  { id: 3, name: 'Boston' },
];

@Component({
  imports: [OgeSelectBox],
  template: `
    <button type="button" class="before">before</button>
    <oge-select-box
      label="City"
      [items]="items"
      displayExpr="name"
      valueExpr="id"
      [searchEnabled]="searchEnabled()"
      [searchTimeout]="0"
      [adaptiveMode]="mode()"
      [(value)]="value"
    />
  `,
})
class Host {
  readonly items = CITIES;
  readonly value = signal<unknown>(null);
  readonly searchEnabled = signal(false);
  readonly mode = signal<OgeAdaptiveMode>('auto');
}

/** A `matchMedia` stub answering `narrow` for every max-width query. */
function stubViewport(narrow: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        matches: query.includes('max-width') ? narrow : false,
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList,
  );
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 3; i++) {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  fixture.detectChanges();
}

function selectBox(fixture: ComponentFixture<Host>): OgeSelectBox<City> {
  return fixture.debugElement.children[1].componentInstance;
}

function popup(fixture: ComponentFixture<Host>): HTMLElement | null {
  return fixture.nativeElement.querySelector('.oge-popup');
}

describe('OgeSelectBox adaptive mode', () => {
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
    document.body.style.overflow = '';
  });

  it('renders a titled modal bottom sheet on a narrow viewport', async () => {
    stubViewport(true);
    const fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    await settle(fixture);
    selectBox(fixture).open();
    await settle(fixture);

    const layer = popup(fixture)!;
    expect(layer.classList).toContain('oge-popup-adaptive-sheet');
    const dialog = layer.querySelector('.oge-popup-sheet')!;
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    const title = layer.querySelector('.oge-popup-sheet-title')!;
    expect(title.textContent?.trim()).toBe('City');
    expect(dialog.getAttribute('aria-labelledby')).toBe(title.id);
    expect(
      layer.querySelector('.oge-popup-sheet-close')!.getAttribute('aria-label'),
    ).toBe('Close');
    // the non-searchable listbox owns the keyboard and has focus
    const listbox = layer.querySelector<HTMLElement>('[role="listbox"]')!;
    expect(document.activeElement).toBe(listbox);
    expect(listbox.getAttribute('aria-activedescendant')).toBeTruthy();
    // modal: the page scroll is locked and the field is inert
    expect(document.body.style.overflow).toBe('hidden');
    expect(
      fixture.nativeElement
        .querySelector('oge-field-chrome')
        .hasAttribute('inert'),
    ).toBe(true);
    fixture.nativeElement.remove();
  });

  it('commits from the sheet keyboard and restores focus to the field', async () => {
    stubViewport(true);
    const fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    await settle(fixture);
    const input = fixture.nativeElement.querySelector(
      '.oge-input-native',
    ) as HTMLInputElement;
    input.focus();
    selectBox(fixture).open();
    await settle(fixture);
    const listbox =
      popup(fixture)!.querySelector<HTMLElement>('[role="listbox"]')!;
    listbox.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    listbox.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe(2);
    expect(popup(fixture)).toBeNull();
    expect(document.activeElement).toBe(input);
    expect(document.body.style.overflow).toBe('');
    expect(
      fixture.nativeElement
        .querySelector('oge-field-chrome')
        .hasAttribute('inert'),
    ).toBe(false);
    fixture.nativeElement.remove();
  });

  it('puts a search field at the top of a searchable sheet', async () => {
    stubViewport(true);
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.searchEnabled.set(true);
    document.body.appendChild(fixture.nativeElement);
    await settle(fixture);
    selectBox(fixture).open();
    await settle(fixture);
    const search = popup(fixture)!.querySelector<HTMLInputElement>(
      '.oge-sheet-search-input',
    )!;
    expect(search.getAttribute('role')).toBe('combobox');
    expect(search.getAttribute('aria-label')).toBe('Search');
    expect(document.activeElement).toBe(search);
    search.value = 'bo';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    const texts = Array.from(
      popup(fixture)!.querySelectorAll('.oge-select-option'),
    ).map((option) => option.textContent?.trim());
    expect(texts).toEqual(['Boston']);
    fixture.nativeElement.remove();
  });

  it('closes from the close button and the backdrop', async () => {
    stubViewport(true);
    const fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    await settle(fixture);
    selectBox(fixture).open();
    await settle(fixture);
    popup(fixture)!
      .querySelector<HTMLButtonElement>('.oge-popup-sheet-close')!
      .click();
    await settle(fixture);
    expect(selectBox(fixture).opened()).toBe(false);

    selectBox(fixture).open();
    await settle(fixture);
    const layer = popup(fixture)!;
    layer.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await settle(fixture);
    expect(selectBox(fixture).opened()).toBe(false);
    fixture.nativeElement.remove();
  });

  it('stays anchored on a wide viewport and with adaptiveMode none', async () => {
    stubViewport(false);
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    selectBox(fixture).open();
    await settle(fixture);
    expect(popup(fixture)!.classList).not.toContain('oge-popup-adaptive');
    expect(popup(fixture)!.querySelector('.oge-popup-sheet-header')).toBeNull();
    selectBox(fixture).close();

    stubViewport(true);
    const narrow = TestBed.createComponent(Host);
    narrow.componentInstance.mode.set('none');
    await settle(narrow);
    selectBox(narrow).open();
    await settle(narrow);
    expect(popup(narrow)!.classList).not.toContain('oge-popup-adaptive');
  });
});
