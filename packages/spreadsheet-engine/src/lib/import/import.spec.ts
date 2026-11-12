import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createPlainSpreadsheetReactivity } from '../view/reactivity';
import {
  ogeAutoMapColumns,
  ogeConvertImportValue,
  ogeValidateImportRows,
  type OgeImportField,
} from './fields';
import {
  ogeDetectCsvDelimiter,
  ogeParseCsv,
  ogeReadImportFile,
} from './read-table';
import {
  OGE_DEFAULT_IMPORT_WIZARD_CONFIG,
  OGE_DEFAULT_IMPORT_WIZARD_MESSAGES,
  OGE_IMPORT_PREVIEW_LIMIT,
  OgeImportWizardCore,
  resolveOgeImportWizardConfig,
  type OgeImportEvent,
} from './wizard-core';

const corpus = (name: string) =>
  new Uint8Array(
    readFileSync(resolve(__dirname, '../../../testing/corpus/', name)),
  );
const utf8 = (text: string) => new TextEncoder().encode(text);

interface Person {
  name: string;
  age: number;
  joined: Date;
  active: boolean;
  email: string;
}

const FIELDS: OgeImportField<Person>[] = [
  { field: 'name', label: 'Full name', required: true, aliases: ['Ad Soyad'] },
  { field: 'age', label: 'Age', type: 'number' },
  {
    field: 'joined',
    label: 'Start date',
    type: 'date',
    aliases: ['joined on'],
  },
  { field: 'active', label: 'Active', type: 'boolean' },
  {
    field: 'email',
    label: 'E-mail',
    validate: (value) =>
      String(value).includes('@') ? null : 'E-mail needs an @',
  },
];

describe('ogeParseCsv', () => {
  it('reads quotes, doubled quotes, line breaks and every line end', () => {
    expect(
      ogeParseCsv('﻿a,b,c\r\n"x, y","say ""hi""","two\nlines"\r3,,4\n\n'),
    ).toEqual([
      ['a', 'b', 'c'],
      ['x, y', 'say "hi"', 'two\nlines'],
      ['3', '', '4'],
    ]);
    expect(ogeParseCsv('a;b\n1;2', { maxRows: 1 })).toEqual([['a', 'b']]);
    expect(ogeParseCsv('lonely')).toEqual([['lonely']]);
  });

  it('detects the delimiter that splits the lines consistently', () => {
    expect(ogeDetectCsvDelimiter('a;b;c\n1;2,5;3')).toBe(';');
    expect(ogeDetectCsvDelimiter('a\tb\n1\t2')).toBe('\t');
    expect(ogeDetectCsvDelimiter('"a,b"|c\n1|2')).toBe('|');
    expect(ogeDetectCsvDelimiter('single')).toBe(',');
  });
});

describe('ogeReadImportFile', () => {
  it('reads CSV bytes as UTF-8, falling back to Windows-1252', async () => {
    const book = await ogeReadImportFile(utf8('Ad;Şehir\nAyşe;İzmir'), {
      name: 'people.csv',
    });
    expect(book.format).toBe('csv');
    expect(book.sheets[0]).toEqual({
      name: 'people',
      rows: [
        ['Ad', 'Şehir'],
        ['Ayşe', 'İzmir'],
      ],
    });
    const latin = await ogeReadImportFile(
      new Uint8Array([0x63, 0x61, 0x66, 0xe9]),
    );
    expect(latin.sheets[0].rows[0][0]).toBe('café');
    const tsv = await ogeReadImportFile(new Blob(['a,b\tc']), {
      name: 'x.tsv',
    });
    expect(tsv.sheets[0].rows[0]).toEqual(['a,b', 'c']);
  });

  it('reads a workbook, dates as Date and the sheets that show', async () => {
    const book = await ogeReadImportFile(corpus('autofit.xlsx'));
    expect(book.format).toBe('xlsx');
    const first = book.sheets[0].rows[0];
    expect(first[0]).toBe('Hello');
    expect(first[2]).toBe(1234567.891);
    expect(first[4]).toBeInstanceOf(Date);
    expect(first[12]).toBe(true);
    expect(first[13]).toBeNull();
    const dates = await ogeReadImportFile(
      new Blob([corpus('dates1904.xlsx')]),
      { name: 'dates1904.xlsx', maxRows: 2 },
    );
    expect(dates.sheets[0].rows).toHaveLength(2);
    expect((dates.sheets[0].rows[1][0] as Date).getFullYear()).toBe(1904);
  });
});

describe('ogeAutoMapColumns', () => {
  it('matches keys, labels and aliases once, ignoring case and punctuation', () => {
    expect(
      ogeAutoMapColumns(
        ['AD SOYAD', 'age', 'Joined-On', 'e_mail', 'Age', 'notes', ''],
        FIELDS as OgeImportField<never>[],
      ),
    ).toEqual(['name', 'age', 'joined', 'email', null, null, null]);
  });
});

describe('ogeConvertImportValue', () => {
  it('parses numbers in both decimal styles, percents and groups', () => {
    const n = (raw: string, decimal?: '.' | ',') =>
      ogeConvertImportValue(raw, 'number', { decimalSeparator: decimal }).value;
    expect(n('1,234.5')).toBe(1234.5);
    expect(n('1.234,5')).toBe(1234.5);
    expect(n('12,5')).toBe(12.5);
    expect(n('12,500')).toBe(12500);
    expect(n('1 234')).toBe(1234);
    expect(n('15%')).toBe(0.15);
    expect(n('3,5', ',')).toBe(3.5);
    expect(n('-2e3')).toBe(-2000);
    expect(ogeConvertImportValue('12abc', 'number').error).toBe(
      'invalidNumber',
    );
    expect(ogeConvertImportValue('%', 'number').error).toBe('invalidNumber');
    expect(ogeConvertImportValue(true, 'number').error).toBe('invalidNumber');
    expect(ogeConvertImportValue(42, 'number').value).toBe(42);
  });

  it('parses ISO dates and the three day orders, rejecting impossible days', () => {
    const d = (raw: string, order?: 'dmy' | 'mdy' | 'ymd') =>
      ogeConvertImportValue(raw, 'date', { dateOrder: order }).value as Date;
    expect(d('2026-03-04').getDate()).toBe(4);
    expect(d('2026-03-04 10:30').getHours()).toBe(10);
    expect(d('2026-03-04T10:30:00Z').getTime()).toBe(
      Date.UTC(2026, 2, 4, 10, 30),
    );
    expect(d('04.03.2026').getMonth()).toBe(2);
    expect(d('03/04/2026', 'mdy').getDate()).toBe(4);
    expect(d('26/3/4', 'ymd').getFullYear()).toBe(2026);
    expect(d('2026/3/4').getDate()).toBe(4);
    expect(d('4.3.26 08:15').getMinutes()).toBe(15);
    expect(ogeConvertImportValue('31.02.2026', 'date').error).toBe(
      'invalidDate',
    );
    expect(ogeConvertImportValue('soon', 'date').error).toBe('invalidDate');
    expect(ogeConvertImportValue(5, 'date').error).toBe('invalidDate');
    const now = new Date();
    expect(ogeConvertImportValue(now, 'date').value).toBe(now);
  });

  it('reads booleans, text and empty cells', () => {
    expect(ogeConvertImportValue('Evet', 'boolean').value).toBe(true);
    expect(ogeConvertImportValue('0', 'boolean').value).toBe(false);
    expect(ogeConvertImportValue(false, 'boolean').value).toBe(false);
    expect(
      ogeConvertImportValue('aktif', 'boolean', {
        booleanWords: { true: ['Aktif'], false: ['pasif'] },
      }).value,
    ).toBe(true);
    expect(ogeConvertImportValue('maybe', 'boolean').error).toBe(
      'invalidBoolean',
    );
    expect(ogeConvertImportValue('  hi  ').value).toBe('hi');
    expect(ogeConvertImportValue(7).value).toBe('7');
    expect(ogeConvertImportValue(new Date(Date.UTC(2026, 0, 1))).value).toBe(
      '2026-01-01T00:00:00.000Z',
    );
    expect(ogeConvertImportValue('   ', 'number')).toEqual({ value: null });
    expect(ogeConvertImportValue(null, 'date')).toEqual({ value: null });
  });
});

describe('ogeValidateImportRows', () => {
  it('converts, then checks required and each field', () => {
    const results = ogeValidateImportRows(
      [
        ['Ayşe', '34', '2026-01-05', 'yes', 'a@x.com'],
        ['', 'many', '', 'no', 'nope'],
      ],
      ['name', 'age', 'joined', 'active', 'email'],
      FIELDS,
    );
    expect(results[0].errors).toEqual([]);
    expect(results[0].record.age).toBe(34);
    expect(results[1].errors.map((e) => e.message)).toEqual([
      'Age must be a number',
      'Full name is required',
      'E-mail needs an @',
    ]);
    // an unmapped required field is reported with column -1
    const unmapped = ogeValidateImportRows([['x']], [null], FIELDS);
    expect(unmapped[0].errors).toEqual([
      { field: 'name', column: -1, message: 'Full name is required' },
    ]);
  });
});

describe('OgeImportWizardCore', () => {
  function wizard(fields = FIELDS) {
    const events: OgeImportEvent<Person>[] = [];
    const steps: string[] = [];
    const core = new OgeImportWizardCore<Person>({
      reactivity: createPlainSpreadsheetReactivity(),
      messages: OGE_DEFAULT_IMPORT_WIZARD_MESSAGES,
      fields,
      onImport: (event) => events.push(event),
      onStepChange: (step) => steps.push(step),
    });
    return { core, events, steps };
  }
  const CSV =
    'Full name,Age,Start date,Active,E-mail,Notes\n' +
    'Ayşe Demir,34,05.01.2026,yes,ayse@example.com,\n' +
    'Bob,young,2026-02-01,no,bob@example.com,late\n' +
    'Cem,41,,yes,cem@example.com,';

  it('reads, maps, reviews and imports the valid rows', async () => {
    const { core, events, steps } = wizard();
    await core.load(utf8(CSV), 'people.csv');
    expect(core.step()).toBe('map');
    expect(core.fileName()).toBe('people.csv');
    expect(core.headers()).toEqual([
      'Full name',
      'Age',
      'Start date',
      'Active',
      'E-mail',
      'Notes',
    ]);
    expect(core.mapping()).toEqual([
      'name',
      'age',
      'joined',
      'active',
      'email',
      null,
    ]);
    expect(core.sampleOf(0)).toBe('Ayşe Demir, Bob, Cem');
    expect(core.sampleOf(5, 1)).toBe('late');
    expect(core.canGoNext()).toBe(true);
    core.next();
    expect(core.step()).toBe('review');
    expect(core.rowsSummary()).toBe('2 of 3 rows ready');
    expect(core.problemsSummary()).toBe('1 row has problems');
    expect(core.mappedFields().map((f) => f.field)).toEqual([
      'name',
      'age',
      'joined',
      'active',
      'email',
    ]);
    const bob = core.results()[1];
    const age = FIELDS[1];
    expect(core.errorOf(bob, age)).toBe('Age must be a number');
    expect(core.cellOf(bob, age)).toBe('young');
    expect(core.cellOf(core.results()[0], FIELDS[2])).toBe('2026-01-05');
    expect(core.cellOf(core.results()[2], FIELDS[2])).toBe('');
    core.setProblemsOnly(true);
    expect(core.previewRows().map((r) => r.index)).toEqual([1]);
    expect(core.importLabel()).toBe('Import 2 rows');
    core.setSkipInvalid(false);
    expect(core.canImport()).toBe(false);
    core.import(); // refused
    expect(events).toHaveLength(0);
    core.setSkipInvalid(true);
    core.import();
    expect(events[0].records.map((r) => r.name)).toEqual(['Ayşe Demir', 'Cem']);
    expect(events[0].skipped).toBe(1);
    expect(core.step()).toBe('done');
    expect(core.doneText()).toBe('2 rows imported, 1 skipped');
    expect(steps).toEqual(['map', 'review', 'done']);
    core.reset();
    expect(core.step()).toBe('file');
  });

  it('remaps when the header row, sheet or fields change, and holds back on a missing required field', async () => {
    const { core } = wizard();
    await core.load(utf8('x,y\n1,2'), 'plain.csv');
    expect(core.missingRequired().map((f) => f.field)).toEqual(['name']);
    expect(core.missingText()).toBe('Match the required fields: Full name');
    expect(core.canGoNext()).toBe(false);
    core.next(); // refused
    expect(core.step()).toBe('map');
    core.setHasHeader(false);
    expect(core.headers()).toEqual(['Column 1', 'Column 2']);
    expect(core.dataRows()).toHaveLength(2);
    core.setMapping(0, 'name');
    core.setMapping(1, 'name'); // the field moves
    expect(core.mapping()).toEqual([null, 'name']);
    expect(core.canGoNext()).toBe(true);
    core.setFields([{ field: 'name', label: 'Name', aliases: ['x'] }]);
    expect(core.mapping()).toEqual([null, null]);
    core.setHasHeader(true);
    expect(core.mapping()).toEqual(['name', null]);
    core.selectSheet(3); // no such sheet
    core.selectSheet(0); // already shown
    expect(core.sheetNames()).toEqual(['plain']);
    core.next();
    core.back();
    expect(core.step()).toBe('map');
    core.back();
    expect(core.step()).toBe('file');
    core.back(); // nothing before the first step
    expect(core.stepIndex()).toBe(0);
  });

  it('reports unreadable and empty files and lists at most the preview limit', async () => {
    const { core } = wizard([{ field: 'name', label: 'Name' }]);
    await core.load(utf8(''), 'empty.csv');
    expect(core.status()).toBe('error');
    expect(core.errorText()).toBe('The file has no rows to import');
    await core.load(new Uint8Array([0x50, 0x4b, 1, 2, 3]), 'broken.xlsx');
    expect(core.errorText()).toBe('The file could not be read');
    const many = ['name', ...Array.from({ length: 250 }, (_, i) => `n${i}`)];
    await core.load(utf8(many.join('\n')), 'many.csv');
    core.next();
    expect(core.previewRows()).toHaveLength(OGE_IMPORT_PREVIEW_LIMIT);
    expect(core.previewTotal()).toBe(250);
    expect(core.previewNote()).toBe('Showing the first 200 of 250 rows');
    expect(core.readingText()).toBe('Reading many.csv…');
    core.setMessages({ ...core.messages(), next: 'İleri' });
    expect(core.messages().next).toBe('İleri');
    core.setParseOptions({ decimalSeparator: ',' });
  });

  it('ignores a read overtaken by a newer one', async () => {
    const { core } = wizard();
    const first = core.load(utf8('Full name\nA'), 'a.csv');
    core.reset();
    await first;
    expect(core.step()).toBe('file');
  });

  it('merges a config over the defaults', () => {
    const config = resolveOgeImportWizardConfig({
      messages: { next: 'İleri' },
      parse: { dateOrder: 'mdy' },
    });
    expect(config.messages.next).toBe('İleri');
    expect(config.messages.back).toBe('Back');
    expect(config.parse.dateOrder).toBe('mdy');
    expect(resolveOgeImportWizardConfig(undefined)).toBe(
      OGE_DEFAULT_IMPORT_WIZARD_CONFIG,
    );
  });
});
