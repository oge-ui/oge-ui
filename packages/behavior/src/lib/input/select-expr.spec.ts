import { describe, expect, it } from 'vitest';
import { resolveDisabled, resolveDisplay, resolveValue } from './select-expr';

interface Row {
  id: number;
  name: string;
  locked?: boolean;
}

const row: Row = { id: 7, name: 'Ada', locked: true };

describe('resolveDisplay', () => {
  it('reads a field name', () => {
    expect(resolveDisplay<Row>('name', row)).toBe('Ada');
  });

  it('calls a function expression', () => {
    expect(resolveDisplay<Row>((item) => `#${item.id}`, row)).toBe('#7');
  });

  it('stringifies the item when no expression is given', () => {
    expect(resolveDisplay<string>(undefined, 'plain')).toBe('plain');
    expect(resolveDisplay<number>(undefined, 42)).toBe('42');
  });

  it('renders a missing field as empty text, never "undefined"', () => {
    expect(resolveDisplay<Row>('missing', row)).toBe('');
    // and a nullish item under no expression, for the same reason
    expect(resolveDisplay<unknown>(undefined, null)).toBe('');
  });
});

describe('resolveValue', () => {
  it('reads a field name, calls a function, or falls back to the item', () => {
    expect(resolveValue<Row>('id', row)).toBe(7);
    expect(resolveValue<Row>((item) => item.name, row)).toBe('Ada');
    expect(resolveValue<Row>(undefined, row)).toBe(row);
  });

  it('keeps a falsy field value rather than swapping in the item', () => {
    // the id-0 row is the classic bug: `?? item` would commit the object
    expect(resolveValue<Row>('id', { ...row, id: 0 })).toBe(0);
  });
});

describe('resolveDisabled', () => {
  it('coerces a field, calls a function, and defaults to enabled', () => {
    expect(resolveDisabled<Row>('locked', row)).toBe(true);
    expect(resolveDisabled<Row>('locked', { ...row, locked: undefined })).toBe(
      false,
    );
    expect(resolveDisabled<Row>((item) => item.id > 5, row)).toBe(true);
    expect(resolveDisabled<Row>(undefined, row)).toBe(false);
  });
});
