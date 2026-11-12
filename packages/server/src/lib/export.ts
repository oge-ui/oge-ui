/**
 * Server-side exports (P-13): the grid's `exportOnServer` request, checked;
 * rows read from SQL in batches; and the file written as a stream — CSV, or
 * a real `.xlsx` (a ZIP built on `CompressionStream`, no dependency) — so a
 * million-row export never sits in memory, on the server or in the browser.
 */
import { escapeCsvCell, type FilterExpr, type LoadOptions } from '@oge-ui/core';
import { ogeSqlLoad, type OgeSqlLoadOptions } from './load';
import { ogeParseLoadOptions, type OgeParseLimits } from './parse';
import { OgeServerError, ogeSchemaField, type OgeServerSchema } from './schema';

/** One column of the file. */
export interface OgeExportFileColumn {
  readonly field: string;
  readonly caption: string;
  /** `string`, `number`, `boolean`, `date` or `datetime`. */
  readonly dataType: string;
  readonly width?: number;
  /** A date column's zone: the file holds the wall clock there. */
  readonly timeZone?: string;
}

/** A checked export request. */
export interface OgeExportRequest {
  readonly format: 'xlsx' | 'csv';
  readonly fileName: string;
  readonly loadOptions: LoadOptions;
  readonly columns: readonly OgeExportFileColumn[];
  readonly selectedKeys?: readonly (string | number)[];
}

/** UTF-8 byte-order mark, so Excel reads the CSV as UTF-8. */
const BOM = String.fromCharCode(0xfeff);

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** A file name safe for a header and a disk: no paths, no control characters. */
function safeFileName(name: unknown, format: 'xlsx' | 'csv'): string {
  const raw = typeof name === 'string' ? name : '';
  const cleaned = raw
    .replace(/[\\/:*?"<>|]/g, '_')
    // eslint-disable-next-line no-control-regex -- stripping control characters is the point
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 120);
  const base = cleaned.replace(/\.(xlsx|csv)$/i, '') || 'export';
  return `${base}.${format}`;
}

/**
 * Checks a grid's export request (`exportOnServer`) against the schema: the
 * query as {@link ogeParseLoadOptions} does, every column a schema field, a
 * safe file name and bounded keys. Throws {@link OgeServerError} (400).
 */
export function ogeParseExportRequest(
  input: unknown,
  schema: OgeServerSchema,
  limits: OgeParseLimits = {},
): OgeExportRequest {
  let raw: unknown = input;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      throw new OgeServerError('The export request is not valid JSON');
    }
  }
  if (!isObject(raw))
    throw new OgeServerError('The export request must be an object');
  const format = raw['format'];
  if (format !== 'xlsx' && format !== 'csv') {
    throw new OgeServerError('"format" must be "xlsx" or "csv"');
  }
  const query = isObject(raw['loadOptions']) ? raw['loadOptions'] : {};
  const loadOptions = ogeParseLoadOptions(
    {
      filter: query['filter'],
      searchText: query['searchText'],
      sort: query['sort'],
    },
    schema,
    limits,
  );
  const columnsRaw = raw['columns'];
  if (!Array.isArray(columnsRaw) || columnsRaw.length === 0) {
    throw new OgeServerError('"columns" must list at least one column');
  }
  if (columnsRaw.length > 500) throw new OgeServerError('Too many columns');
  const columns = columnsRaw.map((c): OgeExportFileColumn => {
    if (!isObject(c) || typeof c['field'] !== 'string') {
      throw new OgeServerError('Each column needs a field');
    }
    const field = ogeSchemaField(schema, c['field']);
    const caption =
      typeof c['caption'] === 'string'
        ? c['caption'].slice(0, 200)
        : c['field'];
    const dataType =
      typeof c['dataType'] === 'string' && /^[a-z]{1,16}$/.test(c['dataType'])
        ? c['dataType']
        : (field.type ?? 'string');
    const width =
      typeof c['width'] === 'number' && c['width'] > 0 && c['width'] < 5000
        ? c['width']
        : undefined;
    const timeZone =
      typeof c['timeZone'] === 'string' && c['timeZone'].length < 64
        ? c['timeZone']
        : undefined;
    return {
      field: c['field'],
      caption,
      dataType,
      ...(width ? { width } : {}),
      ...(timeZone ? { timeZone } : {}),
    };
  });
  const keys = raw['selectedKeys'];
  let selectedKeys: (string | number)[] | undefined;
  if (keys !== undefined) {
    if (
      !Array.isArray(keys) ||
      keys.some((k) => typeof k !== 'string' && typeof k !== 'number')
    ) {
      throw new OgeServerError(
        '"selectedKeys" must be a list of strings or numbers',
      );
    }
    if (keys.length > (limits.maxListLength ?? 1000)) {
      throw new OgeServerError('Too many selected keys');
    }
    if (!schema.key)
      throw new OgeServerError('A selection export needs the schema key');
    selectedKeys = keys;
  }
  return {
    format,
    fileName: safeFileName(raw['fileName'], format),
    loadOptions: { ...loadOptions, take: undefined, skip: undefined },
    columns,
    ...(selectedKeys ? { selectedKeys } : {}),
  };
}

/**
 * The rows of a request, read in batches of `batchSize` (default 5 000) with
 * the schema key as the tie-breaking sort, so no row is skipped or repeated
 * between batches. Stops after `maxRows` (default 1 000 000).
 */
export async function* ogeSqlRows(
  request: Pick<OgeExportRequest, 'loadOptions' | 'selectedKeys'>,
  config: OgeSqlLoadOptions,
  options: { readonly batchSize?: number; readonly maxRows?: number } = {},
): AsyncGenerator<Record<string, unknown>> {
  const batchSize = options.batchSize ?? 5000;
  const maxRows = options.maxRows ?? 1_000_000;
  const key = config.schema.key;
  let filter: FilterExpr | null | undefined = request.loadOptions.filter;
  if (request.selectedKeys) {
    if (!key)
      throw new OgeServerError('A selection export needs the schema key');
    const selection: FilterExpr = {
      type: 'binary',
      field: key,
      op: 'in',
      value: [...request.selectedKeys],
    };
    filter = filter
      ? { type: 'and', operands: [filter, selection] }
      : selection;
  }
  for (let skip = 0; skip < maxRows; skip += batchSize) {
    const take = Math.min(batchSize, maxRows - skip);
    const page = await ogeSqlLoad<Record<string, unknown>>(
      {
        ...request.loadOptions,
        filter,
        skip,
        take,
        group: [],
        totalSummary: [],
      },
      config,
    );
    const rows = page.data as readonly Record<string, unknown>[];
    for (const row of rows) yield row;
    if (rows.length < take) return;
  }
}

type RowSource =
  AsyncIterable<Record<string, unknown>> | Iterable<Record<string, unknown>>;

/** A date's wall clock in `timeZone` (or its UTC clock), as parts. */
function wallParts(date: Date, timeZone?: string): number[] {
  if (!timeZone) {
    return [
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
    ];
  }
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return [
    get('year'),
    get('month'),
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  ];
}

const asDate = (value: unknown): Date | null => {
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
};

const pad = (n: number, size = 2) => String(n).padStart(size, '0');

/** CSV text of one cell: dates as ISO wall clock, booleans as true / false. */
function csvText(value: unknown, column: OgeExportFileColumn): string {
  if (value === null || value === undefined) return '';
  if (column.dataType === 'date' || column.dataType === 'datetime') {
    const date = asDate(value);
    if (date) {
      const [y, m, d, h, min, s] = wallParts(date, column.timeZone);
      const day = `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
      return column.dataType === 'date' && !h && !min && !s
        ? day
        : `${day} ${pad(h)}:${pad(min)}:${pad(s)}`;
    }
  }
  return String(value);
}

/**
 * The file as CSV text chunks: a header row, then one line per row, with the
 * suite's spreadsheet-formula guard. A byte-order mark first (default) so
 * Excel reads UTF-8.
 */
export async function* ogeCsvChunks(
  rows: RowSource,
  columns: readonly OgeExportFileColumn[],
  options: { readonly separator?: string; readonly bom?: boolean } = {},
): AsyncGenerator<string> {
  const separator = options.separator ?? ',';
  const line = (cells: string[]) =>
    `${cells.map((c) => escapeCsvCell(c, separator)).join(separator)}\r\n`;
  yield (options.bom === false ? '' : BOM) +
    line(columns.map((c) => c.caption));
  let batch = '';
  let count = 0;
  for await (const row of rows) {
    batch += line(columns.map((c) => csvText(row[c.field], c)));
    if (++count % 500 === 0) {
      yield batch;
      batch = '';
    }
  }
  if (batch) yield batch;
}

// --- xlsx -------------------------------------------------------------------

const encoder = new TextEncoder();
const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(bytes: Uint8Array, crc = 0): number {
  let c = ~crc >>> 0;
  for (let i = 0; i < bytes.length; i++)
    c = CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}

// eslint-disable-next-line no-control-regex -- characters XML 1.0 cannot carry
const INVALID_XML = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g;
const xml = (text: string) =>
  text
    .replace(INVALID_XML, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function columnLetter(index: number): string {
  let n = index + 1;
  let out = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    out = String.fromCharCode(65 + m) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

const EXCEL_EPOCH = Date.UTC(1899, 11, 30);

function cellXml(
  value: unknown,
  column: OgeExportFileColumn,
  ref: string,
): string {
  if (value === null || value === undefined || value === '') return '';
  if (column.dataType === 'date' || column.dataType === 'datetime') {
    const date = asDate(value);
    if (date) {
      const [y, m, d, h, min, s] = wallParts(date, column.timeZone);
      const serial =
        (Date.UTC(y, m - 1, d, h, min, s) - EXCEL_EPOCH) / 86_400_000;
      const timed = column.dataType === 'datetime' || h || min || s;
      return `<c r="${ref}" s="${timed ? 3 : 2}"><v>${serial}</v></c>`;
    }
  }
  if (typeof value === 'number' && Number.isFinite(value))
    return `<c r="${ref}"><v>${value}</v></c>`;
  if (typeof value === 'boolean')
    return `<c r="${ref}" t="b"><v>${value ? 1 : 0}</v></c>`;
  if (typeof value === 'bigint') return `<c r="${ref}"><v>${value}</v></c>`;
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xml(String(value))}</t></is></c>`;
}

const STATIC_PARTS = (sheetName: string): [string, string][] => [
  [
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
  ],
  [
    '_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
  ],
  [
    'xl/workbook.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xml(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
  ],
  [
    'xl/_rels/workbook.xml.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
  ],
  [
    'xl/styles.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/><numFmt numFmtId="165" formatCode="yyyy-mm-dd hh:mm"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>',
  ],
];

/** The worksheet XML, chunk by chunk. */
async function* sheetChunks(
  rows: RowSource,
  columns: readonly OgeExportFileColumn[],
): AsyncGenerator<string> {
  const last = columnLetter(columns.length - 1);
  const cols = columns
    .map(
      (c, i) =>
        `<col min="${i + 1}" max="${i + 1}" width="${Math.max(8, Math.round((c.width ?? 120) / 7))}" customWidth="1"/>`,
    )
    .join('');
  const header = columns
    .map(
      (c, i) =>
        `<c r="${columnLetter(i)}1" s="1" t="inlineStr"><is><t xml:space="preserve">${xml(c.caption)}</t></is></c>`,
    )
    .join('');
  yield `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${cols}</cols><sheetData><row r="1">${header}</row>`;
  let r = 1;
  let batch = '';
  for await (const row of rows) {
    r++;
    batch += `<row r="${r}">${columns.map((c, i) => cellXml(row[c.field], c, `${columnLetter(i)}${r}`)).join('')}</row>`;
    if (batch.length > 64_000) {
      yield batch;
      batch = '';
    }
  }
  yield `${batch}</sheetData><autoFilter ref="A1:${last}${r}"/></worksheet>`;
}

/** Deflates a stream of byte chunks with the platform's `CompressionStream`. */
async function* deflate(
  source: AsyncIterable<Uint8Array>,
): AsyncGenerator<Uint8Array> {
  const stream = new CompressionStream('deflate-raw');
  const writer = stream.writable.getWriter();
  const pump = (async () => {
    for await (const chunk of source)
      await writer.write(chunk as Uint8Array<ArrayBuffer>);
    await writer.close();
  })();
  const reader = stream.readable.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    yield value;
  }
  await pump;
}

/**
 * The file as a streamed `.xlsx`: one worksheet with a bold, frozen header
 * row and an autofilter, typed numbers, booleans and dates (the column zone's
 * wall clock). Built without dependencies on `CompressionStream` (Node 18+,
 * Deno, Bun, browsers, edge runtimes). ZIP32: up to 4 GB per file.
 */
export function ogeXlsxStream(
  rows: RowSource,
  columns: readonly OgeExportFileColumn[],
  options: { readonly sheetName?: string } = {},
): ReadableStream<Uint8Array> {
  const sheetName =
    (options.sheetName ?? 'Data').replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) ||
    'Data';
  async function* zip(): AsyncGenerator<Uint8Array> {
    const central: Uint8Array[] = [];
    let offset = 0;
    const entries: [string, AsyncIterable<Uint8Array>][] = [
      ...STATIC_PARTS(sheetName).map(
        ([name, text]): [string, AsyncIterable<Uint8Array>] => [
          name,
          (async function* () {
            yield encoder.encode(text);
          })(),
        ],
      ),
      [
        'xl/worksheets/sheet1.xml',
        (async function* () {
          for await (const text of sheetChunks(rows, columns))
            yield encoder.encode(text);
        })(),
      ],
    ];
    for (const [name, content] of entries) {
      const nameBytes = encoder.encode(name);
      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true);
      local.setUint16(4, 20, true);
      local.setUint16(6, 0x0808, true); // data descriptor + UTF-8 names
      local.setUint16(8, 8, true); // deflate
      local.setUint16(12, 0x21, true); // 1980-01-01
      local.setUint16(26, nameBytes.length, true);
      yield new Uint8Array(local.buffer);
      yield nameBytes;
      let crc = 0;
      let size = 0;
      let compressed = 0;
      const counted = (async function* () {
        for await (const chunk of content) {
          crc = crc32(chunk, crc);
          size += chunk.length;
          yield chunk;
        }
      })();
      for await (const chunk of deflate(counted)) {
        compressed += chunk.length;
        yield chunk;
      }
      const descriptor = new DataView(new ArrayBuffer(16));
      descriptor.setUint32(0, 0x08074b50, true);
      descriptor.setUint32(4, crc, true);
      descriptor.setUint32(8, compressed, true);
      descriptor.setUint32(12, size, true);
      yield new Uint8Array(descriptor.buffer);
      const header = new DataView(new ArrayBuffer(46));
      header.setUint32(0, 0x02014b50, true);
      header.setUint16(4, 20, true);
      header.setUint16(6, 20, true);
      header.setUint16(8, 0x0808, true);
      header.setUint16(10, 8, true);
      header.setUint16(14, 0x21, true);
      header.setUint32(16, crc, true);
      header.setUint32(20, compressed, true);
      header.setUint32(24, size, true);
      header.setUint16(28, nameBytes.length, true);
      header.setUint32(42, offset, true);
      central.push(new Uint8Array(header.buffer), nameBytes);
      offset += 30 + nameBytes.length + compressed + 16;
    }
    const centralSize = central.reduce((n, b) => n + b.length, 0);
    for (const part of central) yield part;
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, entries.length, true);
    end.setUint16(10, entries.length, true);
    end.setUint32(12, centralSize, true);
    end.setUint32(16, offset, true);
    yield new Uint8Array(end.buffer);
  }
  const iterator = zip();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await iterator.next();
      if (done) controller.close();
      else controller.enqueue(value);
    },
    async cancel() {
      await iterator.return(undefined);
    },
  });
}

/**
 * The finished `Response` for an export request: the streamed file with its
 * content type and a `Content-Disposition` that carries the file name in
 * UTF-8. Return it from a fetch-style handler, or pipe `response.body`
 * (Node: `Readable.fromWeb(response.body).pipe(res)`).
 */
export function ogeExportResponse(
  request: OgeExportRequest,
  rows: RowSource,
): Response {
  const body =
    request.format === 'xlsx'
      ? ogeXlsxStream(rows, request.columns)
      : textStream(ogeCsvChunks(rows, request.columns));
  const ascii = request.fileName
    .replace(/[^\x20-\x7e]/g, '_')
    .replace(/"/g, '');
  return new Response(body, {
    headers: {
      'content-type':
        request.format === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(request.fileName)}`,
      'cache-control': 'no-store',
    },
  });
}

function textStream(
  chunks: AsyncGenerator<string>,
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await chunks.next();
      if (done) controller.close();
      else controller.enqueue(encoder.encode(value));
    },
    async cancel() {
      await chunks.return(undefined);
    },
  });
}
