import { CRITERIA, summarize } from './conformance-data';
import { cellRuns } from './guide-table';

describe('conformance report data', () => {
  it('lists every WCAG 2.2 level A and AA criterion exactly once', () => {
    const ids = CRITERIA.map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
    // 31 level A + 24 level AA (4.1.1 Parsing is obsolete in WCAG 2.2)
    expect(CRITERIA.filter((row) => row.level === 'A')).toHaveLength(31);
    expect(CRITERIA.filter((row) => row.level === 'AA')).toHaveLength(24);
    expect(ids).not.toContain('4.1.1');
  });

  it('keeps the rows in criterion order within each level', () => {
    const key = (id: string) =>
      id.split('.').reduce((sum, part) => sum * 100 + Number(part), 0);
    for (const level of ['A', 'AA'] as const) {
      const keys = CRITERIA.filter((row) => row.level === level).map((row) =>
        key(row.id),
      );
      expect(keys).toEqual([...keys].sort((a, b) => a - b));
    }
  });

  it('gives every row a remark', () => {
    for (const row of CRITERIA) {
      expect(row.remarks.trim().length, row.id).toBeGreaterThan(10);
    }
  });

  it('summarizes per level in report order', () => {
    const summary = summarize(CRITERIA);
    expect(summary.map(([level]) => level)).toEqual([
      'Supports',
      'Partially Supports',
      'Does Not Support',
      'Not Applicable',
    ]);
    expect(summary.reduce((sum, [, count]) => sum + count, 0)).toBe(
      CRITERIA.length,
    );
  });
});

describe('cellRuns', () => {
  it('splits backtick code runs from text', () => {
    expect(cellRuns('Use `pagerInfo` instead')).toEqual([
      { code: false, text: 'Use ' },
      { code: true, text: 'pagerInfo' },
      { code: false, text: ' instead' },
    ]);
    expect(cellRuns('plain')).toEqual([{ code: false, text: 'plain' }]);
  });
});
