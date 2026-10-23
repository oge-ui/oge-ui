import {
  FIXTURE_DEFAULT_STYLES,
  buildXlsxFixture,
  fixtureCell,
  type XlsxFixture,
} from '../../testing/xlsx-fixture';
import { readOgeZip, readOgeZipEntrySync, writeOgeZipSync } from '../zip/zip';
import { isOgeRichText, ogeCellError } from '../model/cell';
import { OgeXlsxError, readOgeXlsx, readOgeXlsxSync } from './read-xlsx';

const read = (
  fixture: XlsxFixture,
  options?: Parameters<typeof readOgeXlsxSync>[1],
) => readOgeXlsxSync(buildXlsxFixture(fixture), options);

const sheet = (xml: string, extra: Partial<XlsxFixture> = {}): XlsxFixture => ({
  sheets: [{ name: 'Sheet1', xml }],
  ...extra,
});

const codes = (issues: readonly { code: string }[]) =>
  issues.map((i) => i.code);

const STYLES_WITH_FORMATS =
  '<numFmts count="2"><numFmt numFmtId="164" formatCode="0.000"/><numFmt numFmtId="14" formatCode="dd/mm/yyyy"/></numFmts>' +
  '<fonts count="2"><font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font>' +
  '<font><b/><i val="0"/><u val="double"/><strike/><vertAlign val="superscript"/><sz val="14"/><color rgb="FFFF0000"/><name val="Arial"/><scheme val="major"/></font></fonts>' +
  '<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
  '<fill><patternFill patternType="solid"><fgColor theme="4" tint="-0.25"/><bgColor indexed="64"/></patternFill></fill>' +
  '<fill><gradientFill degree="90"><stop position="0"><color rgb="FFFFFFFF"/></stop><stop position="1"><color theme="5"/></stop></gradientFill></fill>' +
  '<fill><gradientFill type="path" left="0.5" right="0.5" top="0.5" bottom="0.5"><stop position="0"><color rgb="FF000000"/></stop><stop position="1"><color rgb="FFFFFFFF"/></stop></gradientFill></fill></fills>' +
  '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' +
  '<border diagonalUp="1"><start style="thin"><color auto="1"/></start><end style="bogus"/><top style="double"><color indexed="10"/></top><bottom/><diagonal style="dashed"/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="164" fontId="1" fillId="2" borderId="1" xfId="0" quotePrefix="1"><alignment horizontal="center" vertical="top" wrapText="1" indent="2" textRotation="255" readingOrder="2" shrinkToFit="1"/><protection locked="0" hidden="1"/></xf>' +
  '<xf numFmtId="14" fontId="0" fillId="3" borderId="0" xfId="0"/>' +
  '<xf numFmtId="15" fontId="0" fillId="4" borderId="0" xfId="0"><alignment horizontal="end"/></xf>' +
  '<xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0"><alignment horizontal="general" vertical="bottom"/><protection locked="1"/></xf>' +
  '<xf numFmtId="30" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  '<dxfs count="2"><dxf><font><b/><color rgb="FF9C0006"/></font><fill><patternFill><bgColor rgb="FFFFC7CE"/></patternFill></fill></dxf>' +
  '<dxf><numFmt numFmtId="170" formatCode="0.0%"/><border><left style="thin"/></border></dxf></dxfs>' +
  '<colors><indexedColors><rgbColor rgb="FF010203"/><rgbColor rgb="FFAABBCC"/></indexedColors></colors>';

describe('readOgeXlsx — cells', () => {
  it('reads every value type', () => {
    const { workbook, issues } = read(
      sheet(
        '<sheetData><row r="1">' +
          fixtureCell('A1', 42.5) +
          fixtureCell('B1', { shared: 0 }) +
          fixtureCell('C1', true) +
          fixtureCell('D1', { error: '#N/A' }) +
          fixtureCell('E1', 'inline') +
          '<c r="F1" t="d"><v>2024-01-05T12:00:00</v></c>' +
          '<c r="G1" t="str"><f>"a"&amp;"b"</f><v>ab</v></c>' +
          '<c r="H1" t="b"><v>false</v></c>' +
          '<c r="I1" t="s"><v>1</v></c>' +
          '</row></sheetData>',
        {
          sharedStrings:
            '<si><t>shared</t></si><si><r><t xml:space="preserve">plain </t></r><r><rPr><b/><sz val="9"/><rFont val="Tahoma"/></rPr><t>bold</t></r><rPh sb="0" eb="1"><t>ふりがな</t></rPh><phoneticPr fontId="0"/></si>',
        },
      ),
    );
    const s = workbook.sheets[0];
    expect(issues).toEqual([]);
    expect(s.getValue(0, 0)).toBe(42.5);
    expect(s.getValue(0, 1)).toBe('shared');
    expect(s.getValue(0, 2)).toBe(true);
    expect(s.getValue(0, 3)).toBe(ogeCellError('#N/A'));
    expect(s.getValue(0, 4)).toBe('inline');
    expect(s.getValue(0, 5)).toBe(45296.5);
    expect(s.getCell(0, 6)).toEqual({ value: 'ab', formula: '"a"&"b"' });
    expect(s.getValue(0, 7)).toBe(false);
    const rich = s.getValue(0, 8);
    expect(isOgeRichText(rich)).toBe(true);
    expect(rich).toEqual({
      kind: 'rich',
      runs: [
        { text: 'plain ' },
        { text: 'bold', font: { bold: true, size: 9, name: 'Tahoma' } },
      ],
    });
  });

  it('decodes _xHHHH_ escapes and keeps inline rich text', () => {
    const { workbook } = read(
      sheet(
        '<sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>tab_x0009_here _x005F_x0041_</t></is></c>' +
          '<c r="B1" t="inlineStr"><is><r><rPr><i/></rPr><t>it</t></r><r><t>al</t></r></is></c></row></sheetData>',
      ),
    );
    const s = workbook.sheets[0];
    expect(s.getValue(0, 0)).toBe('tab\there _x0041_');
    expect(s.getValue(0, 1)).toEqual({
      kind: 'rich',
      runs: [{ text: 'it', font: { italic: true } }, { text: 'al' }],
    });
  });

  it('places cells and rows that omit their reference', () => {
    const { workbook } = read(
      sheet(
        '<sheetData><row><c><v>1</v></c><c><v>2</v></c></row><row r="5"><c r="C5"><v>3</v></c><c><v>4</v></c></row><row><c><v>5</v></c></row></sheetData>',
      ),
    );
    const s = workbook.sheets[0];
    expect([
      s.getValue(0, 0),
      s.getValue(0, 1),
      s.getValue(4, 2),
      s.getValue(4, 3),
      s.getValue(5, 0),
    ]).toEqual([1, 2, 3, 4, 5]);
  });

  it('expands shared formulas, also when a follower comes first', () => {
    const { workbook, issues } = read(
      sheet(
        '<sheetData>' +
          '<row r="1"><c r="B1"><f t="shared" si="7"/><v>9</v></c></row>' +
          '<row r="2"><c r="A2"><f t="shared" ref="A2:B3" si="7">$A$1+A1*SUM(B1:B2)&amp;"A1"</f><v>1</v></c><c r="B2"><f t="shared" si="7"/><v>2</v></c></row>' +
          '<row r="3"><c r="A3"><f t="shared" si="7"/><v>3</v></c><c r="B3"><f t="shared" si="9"/><v>4</v></c></row>' +
          '</sheetData>',
      ),
    );
    const s = workbook.sheets[0];
    expect(s.getCell(1, 0)?.formula).toBe('$A$1+A1*SUM(B1:B2)&"A1"');
    expect(s.getCell(1, 1)?.formula).toBe('$A$1+B1*SUM(C1:C2)&"A1"');
    expect(s.getCell(2, 0)?.formula).toBe('$A$1+A2*SUM(B2:B3)&"A1"');
    // a follower above its master shifts up: A1 → #REF!
    expect(s.getCell(0, 1)?.formula).toBe('$A$1+#REF!*SUM(#REF!)&"A1"');
    expect(s.getCell(2, 1)).toEqual({ value: 4 });
    expect(codes(issues)).toContain('orphan-shared-formula');
  });

  it('reads array, dynamic-array and data-table formulas', () => {
    const { workbook, issues } = read(
      sheet(
        '<sheetData><row r="1"><c r="A1"><f t="array" ref="A1:A2">B1:B2*2</f><v>2</v></c><c r="C1" cm="1"><f t="array" ref="C1:C3">_xlfn.SEQUENCE(3)</f><v>1</v></c>' +
          '<c r="D1"><f t="array">ROW()</f><v>1</v></c><c r="E1"><f t="dataTable" ref="E1:E2" dt2D="1" r1="A1" r2="B1"/><v>0</v></c>' +
          '<c r="F1"><f t="dataTable" ref="F1:F2" dtr="1" r1="A1"/><v>0</v></c><c r="G1"><f t="dataTable" ref="G1:G2" r1="A1"/><v>0</v></c></row></sheetData>',
      ),
    );
    const s = workbook.sheets[0];
    expect(issues).toEqual([]);
    expect(s.getCell(0, 0)).toEqual({
      value: 2,
      formula: 'B1:B2*2',
      array: { range: { top: 0, left: 0, bottom: 1, right: 0 } },
    });
    expect(s.getCell(0, 2)?.array).toEqual({
      range: { top: 0, left: 2, bottom: 2, right: 2 },
      dynamic: true,
    });
    expect(s.getCell(0, 3)?.array).toEqual({
      range: { top: 0, left: 3, bottom: 0, right: 3 },
    });
    expect(s.getCell(0, 4)?.formula).toBe('TABLE(A1,B1)');
    expect(s.getCell(0, 5)?.formula).toBe('TABLE(A1,)');
    expect(s.getCell(0, 6)?.formula).toBe('TABLE(,A1)');
  });

  it('reports what it cannot read and keeps going', () => {
    const { workbook, issues } = read(
      sheet(
        '<sheetData><row r="1"><c r="A1" s="99"><v>1</v></c><c r="B1" t="s"><v>5</v></c><c r="C1"><v>abc</v></c>' +
          '<c r="D1" t="e"><v>#BOGUS!</v></c><c r="E1" t="d"><v>not a date</v></c><c r="Z9Z"><v>1</v></c><c r="XFE1"><v>1</v></c>' +
          '<c r="F1"><f>A1</f></c></row><row r="1048577"><c><v>1</v></c></row></sheetData>',
      ),
    );
    const s = workbook.sheets[0];
    expect(s.getCell(0, 0)).toEqual({ value: 1 });
    expect(s.getCell(0, 1)).toBeUndefined();
    expect(s.getValue(0, 3)).toBe(ogeCellError('#VALUE!'));
    expect(s.getCell(0, 5)).toEqual({ formula: 'A1' });
    // cells with an unreadable reference and rows past the sheet are skipped
    expect(s.cellCount).toBe(3);
    expect(codes(issues).sort()).toEqual(
      [
        'invalid-reference',
        'invalid-shared-string',
        'invalid-style',
        'invalid-value',
        'uncalculated-formulas',
      ].sort(),
    );
    expect(issues.find((i) => i.code === 'invalid-value')?.count).toBe(3);
    expect(issues.find((i) => i.code === 'invalid-style')).toMatchObject({
      sheet: 'Sheet1',
      ref: 'A1',
      severity: 'warning',
    });
  });

  it('stops at maxCells and says so', () => {
    const rows = Array.from(
      { length: 10 },
      (_, r) => `<row r="${r + 1}">${fixtureCell(`A${r + 1}`, r)}</row>`,
    ).join('');
    const { workbook, issues } = read(
      {
        sheets: [
          { name: 'A', xml: `<sheetData>${rows}</sheetData>` },
          { name: 'B', xml: `<sheetData>${rows}</sheetData>` },
        ],
      },
      { maxCells: 15 },
    );
    expect(workbook.sheets[0].cellCount + workbook.sheets[1].cellCount).toBe(
      15,
    );
    expect(issues).toEqual([
      expect.objectContaining({
        code: 'truncated',
        sheet: 'B',
        severity: 'error',
      }),
    ]);
  });
});

describe('readOgeXlsx — styles', () => {
  it('maps cell formats onto interned styles', () => {
    const { workbook } = read(
      sheet(
        '<sheetData><row r="1">' +
          [1, 2, 3, 4, 5]
            .map((s, i) => fixtureCell(`${'ABCDE'[i]}1`, i, s))
            .join('') +
          '</row></sheetData>',
        { styles: STYLES_WITH_FORMATS, theme: true },
      ),
    );
    const s = workbook.sheets[0];
    const style = (col: number) =>
      workbook.styles.get(s.getCell(0, col)?.style);
    expect(style(0)).toEqual({
      numberFormat: '0.000',
      font: {
        bold: true,
        underline: 'double',
        strike: true,
        vertAlign: 'superscript',
        size: 14,
        color: { rgb: 'FFFF0000' },
        name: 'Arial',
        scheme: 'major',
      },
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { theme: 4, tint: -0.25 },
        bgColor: { indexed: 64 },
      },
      border: {
        left: { style: 'thin', color: { auto: true } },
        top: { style: 'double', color: { indexed: 10 } },
        diagonal: { style: 'dashed' },
        diagonalUp: true,
      },
      alignment: {
        horizontal: 'center',
        vertical: 'top',
        wrapText: true,
        indent: 2,
        textRotation: 255,
        readingOrder: 'rtl',
        shrinkToFit: true,
      },
      protection: { locked: false, hidden: true },
      quotePrefix: true,
    });
    // a file's own code for a built-in id wins over the built-in
    expect(style(1)).toMatchObject({ numberFormat: 'dd/mm/yyyy' });
    expect(style(1).fill).toEqual({
      type: 'gradient',
      gradient: 'linear',
      degree: 90,
      stops: [
        { position: 0, color: { rgb: 'FFFFFFFF' } },
        { position: 1, color: { theme: 5 } },
      ],
    });
    expect(style(2)).toMatchObject({
      numberFormat: 'd-mmm-yy',
      numberFormatId: 15,
      alignment: { horizontal: 'right' },
    });
    expect(style(2).fill).toMatchObject({
      type: 'gradient',
      gradient: 'path',
      left: 0.5,
      right: 0.5,
      top: 0.5,
      bottom: 0.5,
    });
    expect(style(3)).toEqual({ numberFormat: '@', numberFormatId: 49 });
    expect(style(4)).toEqual({ numberFormatId: 30 });
    expect(workbook.indexedColors).toEqual(['010203', 'AABBCC']);
    expect(workbook.dxfs).toEqual([
      {
        font: { bold: true, color: { rgb: 'FF9C0006' } },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { rgb: 'FFFFC7CE' },
        },
      },
      { numberFormat: '0.0%', border: { left: { style: 'thin' } } },
    ]);
    expect(workbook.theme.accent1).toBe('4472C4');
    expect(workbook.themeFonts).toEqual({
      major: 'Calibri Light',
      minor: 'Calibri',
    });
    expect(workbook.defaultFont).toEqual({
      size: 11,
      color: { theme: 1 },
      name: 'Calibri',
      family: 2,
    });
  });

  it('reads a theme with system colours and missing slots', () => {
    const theme =
      '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:themeElements><a:clrScheme name="x">' +
      '<a:dk1><a:sysClr val="windowText"/></a:dk1><a:lt1><a:sysClr val="window"/></a:lt1><a:accent1><a:srgbClr val="123ABC"/></a:accent1>' +
      '</a:clrScheme></a:themeElements></a:theme>';
    const { workbook } = read(sheet('<sheetData/>', { theme }));
    expect(workbook.theme).toMatchObject({
      dk1: '000000',
      lt1: 'FFFFFF',
      accent1: '123ABC',
      accent2: 'ED7D31',
    });
    expect(workbook.themeFonts).toEqual({});
  });
});

describe('readOgeXlsx — sheets', () => {
  it('reads sheet properties, views, sizes and print settings', () => {
    const { workbook, issues } = read(
      sheet(
        '<sheetPr><tabColor theme="5" tint="0.4"/><outlinePr summaryBelow="0"/><pageSetUpPr fitToPage="1"/></sheetPr>' +
          '<dimension ref="A1:C3"/>' +
          '<sheetViews><sheetView showGridLines="0" showRowColHeaders="0" showZeros="0" rightToLeft="1" zoomScale="150" view="pageLayout" showOutlineSymbols="0" workbookViewId="0">' +
          '<pane xSplit="2" ySplit="1" topLeftCell="C2" activePane="bottomRight" state="frozen"/><selection pane="bottomRight" activeCell="D4" sqref="D4:E5 G7"/></sheetView></sheetViews>' +
          '<sheetFormatPr baseColWidth="10" defaultColWidth="12.5" defaultRowHeight="18" customHeight="1" zeroHeight="1" outlineLevelRow="2" outlineLevelCol="1"/>' +
          '<cols><col min="1" max="3" width="20" customWidth="1"/><col min="5" max="5" hidden="1" outlineLevel="1" collapsed="1" style="1"/><col min="0" max="2"/></cols>' +
          '<sheetData><row r="2" ht="30" customHeight="1" hidden="1" outlineLevel="9" collapsed="1" s="1" customFormat="1"/><row r="3" ht="12"/></sheetData>' +
          '<printOptions gridLines="1" headings="1" horizontalCentered="1"/><pageMargins left="1" right="1" top="1" bottom="1" header="0.5" footer="0.5"/>' +
          '<pageSetup paperSize="9" scale="80" fitToWidth="1" fitToHeight="0" orientation="landscape"/>' +
          '<headerFooter><oddHeader>&amp;CTitle</oddHeader><oddFooter>&amp;P of &amp;N</oddFooter></headerFooter>' +
          '<rowBreaks count="1"><brk id="10" max="16383" man="1"/></rowBreaks><colBreaks count="1"><brk id="3" man="1"/></colBreaks>',
        { styles: STYLES_WITH_FORMATS },
      ),
    );
    const s = workbook.sheets[0];
    expect(s.tabColor).toEqual({ theme: 5, tint: 0.4 });
    expect(s.outline).toEqual({ summaryBelow: false, summaryRight: true });
    expect(s.view).toEqual({
      frozenRows: 1,
      frozenColumns: 2,
      topLeft: { row: 1, col: 2 },
      zoom: 150,
      showGridLines: false,
      showHeaders: false,
      showZeros: false,
      rightToLeft: true,
      activeCell: { row: 3, col: 3 },
      selection: [
        { top: 3, left: 3, bottom: 4, right: 4 },
        { top: 6, left: 6, bottom: 6, right: 6 },
      ],
      showOutlineSymbols: false,
      viewMode: 'pageLayout',
    });
    expect(s.format).toEqual({
      defaultRowHeight: 18,
      baseColumnWidth: 10,
      defaultColumnWidth: 12.5,
      customHeight: true,
      zeroHeight: true,
      outlineLevelRow: 2,
      outlineLevelCol: 1,
    });
    expect(s.getColumn(1)).toMatchObject({ width: 20 });
    expect(s.getColumn(4)).toMatchObject({
      hidden: true,
      outlineLevel: 1,
      collapsed: true,
    });
    expect(s.getColumn(4)?.style).toBeGreaterThan(0);
    expect(s.getRow(1)).toMatchObject({
      height: 30,
      customHeight: true,
      hidden: true,
      outlineLevel: 7,
      collapsed: true,
    });
    expect(s.getRow(2)).toEqual({ height: 12 });
    expect(s.pageSetup).toEqual({
      fitToPage: true,
      printGridLines: true,
      printHeadings: true,
      centerHorizontally: true,
      centerVertically: false,
      margins: {
        left: 1,
        right: 1,
        top: 1,
        bottom: 1,
        header: 0.5,
        footer: 0.5,
      },
      orientation: 'landscape',
      paperSize: 9,
      scale: 80,
      fitToWidth: 1,
      fitToHeight: 0,
      oddHeader: '&CTitle',
      oddFooter: '&P of &N',
      rowBreaks: [9],
      columnBreaks: [2],
    });
    expect(codes(issues)).toEqual(['invalid-reference']);
  });

  it('notes a split window and reads its selection from the active pane', () => {
    const { workbook, issues } = read(
      sheet(
        '<sheetViews><sheetView workbookViewId="0"><pane xSplit="3000" ySplit="2000" topLeftCell="E5" activePane="topRight"/>' +
          '<selection pane="topRight" activeCell="F1" sqref="F1"/><selection activeCell="A1" sqref="A1"/></sheetView></sheetViews><sheetData/>',
      ),
    );
    expect(workbook.sheets[0].view).toMatchObject({
      frozenRows: 0,
      frozenColumns: 0,
      split: true,
      activeCell: { row: 0, col: 5 },
    });
    expect(codes(issues)).toEqual(['split-pane-ignored']);
  });

  it('reads merges, hyperlinks, conditional formats, validations and the filter', () => {
    const { workbook, issues } = read({
      sheets: [
        {
          name: 'S',
          xml:
            '<sheetData/><autoFilter ref="A1:C9"><filterColumn colId="1"><filters><filter val="x"/></filters></filterColumn></autoFilter>' +
            '<mergeCells count="4"><mergeCell ref="A1:B2"/><mergeCell ref="B2:C3"/><mergeCell ref="bogus"/><mergeCell ref="D1:D3"/></mergeCells>' +
            '<conditionalFormatting sqref="A1:A9 C1:C9 ?"><cfRule type="cellIs" dxfId="0" priority="2" operator="between" stopIfTrue="1"><formula>1</formula><formula>5</formula></cfRule>' +
            '<cfRule type="top10" priority="1" rank="10" percent="1" bottom="1"/><cfRule type="aboveAverage" priority="3" aboveAverage="0" equalAverage="1" stdDev="2"/>' +
            '<cfRule type="containsText" operator="containsText" text="ok" priority="4"><formula>NOT(ISERROR(SEARCH("ok",A1)))</formula></cfRule>' +
            '<cfRule type="timePeriod" timePeriod="last7Days" priority="5"/>' +
            '<cfRule type="colorScale" priority="6"><colorScale><cfvo type="min"/><cfvo type="max"/><color rgb="FFFF0000"/><color theme="4"/></colorScale></cfRule>' +
            '<cfRule type="dataBar" priority="7"><dataBar showValue="0" minLength="0" maxLength="100"><cfvo type="num" val="0"/><cfvo type="percentile" val="90"/><color rgb="FF638EC6"/></dataBar></cfRule>' +
            '<cfRule type="iconSet" priority="8"><iconSet iconSet="3Arrows" reverse="1"><cfvo type="percent" val="0"/><cfvo type="percent" val="33" gte="0"/><cfvo type="percent" val="67"/></iconSet></cfRule>' +
            '<cfRule priority="9"/></conditionalFormatting>' +
            '<conditionalFormatting sqref=""><cfRule type="expression" priority="10"><formula>TRUE</formula></cfRule></conditionalFormatting>' +
            '<dataValidations count="2"><dataValidation type="list" allowBlank="1" showDropDown="1" showInputMessage="1" showErrorMessage="1" errorStyle="warning" promptTitle="P" prompt="Pick" errorTitle="E" error="Bad" sqref="B1:B9"><formula1>"Yes,No"</formula1></dataValidation>' +
            '<dataValidation type="whole" operator="between" sqref="C1"><formula1>1</formula1><formula2>9</formula2></dataValidation><dataValidation type="list" sqref=""/></dataValidations>' +
            '<hyperlinks><hyperlink ref="A1" r:id="rId1" tooltip="Tip" display="Show"/><hyperlink ref="B1:B3" location="\'Other sheet\'!A1"/><hyperlink ref="C1" r:id="rId9"/><hyperlink ref="!!"/></hyperlinks>',
          rels: [
            {
              id: 'rId1',
              type: 'hyperlink',
              target: 'https://example.com/a b',
              external: true,
            },
          ],
        },
      ],
    });
    const s = workbook.sheets[0];
    expect(s.merges).toEqual([
      { top: 0, left: 0, bottom: 1, right: 1 },
      { top: 0, left: 3, bottom: 2, right: 3 },
    ]);
    expect(s.autoFilter).toEqual({
      range: { top: 0, left: 0, bottom: 8, right: 2 },
      columns: [
        {
          offset: 1,
          xml: '<filterColumn colId="1"><filters><filter val="x"/></filters></filterColumn>',
        },
      ],
    });
    expect(s.hyperlinks).toEqual([
      {
        range: { top: 0, left: 0, bottom: 0, right: 0 },
        target: 'https://example.com/a b',
        tooltip: 'Tip',
        display: 'Show',
      },
      {
        range: { top: 0, left: 1, bottom: 2, right: 1 },
        location: "'Other sheet'!A1",
      },
      { range: { top: 0, left: 2, bottom: 0, right: 2 } },
    ]);
    expect(s.hyperlinkAt(1, 1)?.location).toBe("'Other sheet'!A1");
    expect(s.conditionalFormats).toHaveLength(1);
    const [format] = s.conditionalFormats;
    expect(format.ranges).toEqual([
      { top: 0, left: 0, bottom: 8, right: 0 },
      { top: 0, left: 2, bottom: 8, right: 2 },
    ]);
    expect(format.rules.map((r) => r.type)).toEqual([
      'cellIs',
      'top10',
      'aboveAverage',
      'containsText',
      'timePeriod',
      'colorScale',
      'dataBar',
      'iconSet',
    ]);
    expect(format.rules[0]).toEqual({
      type: 'cellIs',
      priority: 2,
      dxf: 0,
      stopIfTrue: true,
      operator: 'between',
      formulas: ['1', '5'],
    });
    expect(format.rules[1]).toMatchObject({
      rank: 10,
      percent: true,
      bottom: true,
    });
    expect(format.rules[2]).toMatchObject({
      aboveAverage: false,
      equalAverage: true,
      stdDev: 2,
    });
    expect(format.rules[3]).toMatchObject({
      text: 'ok',
      operator: 'containsText',
    });
    expect(format.rules[4]).toMatchObject({ timePeriod: 'last7Days' });
    expect(format.rules[5].colorScale).toEqual({
      values: [{ type: 'min' }, { type: 'max' }],
      colors: [{ rgb: 'FFFF0000' }, { theme: 4 }],
    });
    expect(format.rules[6].dataBar).toEqual({
      min: { type: 'num', value: '0' },
      max: { type: 'percentile', value: '90' },
      color: { rgb: 'FF638EC6' },
      showValue: false,
      minLength: 0,
      maxLength: 100,
    });
    expect(format.rules[7].iconSet).toEqual({
      iconSet: '3Arrows',
      values: [
        { type: 'percent', value: '0' },
        { type: 'percent', value: '33', greaterThan: true },
        { type: 'percent', value: '67' },
      ],
      reverse: true,
      showValue: true,
    });
    expect(s.dataValidations).toEqual([
      {
        ranges: [{ top: 0, left: 1, bottom: 8, right: 1 }],
        type: 'list',
        formula1: '"Yes,No"',
        allowBlank: true,
        hideDropDown: true,
        showInputMessage: true,
        showErrorMessage: true,
        errorStyle: 'warning',
        promptTitle: 'P',
        prompt: 'Pick',
        errorTitle: 'E',
        error: 'Bad',
      },
      {
        ranges: [{ top: 0, left: 2, bottom: 0, right: 2 }],
        type: 'whole',
        operator: 'between',
        formula1: '1',
        formula2: '9',
      },
    ]);
    expect(codes(issues).sort()).toEqual(
      ['invalid-reference', 'missing-part', 'overlapping-merge'].sort(),
    );
    expect(issues.find((i) => i.code === 'invalid-reference')?.count).toBe(3);
  });

  it('passes unmodelled elements through and keeps the parts they point at', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const { workbook, issues } = read({
      sheets: [
        {
          name: 'S',
          xml:
            '<sheetData/><sheetProtection sheet="1" objects="1" password="CC3D"/><ignoredErrors><ignoredError sqref="A1" numberStoredAsText="1"/></ignoredErrors>' +
            '<drawing r:id="rId1"/><tableParts count="1"><tablePart r:id="rId2"/></tableParts>' +
            '<extLst><ext uri="{05C60535-1F16-4fd2-B633-F4F36F0B64E0}"><x14:sparklineGroups xmlns:x14="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main"><x14:sparklineGroup/></x14:sparklineGroups></ext></extLst>',
          rels: [
            { id: 'rId1', type: 'drawing', target: '../drawings/drawing1.xml' },
            { id: 'rId2', type: 'table', target: '../tables/table1.xml' },
          ],
        },
      ],
      extraParts: [
        {
          path: 'xl/drawings/drawing1.xml',
          // a chart: kept, not shown
          data: '<xdr:wsDr xmlns:xdr="x"><xdr:twoCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:row>0</xdr:row></xdr:from><xdr:to><xdr:col>2</xdr:col><xdr:row>4</xdr:row></xdr:to><xdr:graphicFrame/></xdr:twoCellAnchor></xdr:wsDr>',
          contentType:
            'application/vnd.openxmlformats-officedocument.drawing+xml',
        },
        {
          path: 'xl/drawings/_rels/drawing1.xml.rels',
          data: '<Relationships/>',
        },
        { path: 'xl/media/image1.png', data: png },
        {
          path: 'xl/tables/table1.xml',
          // a table in a style nobody defines: read, shown unformatted
          data: '<table id="1" name="T" displayName="T" ref="A1:B3"><tableStyleInfo name="NoSuchStyle"/></table>',
          contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml',
        },
      ],
      defaults: { png: 'image/png' },
    });
    const s = workbook.sheets[0];
    expect(s.tables.map((t) => [t.name, t.style?.name])).toEqual([
      ['T', 'NoSuchStyle'],
    ]);
    expect(s.protection).toEqual({
      attributes: { sheet: '1', objects: '1', password: 'CC3D' },
    });
    expect(s.passthrough.map((p) => p.name)).toEqual([
      '#namespaces',
      'ignoredErrors',
      'drawing',
      'tableParts',
      'extLst',
    ]);
    expect(s.passthrough[0].xml).toContain('xmlns:r=');
    expect(s.passthrough[2].xml).toBe('<drawing r:id="rId1"/>');
    expect(s.opaqueRelationships.map((r) => [r.id, r.target])).toEqual([
      ['rId1', 'xl/drawings/drawing1.xml'],
      ['rId2', 'xl/tables/table1.xml'],
    ]);
    const opaque = workbook.opaqueParts.map((p) => [p.path, p.contentType]);
    expect(opaque).toEqual(
      expect.arrayContaining([
        [
          'xl/drawings/drawing1.xml',
          'application/vnd.openxmlformats-officedocument.drawing+xml',
        ],
        [
          'xl/drawings/_rels/drawing1.xml.rels',
          'application/vnd.openxmlformats-package.relationships+xml',
        ],
        ['xl/media/image1.png', 'image/png'],
        [
          'xl/tables/table1.xml',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml',
        ],
      ]),
    );
    expect(
      workbook.opaqueParts.find((p) => p.path === 'xl/media/image1.png')?.data,
    ).toEqual(png);
    // consumed parts are not kept twice
    expect(opaque.map(([path]) => path)).not.toContain(
      'xl/worksheets/sheet1.xml',
    );
    expect(opaque.map(([path]) => path)).not.toContain('xl/styles.xml');
    expect(codes(issues).sort()).toEqual([
      'drawing-not-shown',
      'table-style-not-shown',
    ]);
  });

  it('reads sparkline groups from the sheet’s extensions, which stay as written', () => {
    const sparkline = (f: string | null, at: string) =>
      `<x14:sparkline>${f === null ? '' : `<xm:f>${f}</xm:f>`}<xm:sqref>${at}</xm:sqref></x14:sparkline>`;
    const { workbook, issues } = read(
      sheet(
        '<sheetData><row r="1"><c r="B1"><v>1</v></c><c r="C1"><v>2</v></c></row></sheetData>' +
          '<extLst><ext uri="{05C60535-1F16-4fd2-B633-F4F36F0B64E0}" xmlns:x14="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main">' +
          '<x14:sparklineGroups xmlns:xm="http://schemas.microsoft.com/office/excel/2006/main">' +
          '<x14:sparklineGroup displayEmptyCellsAs="gap" markers="1"><x14:colorSeries theme="4" tint="-0.5"/><x14:colorNegative rgb="FFFF0000"/>' +
          `<x14:sparklines>${sparkline('Sheet1!B1:C1', 'A1')}${sparkline(null, 'A2')}${sparkline('B1:C1', '??')}</x14:sparklines></x14:sparklineGroup>` +
          '<x14:sparklineGroup type="column" lineWeight="2.25" high="1" low="1" first="1" last="1" negative="1" displayXAxis="1" displayHidden="1" displayEmptyCellsAs="span" minAxisType="custom" manualMin="-1" maxAxisType="group" rightToLeft="1" dateAxis="1">' +
          `<xm:f>Sheet1!B2:C2</xm:f><x14:sparklines>${sparkline('Sheet1!B1:C1', 'D4')}</x14:sparklines></x14:sparklineGroup>` +
          `<x14:sparklineGroup type="bogus" displayEmptyCellsAs="bogus" minAxisType="bogus"><x14:sparklines>${sparkline('B1:C1', 'E5')}</x14:sparklines></x14:sparklineGroup>` +
          '<x14:sparklineGroup type="stacked"><x14:sparklines/></x14:sparklineGroup>' +
          '</x14:sparklineGroups></ext><ext uri="{78C0D931-6437-407d-A8EE-F0AAD7539E65}"><x14:conditionalFormattings/></ext></extLst>',
      ),
    );
    const flags = {
      lineWeight: 0.75,
      markers: false,
      high: false,
      low: false,
      first: false,
      last: false,
      negative: false,
      displayXAxis: false,
      displayHidden: false,
      displayEmptyCellsAs: 'zero',
      minAxisType: 'individual',
      maxAxisType: 'individual',
      rightToLeft: false,
    };
    const s = workbook.sheets[0];
    expect(s.sparklineGroups).toEqual([
      {
        ...flags,
        type: 'line',
        // a sparkline without data still has its cell; one without a cell is dropped
        sparklines: [
          { cell: { row: 0, col: 0 }, ref: 'Sheet1!B1:C1' },
          { cell: { row: 1, col: 0 } },
        ],
        colors: {
          series: { theme: 4, tint: -0.5 },
          negative: { rgb: 'FFFF0000' },
        },
        markers: true,
        displayEmptyCellsAs: 'gap',
      },
      {
        type: 'column',
        sparklines: [{ cell: { row: 3, col: 3 }, ref: 'Sheet1!B1:C1' }],
        colors: {},
        lineWeight: 2.25,
        markers: false,
        high: true,
        low: true,
        first: true,
        last: true,
        negative: true,
        displayXAxis: true,
        displayHidden: true,
        displayEmptyCellsAs: 'span',
        minAxisType: 'custom',
        maxAxisType: 'group',
        manualMin: -1,
        rightToLeft: true,
        dateRef: 'Sheet1!B2:C2',
      },
      {
        ...flags,
        type: 'line',
        sparklines: [{ cell: { row: 4, col: 4 }, ref: 'B1:C1' }],
        colors: {},
      },
    ]);
    // the extensions are kept for saving, and nothing is reported
    expect(s.passthrough.map((p) => p.name)).toContain('extLst');
    expect(codes(issues)).toEqual([]);
  });

  it('reads notes and which ones are pinned open', () => {
    const comments =
      '<comments xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><authors><author>Ann</author></authors><commentList>' +
      '<comment ref="B2" authorId="0"><text><r><rPr><b/></rPr><t>Ann:</t></r><r><t xml:space="preserve">&#10;Check this</t></r></text></comment>' +
      '<comment ref="C3" authorId="5"><text><t>[Threaded comment]&#10;Your version</t></text></comment><comment ref="??"><text><t>x</t></text></comment></commentList></comments>';
    const vml =
      '<xml xmlns:v="urn:schemas-microsoft-com:vml" xmlns:x="urn:schemas-microsoft-com:office:excel"><v:shape><br><x:ClientData ObjectType="Note"><x:Visible/><x:Row>1</x:Row><x:Column>1</x:Column></x:ClientData></v:shape>' +
      '<v:shape><x:ClientData ObjectType="Note"><x:Row>2</x:Row><x:Column>2</x:Column></x:ClientData></v:shape></xml>';
    const { workbook, issues } = read({
      sheets: [
        {
          name: 'S',
          xml: '<sheetData/><legacyDrawing r:id="rId2"/>',
          rels: [
            { id: 'rId1', type: 'comments', target: '../comments1.xml' },
            {
              id: 'rId2',
              type: 'vmlDrawing',
              target: '../drawings/vmlDrawing1.vml',
            },
            {
              id: 'rId3',
              type: 'http://schemas.microsoft.com/office/2017/10/relationships/threadedComment',
              target: '../threadedComments/t1.xml',
            },
          ],
        },
      ],
      extraParts: [
        {
          path: 'xl/comments1.xml',
          data: comments,
          contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml',
        },
        { path: 'xl/drawings/vmlDrawing1.vml', data: vml },
      ],
    });
    const s = workbook.sheets[0];
    expect(s.getNote(1, 1)).toEqual({
      text: {
        kind: 'rich',
        runs: [
          { text: 'Ann:', font: { bold: true } },
          { text: '\nCheck this' },
        ],
      },
      author: 'Ann',
      visible: true,
    });
    expect(s.getNote(2, 2)).toEqual({
      text: '[Threaded comment]\nYour version',
      threaded: true,
    });
    expect(s.noteCount).toBe(2);
    expect(codes(issues).sort()).toEqual([
      'invalid-reference',
      'threaded-comments-as-notes',
    ]);
  });
});

describe('readOgeXlsx — workbook', () => {
  it('reads names, states, the active tab, the date system and properties', () => {
    const fixture: XlsxFixture = {
      workbookPr: 'date1904="1"',
      workbookView: 'activeTab="1" showSheetTabs="0"',
      workbookTail:
        '<definedNames><definedName name="Total">Main!$B$9</definedName><definedName name="_xlnm.Print_Area" localSheetId="0">Main!$A$1:$C$9</definedName>' +
        '<definedName name="Local" localSheetId="2" hidden="1" comment="note">0.5</definedName><definedName name="1bad">1</definedName>' +
        '<definedName name="Gone" localSheetId="9">1</definedName></definedNames><calcPr calcId="191029" calcMode="manual" fullCalcOnLoad="1" iterate="1" iterateCount="50" iterateDelta="0.01"/>' +
        '<workbookProtection lockStructure="1"/>',
      sheets: [
        { name: 'Main', xml: '<sheetData/>' },
        { name: 'Hidden', xml: '<sheetData/>', state: 'hidden' },
        { name: 'Very', xml: '<sheetData/>', state: 'veryHidden' },
      ],
      extraParts: [
        {
          path: 'docProps/core.xml',
          data: '<cp:coreProperties xmlns:cp="c" xmlns:dc="d" xmlns:dcterms="t"><dc:title>Budget</dc:title><dc:creator>Ann</dc:creator><cp:lastModifiedBy>Bo</cp:lastModifiedBy><dcterms:created>2024-01-05T00:00:00Z</dcterms:created><dc:subject> </dc:subject></cp:coreProperties>',
        },
        {
          path: 'docProps/app.xml',
          data: '<Properties><Application>Microsoft Excel</Application><Company>OGE</Company></Properties>',
        },
      ],
    };
    const bytes = buildXlsxFixture(fixture);
    // point the package at the properties
    const { workbook, issues } = readOgeXlsxSync(
      withPackageRels(bytes, [
        ['metadata/core-properties', 'docProps/core.xml'],
        ['extended-properties', 'docProps/app.xml'],
      ]),
    );
    expect(workbook.dateSystem).toBe('1904');
    expect(workbook.sheets.map((s) => [s.name, s.state])).toEqual([
      ['Main', 'visible'],
      ['Hidden', 'hidden'],
      ['Very', 'veryHidden'],
    ]);
    // the saved active tab is hidden: the first visible sheet shows
    expect(workbook.activeSheet).toBe(0);
    expect(workbook.showSheetTabs).toBe(false);
    expect(workbook.names).toEqual([
      { name: 'Total', formula: 'Main!$B$9' },
      { name: '_xlnm.Print_Area', formula: 'Main!$A$1:$C$9', sheet: 0 },
      {
        name: 'Local',
        formula: '0.5',
        sheet: 2,
        hidden: true,
        comment: 'note',
      },
    ]);
    expect(workbook.calculation).toEqual({
      mode: 'manual',
      fullCalcOnLoad: true,
      iterate: true,
      iterateCount: 50,
      iterateDelta: 0.01,
    });
    expect(workbook.protection).toEqual({ lockStructure: '1' });
    expect(workbook.properties).toEqual({
      title: 'Budget',
      creator: 'Ann',
      lastModifiedBy: 'Bo',
      created: '2024-01-05T00:00:00Z',
      application: 'Microsoft Excel',
      company: 'OGE',
    });
    expect(codes(issues)).toEqual(['invalid-defined-name']);
    expect(issues[0].count).toBe(2);
    expect(workbook.opaqueParts.map((p) => p.path)).not.toContain(
      'docProps/core.xml',
    );
  });

  it('renames sheets Excel would refuse and fills an empty workbook', () => {
    const { workbook, issues } = read({
      sheets: [
        { name: 'Bad/Name', xml: '<sheetData/>' },
        { name: 'bad/name', xml: '<sheetData/>' },
      ],
    });
    expect(workbook.sheets.map((s) => s.name)).toEqual(['Sheet1', 'Sheet2']);
    expect(issues).toEqual([
      expect.objectContaining({ code: 'invalid-sheet-name', count: 2 }),
    ]);
    const empty = read({ sheets: [] });
    expect(empty.workbook.sheets.map((s) => s.name)).toEqual(['Sheet1']);
    expect(codes(empty.issues)).toEqual(['missing-part']);
  });

  it('resolves case-insensitive, absolute and percent-encoded part names', () => {
    const encoder = new TextEncoder();
    const files: [string, string][] = [
      [
        '[Content_Types].xml',
        '<Types xmlns="t"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/XL/Workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>',
      ],
      [
        '_rels/.rels',
        '<Relationships><Relationship Id="r1" Type="http://purl.oclc.org/ooxml/officeDocument/relationships/officeDocument" Target="/XL/Workbook.xml"/></Relationships>',
      ],
      [
        'xl/workbook.xml',
        '<x:workbook xmlns:x="m" xmlns:r="r"><x:sheets><x:sheet name="One" sheetId="1" r:id="a"/></x:sheets></x:workbook>',
      ],
      [
        'xl/_rels/workbook.xml.rels',
        '<Relationships><Relationship Id="a" Type="http://purl.oclc.org/ooxml/officeDocument/relationships/worksheet" Target="sheets/My%20Sheet.xml"/><Relationship Id="b" Type="x/styles" Target="../xl/./styles.xml"/></Relationships>',
      ],
      [
        'xl/sheets/My Sheet.xml',
        '<x:worksheet xmlns:x="m"><x:sheetData><x:row r="1"><x:c r="A1"><x:v>7</x:v></x:c></x:row></x:sheetData></x:worksheet>',
      ],
      ['xl/styles.xml', `<styleSheet>${FIXTURE_DEFAULT_STYLES}</styleSheet>`],
    ];
    const bytes = writeOgeZipSync(
      files.map(([name, text]) => ({ name, data: encoder.encode(text) })),
    );
    const { workbook, issues } = readOgeXlsxSync(bytes);
    expect(workbook.sheets[0].getValue(0, 0)).toBe(7);
    expect(codes(issues)).toEqual(['strict-conformance']);
  });

  it('refuses what is not a workbook', () => {
    const error = (fn: () => unknown) => {
      try {
        fn();
      } catch (e) {
        return e instanceof OgeXlsxError ? e.code : String(e);
      }
      return 'no error';
    };
    expect(error(() => readOgeXlsxSync(new Uint8Array([1, 2, 3, 4])))).toBe(
      'not-xlsx',
    );
    const ole = new Uint8Array(512);
    ole.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    expect(error(() => readOgeXlsxSync(ole))).toBe('encrypted-or-legacy');
    const encoder = new TextEncoder();
    const zip = (files: [string, string][]) =>
      writeOgeZipSync(
        files.map(([name, text]) => ({ name, data: encoder.encode(text) })),
      );
    expect(error(() => readOgeXlsxSync(zip([['readme.txt', 'hi']])))).toBe(
      'not-xlsx',
    );
    expect(
      error(() =>
        readOgeXlsxSync(
          zip([
            [
              '_rels/.rels',
              '<Relationships><Relationship Id="r" Type="x/officeDocument" Target="xl/workbook.bin"/></Relationships>',
            ],
            ['xl/workbook.bin', 'binary'],
          ]),
        ),
      ),
    ).toBe('xlsb');
    expect(
      error(() =>
        readOgeXlsxSync(zip([['xl/workbook.xml', '<workbook><sheets>']])),
      ),
    ).toBe('corrupt');
    const tiny = { limits: { maxEntrySize: 10 } };
    expect(
      error(() =>
        readOgeXlsxSync(buildXlsxFixture(sheet('<sheetData/>')), tiny),
      ),
    ).toBe('too-large');
  });

  it('reports a malformed or missing part and goes on', () => {
    const { workbook, issues } = read({
      sheets: [
        {
          name: 'Broken',
          xml: '<?xml version="1.0"?><worksheet><sheetData><row></worksheet>',
        },
        {
          name: 'Fine',
          xml: `<sheetData><row r="1">${fixtureCell('A1', 1)}</row></sheetData>`,
        },
      ],
      sharedStrings: '<si><t>unclosed</si>',
    });
    expect(workbook.sheets[1].getValue(0, 0)).toBe(1);
    expect(issues.map((i) => [i.code, i.part])).toEqual([
      ['malformed-part', 'xl/sharedStrings.xml'],
      ['malformed-part', 'xl/worksheets/sheet1.xml'],
    ]);
  });

  it('reads asynchronously from a Blob or buffer, and can be aborted', async () => {
    const bytes = buildXlsxFixture(
      sheet(`<sheetData><row r="1">${fixtureCell('A1', 3)}</row></sheetData>`),
    );
    const fromBlob = await readOgeXlsx(new Blob([new Uint8Array(bytes)]));
    expect(fromBlob.workbook.sheets[0].getValue(0, 0)).toBe(3);
    const fromBuffer = await readOgeXlsx(bytes.buffer.slice(0) as ArrayBuffer);
    expect(fromBuffer.workbook.sheets[0].getValue(0, 0)).toBe(3);
    const controller = new AbortController();
    controller.abort();
    await expect(
      readOgeXlsx(bytes, { signal: controller.signal }),
    ).rejects.toMatchObject({ code: 'aborted' });
    await expect(readOgeXlsx(new Uint8Array([9, 9]))).rejects.toMatchObject({
      code: 'not-xlsx',
    });
  });

  it('keeps macros and external links as parts and says so', () => {
    const { workbook, issues } = read({
      sheets: [{ name: 'S', xml: '<sheetData/>' }],
      workbookRels: [
        {
          type: 'http://schemas.microsoft.com/office/2006/relationships/vbaProject',
          target: 'vbaProject.bin',
        },
        { type: 'externalLink', target: 'externalLinks/externalLink1.xml' },
      ],
      extraParts: [
        {
          path: 'xl/vbaProject.bin',
          data: new Uint8Array([1, 2, 3]),
          contentType: 'application/vnd.ms-office.vbaProject',
        },
        { path: 'xl/externalLinks/externalLink1.xml', data: '<externalLink/>' },
      ],
    });
    expect(codes(issues).sort()).toEqual(['external-link', 'macros-kept']);
    expect(workbook.opaqueParts.map((p) => p.path)).toEqual(
      expect.arrayContaining([
        'xl/vbaProject.bin',
        'xl/externalLinks/externalLink1.xml',
      ]),
    );
  });
});

/** Adds relationships to the package's `_rels/.rels` of a built fixture. */
function withPackageRels(
  bytes: Uint8Array,
  rels: readonly [type: string, target: string][],
): Uint8Array {
  const parts = readOgeXlsxSyncParts(bytes);
  const extra = rels
    .map(([type, target], i) => {
      const uri = type.startsWith('metadata/')
        ? `http://schemas.openxmlformats.org/package/2006/relationships/${type}`
        : `http://schemas.openxmlformats.org/officeDocument/2006/relationships/${type}`;
      return `<Relationship Id="p${i}" Type="${uri}" Target="${target}"/>`;
    })
    .join('');
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  return writeOgeZipSync(
    parts.map(({ name, data }) =>
      name === '_rels/.rels'
        ? {
            name,
            data: encoder.encode(
              decoder
                .decode(data)
                .replace('</Relationships>', `${extra}</Relationships>`),
            ),
          }
        : { name, data },
    ),
  );
}

function readOgeXlsxSyncParts(
  bytes: Uint8Array,
): { name: string; data: Uint8Array }[] {
  const archive = readOgeZip(bytes);
  return archive.entries.map((entry) => ({
    name: entry.name,
    data: readOgeZipEntrySync(archive, entry),
  }));
}

describe('readOgeXlsx — pictures', () => {
  const pic = (embed: string, extra = '') =>
    `<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="P" descr="Alt" hidden="1"/></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="${embed}"/>${extra}</xdr:blipFill><xdr:spPr><a:xfrm rot="5400000" flipH="1" flipV="1"><a:off x="0" y="0"/><a:ext cx="95250" cy="47625"/></a:xfrm></xdr:spPr></xdr:pic>`;
  const from =
    '<xdr:from><xdr:col>1</xdr:col><xdr:colOff>9525</xdr:colOff><xdr:row>2</xdr:row><xdr:rowOff>19050</xdr:rowOff></xdr:from>';
  const drawing =
    '<xdr:wsDr xmlns:xdr="d" xmlns:a="a" xmlns:r="r" xmlns:mc="m">' +
    `<xdr:oneCellAnchor>${from}<xdr:ext cx="190500" cy="95250"/>${pic('rId1')}</xdr:oneCellAnchor>` +
    `<xdr:absoluteAnchor><xdr:pos x="952500" y="0"/><xdr:ext cx="9525" cy="9525"/><mc:AlternateContent><mc:Choice Requires="a14">${pic('rId1', '<a:srcRect l="10000"/>')}</mc:Choice></mc:AlternateContent></xdr:absoluteAnchor>` +
    `<xdr:twoCellAnchor editAs="absolute">${from}<xdr:to><xdr:col>3</xdr:col><xdr:row>4</xdr:row></xdr:to>${pic('rId1')}</xdr:twoCellAnchor>` +
    `<xdr:twoCellAnchor>${from}<xdr:to><xdr:col>3</xdr:col><xdr:row>4</xdr:row></xdr:to>${pic('rId2')}</xdr:twoCellAnchor>` +
    `<xdr:twoCellAnchor>${from}<xdr:to><xdr:col>3</xdr:col><xdr:row>4</xdr:row></xdr:to>${pic('rId3')}</xdr:twoCellAnchor>` +
    `<xdr:twoCellAnchor>${from}<xdr:to><xdr:col>3</xdr:col><xdr:row>4</xdr:row></xdr:to><xdr:grpSp/></xdr:twoCellAnchor>` +
    `<xdr:oneCellAnchor><xdr:from><xdr:col>x</xdr:col></xdr:from>${pic('rId1')}</xdr:oneCellAnchor>` +
    '<xdr:clientData/></xdr:wsDr>';
  const fixture: XlsxFixture = {
    sheets: [
      {
        name: 'S',
        xml: '<sheetData/><drawing r:id="rId1"/>',
        rels: [
          { id: 'rId1', type: 'drawing', target: '../drawings/drawing1.xml' },
        ],
      },
    ],
    extraParts: [
      {
        path: 'xl/drawings/drawing1.xml',
        data: drawing,
        contentType:
          'application/vnd.openxmlformats-officedocument.drawing+xml',
      },
      {
        path: 'xl/drawings/_rels/drawing1.xml.rels',
        data:
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>' +
          '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image2.emf"/>' +
          '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="https://example.com/x.png" TargetMode="External"/>' +
          '</Relationships>',
      },
      { path: 'xl/media/image1.png', data: new Uint8Array([1]) },
      { path: 'xl/media/image2.emf', data: new Uint8Array([2]) },
    ],
  };

  it('reads every anchor kind, crop, rotation and flips', () => {
    const { workbook, issues } = read(fixture);
    const [oneCell, absolute, twoCell] = workbook.sheets[0].pictures;
    expect(workbook.sheets[0].pictures).toHaveLength(3);
    expect(oneCell).toMatchObject({
      image: 'xl/media/image1.png',
      name: 'P',
      description: 'Alt',
      hidden: true,
      rotation: 90,
      flipH: true,
      flipV: true,
      anchor: {
        kind: 'oneCell',
        from: { col: 1, row: 2, colOffset: 1, rowOffset: 2 },
        width: 20,
        height: 10,
      },
    });
    expect(absolute).toMatchObject({
      anchor: { kind: 'absolute', x: 100, y: 0, width: 1, height: 1 },
      crop: { left: 0.1, top: 0, right: 0, bottom: 0 },
    });
    expect(twoCell.anchor).toMatchObject({
      kind: 'absolute',
      to: { col: 3, row: 4, colOffset: 0, rowOffset: 0 },
    });
    expect(issues.map((i) => [i.code, i.detail])).toEqual([
      ['drawing-not-shown', '3 shapes or linked pictures'],
      ['picture-format-not-shown', '1 EMF/WMF pictures'],
    ]);
  });
});

describe('readOgeXlsx — charts', () => {
  const frame = (id: string, uri: string, name: string) =>
    `<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="${name}" descr="Sales by month"/></xdr:nvGraphicFramePr><a:graphic><a:graphicData uri="${uri}"><c:chart r:id="${id}"/></a:graphicData></a:graphic></xdr:graphicFrame>`;
  const anchor = (inner: string) =>
    `<xdr:twoCellAnchor><xdr:from><xdr:col>1</xdr:col><xdr:row>1</xdr:row></xdr:from><xdr:to><xdr:col>6</xdr:col><xdr:row>12</xdr:row></xdr:to>${inner}<xdr:clientData/></xdr:twoCellAnchor>`;
  const CHART = 'http://schemas.openxmlformats.org/drawingml/2006/chart';
  const CHARTEX = 'http://schemas.microsoft.com/office/drawing/2014/chartex';
  const series =
    '<c:ser><c:idx val="0"/><c:order val="0"/><c:val><c:numRef><c:f>S!$A$1:$A$2</c:f><c:numCache><c:ptCount val="2"/><c:pt idx="0"><c:v>1</c:v></c:pt><c:pt idx="1"><c:v>2</c:v></c:pt></c:numCache></c:numRef></c:val></c:ser>';
  const chartPart = (group: string) =>
    `<c:chartSpace xmlns:c="c" xmlns:a="a"><c:chart><c:plotArea><c:${group}>${series}<c:axId val="1"/><c:axId val="2"/></c:${group}><c:catAx><c:axId val="1"/><c:crossAx val="2"/></c:catAx><c:valAx><c:axId val="2"/><c:crossAx val="1"/></c:valAx></c:plotArea></c:chart></c:chartSpace>`;
  const fixture: XlsxFixture = {
    sheets: [
      {
        name: 'S',
        xml: '<sheetData/><drawing r:id="rId1"/>',
        rels: [
          { id: 'rId1', type: 'drawing', target: '../drawings/drawing1.xml' },
        ],
      },
    ],
    extraParts: [
      {
        path: 'xl/drawings/drawing1.xml',
        data:
          '<xdr:wsDr xmlns:xdr="d" xmlns:a="a" xmlns:r="r" xmlns:c="c" xmlns:mc="m">' +
          anchor(frame('rId1', CHART, 'Chart 1')) +
          anchor(frame('rId2', CHART, 'Chart 2')) +
          // Excel 2016's charts come as a choice with a shape to fall back on
          anchor(
            `<mc:AlternateContent><mc:Choice Requires="cx1">${frame('rId3', CHARTEX, 'Chart 3')}</mc:Choice><mc:Fallback><xdr:sp/></mc:Fallback></mc:AlternateContent>`,
          ) +
          '</xdr:wsDr>',
        contentType:
          'application/vnd.openxmlformats-officedocument.drawing+xml',
      },
      {
        path: 'xl/drawings/_rels/drawing1.xml.rels',
        data:
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/>' +
          '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart2.xml"/>' +
          '<Relationship Id="rId3" Type="http://schemas.microsoft.com/office/2014/relationships/chartEx" Target="../charts/chartEx1.xml"/>' +
          '</Relationships>',
      },
      {
        path: 'xl/charts/chart1.xml',
        data: chartPart('barChart'),
        contentType:
          'application/vnd.openxmlformats-officedocument.drawingml.chart+xml',
      },
      {
        path: 'xl/charts/chart2.xml',
        data: chartPart('radarChart'),
        contentType:
          'application/vnd.openxmlformats-officedocument.drawingml.chart+xml',
      },
      {
        path: 'xl/charts/chartEx1.xml',
        data: '<cx:chartSpace xmlns:cx="x"><cx:chart><cx:plotArea><cx:plotAreaRegion><cx:series layoutId="waterfall"/></cx:plotAreaRegion></cx:plotArea></cx:chart></cx:chartSpace>',
        contentType: 'application/vnd.ms-office.chartex+xml',
      },
    ],
  };

  it('reads the charts it draws, with their anchor, name and alt text', () => {
    const { workbook } = read(fixture);
    const [chart] = workbook.sheets[0].charts;
    expect(workbook.sheets[0].charts).toHaveLength(1);
    expect(chart).toMatchObject({
      name: 'Chart 1',
      description: 'Sales by month',
      anchor: {
        kind: 'twoCell',
        from: { col: 1, row: 1 },
        to: { col: 6, row: 12 },
      },
    });
    expect(chart.chart.groups.map((g) => g.kind)).toEqual(['bar']);
    expect(chart.chart.groups[0].series[0].values.values).toEqual([1, 2]);
  });

  it('reads where the file lays the plot out, the crossings and the smoothing Excel assumes', () => {
    const line =
      '<c:chartSpace xmlns:c="c" xmlns:a="a"><c:chart><c:plotArea>' +
      '<c:layout><c:manualLayout><c:layoutTarget val="inner"/><c:xMode val="edge"/><c:yMode val="edge"/><c:x val="0.1"/><c:y val="0.2"/><c:w val="0.7"/><c:h val="0.6"/></c:manualLayout></c:layout>' +
      `<c:lineChart>${series}<c:axId val="1"/><c:axId val="2"/></c:lineChart>` +
      '<c:catAx><c:axId val="1"/><c:crossAx val="2"/></c:catAx><c:valAx><c:axId val="2"/><c:crossAx val="1"/><c:crossBetween val="midCat"/></c:valAx>' +
      '</c:plotArea></c:chart></c:chartSpace>';
    const { workbook } = read({
      ...fixture,
      extraParts: (fixture.extraParts ?? []).map((part) =>
        part.path === 'xl/charts/chart1.xml' ? { ...part, data: line } : part,
      ),
    });
    const model = workbook.sheets[0]?.charts[0]?.chart;
    expect(model?.plotLayout).toEqual({
      x: 0.1,
      y: 0.2,
      w: 0.7,
      h: 0.6,
      xMode: 'edge',
      yMode: 'edge',
      target: 'inner',
    });
    expect(model?.axes.find((a) => a.kind === 'value')?.crossBetween).toBe(
      'midCat',
    );
    // a line series without c:smooth: Excel smooths it (and saves smooth="1")
    expect(model?.groups[0]?.series[0]?.smooth).toBe(true);
  });

  it('reads charts in every anchor kind, and counts the frames it cannot read as shapes', () => {
    const chartFrame = (id: string, attrs = '') =>
      `<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="C"${attrs}/></xdr:nvGraphicFramePr><a:graphic><a:graphicData uri="${CHART}"><c:chart r:id="${id}"/></a:graphicData></a:graphic></xdr:graphicFrame>`;
    const from =
      '<xdr:from><xdr:col>1</xdr:col><xdr:row>1</xdr:row></xdr:from>';
    const drawing =
      '<xdr:wsDr xmlns:xdr="d" xmlns:a="a" xmlns:r="r" xmlns:c="c" xmlns:mc="m">' +
      `<xdr:absoluteAnchor><xdr:pos x="9525" y="19050"/><xdr:ext cx="952500" cy="476250"/>${chartFrame('rId1', ' hidden="1"')}</xdr:absoluteAnchor>` +
      `<xdr:oneCellAnchor>${from}<xdr:ext cx="952500" cy="476250"/>${chartFrame('rId1')}</xdr:oneCellAnchor>` +
      `<xdr:twoCellAnchor editAs="absolute">${from}<xdr:to><xdr:col>4</xdr:col><xdr:row>9</xdr:row></xdr:to>${chartFrame('rId1')}</xdr:twoCellAnchor>` +
      // a chart only a fallback carries
      `<xdr:twoCellAnchor>${from}<xdr:to><xdr:col>4</xdr:col><xdr:row>9</xdr:row></xdr:to><mc:AlternateContent><mc:Fallback>${chartFrame('rId1')}</mc:Fallback></mc:AlternateContent></xdr:twoCellAnchor>` +
      // shapes to the reader: no id, an external part, a missing one, a broken one, no placement
      `<xdr:twoCellAnchor>${from}<xdr:to><xdr:col>4</xdr:col><xdr:row>9</xdr:row></xdr:to><xdr:graphicFrame><a:graphic><a:graphicData uri="${CHART}"><c:chart/></a:graphicData></a:graphic></xdr:graphicFrame></xdr:twoCellAnchor>` +
      `<xdr:twoCellAnchor>${from}<xdr:to><xdr:col>4</xdr:col><xdr:row>9</xdr:row></xdr:to>${chartFrame('rId2')}</xdr:twoCellAnchor>` +
      `<xdr:twoCellAnchor>${from}<xdr:to><xdr:col>4</xdr:col><xdr:row>9</xdr:row></xdr:to>${chartFrame('rId3')}</xdr:twoCellAnchor>` +
      `<xdr:twoCellAnchor>${from}<xdr:to><xdr:col>4</xdr:col><xdr:row>9</xdr:row></xdr:to>${chartFrame('rId4')}</xdr:twoCellAnchor>` +
      `<xdr:absoluteAnchor>${chartFrame('rId1')}</xdr:absoluteAnchor>` +
      // a chart with nothing in its plot area
      `<xdr:twoCellAnchor>${from}<xdr:to><xdr:col>4</xdr:col><xdr:row>9</xdr:row></xdr:to>${chartFrame('rId5')}</xdr:twoCellAnchor>` +
      '</xdr:wsDr>';
    const rel = (id: string, target: string, external = false) =>
      `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="${target}"${external ? ' TargetMode="External"' : ''}/>`;
    const anchors = read({
      ...fixture,
      extraParts: [
        ...(fixture.extraParts ?? []).filter(
          (p) => !p.path.startsWith('xl/drawings/'),
        ),
        {
          path: 'xl/drawings/drawing1.xml',
          data: drawing,
          contentType:
            'application/vnd.openxmlformats-officedocument.drawing+xml',
        },
        {
          path: 'xl/drawings/_rels/drawing1.xml.rels',
          data:
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
            rel('rId1', '../charts/chart1.xml') +
            rel('rId2', 'https://example.com/chart.xml', true) +
            rel('rId3', '../charts/missing.xml') +
            rel('rId4', '../charts/broken.xml') +
            rel('rId5', '../charts/empty.xml') +
            '</Relationships>',
        },
        {
          path: 'xl/charts/broken.xml',
          data: '<c:chartSpace xmlns:c="c"><c:chart>',
          contentType:
            'application/vnd.openxmlformats-officedocument.drawingml.chart+xml',
        },
        {
          path: 'xl/charts/empty.xml',
          data: '<c:chartSpace xmlns:c="c"><c:chart><c:plotArea/></c:chart></c:chartSpace>',
          contentType:
            'application/vnd.openxmlformats-officedocument.drawingml.chart+xml',
        },
      ],
    });
    const charts = anchors.workbook.sheets[0]?.charts ?? [];
    expect(charts.map((c) => c.anchor.kind)).toEqual([
      'absolute',
      'oneCell',
      'absolute',
      'twoCell',
    ]);
    expect(charts[0]).toMatchObject({
      hidden: true,
      anchor: { x: 1, y: 2, width: 100, height: 50 },
    });
    expect(charts[1]?.anchor).toMatchObject({ width: 100, height: 50 });
    expect(charts[1]?.description).toBeUndefined();
    expect(anchors.issues.map((i) => [i.code, i.detail])).toEqual([
      ['drawing-not-shown', '5 shapes or linked pictures'],
      ['chart-type-not-shown', 'empty'],
    ]);
  });

  it('counts the chart types it does not draw, Excel 2016 charts by layout', () => {
    const { issues } = read(fixture);
    expect(issues.map((i) => [i.code, i.detail])).toEqual([
      ['chart-type-not-shown', 'radar, waterfall'],
    ]);
  });
});
