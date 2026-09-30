import { createRef } from 'react';
import { render } from '@testing-library/react';
import { OgeChart, type OgeChartHandle } from './lib/chart';
import { OgePieChart, type OgePieChartHandle } from './lib/pie-chart';
import {
  exportChartToPng,
  exportChartToSvg,
  serializeChartSvg,
} from './export-image';

describe('@oge-ui/react-charts/export-image', () => {
  it('a chart handle is an export source: its live svg serializes standalone', () => {
    const ref = createRef<OgeChartHandle>();
    render(
      <OgeChart
        ref={ref}
        dataSource={[
          { m: 'Jan', v: 1 },
          { m: 'Feb', v: 2 },
        ]}
        series={[{ type: 'bar', argumentField: 'm', valueField: 'v' }]}
      />,
    );
    const handle = ref.current;
    if (handle === null) throw new Error('no handle');
    const markup = serializeChartSvg(handle.getSvgElement(), {
      background: '#000000',
    });
    expect(markup).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(markup).toContain('oge-chart-bar');
    expect(markup).toContain('fill="#000000"');
  });

  it('downloads an .svg through a temporary object URL', () => {
    const ref = createRef<OgePieChartHandle>();
    render(
      <OgePieChart ref={ref} dataSource={[{ argument: 'A', value: 1 }]} />,
    );
    const create = vi.fn(() => 'blob:chart');
    const revoke = vi.fn();
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: create,
      revokeObjectURL: revoke,
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const handle = ref.current;
    if (handle === null) throw new Error('no handle');
    exportChartToSvg(handle, { filename: 'pie.svg' });
    expect(create).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revoke).toHaveBeenCalledWith('blob:chart');
    click.mockRestore();
    vi.unstubAllGlobals();
    expect(typeof exportChartToPng).toBe('function');
  });
});
