import { OGE_DEFAULT_GRID_MESSAGES } from './grid-config';
import { booleanCellLabel, formatCellValue } from './grid-header-filter';

describe('booleanCellLabel', () => {
  const messages = OGE_DEFAULT_GRID_MESSAGES;

  it('announces a plain boolean cell as a word', () => {
    expect(booleanCellLabel(true, { dataType: 'boolean' }, messages)).toBe(
      'Yes',
    );
    expect(booleanCellLabel(false, { dataType: 'boolean' }, messages)).toBe(
      'No',
    );
  });

  it('reads the labels from the message catalog', () => {
    const tr = { booleanTrueLabel: 'Evet', booleanFalseLabel: 'Hayır' };
    expect(booleanCellLabel(true, { dataType: 'boolean' }, tr)).toBe('Evet');
    expect(booleanCellLabel(false, { dataType: 'boolean' }, tr)).toBe('Hayır');
  });

  it('is null for blanks, other data types and formatted or lookup columns', () => {
    expect(
      booleanCellLabel(null, { dataType: 'boolean' }, messages),
    ).toBeNull();
    expect(booleanCellLabel(true, { dataType: 'string' }, messages)).toBeNull();
    expect(
      booleanCellLabel(
        true,
        { dataType: 'boolean', format: (v) => (v ? 'on' : 'off') },
        messages,
      ),
    ).toBeNull();
    expect(
      booleanCellLabel(
        true,
        { dataType: 'boolean', lookupItems: [{ value: true, text: 'On' }] },
        messages,
      ),
    ).toBeNull();
  });

  it('leaves the visible (and exported) glyph text unchanged', () => {
    expect(formatCellValue(true, 'boolean')).toBe('✓');
    expect(formatCellValue(false, 'boolean')).toBe('✗');
  });
});
