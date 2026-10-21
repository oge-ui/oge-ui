/**
 * The codec's less travelled paths: UTF-16 parts, odd relationship targets,
 * missing and damaged parts, style elements written every legal way.
 */
import { buildXlsxFixture, type XlsxFixture } from '../../testing/xlsx-fixture';
import { writeOgeZipSync } from '../zip/zip';
import { OgePackageParts, ogeResolvePartPath } from './package';
import { readOgeXlsxSync } from './read-xlsx';
import { readOgeStyleSheet } from './read-styles';
import { parseOgeXmlTree } from './xml-tree';
import { ogeFormatLocale } from '../format/format-locale';

const encoder = new TextEncoder();
const parts = (entries: Record<string, string | Uint8Array>) =>
  new OgePackageParts(
    new Map(
      Object.entries(entries).map(([k, v]) => [
        k,
        typeof v === 'string' ? encoder.encode(v) : v,
      ]),
    ),
  );

describe('OgePackageParts', () => {
  it('decodes UTF-16 parts by their byte-order mark', () => {
    const le = new Uint8Array([
      0xff,
      0xfe,
      ...Array.from('<a/>').flatMap((c) => [c.charCodeAt(0), 0]),
    ]);
    const be = new Uint8Array([
      0xfe,
      0xff,
      ...Array.from('<b/>').flatMap((c) => [0, c.charCodeAt(0)]),
    ]);
    const pkg = parts({ 'le.xml': le, 'be.xml': be });
    expect(pkg.text('LE.XML')).toBe('<a/>');
    expect(pkg.text('be.xml')).toBe('<b/>');
    expect(pkg.text('missing.xml')).toBeUndefined();
    expect(pkg.storedName('Le.Xml')).toBe('le.xml');
    expect(pkg.hasContentTypes).toBe(false);
    expect(pkg.contentType('noextension')).toBeUndefined();
  });

  it('resolves targets: relative, absolute, climbing, escaped, with a fragment', () => {
    expect(ogeResolvePartPath('xl/worksheets/', '../media/a.png')).toBe(
      'xl/media/a.png',
    );
    expect(ogeResolvePartPath('xl/', '/docProps/core.xml')).toBe(
      'docProps/core.xml',
    );
    expect(ogeResolvePartPath('xl/', '../../../escape.xml')).toBe('escape.xml');
    expect(ogeResolvePartPath('xl/', 'a%20b.xml')).toBe('xl/a b.xml');
    expect(ogeResolvePartPath('xl/', 'bad%zz.xml')).toBe('xl/bad%zz.xml');
    expect(ogeResolvePartPath('xl/', './x.xml#frag')).toBe('xl/x.xml');
  });

  it('reads relationships, skipping incomplete ones, and caches them', () => {
    const pkg = parts({
      'xl/_rels/workbook.xml.rels':
        '<Relationships><Relationship Id="a" Type="t/styles" Target="styles.xml"/><Relationship Type="t/x" Target="no-id"/><Relationship Id="b" Type="t/y"/></Relationships>',
    });
    expect(pkg.relationships('xl/workbook.xml')).toEqual([
      {
        id: 'a',
        type: 'styles',
        typeUri: 't/styles',
        target: 'xl/styles.xml',
        external: false,
      },
    ]);
    expect(pkg.relationships('xl/workbook.xml')).toBe(
      pkg.relationships('XL/WORKBOOK.XML'),
    );
    expect(pkg.relationshipOfType('xl/workbook.xml', 'theme')).toBeUndefined();
    expect(pkg.relationships('nofolder.xml')).toEqual([]);
  });
});

describe('readOgeXlsx — damaged and minimal packages', () => {
  it('reads a workbook with no styles, theme or strings part', () => {
    const files: [string, string][] = [
      [
        '_rels/.rels',
        '<Relationships><Relationship Id="r" Type="x/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      ],
      [
        'xl/workbook.xml',
        '<workbook><sheets><sheet name="Only" sheetId="1" r:id="s"/></sheets></workbook>',
      ],
      [
        'xl/_rels/workbook.xml.rels',
        '<Relationships><Relationship Id="s" Type="x/worksheet" Target="sheet.xml"/></Relationships>',
      ],
      [
        'xl/sheet.xml',
        '<worksheet><sheetData><row r="1"><c r="A1" s="3"><v>1</v></c></row></sheetData></worksheet>',
      ],
    ];
    const { workbook, issues } = readOgeXlsxSync(
      writeOgeZipSync(
        files.map(([name, text]) => ({ name, data: encoder.encode(text) })),
      ),
    );
    expect(workbook.sheets[0].getValue(0, 0)).toBe(1);
    expect(workbook.defaultFont.name).toBe('Calibri');
    expect(issues.map((i) => i.code)).toEqual(['invalid-style']);
  });

  it('reports missing and malformed parts it was pointed at', () => {
    const fixture: XlsxFixture = {
      sheets: [{ name: 'S', xml: '<sheetData/>' }],
      theme: '<a:theme><unclosed></a:theme>',
      workbookRels: [{ type: 'chartsheet', target: 'chartsheets/sheet1.xml' }],
      workbookTail:
        '<definedNames><definedName name="Local" localSheetId="1">1</definedName></definedNames>',
    };
    const bytes = buildXlsxFixture({
      ...fixture,
      workbookTail: fixture.workbookTail,
    });
    // add a sheet entry pointing at the chart sheet, and a sheet entry with no relationship
    const patched = patchWorkbook(bytes, (xml) =>
      xml.replace(
        '</sheets>',
        `<sheet name="Chart" sheetId="9" r:id="rId4"/><sheet name="Lost" sheetId="10" r:id="rId99"/></sheets>`,
      ),
    );
    const { workbook, issues } = readOgeXlsxSync(patched);
    expect(workbook.sheets.map((s) => s.name)).toEqual(['S']);
    expect(issues.map((i) => i.code)).toEqual([
      'malformed-part',
      'drawing-not-shown',
      'missing-part',
      'invalid-defined-name',
    ]);
  });

  it('reads core properties without app properties, and sheets whose strings part is gone', () => {
    const bytes = buildXlsxFixture({
      sheets: [
        {
          name: 'S',
          xml: '<sheetData><row r="1"><c r="A1" t="s"><v>0</v></c></row></sheetData>',
        },
      ],
      sharedStrings: ['x'],
    });
    const files = unzip(bytes).filter(
      ({ name }) => name !== 'xl/sharedStrings.xml',
    );
    const { issues } = readOgeXlsxSync(writeOgeZipSync(files));
    expect(issues.map((i) => i.code)).toEqual([
      'missing-part',
      'invalid-shared-string',
    ]);
  });
});

describe('readOgeStyleSheet — every legal spelling', () => {
  it('reads fonts, fills, borders and alignment written unusually', () => {
    const root = parseOgeXmlTree(
      '<styleSheet>' +
        '<numFmts><numFmt numFmtId="170" formatCode="General"/><numFmt formatCode="0"/></numFmts>' +
        '<fonts><font><sz val="11"/><name val="Calibri"/></font>' +
        '<font><b val="0"/><u val="none"/><vertAlign val="baseline"/><scheme val="other"/><family val="1"/><charset val="162"/><outline/><shadow val="1"/><sz val="-3"/><color/></font></fonts>' +
        '<fills><fill><patternFill patternType="nonsense"/></fill><fill><gradientFill><stop position="0"/></gradientFill></fill><fill/></fills>' +
        '<borders><border><diagonal style="thin"/></border><border><left style="nonsense"/></border></borders>' +
        '<cellXfs><xf numFmtId="170" fontId="1" fillId="0" borderId="0"><alignment horizontal="start" textRotation="200" readingOrder="1" indent="999"/><protection locked="0"/></xf>' +
        '<xf fontId="9" fillId="2" borderId="1"><alignment horizontal="nonsense" vertical="nonsense"/></xf></cellXfs>' +
        '<dxfs><dxf><fill><patternFill patternType="solid"><fgColor rgb="FF00FF00"/></patternFill></fill></dxf><dxf><fill><patternFill patternType="darkGrid"><fgColor rgb="FF000000"/></patternFill></fill></dxf></dxfs>' +
        '<colors><indexedColors><rgbColor rgb="123456"/></indexedColors></colors>' +
        '</styleSheet>',
    );
    const sheet = readOgeStyleSheet(root);
    expect(sheet.cellFormats[0]).toEqual({
      font: { family: 1, charset: 162, outline: true, shadow: true },
      alignment: { horizontal: 'left', readingOrder: 'ltr', indent: 250 },
      protection: { locked: false },
    });
    expect(sheet.cellFormats[1]).toEqual({});
    expect(sheet.differential).toEqual([
      {
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { rgb: 'FF00FF00' },
        },
      },
      {
        fill: {
          type: 'pattern',
          pattern: 'darkGrid',
          fgColor: { rgb: 'FF000000' },
        },
      },
    ]);
    expect(sheet.indexedColors).toEqual(['123456']);
    expect(sheet.normalFont).toEqual({ size: 11, name: 'Calibri' });
  });
});

describe('format locale separators', () => {
  it('reads the date and time separators of a locale', () => {
    expect(ogeFormatLocale('de-DE')).toMatchObject({
      dateSeparator: '.',
      timeSeparator: ':',
    });
    expect(ogeFormatLocale('en-GB')).toMatchObject({ dateSeparator: '/' });
    expect(ogeFormatLocale('en-US')).toMatchObject({
      dateSeparator: '/',
      timeSeparator: ':',
    });
  });
});

function unzip(bytes: Uint8Array): { name: string; data: Uint8Array }[] {
  // stored entries only (the fixture builder stores)
  const out: { name: string; data: Uint8Array }[] = [];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let at = 0;
  while (at + 30 <= bytes.length && view.getUint32(at, true) === 0x04034b50) {
    const size = view.getUint32(at + 18, true);
    const nameLength = view.getUint16(at + 26, true);
    const name = new TextDecoder().decode(
      bytes.subarray(at + 30, at + 30 + nameLength),
    );
    const start = at + 30 + nameLength;
    out.push({ name, data: bytes.slice(start, start + size) });
    at = start + size;
  }
  return out;
}

function patchWorkbook(
  bytes: Uint8Array,
  change: (xml: string) => string,
): Uint8Array {
  return writeOgeZipSync(
    unzip(bytes).map(({ name, data }) =>
      name === 'xl/workbook.xml'
        ? { name, data: encoder.encode(change(new TextDecoder().decode(data))) }
        : { name, data },
    ),
  );
}

describe('readOgeWorksheet — unusual but legal markup', () => {
  const read = (
    xml: string,
    rels: {
      id: string;
      type: string;
      target: string;
      external?: boolean;
    }[] = [],
  ) =>
    readOgeXlsxSync(buildXlsxFixture({ sheets: [{ name: 'S', xml, rels }] }));

  it('reads lower-case references, whole-row and whole-column ranges, ISO date-times', () => {
    const { workbook, issues } = read(
      '<sheetData><row r="1"><c r="b1"><v>1</v></c><c r="ABCD1"><v>2</v></c>' +
        '<c r="C1" t="d"><v>2024-01-05T06:00:30.5</v></c><c r="D1" t="d"><v>2024-01-05</v></c><c r="E1" t="n"><v> </v></c></row></sheetData>' +
        '<conditionalFormatting sqref="A:B 3:4"><cfRule type="containsBlanks" priority="1"/></conditionalFormatting>',
    );
    const sheet = workbook.sheets[0];
    expect(sheet.getValue(0, 1)).toBe(1);
    expect(sheet.getValue(0, 2)).toBeCloseTo(45296.25035, 5);
    expect(sheet.getValue(0, 3)).toBe(45296);
    expect(sheet.conditionalFormats[0].ranges).toEqual([
      { top: 0, left: 0, bottom: 1048575, right: 1 },
      { top: 2, left: 0, bottom: 3, right: 16383 },
    ]);
    expect(issues.map((i) => i.code).sort()).toEqual([
      'invalid-reference',
      'invalid-value',
    ]);
  });

  it('reads frozen-split panes, a selection without a pane and odd column records', () => {
    const { workbook } = read(
      '<sheetViews><sheetView workbookViewId="0" zoomScale="5"><pane xSplit="1" ySplit="2" state="frozenSplit"/><selection activeCell="C4" sqref="C4"/></sheetView></sheetViews>' +
        '<sheetFormatPr defaultRowHeight="-1" baseColWidth="12"/>' +
        '<cols><col min="5" max="3" width="5"/><col min="16380" max="99999" width="2"/></cols><sheetData/>',
    );
    const sheet = workbook.sheets[0];
    expect(sheet.view).toMatchObject({
      frozenRows: 2,
      frozenColumns: 1,
      zoom: 100,
      activeCell: { row: 3, col: 2 },
    });
    expect(sheet.format.baseColumnWidth).toBe(12);
    expect(sheet.format.defaultRowHeight).toBe(15);
    expect(sheet.getColumn(4)).toMatchObject({ width: 5 });
    expect(sheet.getColumn(16383)).toMatchObject({ width: 2 });
  });

  it('reads data bars and icon sets with defaults, validations of every style', () => {
    const { workbook, issues } = read(
      '<sheetData/>' +
        '<conditionalFormatting sqref="A1:A9"><cfRule type="dataBar" priority="1"><dataBar/></cfRule><cfRule type="iconSet" priority="2"><iconSet/></cfRule>' +
        '<cfRule type="colorScale" priority="3"><colorScale><cfvo type="formula" val="$B$1"/><cfvo type="max"/><color/><color rgb="FF000000"/></colorScale></cfRule></conditionalFormatting>' +
        '<dataValidations><dataValidation type="decimal" errorStyle="information" sqref="A1"/><dataValidation errorStyle="nonsense" sqref="A2"/></dataValidations>' +
        '<pageSetup orientation="sideways"/>',
    );
    const [format] = workbook.sheets[0].conditionalFormats;
    expect(format.rules[0].dataBar).toMatchObject({
      color: { rgb: 'FF638EC6' },
      showValue: true,
      minLength: 10,
      maxLength: 90,
    });
    expect(format.rules[1].iconSet).toMatchObject({
      iconSet: '3TrafficLights1',
      reverse: false,
      showValue: true,
    });
    expect(format.rules[2].colorScale?.colors).toEqual([{ rgb: 'FF000000' }]);
    expect(
      workbook.sheets[0].dataValidations.map((v) => [v.type, v.errorStyle]),
    ).toEqual([
      ['decimal', 'information'],
      ['none', undefined],
    ]);
    expect(workbook.sheets[0].pageSetup.orientation).toBeUndefined();
    // the formula threshold needs the formula engine
    expect(issues.map((i) => i.code)).toEqual([
      'conditional-format-needs-formulas',
    ]);
  });

  it('keeps an external hyperlink with a sub-address, and alternate content', () => {
    const { workbook, issues } = read(
      '<sheetData/><hyperlinks><hyperlink ref="A1" r:id="rId1" location="Part"/></hyperlinks>' +
        '<mc:AlternateContent xmlns:mc="m"><mc:Choice Requires="x14"><controls/></mc:Choice></mc:AlternateContent>',
      [
        {
          id: 'rId1',
          type: 'hyperlink',
          target: 'https://example.com/doc',
          external: true,
        },
      ],
    );
    expect(workbook.sheets[0].hyperlinks[0]).toMatchObject({
      target: 'https://example.com/doc',
      location: 'Part',
    });
    expect(issues.map((i) => i.code)).toEqual(['drawing-not-shown']);
  });
});
