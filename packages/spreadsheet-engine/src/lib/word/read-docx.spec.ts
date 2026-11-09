/**
 * What the corpus document does not reach: styles, numbering, fields, table
 * styles, sections and malformed input, on small hand-built packages.
 */
import type { OgeSlideTextMeasurer } from '../powerpoint/text-layout';
import { writeOgeZipSync } from '../zip/zip';
import { ogeLayoutWordDocument } from './layout';
import type {
  OgeWordDocument,
  OgeWordInline,
  OgeWordParagraph,
  OgeWordTable,
} from './model';
import { OgeDocxError, readOgeDocx, readOgeDocxSync } from './read-docx';

const W =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const R =
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const NS = `${W} ${R} xmlns:wp="w" xmlns:a="a" xmlns:pic="p" xmlns:wps="s" xmlns:c="c"`;
const RT =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const encode = (text: string) => new TextEncoder().encode(text);

const types = `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="png" ContentType="image/png"/>
<Default Extension="wmf" ContentType="image/x-wmf"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

type Rel = [string, string, string, boolean?];

const rels = (items: Rel[]) =>
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${items
    .map(
      ([id, type, target, external]) =>
        `<Relationship Id="${id}" Type="${RT}/${type}" Target="${target}"${external ? ' TargetMode="External"' : ''}/>`,
    )
    .join('')}</Relationships>`;

interface Parts {
  styles?: string;
  numbering?: string;
  settings?: string;
  footnotes?: string;
  extra?: Record<string, string>;
  rels?: Rel[];
}

function docxOf(body: string, parts: Parts = {}): Uint8Array {
  const documentRels: Rel[] = [...(parts.rels ?? [])];
  const files: Record<string, string> = {
    '[Content_Types].xml': types,
    '_rels/.rels': rels([['rId1', 'officeDocument', 'word/document.xml']]),
    'word/document.xml': `<w:document ${NS}><w:body>${body}</w:body></w:document>`,
    ...parts.extra,
  };
  for (const [name, content] of [
    ['styles', parts.styles],
    ['numbering', parts.numbering],
    ['settings', parts.settings],
    ['footnotes', parts.footnotes],
  ] as const) {
    if (content) {
      files[`word/${name}.xml`] = content;
      documentRels.push([`r${name}`, name, `${name}.xml`]);
    }
  }
  files['word/_rels/document.xml.rels'] = rels(documentRels);
  return writeOgeZipSync(
    Object.entries(files).map(([name, text]) => ({
      name,
      data: encode(text),
    })),
  );
}

const read = (body: string, parts?: Parts) =>
  readOgeDocxSync(docxOf(body, parts));
const first = (body: string, parts?: Parts): OgeWordParagraph =>
  read(body, parts).document.sections[0].blocks[0] as OgeWordParagraph;
const textOf = (p: OgeWordParagraph) =>
  p.inlines.flatMap((i) => (i.kind === 'text' ? i.text : [])).join('');
const r = (inner: string, rPr = '') =>
  `<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ''}${inner}</w:r>`;
const t = (text: string) => `<w:t xml:space="preserve">${text}</w:t>`;
const p = (inner: string, pPr = '') =>
  `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ''}${inner}</w:p>`;

const measurer: OgeSlideTextMeasurer = {
  width: (text, font) => text.length * font.size * 0.5,
  extent: (font) => ({ ascent: font.size * 0.8, descent: font.size * 0.2 }),
};

const layout = (document: OgeWordDocument) =>
  ogeLayoutWordDocument(document, measurer, {
    idPrefix: 't',
    fontFamily: (name) => name,
  });

const texts = (page: { render: { nodes: readonly unknown[] } }) =>
  (page.render.nodes as { kind: string; text?: string }[])
    .filter((n) => n.kind === 'text')
    .map((n) => n.text ?? '');

describe('readOgeDocx refusals', () => {
  it('refuses legacy, foreign and damaged packages', () => {
    expect(() =>
      readOgeDocxSync(
        new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
      ),
    ).toThrowError(expect.objectContaining({ code: 'encrypted-or-legacy' }));
    expect(() =>
      readOgeDocxSync(writeOgeZipSync([{ name: 'a', data: encode('x') }])),
    ).toThrowError(expect.objectContaining({ code: 'not-docx' }));
    expect(() => readOgeDocxSync(new Uint8Array(64))).toThrowError(
      expect.objectContaining({ name: 'OgeDocxError' }),
    );
    const broken = writeOgeZipSync([
      { name: '[Content_Types].xml', data: encode(types) },
      {
        name: '_rels/.rels',
        data: encode(rels([['rId1', 'officeDocument', 'word/document.xml']])),
      },
      { name: 'word/document.xml', data: encode('<not') },
    ]);
    expect(() => readOgeDocxSync(broken)).toThrowError(
      expect.objectContaining({ code: 'corrupt' }),
    );
    expect(() =>
      readOgeDocxSync(docxOf(''), { limits: { maxEntries: 1 } }),
    ).toThrowError(expect.objectContaining({ code: 'too-large' }));
  });

  it('accepts a blob and a buffer, and honours abort', async () => {
    const bytes = docxOf(p(r(t('x'))));
    const blob = {
      arrayBuffer: async () => bytes.slice().buffer,
    } as unknown as Blob;
    expect((await readOgeDocx(blob)).document.sections).toHaveLength(1);
    expect(
      (await readOgeDocx(bytes.slice().buffer)).document.sections,
    ).toHaveLength(1);
    expect(
      readOgeDocxSync(bytes.slice().buffer).document.sections,
    ).toHaveLength(1);
    const aborted = new AbortController();
    aborted.abort();
    await expect(
      readOgeDocx(bytes, { signal: aborted.signal }),
    ).rejects.toBeInstanceOf(OgeDocxError);
  });

  it('reports macros and a malformed side part', () => {
    const { issues } = read(p(r(t('x'))), {
      styles: '<not',
      extra: { 'word/vbaProject.bin': 'x' },
    });
    expect(issues.map((i) => i.code)).toEqual(
      expect.arrayContaining(['macros-kept', 'malformed-part']),
    );
  });
});

describe('styles', () => {
  const styles = `<w:styles ${W}>
<w:docDefaults><w:rPrDefault><w:rPr><w:sz w:val="20"/><w:rFonts w:ascii="Base"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="100"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Body"><w:pPr><w:jc w:val="both"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Child"><w:basedOn w:val="Body"/><w:pPr><w:keepNext/><w:ind w:start="200" w:end="100" w:firstLine="40"/><w:spacing w:before="60" w:line="300" w:lineRule="exact"/><w:shd w:fill="ABCDEF"/><w:pBdr><w:top w:val="single" w:sz="8" w:color="112233" w:space="2"/><w:start w:val="dashed" w:sz="4"/><w:bottom w:val="nil"/></w:pBdr><w:contextualSpacing/><w:pageBreakBefore/><w:keepLines/><w:widowControl w:val="0"/></w:pPr><w:rPr><w:b/><w:caps/><w:color w:val="auto"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Loop"><w:basedOn w:val="Loop"/></w:style>
<w:style w:type="character" w:styleId="Emph"><w:rPr><w:i/><w:color w:val="00FF00"/></w:rPr></w:style>
</w:styles>`;

  it('walks the chain, with direct formatting on top', () => {
    const para = first(
      p(
        r(t('hi'), '<w:rStyle w:val="Emph"/><w:b w:val="0"/>'),
        '<w:pStyle w:val="Child"/><w:jc w:val="center"/>',
      ),
      { styles },
    );
    expect(para).toMatchObject({
      align: 'center',
      left: 10,
      right: 5,
      first: 2,
      before: 3,
      after: 5,
      line: { rule: 'exact', value: 300 },
      keepNext: true,
      keepLines: true,
      widowControl: false,
      pageBreakBefore: true,
      contextualSpacing: true,
      shading: 'ABCDEF',
    });
    expect(para.borders.top).toMatchObject({
      width: 1,
      color: '112233',
      space: 2,
    });
    expect(para.borders.left?.style).toBe('dashed');
    expect(para.borders.bottom).toBeUndefined();
    const run = para.inlines[0];
    expect(run.kind === 'text' && run.style).toMatchObject({
      font: 'Base',
      size: 10,
      bold: false,
      italic: true,
      caps: true,
      color: '00FF00',
    });
  });

  it('uses the default paragraph style and survives a loop', () => {
    expect(first(p(r(t('x'))), { styles }).align).toBe('both');
    expect(
      first(p(r(t('x')), '<w:pStyle w:val="Loop"/>'), { styles }).styleId,
    ).toBe('Loop');
  });

  it.each([
    ['start', 'left'],
    ['end', 'right'],
    ['right', 'right'],
    ['distribute', 'both'],
    ['left', 'left'],
    ['odd', 'left'],
  ])('reads alignment %s', (value, align) => {
    expect(first(p(r(t('x')), `<w:jc w:val="${value}"/>`)).align).toBe(align);
  });

  it('reads a hanging indent and an at-least rule', () => {
    const para = first(
      p(
        r(t('x')),
        '<w:ind w:left="400" w:hanging="200"/><w:spacing w:line="280" w:lineRule="atLeast"/>',
      ),
    );
    expect(para.first).toBe(-10);
    expect(para.line).toEqual({ rule: 'atLeast', value: 280 });
  });

  it('merges tabs and clears one', () => {
    const para = first(
      p(
        r(t('x')),
        '<w:tabs><w:tab w:val="right" w:pos="720" w:leader="dot"/><w:tab w:val="clear" w:pos="100"/><w:tab w:val="center" w:pos="360"/><w:tab w:val="decimal" w:pos="1000"/><w:tab w:pos="1400"/></w:tabs>',
      ),
    );
    expect(para.tabs.map((tab) => [tab.position, tab.align])).toEqual([
      [18, 'center'],
      [36, 'right'],
      [50, 'decimal'],
      [70, 'left'],
    ]);
    expect(para.tabs[1].leader).toBe('dot');
  });

  it('reads run details', () => {
    const para = first(
      p(
        r(
          t('x'),
          '<w:rFonts w:asciiTheme="majorHAnsi"/><w:sz w:val="30"/><w:u w:val="none"/><w:strike/><w:highlight w:val="yellow"/><w:vertAlign w:val="superscript"/>',
        ) +
          r(
            t('y'),
            '<w:u w:val="single"/><w:highlight w:val="none"/><w:shd w:fill="auto"/><w:vertAlign w:val="baseline"/><w:color w:val="bad"/>',
          ) +
          r(
            t('z'),
            '<w:highlight w:val="teal"/><w:shd w:fill="102030"/><w:rFonts w:asciiTheme="minorHAnsi"/>',
          ) +
          r(
            t('w'),
            '<w:rFonts w:hAnsi="Only"/><w:b w:val="false"/><w:i w:val="off"/>',
          ),
      ),
    );
    const styles = para.inlines.flatMap((i) =>
      i.kind === 'text' ? [i.style] : [],
    );
    expect(styles[0]).toMatchObject({
      size: 15,
      underline: false,
      strike: true,
      background: 'FFFF00',
      vertAlign: 'superscript',
    });
    expect(styles[1]).toMatchObject({ underline: true, background: null });
    expect(styles[2].background).toBe('102030');
    expect(styles[3]).toMatchObject({
      font: 'Only',
      bold: false,
      italic: false,
    });
  });
});

describe('numbering', () => {
  const level = (i: number, format: string, text: string, more = '') =>
    `<w:lvl w:ilvl="${i}"><w:start w:val="1"/><w:numFmt w:val="${format}"/><w:lvlText w:val="${text}"/>${more}<w:pPr><w:ind w:left="${(i + 1) * 360}" w:hanging="360"/></w:pPr></w:lvl>`;
  const numbering = `<w:numbering ${W}>
<w:abstractNum w:abstractNumId="1">${level(0, 'decimal', '%1.')}${level(1, 'lowerLetter', '%1.%2)')}${level(2, 'upperRoman', '%3', '<w:suff w:val="space"/>')}${level(3, 'bullet', '', '<w:suff w:val="nothing"/><w:rPr><w:rFonts w:ascii="Symbol"/></w:rPr>')}${level(4, 'lowerRoman', '%5')}${level(5, 'upperLetter', '%6')}${level(6, 'decimalZero', '%7')}</w:abstractNum>
<w:num w:numId="5"><w:abstractNumId w:val="1"/></w:num>
<w:num w:numId="6"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="7"/></w:lvlOverride><w:lvlOverride w:ilvl="1">${level(1, 'decimal', 'x%2')}</w:lvlOverride></w:num>
<w:num w:numId="7"><w:abstractNumId w:val="404"/></w:num>
</w:numbering>`;
  const item = (level: number, numId = 5) =>
    p(
      r(t('x')),
      `<w:numPr><w:ilvl w:val="${level}"/><w:numId w:val="${numId}"/></w:numPr>`,
    );
  const labels = (body: string) =>
    read(body, { numbering }).document.sections[0].blocks.map(
      (b) => (b as OgeWordParagraph).label?.text,
    );

  it('counts levels and restarts a deeper one', () => {
    expect(
      labels([item(0), item(1), item(1), item(0), item(1), item(2)].join('')),
    ).toEqual(['1.', '1.a)', '1.b)', '2.', '2.a)', 'I']);
  });

  it('formats every kind', () => {
    expect(labels(item(3))).toEqual(['•']);
    expect(labels(item(4))).toEqual(['i']);
    expect(labels(item(5))).toEqual(['A']);
    expect(labels(item(6))).toEqual(['01']);
  });

  it('applies overrides and the level’s indents', () => {
    expect(labels(item(0, 6) + item(1, 6))).toEqual(['7.', 'x1']);
    const para = first(item(1), { numbering });
    expect(para.left).toBe(36);
    expect(para.first).toBe(-18);
  });

  it('ignores an unknown list and list zero', () => {
    expect(labels(item(0, 7))).toEqual([undefined]);
    expect(labels(item(0, 0))).toEqual([undefined]);
  });

  it('lays out each label suffix', () => {
    const { document } = read(item(0) + item(2) + item(3) + p(r(t('plain'))), {
      numbering,
    });
    const lines = layout(document)[0].lines;
    expect(lines[0].x).toBe(90);
    expect(lines[1].x).toBeGreaterThan(72);
    expect(lines[2].x).toBeGreaterThan(72);
  });
});

describe('inline content', () => {
  it('reads tabs, breaks, symbols and hyphens', () => {
    const para = first(
      p(
        r(
          `<w:tab/><w:br/><w:br w:type="page"/><w:br w:type="column"/><w:cr/><w:noBreakHyphen/><w:sym w:font="Symbol" w:char="F0B7"/><w:sym w:font="X" w:char="41"/>${t('')}`,
        ),
      ),
    );
    expect(para.inlines.map((i) => i.kind)).toEqual([
      'tab',
      'break',
      'break',
      'break',
      'break',
      'text',
      'text',
      'text',
    ]);
    const kinds = para.inlines.flatMap((i) =>
      i.kind === 'break' ? i.type : [],
    );
    expect(kinds).toEqual(['line', 'page', 'column', 'line']);
    expect(textOf(para)).toBe('‑•A');
  });

  it('follows links, inserted text, smart tags and content controls', () => {
    const para = first(
      p(
        `<w:hyperlink r:id="l1">${r(t('a'))}</w:hyperlink><w:hyperlink r:id="l2">${r(t('b'))}</w:hyperlink><w:ins>${r(t('c'))}</w:ins><w:del>${r('<w:delText>no</w:delText>')}</w:del><w:smartTag>${r(t('d'))}</w:smartTag><w:customXml>${r(t('e'))}</w:customXml><w:sdt><w:sdtContent>${r(t('f'))}</w:sdtContent></w:sdt><w:bookmarkStart/>`,
      ),
      {
        rels: [
          ['l1', 'hyperlink', 'https://x.example/', true],
          ['l2', 'other', 'inner.xml'],
        ],
      },
    );
    expect(textOf(para)).toBe('abcdef');
    const styles = para.inlines.flatMap((i) =>
      i.kind === 'text' ? [i.style.link] : [],
    );
    expect(styles[0]).toBe('https://x.example/');
    expect(styles[1]).toBeUndefined();
  });

  const field = (code: string, result: string) =>
    r('<w:fldChar w:fldCharType="begin"/>') +
    r(`<w:instrText>${code}</w:instrText>`) +
    r('<w:fldChar w:fldCharType="separate"/>') +
    r(t(result)) +
    r('<w:fldChar w:fldCharType="end"/>');

  it('makes page fields live and keeps other results', () => {
    const para = first(
      p(
        field(' PAGE ', '9') +
          field(' NUMPAGES ', '9') +
          field(' DATE ', 'today') +
          field(' HYPERLINK "https://y.example/" ', 'go') +
          field(' HYPERLINK \\l "here" ', 'local'),
      ),
    );
    const fields = para.inlines.filter((i) => i.kind === 'field');
    expect(fields.map((f) => f.kind === 'field' && f.field)).toEqual([
      'page',
      'pages',
    ]);
    expect(textOf(para)).toBe('todaygolocal');
    const links = para.inlines.flatMap((i) =>
      i.kind === 'text' ? [i.style.link] : [],
    );
    expect(links).toEqual([undefined, 'https://y.example/', undefined]);
  });

  it('closes a field with no separator and reads simple fields', () => {
    const para = first(
      p(
        r('<w:fldChar w:fldCharType="begin"/>') +
          r('<w:instrText>PAGE</w:instrText>') +
          r('<w:fldChar w:fldCharType="end"/>') +
          `<w:fldSimple w:instr=" NUMPAGES ">${r(t('3'))}</w:fldSimple><w:fldSimple w:instr=" PAGE "><w:r/></w:fldSimple><w:fldSimple w:instr=" TIME ">${r(t('noon'))}</w:fldSimple>`,
      ),
    );
    expect(para.inlines.map((i) => i.kind)).toEqual([
      'field',
      'field',
      'field',
      'text',
    ]);
  });

  it('prints page numbers while laying out', () => {
    const { document } = read(
      p(
        r('<w:fldChar w:fldCharType="begin"/>') +
          r('<w:instrText>PAGE</w:instrText>') +
          r('<w:fldChar w:fldCharType="end"/>') +
          r(t('/')) +
          `<w:fldSimple w:instr="NUMPAGES"/>`,
      ) + p(r(t('next')), '<w:pageBreakBefore/>'),
    );
    expect(texts(layout(document)[0]).join('')).toBe('1/2');
  });

  it('reports what it does not draw', () => {
    const issueOf = (inner: string) =>
      read(p(r(inner))).issues.map((i) => i.detail);
    expect(issueOf('<w:pict/>')).toContain('pict');
    expect(issueOf('<w:object/>')).toContain('object');
    expect(
      issueOf(
        '<mc:AlternateContent xmlns:mc="m"><mc:Choice><w:pict/></mc:Choice></mc:AlternateContent>',
      ),
    ).toContain('pict');
    expect(
      read(p(r(t('x')), '<w:bidi/>')).issues.map((i) => i.detail),
    ).toContain('right-to-left paragraph layout');
  });
});

describe('drawings', () => {
  const graphic = (embed: string) =>
    `<a:graphic><a:graphicData><pic:pic><pic:blipFill><a:blip ${embed}/><a:srcRect t="10000"/></pic:blipFill></pic:pic></a:graphicData></a:graphic>`;
  const inline = (inner: string) =>
    `<w:drawing><wp:inline><wp:extent cx="127000" cy="254000"/><wp:docPr descr="alt"/>${inner}</wp:inline></w:drawing>`;
  const anchor = (inner: string, wrap = '<wp:wrapSquare/>', behind = '0') =>
    `<w:drawing><wp:anchor distL="12700" behindDoc="${behind}"><wp:positionH relativeFrom="page"><wp:posOffset>12700</wp:posOffset></wp:positionH><wp:positionV relativeFrom="margin"><wp:align>bottom</wp:align></wp:positionV><wp:extent cx="127000" cy="127000"/>${wrap}${inner}</wp:anchor></w:drawing>`;
  const picturePart = {
    extra: { 'word/media/a.png': 'PNG', 'word/media/b.wmf': 'WMF' },
    rels: [
      ['p1', 'image', 'media/a.png'],
      ['p2', 'image', 'https://x.example/a.png', true],
      ['p3', 'image', 'media/none.png'],
      ['p4', 'image', 'media/b.wmf'],
    ] as Rel[],
  };

  it('reads an inline picture with its crop', () => {
    const { document } = read(
      p(r(inline(graphic('r:embed="p1"')))),
      picturePart,
    );
    const para = document.sections[0].blocks[0] as OgeWordParagraph;
    expect(para.inlines[0]).toMatchObject({
      kind: 'picture',
      width: 10,
      height: 20,
      description: 'alt',
      picture: { crop: { top: 0.1 } },
    });
    expect(document.media.size).toBe(1);
  });

  it.each([
    ['r:link="p1"', 'drawing-not-shown'],
    ['r:embed="p2"', 'missing-part'],
    ['r:embed="p3"', 'missing-part'],
    ['r:embed="p4"', 'picture-format-not-shown'],
  ])('reports %s', (attribute, code) => {
    const { issues } = read(p(r(inline(graphic(attribute)))), picturePart);
    expect(issues.map((i) => i.code)).toContain(code);
  });

  it.each([
    ['<wp:wrapSquare/>', 'square'],
    ['<wp:wrapTight/>', 'square'],
    ['<wp:wrapThrough/>', 'square'],
    ['<wp:wrapTopAndBottom/>', 'topAndBottom'],
    ['<wp:wrapNone/>', 'none'],
  ])('reads wrap %s', (wrap, expected) => {
    const para = first(
      p(r(anchor(graphic('r:embed="p1"'), wrap, '1'))),
      picturePart,
    );
    const float = para.inlines[0];
    expect(float.kind === 'float' && float.float).toMatchObject({
      wrap: expected,
      behind: true,
      horizontal: { from: 'page', offset: 1 },
      vertical: { from: 'margin', offset: null, align: 'bottom' },
      distance: { left: 1 },
    });
  });

  const shape = (spPr: string, style = '', body = '<wps:bodyPr/>') =>
    `<a:graphic><a:graphicData><wps:wsp><wps:spPr>${spPr}</wps:spPr>${style}${body}</wps:wsp></a:graphicData></a:graphic>`;

  it('reads a text box shape', () => {
    const para = first(
      p(
        r(
          anchor(
            shape(
              '<a:prstGeom prst="ellipse"><a:avLst><a:gd name="adj" fmla="val 100"/><a:gd name="x" fmla="other"/></a:avLst></a:prstGeom><a:solidFill><a:srgbClr val="FF0000"/></a:solidFill><a:ln w="25400"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill></a:ln>',
              '',
              `<wps:txbx><w:txbxContent>${p(r(t('inner')))}</w:txbxContent></wps:txbx><wps:bodyPr lIns="12700" anchor="ctr"/>`,
            ),
          ),
        ),
      ),
    );
    const float = para.inlines[0];
    if (float.kind !== 'float') throw new Error('no float');
    expect(float.float.shape).toMatchObject({
      geometry: 'ellipse',
      adjust: { adj: 100 },
      fill: 'FF0000',
      line: { width: 2, color: '000000' },
      insets: { left: 1 },
      anchor: 'center',
    });
    expect(textOf(float.float.shape?.blocks[0] as OgeWordParagraph)).toBe(
      'inner',
    );
  });

  it('falls back to the style’s colours, and honours no fill', () => {
    const style = (fill: string, line: string) =>
      `<wps:style><a:lnRef idx="${line}"><a:srgbClr val="111111"/></a:lnRef><a:fillRef idx="${fill}"><a:srgbClr val="222222"/></a:fillRef></wps:style>`;
    const floatOf = (spPr: string, s: string, body?: string) => {
      const inline = first(p(r(anchor(shape(spPr, s, body))))).inlines[0];
      if (inline.kind !== 'float') throw new Error('no float');
      return inline.float.shape;
    };
    expect(floatOf('', style('1', '1'))).toMatchObject({
      geometry: 'rect',
      fill: '222222',
      line: { color: '111111', width: 1 },
    });
    expect(floatOf('', style('0', '0'))).toMatchObject({
      fill: null,
      line: null,
    });
    expect(
      floatOf('<a:noFill/><a:ln><a:noFill/></a:ln>', style('1', '1')),
    ).toMatchObject({ fill: null, line: null });
    expect(floatOf('', '', '<wps:bodyPr anchor="b"/>')?.anchor).toBe('bottom');
  });

  it('reports inline and unknown shapes', () => {
    expect(read(p(r(inline(shape(''))))).issues.map((i) => i.detail)).toContain(
      'inline shape',
    );
    expect(
      read(p(r(anchor(shape('<a:prstGeom prst="cloud"/>'))))).issues.map(
        (i) => i.detail,
      ),
    ).toContain('geometry cloud');
  });

  const chartGraphic = (id: string) =>
    `<a:graphic><a:graphicData><c:chart r:id="${id}"/></a:graphicData></a:graphic>`;
  const columnChart = (title: string, kind = 'barChart') =>
    `<c:chartSpace ${NS.replace('xmlns:c="c"', '')} xmlns:c="c"><c:chart>${title}<c:plotArea><c:${kind}><c:barDir val="col"/><c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:strCache><c:pt idx="0"><c:v>Only</c:v></c:pt></c:strCache></c:tx><c:val><c:numCache><c:ptCount val="1"/><c:pt idx="0"><c:v>2</c:v></c:pt></c:numCache></c:val></c:ser></c:${kind}></c:plotArea></c:chart></c:chartSpace>`;

  it('reads an inline chart, naming an empty title after its series', () => {
    const para = first(p(r(inline(chartGraphic('c1')))), {
      extra: { 'word/chart1.xml': columnChart('<c:title/>') },
      rels: [['c1', 'chart', 'chart1.xml']],
    });
    const chart = para.inlines[0];
    if (chart.kind !== 'chart') throw new Error('no chart');
    expect(chart.chart.title?.text?.text).toBeDefined();
    const { document } = read(p(r(inline(chartGraphic('c1')))), {
      extra: { 'word/chart1.xml': columnChart('') },
      rels: [['c1', 'chart', 'chart1.xml']],
    });
    expect(layout(document)[0].render.nodes.length).toBeGreaterThan(1);
  });

  it('reports a chart it cannot read or draw', () => {
    expect(
      read(p(r(inline(chartGraphic('nope'))))).issues.map((i) => i.detail),
    ).toContain('chart');
    expect(
      read(p(r(inline(chartGraphic('c1')))), {
        extra: { 'word/chart1.xml': columnChart('', 'surfaceChart') },
        rels: [['c1', 'chart', 'chart1.xml']],
      }).issues.map((i) => i.code),
    ).toContain('chart-type-not-shown');
  });
});

describe('tables', () => {
  const styles = `<w:styles ${W}>
<w:style w:type="table" w:styleId="T"><w:pPr><w:spacing w:after="0"/></w:pPr><w:rPr><w:sz w:val="16"/></w:rPr><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="8" w:color="111111"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="dotted" w:sz="4"/></w:tblBorders><w:tblCellMar><w:left w:w="20"/><w:top w:w="40"/></w:tblCellMar></w:tblPr><w:tcPr><w:shd w:fill="EEEEEE"/></w:tcPr>
<w:tblStylePr w:type="firstRow"><w:rPr><w:b/></w:rPr><w:tcPr><w:shd w:fill="000080"/></w:tcPr></w:tblStylePr>
<w:tblStylePr w:type="lastRow"><w:tcPr><w:shd w:fill="008000"/></w:tcPr></w:tblStylePr>
<w:tblStylePr w:type="firstCol"><w:rPr><w:i/></w:rPr></w:tblStylePr>
<w:tblStylePr w:type="lastCol"><w:rPr><w:strike/></w:rPr></w:tblStylePr>
<w:tblStylePr w:type="band1Horz"><w:tcPr><w:shd w:fill="111111"/></w:tcPr></w:tblStylePr>
<w:tblStylePr w:type="band2Horz"><w:tcPr><w:shd w:fill="222222"/></w:tcPr></w:tblStylePr>
<w:tblStylePr w:type="band1Vert"><w:pPr><w:jc w:val="right"/></w:pPr></w:tblStylePr>
</w:style></w:styles>`;
  const cell = (tcPr = '', text = 'c') =>
    `<w:tc><w:tcPr>${tcPr}</w:tcPr>${p(r(t(text)))}</w:tc>`;
  const row = (cells: string, trPr = '', extra = '') =>
    `<w:tr>${extra}<w:trPr>${trPr}</w:trPr>${cells}</w:tr>`;
  const table = (rows: string, tblPr: string) =>
    `<w:tbl><w:tblPr>${tblPr}</w:tblPr><w:tblGrid><w:gridCol w:w="2000"/><w:gridCol w:w="2000"/></w:tblGrid>${rows}</w:tbl>`;
  const tableOf = (rows: string, tblPr: string): OgeWordTable =>
    read(table(rows, tblPr), { styles }).document.sections[0]
      .blocks[0] as OgeWordTable;
  const look =
    '<w:tblStyle w:val="T"/><w:tblLook w:firstRow="1" w:lastRow="1" w:firstColumn="1" w:lastColumn="1" w:noHBand="0" w:noVBand="0"/>';

  it('applies the conditional parts in Word’s order', () => {
    const rows = table(
      [
        row(cell() + cell()),
        row(cell() + cell()),
        row(cell() + cell()),
        row(cell() + cell()),
      ].join(''),
      look,
    );
    const t0 = read(rows, { styles }).document.sections[0]
      .blocks[0] as OgeWordTable;
    expect(t0.rows.map((r0) => r0.cells[1].shading)).toEqual([
      '000080',
      '111111',
      '222222',
      '008000',
    ]);
    const runOf = (r0: number, c: number) => {
      const para = t0.rows[r0].cells[c].blocks[0] as OgeWordParagraph;
      return para.inlines[0].kind === 'text'
        ? para.inlines[0].style
        : undefined;
    };
    expect(runOf(0, 0)).toMatchObject({ bold: true, italic: true, size: 8 });
    expect(runOf(1, 1)).toMatchObject({ strike: true, bold: false });
    expect((t0.rows[1].cells[0].blocks[0] as OgeWordParagraph).align).toBe(
      'right',
    );
    expect((t0.rows[1].cells[1].blocks[0] as OgeWordParagraph).align).toBe(
      'left',
    );
  });

  it('reads the look from its bit mask', () => {
    const t0 = tableOf(
      row(cell() + cell()) + row(cell() + cell()),
      '<w:tblStyle w:val="T"/><w:tblLook w:val="0020"/>',
    );
    expect(t0.rows[0].cells[0].shading).toBe('000080');
  });

  it('places table borders on inner and outer edges', () => {
    const t0 = tableOf(
      row(cell() + cell()) + row(cell() + cell()),
      '<w:tblStyle w:val="T"/>',
    );
    expect(t0.rows[0].cells[0].borders.top?.color).toBe('111111');
    expect(t0.rows[1].cells[0].borders.top?.width).toBe(0.5);
    expect(t0.rows[0].cells[0].borders.right?.style).toBe('dotted');
    expect(t0.rows[0].cells[0].margins).toMatchObject({ left: 1, top: 2 });
  });

  it('lets table and cell settings override the style', () => {
    const t0 = tableOf(
      row(
        cell(
          '<w:shd w:fill="ABCDEF"/><w:tcBorders><w:top w:val="nil"/><w:bottom w:val="single" w:sz="16" w:color="FF0000"/><w:left/></w:tcBorders><w:tcMar><w:left w:w="100"/></w:tcMar><w:vAlign w:val="center"/><w:gridSpan w:val="2"/>',
        ),
        '<w:trHeight w:val="400"/><w:tblHeader/><w:cantSplit/>',
        '<w:tblPrEx><w:tblCellMar><w:right w:w="60"/></w:tblCellMar></w:tblPrEx>',
      ) +
        row(
          cell('<w:vMerge w:val="restart"/><w:vAlign w:val="bottom"/>') +
            cell('<w:vMerge/>'),
          '<w:trHeight w:val="300" w:hRule="exact"/><w:gridBefore w:val="0"/>',
        ) +
        row(
          cell(),
          '<w:trHeight w:val="300" w:hRule="auto"/><w:gridBefore w:val="1"/>',
        ),
      '<w:tblStyle w:val="T"/><w:tblBorders><w:top w:val="none"/></w:tblBorders><w:tblCellMar><w:right w:w="80"/></w:tblCellMar><w:tblInd w:w="100"/><w:jc w:val="center"/>',
    );
    const head = t0.rows[0];
    expect(head).toMatchObject({
      height: 20,
      heightRule: 'atLeast',
      header: true,
      cantSplit: true,
    });
    expect(head.cells[0]).toMatchObject({
      columnSpan: 2,
      shading: 'ABCDEF',
      verticalAlign: 'center',
    });
    expect(head.cells[0].borders.top).toBeUndefined();
    expect(head.cells[0].borders.bottom?.color).toBe('FF0000');
    expect(head.cells[0].margins).toMatchObject({ left: 5, right: 3 });
    expect(t0.rows[1].cells[0]).toMatchObject({
      verticalMerge: 'restart',
      verticalAlign: 'bottom',
    });
    expect(t0.rows[1].cells[1].verticalMerge).toBe('continue');
    expect(t0.rows[1].heightRule).toBe('exact');
    expect(t0.rows[2]).toMatchObject({ heightRule: 'auto', skipBefore: 1 });
    expect(t0).toMatchObject({ indent: 5, align: 'center' });
  });

  it('lays out merges, alignments and repeated headers', () => {
    const many = Array.from({ length: 100 }, () => row(cell() + cell())).join(
      '',
    );
    const { document } = read(
      table(
        row(cell('', 'head') + cell(), '<w:tblHeader/>') +
          row(
            cell(
              '<w:vMerge w:val="restart"/><w:vAlign w:val="center"/>',
              'merged',
            ) + cell(),
          ) +
          row(cell('<w:vMerge/>') + cell('<w:vAlign w:val="bottom"/>')) +
          many,
        '<w:jc w:val="right"/>',
      ) +
        table(
          row(cell() + cell()),
          '<w:jc w:val="center"/><w:tblStyle w:val="T"/>',
        ),
      { styles },
    );
    const pages = layout(document);
    expect(pages.length).toBeGreaterThan(1);
    expect(texts(pages[1])).toContain('head');
    expect(texts(pages[0])).toContain('merged');
  });
});

describe('sections, headers and notes', () => {
  const header = (text: string, name: string) => ({
    [`word/${name}.xml`]: `<w:hdr ${NS}>${p(r(t(text)))}</w:hdr>`,
  });
  const reference = (kind: string, type: string, id: string) =>
    `<w:${kind}Reference w:type="${type}" r:id="${id}"/>`;
  const parts: Parts = {
    extra: {
      ...header('default', 'h1'),
      ...header('first', 'h2'),
      ...header('even', 'h3'),
      ...header('foot', 'f1'),
    },
    rels: [
      ['h1', 'header', 'h1.xml'],
      ['h2', 'header', 'h2.xml'],
      ['h3', 'header', 'h3.xml'],
      ['f1', 'footer', 'f1.xml'],
      ['gone', 'header', 'missing.xml'],
    ],
    settings: `<w:settings ${W}><w:defaultTabStop w:val="360"/><w:evenAndOddHeaders/></w:settings>`,
  };
  const sect = (inner: string) =>
    `<w:sectPr>${inner}<w:pgSz w:w="6000" w:h="4000"/><w:pgMar w:top="400" w:bottom="400" w:left="400" w:right="400" w:header="100" w:footer="100"/></w:sectPr>`;

  it('picks first, even and default headers, and footers', () => {
    const body =
      p(r(t('one'))) +
      p(r(t('two')), '<w:pageBreakBefore/>') +
      p(r(t('three')), '<w:pageBreakBefore/>') +
      sect(
        reference('header', 'default', 'h1') +
          reference('header', 'first', 'h2') +
          reference('header', 'even', 'h3') +
          reference('footer', 'default', 'f1') +
          reference('header', 'odd', 'gone') +
          '<w:titlePg/>',
      );
    const { document, issues } = read(body, parts);
    expect(document.defaultTab).toBe(18);
    expect(document.evenAndOddHeaders).toBe(true);
    expect(issues.map((i) => i.code)).toEqual(['missing-part']);
    const pages = layout(document);
    expect(texts(pages[0])).toContain('first');
    expect(texts(pages[1])).toContain('even');
    expect(texts(pages[2])).toContain('default');
    expect(texts(pages[2])).toContain('foot');
  });

  it('inherits headers and handles section types', () => {
    const body =
      p(r(t('a')), sect(reference('header', 'default', 'h1'))) +
      p(r(t('b')), `${sect('<w:type w:val="continuous"/>')}`) +
      p(r(t('c')), `${sect('<w:type w:val="evenPage"/>')}`) +
      p(r(t('d')), `${sect('<w:type w:val="oddPage"/>')}`) +
      `<w:sdt><w:sdtContent>${p(r(t('e')))}</w:sdtContent></w:sdt>` +
      sect('');
    const { document } = read(body, parts);
    expect(document.sections.map((s) => s.type)).toEqual([
      'nextPage',
      'continuous',
      'evenPage',
      'oddPage',
      'nextPage',
    ]);
    expect(document.sections[3].headers.default).toBeDefined();
    expect(layout(document).length).toBeGreaterThan(3);
  });

  it('flows through columns and column breaks', () => {
    const lines = Array.from({ length: 30 }, (_, i) => p(r(t(`n${i}`)))).join(
      '',
    );
    const { document } = read(
      lines +
        p(r('<w:br w:type="column"/>') + r(t('after'))) +
        sect('<w:cols w:num="2" w:space="200"/>'),
    );
    const pages = layout(document);
    const xs = new Set(pages[0].lines.map((l) => Math.round(l.x)));
    expect(xs.size).toBe(2);
  });

  it('defaults an empty document', () => {
    const { document } = read('');
    expect(document.sections).toHaveLength(1);
    expect(document.sections[0].page).toMatchObject({
      width: 612,
      height: 792,
    });
    expect(layout(document)).toHaveLength(1);
  });

  it('reads footnotes, skipping separators, and sets them at the foot', () => {
    const note = (id: string, type = '') =>
      `<w:footnote w:id="${id}"${type}>${p(r('<w:footnoteRef/>') + r(t(' note ' + id)))}</w:footnote>`;
    const { document } = read(
      p(
        r(t('body')) +
          r('<w:footnoteReference w:id="2"/>') +
          r('<w:footnoteReference w:id="9"/>') +
          r('<w:footnoteReference/>'),
      ),
      {
        footnotes: `<w:footnotes ${NS}>${note('0', ' w:type="separator"')}${note('1', ' w:type="continuationSeparator"')}${note('2')}<w:footnote/></w:footnotes>`,
      },
    );
    expect([...document.footnotes.keys()]).toEqual(['2']);
    const rendered = texts(layout(document)[0]).join(' ');
    expect(rendered).toContain('note 2');
  });
});

describe('layout paths', () => {
  const justified = 'word '.repeat(60);

  const run = (inlines: OgeWordInline[]) => inlines;
  void run;

  it('centres, right-aligns and justifies', () => {
    const { document } = read(
      p(r(t('c')), '<w:jc w:val="center"/>') +
        p(r(t('r')), '<w:jc w:val="right"/>') +
        p(r(t(justified)), '<w:jc w:val="both"/>'),
    );
    const lines = layout(document)[0].lines;
    expect(lines[0].x).toBeGreaterThan(200);
    expect(lines[1].x).toBeGreaterThan(lines[0].x);
    expect(lines[2].x).toBe(72);
  });

  it('honours tab stops of every alignment, with a leader', () => {
    const { document } = read(
      p(
        r(
          `<w:tab/>${t('R')}<w:tab/>${t('C')}<w:tab/>${t('L')}<w:tab/>${t('D')}`,
        ),
        '<w:tabs><w:tab w:val="right" w:pos="1440" w:leader="dot"/><w:tab w:val="center" w:pos="4320" w:leader="hyphen"/><w:tab w:val="left" w:pos="5760" w:leader="underscore"/></w:tabs>',
      ),
    );
    const nodes = layout(document)[0].render.nodes as {
      kind: string;
      text?: string;
      x?: number;
    }[];
    const at = (text: string) => nodes.find((n) => n.text === text)?.x ?? 0;
    expect(at('R')).toBeCloseTo(72 + 72 - 5, 0);
    expect(at('C')).toBeCloseTo(72 + 216 - 2.5, 0);

    expect(nodes.some((n) => n.text?.startsWith('...'))).toBe(true);
    expect(nodes.some((n) => n.text?.startsWith('---'))).toBe(true);
    expect(nodes.some((n) => n.text?.startsWith('___'))).toBe(true);
  });

  it('draws shading, borders, backgrounds and decoration', () => {
    const { document } = read(
      p(
        r(
          t('hi there'),
          '<w:highlight w:val="yellow"/><w:u w:val="single"/><w:strike/>',
        ) +
          r(t('sup'), '<w:vertAlign w:val="superscript"/>') +
          r(t('sub'), '<w:vertAlign w:val="subscript"/>') +
          `<w:hyperlink r:id="l">${r(t('javascript'))}</w:hyperlink>`,
        '<w:shd w:fill="ABCDEF"/><w:pBdr><w:top w:val="single" w:sz="8"/><w:left w:val="single"/><w:bottom w:val="dashed"/><w:right w:val="dotted"/></w:pBdr>',
      ),
      { rels: [['l', 'hyperlink', 'javascript:alert(1)', true]] },
    );
    const nodes = layout(document)[0].render.nodes as {
      kind: string;
      text?: string;
      decoration?: string | null;
      link?: string | null;
      y?: number;
      dash?: string | null;
      stroke?: unknown;
    }[];
    const texts0 = nodes.filter((n) => n.kind === 'text');
    expect(texts0[0].decoration).toBe('underline line-through');
    const y = (text: string) => nodes.find((n) => n.text === text)?.y ?? 0;
    expect(y('sup')).toBeLessThan(y('hi there'));
    expect(y('sub')).toBeGreaterThan(y('hi there'));
    expect(nodes.find((n) => n.text === 'javascript')?.link).toBeNull();
    expect(nodes.filter((n) => n.stroke).length).toBe(4);
    expect(nodes.some((n) => n.dash)).toBe(true);
  });

  it('keeps a heading with the next paragraph', () => {
    const filler = Array.from({ length: 200 }, () => p(r(t('x')))).join('');
    const { document } = read(
      filler +
        p(r(t('heading')), '<w:keepNext/>') +
        p(r(t(justified.repeat(3)))),
    );
    const pages = layout(document);
    const page = pages.findIndex((q) => texts(q).includes('heading'));
    expect(page).toBeGreaterThanOrEqual(0);
    expect(
      pages[page].lines[
        pages[page].lines.findIndex((l) => l.text === 'heading') + 1
      ],
    ).toBeDefined();
  });

  it('keeps lines together and leaves no widow', () => {
    const count = 44;
    const before = Array.from({ length: count }, () => p(r(t('x')))).join('');
    const long = justified.repeat(8);
    const kept = read(before + p(r(t(long)), '<w:keepLines/>'));
    const pages = layout(kept.document);
    expect(pages.length).toBeGreaterThan(1);
    const widowed = read(before + p(r(t(long))));
    const flowed = layout(widowed.document);
    for (const page of flowed) {
      expect(page.lines.length === 0 || page.lines.length > 1).toBe(true);
    }
    const free = read(before + p(r(t(long)), '<w:widowControl w:val="0"/>'));
    expect(layout(free.document).length).toBeGreaterThan(0);
  });

  it('breaks a page inside a paragraph and a too-long word', () => {
    const { document } = read(
      p(r(t('a')) + r('<w:br w:type="page"/>') + r(t('b'))) +
        p(r(t('y'.repeat(400)))) +
        p(r(t('split-word-'.repeat(30)))),
    );
    const pages = layout(document);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages[1].lines.length).toBeGreaterThan(2);
  });

  it('places exact, atLeast and multiple spacing', () => {
    const heights = (pPr: string) => {
      const { document } = read(p(r(t('x')), pPr));
      return layout(document)[0].lines[0].height;
    };
    expect(heights('<w:spacing w:line="400" w:lineRule="exact"/>')).toBe(20);
    expect(heights('<w:spacing w:line="800" w:lineRule="atLeast"/>')).toBe(40);
    expect(heights('<w:spacing w:line="480" w:lineRule="auto"/>')).toBeCloseTo(
      2 * 10 * 1.2207,
      2,
    );
  });

  it('gives an empty paragraph its mark’s height', () => {
    const { document } = read(p('', '<w:rPr><w:sz w:val="40"/></w:rPr>'));
    expect(layout(document)[0].lines[0].height).toBeCloseTo(20 * 1.2207, 2);
  });

  it('drops the gap between same-style contextual paragraphs', () => {
    const { document } = read(
      p(r(t('a')), '<w:spacing w:after="400"/><w:contextualSpacing/>') +
        p(r(t('b')), '<w:spacing w:before="400"/><w:contextualSpacing/>'),
    );
    const [a, b] = layout(document)[0].lines;
    expect(b.top).toBeCloseTo(a.top + a.height, 3);
  });

  it('wraps above and below a top-and-bottom float, and places by align', () => {
    const picture = {
      extra: { 'word/media/a.png': 'PNG' },
      rels: [['p1', 'image', 'media/a.png']] as Rel[],
    };
    const float = (h: string, v: string, wrap: string) =>
      r(
        `<w:drawing><wp:anchor><wp:positionH relativeFrom="${h}"><wp:align>center</wp:align></wp:positionH><wp:positionV relativeFrom="${v}"><wp:align>top</wp:align></wp:positionV><wp:extent cx="1270000" cy="635000"/>${wrap}<a:graphic><a:graphicData><pic:pic><pic:blipFill><a:blip r:embed="p1"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing>`,
      );
    const { document } = read(
      p(float('margin', 'margin', '<wp:wrapTopAndBottom/>') + r(t(justified))),
      picture,
    );
    const page = layout(document)[0];
    expect(page.lines[0].top).toBeGreaterThanOrEqual(72 + 50);
    const right = read(
      p(float('column', 'page', '<wp:wrapSquare/>') + r(t(justified))),
      picture,
    );
    expect(layout(right.document)[0].lines.length).toBeGreaterThan(0);
    const left = read(
      p(
        r(
          `<w:drawing><wp:anchor><wp:positionH relativeFrom="margin"><wp:align>right</wp:align></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:align>bottom</wp:align></wp:positionV><wp:extent cx="1270000" cy="635000"/><wp:wrapSquare/><a:graphic><a:graphicData><pic:pic><pic:blipFill><a:blip r:embed="p1"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing>`,
        ) + r(t(justified)),
      ),
      picture,
    );
    expect(layout(left.document)[0].lines.length).toBeGreaterThan(0);
  });

  it('pushes the body below a tall header and above a tall footer', () => {
    const tall = Array.from({ length: 8 }, () => p(r(t('h')))).join('');
    const { document } = read(
      p(r(t('body'))) +
        `<w:sectPr><w:headerReference w:type="default" r:id="h1"/><w:footerReference w:type="default" r:id="f1"/></w:sectPr>`,
      {
        extra: {
          'word/h1.xml': `<w:hdr ${NS}>${tall}</w:hdr>`,
          'word/f1.xml': `<w:ftr ${NS}>${tall}</w:ftr>`,
        },
        rels: [
          ['h1', 'header', 'h1.xml'],
          ['f1', 'footer', 'f1.xml'],
        ],
      },
    );
    const page = layout(document)[0];
    const body = page.lines[0];
    expect(body.text).toBe('body');
    expect(body.top).toBeGreaterThan(72);
  });
});
