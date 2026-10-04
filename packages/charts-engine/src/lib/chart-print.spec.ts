import { chartPrintDocument, printOgeChart } from './chart-print';

function makeSvg(): SVGSVGElement {
  const svg = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'svg',
  ) as SVGSVGElement;
  svg.setAttribute('width', '300');
  svg.setAttribute('height', '200');
  document.body.appendChild(svg);
  return svg;
}

describe('chart print', () => {
  it('builds a print document: page orientation, escaped title, the svg', () => {
    const html = chartPrintDocument('<svg></svg>', {
      title: 'Q1 <draft>',
      width: 600,
      height: 300,
    });
    expect(html).toContain('@page { size: landscape');
    expect(html).toContain('<h1>Q1 &lt;draft&gt;</h1>');
    expect(html).toContain('<svg></svg>');
    expect(
      chartPrintDocument('<svg></svg>', { width: 300, height: 600 }),
    ).toContain('size: portrait');
  });

  it('prints from a hidden frame and cleans it up', async () => {
    vi.useFakeTimers();
    const svg = makeSvg();
    const print = vi.fn();
    // jsdom frames have a window; stub its print()
    const spy = vi
      .spyOn(HTMLIFrameElement.prototype, 'contentWindow', 'get')
      .mockReturnValue({ focus: () => undefined, print } as unknown as Window);
    const done = printOgeChart({ getSvgElement: () => svg }, { title: 'T' });
    expect(document.querySelectorAll('iframe')).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(60);
    await done;
    expect(print).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(document.querySelectorAll('iframe')).toHaveLength(0);
    spy.mockRestore();
    svg.remove();
    vi.useRealTimers();
  });
});
