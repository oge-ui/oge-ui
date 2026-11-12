import { Component, signal } from '@angular/core';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  OgeImportEvent,
  OgeImportField,
  OgeImportStep,
} from '@oge-ui/spreadsheet-engine/import';
import { provideOgeImportWizardConfig } from './config';
import { OgeImportWizard } from './import-wizard';

interface Contact {
  name: string;
  age: number;
  email: string;
}

const FIELDS: OgeImportField<Contact>[] = [
  { field: 'name', label: 'Name', required: true },
  { field: 'age', label: 'Age', type: 'number' },
  { field: 'email', label: 'Email' },
];

const CSV = 'Name,Age,Email\nAyşe,34,ayse@example.com\nBob,old,bob@example.com';

@Component({
  imports: [OgeImportWizard],
  template: `<oge-import-wizard
    #wizard
    [fields]="fields()"
    (imported)="imported.push($event)"
    (stepChange)="steps.push($event)"
  />`,
})
class Host {
  readonly fields = signal(FIELDS);
  readonly imported: OgeImportEvent<Contact>[] = [];
  readonly steps: OgeImportStep[] = [];
}

const csvFile = (text = CSV, name = 'contacts.csv') =>
  new File([text], name, { type: 'text/csv' });

function setup(messages = {}) {
  TestBed.configureTestingModule({
    providers: [provideOgeImportWizardConfig({ messages })],
  });
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const wizard = fixture.debugElement.children[0]
    .componentInstance as OgeImportWizard<Contact>;
  return { fixture, el, host: fixture.componentInstance, wizard };
}

async function settle(fixture: ComponentFixture<Host>, check: () => void) {
  await vi.waitFor(() => {
    fixture.detectChanges();
    check();
  });
}

const q = <T extends Element = HTMLElement>(
  el: HTMLElement,
  selector: string,
) => el.querySelector(selector) as T;

describe('OgeImportWizard', () => {
  it('walks a CSV file through mapping, review and import', async () => {
    const { fixture, el, host } = setup();
    expect(q(el, '[aria-current="step"]').textContent).toContain(
      'Choose a file',
    );
    const input = q<HTMLInputElement>(el, 'input[type="file"]');
    Object.defineProperty(input, 'files', { value: [csvFile()] });
    input.dispatchEvent(new Event('change'));
    await settle(fixture, () =>
      expect(el.querySelector('.oge-import-mapping')).not.toBeNull(),
    );
    const selects = el.querySelectorAll<HTMLSelectElement>('.oge-import-field');
    expect(selects).toHaveLength(3);
    expect(selects[1].value).toBe('age');
    expect(q(el, '.oge-import-sample').textContent).toContain('Ayşe, Bob');

    q<HTMLButtonElement>(el, '.oge-import-next').click();
    fixture.detectChanges();
    expect(q(el, '.oge-import-summary').textContent).toContain(
      '1 of 2 rows ready',
    );
    const bad = el.querySelector('.oge-import-cell-error');
    expect(bad?.textContent?.trim()).toBe('old');
    expect(bad?.getAttribute('title')).toBe('Age must be a number');
    expect(el.querySelectorAll('.oge-import-review tbody tr')).toHaveLength(2);

    const problemsOnly = q<HTMLInputElement>(el, '.oge-import-problems-only');
    problemsOnly.click();
    fixture.detectChanges();
    expect(el.querySelectorAll('.oge-import-review tbody tr')).toHaveLength(1);
    expect(q(el, '.oge-import-row-number').textContent?.trim()).toBe('3');

    const skip = q<HTMLInputElement>(el, '.oge-import-skip');
    skip.click();
    fixture.detectChanges();
    expect(q<HTMLButtonElement>(el, '.oge-import-commit').disabled).toBe(true);
    skip.click();
    fixture.detectChanges();
    const commit = q<HTMLButtonElement>(el, '.oge-import-commit');
    expect(commit.textContent).toContain('Import 1 row');
    commit.click();
    fixture.detectChanges();
    expect(host.imported[0].records).toEqual([
      { name: 'Ayşe', age: 34, email: 'ayse@example.com' },
    ]);
    expect(q(el, '.oge-import-done').textContent).toContain(
      '1 row imported, 1 skipped',
    );
    expect(host.steps).toEqual(['map', 'review', 'done']);
    q<HTMLButtonElement>(el, '.oge-import-again').click();
    fixture.detectChanges();
    expect(el.querySelector('.oge-import-drop')).not.toBeNull();
  });

  it('remaps by hand and holds Next until the required field is matched', async () => {
    const { fixture, el, wizard } = setup();
    await wizard.load(csvFile('Full,Years\nAyşe,34'));
    fixture.detectChanges();
    expect(q(el, '.oge-import-alert').textContent).toContain(
      'Match the required fields: Name',
    );
    expect(q<HTMLButtonElement>(el, '.oge-import-next').disabled).toBe(true);
    const select = q<HTMLSelectElement>(el, '.oge-import-field');
    select.value = 'name';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(q<HTMLButtonElement>(el, '.oge-import-next').disabled).toBe(false);
    select.value = '';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(q<HTMLButtonElement>(el, '.oge-import-next').disabled).toBe(true);
    const header = q<HTMLInputElement>(el, '.oge-import-has-header');
    header.click();
    fixture.detectChanges();
    expect(q(el, '.oge-import-mapping tbody th').textContent).toContain(
      'Column 1',
    );
    q<HTMLButtonElement>(el, '.oge-import-back').click();
    fixture.detectChanges();
    expect(el.querySelector('.oge-import-drop')).not.toBeNull();
  });

  it('takes a dropped file, shows a read error and the config text', async () => {
    const { fixture, el, wizard } = setup({ browse: 'dosya seçin' });
    expect(q(el, '.oge-import-browse').textContent).toContain('dosya seçin');
    const drop = q(el, '.oge-import-drop');
    const over = new Event('dragover', { cancelable: true });
    drop.dispatchEvent(over);
    fixture.detectChanges();
    expect(over.defaultPrevented).toBe(true);
    expect(drop.classList).toContain('oge-import-drop-active');
    drop.dispatchEvent(new Event('dragleave'));
    fixture.detectChanges();
    expect(drop.classList).not.toContain('oge-import-drop-active');
    const event = Object.assign(new Event('drop', { cancelable: true }), {
      dataTransfer: { files: [csvFile('')] },
    });
    drop.dispatchEvent(event);
    await settle(fixture, () =>
      expect(q(el, '[role="alert"]').textContent).toContain(
        'The file has no rows to import',
      ),
    );
    wizard.reset();
    fixture.detectChanges();
    expect(el.querySelector('[role="alert"]')).toBeNull();
  });

  it('switches between the sheets of a workbook', async () => {
    const { fixture, el, wizard } = setup();
    const bytes = readFileSync(
      resolve(
        __dirname,
        '../../../../apps/dev-app/public/demo/import/contacts.xlsx',
      ),
    );
    await wizard.load(new Blob([bytes]), 'contacts.xlsx');
    fixture.detectChanges();
    const sheet = q<HTMLSelectElement>(el, '.oge-import-sheet');
    expect(Array.from(sheet.options).map((o) => o.text.trim())).toEqual([
      'Employees',
      'Notes',
    ]);
    sheet.value = '1';
    sheet.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(el.querySelectorAll('.oge-import-mapping tbody tr')).toHaveLength(1);
  });
});
