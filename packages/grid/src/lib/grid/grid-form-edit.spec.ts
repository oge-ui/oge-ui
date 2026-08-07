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
    fixture.componentRef.setInput('editing', {
      mode: 'form',
      allowUpdating: true,
    });
    fixture.detectChanges();
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;

    // open the inline form via the command column
    (el.querySelector('.oge-command-btn') as HTMLElement).click();
    await settle(fixture);
    const form = el.querySelector('.oge-form-row') as HTMLElement;
    expect(form).toBeTruthy();
    const labels = Array.from(form.querySelectorAll('.oge-form-label')).map(
      (l) => l.textContent?.trim(),
    );
    expect(labels).toEqual(['Name', 'Salary']);
    // the edited row's cells are replaced; the other row still renders cells
    expect(el.querySelectorAll('.oge-row:not(.oge-form-row)').length).toBe(1);

    // change the name and save
    const nameInput = form.querySelector(
      '.oge-editor .oge-input-native',
    ) as HTMLInputElement;
    nameInput.value = 'Ada L.';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    (form.querySelector('.oge-btn-accent') as HTMLElement).click();
    await settle(fixture);

    expect(el.querySelector('.oge-form-row')).toBeNull();
    expect(el.querySelector('.oge-row .oge-cell')?.textContent?.trim()).toBe(
      'Ada L.',
    );
    expect(rows[0].name).toBe('Ada L.');
  });

  it('formItems controls field selection, order, labels, spans and column count', async () => {
    const rows: Row[] = [{ id: 1, name: 'Ada', salary: 100 }];
    const fixture = TestBed.createComponent(OgeGrid<Row>);
    fixture.componentRef.setInput('data', rows);
    fixture.componentRef.setInput('columns', ['name', 'salary']);
    fixture.componentRef.setInput('keyField', 'id');
    fixture.componentRef.setInput('editing', {
      mode: 'form',
      allowUpdating: true,
      formColCount: 2,
      formItems: [
        { field: 'salary', label: 'Monthly Pay', colSpan: 2 },
        'name',
      ],
    });
    fixture.detectChanges();
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;

    (el.querySelector('.oge-command-btn') as HTMLElement).click();
    await settle(fixture);

    const fields = el.querySelector('.oge-form-fields') as HTMLElement;
    expect(fields.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))');
    const labels = Array.from(fields.querySelectorAll('.oge-form-label')).map(
      (l) => l.textContent?.trim(),
    );
    expect(labels).toEqual(['Monthly Pay', 'Name']); // custom order + label
    const firstField = fields.querySelector('.oge-form-field') as HTMLElement;
    expect(firstField.style.gridColumn).toBe('span 2');
  });
});
