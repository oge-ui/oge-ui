import { serializeChartSvg } from './index';

function makeSvg(): SVGSVGElement {
  const svg = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'svg',
  ) as SVGSVGElement;
  svg.setAttribute('width', '300');
  svg.setAttribute('height', '200');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M 0 0 L 10 10');
  path.setAttribute('stroke', '#6366f1');
  svg.appendChild(path);
  document.body.appendChild(svg);
  return svg;
}

describe('serializeChartSvg', () => {
  it('emits standalone markup with an xmlns and a background rect', () => {
    const svg = makeSvg();
    const markup = serializeChartSvg(svg);
    expect(markup).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(markup).toContain('fill="#ffffff"');
    expect(markup).toContain('M 0 0 L 10 10');
    svg.remove();
  });

  it('honors a custom background and keeps explicit attributes', () => {
    const svg = makeSvg();
    const markup = serializeChartSvg(svg, { background: '#0b1220' });
    expect(markup).toContain('fill="#0b1220"');
    expect(markup).toContain('stroke="#6366f1"'); // explicit attr wins
    svg.remove();
  });

  it('does not mutate the live SVG', () => {
    const svg = makeSvg();
    const before = svg.outerHTML;
    serializeChartSvg(svg);
    expect(svg.outerHTML).toBe(before);
    svg.remove();
  });
});
