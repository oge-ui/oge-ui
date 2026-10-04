import {
  buildChartPdfDocument,
  chartPdfLayout,
  exportChartToPdf,
} from './export-pdf';
import { exportChartToJpeg, rasterizeChartSvg } from './export-image';

describe('@oge-ui/react-charts/export-pdf', () => {
  it('re-exports the engine PDF builder and the raster helpers', () => {
    expect(typeof exportChartToPdf).toBe('function');
    expect(typeof buildChartPdfDocument).toBe('function');
    expect(typeof exportChartToJpeg).toBe('function');
    expect(typeof rasterizeChartSvg).toBe('function');
    const layout = chartPdfLayout(
      { width: 297, height: 210 },
      { width: 800, height: 400 },
      { title: true },
    );
    expect(layout.titleY).not.toBeNull();
    expect(layout.imageW / layout.imageH).toBeCloseTo(2);
  });
});
