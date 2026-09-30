import {
  OGE_DEFAULT_CHARTS_CONFIG,
  OGE_DEFAULT_CHARTS_MESSAGES,
  formatOgeChartMessage,
  mergeOgeChartsMessages,
  resolveOgeChartsConfig,
} from './charts-config';

describe('charts config', () => {
  it('resolves over the defaults, messages one level deep', () => {
    const config = resolveOgeChartsConfig({
      locale: 'de',
      messages: { noData: 'Keine Daten' },
    });
    expect(config.locale).toBe('de');
    expect(config.a11yTableLimit).toBe(50);
    expect(config.messages.noData).toBe('Keine Daten');
    expect(config.messages.aria).toBe(OGE_DEFAULT_CHARTS_MESSAGES.aria);
    expect(resolveOgeChartsConfig(undefined)).toEqual(
      OGE_DEFAULT_CHARTS_CONFIG,
    );
  });

  it('a nested provider resolves over its parent', () => {
    const outer = resolveOgeChartsConfig({ locale: 'de', markerThreshold: 10 });
    const inner = resolveOgeChartsConfig({ a11yTableLimit: 5 }, outer);
    expect(inner).toMatchObject({
      locale: 'de',
      markerThreshold: 10,
      a11yTableLimit: 5,
    });
  });

  it('merges per-instance messages key by key inside aria/announcements', () => {
    const merged = mergeOgeChartsMessages(OGE_DEFAULT_CHARTS_MESSAGES, {
      aria: { legendLabel: 'Legende' } as never,
    });
    expect(merged.aria.legendLabel).toBe('Legende');
    expect(merged.aria.tableCaption).toBe('Chart data');
    expect(merged.announcements).toEqual(
      OGE_DEFAULT_CHARTS_MESSAGES.announcements,
    );
    expect(
      mergeOgeChartsMessages(OGE_DEFAULT_CHARTS_MESSAGES, undefined),
    ).toEqual(OGE_DEFAULT_CHARTS_MESSAGES);
  });

  it('formats {token} placeholders', () => {
    expect(
      formatOgeChartMessage('{series}, {argument}: {value}', {
        series: 'Sales',
        argument: 'Jan',
        value: '10',
      }),
    ).toBe('Sales, Jan: 10');
    expect(formatOgeChartMessage('Zoomed', {})).toBe('Zoomed');
  });
});
