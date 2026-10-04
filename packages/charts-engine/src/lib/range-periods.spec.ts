import {
  buildRangeSelectorData,
  rangeSelectorPeriodRange,
  rangeSelectorPeriods,
} from './range-selector-model';
import { OGE_DEFAULT_CHARTS_MESSAGES } from './charts-config';

const DAYS = Array.from({ length: 400 }, (_, i) => ({
  date: new Date(2025, 0, 1 + i),
  value: i,
}));
const END = new Date(2025, 0, 400).getTime(); // 2026-02-04

const timeData = () =>
  buildRangeSelectorData({
    dataSource: DAYS,
    series: [{ type: 'area', argumentField: 'date', valueField: 'value' }],
  });

describe('range-selector periods', () => {
  it('counts calendar months back from the data end', () => {
    const { bounds, kind } = timeData();
    expect(bounds.max).toBe(END);
    expect(rangeSelectorPeriodRange('1M', kind, bounds)).toEqual({
      min: new Date(2026, 0, 4).getTime(),
      max: END,
    });
    expect(rangeSelectorPeriodRange('YTD', kind, bounds)).toEqual({
      min: new Date(2026, 0, 1).getTime(),
      max: END,
    });
    expect(rangeSelectorPeriodRange('All', kind, bounds)).toBeNull();
    // clamped into the data
    expect(
      rangeSelectorPeriodRange('1Y', kind, { min: END - 1000, max: END }),
    ).toEqual({
      min: END - 1000,
      max: END,
    });
  });

  it('supports custom spans, calendar intervals and fixed windows', () => {
    const { bounds, kind } = timeData();
    expect(
      rangeSelectorPeriodRange(
        { label: '2W', range: { weeks: 2 } },
        kind,
        bounds,
      ),
    ).toEqual({ min: new Date(2026, 0, 21).getTime(), max: END });
    expect(
      rangeSelectorPeriodRange(
        { label: 'span', range: 86_400_000 },
        kind,
        bounds,
      ),
    ).toEqual({ min: END - 86_400_000, max: END });
    expect(
      rangeSelectorPeriodRange(
        {
          label: 'fixed',
          range: { min: bounds.min + 10, max: bounds.min + 20 },
        },
        kind,
        bounds,
      ),
    ).toEqual({ min: bounds.min + 10, max: bounds.min + 20 });
  });

  it('drops calendar periods on a linear axis', () => {
    expect(
      rangeSelectorPeriodRange('3M', 'linear', { min: 0, max: 10 }),
    ).toBeUndefined();
    expect(
      rangeSelectorPeriodRange({ label: 'x', range: { days: 1 } }, 'linear', {
        min: 0,
        max: 10,
      }),
    ).toBeUndefined();
    expect(
      rangeSelectorPeriodRange({ label: 'x', range: 4 }, 'linear', {
        min: 0,
        max: 10,
      }),
    ).toEqual({
      min: 6,
      max: 10,
    });
  });

  it('builds the buttons with texts, names and the pressed one', () => {
    const data = timeData();
    const oneMonth = rangeSelectorPeriodRange('1M', data.kind, data.bounds);
    const buttons = rangeSelectorPeriods(
      ['1M', 'YTD', 'All', { label: 'Q', range: { months: 3 } }],
      data,
      oneMonth ?? null,
      OGE_DEFAULT_CHARTS_MESSAGES,
    );
    expect(
      buttons.map((button) => [
        button.key,
        button.text,
        button.label,
        button.active,
      ]),
    ).toEqual([
      ['1M', '1M', '1 month', true],
      ['YTD', 'YTD', 'Year to date', false],
      ['All', 'All', 'All data', false],
      ['custom-3', 'Q', 'Q', false],
    ]);
    const all = rangeSelectorPeriods(
      ['All'],
      data,
      null,
      OGE_DEFAULT_CHARTS_MESSAGES,
    );
    expect(all[0].active).toBe(true);
  });
});
