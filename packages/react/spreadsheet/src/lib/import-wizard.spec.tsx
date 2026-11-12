import { StrictMode, createRef } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { OgeImportField } from '@oge-ui/spreadsheet-engine/import';
import { OgeImportWizard, type OgeImportWizardHandle } from './import-wizard';
import { OgeImportWizardConfigProvider } from './import-wizard-config';

interface Contact {
  name: string;
  age: number;
}

const FIELDS: OgeImportField<Contact>[] = [
  { field: 'name', label: 'Name', required: true },
  { field: 'age', label: 'Age', type: 'number' },
];

const csvFile = (text: string, name = 'contacts.csv') =>
  new File([text], name, { type: 'text/csv' });

describe('<OgeImportWizard>', () => {
  it('walks a file through mapping, review and import', async () => {
    const onImported = vi.fn();
    const onStepChange = vi.fn();
    const { container } = render(
      <OgeImportWizard
        fields={FIELDS}
        onImported={onImported}
        onStepChange={onStepChange}
      />,
    );
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [csvFile('Name,Age\nAyşe,34\nBob,old')] },
    });
    await waitFor(() =>
      expect(container.querySelector('.oge-import-mapping')).not.toBeNull(),
    );
    expect(
      (container.querySelectorAll('.oge-import-field')[1] as HTMLSelectElement)
        .value,
    ).toBe('age');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(container.querySelector('.oge-import-summary')?.textContent).toBe(
      '1 of 2 rows ready1 row has problems',
    );
    expect(
      container.querySelector('.oge-import-cell-error')?.getAttribute('title'),
    ).toBe('Age must be a number');
    fireEvent.click(screen.getByLabelText('Show only rows with problems'));
    expect(
      container.querySelectorAll('.oge-import-review tbody tr'),
    ).toHaveLength(1);
    fireEvent.click(screen.getByLabelText('Skip rows with problems'));
    expect(screen.getByRole('button', { name: 'Import 1 row' })).toHaveProperty(
      'disabled',
      true,
    );
    fireEvent.click(screen.getByLabelText('Skip rows with problems'));
    fireEvent.click(screen.getByRole('button', { name: 'Import 1 row' }));
    expect(onImported.mock.calls[0][0].records).toEqual([
      { name: 'Ayşe', age: 34 },
    ]);
    expect(container.querySelector('.oge-import-done')?.textContent).toBe(
      '1 row imported, 1 skipped',
    );
    expect(onStepChange.mock.calls.map((c) => c[0])).toEqual([
      'map',
      'review',
      'done',
    ]);
    fireEvent.click(
      screen.getByRole('button', { name: 'Import another file' }),
    );
    expect(container.querySelector('.oge-import-drop')).not.toBeNull();
  });

  it('remaps by hand, toggles the header row and goes back', async () => {
    const ref = createRef<OgeImportWizardHandle>();
    const { container } = render(<OgeImportWizard ref={ref} fields={FIELDS} />);
    await ref.current!.load(csvFile('Full,Years\nAyşe,34'));
    await waitFor(() =>
      expect(container.querySelector('.oge-import-alert')?.textContent).toBe(
        'Match the required fields: Name',
      ),
    );
    const next = screen.getByRole('button', { name: 'Next' });
    expect(next).toHaveProperty('disabled', true);
    const select = screen.getByRole('combobox', { name: 'Full' });
    fireEvent.change(select, { target: { value: 'name' } });
    expect(next).toHaveProperty('disabled', false);
    fireEvent.change(select, { target: { value: '' } });
    expect(next).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByLabelText('The first row holds column names'));
    expect(screen.getByRole('combobox', { name: 'Column 1' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(container.querySelector('.oge-import-drop')).not.toBeNull();
    ref.current!.reset();
  });

  it('picks a sheet, takes a dropped file and shows the provider text', async () => {
    const ref = createRef<OgeImportWizardHandle>();
    const { container } = render(
      <OgeImportWizardConfigProvider
        config={{ messages: { browse: 'dosya seçin' } }}
      >
        <OgeImportWizard ref={ref} fields={FIELDS} />
      </OgeImportWizardConfigProvider>,
    );
    expect(screen.getByRole('button', { name: 'dosya seçin' })).toBeTruthy();
    const drop = container.querySelector('.oge-import-drop') as HTMLElement;
    fireEvent.dragOver(drop);
    expect(drop.className).toContain('oge-import-drop-active');
    fireEvent.dragLeave(drop);
    expect(drop.className).not.toContain('oge-import-drop-active');
    fireEvent.drop(drop, { dataTransfer: { files: [csvFile('')] } });
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe(
        'The file has no rows to import',
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'dosya seçin' }));
  });

  it('survives StrictMode', async () => {
    const ref = createRef<OgeImportWizardHandle>();
    const { container } = render(
      <StrictMode>
        <OgeImportWizard ref={ref} fields={FIELDS} />
      </StrictMode>,
    );
    await ref.current!.load(csvFile('Name\nA'));
    await waitFor(() =>
      expect(container.querySelector('.oge-import-mapping')).not.toBeNull(),
    );
  });
});
