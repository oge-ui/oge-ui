import {
  buildPieScene,
  pieAriaLabel,
  pieLabelText,
  pieSelectedAnnouncement,
  pieTooltip,
  pieValueText,
  togglePieSlice,
  type OgePieSceneInput,
} from './pie-model';
import { OGE_DEFAULT_CHARTS_MESSAGES } from './charts-config';

interface Share {
  browser: string;
  share: number;
}

const DATA: Share[] = [
  { browser: 'Chrome', share: 60 },
  { browser: 'Safari', share: 25 },
  { browser: 'Edge', share: 10 },
  { browser: 'Other', share: 5 },
];

const input = (
  overrides: Partial<OgePieSceneInput<Share>> = {},
): OgePieSceneInput<Share> => ({
  dataSource: DATA,
  argumentField: 'browser',
  valueField: 'share',
  type: 'pie',
  innerRadius: 0.5,
  startAngle: 0,
  smallValuesGrouping: null,
  othersLabel: 'Others',
  showLabels: true,
  width: 400,
  height: 300,
  ...overrides,
});

describe('pie model', () => {
  it('builds one slice per positive value with plain and exploded paths', () => {
    const scene = buildPieScene(input());
    expect(scene.slices.map((vm) => vm.label)).toEqual([
      'Chrome',
      'Safari',
      'Edge',
      'Other',
    ]);
    expect(scene.slices[0].path).not.toBe(scene.slices[0].explodedPath);
    expect(scene.geometry.innerR).toBe(0);
    expect(scene.labels).toHaveLength(4);
    expect(pieLabelText(scene, 1)).toBe('Safari');
    expect(pieLabelText(scene, 99)).toBe('');
  });

  it('doughnut holes, zero/NaN values and getters', () => {
    const scene = buildPieScene(
      input({
        type: 'doughnut',
        dataSource: [
          ...DATA,
          { browser: 'Zero', share: 0 },
          { browser: 'Bad', share: Number.NaN },
        ],
        valueField: (item) => item.share,
      }),
    );
    expect(scene.geometry.innerR).toBe(scene.geometry.outerR * 0.5);
    expect(scene.slices).toHaveLength(4);
  });

  it('groups small values into an Others slice carrying the sources', () => {
    const scene = buildPieScene(
      input({
        smallValuesGrouping: { mode: 'topN', topCount: 2 },
        othersLabel: 'Rest',
      }),
    );
    expect(scene.slices.map((vm) => vm.label)).toEqual([
      'Chrome',
      'Safari',
      'Rest',
    ]);
    const others = scene.slices[2].payload;
    expect(others.grouped).toBe(true);
    expect(others.sources.map((row) => row.browser)).toEqual(['Edge', 'Other']);
    expect(others.value).toBe(15);
  });

  it('formats value text, tooltip, aria label and the selection announcement', () => {
    const scene = buildPieScene(input());
    expect(pieValueText(scene.slices[0], 'en-US')).toBe('60 (60%)');
    const tip = pieTooltip(scene, 0, 'en-US');
    expect(tip?.label).toBe('Chrome');
    expect(tip?.valueText).toBe('60 (60%)');
    expect(pieTooltip(scene, null, 'en-US')).toBeNull();
    expect(pieAriaLabel(OGE_DEFAULT_CHARTS_MESSAGES, '', 4)).toBe(
      'Data pie chart with 4 slices',
    );
    expect(
      pieSelectedAnnouncement(
        OGE_DEFAULT_CHARTS_MESSAGES,
        scene.slices[1],
        'en-US',
      ),
    ).toBe('Safari, 25 (25%) selected');
  });

  it('toggles slice selection', () => {
    expect(togglePieSlice([], 1)).toEqual([1]);
    expect(togglePieSlice([1, 2], 1)).toEqual([2]);
  });
});
