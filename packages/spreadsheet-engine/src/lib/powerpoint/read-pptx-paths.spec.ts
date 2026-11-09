/** Backgrounds, table styles and inheritance on hand-built packages. */
import { writeOgeZipSync } from '../zip/zip';
import type { OgeSlideShape, OgeSlideTable } from './model';
import { readOgePptxSync } from './read-pptx';

const A = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"';
const P =
  'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
const R =
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const RT =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const encode = (text: string) => new TextEncoder().encode(text);

const types = `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="png" ContentType="image/png"/>
<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
</Types>`;

type Rel = [string, string, string];

const rels = (items: Rel[]) =>
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${items
    .map(
      ([id, type, target]) =>
        `<Relationship Id="${id}" Type="${RT}/${type}" Target="${target}"/>`,
    )
    .join('')}</Relationships>`;

const cSld = (inner: string, bg = '') =>
  `<p:cSld>${bg}<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>${inner}</p:spTree></p:cSld>`;

const xfrm =
  '<a:xfrm><a:off x="0" y="0"/><a:ext cx="127000" cy="127000"/></a:xfrm>';

const sp = (name: string, spPr: string, nvPr = '', tx = '', style = '') =>
  `<p:sp><p:nvSpPr><p:cNvPr id="2" name="${name}"/><p:cNvSpPr/><p:nvPr>${nvPr}</p:nvPr></p:nvSpPr><p:spPr>${spPr}</p:spPr>${style}${tx}</p:sp>`;

const THEME = `<a:theme ${A} name="t"><a:themeElements><a:clrScheme name="c"><a:dk1><a:srgbClr val="010101"/></a:dk1><a:lt1><a:srgbClr val="FEFEFE"/></a:lt1><a:accent1><a:srgbClr val="AA0000"/></a:accent1></a:clrScheme><a:fontScheme name="f"><a:majorFont><a:latin typeface="Major"/></a:majorFont><a:minorFont><a:latin typeface="Minor"/></a:minorFont></a:fontScheme><a:fmtScheme name="s"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst/><a:effectStyleLst/><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;

interface Options {
  slide?: string;
  slideBg?: string;
  slideExtra?: string;
  layout?: string;
  layoutBg?: string;
  layoutExtra?: string;
  master?: string;
  masterBg?: string;
  masterExtra?: string;
  presentation?: string;
  tableStyles?: string;
}

const build = (o: Options): Uint8Array => {
  const files: Record<string, string> = {
    '[Content_Types].xml': types,
    '_rels/.rels': rels([['rId1', 'officeDocument', 'ppt/presentation.xml']]),
    'ppt/presentation.xml': `<p:presentation ${P} ${R}>${o.presentation ?? ''}<p:sldIdLst><p:sldId r:id="rId2"/></p:sldIdLst></p:presentation>`,
    'ppt/_rels/presentation.xml.rels': rels([
      ['rId2', 'slide', 'slides/slide1.xml'],
      ...(o.tableStyles
        ? ([['rId3', 'tableStyles', 'tableStyles.xml']] as Rel[])
        : []),
    ]),
    'ppt/slides/slide1.xml': `<p:sld ${A} ${P} ${R}>${cSld(o.slide ?? '', o.slideBg)}${o.slideExtra ?? ''}</p:sld>`,
    'ppt/slides/_rels/slide1.xml.rels': rels([
      ['rId1', 'slideLayout', '../slideLayouts/layout1.xml'],
    ]),
    'ppt/slideLayouts/layout1.xml': `<p:sldLayout ${A} ${P}>${cSld(o.layout ?? '', o.layoutBg)}${o.layoutExtra ?? ''}</p:sldLayout>`,
    'ppt/slideLayouts/_rels/layout1.xml.rels': rels([
      ['rId1', 'slideMaster', '../slideMasters/master1.xml'],
    ]),
    'ppt/slideMasters/master1.xml': `<p:sldMaster ${A} ${P}>${cSld(o.master ?? '', o.masterBg)}<p:clrMap bg1="lt1" tx1="dk1"/>${o.masterExtra ?? ''}</p:sldMaster>`,
    'ppt/slideMasters/_rels/master1.xml.rels': rels([
      ['rId1', 'theme', '../theme/theme1.xml'],
    ]),
    'ppt/theme/theme1.xml': THEME,
  };
  if (o.tableStyles) files['ppt/tableStyles.xml'] = o.tableStyles;
  return writeOgeZipSync(
    Object.entries(files).map(([name, text]) => ({
      name,
      data: encode(text),
    })),
  );
};

const read = (o: Options) => readOgePptxSync(build(o));
const slideOf = (o: Options) => read(o).presentation.slides[0];

describe('slide backgrounds', () => {
  const bgPr = (fill: string) => `<p:bg><p:bgPr>${fill}</p:bgPr></p:bg>`;
  const solid = (rgb: string) =>
    `<a:solidFill><a:srgbClr val="${rgb}"/></a:solidFill>`;

  it('uses the slide’s, then the layout’s, then the master’s', () => {
    expect(
      slideOf({ slideBg: bgPr(solid('111111')) }).background,
    ).toMatchObject({ color: { rgb: '111111' } });
    expect(
      slideOf({ layoutBg: bgPr(solid('222222')) }).background,
    ).toMatchObject({ color: { rgb: '222222' } });
    expect(
      slideOf({ masterBg: bgPr(solid('333333')) }).background,
    ).toMatchObject({ color: { rgb: '333333' } });
    expect(slideOf({}).background).toEqual({ kind: 'none' });
  });

  it('follows a theme background reference', () => {
    expect(
      slideOf({
        masterBg:
          '<p:bg><p:bgRef idx="1001"><a:schemeClr val="tx1"/></p:bgRef></p:bg>',
      }).background,
    ).toMatchObject({ color: { rgb: '010101' } });
    expect(
      slideOf({
        masterBg:
          '<p:bg><p:bgRef idx="1"><a:schemeClr val="bg1"/></p:bgRef></p:bg>',
      }).background,
    ).toMatchObject({ color: { rgb: 'FEFEFE' } });
    expect(
      slideOf({ masterBg: '<p:bg><p:bgRef idx="0"/></p:bg>' }).background,
    ).toEqual({ kind: 'none' });
    expect(
      slideOf({ masterBg: '<p:bg><p:bgRef idx="1009"/></p:bg>' }).background,
    ).toEqual({ kind: 'none' });
    expect(slideOf({ masterBg: '<p:bg/>' }).background).toEqual({
      kind: 'none',
    });
  });

  it('remaps theme colours with an override', () => {
    const fill = `<a:solidFill><a:schemeClr val="tx1"/></a:solidFill>`;
    const remap =
      '<p:clrMapOvr><a:overrideClrMapping tx1="lt1" bg1="dk1"/></p:clrMapOvr>';
    const shape = (o: Options) => slideOf(o).elements[0] as OgeSlideShape;
    expect(
      shape({ slide: sp('s', xfrm + fill), slideExtra: remap }).fill,
    ).toMatchObject({ color: { rgb: 'FEFEFE' } });
    expect(
      shape({
        slide: sp('s', xfrm + fill),
        layoutExtra: remap,
        slideExtra: '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>',
      }).fill,
    ).toMatchObject({ color: { rgb: 'FEFEFE' } });
  });
});

describe('fills', () => {
  const fillOf = (xml: string) =>
    (slideOf({ slide: sp('s', xfrm + xml) }).elements[0] as OgeSlideShape).fill;

  it('reads gradients, linear and radial, and skips bad stops', () => {
    expect(
      fillOf(
        '<a:gradFill><a:gsLst><a:gs pos="50000"><a:srgbClr val="000000"/></a:gs><a:gs><a:srgbClr val="bad"/></a:gs></a:gsLst><a:lin ang="5400000"/></a:gradFill>',
      ),
    ).toMatchObject({
      kind: 'gradient',
      angle: 90,
      stops: [{ position: 0.5 }],
    });
    expect(
      fillOf(
        '<a:gradFill><a:gsLst><a:gs pos="0"><a:srgbClr val="000000"/></a:gs></a:gsLst><a:path path="circle"/></a:gradFill>',
      ),
    ).toMatchObject({ kind: 'gradient', angle: null });
    expect(fillOf('<a:gradFill><a:gsLst/><a:lin/></a:gradFill>')).toMatchObject(
      { angle: 0 },
    );
  });

  it('treats an unnamed colour as no fill', () => {
    expect(fillOf('<a:solidFill/>')).toEqual({ kind: 'none' });
    expect(fillOf('<a:pattFill prst="pct5"/>')).toEqual({ kind: 'none' });
    expect(
      fillOf('<a:blipFill><a:blip r:embed="missing"/></a:blipFill>'),
    ).toEqual({ kind: 'none' });
  });
});

describe('lines', () => {
  const lineOf = (spPr: string, style = '') =>
    (
      slideOf({ slide: sp('s', xfrm + spPr, '', '', style) })
        .elements[0] as OgeSlideShape
    ).line;

  it('falls back to a thin solid line', () => {
    expect(
      lineOf(
        '<a:ln><a:solidFill><a:srgbClr val="000000"/></a:solidFill></a:ln>',
      ),
    ).toMatchObject({ width: 9525, dash: 'solid', cap: 'flat' });
  });

  it('has none without a fill or with an empty theme entry', () => {
    expect(lineOf('<a:ln w="100"/>')).toBeNull();
    expect(
      lineOf(
        '',
        '<p:style><a:lnRef idx="4"><a:srgbClr val="000000"/></a:lnRef></p:style>',
      ),
    ).toBeNull();
  });
});

describe('text inheritance', () => {
  const tx = (inner: string, body = '<a:bodyPr/>') =>
    `<p:txBody>${body}${inner}</p:txBody>`;
  const para = (text: string, pPr = '') =>
    `<a:p>${pPr}<a:r><a:t>${text}</a:t></a:r></a:p>`;

  it('takes the master’s title, body and other styles', () => {
    const level = (sz: number) =>
      `<a:lvl1pPr><a:spcBef><a:spcPct val="50000"/></a:spcBef><a:spcAft><a:spcPts val="600"/></a:spcAft><a:defRPr sz="${sz}"/></a:lvl1pPr>`;
    const masterExtra = `<p:txStyles><p:titleStyle>${level(4400)}</p:titleStyle><p:bodyStyle>${level(2800)}</p:bodyStyle><p:otherStyle>${level(1200)}</p:otherStyle></p:txStyles>`;
    const size = (ph: string) => {
      const el = slideOf({
        slide: sp('s', xfrm, `<p:ph ${ph}/>`, tx(para('x'))),
        masterExtra,
      }).elements[0] as OgeSlideShape;
      return el.text?.paragraphs[0];
    };
    expect(size('type="ctrTitle"')?.runs[0].size).toBe(44);
    expect(size('type="subTitle"')?.runs[0].size).toBe(28);
    expect(size('idx="3"')?.runs[0].size).toBe(28);
    expect(size('type="ftr"')?.runs[0].size).toBe(12);
    expect(size('type="title"')?.spaceBefore).toEqual({
      kind: 'percent',
      value: 50,
    });
    expect(size('type="title"')?.spaceAfter).toEqual({
      kind: 'points',
      value: 6,
    });
  });

  it('falls back on the deck’s default style, and on 18 pt', () => {
    const size = (presentation: string) =>
      (
        slideOf({ slide: sp('s', xfrm, '', tx(para('x'))), presentation })
          .elements[0] as OgeSlideShape
      ).text?.paragraphs[0].runs[0].size;
    expect(
      size(
        '<p:defaultTextStyle><a:lvl1pPr><a:defRPr sz="1600"/></a:lvl1pPr></p:defaultTextStyle>',
      ),
    ).toBe(16);
    expect(size('')).toBe(18);
  });

  it('reads the deepest level, explicit bullets and paragraph defaults', () => {
    const el = slideOf({
      slide: sp(
        's',
        xfrm,
        '',
        tx(
          `<a:lstStyle><a:lvl2pPr><a:defRPr sz="1100" b="1"/></a:lvl2pPr></a:lstStyle>${para(
            'x',
            '<a:pPr lvl="1" rtl="0" algn="r"><a:buChar/><a:defRPr i="1"/></a:pPr>',
          )}`,
        ),
      ),
    }).elements[0] as OgeSlideShape;
    const p = el.text?.paragraphs[0];
    expect(p).toMatchObject({ level: 1, align: 'r', rtl: false });
    expect(p?.bullet).toMatchObject({ kind: 'char', char: '' });
    expect(p?.runs[0]).toMatchObject({ size: 11, bold: true, italic: true });
  });

  it('drops an empty body, and turns autofit off', () => {
    const empty = slideOf({
      slide: sp('s', xfrm, '', tx('<a:p/>')),
    }).elements[0] as OgeSlideShape;
    expect(empty.text).toBeNull();
    const off = slideOf({
      slide: sp(
        's',
        xfrm,
        '<p:ph idx="1"/>',
        tx(para('x'), '<a:bodyPr><a:noAutofit/></a:bodyPr>'),
      ),
      layout: sp(
        'l',
        xfrm,
        '<p:ph idx="1"/>',
        tx(
          para('y'),
          '<a:bodyPr><a:normAutofit fontScale="50000"/></a:bodyPr>',
        ),
      ),
    }).elements[0] as OgeSlideShape;
    expect(off.text?.fontScale).toBe(1);
  });

  it('matches a layout placeholder by type when the index differs', () => {
    const el = slideOf({
      slide: sp('s', '', '<p:ph type="title" idx="9"/>', tx(para('t'))),
      layout: sp('l', xfrm, '<p:ph type="ctrTitle"/>'),
    }).elements[0] as OgeSlideShape;
    expect(el.frame.width).toBe(127000);
  });

  it('skips a slide placeholder with no position anywhere', () => {
    const { presentation, issues } = read({
      slide: sp('s', '', '<p:ph type="dt"/>', tx(para('d'))),
    });
    expect(presentation.slides[0].elements).toEqual([]);
    expect(issues[0].detail).toBe('shape without a position');
  });

  it('does not draw a layout’s placeholder prompts', () => {
    expect(
      slideOf({
        layout: sp('l', xfrm, '<p:ph type="body"/>', tx(para('prompt'))),
      }).backdrop,
    ).toEqual([]);
  });
});

describe('tables', () => {
  const ln = (rgb: string) =>
    `<a:ln w="25400"><a:solidFill><a:srgbClr val="${rgb}"/></a:solidFill></a:ln>`;
  const part = (name: string, fill: string, more = '') =>
    `<a:${name}>${more}<a:tcStyle><a:tcBdr/><a:fill><a:solidFill><a:srgbClr val="${fill}"/></a:solidFill></a:fill></a:tcStyle></a:${name}>`;
  const tableStyles = `<a:tblStyleLst ${A}><a:tblStyle styleId="{S}">
<a:wholeTbl><a:tcStyle><a:tcBdr><a:left>${ln('100000')}</a:left><a:right>${ln('200000')}</a:right><a:top>${ln('300000')}</a:top><a:bottom>${ln('400000')}</a:bottom><a:insideH>${ln('500000')}</a:insideH><a:insideV>${ln('600000')}</a:insideV></a:tcBdr><a:fill><a:solidFill><a:srgbClr val="AAAAAA"/></a:solidFill></a:fill></a:tcStyle></a:wholeTbl>
${part('band1H', '111111')}${part('band2H', '222222')}${part('band1V', '333333')}${part('band2V', '444444')}
${part('firstCol', '555555', '<a:tcTxStyle i="on"><a:fontRef idx="major"/><a:srgbClr val="ABABAB"/></a:tcTxStyle>')}${part('lastCol', '666666', '<a:tcTxStyle b="off"><a:fontRef idx="minor"/></a:tcTxStyle>')}${part('lastRow', '777777')}${part('firstRow', '888888', '<a:tcTxStyle b="on"/>')}
</a:tblStyle></a:tblStyleLst>`;
  const tc = (attrs = '', tcPr = '<a:tcPr/>', text = 'c') =>
    `<a:tc ${attrs}><a:txBody><a:bodyPr/><a:p><a:r><a:t>${text}</a:t></a:r></a:p></a:txBody>${tcPr}</a:tc>`;
  const tr = (cells: string) => `<a:tr h="127000">${cells}</a:tr>`;
  const frame = (tblPr: string, rows: string) =>
    `<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="5" name="t"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="0" y="0"/><a:ext cx="254000" cy="254000"/></p:xfrm><a:graphic><a:graphicData><a:tbl>${tblPr}<a:tblGrid><a:gridCol w="127000"/><a:gridCol w="127000"/></a:tblGrid>${rows}</a:tbl></a:graphicData></a:graphic></p:graphicFrame>`;
  const tableOf = (tblPr: string, rows: string) =>
    slideOf({ slide: frame(tblPr, rows), tableStyles })
      .elements[0] as OgeSlideTable;
  const grid = [
    tr(tc() + tc()),
    tr(tc() + tc()),
    tr(tc() + tc()),
    tr(tc() + tc()),
  ].join('');
  const props = (flags: string) =>
    `<a:tblPr ${flags}><a:tableStyleId>{S}</a:tableStyleId></a:tblPr>`;
  const colour = (table: OgeSlideTable, r: number, c: number) => {
    const fill = table.rows[r].cells[c].fill;
    return fill.kind === 'solid' ? fill.color.rgb : fill.kind;
  };

  it('applies banding and header parts', () => {
    const t = tableOf(props('firstRow="1" lastRow="1" bandRow="1"'), grid);
    expect([0, 1, 2, 3].map((r) => colour(t, r, 0))).toEqual([
      '888888',
      '111111',
      '222222',
      '777777',
    ]);
    expect(t.rows[0].cells[0].text.paragraphs[0].runs[0].bold).toBe(true);
  });

  it('applies column parts and vertical bands', () => {
    const t = tableOf(props('firstCol="1" lastCol="1"'), grid);
    expect(colour(t, 1, 0)).toBe('555555');
    expect(colour(t, 1, 1)).toBe('666666');
    const run = t.rows[1].cells[0].text.paragraphs[0].runs[0];
    expect(run).toMatchObject({ italic: true, font: 'Major' });
    expect(run.color.rgb).toBe('ABABAB');
    expect(t.rows[1].cells[1].text.paragraphs[0].runs[0]).toMatchObject({
      bold: false,
      font: 'Minor',
    });
    const banded = tableOf(props('bandCol="1"'), grid);
    expect([colour(banded, 0, 0), colour(banded, 0, 1)]).toEqual([
      '333333',
      '444444',
    ]);
  });

  it('puts outer and inside borders on the right edges', () => {
    const t = tableOf(props(''), grid);
    const color = (line: { fill: unknown } | null) =>
      (line?.fill as { color: { rgb: string } }).color.rgb;
    const first = t.rows[0].cells[0].borders;
    expect(color(first.left)).toBe('100000');
    expect(color(first.top)).toBe('300000');
    expect(color(first.right)).toBe('600000');
    expect(color(first.bottom)).toBe('500000');
    const last = t.rows[3].cells[1].borders;
    expect(color(last.right)).toBe('200000');
    expect(color(last.bottom)).toBe('400000');
  });

  it('lets a cell override its fill, border, margins and spans', () => {
    const t = tableOf(
      props(''),
      tr(
        tc(
          'gridSpan="2" rowSpan="2"',
          `<a:tcPr marL="12700" marT="0" anchor="ctr" vert="vert"><a:lnL><a:noFill/></a:lnL><a:lnR w="1"><a:solidFill><a:srgbClr val="ABCDEF"/></a:solidFill><a:prstDash val="dash"/></a:lnR><a:solidFill><a:srgbClr val="FEDCBA"/></a:solidFill></a:tcPr>`,
        ) + tc('hMerge="1"'),
      ) + tr(tc('vMerge="1"') + tc('vMerge="1"')),
    );
    const cell = t.rows[0].cells[0];
    expect(cell).toMatchObject({ columnSpan: 2, rowSpan: 2 });
    expect(cell.fill).toMatchObject({ color: { rgb: 'FEDCBA' } });
    expect(cell.borders.left).toBeNull();
    expect(cell.borders.right).toMatchObject({ width: 1, dash: 'dash' });
    expect(cell.text).toMatchObject({
      anchor: 'ctr',
      vertical: 'vert',
      insets: { left: 12700, top: 0, right: 91440 },
    });
    expect(t.rows[0].cells[1].merged).toBe(true);
    expect(t.rows[1].cells[0].merged).toBe(true);
  });

  it('reports an unknown style and handles a cell without text', () => {
    const { issues, presentation } = read({
      slide: frame(
        '<a:tblPr><a:tableStyleId>{Other}</a:tableStyleId></a:tblPr>',
        tr('<a:tc><a:tcPr/></a:tc>'),
      ),
    });
    expect(issues.map((i) => i.code)).toContain('table-style-not-shown');
    const t = presentation.slides[0].elements[0] as OgeSlideTable;
    expect(t.rows[0].cells[0].text.paragraphs).toEqual([]);
    expect(t.rows[0].cells[0].fill).toEqual({ kind: 'none' });
    const plain = read({
      slide: frame('', tr('<a:tc/>')),
    }).presentation.slides[0].elements[0] as OgeSlideTable;
    expect(plain.rows[0].cells[0].borders.left).toBeNull();
  });

  it('skips a frame without a position', () => {
    const noFrame = frame('', '').replace(/<p:xfrm>.*<\/p:xfrm>/, '');
    expect(read({ slide: noFrame }).presentation.slides[0].elements).toEqual(
      [],
    );
  });
});
