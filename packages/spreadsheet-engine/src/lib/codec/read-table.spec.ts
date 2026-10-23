import { buildXlsxFixture } from '../../testing/xlsx-fixture';
import { readOgeStyleSheet } from './read-styles';
import { readOgeTable } from './read-table';
import { readOgeXlsxSync } from './read-xlsx';
import { parseOgeXmlTree } from './xml-tree';

const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const TABLE_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml';

describe('readOgeTable', () => {
  it('reads the range, header and totals rows, columns, style and filter buttons', () => {
    const xml =
      `<table xmlns="${NS}" id="3" name="Sales" displayName="SalesTable" ref="B2:D9" totalsRowCount="1">` +
      '<autoFilter ref="B2:D8"><filterColumn colId="1" hiddenButton="1"/><filterColumn colId="2" showButton="0"/><filterColumn colId="0"><filters><filter val="x"/></filters></filterColumn></autoFilter>' +
      '<tableColumns count="3"><tableColumn id="1" name="Region" totalsRowLabel="Total"/><tableColumn id="2" name="Q1" totalsRowFunction="sum"/><tableColumn name="Q2" totalsRowFunction="none"/></tableColumns>' +
      '<tableStyleInfo name="TableStyleMedium2" showFirstColumn="1" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/>' +
      '</table>';
    const table = readOgeTable(xml, 'xl/tables/table3.xml');
    expect(table).toEqual({
      id: 3,
      name: 'Sales',
      displayName: 'SalesTable',
      range: { top: 1, left: 1, bottom: 8, right: 3 },
      headerRowCount: 1,
      totalsRowCount: 1,
      columns: [
        { id: 1, name: 'Region', totalsRowLabel: 'Total' },
        { id: 2, name: 'Q1', totalsRowFunction: 'sum' },
        { id: 3, name: 'Q2' },
      ],
      style: {
        name: 'TableStyleMedium2',
        showFirstColumn: true,
        showLastColumn: false,
        showRowStripes: true,
        showColumnStripes: false,
      },
      autoFilter: {
        range: { top: 1, left: 1, bottom: 7, right: 3 },
        columns: [
          {
            offset: 1,
            xml: '<filterColumn colId="1" hiddenButton="1"/>',
            hiddenButton: true,
          },
          {
            offset: 2,
            xml: '<filterColumn colId="2" showButton="0"/>',
            hiddenButton: true,
          },
          {
            offset: 0,
            xml: '<filterColumn colId="0"><filters><filter val="x"/></filters></filterColumn>',
          },
        ],
      },
      part: 'xl/tables/table3.xml',
    });
  });

  it('defaults what the part leaves out, and refuses an unreadable range', () => {
    const bare = readOgeTable(
      `<table xmlns="${NS}" displayName="Only" ref="A1:B2" headerRowCount="0" totalsRowCount="3"><tableStyleInfo showRowStripes="1"/><autoFilter ref="??"/></table>`,
      'p',
    );
    expect(bare).toEqual({
      id: 0,
      name: 'Only',
      displayName: 'Only',
      range: { top: 0, left: 0, bottom: 1, right: 1 },
      headerRowCount: 0,
      // a table has one totals row at most
      totalsRowCount: 1,
      columns: [],
      style: {
        showFirstColumn: false,
        showLastColumn: false,
        showRowStripes: true,
        showColumnStripes: false,
      },
      part: 'p',
    });
    expect(readOgeTable(`<table xmlns="${NS}" ref="A1"/>`, 'p')).toMatchObject({
      name: '',
      displayName: '',
    });
    expect(readOgeTable(`<table xmlns="${NS}" ref="nowhere"/>`, 'p')).toBe(
      undefined,
    );
  });
});

describe('readOgeStyleSheet — table styles', () => {
  it('reads the workbook’s table styles, inner borders and explicit "off" flags of differential formats', () => {
    const sheet = readOgeStyleSheet(
      parseOgeXmlTree(
        '<styleSheet><fonts><font><sz val="11"/></font></fonts>' +
          '<borders><border><left/><right/><top/><bottom/><vertical style="thin"/><diagonal/></border></borders>' +
          '<dxfs><dxf><font><i val="0"/><b/></font><border><vertical style="thin"><color rgb="FF00FF00"/></vertical><horizontal style="medium"/></border></dxf></dxfs>' +
          '<tableStyles count="2" defaultTableStyle="Mine" defaultPivotStyle="PivotStyleLight16">' +
          '<tableStyle name="Mine" pivot="0" count="2"><tableStyleElement type="wholeTable" dxfId="0"/><tableStyleElement type="firstRowStripe" size="12"/><tableStyleElement size="1"/></tableStyle>' +
          '<tableStyle table="0"/></tableStyles>' +
          '</styleSheet>',
      ),
    );
    expect(sheet.differential).toEqual([
      {
        font: { italic: false, bold: true },
        border: {
          vertical: { style: 'thin', color: { rgb: 'FF00FF00' } },
          horizontal: { style: 'medium' },
        },
      },
    ]);
    // a cell's border has no inner lines
    expect(sheet.tableStyles).toEqual([
      {
        name: 'Mine',
        pivot: false,
        table: true,
        elements: [
          { type: 'wholeTable', dxf: 0 },
          { type: 'firstRowStripe', size: 9 },
          { type: '' },
        ],
      },
      { name: '', pivot: true, table: false, elements: [] },
    ]);
    expect(sheet.defaultTableStyle).toBe('Mine');
    expect(sheet.defaultPivotStyle).toBe('PivotStyleLight16');
    expect(readOgeStyleSheet(parseOgeXmlTree('<styleSheet/>'))).toMatchObject({
      tableStyles: [],
      defaultTableStyle: undefined,
    });
  });
});

describe('readOgeXlsx — tables', () => {
  const tablePart = (ref: string, style = 'TableStyleLight1') =>
    `<table xmlns="${NS}" id="1" name="T" displayName="T" ref="${ref}"><tableStyleInfo name="${style}" showRowStripes="1"/></table>`;
  const read = (
    parts: readonly { path: string; data: string }[],
    rels: readonly { id: string; target: string; external?: boolean }[],
  ) =>
    readOgeXlsxSync(
      buildXlsxFixture({
        styles:
          '<fonts count="1"><font><sz val="11"/></font></fonts><cellXfs count="1"><xf/></cellXfs>' +
          '<dxfs count="1"><dxf><fill><patternFill><bgColor rgb="FFFF0000"/></patternFill></fill></dxf></dxfs>' +
          '<tableStyles count="1"><tableStyle name="Red" pivot="0" count="1"><tableStyleElement type="wholeTable" dxfId="0"/></tableStyle></tableStyles>',
        sheets: [
          {
            name: 'S',
            xml: `<sheetData/><tableParts count="${rels.length}">${rels.map((r) => `<tablePart r:id="${r.id}"/>`).join('')}</tableParts>`,
            rels: rels.map((r) => ({ ...r, type: 'table' })),
          },
        ],
        extraParts: parts.map((p) => ({ ...p, contentType: TABLE_TYPE })),
      }),
    );

  it('reads each table part of a sheet and keeps the parts for saving', () => {
    const { workbook, issues } = read(
      [
        { path: 'xl/tables/table1.xml', data: tablePart('A1:B3') },
        { path: 'xl/tables/table2.xml', data: tablePart('D1:E3', 'Red') },
      ],
      [
        { id: 'rId1', target: '../tables/table1.xml' },
        { id: 'rId2', target: '../tables/table2.xml' },
        // another workbook's table is not this sheet's
        { id: 'rId3', target: 'https://example.com/table.xml', external: true },
      ],
    );
    expect(workbook.sheets[0].tables.map((t) => t.style?.name)).toEqual([
      'TableStyleLight1',
      'Red',
    ]);
    expect(workbook.tableStyles.map((s) => s.name)).toEqual(['Red']);
    expect(workbook.opaqueParts.map((p) => p.path)).toEqual(
      expect.arrayContaining(['xl/tables/table1.xml', 'xl/tables/table2.xml']),
    );
    expect(issues).toEqual([]);
  });

  it('reports a missing, a damaged and an unreadable table part, and a style nobody defines', () => {
    const { workbook, issues } = read(
      [
        { path: 'xl/tables/table2.xml', data: '<table' },
        { path: 'xl/tables/table3.xml', data: tablePart('nowhere') },
        { path: 'xl/tables/table4.xml', data: tablePart('A1:B3', 'Gone') },
      ],
      [
        { id: 'rId1', target: '../tables/table1.xml' },
        { id: 'rId2', target: '../tables/table2.xml' },
        { id: 'rId3', target: '../tables/table3.xml' },
        { id: 'rId4', target: '../tables/table4.xml' },
      ],
    );
    expect(workbook.sheets[0].tables).toHaveLength(1);
    expect(issues.map((i) => [i.code, i.part, i.detail])).toEqual([
      ['missing-part', 'xl/tables/table1.xml', undefined],
      ['malformed-part', 'xl/tables/table2.xml', expect.any(String)],
      ['invalid-reference', 'xl/tables/table3.xml', undefined],
      ['table-style-not-shown', 'xl/tables/table4.xml', 'Gone'],
    ]);
  });
});
