import { render } from '@testing-library/react';
import { StrictMode, createRef } from 'react';
import type { PivotResult } from '@oge-ui/core';
import type { OgePivotFieldDef } from '@oge-ui/pivot-engine';
import { OgePivotGrid } from './pivot-grid';
import type { OgePivotGridHandle } from './pivot-types';

interface Sale {
  region: string;
  city: string;
  year: number;
  amount: number;
  cost: number;
}

const SALES: Sale[] = [
  { region: 'EU', city: 'Berlin', year: 2024, amount: 100, cost: 60 },
  { region: 'EU', city: 'Paris', year: 2025, amount: 70, cost: 30 },
  { region: 'US', city: 'NYC', year: 2025, amount: 300, cost: 100 },
  { region: 'Asia', city: 'Tokyo', year: 2025, amount: 20, cost: 15 },
];

const FIELDS: OgePivotFieldDef<Sale>[] = [
  { dataField: 'region', area: 'row', topN: { count: 2, measure: 'amount' } },
  { dataField: 'city', area: 'row' },
  { dataField: 'year', area: 'column' },
  { dataField: 'amount', area: 'data' },
  { dataField: 'cost', area: 'data' },
];

const rowHeaders = (container: HTMLElement) =>
  [...container.querySelectorAll('.oge-pivot-row-header')].map((h) =>
    h.textContent?.replace(/\s+/g, ' ').trim(),
  );

describe('OgePivotGrid (React) analysis features', () => {
  it('Top-N, calculated measures, chart data and onResultChange', () => {
    const ref = createRef<OgePivotGridHandle<Sale>>();
    const results: PivotResult[] = [];
    const { container } = render(
      <StrictMode>
        <OgePivotGrid<Sale>
          ref={ref}
          data={SALES}
          fields={FIELDS}
          fieldPanel={false}
          calculatedFields={[
            {
              name: 'profit',
              caption: 'Profit',
              expression: (v) => (v.amount ?? 0) - (v.cost ?? 0),
              format: (value) => `P${String(value)}`,
            },
          ]}
          onResultChange={(result) => results.push(result)}
        />
      </StrictMode>,
    );
    expect(rowHeaders(container)).toEqual(['EU', 'US', 'Grand Total']);
    expect(container.textContent).toContain('P200');
    const handle = ref.current!;
    expect(handle.getPreparedCell(1, 2, 2).text).toBe('P200');
    expect(
      handle
        .getChartData({ measures: ['profit'] })
        .dataSource.map((p) => p.argument),
    ).toEqual(['EU', 'US']);
    expect(results.length).toBeGreaterThan(0);
  });

  it('tabular / outline row headers and the render props', () => {
    const ref = createRef<OgePivotGridHandle<Sale>>();
    const { container, rerender } = render(
      <OgePivotGrid<Sale>
        ref={ref}
        data={SALES}
        fields={FIELDS}
        fieldPanel={false}
        rowHeaderLayout="tabular"
      />,
    );
    ref.current!.expandAll('row');
    rerender(
      <OgePivotGrid<Sale>
        ref={ref}
        data={SALES}
        fields={FIELDS}
        fieldPanel={false}
        rowHeaderLayout="tabular"
      />,
    );
    expect(
      container
        .querySelector('.oge-pivot-corner')
        ?.textContent?.replace(/\s+/g, ' ')
        .trim(),
    ).toBe('Region City');
    expect(rowHeaders(container)).toContain('EU Berlin');
    expect(ref.current!.getRowHeaderLayout()).toBe('tabular');
    expect(ref.current!.getRowFieldCaptions()).toEqual(['Region', 'City']);

    rerender(
      <OgePivotGrid<Sale>
        ref={ref}
        data={SALES}
        fields={FIELDS}
        fieldPanel={false}
        rowHeaderLayout="outline"
        renderCell={(cell) => (
          <b className="tpl-cell">
            {cell.measureId}={cell.text}
          </b>
        )}
        renderRowHeader={(line, { rowIndex }) => (
          <i className="tpl-row">
            {rowIndex}:{line.text}
          </i>
        )}
        renderColumnHeader={(cell) => <u className="tpl-col">{cell.text}</u>}
      />,
    );
    expect(container.querySelector('.tpl-cell')?.textContent).toBe(
      'amount=100',
    );
    expect(container.querySelector('.tpl-row')?.textContent).toBe('0:EU');
    expect(container.querySelector('.tpl-col')?.textContent).toBe('2024');
  });
});
