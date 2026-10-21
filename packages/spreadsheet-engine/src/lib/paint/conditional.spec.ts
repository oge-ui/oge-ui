import { createOgeWorkbook, type OgeWorkbook } from '../model/workbook';
import { ogeCellError } from '../model/cell';
import type { OgeConditionalRule } from '../model/sheet-features';
import {
  OgeConditionalFormatter,
  ogeConditionalConstant,
  ogeConditionalRuleSupported,
} from './conditional';
import { OgeStyleResolver } from './resolve-style';

const RED = { font: { color: { rgb: 'FFFF0000' } } };
const BOLD = { font: { bold: true } };

/** A1:A`n` holding `values`, one rule set over them. */
function setup(
  values: unknown[],
  rules: Partial<OgeConditionalRule>[],
  now?: Date,
): { workbook: OgeWorkbook; formatter: OgeConditionalFormatter } {
  const workbook = createOgeWorkbook();
  workbook.dxfs = [RED, BOLD];
  const sheet = workbook.sheets[0];
  values.forEach((value, row) => {
    if (value !== undefined) sheet.setCell(row, 0, { value: value as never });
  });
  sheet.conditionalFormats.push({
    ranges: [{ top: 0, left: 0, bottom: values.length - 1, right: 0 }],
    rules: rules.map(
      (rule, i) =>
        ({
          type: 'cellIs',
          priority: i + 1,
          formulas: [],
          dxf: 0,
          ...rule,
        }) as OgeConditionalRule,
    ),
  });
  const resolver = new OgeStyleResolver(workbook);
  return {
    workbook,
    formatter: new OgeConditionalFormatter(workbook, sheet, resolver, { now }),
  };
}

const hits = (built: ReturnType<typeof setup>, count: number) =>
  Array.from({ length: count }, (_, row) => {
    const paint = built.formatter.paint(
      row,
      0,
      built.workbook.sheets[0].getCell(row, 0),
    );
    return paint?.style?.font.color === '#FF0000';
  });

describe('ogeConditionalConstant', () => {
  it('reads numbers, strings and booleans; nothing else', () => {
    expect(ogeConditionalConstant('-1.5e2')).toBe(-150);
    expect(ogeConditionalConstant('"a ""b"""')).toBe('a "b"');
    expect(ogeConditionalConstant('true')).toBe(true);
    expect(ogeConditionalConstant('FALSE')).toBe(false);
    expect(ogeConditionalConstant('$B$1')).toBeUndefined();
    expect(ogeConditionalConstant('A1*2')).toBeUndefined();
  });

  it('knows which rules need the formula engine', () => {
    expect(
      ogeConditionalRuleSupported({
        type: 'expression',
        priority: 1,
        formulas: ['TRUE'],
      }),
    ).toBe(false);
    expect(
      ogeConditionalRuleSupported({
        type: 'cellIs',
        priority: 1,
        formulas: ['$B$1'],
      }),
    ).toBe(false);
    expect(
      ogeConditionalRuleSupported({
        type: 'cellIs',
        priority: 1,
        formulas: [],
      }),
    ).toBe(false);
    expect(
      ogeConditionalRuleSupported({ type: 'top10', priority: 1, formulas: [] }),
    ).toBe(true);
    expect(
      ogeConditionalRuleSupported({
        type: 'colorScale',
        priority: 1,
        formulas: [],
        colorScale: {
          values: [{ type: 'formula', value: 'A1' }, { type: 'max' }],
          colors: [],
        },
      }),
    ).toBe(false);
  });
});

describe('OgeConditionalFormatter', () => {
  it('compares with constants by every operator', () => {
    const values = [1, 5, 10, 'abc', undefined];
    const run = (operator: string, ...formulas: string[]) =>
      hits(setup(values, [{ operator, formulas }]), 5);
    expect(run('greaterThan', '5')).toEqual([false, false, true, true, false]);
    expect(run('greaterThanOrEqual', '5')).toEqual([
      false,
      true,
      true,
      true,
      false,
    ]);
    expect(run('lessThan', '5')).toEqual([true, false, false, false, true]);
    expect(run('lessThanOrEqual', '5')).toEqual([
      true,
      true,
      false,
      false,
      true,
    ]);
    expect(run('equal', '"ABC"')).toEqual([false, false, false, true, false]);
    expect(run('notEqual', '10')).toEqual([true, true, false, true, true]);
    expect(run('between', '10', '2')).toEqual([
      false,
      true,
      true,
      false,
      false,
    ]);
    expect(run('notBetween', '2', '10')).toEqual([
      true,
      false,
      false,
      true,
      true,
    ]);
    expect(run('bogus', '1')).toEqual([false, false, false, false, false]);
  });

  it('tests text, blanks and errors', () => {
    const values = [
      'Apple pie',
      'banana',
      ' ',
      ogeCellError('#N/A'),
      42,
      undefined,
    ];
    const run = (rule: Partial<OgeConditionalRule>) =>
      hits(setup(values, [rule]), 6);
    expect(run({ type: 'containsText', text: 'APPLE' })).toEqual([
      true,
      false,
      false,
      false,
      false,
      false,
    ]);
    // an error contains no text (SEARCH on it is an error): only "does not contain" matches
    expect(run({ type: 'notContainsText', text: 'a' })).toEqual([
      false,
      false,
      true,
      true,
      true,
      true,
    ]);
    expect(run({ type: 'containsText', text: 'N' })).toEqual([
      false,
      true,
      false,
      false,
      false,
      false,
    ]);
    expect(run({ type: 'beginsWith', text: 'ban' })).toEqual([
      false,
      true,
      false,
      false,
      false,
      false,
    ]);
    expect(run({ type: 'endsWith', text: 'PIE' })).toEqual([
      true,
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(run({ type: 'containsBlanks' })).toEqual([
      false,
      false,
      true,
      false,
      false,
      true,
    ]);
    expect(run({ type: 'notContainsBlanks' })).toEqual([
      true,
      true,
      false,
      true,
      true,
      false,
    ]);
    expect(run({ type: 'containsErrors' })).toEqual([
      false,
      false,
      false,
      true,
      false,
      false,
    ]);
    expect(run({ type: 'notContainsErrors' })).toEqual([
      true,
      true,
      true,
      false,
      true,
      true,
    ]);
  });

  it('finds duplicates, unique values, top/bottom and averages', () => {
    const values = [3, 7, 3, 'A', 'a', 10, 1];
    const run = (rule: Partial<OgeConditionalRule>) =>
      hits(setup(values, [rule]), 7);
    expect(run({ type: 'duplicateValues' })).toEqual([
      true,
      false,
      true,
      true,
      true,
      false,
      false,
    ]);
    expect(run({ type: 'uniqueValues' })).toEqual([
      false,
      true,
      false,
      false,
      false,
      true,
      true,
    ]);
    expect(run({ type: 'top10', rank: 2 })).toEqual([
      false,
      true,
      false,
      false,
      false,
      true,
      false,
    ]);
    // ties share a rank: both 3s are in the bottom two
    expect(run({ type: 'top10', rank: 2, bottom: true })).toEqual([
      true,
      false,
      true,
      false,
      false,
      false,
      true,
    ]);
    expect(run({ type: 'top10', rank: 40, percent: true })).toEqual([
      false,
      true,
      false,
      false,
      false,
      true,
      false,
    ]);
    // mean of 3, 7, 3, 10, 1 is 4.8
    expect(run({ type: 'aboveAverage' })).toEqual([
      false,
      true,
      false,
      false,
      false,
      true,
      false,
    ]);
    expect(run({ type: 'aboveAverage', aboveAverage: false })).toEqual([
      true,
      false,
      true,
      false,
      false,
      false,
      true,
    ]);
    expect(run({ type: 'aboveAverage', stdDev: 1 })).toEqual([
      false,
      false,
      false,
      false,
      false,
      true,
      false,
    ]);
    expect(
      run({
        type: 'aboveAverage',
        aboveAverage: false,
        equalAverage: true,
        stdDev: 1,
      }),
    ).toEqual([false, false, false, false, false, false, true]);
  });

  it('matches dates in a period around today', () => {
    // 2024-01-10, a Wednesday (serial 45301)
    const now = new Date(2024, 0, 10, 12);
    const values = [
      45301, 45300, 45302, 45295, 45298, 45305, 45291, 45330, 45280,
    ];
    const run = (timePeriod: string) =>
      hits(
        setup(values, [{ type: 'timePeriod', timePeriod }], now),
        values.length,
      );
    expect(run('today')).toEqual([
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(run('yesterday')).toEqual([
      false,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(run('tomorrow')).toEqual([
      false,
      false,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(run('last7Days')).toEqual([
      true,
      true,
      false,
      true,
      true,
      false,
      false,
      false,
      false,
    ]);
    expect(run('thisWeek')).toEqual([
      true,
      true,
      true,
      false,
      true,
      false,
      false,
      false,
      false,
    ]);
    expect(run('lastWeek')).toEqual([
      false,
      false,
      false,
      true,
      false,
      false,
      true,
      false,
      false,
    ]);
    expect(run('nextWeek')).toEqual([
      false,
      false,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
    ]);
    expect(run('thisMonth')).toEqual([
      true,
      true,
      true,
      true,
      true,
      true,
      false,
      false,
      false,
    ]);
    expect(run('nextMonth')).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
      false,
    ]);
    expect(run('lastMonth')).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      true,
      false,
      true,
    ]);
    expect(run('someday')).toEqual(values.map(() => false));
  });

  it('applies rules in priority order and stops when asked', () => {
    const s = setup(
      [10],
      [
        {
          type: 'cellIs',
          operator: 'greaterThan',
          formulas: ['5'],
          dxf: 1,
          priority: 2,
        },
        {
          type: 'cellIs',
          operator: 'greaterThan',
          formulas: ['1'],
          dxf: 0,
          priority: 1,
        },
      ],
    );
    const style = s.formatter.paint(
      0,
      0,
      s.workbook.sheets[0].getCell(0, 0),
    )?.style;
    expect(style?.font).toMatchObject({ bold: true, color: '#FF0000' });
    const stopped = setup(
      [10],
      [
        {
          type: 'cellIs',
          operator: 'greaterThan',
          formulas: ['1'],
          dxf: 0,
          priority: 1,
          stopIfTrue: true,
        },
        {
          type: 'cellIs',
          operator: 'greaterThan',
          formulas: ['5'],
          dxf: 1,
          priority: 2,
        },
      ],
    );
    expect(
      stopped.formatter.paint(0, 0, stopped.workbook.sheets[0].getCell(0, 0))
        ?.style?.font.bold,
    ).toBe(false);
    // outside every range: nothing
    expect(s.formatter.paint(5, 5, undefined)).toBeUndefined();
    expect(s.formatter.active).toBe(true);
  });

  it('draws colour scales, data bars and icons', () => {
    const values = [0, 50, 100, 'text'];
    const s = setup(values, [
      {
        type: 'colorScale',
        colorScale: {
          values: [{ type: 'min' }, { type: 'max' }],
          colors: [{ rgb: 'FF000000' }, { rgb: 'FFFFFFFF' }],
        },
      },
      {
        type: 'dataBar',
        dataBar: {
          min: { type: 'num', value: '0' },
          max: { type: 'percent', value: '100' },
          color: { rgb: 'FF638EC6' },
          showValue: false,
          minLength: 10,
          maxLength: 90,
        },
      },
      {
        type: 'iconSet',
        iconSet: {
          iconSet: '3Flags',
          values: [
            { type: 'percent', value: '0' },
            { type: 'percentile', value: '50', greaterThan: true },
            { type: 'num', value: '100' },
          ],
          reverse: true,
          showValue: false,
        },
      },
    ]);
    const paint = (row: number) =>
      s.formatter.paint(row, 0, s.workbook.sheets[0].getCell(row, 0));
    expect(paint(0)?.fill?.color).toBe('#000000');
    expect(paint(1)?.fill?.color).toBe('#7F7F7F');
    expect(paint(2)?.fill?.color).toBe('#FFFFFF');
    expect(paint(0)?.dataBar).toEqual({
      from: 0,
      to: 0.1,
      color: '#638EC6',
      negative: false,
      showValue: false,
    });
    expect(paint(2)?.dataBar?.to).toBeCloseTo(0.9);
    expect(paint(0)?.icon).toEqual({
      set: '3Flags',
      index: 2,
      showValue: false,
    });
    expect(paint(1)?.icon?.index).toBe(2);
    expect(paint(2)?.icon?.index).toBe(0);
    expect(paint(3)).toBeUndefined();
  });
});

describe('OgeConditionalFormatter — scales and bars at their edges', () => {
  it('blends three-colour scales and clamps values beyond the ends', () => {
    const s = setup(
      [0, 25, 50, 75, 100],
      [
        {
          type: 'colorScale',
          colorScale: {
            values: [
              { type: 'num', value: '0' },
              { type: 'percent', value: '50' },
              { type: 'num', value: '100' },
            ],
            colors: [
              { rgb: 'FF000000' },
              { rgb: 'FFFF0000' },
              { rgb: 'FFFFFFFF' },
            ],
          },
        },
      ],
    );
    const color = (row: number) =>
      s.formatter.paint(row, 0, s.workbook.sheets[0].getCell(row, 0))?.fill
        ?.color;
    expect([0, 1, 2, 3, 4].map(color)).toEqual([
      '#000000',
      '#7F0000',
      '#FF0000',
      '#FF7F7F',
      '#FFFFFF',
    ]);
  });

  it('gives every bar full length when all values are equal, and compares booleans', () => {
    const s = setup(
      [5, 5],
      [
        {
          type: 'dataBar',
          dataBar: {
            min: { type: 'min' },
            max: { type: 'max' },
            color: { rgb: 'FF638EC6' },
            showValue: true,
            minLength: 0,
            maxLength: 100,
          },
        },
      ],
    );
    expect(
      s.formatter.paint(0, 0, s.workbook.sheets[0].getCell(0, 0))?.dataBar?.to,
    ).toBe(1);
    const b = setup(
      [true, false, 1],
      [{ operator: 'equal', formulas: ['TRUE'] }],
    );
    expect(hits(b, 3)).toEqual([true, false, false]);
    const neg = setup(
      [-5],
      [
        {
          type: 'dataBar',
          dataBar: {
            min: { type: 'num', value: '-10' },
            max: { type: 'num', value: '10' },
            color: { theme: 4 },
            showValue: true,
            minLength: 10,
            maxLength: 90,
          },
        },
      ],
    );
    expect(
      neg.formatter.paint(0, 0, neg.workbook.sheets[0].getCell(0, 0))?.dataBar,
    ).toMatchObject({ negative: true, color: '#4472C4' });
  });
});
