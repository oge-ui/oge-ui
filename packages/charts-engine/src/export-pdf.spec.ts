import { setOgePdfDefaultFont } from '@oge-ui/behavior';
import { buildChartPdfDocument, chartPdfLayout } from './export-pdf';

// a 1×1 PNG — jsdom has no 2D canvas, so the rasterizer is stubbed
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

vi.mock('./lib/svg-export', () => ({
  chartSvgSize: () => ({ width: 600, height: 300 }),
  rasterizeChartSvg: vi.fn(async () => ({ toDataURL: () => PNG })),
}));

const chart = {
  getSvgElement: () =>
    document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg',
    ) as SVGSVGElement,
};

describe('chart PDF export', () => {
  afterEach(() => setOgePdfDefaultFont(null));

  it('fits the chart below the heading, centered, keeping the aspect', () => {
    const layout = chartPdfLayout(
      { width: 297, height: 210 },
      { width: 600, height: 300 },
      { title: true, subtitle: true },
    );
    expect(layout.titleY).toBe(17);
    expect(layout.subtitleY).toBe(24);
    expect(layout.imageY).toBe(28);
    expect(layout.imageW).toBeCloseTo(273);
    expect(layout.imageH).toBeCloseTo(136.5);
    expect(layout.imageX).toBeCloseTo(12);
    // a tall chart is height-bound and centered horizontally
    const tall = chartPdfLayout(
      { width: 210, height: 297 },
      { width: 100, height: 400 },
    );
    expect(tall.titleY).toBeNull();
    expect(tall.imageH).toBeCloseTo(273);
    expect(tall.imageX).toBeGreaterThan(12);
  });

  it('builds a landscape page with the title text and the embedded image', async () => {
    const doc = await buildChartPdfDocument(chart, { title: 'Revenue 2026' });
    expect(doc).not.toBeNull();
    if (doc === null) return;
    expect(doc.internal.pageSize.getWidth()).toBeGreaterThan(
      doc.internal.pageSize.getHeight(),
    );
    const output = doc.output();
    expect(output).toContain('Revenue 2026');
    expect(output).toContain('/Subtype /Image');
  });

  it('warns once about non-WinAnsi titles without a Unicode font', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await buildChartPdfDocument(chart, { title: 'Gelir ğ ş ı' });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
