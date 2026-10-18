import { describe, expect, it } from 'vitest';
import type { OgeResolvedFormItem } from './form-types';
import { ogeDescribeFormFields } from './form-field-description';

function item(overrides: Partial<OgeResolvedFormItem>): OgeResolvedFormItem {
  return {
    id: overrides.field ?? 'x',
    field: 'x',
    label: 'X',
    labelVisible: true,
    hint: undefined,
    placeholder: '',
    dataType: 'string',
    editorType: 'textBox',
    editorOptions: {},
    colSpan: 1,
    required: false,
    readOnly: false,
    disabled: false,
    cssClass: undefined,
    group: undefined,
    validationRules: [],
    ...overrides,
  };
}

describe('ogeDescribeFormFields', () => {
  it('describes fields with their current value, choices and list-ness', () => {
    const fields = ogeDescribeFormFields(
      [
        item({ field: 'name', label: 'Name', required: true }),
        item({ field: 'address.city', label: 'City', disabled: true }),
        item({
          field: 'country',
          label: 'Country',
          editorType: 'selectBox',
          editorOptions: {
            items: [
              { code: 'TR', name: 'Türkiye' },
              { code: { x: 1 }, name: 'Object' },
            ],
            valueExpr: 'code',
            displayExpr: 'name',
          },
        }),
        item({
          field: 'tags',
          label: 'Tags',
          editorType: 'tagBox',
          editorOptions: { items: ['a', 'b'] },
        }),
        item({ field: 'cv', label: 'CV', editorType: 'fileUploader' }),
        item({ field: 'sign', label: 'Signature', editorType: 'signaturePad' }),
      ],
      { name: 'Ada', address: { city: 'İzmir' }, tags: ['a'] },
    );
    expect(fields).toEqual([
      {
        field: 'name',
        label: 'Name',
        dataType: 'string',
        editorType: 'textBox',
        required: true,
        readOnly: false,
        multiple: false,
        value: 'Ada',
      },
      {
        field: 'address.city',
        label: 'City',
        dataType: 'string',
        editorType: 'textBox',
        required: false,
        readOnly: true,
        multiple: false,
        value: 'İzmir',
      },
      {
        field: 'country',
        label: 'Country',
        dataType: 'string',
        editorType: 'selectBox',
        required: false,
        readOnly: false,
        multiple: false,
        values: [{ value: 'TR', text: 'Türkiye' }],
        value: undefined,
      },
      {
        field: 'tags',
        label: 'Tags',
        dataType: 'string',
        editorType: 'tagBox',
        required: false,
        readOnly: false,
        multiple: true,
        values: [
          { value: 'a', text: 'a' },
          { value: 'b', text: 'b' },
        ],
        value: ['a'],
      },
    ]);
  });
});
