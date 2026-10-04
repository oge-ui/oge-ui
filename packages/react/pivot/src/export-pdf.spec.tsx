import { render } from '@testing-library/react';
import { createRef } from 'react';
import { exportPivotToPdf } from './export-pdf';
import { OgePivotGrid } from './lib/pivot-grid';
import type { OgePivotGridHandle } from './lib/pivot-types';

const built: Record<string, unknown>[] = [];
const save = vi.fn();
vi.mock('@oge-ui/pivot-engine/export-pdf', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@oge-ui/pivot-engine/export-pdf')>();
  return {
    ...actual,
    buildPivotPdfDocument: vi.fn(
      (...args: Parameters<typeof actual.buildPivotPdfDocument>) => {
        built.push(args[1] as Record<string, unknown>);
        const doc = actual.buildPivotPdfDocument(...args);
        doc.save = save as never;
        return doc;
      },
    ),
  };
});

interface Sale {
  region: string;
  amount: number;
}

describe('@oge-ui/react-pivot/export-pdf', () => {
  it('passes the layout, the captions and the rendered text', async () => {
    const ref = createRef<OgePivotGridHandle<Sale>>();
    render(
      <OgePivotGrid<Sale>
        ref={ref}
        data={[
          { region: 'EU', amount: 10 },
          { region: 'US', amount: 5 },
        ]}
        rowHeaderLayout="outline"
        fields={[
          { dataField: 'region', area: 'row', caption: 'Region' },
          {
            dataField: 'amount',
            area: 'data',
            format: (value) => `$${String(value)}`,
          },
        ]}
      />,
    );
    await exportPivotToPdf(ref.current!, { filename: 'sales.pdf' });
    expect(built[0]['rowHeaderLayout']).toBe('outline');
    expect(built[0]['rowFieldCaptions']).toEqual(['Region']);
    const cellText = built[0]['cellText'] as (
      r: number,
      c: number,
      m: number,
    ) => string;
    expect(cellText(0, 0, 0)).toBe('$10');
    expect(save).toHaveBeenCalledWith('sales.pdf');
  });
});
