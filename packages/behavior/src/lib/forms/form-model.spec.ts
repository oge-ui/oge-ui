import { describe, expect, it } from 'vitest';
import {
  captionize,
  emptyValueForDataType,
  formColumnsCount,
  formColumnsCss,
  inferDataType,
  isBareEditor,
  orderByVisibleIndex,
  pickEditorType,
  readPath,
  resolveItem,
  writePath,
} from './form-model';

describe('captionize', () => {
  it('title-cases the leaf of a dot path', () => {
    expect(captionize('firstName')).toBe('First name');
    expect(captionize('address.city')).toBe('City');
    expect(captionize('order_number')).toBe('Order number');
    expect(captionize('order-number')).toBe('Order number');
  });

  it('falls back to the raw field when there is nothing to caption', () => {
    expect(captionize('')).toBe('');
    expect(captionize('.')).toBe('.');
  });
});

describe('readPath / writePath', () => {
  const data = { name: 'Ada', address: { city: 'London', zip: null } };

  it('reads a nested path and reports a missing one as undefined', () => {
    expect(readPath(data, 'name')).toBe('Ada');
    expect(readPath(data, 'address.city')).toBe('London');
    expect(readPath(data, 'address.country')).toBeUndefined();
    expect(readPath(data, 'address.zip.deep')).toBeUndefined();
    expect(readPath(null, 'name')).toBeUndefined();
  });

  it('writes without mutating any level of the original', () => {
    const next = writePath(data, 'address.city', 'Paris');
    expect(next.address.city).toBe('Paris');
    expect(data.address.city).toBe('London');
    expect(next.address).not.toBe(data.address);
    expect(next.name).toBe('Ada');
  });

  it('creates the missing objects along the way', () => {
    const next = writePath({} as Record<string, unknown>, 'a.b.c', 1);
    expect(readPath(next, 'a.b.c')).toBe(1);
  });

  it('replaces a non-object on the path rather than throwing', () => {
    const next = writePath({ a: 5 } as Record<string, unknown>, 'a.b', 1);
    expect(readPath(next, 'a.b')).toBe(1);
  });
});

describe('inferDataType', () => {
  it('reads the shape off the value', () => {
    expect(inferDataType(true)).toBe('boolean');
    expect(inferDataType(42)).toBe('number');
    expect(inferDataType(new Date())).toBe('date');
    expect(inferDataType(['a', 'b'])).toBe('array');
    expect(inferDataType({})).toBe('object');
    expect(inferDataType('text')).toBe('string');
  });

  it('recognizes a two-ended date range, open ends included', () => {
    expect(inferDataType([new Date(), new Date()])).toBe('dateRange');
    expect(inferDataType([null, new Date()])).toBe('dateRange');
    expect(inferDataType([null, null])).toBe('dateRange');
    // three entries is a plain array again
    expect(inferDataType([new Date(), new Date(), new Date()])).toBe('array');
  });

  it('treats an unset value as a string field', () => {
    expect(inferDataType(undefined)).toBe('string');
    expect(inferDataType(null)).toBe('string');
  });
});

describe('pickEditorType', () => {
  it('lets an explicit editorType win over everything', () => {
    expect(pickEditorType('number', { items: [1] }, 'slider')).toBe('slider');
  });

  it('picks a picker as soon as options are supplied', () => {
    expect(pickEditorType('string', { items: ['a'] }, undefined)).toBe(
      'selectBox',
    );
    expect(pickEditorType('array', { items: ['a'] }, undefined)).toBe('tagBox');
  });

  it('falls back to the data type', () => {
    expect(pickEditorType('boolean', {}, undefined)).toBe('checkBox');
    expect(pickEditorType('number', {}, undefined)).toBe('numberBox');
    expect(pickEditorType('date', {}, undefined)).toBe('dateBox');
    expect(pickEditorType('datetime', {}, undefined)).toBe('dateBox');
    expect(pickEditorType('dateRange', {}, undefined)).toBe('dateRangeBox');
    expect(pickEditorType('array', {}, undefined)).toBe('tagBox');
    expect(pickEditorType('file', {}, undefined)).toBe('fileUploader');
    expect(pickEditorType('string', {}, undefined)).toBe('textBox');
    expect(pickEditorType('object', {}, undefined)).toBe('textBox');
  });
});

describe('isBareEditor', () => {
  it('names the editors that render no chrome of their own', () => {
    for (const editor of [
      'checkBox',
      'switch',
      'radioGroup',
      'calendar',
      'slider',
    ] as const) {
      expect(isBareEditor(editor)).toBe(true);
    }
    for (const editor of [
      'textBox',
      'numberBox',
      'selectBox',
      'dateBox',
    ] as const) {
      expect(isBareEditor(editor)).toBe(false);
    }
  });
});

describe('resolveItem', () => {
  const inherited = { readOnly: false, disabled: false };

  it('fills every default from the item and the model value', () => {
    const resolved = resolveItem(
      { field: 'firstName' },
      'id-1',
      'Ada',
      inherited,
    );
    expect(resolved).toMatchObject({
      id: 'id-1',
      field: 'firstName',
      label: 'First name',
      labelVisible: true,
      placeholder: '',
      dataType: 'string',
      editorType: 'textBox',
      colSpan: 1,
      required: false,
      readOnly: false,
      disabled: false,
    });
  });

  it('treats a required rule and isRequired the same way', () => {
    expect(
      resolveItem({ field: 'a', isRequired: true }, 'i', '', inherited)
        .required,
    ).toBe(true);
    expect(
      resolveItem(
        { field: 'a', validationRules: [{ type: 'required' }] },
        'i',
        '',
        inherited,
      ).required,
    ).toBe(true);
  });

  it('inherits readOnly and disabled, and lets the item override them', () => {
    const locked = { readOnly: true, disabled: true };
    expect(resolveItem({ field: 'a' }, 'i', '', locked)).toMatchObject({
      readOnly: true,
      disabled: true,
    });
    expect(
      resolveItem({ field: 'a', readOnly: false }, 'i', '', locked).readOnly,
    ).toBe(false);
  });

  it('clamps colSpan to a whole column', () => {
    expect(
      resolveItem({ field: 'a', colSpan: 2.7 }, 'i', '', inherited).colSpan,
    ).toBe(2);
    expect(
      resolveItem({ field: 'a', colSpan: 0 }, 'i', '', inherited).colSpan,
    ).toBe(1);
  });

  it('honours labelVisible: false without dropping the label text', () => {
    const resolved = resolveItem(
      { field: 'a', label: 'A', labelVisible: false },
      'i',
      '',
      inherited,
    );
    expect(resolved.labelVisible).toBe(false);
    expect(resolved.label).toBe('A');
  });
});

describe('orderByVisibleIndex', () => {
  it('returns the input untouched when nothing declares an index', () => {
    const items = [{ id: 'a' }, { id: 'b' }];
    expect(orderByVisibleIndex(items)).toBe(items);
  });

  it('puts indexed entries first, in index order, the rest behind them', () => {
    const ordered = orderByVisibleIndex([
      { id: 'a' },
      { id: 'b', visibleIndex: 2 },
      { id: 'c' },
      { id: 'd', visibleIndex: 1 },
    ]);
    expect(ordered.map((entry) => entry.id)).toEqual(['d', 'b', 'a', 'c']);
  });

  it('breaks ties by declaration order', () => {
    const ordered = orderByVisibleIndex([
      { id: 'a', visibleIndex: 1 },
      { id: 'b', visibleIndex: 1 },
    ]);
    expect(ordered.map((entry) => entry.id)).toEqual(['a', 'b']);
  });
});

describe('emptyValueForDataType', () => {
  it('empties each shape the way its editor expects', () => {
    expect(emptyValueForDataType('boolean')).toBe(false);
    expect(emptyValueForDataType('number')).toBe(null);
    expect(emptyValueForDataType('date')).toBe(null);
    expect(emptyValueForDataType('datetime')).toBe(null);
    expect(emptyValueForDataType('dateRange')).toEqual([null, null]);
    expect(emptyValueForDataType('array')).toEqual([]);
    expect(emptyValueForDataType('string')).toBe('');
  });
});

describe('column arithmetic', () => {
  it('fits auto columns to the form’s own width', () => {
    expect(formColumnsCss('auto')).toBe(
      'repeat(auto-fit, minmax(var(--oge-form-min-col), 1fr))',
    );
    expect(formColumnsCss(undefined)).toBe(formColumnsCss('auto'));
  });

  it('renders a fixed count, floored at one whole column', () => {
    expect(formColumnsCss(3)).toBe('repeat(3, minmax(0, 1fr))');
    expect(formColumnsCss(0)).toBe('repeat(1, minmax(0, 1fr))');
    expect(formColumnsCss(2.5)).toBe('repeat(2, minmax(0, 1fr))');
  });

  it('reports the clamp width, falling back to the form’s count', () => {
    expect(formColumnsCount(3, 'auto')).toBe(3);
    expect(formColumnsCount(undefined, 2)).toBe(2);
    // 'auto' has no fixed count — 12 is the practical ceiling for a colSpan
    expect(formColumnsCount('auto', 2)).toBe(12);
    expect(formColumnsCount(undefined, 'auto')).toBe(12);
  });
});
