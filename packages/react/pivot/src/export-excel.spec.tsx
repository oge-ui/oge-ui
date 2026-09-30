import { computePivot, type PivotFieldConfig } from '@oge-ui/core';
import { buildPivotWorkbook, exportPivotToExcel } from './export-excel';
import type { OgePivotGridHandle } from './lib/pivot-types';

const FIELDS: PivotFieldConfig[] = [
  { id: 'region', dataField: 'region', area: 'row', areaIndex: 0 },
  { id: 'amount', dataField: 'amount', area: 'data', summaryType: 'sum' },
];

describe('@oge-ui/react-pivot/export-excel', () => {
  it('re-exports the shared workbook builder', () => {
    const result = computePivot({
      rows: [{ region: 'EU', amount: 5 }],
      fields: FIELDS,
    });
    const sheet = buildPivotWorkbook(result).getWorksheet('Pivot');
    expect(sheet?.getCell(2, 1).value).toBe('EU');
  });

  it('exports the handle’s current result as a download', async () => {
    const result = computePivot({
      rows: [{ region: 'EU', amount: 5 }],
      fields: FIELDS,
    });
    const getResult = vi.fn(() => result);
    const handle = { getResult } as unknown as OgePivotGridHandle;
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    // jsdom has no object URLs
    URL.createObjectURL = vi.fn(() => 'blob:pivot');
    URL.revokeObjectURL = vi.fn();
    await exportPivotToExcel(handle, { filename: 'sales.xlsx' });
    expect(getResult).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:pivot');
    click.mockRestore();
  });
});
