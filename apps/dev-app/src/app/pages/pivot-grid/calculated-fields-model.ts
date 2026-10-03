import type {
  OgePivotCalculatedField,
  OgePivotFieldDef,
  OgePivotLabelFilter,
  OgePivotTopNFilter,
  OgePivotValueFilter,
} from '@oge-ui/pivot-engine';
import { money, type Sale } from './pivot-demo-data';

/**
 * The calculated measures and filter presets of the Calculated Fields page,
 * shared by the Angular view and its React mirror.
 */
export const percent = (value: unknown): string =>
  typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : '';

export const signedMoney = (value: unknown): string =>
  typeof value === 'number'
    ? `${value > 0 ? '+' : ''}${money(value)}`
    : String(value ?? '');

export const CALCULATED_FIELDS: readonly OgePivotCalculatedField[] = [
  {
    name: 'avgPrice',
    caption: 'Avg price',
    // evaluated per cell — on totals too, so it stays sum(amount) / sum(units)
    expression: (v) => (v['units'] ? (v['amount'] ?? 0) / v['units'] : null),
    format: money,
  },
  {
    name: 'share',
    caption: '% of total',
    expression: (v) => v['amount'] ?? null,
    displayMode: 'percentOfGrandTotal',
    format: percent,
  },
  {
    name: 'delta',
    caption: 'Δ prev. year',
    expression: (v) => v['amount'] ?? null,
    displayMode: 'absoluteVariation',
    format: signedMoney,
  },
  {
    name: 'running',
    caption: 'Running',
    expression: (v) => v['amount'] ?? null,
    runningTotal: { direction: 'row' },
    format: money,
  },
];

/** The member-filter presets the second demo toggles between. */
export type PivotFilterPreset = 'none' | 'top3' | 'label' | 'value';

export interface PivotFilterPresetDef {
  readonly id: PivotFilterPreset;
  readonly label: string;
  readonly topN?: OgePivotTopNFilter;
  readonly labelFilter?: OgePivotLabelFilter;
  readonly valueFilter?: OgePivotValueFilter;
}

export const FILTER_PRESETS: readonly PivotFilterPresetDef[] = [
  { id: 'none', label: 'No filter' },
  {
    id: 'top3',
    label: 'Top 3 countries by amount',
    topN: { count: 3, measure: 'amount' },
  },
  {
    id: 'label',
    label: 'Country contains “a”',
    labelFilter: { operator: 'contains', value: 'a' },
  },
  {
    id: 'value',
    label: 'Amount > 40 000',
    valueFilter: { measure: 'amount', operator: 'greaterThan', value: 40000 },
  },
];

/** The filter demo's fields with one preset applied to the country field. */
export function filterFields(
  preset: PivotFilterPreset,
): OgePivotFieldDef<Sale>[] {
  const def = FILTER_PRESETS.find((candidate) => candidate.id === preset);
  return [
    { dataField: 'region', area: 'row' },
    {
      dataField: 'country',
      area: 'row',
      topN: def?.topN,
      labelFilter: def?.labelFilter,
      valueFilter: def?.valueFilter,
    },
    {
      dataField: 'date',
      caption: 'Year',
      area: 'column',
      groupInterval: 'year',
    },
    {
      dataField: 'amount',
      caption: 'Amount',
      area: 'data',
      summaryType: 'sum',
      format: money,
    },
  ];
}
