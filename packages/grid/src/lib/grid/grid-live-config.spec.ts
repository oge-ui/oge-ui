import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideOgeInputsConfig } from '@oge-ui/inputs';
import { OgeTextBox } from '@oge-ui/inputs/text-box';
import { provideOgeGridConfig } from '../config';
import { OgeGrid } from './grid';

/** Switching the UI language at runtime: provideOge<X>Config(() => …). */
const lang = signal<'en' | 'tr'>('en');

@Component({
  imports: [OgeGrid, OgeTextBox],
  template: `
    <oge-grid [data]="[]" />
    <oge-text-box label="Name" [showClearButton]="true" value="x" />
  `,
})
class Host {}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve));
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('live config (runtime language switch)', () => {
  beforeEach(() => {
    lang.set('en');
    TestBed.configureTestingModule({
      providers: [
        provideOgeGridConfig(() => ({
          messages: lang() === 'tr' ? { noData: 'Veri yok' } : {},
        })),
        provideOgeInputsConfig(() => ({
          messages: lang() === 'tr' ? { clearButton: 'Temizle' } : {},
        })),
      ],
    });
  });

  it('re-renders grid and inputs strings when the signal changes', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('oge-grid')?.textContent).toContain('No data');
    const clear = () =>
      el.querySelector('oge-text-box [aria-label]')?.getAttribute('aria-label');
    const englishClear = clear();

    lang.set('tr');
    await settle(fixture);
    expect(el.querySelector('oge-grid')?.textContent).toContain('Veri yok');
    expect(clear()).toBe('Temizle');

    lang.set('en');
    await settle(fixture);
    expect(el.querySelector('oge-grid')?.textContent).toContain('No data');
    expect(clear()).toBe(englishClear);
  });
});
