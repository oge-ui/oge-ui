import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import {
  createElement,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  OgePivotGrid,
  type OgePivotCellTemplateContext,
  type OgePivotFieldDef,
  type OgePivotGridHandle,
  type OgePivotRowHeaderLayout,
} from '@oge-ui/react-pivot';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import {
  CALCULATED_FIELDS,
  FILTER_PRESETS,
  filterFields,
  type PivotFilterPreset,
} from '../pivot-grid/calculated-fields-model';
import {
  makeOverviewSales,
  money,
  type Sale,
} from '../pivot-grid/pivot-demo-data';
import { PIVOT_CALCULATED_DEMOS } from './calculated-fields-snippets';

const sales = makeOverviewSales(400);

const CALC_FIELDS: OgePivotFieldDef<Sale>[] = [
  { dataField: 'region', area: 'row' },
  { dataField: 'date', caption: 'Year', area: 'column', groupInterval: 'year' },
  {
    dataField: 'amount',
    caption: 'Amount',
    area: 'data',
    summaryType: 'sum',
    format: money,
  },
  { dataField: 'units', caption: 'Units', area: 'data', summaryType: 'sum' },
];

const LAYOUTS: readonly OgePivotRowHeaderLayout[] = [
  'compact',
  'outline',
  'tabular',
];

const BUTTON = 'oge-tool-btn oge-tool-text-btn';
const ACCENT = 'oge-tool-btn oge-tool-text-btn oge-btn-accent';

const renderCell = (cell: OgePivotCellTemplateContext): ReactNode =>
  createElement(
    'span',
    {
      className:
        cell.measureId === 'delta' && Number(cell.value) < 0
          ? 'oge-demo-negative'
          : undefined,
    },
    cell.text,
  );

/** Card 1: four calculated measures, a render prop and the PDF export. */
function CalculatedDemo(): ReactNode {
  const pivot = useRef<OgePivotGridHandle<Sale>>(null);
  const pdf = async (): Promise<void> => {
    if (!pivot.current) return;
    const { exportPivotToPdf } = await import('@oge-ui/react-pivot/export-pdf');
    await exportPivotToPdf(pivot.current, {
      filename: 'sales.pdf',
      title: 'Sales with calculated measures',
      pageNumbers: true,
    });
  };
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { className: 'mb-2 flex flex-wrap items-center justify-between gap-3' },
      createElement(
        'span',
        { className: 'text-sm text-gray-500 dark:text-gray-400' },
        'Four calculated measures beside Amount and Units; a render prop colours falling years red.',
      ),
      createElement(
        'button',
        {
          type: 'button',
          className: ACCENT,
          'data-testid': 'pivot-export-pdf',
          onClick: () => void pdf(),
        },
        'PDF',
      ),
    ),
    createElement(OgePivotGrid<Sale>, {
      ref: pivot,
      data: sales,
      fields: CALC_FIELDS,
      fieldPanel: false,
      calculatedFields: CALCULATED_FIELDS,
      renderCell,
      style: { maxHeight: '420px' },
    }),
  );
}

/** Card 2: member filter presets and the three row-header layouts. */
function FiltersDemo(): ReactNode {
  const [filter, setFilter] = useState<PivotFilterPreset>('top3');
  const [layout, setLayout] = useState<OgePivotRowHeaderLayout>('tabular');
  const fields = useMemo(() => filterFields(filter), [filter]);
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { className: 'mb-2 flex flex-wrap items-center gap-1.5' },
      ...FILTER_PRESETS.map((preset) =>
        createElement(
          'button',
          {
            key: preset.id,
            type: 'button',
            className: filter === preset.id ? ACCENT : BUTTON,
            'aria-pressed': filter === preset.id,
            onClick: () => setFilter(preset.id),
          },
          preset.label,
        ),
      ),
      createElement(
        'span',
        { className: 'mx-2 text-gray-300', 'aria-hidden': true, key: 'sep' },
        '|',
      ),
      ...LAYOUTS.map((mode) =>
        createElement(
          'button',
          {
            key: mode,
            type: 'button',
            className: layout === mode ? ACCENT : BUTTON,
            'aria-pressed': layout === mode,
            onClick: () => setLayout(mode),
          },
          mode,
        ),
      ),
    ),
    createElement(
      'div',
      { 'data-testid': 'pivot-filters' },
      createElement(OgePivotGrid<Sale>, {
        data: sales,
        fields,
        fieldPanel: false,
        rowHeaderLayout: layout,
        style: { maxHeight: '420px' },
      }),
    ),
  );
}

/**
 * The React half of the calculated-fields page — the same measures, filter
 * presets and layouts as the Angular page.
 */
@Component({
  selector: 'app-react-pivot-calculated-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../../../../packages/react/pivot/src/styles.scss'],
  styles: `
    .oge-demo-negative {
      color: var(--oge-danger);
    }
  `,
  template: `
    <app-demo-card
      [chips]="[
        'ratio of totals',
        '% of total',
        'Δ previous',
        'running',
        'renderCell',
      ]"
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="calculated" />
    </app-demo-card>

    <h3>Member filters &amp; row-header layouts</h3>
    <p>
      <code>topN</code>, <code>labelFilter</code> and
      <code>valueFilter</code> on a row or column field keep whole members
      before aggregation, so totals follow what is shown.
      <code>rowHeaderLayout</code> gives each row field its own label column
      (<code>outline</code>) or repeats the ancestors on every line
      (<code>tabular</code>).
    </p>
    <app-demo-card
      [chips]="[
        'topN',
        'labelFilter',
        'valueFilter',
        'compact / outline / tabular',
      ]"
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="filters" />
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li>
        An <code>expression</code> receives the cell’s measure values keyed by
        measure id (as displayed) plus where it runs; non-finite results become
        an empty cell.
      </li>
      <li>
        <code>renderCell</code>, <code>renderRowHeader</code> and
        <code>renderColumnHeader</code> replace the content only — expanders,
        roles and keyboard navigation stay the grid’s.
      </li>
      <li>
        <code>&#64;oge-ui/react-pivot/export-pdf</code> writes the grid’s own
        cell text, its row-header layout and the field captions.
      </li>
    </ul>
  `,
})
export class ReactPivotCalculatedDemos {
  protected readonly demos = PIVOT_CALCULATED_DEMOS;
  protected readonly calculated = () => createElement(CalculatedDemo);
  protected readonly filters = () => createElement(FiltersDemo);
}
