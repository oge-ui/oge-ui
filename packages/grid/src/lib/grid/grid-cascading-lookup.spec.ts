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
    <oge-grid [data]="rows" keyField="id" [editing]="{ mode: 'row', allowUpdating: true }">
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
  it('re-evaluates the dependent editor options from the row draft', async () => {
    const fixture = TestBed.createComponent(CascadeHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    // function lookup still renders display text from the row values
    expect(el.querySelectorAll('.oge-row .oge-cell')[1].textContent?.trim()).toBe('Ankara');

    // enter row edit via the command column
    (el.querySelector('.oge-command-btn') as HTMLElement).click();
    await settle(fixture);
    const selects = el.querySelectorAll<HTMLSelectElement>('select.oge-editor');
    expect(selects.length).toBe(2);
    const cityOptions = () =>
      Array.from(selects[1].querySelectorAll('option')).map((o) => o.textContent?.trim());
    expect(cityOptions()).toEqual(['İstanbul', 'Ankara']);

    // switching the country updates the dependent city options live
    selects[0].value = 'DE';
    selects[0].dispatchEvent(new Event('change', { bubbles: true }));
    selects[0].dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    expect(cityOptions()).toEqual(['Berlin', 'Münih']);
  });
});
