import {
  buildPieSlices,
  groupSmallValues,
  layoutPieLabels,
  pieSliceAt,
  sliceArcPath,
} from './pie-layout';

describe('groupSmallValues', () => {
  const values = [50, 5, 30, 3, 12];

  it('null grouping passes values through', () => {
    const grouped = groupSmallValues(values, null);
    expect(grouped).toHaveLength(5);
    expect(grouped.every((entry) => !entry.grouped)).toBe(true);
  });

  it('topN keeps the N largest and merges the rest', () => {
    const grouped = groupSmallValues(values, { mode: 'topN', topCount: 2 });
    expect(grouped.map((entry) => entry.value)).toEqual([50, 30, 20]);
    expect(grouped[2].grouped).toBe(true);
    expect(grouped[2].sourceIndexes).toEqual([1, 3, 4]);
  });

  it('threshold merges values below it', () => {
    const grouped = groupSmallValues(values, {
      mode: 'smallValueThreshold',
      threshold: 10,
    });
    expect(grouped.map((entry) => entry.value)).toEqual([50, 30, 12, 8]);
  });
});

describe('buildPieSlices', () => {
  it('fractions sum to one, angles chain', () => {
    const slices = buildPieSlices(groupSmallValues([1, 1, 2], null));
    expect(slices[0].fraction).toBeCloseTo(0.25);
    expect(slices[2].fraction).toBeCloseTo(0.5);
    expect(slices[0].endAngle).toBeCloseTo(slices[1].startAngle);
    expect(slices[2].endAngle).toBeCloseTo(Math.PI * 2);
  });

  it('honors the start angle and clamps negatives', () => {
    const slices = buildPieSlices(groupSmallValues([3, -1, 1], null), Math.PI);
    expect(slices[0].startAngle).toBe(Math.PI);
    expect(slices[1].fraction).toBe(0); // negative clamped
  });
});

describe('sliceArcPath', () => {
  it('pie wedges start at the center, donuts at the inner radius', () => {
    const wedge = sliceArcPath(100, 100, 50, 0, 0, Math.PI / 2);
    expect(wedge.startsWith('M 100 100 L ')).toBe(true);
    expect(wedge.endsWith('Z')).toBe(true);
    const donut = sliceArcPath(100, 100, 50, 20, 0, Math.PI / 2);
    expect(donut.startsWith('M 100 80 L 100 50 A')).toBe(true);
  });

  it('a full circle renders as two arcs, empty sweep as nothing', () => {
    expect(sliceArcPath(0, 0, 10, 0, 0, Math.PI * 2)).toContain('A 10 10 0 1 1');
    expect(sliceArcPath(0, 0, 10, 0, 1, 1)).toBe('');
  });
});

describe('pieSliceAt', () => {
  it('finds the slice under an angle', () => {
    const slices = buildPieSlices(groupSmallValues([1, 1], null));
    expect(pieSliceAt(Math.PI / 2, slices)?.index).toBe(0);
    expect(pieSliceAt(Math.PI * 1.5, slices)?.index).toBe(1);
  });
});

describe('layoutPieLabels', () => {
  it('splits sides and stacks overlapping labels apart', () => {
    // many thin slices near 3 o'clock would overlap without stacking
    const slices = buildPieSlices(
      groupSmallValues([1, 1, 1, 1, 60], null),
      Math.PI * 0.45,
    );
    const labels = layoutPieLabels(slices, 100, 100, 50, 16);
    const right = labels.filter((label) => label.side === 'end');
    for (let i = 1; i < right.length; i++) {
      expect(right[i].labelY - right[i - 1].labelY).toBeGreaterThanOrEqual(16);
    }
    expect(labels).toHaveLength(5);
  });
});
