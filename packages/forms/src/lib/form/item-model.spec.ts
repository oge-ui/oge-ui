import {
  captionize,
  inferDataType,
  isBareEditor,
  orderByVisibleIndex,
  pickEditorType,
  readPath,
  resolveItem,
  writePath,
} from './item-model';

describe('captionize', () => {
  it('title-cases a camelCase field', () => {
    expect(captionize('firstName')).toBe('First name');
  });

  it('uses the leaf of a dotted path', () => {
    expect(captionize('address.postalCode')).toBe('Postal code');
  });

  it('treats underscores and dashes as spaces', () => {
    expect(captionize('order_total')).toBe('Order total');
  });
});

describe('readPath / writePath', () => {
  it('reads a nested path', () => {
    expect(readPath({ a: { b: 7 } }, 'a.b')).toBe(7);
  });

  it('returns undefined instead of throwing on a missing branch', () => {
    expect(readPath({ a: null }, 'a.b.c')).toBeUndefined();
  });

  it('writes a nested path without mutating the source', () => {
    const source = { a: { b: 1 }, c: 2 };
    const next = writePath(source, 'a.b', 9);
    expect(next).toEqual({ a: { b: 9 }, c: 2 });
    expect(source.a.b).toBe(1);
    expect(next.a).not.toBe(source.a);
  });
});

describe('inferDataType', () => {
  it.each([
    ['', 'string'],
    [0, 'number'],
    [true, 'boolean'],
    [new Date(2020, 0, 1), 'date'],
    [['a', 'b'], 'array'],
  ] as const)('maps %p to %s', (value, expected) => {
    expect(inferDataType(value)).toBe(expected);
  });

  it('recognises a two-slot date tuple as a range', () => {
    expect(inferDataType([new Date(2020, 0, 1), null])).toBe('dateRange');
  });

  it('falls back to string for null', () => {
    expect(inferDataType(null)).toBe('string');
  });
});

describe('pickEditorType', () => {
  it('lets an explicit editorType win over everything', () => {
    expect(pickEditorType('number', { items: [1, 2] }, 'textArea')).toBe(
      'textArea',
    );
  });

  it('lets an option list win over dataType', () => {
    expect(pickEditorType('string', { items: ['a'] }, undefined)).toBe(
      'selectBox',
    );
  });

  it('uses a tag box when an option list backs an array field', () => {
    expect(pickEditorType('array', { items: ['a'] }, undefined)).toBe('tagBox');
  });

  it.each([
    ['boolean', 'checkBox'],
    ['number', 'numberBox'],
    ['date', 'dateBox'],
    ['datetime', 'dateBox'],
    ['dateRange', 'dateRangeBox'],
    ['array', 'tagBox'],
    ['string', 'textBox'],
    ['object', 'textBox'],
  ] as const)('maps dataType %s to %s', (dataType, expected) => {
    expect(pickEditorType(dataType, {}, undefined)).toBe(expected);
  });
});

describe('isBareEditor', () => {
  it('flags the controls that render no field chrome', () => {
    expect(isBareEditor('checkBox')).toBe(true);
    expect(isBareEditor('switch')).toBe(true);
    expect(isBareEditor('radioGroup')).toBe(true);
    expect(isBareEditor('textBox')).toBe(false);
  });
});

describe('resolveItem', () => {
  const inherited = { readOnly: false, disabled: false };

  it('defaults the label from the field name', () => {
    const resolved = resolveItem({ field: 'firstName' }, 'id', '', inherited);
    expect(resolved.label).toBe('First name');
    expect(resolved.editorType).toBe('textBox');
    expect(resolved.colSpan).toBe(1);
  });

  it('infers the dataType from the model value', () => {
    const resolved = resolveItem({ field: 'age' }, 'id', 41, inherited);
    expect(resolved.dataType).toBe('number');
    expect(resolved.editorType).toBe('numberBox');
  });

  it('treats a required rule as required, not only isRequired', () => {
    const resolved = resolveItem(
      { field: 'email', validationRules: [{ type: 'required' }] },
      'id',
      '',
      inherited,
    );
    expect(resolved.required).toBe(true);
  });

  it('inherits readOnly and disabled when the item does not set them', () => {
    const resolved = resolveItem({ field: 'a' }, 'id', '', {
      readOnly: true,
      disabled: true,
    });
    expect(resolved.readOnly).toBe(true);
    expect(resolved.disabled).toBe(true);
  });

  it('lets the item override the inherited state', () => {
    const resolved = resolveItem({ field: 'a', disabled: false }, 'id', '', {
      readOnly: false,
      disabled: true,
    });
    expect(resolved.disabled).toBe(false);
  });

  it('clamps a nonsensical colSpan to one', () => {
    const resolved = resolveItem(
      { field: 'a', colSpan: 0 },
      'id',
      '',
      inherited,
    );
    expect(resolved.colSpan).toBe(1);
  });
});

describe('orderByVisibleIndex', () => {
  it('keeps declaration order when nothing sets an index', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(orderByVisibleIndex(items)).toBe(items);
  });

  it('sorts by visibleIndex, keeping unindexed items in place', () => {
    const items = [{ id: 'a' }, { id: 'b', visibleIndex: 0 }, { id: 'c' }];
    expect(orderByVisibleIndex(items).map((i) => i.id)).toEqual([
      'b',
      'a',
      'c',
    ]);
  });

  it('is stable for equal indexes', () => {
    const items = [
      { id: 'a', visibleIndex: 1 },
      { id: 'b', visibleIndex: 1 },
    ];
    expect(orderByVisibleIndex(items).map((i) => i.id)).toEqual(['a', 'b']);
  });
});
