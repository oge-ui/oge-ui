import {
  buildGanttDialogItems,
  fitGanttScaleType,
  formatGanttMessage,
  ganttDataRange,
  ganttWindowRange,
  GANTT_OVERSCAN_ROWS,
  sameGanttRange,
  stepGanttScale,
  widenGanttRange,
} from './gantt-view';
import { OGE_DEFAULT_GANTT_MESSAGES } from './gantt-config';
import type { GanttTask } from './engine/gantt-model';

const d = (day: number) => new Date(2026, 0, day);

describe('gantt view helpers', () => {
  it('widens the rendered range and resets on a disjoint dataset', () => {
    const rendered = { min: d(1), max: d(20) };
    expect(widenGanttRange({ min: d(5), max: d(25) }, rendered)).toEqual({
      min: d(1),
      max: d(25),
    });
    // disjoint data re-anchors
    const far = { min: new Date(2027, 0, 1), max: new Date(2027, 0, 9) };
    expect(widenGanttRange(far, rendered)).toBe(far);
    expect(widenGanttRange(far, null)).toBe(far);
    expect(sameGanttRange(null, far)).toBe(false);
    expect(sameGanttRange({ ...far }, far)).toBe(true);
  });

  it('includes today and the baselines in the data range', () => {
    const task = {
      start: d(5),
      end: d(9),
      baselineStart: d(3),
      baselineEnd: d(12),
    } as GanttTask;
    expect(ganttDataRange([task], d(7))).toEqual({ min: d(3), max: d(12) });
    expect(ganttDataRange([], d(7))).toEqual({ min: d(7), max: d(7) });
  });

  it('computes the virtual window with overscan, clamped', () => {
    expect(ganttWindowRange(0, 360, 36, 100)).toEqual({
      first: 0,
      last: 10 + GANTT_OVERSCAN_ROWS,
    });
    expect(ganttWindowRange(3600, 360, 36, 105)).toEqual({
      first: 100 - GANTT_OVERSCAN_ROWS,
      last: 105,
    });
  });

  it('steps and fits the scale', () => {
    expect(stepGanttScale('days', 1)).toBe('weeks');
    expect(stepGanttScale('hours', -1)).toBeNull();
    expect(stepGanttScale('months', 1)).toBeNull();
    const range = { min: d(1), max: d(10) };
    expect(fitGanttScaleType(range, 100_000, 1)).toBe('hours');
    expect(fitGanttScaleType(range, 1, 1)).toBe('months');
  });

  it('formats message templates', () => {
    expect(
      formatGanttMessage('{title} moved to {start}', {
        title: 'Build',
        start: 'Jan 6',
      }),
    ).toBe('Build moved to Jan 6');
  });

  it('builds the default dialog form, with the tag editor only for resources', () => {
    const plain = buildGanttDialogItems(OGE_DEFAULT_GANTT_MESSAGES.dialog, []);
    expect(plain.map((item) => item.field)).toEqual([
      'title',
      'start',
      'end',
      'progress',
      'color',
    ]);
    const rule = plain[2].validationRules?.[0];
    expect(rule?.type).toBe('custom');
    const withPeople = buildGanttDialogItems(
      OGE_DEFAULT_GANTT_MESSAGES.dialog,
      [{ id: 'ada', text: 'Ada' }],
    );
    expect(withPeople.at(-1)?.field).toBe('resourceIds');
    expect(withPeople.at(-1)?.editorType).toBe('tagBox');
  });
});
