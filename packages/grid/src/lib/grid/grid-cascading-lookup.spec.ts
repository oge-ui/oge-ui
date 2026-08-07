import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeColumn } from '../columns/column';
import { OgeGrid } from './grid';

interface Row {
  id: number;
  country: string;
  city: string;
}

const CITIES: Record<string, string[]> = {
  TR: ['İstanbul', 'Ankara'],
  DE: ['Berlin', 'Münih'],
};

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve));
  fixture.detectChanges();
}

@Component({
  imports: [OgeGrid, OgeColumn],
  template: `
    <oge-grid
      [data]="rows"
      keyField="id"
      [editing]="{ mode: 'row', allowUpdating: true }"
    >
      <oge-column field="country" [lookup]="{ dataSource: countries }" />
      <oge-column field="city" [lookup]="{ dataSource: citiesOf }" />
    </oge-grid>
  `,
})
class CascadeHost {
  readonly rows: Row[] = [{ id: 1, country: 'TR', city: 'Ankara' }];
  readonly countries = ['TR', 'DE'];
  readonly citiesOf = (row: Row) => CITIES[row.country] ?? [];
}

describe('OgeGrid cascading lookups', () => {
  beforeEach(() => {
    // async stub — a synchronous rAF re-enters Angular's render scheduler
    // mid-tick and produces bogus NG0100 errors (select-box popup)
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

  it('re-evaluates the dependent editor options from the row draft', async () => {
    const fixture = TestBed.createComponent(CascadeHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    // function lookup still renders display text from the row values
    expect(
      el.querySelectorAll('.oge-row .oge-cell')[1].textContent?.trim(),
    ).toBe('Ankara');

    // enter row edit via the command column
    (el.querySelector('.oge-command-btn') as HTMLElement).click();
    await settle(fixture);
    const editors = el.querySelectorAll('.oge-editor');
    expect(editors.length).toBe(2);

    const editorInput = (index: number) =>
      editors[index].querySelector('.oge-input-native') as HTMLInputElement;
    const openOptions = async (index: number) => {
      editorInput(index).click();
      await settle(fixture);
      return Array.from(el.querySelectorAll('.oge-select-option'));
    };
    const closePopup = async (index: number) => {
      // cancelable — the select box preventDefaults a popup-closing Escape so
      // the cell editor does not treat it as an edit cancel
      editorInput(index).dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true,
          cancelable: true,
        }),
      );
      await settle(fixture);
    };

    // the dependent city editor sees the current draft's country
    const cityOptions = await openOptions(1);
    expect(cityOptions.map((o) => o.textContent?.trim())).toEqual([
      'İstanbul',
      'Ankara',
    ]);
    await closePopup(1);

    // switching the country updates the dependent city options live
    const countryOptions = await openOptions(0);
    const de = countryOptions.find((o) => o.textContent?.trim() === 'DE');
    expect(de).toBeTruthy();
    de?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle(fixture);

    const updated = await openOptions(1);
    expect(updated.map((o) => o.textContent?.trim())).toEqual([
      'Berlin',
      'Münih',
    ]);
  });
});
