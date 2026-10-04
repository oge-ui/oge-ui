import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { OGE_COLOR_PALETTE_PRESETS } from '@oge-ui/behavior';
import { OgeColorPalette } from './color-palette';

@Component({
  imports: [OgeColorPalette],
  template: `
    <oge-color-palette
      label="Tag color"
      [palette]="palette()"
      [columns]="columns()"
      [tileSize]="tileSize()"
      [readonly]="readonly()"
      [(value)]="value"
    />
  `,
})
class Host {
  readonly palette = signal<
    'office' | 'basic' | 'monochrome' | readonly string[]
  >('monochrome');
  readonly columns = signal<number | undefined>(undefined);
  readonly tileSize = signal<number | undefined>(undefined);
  readonly readonly = signal(false);
  readonly value = signal<string | null>(null);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function cells(fixture: ComponentFixture<unknown>): HTMLElement[] {
  return Array.from(
    fixture.nativeElement.querySelectorAll('.oge-color-palette-cell'),
  );
}

function key(target: HTMLElement, name: string, ctrlKey = false): void {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key: name, ctrlKey, bubbles: true }),
  );
}

describe('OgeColorPalette', () => {
  it('renders a preset as an APG grid with one roving tab stop', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const grid: HTMLElement =
      fixture.nativeElement.querySelector('.oge-color-palette');
    expect(grid.getAttribute('role')).toBe('grid');
    expect(grid.getAttribute('aria-label')).toBe('Tag color');
    expect(cells(fixture)).toHaveLength(
      OGE_COLOR_PALETTE_PRESETS.monochrome.colors.length,
    );
    expect(grid.style.getPropertyValue('--oge-color-palette-columns')).toBe(
      '10',
    );
    expect(cells(fixture).filter((cell) => cell.tabIndex === 0)).toHaveLength(
      1,
    );
  });

  it('a click picks the swatch string as listed', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    cells(fixture)[3].click();
    await settle(fixture);
    expect(fixture.componentInstance.value).toBeTruthy();
    expect(fixture.componentInstance.value()).toBe('#555555');
    expect(cells(fixture)[3].getAttribute('aria-selected')).toBe('true');
    expect(cells(fixture)[3].tabIndex).toBe(0);
  });

  it('arrows / Home / End move focus; Enter picks; no wrap', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.palette.set('basic'); // 8 columns
    await settle(fixture);
    const all = cells(fixture);
    all[0].focus();
    key(all[0], 'ArrowDown');
    expect(document.activeElement).toBe(all[8]);
    key(all[8], 'End');
    expect(document.activeElement).toBe(all[15]);
    key(all[15], 'ArrowRight'); // row edge — no wrap
    expect(document.activeElement).toBe(all[15]);
    key(all[15], 'End', true);
    expect(document.activeElement).toBe(all[all.length - 1]);
    key(all[all.length - 1], 'Enter');
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('#ffffff');
  });

  it('takes a custom list, an explicit column count and a fixed tile size', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.palette.set(['red', '#00f', 'not-a-color']);
    fixture.componentInstance.columns.set(2);
    fixture.componentInstance.tileSize.set(30);
    await settle(fixture);
    expect(cells(fixture)).toHaveLength(2); // unparseable entries are dropped
    const host: HTMLElement =
      fixture.nativeElement.querySelector('oge-color-palette');
    expect(host.classList).toContain('oge-color-palette-editor-sized');
    expect(host.style.getPropertyValue('--oge-color-palette-tile')).toBe(
      '30px',
    );
  });

  it('readonly keeps navigation but ignores picks', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.readonly.set(true);
    await settle(fixture);
    cells(fixture)[2].click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBeNull();
    expect(
      fixture.nativeElement
        .querySelector('.oge-color-palette')
        .getAttribute('aria-readonly'),
    ).toBe('true');
  });

  @Component({
    imports: [OgeColorPalette, ReactiveFormsModule],
    template: `<oge-color-palette palette="office" [formControl]="control" />`,
  })
  class CvaHost {
    readonly control = new FormControl<string | null>('#4472c4');
  }

  it('binds a reactive control and disables with it', async () => {
    const fixture = TestBed.createComponent(CvaHost);
    await settle(fixture);
    const selected = fixture.nativeElement.querySelector(
      '.oge-color-palette-selected',
    );
    expect(selected?.getAttribute('aria-label')).toBe('#4472c4');
    cells(fixture)[0].click();
    await settle(fixture);
    expect(fixture.componentInstance.control.value).toBe('#ffffff');
    fixture.componentInstance.control.disable();
    await settle(fixture);
    expect(cells(fixture).every((cell) => cell.tabIndex === -1)).toBe(true);
    cells(fixture)[1].click();
    await settle(fixture);
    expect(fixture.componentInstance.control.value).toBe('#ffffff');
  });
});
