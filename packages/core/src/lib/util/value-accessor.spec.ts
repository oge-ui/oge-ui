import { createFieldAccessor, resolveKeySelector } from './value-accessor';

describe('createFieldAccessor', () => {
  it('reads a plain field', () => {
    const get = createFieldAccessor('name');
    expect(get({ name: 'Ada' })).toBe('Ada');
  });

  it('reads a dotted path', () => {
    const get = createFieldAccessor('customer.address.city');
    expect(get({ customer: { address: { city: 'Ankara' } } })).toBe('Ankara');
  });

  it('returns undefined for missing intermediate objects', () => {
    const get = createFieldAccessor('customer.address.city');
    expect(get({ customer: null })).toBeUndefined();
    expect(get(null)).toBeUndefined();
  });

  it('returns undefined for a missing plain field', () => {
    const get = createFieldAccessor('missing');
    expect(get({ name: 'Ada' })).toBeUndefined();
  });
});

describe('resolveKeySelector', () => {
  it('accepts a field name', () => {
    const keyOf = resolveKeySelector<{ id: number }>('id');
    expect(keyOf({ id: 7 })).toBe(7);
  });

  it('accepts a selector function', () => {
    const keyOf = resolveKeySelector<{ a: string; b: string }>(
      (r) => `${r.a}:${r.b}`,
    );
    expect(keyOf({ a: 'x', b: 'y' })).toBe('x:y');
  });
});
