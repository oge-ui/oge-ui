import {
  ogeExportFileName,
  ogeSaveExport,
  ogeServerExportRequest,
} from './grid-server-export';
import type { OgeExportColumn } from './grid-options';

const column = (
  field: string | undefined,
  extra: Partial<OgeExportColumn> = {},
): OgeExportColumn => ({
  caption: field ?? 'Actions',
  field,
  dataType: 'string',
  accessor: () => undefined,
  ...extra,
});

describe('ogeServerExportRequest', () => {
  it('keeps the query without paging and the field columns without accessors', () => {
    const request = ogeServerExportRequest({
      format: 'xlsx',
      fileName: 'orders',
      loadOptions: {
        skip: 40,
        take: 20,
        sort: [{ field: 'total', dir: 'desc' }],
        filter: { type: 'binary', field: 'country', op: 'eq', value: 'TR' },
        searchText: 'acme',
        requireTotalCount: true,
      },
      columns: [
        column('id', { dataType: 'number', width: 80 }),
        column(undefined),
        column('placed', { dataType: 'date', timeZone: 'Europe/Istanbul' }),
      ],
      selectedKeys: [1, 2],
    });
    expect(request).toEqual({
      format: 'xlsx',
      fileName: 'orders.xlsx',
      loadOptions: {
        filter: { type: 'binary', field: 'country', op: 'eq', value: 'TR' },
        searchText: 'acme',
        sort: [{ field: 'total', dir: 'desc' }],
      },
      columns: [
        { field: 'id', caption: 'id', dataType: 'number', width: 80 },
        {
          field: 'placed',
          caption: 'placed',
          dataType: 'date',
          timeZone: 'Europe/Istanbul',
        },
      ],
      selectedKeys: [1, 2],
    });
    expect(
      ogeServerExportRequest({
        format: 'csv',
        fileName: '',
        loadOptions: {},
        columns: [],
      }),
    ).toEqual({
      format: 'csv',
      fileName: 'export.csv',
      loadOptions: {},
      columns: [],
    });
  });

  it('adds the extension once', () => {
    expect(ogeExportFileName('Report.XLSX', 'xlsx')).toBe('Report.XLSX');
    expect(ogeExportFileName('report', 'csv')).toBe('report.csv');
  });
});

describe('ogeSaveExport', () => {
  let clicked: { href: string; download: string }[];
  beforeEach(() => {
    clicked = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push({
        href: this.getAttribute('href') ?? '',
        download: this.download,
      });
    });
    URL.createObjectURL = vi.fn(() => 'blob:export');
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it('downloads a URL the server streams', async () => {
    expect(await ogeSaveExport('/api/export/42', 'orders.xlsx', document)).toBe(
      true,
    );
    expect(clicked).toEqual([
      { href: '/api/export/42', download: 'orders.xlsx' },
    ]);
  });

  it('saves a Blob, and a Response without the picker through a Blob', async () => {
    await ogeSaveExport(new Blob(['a,b']), 'a.csv', document);
    const response = {
      ok: true,
      body: null,
      blob: async () => new Blob(['x']),
    } as unknown as Response;
    await ogeSaveExport(response, 'b.csv', document);
    expect(clicked.map((c) => c.download)).toEqual(['a.csv', 'b.csv']);
    await new Promise((r) => setTimeout(r));
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it('streams a Response to the picked file, and reports a cancelled picker', async () => {
    const pipeTo = vi.fn(async () => undefined);
    const writable = {} as WritableStream<Uint8Array>;
    const view = {
      showSaveFilePicker: vi.fn(async () => ({
        createWritable: async () => writable,
      })),
    };
    const doc = { defaultView: view } as unknown as Document;
    const response = { ok: true, body: { pipeTo } } as unknown as Response;
    expect(await ogeSaveExport(response, 'big.xlsx', doc)).toBe(true);
    expect(view.showSaveFilePicker).toHaveBeenCalledWith({
      suggestedName: 'big.xlsx',
    });
    expect(pipeTo).toHaveBeenCalledWith(writable);
    view.showSaveFilePicker.mockRejectedValueOnce(
      Object.assign(new Error('no'), { name: 'AbortError' }),
    );
    expect(await ogeSaveExport(response, 'big.xlsx', doc)).toBe(false);
    view.showSaveFilePicker.mockRejectedValueOnce(new Error('denied'));
    await expect(ogeSaveExport(response, 'big.xlsx', doc)).rejects.toThrow(
      'denied',
    );
  });

  it('refuses a failed response', async () => {
    const response = {
      ok: false,
      status: 500,
      statusText: 'Server Error',
    } as Response;
    await expect(ogeSaveExport(response, 'x.csv', document)).rejects.toThrow(
      'The export failed: 500 Server Error',
    );
  });
});
