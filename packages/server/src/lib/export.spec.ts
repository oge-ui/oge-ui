import { DatabaseSync } from 'node:sqlite';
import ExcelJS from 'exceljs';
import { foldText } from '@oge-ui/core';
import {
  ogeCsvChunks,
  ogeExportResponse,
  ogeParseExportRequest,
  ogeSqlRows,
  ogeXlsxStream,
  type OgeExportFileColumn,
} from './export';
import type { OgeSqlRunner } from './load';
import { OgeServerError, type OgeServerSchema } from './schema';
import { ogeSqliteDialect } from './sql';

const SCHEMA: OgeServerSchema = {
  key: 'id',
  fields: {
    id: { type: 'number' },
    name: {},
    total: { type: 'number' },
    placed: { type: 'date' },
    paid: { type: 'boolean' },
  },
};

const COLUMNS: OgeExportFileColumn[] = [
  { field: 'id', caption: 'ID', dataType: 'number', width: 70 },
  { field: 'name', caption: 'Customer', dataType: 'string' },
  { field: 'total', caption: 'Total', dataType: 'number' },
  {
    field: 'placed',
    caption: 'Placed',
    dataType: 'datetime',
    timeZone: 'Europe/Istanbul',
  },
  { field: 'paid', caption: 'Paid', dataType: 'boolean' },
];

const bytesOf = async (stream: ReadableStream<Uint8Array>) =>
  new Uint8Array(await new Response(stream).arrayBuffer());
const textOf = async (chunks: AsyncIterable<string>) => {
  let out = '';
  for await (const chunk of chunks) out += chunk;
  return out;
};

describe('ogeParseExportRequest', () => {
  it('checks the query, the columns and the keys, and cleans the file name', () => {
    const request = ogeParseExportRequest(
      JSON.stringify({
        format: 'xlsx',
        fileName: '../../etc/Orders\u0007 2026.xlsx',
        loadOptions: {
          filter: { type: 'binary', field: 'name', op: 'contains', value: 'a' },
          sort: [{ field: 'total', dir: 'desc' }],
          searchText: 'acme',
          take: 10,
        },
        columns: [
          { field: 'id', caption: 'ID', dataType: 'number', width: 70 },
          {
            field: 'placed',
            timeZone: 'Europe/Istanbul',
            dataType: 'BAD TYPE',
          },
        ],
        selectedKeys: [1, 'x'],
      }),
      SCHEMA,
    );
    expect(request.fileName).toBe('.._.._etc_Orders 2026.xlsx');
    expect(request.loadOptions.take).toBeUndefined();
    expect(request.loadOptions.sort).toEqual([{ field: 'total', dir: 'desc' }]);
    expect(request.columns).toEqual([
      { field: 'id', caption: 'ID', dataType: 'number', width: 70 },
      {
        field: 'placed',
        caption: 'placed',
        dataType: 'date',
        timeZone: 'Europe/Istanbul',
      },
    ]);
    expect(request.selectedKeys).toEqual([1, 'x']);
    expect(
      ogeParseExportRequest(
        { format: 'csv', columns: [{ field: 'id' }] },
        SCHEMA,
      ).fileName,
    ).toBe('export.csv');
  });

  it('refuses what the schema or the limits do not allow', () => {
    const bad =
      (input: unknown, schema = SCHEMA) =>
      () =>
        ogeParseExportRequest(input, schema);
    expect(bad('{')).toThrow('not valid JSON');
    expect(bad([])).toThrow('must be an object');
    expect(bad({ format: 'pdf' })).toThrow('"format"');
    expect(bad({ format: 'csv' })).toThrow('at least one column');
    expect(
      bad({
        format: 'csv',
        columns: Array.from({ length: 501 }, () => ({ field: 'id' })),
      }),
    ).toThrow('Too many columns');
    expect(bad({ format: 'csv', columns: [{}] })).toThrow('needs a field');
    expect(bad({ format: 'csv', columns: [{ field: 'secret' }] })).toThrow(
      OgeServerError,
    );
    expect(
      bad({ format: 'csv', columns: [{ field: 'id' }], selectedKeys: [{}] }),
    ).toThrow('list of strings');
    expect(
      bad({
        format: 'csv',
        columns: [{ field: 'id' }],
        selectedKeys: Array.from({ length: 1001 }, (_, i) => i),
      }),
    ).toThrow('Too many selected keys');
    expect(
      bad(
        { format: 'csv', columns: [{ field: 'id' }], selectedKeys: [1] },
        { fields: { id: {} } },
      ),
    ).toThrow('needs the schema key');
  });
});

describe('ogeSqlRows', () => {
  function database(count: number) {
    const db = new DatabaseSync(':memory:');
    db.function('oge_fold', (v: unknown) =>
      v === null ? null : foldText(String(v)),
    );
    db.exec(
      'CREATE TABLE orders (id INTEGER, name TEXT, total REAL, placed TEXT, paid INTEGER)',
    );
    const insert = db.prepare('INSERT INTO orders VALUES (?, ?, ?, ?, ?)');
    for (let i = 1; i <= count; i++) {
      insert.run(
        i,
        i % 2 ? 'Acme' : 'Globex',
        i * 1.5,
        '2026-01-01T09:00:00Z',
        i % 3 ? 1 : 0,
      );
    }
    const run: OgeSqlRunner = async ({ sql, params }) =>
      db
        .prepare(sql)
        .all(
          ...(params.map((p) =>
            typeof p === 'number' && Number.isInteger(p) ? BigInt(p) : p,
          ) as never[]),
        ) as Record<string, unknown>[];
    return { schema: SCHEMA, from: 'orders', dialect: ogeSqliteDialect(), run };
  }

  it('reads every matching row in batches, keyed, without gaps or repeats', async () => {
    const config = database(23);
    const ids: number[] = [];
    for await (const row of ogeSqlRows(
      {
        loadOptions: {
          filter: { type: 'binary', field: 'name', op: 'eq', value: 'acme' },
        },
      },
      config,
      { batchSize: 5 },
    )) {
      ids.push(row['id'] as number);
    }
    expect(ids).toEqual([1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23]);
    const selected: number[] = [];
    for await (const row of ogeSqlRows(
      { loadOptions: {}, selectedKeys: [4, 2, 99] },
      config,
    )) {
      selected.push(row['id'] as number);
    }
    expect(selected).toEqual([2, 4]);
    const limited: unknown[] = [];
    for await (const row of ogeSqlRows({ loadOptions: {} }, config, {
      batchSize: 10,
      maxRows: 15,
    })) {
      limited.push(row);
    }
    expect(limited).toHaveLength(15);
    const keyless = { ...config, schema: { fields: { id: {} } } };
    await expect(
      ogeSqlRows({ loadOptions: {}, selectedKeys: [1] }, keyless).next(),
    ).rejects.toThrow('needs the schema key');
  });
});

describe('ogeCsvChunks', () => {
  it('writes a BOM, a header, guarded cells and the zone wall clock', async () => {
    const csv = await textOf(
      ogeCsvChunks(
        [
          {
            id: 1,
            name: '=HYPERLINK("x")',
            total: 12.5,
            placed: '2026-01-01T09:00:00Z',
            paid: true,
          },
          {
            id: 2,
            name: 'Smith, "Jo"',
            total: null,
            placed: null,
            paid: false,
          },
        ],
        COLUMNS,
      ),
    );
    expect(
      csv.startsWith(
        String.fromCharCode(0xfeff) + 'ID,Customer,Total,Placed,Paid\r\n',
      ),
    ).toBe(true);
    expect(csv).toContain(
      `1,"'=HYPERLINK(""x"")",12.5,2026-01-01 12:00:00,true\r\n`,
    );
    expect(csv).toContain('2,"Smith, ""Jo""",,,false\r\n');
    const plain = await textOf(
      ogeCsvChunks(
        (function* () {
          for (let i = 0; i < 1001; i++)
            yield { d: new Date(Date.UTC(2026, 0, 2)) };
        })(),
        [{ field: 'd', caption: 'Day', dataType: 'date' }],
        { separator: ';', bom: false },
      ),
    );
    expect(plain.startsWith('Day\r\n2026-01-02\r\n')).toBe(true);
    expect(plain.split('\r\n')).toHaveLength(1003);
  });
});

describe('ogeXlsxStream', () => {
  it('writes a workbook Excel and exceljs read back: header, types, zone dates, filter', async () => {
    async function* rows() {
      yield {
        id: 1,
        name: 'Acme <&> "Ltd"',
        total: 12.5,
        placed: '2026-01-01T09:00:00Z',
        paid: true,
      };
      yield {
        id: 2,
        name: 'Bad\u0001char',
        total: 3n,
        placed: new Date('invalid'),
        paid: false,
      };
      yield {
        id: 3,
        name: null,
        total: undefined,
        placed: '2026-03-01T21:30:00Z',
        paid: null,
      };
    }
    const bytes = await bytesOf(
      ogeXlsxStream(rows(), COLUMNS, { sheetName: 'Orders/2026' }),
    );
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes.buffer as ArrayBuffer);
    const sheet = workbook.worksheets[0];
    expect(sheet.name).toBe('Orders 2026');
    expect(sheet.getRow(1).values).toEqual([
      undefined,
      'ID',
      'Customer',
      'Total',
      'Placed',
      'Paid',
    ]);
    expect(sheet.getCell('A1').font?.bold).toBe(true);
    expect(sheet.getCell('B2').value).toBe('Acme <&> "Ltd"');
    expect(sheet.getCell('C2').value).toBe(12.5);
    expect(sheet.getCell('E2').value).toBe(true);
    const placed = sheet.getCell('D2').value as Date;
    // 09:00 UTC is 12:00 in Istanbul — the wall clock the grid showed
    expect(placed.toISOString()).toBe('2026-01-01T12:00:00.000Z');
    expect(sheet.getCell('D2').numFmt).toBe('yyyy-mm-dd hh:mm');
    expect(sheet.getCell('B3').value).toBe('Badchar');
    expect(sheet.getCell('C3').value).toBe(3);
    expect(sheet.getCell('D3').value).toBe('Invalid Date');
    expect(sheet.getCell('B4').value).toBeNull();
    expect(sheet.getColumn(1).width).toBe(10);
    expect(sheet.autoFilter).toBe('A1:E4');
    expect(sheet.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 });
  });

  it('streams large sheets in chunks and supports cancelling', async () => {
    const many = (function* () {
      for (let i = 0; i < 3000; i++)
        yield {
          id: i,
          name: `row ${i}`,
          total: i,
          placed: null,
          paid: i % 2 === 0,
        };
    })();
    const stream = ogeXlsxStream(many, COLUMNS);
    const reader = stream.getReader();
    let chunks = 0;
    for (;;) {
      const { done } = await reader.read();
      if (done) break;
      chunks++;
    }
    expect(chunks).toBeGreaterThan(10);
    const cancelled = ogeXlsxStream([{ id: 1 }], COLUMNS);
    const r2 = cancelled.getReader();
    await r2.read();
    await r2.cancel();
    const date = await bytesOf(
      ogeXlsxStream(
        [{ d: new Date(Date.UTC(2026, 4, 5)) }],
        [{ field: 'd', caption: 'Day', dataType: 'date' }],
      ),
    );
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(date.buffer as ArrayBuffer);
    expect(workbook.worksheets[0].getCell('A2').numFmt).toBe('yyyy-mm-dd');
    expect(workbook.worksheets[0].name).toBe('Data');
  });
});

describe('ogeExportResponse', () => {
  it('returns the streamed file with its type and a UTF-8 file name', async () => {
    const xlsx = ogeExportResponse(
      {
        format: 'xlsx',
        fileName: 'Sipariş raporu.xlsx',
        loadOptions: {},
        columns: COLUMNS,
      },
      [{ id: 1 }],
    );
    expect(xlsx.headers.get('content-type')).toContain('spreadsheetml');
    expect(xlsx.headers.get('content-disposition')).toBe(
      `attachment; filename="Sipari_ raporu.xlsx"; filename*=UTF-8''Sipari%C5%9F%20raporu.xlsx`,
    );
    expect((await xlsx.arrayBuffer()).byteLength).toBeGreaterThan(500);
    const csv = ogeExportResponse(
      {
        format: 'csv',
        fileName: 'a.csv',
        loadOptions: {},
        columns: [{ field: 'id', caption: 'ID', dataType: 'number' }],
      },
      [{ id: 7 }],
    );
    expect(csv.headers.get('content-type')).toBe('text/csv; charset=utf-8');
    // Response.text() drops the BOM: decode the bytes to see it
    const decoded = new TextDecoder('utf-8', { ignoreBOM: true }).decode(
      await csv.arrayBuffer(),
    );
    expect(decoded).toBe(String.fromCharCode(0xfeff) + 'ID\r\n7\r\n');
    const cancelled = ogeExportResponse(
      {
        format: 'csv',
        fileName: 'b.csv',
        loadOptions: {},
        columns: [{ field: 'id', caption: 'ID', dataType: 'number' }],
      },
      [{ id: 1 }],
    );
    await cancelled.body!.cancel();
  });
});
