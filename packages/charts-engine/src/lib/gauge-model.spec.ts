import { OGE_DEFAULT_CHARTS_MESSAGES } from './charts-config';
import {
  GAUGE_BAR_LENGTH,
  buildCircularGaugeScene,
  buildLinearGaugeScene,
  gaugeArcBounds,
  gaugeArcPath,
  gaugeBarDash,
  resolveGaugeScale,
} from './gauge-model';

const messages = OGE_DEFAULT_CHARTS_MESSAGES;

describe('resolveGaugeScale', () => {
  it('defaults to 0..100 with 1-2-5 major steps and fifth minors', () => {
    const scale = resolveGaugeScale(undefined, 'en-US');
    expect(scale.min).toBe(0);
    expect(scale.max).toBe(100);
    expect(scale.major).toEqual([0, 20, 40, 60, 80, 100]);
    expect(scale.minor).toHaveLength(20);
    expect(scale.minor).not.toContain(20);
  });

  it('honours explicit intervals and a label format', () => {
    const scale = resolveGaugeScale(
      {
        min: 0,
        max: 1,
        tickInterval: 0.25,
        minorTickInterval: 0,
        labelFormat: (v) => `${v * 100}%`,
      },
      'en-US',
    );
    expect(scale.major).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(scale.minor).toEqual([]);
    expect(scale.label(0.5)).toBe('50%');
  });

  it('repairs an empty domain', () => {
    expect(resolveGaugeScale({ min: 5, max: 5 }, 'en-US').max).toBe(6);
  });
});

describe('gauge geometry helpers', () => {
  it('gaugeBarDash draws from..to over a 1000-unit path, always four entries', () => {
    expect(gaugeBarDash(0, 0.5)).toBe(`0 0 500 ${GAUGE_BAR_LENGTH}`);
    expect(gaugeBarDash(0.5, 0.25)).toBe(`0 250 250 ${GAUGE_BAR_LENGTH}`);
  });

  it('gaugeArcPath uses the large-arc flag past 180°', () => {
    expect(gaugeArcPath(0, 0, 10, -120, 120)).toContain(' 0 1 1 ');
    expect(gaugeArcPath(0, 0, 10, -90, 0)).toContain(' 0 0 1 ');
    expect(gaugeArcPath(0, 0, 10, 0, 0)).toBe('');
  });

  it('gaugeArcBounds of a half gauge covers the top half only', () => {
    const bounds = gaugeArcBounds(-90, 90);
    expect(bounds.minX).toBeCloseTo(-1);
    expect(bounds.maxX).toBeCloseTo(1);
    expect(bounds.minY).toBeCloseTo(-1);
    expect(bounds.maxY).toBeCloseTo(0);
  });
});

describe('buildCircularGaugeScene', () => {
  const base = { width: 300, height: 300, locale: 'en-US', messages } as const;

  it('maps the value to the needle angle and the meter semantics', () => {
    const scene = buildCircularGaugeScene({
      ...base,
      value: 50,
      title: 'Speed',
    });
    expect(scene.startAngle).toBe(-120);
    expect(scene.endAngle).toBe(120);
    expect(scene.indicatorAngle).toBe(0);
    expect(scene.aria).toEqual({
      label: 'Speed gauge',
      valueNow: 50,
      valueMin: 0,
      valueMax: 100,
      valueText: '50',
    });
    expect(scene.valueText?.text).toBe('50');
    expect(scene.labels.map((l) => l.text)).toEqual([
      '0',
      '20',
      '40',
      '60',
      '80',
      '100',
    ]);
  });

  it('clamps the drawn indicator but speaks the real value', () => {
    const scene = buildCircularGaugeScene({ ...base, value: 140 });
    expect(scene.indicatorAngle).toBe(120);
    expect(scene.aria.valueNow).toBe(100);
    expect(scene.aria.valueText).toBe('140');
  });

  it('draws the first-render sweep from displayValue, not value', () => {
    const scene = buildCircularGaugeScene({
      ...base,
      value: 80,
      displayValue: 0,
      indicator: 'bar',
    });
    expect(scene.indicatorAngle).toBe(-120);
    expect(scene.barDash).toBe(`0 0 0 ${GAUGE_BAR_LENGTH}`);
    expect(scene.aria.valueNow).toBe(80);
  });

  it('the bar runs from barBase to the value', () => {
    const scene = buildCircularGaugeScene({
      ...base,
      value: 25,
      barBase: 50,
      indicator: 'bar',
      scale: { min: 0, max: 100 },
    });
    expect(scene.barDash).toBe(`0 250 250 ${GAUGE_BAR_LENGTH}`);
  });

  it('adds the labelled range to aria-valuetext and lists ranges in the sr table', () => {
    const scene = buildCircularGaugeScene({
      ...base,
      value: 85,
      ranges: [
        { start: 0, end: 60, label: 'Normal' },
        { start: 60, end: 90, label: 'Warning' },
        { start: 90, end: 100 },
      ],
    });
    expect(scene.aria.valueText).toBe('85, Warning');
    expect(scene.ranges).toHaveLength(3);
    expect(scene.ranges[0].color).toBe('var(--oge-success)');
    expect(scene.ranges[2].label).toBe('90 – 100');
    expect(scene.srRows.map((row) => row.header)).toEqual([
      'Value',
      'Min',
      'Max',
      'Normal',
      'Warning',
      '90 – 100',
    ]);
  });

  it('a null value draws no indicator and says so', () => {
    const scene = buildCircularGaugeScene({ ...base, value: null });
    expect(scene.indicatorAngle).toBeNull();
    expect(scene.valueText).toBeNull();
    expect(scene.aria.valueNow).toBe(0);
    expect(scene.aria.valueText).toBe('no data');
  });

  it('a half gauge uses a larger radius in a wide box', () => {
    const half = buildCircularGaugeScene({
      ...base,
      width: 400,
      height: 220,
      value: 1,
      startAngle: -90,
      endAngle: 90,
    });
    const full = buildCircularGaugeScene({
      ...base,
      width: 400,
      height: 220,
      value: 1,
    });
    expect(half.radius).toBeGreaterThan(full.radius);
    expect(half.cy).toBeGreaterThan(110);
  });

  it('places subvalue markers and swaps reversed angles', () => {
    const scene = buildCircularGaugeScene({
      ...base,
      value: 10,
      subvalues: [0, 100],
      startAngle: 90,
      endAngle: -90,
    });
    expect(scene.startAngle).toBe(-90);
    expect(scene.subvalueAngles).toEqual([-90, 90]);
  });

  it('a full circle does not draw the maximum label over the minimum', () => {
    const scene = buildCircularGaugeScene({
      ...base,
      value: 1,
      startAngle: 0,
      endAngle: 360,
    });
    expect(scene.labels.map((l) => l.text)).not.toContain('100');
  });
});

describe('buildLinearGaugeScene', () => {
  const base = { width: 400, height: 100, locale: 'en-US', messages } as const;

  it('horizontal: the bar dash follows the value from the base', () => {
    const scene = buildLinearGaugeScene({ ...base, value: 25 });
    expect(scene.barDash).toBe(`0 0 250 ${GAUGE_BAR_LENGTH}`);
    expect(scene.track.x1).toBeLessThan(scene.track.x2);
    expect(scene.track.y1).toBe(scene.track.y2);
    expect(scene.aria.valueNow).toBe(25);
  });

  it('RTL mirrors a horizontal gauge', () => {
    const ltr = buildLinearGaugeScene({ ...base, value: 25 });
    const rtl = buildLinearGaugeScene({ ...base, value: 25, rtl: true });
    expect(rtl.track.x1).toBeGreaterThan(rtl.track.x2);
    expect(rtl.labels[0].x).toBeCloseTo(400 - ltr.labels[0].x, 0);
  });

  it('vertical: the minimum sits at the bottom', () => {
    const scene = buildLinearGaugeScene({
      ...base,
      width: 120,
      height: 300,
      value: 40,
      orientation: 'vertical',
    });
    expect(scene.track.x1).toBe(scene.track.x2);
    expect(scene.track.y1).toBeGreaterThan(scene.track.y2);
    const zero = scene.labels.find((label) => label.value === 0);
    const hundred = scene.labels.find((label) => label.value === 100);
    expect((zero?.y ?? 0) > (hundred?.y ?? 0)).toBe(true);
  });

  it('marker: translates from the minimum to the value', () => {
    const scene = buildLinearGaugeScene({
      ...base,
      value: 0,
      indicator: 'marker',
    });
    expect(scene.markerOffset).toBe('translate(0px, 0px)');
    const moved = buildLinearGaugeScene({
      ...base,
      value: 100,
      indicator: 'marker',
    });
    expect(moved.markerOffset).toMatch(/^translate\(\d+(\.\d+)?px, 0px\)$/);
  });

  it('ranges become bands beside the track', () => {
    const scene = buildLinearGaugeScene({
      ...base,
      value: 10,
      ranges: [{ start: 0, end: 50, color: 'red' }],
    });
    expect(scene.ranges[0].color).toBe('red');
    expect(scene.ranges[0].path).toMatch(/^M [\d.]+ [\d.]+ H/);
  });
});
