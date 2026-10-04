import { Component, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OgePivotField, OgePivotGrid } from '@oge-ui/pivot';
import { exportPivotToPdf } from './index';

const built: { options: Record<string, unknown> }[] = [];
const save = vi.fn();
vi.mock('@oge-ui/pivot-engine/export-pdf', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@oge-ui/pivot-engine/export-pdf')>();
  return {
    ...actual,
    buildPivotPdfDocument: vi.fn(
      (...args: Parameters<typeof actual.buildPivotPdfDocument>) => {
        built.push({ options: args[1] as Record<string, unknown> });
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

@Component({
  imports: [OgePivotGrid, OgePivotField],
  template: `
    <oge-pivot-grid [data]="data" rowHeaderLayout="tabular">
      <oge-pivot-field dataField="region" area="row" caption="Region" />
      <oge-pivot-field dataField="amount" area="data" [format]="money" />
    </oge-pivot-grid>
  `,
})
class Host {
  readonly grid = viewChild.required(OgePivotGrid<Sale>);
  readonly data: Sale[] = [
    { region: 'EU', amount: 10 },
    { region: 'US', amount: 5 },
  ];
  readonly money = (value: unknown) => `$${String(value)}`;
}

describe('@oge-ui/pivot/export-pdf', () => {
  it('passes the grid layout, captions and rendered text to the builder', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    await exportPivotToPdf(fixture.componentInstance.grid(), {
      filename: 'sales.pdf',
    });
    const options = built[0].options;
    expect(options['rowHeaderLayout']).toBe('tabular');
    expect(options['rowFieldCaptions']).toEqual(['Region']);
    const cellText = options['cellText'] as (
      r: number,
      c: number,
      m: number,
    ) => string;
    expect(cellText(0, 0, 0)).toBe('$10');
    expect(save).toHaveBeenCalledWith('sales.pdf');
  });
});
