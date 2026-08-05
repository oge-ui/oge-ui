import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeColumn } from '../columns/column';
import { OgeRowTemplate } from '../templates/row-template';
import { OgeGrid } from './grid';

interface Row {
  id: number;
  name: string;
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve));
  fixture.detectChanges();
}

@Component({
  imports: [OgeGrid, OgeColumn, OgeRowTemplate],
  template: `
    <oge-grid [data]="rows" keyField="id" selectionMode="single">
      <oge-column field="name" />
      <div *ogeRowTemplate="let row; of: rows; let i = index" class="card">
        #{{ i }} · {{ row.name.toUpperCase() }}
      </div>
    </oge-grid>
  `,
})
class RowTemplateHost {
  readonly rows: Row[] = [
    { id: 1, name: 'Ada' },
    { id: 2, name: 'Grace' },
  ];
}

describe('OgeGrid row template', () => {
  it('replaces row content while selection keeps working', async () => {
    const fixture = TestBed.createComponent(RowTemplateHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const cards = el.querySelectorAll('.oge-custom-row .card');
    expect(cards.length).toBe(2);
    expect(cards[0].textContent?.trim()).toBe('#0 · ADA');
    expect(el.querySelectorAll('.oge-cell').length).toBe(0); // no default cells
    // row click still selects
    (el.querySelectorAll('.oge-custom-row')[1] as HTMLElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    );
    await settle(fixture);
    expect(el.querySelectorAll('.oge-row-selected').length).toBe(1);
  });
});
