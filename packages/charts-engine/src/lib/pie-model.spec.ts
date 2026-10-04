import {
  buildPieScene,
  pieAriaLabel,
  pieLabelText,
  pieSelectedAnnouncement,
  pieSrTable,
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

  it('per-slice colour: colorField, customizePoint and the description', () => {
    const scene = buildPieScene(
      input({
        colorField: (item) => (item.browser === 'Edge' ? '#0078d4' : ''),
        customizePoint: (info) =>
          info.argument === 'Other' ? { color: '#999999', description: 'misc' } : undefined,
      }),
    );
    expect(scene.slices[2].color).toBe('#0078d4');
    expect(scene.slices[3].color).toBe('#999999');
    expect(scene.legendItems[3]).toMatchObject({ name: 'Other', color: '#999999' });
    expect(pieValueText(scene.slices[3], 'en-US')).toBe('5 (5%), misc');
  });

  it('labels: outside with or without connectors, inside with contrast, format', () => {
    const outside = buildPieScene(input({ label: { connector: false } }));
    expect(outside.labelVms).toHaveLength(4);
    expect(outside.labelVms.every((label) => label.connector === null)).toBe(true);
    const inside = buildPieScene(
      input({
        label: {
          visible: true,
          position: 'inside',
          format: (info) =>
            `${Math.round((info.percent ?? 0) * 100)}%`,
        },
      }),
    );
    const first = inside.labelVms.find((label) => label.pointIndex === 0);
    expect(first?.text).toBe('60%');
    expect(first?.inside).toBe(true);
    expect(first?.textColor).toBe('#ffffff');
    // inside labels leave room: no outside label column
    expect(inside.geometry.outerR).toBeGreaterThan(outside.geometry.outerR);
    const hidden = buildPieScene(input({ showLabels: false }));
    expect(hidden.labelVms).toHaveLength(0);
  });

  it('nested doughnut: rings share colours per argument; sr table per ring', () => {
    const scene = buildPieScene(
      input({
        type: 'doughnut',
        series: [
          { name: '2025', valueField: 'share' },
          {
            name: '2026',
            dataSource: [
              { browser: 'Safari', share: 30 },
              { browser: 'Chrome', share: 70 },
            ],
          },
        ],
      }),
    );
    expect(scene.ringed).toBe(true);
    expect(scene.rings).toHaveLength(2);
    expect(scene.rings[0].outerR).toBeLessThanOrEqual(scene.rings[1].innerR);
    expect(scene.slices).toHaveLength(6);
    const chrome = scene.slices.filter((vm) => vm.label === 'Chrome');
    expect(chrome.map((vm) => vm.ringIndex)).toEqual([0, 1]);
    expect(chrome[0].color).toBe(chrome[1].color);
    expect(chrome[1].payload).toMatchObject({ ringIndex: 1, ringName: '2026' });
    expect(new Set(scene.slices.map((vm) => vm.key)).size).toBe(6);
    expect(scene.legendItems.map((item) => item.name)).toEqual([
      'Chrome',
      'Safari',
      'Edge',
      'Other',
    ]);
    const table = pieSrTable(scene, 'en-US');
    expect(table.headers).toEqual(['2025', '2026']);
    expect(table.rows[0]).toEqual({
      argText: 'Chrome',
      cells: ['60 (60%)', '70 (70%)'],
    });
    expect(table.rows[2].cells[1]).toBe('');
    const tip = pieTooltip(scene, chrome[1].key, 'en-US');
    expect(tip?.valueText).toBe('2026: 70 (70%)');
    expect(pieSrTable(buildPieScene(input()), 'en-US').headers).toBeNull();
  });
});
