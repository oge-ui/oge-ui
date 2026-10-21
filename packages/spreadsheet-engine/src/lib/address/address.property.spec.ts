import fc from 'fast-check';
import {
  OGE_SHEET_MAX_COLUMNS,
  OGE_SHEET_MAX_ROWS,
  formatOgeR1C1Address,
  formatOgeRangeAddress,
  ogeColumnIndex,
  ogeColumnName,
  parseOgeCellAddress,
  parseOgeR1C1Address,
  parseOgeRangeAddress,
  type OgeRangeAddress,
} from './address';

/**
 * Property-based (fuzz) tests: the address parsers read formula text, defined
 * names and pasted references, so they must never throw and must round-trip
 * everything their formatters write.
 */
const row = fc.integer({ min: 0, max: OGE_SHEET_MAX_ROWS - 1 });
const col = fc.integer({ min: 0, max: OGE_SHEET_MAX_COLUMNS - 1 });
// a legal Excel sheet name: no `\ / ? * [ ] :`, no leading or trailing `'`
const sheetName = fc.oneof(
  fc.constant(undefined),
  fc.stringMatching(/^[A-Za-z_][A-Za-z0-9_]{0,10}$/),
  fc
    .string({ minLength: 1, maxLength: 12 })
    .filter(
      (s) => !/[\\/?*[\]:!]/.test(s) && !s.startsWith("'") && !s.endsWith("'"),
    ),
);

const rangeAddress: fc.Arbitrary<OgeRangeAddress> = fc
  .record({
    a: fc.record({ row, col }),
    b: fc.record({ row, col }),
    flags: fc.array(fc.boolean(), { minLength: 4, maxLength: 4 }),
    kind: fc.constantFrom('cell', 'range', 'columns', 'rows'),
    sheet: sheetName,
  })
  .map(({ a, b, flags, kind, sheet }) => {
    const base = {
      top: Math.min(a.row, b.row),
      bottom: Math.max(a.row, b.row),
      left: Math.min(a.col, b.col),
      right: Math.max(a.col, b.col),
    };
    const shape =
      kind === 'cell'
        ? { top: a.row, bottom: a.row, left: a.col, right: a.col }
        : kind === 'columns'
          ? { ...base, top: 0, bottom: OGE_SHEET_MAX_ROWS - 1 }
          : kind === 'rows'
            ? { ...base, left: 0, right: OGE_SHEET_MAX_COLUMNS - 1 }
            : base;
    const anchors =
      kind === 'cell'
        ? {
            topAbsolute: flags[0],
            bottomAbsolute: flags[0],
            leftAbsolute: flags[1],
            rightAbsolute: flags[1],
          }
        : {
            topAbsolute: kind === 'columns' ? false : flags[0],
            bottomAbsolute: kind === 'columns' ? false : flags[1],
            leftAbsolute: kind === 'rows' ? false : flags[2],
            rightAbsolute: kind === 'rows' ? false : flags[3],
          };
    const address: OgeRangeAddress = {
      kind: kind as OgeRangeAddress['kind'],
      ...shape,
      ...anchors,
      ...(sheet === undefined ? {} : { sheet }),
    };
    return address;
  });

describe('addresses — properties', () => {
  it('maps every column index to letters and back', () => {
    fc.assert(
      fc.property(col, (index) => {
        expect(ogeColumnIndex(ogeColumnName(index))).toBe(index);
      }),
    );
  });

  it('never throws on arbitrary text', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 40 }), (text) => {
        parseOgeCellAddress(text);
        parseOgeRangeAddress(text);
        parseOgeR1C1Address(text, { row: 3, col: 3 });
      }),
    );
  });

  it('round-trips every range it formats', () => {
    fc.assert(
      fc.property(rangeAddress, (address) => {
        const text = formatOgeRangeAddress(address);
        const parsed = parseOgeRangeAddress(text);
        expect(parsed).toEqual(address);
      }),
    );
  });

  it('round-trips R1C1 against any origin', () => {
    fc.assert(
      fc.property(
        row,
        col,
        fc.boolean(),
        fc.boolean(),
        fc.record({ row, col }),
        (r, c, rowAbsolute, colAbsolute, origin) => {
          const address = { row: r, col: c, rowAbsolute, colAbsolute };
          const text = formatOgeR1C1Address(address, origin);
          expect(parseOgeR1C1Address(text, origin)).toEqual(address);
        },
      ),
    );
  });

  it('stays linear on long adversarial input', () => {
    const long = `${"'".repeat(20000)}!${'$'.repeat(20000)}A${'9'.repeat(20000)}`;
    const started = performance.now();
    parseOgeRangeAddress(long);
    parseOgeRangeAddress('A'.repeat(50000) + ':' + '1'.repeat(50000));
    parseOgeR1C1Address(`R[${'1'.repeat(50000)}`, { row: 0, col: 0 });
    expect(performance.now() - started).toBeLessThan(500);
  });
});
