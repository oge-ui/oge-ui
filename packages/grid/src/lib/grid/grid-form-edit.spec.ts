import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeGrid } from './grid';

interface Row {
  id: number;
  name: string;
  salary: number;
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve));
  fixture.detectChanges();
}

describe('OgeGrid form edit mode', () => {
  it('swaps the row for an inline labeled form and commits on save', async () => {
    const rows: Row[] = [
      { id: 1, name: 'Ada', salary: 100 },
      { id: 2, name: 'Grace', salary: 200 },
    ];
    const fixture = TestBed.createComponent(OgeGrid<Row>);
    fixture.componentRef.setInput('data', rows);
    fixture.componentRef.setInput('columns', ['name', 'salary']);
    fixture.componentRef.setInput('keyField', 'id');
    fixture.componentRef.setInput('editing', { mode: 'form', allowUpdating: true });
    fixture.detectChanges();
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;

    // open the inline form via the command column
    (el.querySelector('.oge-command-btn') as HTMLElement).click();
    await settle(fixture);
    const form = el.querySelector('.oge-form-row') as HTMLElement;
    expect(form).toBeTruthy();
    const labels = Array.from(form.querySelectorAll('.oge-form-label')).map((l) =>
      l.textContent?.trim()
    );
    expect(labels).toEqual(['Name', 'Salary']);
    // the edited row's cells are replaced; the other row still renders cells
    expect(el.querySelectorAll('.oge-row:not(.oge-form-row)').length).toBe(1);

    // change the name and save
    const nameInput = form.querySelector('input.oge-editor-input') as HTMLInputElement;
    nameInput.value = 'Ada L.';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    (form.querySelector('.oge-btn-accent') as HTMLElement).click();
    await settle(fixture);

    expect(el.querySelector('.oge-form-row')).toBeNull();
    expect(el.querySelector('.oge-row .oge-cell')?.textContent?.trim()).toBe('Ada L.');
    expect(rows[0].name).toBe('Ada L.');
  });
});
