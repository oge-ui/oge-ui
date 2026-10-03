import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeTagBox } from './tag-box';

const COLORS = ['Red', 'Green', 'Blue'];

@Component({
  imports: [OgeTagBox],
  template: `
    <oge-tag-box
      label="Colors"
      adaptiveMode="auto"
      [items]="items"
      [searchEnabled]="true"
      [(value)]="value"
    />
  `,
})
class Host {
  readonly items = COLORS;
  readonly value = signal<readonly unknown[]>([]);
}

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

describe('OgeTagBox adaptive mode', () => {
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

  it('keeps the sheet open across picks and closes it from Done', async () => {
    stubViewport(true);
    const fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    await settle(fixture);
    const tagBox: OgeTagBox =
      fixture.debugElement.children[0].componentInstance;
    tagBox.open();
    await settle(fixture);

    const layer: HTMLElement =
      fixture.nativeElement.querySelector('.oge-popup');
    expect(layer.classList).toContain('oge-popup-adaptive-sheet');
    const search = layer.querySelector<HTMLInputElement>(
      '.oge-sheet-search-input',
    )!;
    expect(document.activeElement).toBe(search);

    const options = (): HTMLElement[] =>
      Array.from(layer.querySelectorAll<HTMLElement>('.oge-select-option'));
    options()[0].click();
    await settle(fixture);
    options()[2].click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual(['Red', 'Blue']);
    expect(tagBox.opened()).toBe(true);
    // focus stays in the sheet, never on the inert field behind it
    expect(layer.contains(document.activeElement)).toBe(true);

    const done = layer.querySelector<HTMLButtonElement>('.oge-sheet-done')!;
    expect(done.textContent?.trim()).toBe('Done');
    expect(done.closest('.oge-popup-sheet-footer')).not.toBeNull();
    done.click();
    await settle(fixture);
    expect(tagBox.opened()).toBe(false);
    fixture.nativeElement.remove();
  });
});
