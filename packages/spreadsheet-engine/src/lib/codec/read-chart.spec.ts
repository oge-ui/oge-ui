import { OGE_OFFICE_THEME_COLORS } from '../color/color';
import { readOgeChart, type OgeChartReadContext } from './read-chart';
import { parseOgeXmlTree } from './xml-tree';

const CONTEXT: OgeChartReadContext = {
  theme: OGE_OFFICE_THEME_COLORS,
  majorFont: 'Calibri Light',
  minorFont: 'Calibri',
};

/** A chart part: `plot` goes into the plot area, `chart` and `space` around it. */
function read(
  plot: string,
  { chart = '', space = '' }: { chart?: string; space?: string } = {},
) {
  const xml =
    '<c:chartSpace xmlns:c="c" xmlns:a="a" xmlns:mc="mc" xmlns:c14="c14">' +
    `${space}<c:chart>${chart}<c:plotArea>${plot}</c:plotArea></c:chart></c:chartSpace>`;
  return readOgeChart(parseOgeXmlTree(xml), 'xl/charts/chart1.xml', CONTEXT);
}

/** The chart area's shape for an `spPr` body. */
const area = (spPr: string) =>
  read('', { space: `<c:spPr>${spPr}</c:spPr>` }).area;

const num = (values: readonly (number | null)[], format = 'General') =>
  `<c:numCache><c:formatCode>${format}</c:formatCode><c:ptCount val="${values.length}"/>` +
  values
    .map((v, i) =>
      v === null ? '' : `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`,
    )
    .join('') +
  '</c:numCache>';
const str = (values: readonly string[]) =>
  `<c:strCache><c:ptCount val="${values.length}"/>` +
  values.map((v, i) => `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`).join('') +
  '</c:strCache>';
const series = (inner: string, index = 0) =>
  `<c:ser><c:idx val="${index}"/><c:order val="${index}"/>${inner}</c:ser>`;
const values = (list: readonly (number | null)[]) =>
  `<c:val><c:numRef><c:f>S!$B$1:$B$3</c:f>${num(list)}</c:numRef></c:val>`;

describe('readOgeChart — colours, fills and lines', () => {
  it('resolves sRGB, theme, system, preset and scRGB colours', () => {
    expect(
      area('<a:solidFill><a:srgbClr val="4472c4"/></a:solidFill>').fill,
    ).toBe('#4472C4');
    expect(
      area('<a:solidFill><a:schemeClr val="bg1"/></a:solidFill>').fill,
    ).toBe('#FFFFFF');
    expect(
      area(
        '<a:solidFill><a:sysClr val="window" lastClr="F0F0F0"/></a:solidFill>',
      ).fill,
    ).toBe('#F0F0F0');
    expect(
      area('<a:solidFill><a:sysClr val="window"/></a:solidFill>').fill,
    ).toBe('#FFFFFF');
    expect(
      area('<a:solidFill><a:sysClr val="windowText"/></a:solidFill>').fill,
    ).toBe('#000000');
    expect(area('<a:solidFill><a:prstClr val="red"/></a:solidFill>').fill).toBe(
      '#FF0000',
    );
    expect(
      area('<a:solidFill><a:scrgbClr r="100000" g="0" b="0"/></a:solidFill>')
        .fill,
    ).toBe('#FF0000');
    // what cannot be resolved leaves the default in place
    expect(
      area('<a:solidFill><a:prstClr val="mauve"/></a:solidFill>').fill,
    ).toBe(undefined);
    expect(
      area('<a:solidFill><a:srgbClr val="nope"/></a:solidFill>').fill,
    ).toBe(undefined);
    expect(area('<a:solidFill><a:hslClr hue="0"/></a:solidFill>').fill).toBe(
      undefined,
    );
  });

  it('applies the colour modifiers Excel writes: luminance, tint, shade, saturation, alpha', () => {
    // Excel's grey text: Text 1 at 65% luminance plus 35%
    expect(
      area(
        '<a:solidFill><a:schemeClr val="tx1"><a:lumMod val="65000"/><a:lumOff val="35000"/></a:schemeClr></a:solidFill>',
      ).fill,
    ).toBe('#595959');
    expect(
      area(
        '<a:solidFill><a:srgbClr val="808080"><a:tint val="50000"/></a:srgbClr></a:solidFill>',
      ).fill,
    ).toBe('#C0C0C0');
    expect(
      area(
        '<a:solidFill><a:srgbClr val="808080"><a:shade val="50000"/></a:srgbClr></a:solidFill>',
      ).fill,
    ).toBe('#404040');
    expect(
      area(
        '<a:solidFill><a:srgbClr val="996666"><a:satMod val="0"/></a:srgbClr></a:solidFill>',
      ).fill,
    ).toBe('#808080');
    expect(
      area(
        '<a:solidFill><a:srgbClr val="FF0000"><a:alpha val="40000"/></a:srgbClr></a:solidFill>',
      ),
    ).toEqual({ fill: '#FF0000', fillOpacity: 0.4 });
    // grey has no hue: luminance changes keep it grey
    expect(
      area(
        '<a:solidFill><a:srgbClr val="808080"><a:lumMod val="50000"/></a:srgbClr></a:solidFill>',
      ).fill,
    ).toBe('#404040');
    // a dark, saturated colour lightened past half luminance
    expect(
      area(
        '<a:solidFill><a:srgbClr val="1F3864"><a:lumMod val="40000"/><a:lumOff val="60000"/></a:srgbClr></a:solidFill>',
      ).fill,
    ).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('reads no fill, gradients and patterns by a colour, and line width, colour and dash', () => {
    expect(area('<a:noFill/>').fill).toBe('none');
    expect(
      area(
        '<a:gradFill><a:gsLst><a:gs pos="0"><a:srgbClr val="00FF00"/></a:gs><a:gs pos="100000"><a:srgbClr val="0000FF"/></a:gs></a:gsLst></a:gradFill>',
      ).fill,
    ).toBe('#00FF00');
    expect(
      area(
        '<a:pattFill prst="pct50"><a:fgClr><a:srgbClr val="FFC000"/></a:fgClr><a:bgClr><a:srgbClr val="FFFFFF"/></a:bgClr></a:pattFill>',
      ).fill,
    ).toBe('#FFC000');
    expect(
      area(
        '<a:ln w="19050"><a:solidFill><a:srgbClr val="D9D9D9"/></a:solidFill><a:prstDash val="sysDot"/></a:ln>',
      ),
    ).toEqual({ line: '#D9D9D9', lineWidth: 2, dash: 'dot' });
    expect(
      area('<a:ln><a:noFill/><a:prstDash val="lgDashDot"/></a:ln>'),
    ).toEqual({
      line: 'none',
      dash: 'dash',
    });
    expect(area('<a:ln><a:prstDash val="solid"/></a:ln>')).toEqual({
      dash: 'solid',
    });
    expect(area('<a:ln><a:prstDash/></a:ln>')).toEqual({ dash: 'solid' });
  });
});

describe('readOgeChart — text', () => {
  it('reads the chart text: size, weight, slant, colour and the theme fonts', () => {
    const txPr = (latin: string) =>
      `<c:txPr><a:bodyPr/><a:p><a:pPr><a:defRPr sz="1200" b="1" i="0"><a:solidFill><a:srgbClr val="333333"/></a:solidFill><a:latin typeface="${latin}"/></a:defRPr></a:pPr></a:p></c:txPr>`;
    expect(read('', { space: txPr('+mn-lt') }).font).toEqual({
      size: 12,
      bold: true,
      italic: false,
      color: '#333333',
      family: 'Calibri',
    });
    expect(read('', { space: txPr('+mj-lt') }).font.family).toBe(
      'Calibri Light',
    );
    expect(read('', { space: txPr('Arial') }).font.family).toBe('Arial');
    expect(read('', { space: '<c:txPr><a:bodyPr/></c:txPr>' }).font).toEqual(
      {},
    );
  });

  it('titles a chart with its rich text, a cell, or nothing (Excel’s automatic title)', () => {
    const rich = read('', {
      chart:
        '<c:title><c:tx><c:rich><a:bodyPr/><a:p><a:pPr><a:defRPr sz="1400"/></a:pPr><a:r><a:rPr sz="1600" b="1"/><a:t>Sales</a:t></a:r><a:r><a:t> 2026</a:t></a:r></a:p><a:p><a:fld type="datetime"><a:t>Q4</a:t></a:fld></a:p></c:rich></c:tx>' +
        '<c:layout><c:manualLayout><c:xMode val="edge"/><c:yMode val="edge"/><c:x val="0.3"/><c:y val="0.02"/></c:manualLayout></c:layout><c:overlay val="1"/></c:title>',
    });
    expect(rich.title).toEqual({
      text: { text: 'Sales 2026\nQ4' },
      font: { size: 16, bold: true },
      overlay: true,
      layout: {
        x: 0.3,
        y: 0.02,
        xMode: 'edge',
        yMode: 'edge',
        target: 'outer',
      },
    });
    const linked = read('', {
      chart: `<c:title><c:tx><c:strRef><c:f>S!$A$1</c:f>${str(['From', 'a cell'])}</c:strRef></c:tx></c:title>`,
    });
    expect(linked.title?.text).toEqual({ text: 'From a cell', ref: 'S!$A$1' });
    const literal = read('', {
      chart: '<c:title><c:tx><c:v>Literal</c:v></c:tx></c:title>',
    });
    expect(literal.title?.text).toEqual({ text: 'Literal' });
    const automatic = read('', { chart: '<c:title/>' });
    expect(automatic.title).toEqual({ font: {}, overlay: false });
    expect(read('').title).toBeUndefined();
  });
});

describe('readOgeChart — series', () => {
  it('reads names, categories of every kind, values, blanks and their formats', () => {
    const model = read(
      '<c:barChart><c:barDir val="bar"/><c:grouping val="percentStacked"/>' +
        series(
          `<c:tx><c:strRef><c:f>S!$B$1</c:f>${str(['North'])}</c:strRef></c:tx>` +
            `<c:cat><c:strRef><c:f>S!$A$2:$A$4</c:f>${str(['Q1', 'Q2', 'Q3'])}</c:strRef></c:cat>` +
            `<c:val><c:numRef><c:f>S!$B$2:$B$4</c:f>${num([1, null, 3], '0.0')}</c:numRef></c:val>`,
        ) +
        series(
          '<c:tx><c:v>Literal</c:v></c:tx>' +
            `<c:cat><c:numRef><c:f>S!$C$2:$C$4</c:f>${num([45292, 45293, 45294], 'd/m')}</c:numRef></c:cat>` +
            `<c:val><c:numLit>${num([4, 5, 6]).slice('<c:numCache>'.length, -'</c:numCache>'.length)}</c:numLit></c:val>`,
          1,
        ) +
        series(
          '<c:cat><c:multiLvlStrRef><c:f>S!$A$2:$B$4</c:f><c:multiLvlStrCache><c:ptCount val="3"/><c:lvl><c:pt idx="0"><c:v>Jan</c:v></c:pt><c:pt idx="2"><c:v>Mar</c:v></c:pt><c:pt idx="9"><c:v>out</c:v></c:pt></c:lvl><c:lvl><c:pt idx="0"><c:v>2026</c:v></c:pt></c:lvl></c:multiLvlStrCache></c:multiLvlStrRef></c:cat>' +
            values([7, 8, 9]),
          2,
        ) +
        series(
          '<c:cat><c:strLit><c:ptCount val="2"/><c:pt idx="0"><c:v>a</c:v></c:pt><c:pt idx="1"><c:v>b</c:v></c:pt></c:strLit></c:cat>' +
            values([1, 2]),
          3,
        ) +
        series('<c:cat><c:extLst/></c:cat>' + values([1]), 4) +
        series('<c:tx><c:extLst/></c:tx><c:val/>', 5) +
        '</c:barChart>',
    );
    const [group] = model.groups;
    expect(group).toMatchObject({
      kind: 'bar',
      direction: 'bar',
      grouping: 'percentStacked',
      varyColors: false,
    });
    const [north, literal, multi, strings, bare] = group?.series ?? [];
    expect(north).toMatchObject({
      name: { text: 'North', ref: 'S!$B$1' },
      categories: { ref: 'S!$A$2:$A$4', labels: ['Q1', 'Q2', 'Q3'] },
      values: { ref: 'S!$B$2:$B$4', values: [1, null, 3], format: '0.0' },
    });
    expect(literal?.name).toEqual({ text: 'Literal' });
    expect(literal?.categories).toEqual({
      ref: 'S!$C$2:$C$4',
      labels: ['45292', '45293', '45294'],
      numbers: [45292, 45293, 45294],
      format: 'd/m',
    });
    expect(literal?.values).toEqual({ values: [4, 5, 6], format: 'General' });
    expect(multi?.categories).toEqual({
      ref: 'S!$A$2:$B$4',
      labels: ['Jan', '', 'Mar'],
    });
    expect(strings?.categories).toEqual({ labels: ['a', 'b'] });
    expect(bare?.categories).toBeUndefined();
    // a series without values is left out
    expect(group?.series).toHaveLength(5);
  });

  it('reads markers, points, data labels, bubble sizes, smoothing and the series order', () => {
    const model = read(
      '<c:lineChart><c:grouping val="standard"/><c:varyColors val="1"/>' +
        series(
          '<c:spPr><a:ln w="28575"><a:solidFill><a:srgbClr val="ED7D31"/></a:solidFill></a:ln></c:spPr>' +
            '<c:marker><c:symbol val="diamond"/><c:size val="7"/><c:spPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></c:spPr></c:marker>' +
            '<c:dPt><c:idx val="1"/><c:spPr><a:solidFill><a:srgbClr val="FF0000"/></a:solidFill></c:spPr></c:dPt><c:dPt><c:spPr/></c:dPt>' +
            '<c:dLbls><c:numFmt formatCode="0%" sourceLinked="0"/><c:txPr><a:bodyPr/><a:p><a:pPr><a:defRPr sz="900"/></a:pPr></a:p></c:txPr><c:dLblPos val="t"/><c:showVal val="1"/><c:showCatName val="1"/><c:showSerName val="1"/><c:showPercent val="1"/></c:dLbls>' +
            values([1, 2, 3]) +
            '<c:smooth val="0"/>',
          3,
        ) +
        series(
          '<c:marker><c:size val="5"/></c:marker><c:dLbls><c:numFmt formatCode="0.0" sourceLinked="1"/><c:showVal/></c:dLbls>' +
            values([3, 2, 1]),
          1,
        ) +
        series(
          '<c:dLbls><c:delete val="1"/></c:dLbls>' + values([0, 0, 0]),
          2,
        ) +
        '<c:dLbls><c:showVal val="1"/></c:dLbls><c:marker val="0"/></c:lineChart>',
    );
    const [group] = model.groups;
    expect(group).toMatchObject({
      kind: 'line',
      grouping: 'standard',
      varyColors: true,
      markers: false,
      labels: { showValue: true },
    });
    // sorted by c:order
    expect(group?.series.map((s) => s.index)).toEqual([1, 2, 3]);
    const third = group?.series[2];
    expect(third).toMatchObject({
      shape: { line: '#ED7D31', lineWidth: 3 },
      marker: { symbol: 'diamond', size: 7, shape: { fill: '#FFFFFF' } },
      smooth: false,
      labels: {
        showValue: true,
        showCategory: true,
        showSeries: true,
        showPercent: true,
        position: 't',
        format: '0%',
        font: { size: 9 },
      },
    });
    expect(third?.points?.get(1)).toEqual({ fill: '#FF0000' });
    expect(third?.points?.size).toBe(1);
    expect(group?.series[0]?.marker).toEqual({
      symbol: 'auto',
      size: 5,
      shape: {},
    });
    // a source-linked format is the values' own
    expect(group?.series[0]?.labels?.format).toBeUndefined();
    expect(group?.series[1]?.labels).toBeUndefined();
    // Excel smooths a line series that says nothing
    expect(group?.series[0]?.smooth).toBe(true);
  });

  it('reads x and y values of scatter and bubble series, and bubble sizes', () => {
    const xy = (extra = '') =>
      series(
        `<c:xVal><c:numRef><c:f>S!$A$1:$A$2</c:f>${num([1.5, 2.5])}</c:numRef></c:xVal>` +
          `<c:yVal><c:numRef><c:f>S!$B$1:$B$2</c:f>${num([10, 20])}</c:numRef></c:yVal>${extra}`,
      );
    const scatter = read(
      `<c:scatterChart><c:scatterStyle val="smoothMarker"/>${xy()}</c:scatterChart>`,
    );
    expect(scatter.groups[0]).toMatchObject({
      kind: 'scatter',
      scatterStyle: 'smoothMarker',
      grouping: 'standard',
    });
    expect(scatter.groups[0]?.series[0]).toMatchObject({
      categories: { numbers: [1.5, 2.5] },
      values: { values: [10, 20] },
    });
    // scatter series are not smoothed unless they say so
    expect(scatter.groups[0]?.series[0]?.smooth).toBeUndefined();
    const bubble = read(
      `<c:bubbleChart>${xy(`<c:bubbleSize><c:numLit>${num([3, 6]).slice('<c:numCache>'.length, -'</c:numCache>'.length)}</c:numLit></c:bubbleSize>`)}</c:bubbleChart>`,
    );
    expect(bubble.groups[0]?.series[0]?.sizes?.values).toEqual([3, 6]);
  });
});

describe('readOgeChart — chart groups', () => {
  it('reads every chart kind, 3-D ones as their flat kind, with their own settings', () => {
    const kinds = [
      ['bar3DChart', 'bar'],
      ['line3DChart', 'line'],
      ['areaChart', 'area'],
      ['area3DChart', 'area'],
      ['pieChart', 'pie'],
      ['pie3DChart', 'pie'],
      ['doughnutChart', 'doughnut'],
      ['ofPieChart', 'ofPie'],
      ['radarChart', 'radar'],
      ['stockChart', 'stock'],
      ['surfaceChart', 'surface'],
      ['surface3DChart', 'surface'],
    ] as const;
    for (const [element, kind] of kinds) {
      const model = read(`<c:${element}>${series(values([1]))}</c:${element}>`);
      expect(model.groups[0]?.kind, element).toBe(kind);
      expect(!!model.groups[0]?.threeD, element).toBe(element.includes('3D'));
    }
    const doughnut = read(
      `<c:doughnutChart><c:varyColors val="0"/>${series(values([1, 2]))}<c:firstSliceAng val="90"/><c:holeSize val="60"/></c:doughnutChart>`,
    ).groups[0];
    expect(doughnut).toMatchObject({
      varyColors: false,
      firstSliceAngle: 90,
      holeSize: 60,
    });
    // a pie varies its colours unless it says otherwise
    expect(
      read(`<c:pieChart>${series(values([1]))}</c:pieChart>`).groups[0]
        ?.varyColors,
    ).toBe(true);
    const bars = read(
      `<c:barChart><c:grouping val="bogus"/>${series(values([1]))}<c:gapWidth val="80"/><c:overlap val="100"/><c:axId val="1"/><c:axId val="x"/></c:barChart>`,
    ).groups[0];
    expect(bars).toMatchObject({
      direction: 'column',
      grouping: 'clustered',
      gapWidth: 80,
      overlap: 100,
      axes: [1],
    });
    // what the viewer does not know is skipped
    expect(read('<c:unknownChart/>').groups).toEqual([]);
  });
});

describe('readOgeChart — axes, legend, layout and the chart', () => {
  it('reads an axis: position, crossing, scale, gridlines, format, ticks and title', () => {
    const model = read(
      '<c:valAx><c:axId val="2"/><c:scaling><c:logBase val="10"/><c:orientation val="maxMin"/><c:max val="100"/><c:min val="1"/></c:scaling>' +
        '<c:delete val="1"/><c:axPos val="r"/><c:majorGridlines><c:spPr><a:ln><a:solidFill><a:srgbClr val="D9D9D9"/></a:solidFill></a:ln></c:spPr></c:majorGridlines><c:minorGridlines/>' +
        '<c:title><c:tx><c:rich><a:bodyPr/><a:p><a:r><a:t>Units</a:t></a:r></a:p></c:rich></c:tx></c:title>' +
        '<c:numFmt formatCode="0%" sourceLinked="0"/><c:majorTickMark val="cross"/><c:tickLblPos val="high"/>' +
        '<c:crossAx val="1"/><c:crosses val="max"/><c:crossBetween val="midCat"/><c:majorUnit val="10"/><c:minorUnit val="2"/></c:valAx>' +
        '<c:catAx><c:axId val="1"/><c:axPos val="t"/><c:crossAx val="2"/><c:crossesAt val="5"/><c:majorTickMark val="in"/><c:tickLblPos val="low"/><c:crossBetween val="between"/></c:catAx>' +
        '<c:dateAx><c:axId val="3"/><c:axPos val="l"/><c:majorTickMark val="none"/><c:tickLblPos val="none"/><c:crosses val="autoZero"/><c:crossBetween val="bogus"/></c:dateAx>' +
        '<c:serAx><c:axId val="4"/><c:axPos val="bogus"/><c:crosses val="bogus"/></c:serAx>' +
        '<c:valAx><c:axPos val="b"/></c:valAx>',
    );
    const [value, category, date, seriesAxis] = model.axes;
    expect(model.axes).toHaveLength(4);
    expect(value).toMatchObject({
      id: 2,
      kind: 'value',
      position: 'r',
      deleted: true,
      crossAxis: 1,
      crosses: 'max',
      crossBetween: 'midCat',
      min: 1,
      max: 100,
      logBase: 10,
      reversed: true,
      majorUnit: 10,
      minorUnit: 2,
      majorGridlines: { line: '#D9D9D9' },
      minorGridlines: {},
      format: { code: '0%', sourceLinked: false },
      majorTicks: 'cross',
      labelPosition: 'high',
      title: { text: { text: 'Units' } },
    });
    expect(category).toMatchObject({
      kind: 'category',
      position: 't',
      crossesAt: 5,
      majorTicks: 'in',
      labelPosition: 'low',
      crossBetween: 'between',
      reversed: false,
      deleted: false,
    });
    expect(date).toMatchObject({
      kind: 'date',
      position: 'l',
      crosses: 'autoZero',
      majorTicks: 'none',
      labelPosition: 'none',
    });
    expect(date?.crossBetween).toBeUndefined();
    expect(seriesAxis).toMatchObject({
      kind: 'series',
      position: 'b',
      majorTicks: 'out',
      labelPosition: 'nextTo',
    });
    expect(seriesAxis?.crosses).toBeUndefined();
  });

  it('reads the legend: its side, overlay, deleted entries and manual layout', () => {
    const legend = (inner: string) =>
      read('', { chart: `<c:legend>${inner}</c:legend>` }).legend;
    for (const side of ['l', 't', 'b', 'tr', 'r'] as const)
      expect(legend(`<c:legendPos val="${side}"/>`)?.position).toBe(side);
    expect(legend('')?.position).toBe('r');
    expect(
      legend(
        '<c:legendPos val="b"/><c:legendEntry><c:idx val="2"/><c:delete val="1"/></c:legendEntry><c:legendEntry><c:idx val="3"/></c:legendEntry><c:legendEntry><c:delete/></c:legendEntry>' +
          '<c:layout><c:manualLayout><c:xMode val="edge"/><c:x val="0.7"/><c:y val="0.1"/><c:w val="0.25"/><c:h val="0.5"/></c:manualLayout></c:layout><c:overlay val="1"/>',
      ),
    ).toEqual({
      position: 'b',
      overlay: true,
      font: {},
      hidden: [2],
      layout: {
        x: 0.7,
        y: 0.1,
        w: 0.25,
        h: 0.5,
        xMode: 'edge',
        yMode: 'factor',
        target: 'outer',
      },
    });
    expect(read('').legend).toBeUndefined();
  });

  it('reads the plot area’s layout and fill, blanks, visibility, corners and the style', () => {
    const model = read(
      '<c:layout><c:manualLayout><c:layoutTarget val="inner"/><c:x val="0.1"/><c:y val="0.15"/><c:w val="0.8"/><c:h val="0.7"/></c:manualLayout></c:layout>' +
        '<c:spPr><a:solidFill><a:srgbClr val="F2F2F2"/></a:solidFill></c:spPr>',
      {
        chart: '<c:plotVisOnly val="0"/><c:dispBlanksAs val="zero"/>',
        space:
          '<c:roundedCorners val="0"/><mc:AlternateContent><mc:Choice Requires="c14"><c14:style val="102"/></mc:Choice><mc:Fallback><c:style val="2"/></mc:Fallback></mc:AlternateContent>',
      },
    );
    expect(model).toMatchObject({
      part: 'xl/charts/chart1.xml',
      plotVisibleOnly: false,
      blanksAs: 'zero',
      roundedCorners: false,
      style: 2,
      plotArea: { fill: '#F2F2F2' },
      plotLayout: {
        x: 0.1,
        y: 0.15,
        w: 0.8,
        h: 0.7,
        xMode: 'factor',
        yMode: 'factor',
        target: 'inner',
      },
    });
    expect(read('', { chart: '<c:dispBlanksAs val="span"/>' }).blanksAs).toBe(
      'span',
    );
    const plain = read('<c:layout><c:manualLayout/></c:layout>');
    expect(plain).toMatchObject({
      plotVisibleOnly: true,
      blanksAs: 'gap',
      roundedCorners: true,
      style: 2,
    });
    expect(plain.plotLayout).toBeUndefined();
    expect(read('', { space: '<c:style val="34"/>' }).style).toBe(34);
    expect(
      read('', {
        space:
          '<mc:AlternateContent><mc:Choice><c14:style val="7"/></mc:Choice></mc:AlternateContent>',
      }).style,
    ).toBe(7);
  });
});
