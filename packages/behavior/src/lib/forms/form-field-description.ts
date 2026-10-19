import { createFieldAccessor } from '@oge-ui/core';
import type {
  OgeFormDataType,
  OgeFormEditorType,
  OgeResolvedFormItem,
} from './form-types';

/**
 * A plain description of one form field, as `describeFields()` returns it:
 * what smart paste, an autofill helper or a saved-draft editor needs to know
 * about the form without reaching into editors or templates.
 */
export interface OgeFormFieldDescription {
  /** The data field (a dotted path for nested data). */
  readonly field: string;
  readonly label: string;
  readonly dataType: OgeFormDataType;
  readonly editorType: OgeFormEditorType;
  readonly required: boolean;
  /** `true` when the field is read-only or disabled — nothing may write it. */
  readonly readOnly: boolean;
  /** Whether the value is a list (tag box, list box, transfer list, `array`). */
  readonly multiple: boolean;
  /** The editor's items, for choice editors with primitive values. */
  readonly values?: readonly OgeFormFieldValue[];
  /** The value the form holds now. */
  readonly value: unknown;
}

/** One allowed value of a choice field. */
export interface OgeFormFieldValue {
  readonly value: string | number | boolean;
  readonly text: string;
}

/** Editors whose value cannot be described as data (files, drawings). */
const OPAQUE_EDITORS: ReadonlySet<OgeFormEditorType> = new Set([
  'fileUploader',
  'signaturePad',
]);
const MULTIPLE_EDITORS: ReadonlySet<OgeFormEditorType> = new Set([
  'tagBox',
  'listBox',
  'transferList',
]);

function primitive(value: unknown): value is string | number | boolean {
  return (
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  );
}

function choiceValues(
  item: OgeResolvedFormItem,
): OgeFormFieldValue[] | undefined {
  const { items, valueExpr, displayExpr } = item.editorOptions;
  if (!items?.length) return undefined;
  const valueOf = valueExpr ? createFieldAccessor<unknown>(valueExpr) : null;
  const textOf = displayExpr ? createFieldAccessor<unknown>(displayExpr) : null;
  const out: OgeFormFieldValue[] = [];
  for (const entry of items) {
    const value = valueOf ? valueOf(entry) : entry;
    if (!primitive(value)) continue;
    const text = textOf ? textOf(entry) : entry;
    out.push({ value, text: primitive(text) ? String(text) : String(value) });
  }
  return out.length ? out : undefined;
}

/**
 * Describes the fields of a form-like component from its resolved items and
 * the data it currently holds. File and signature fields are skipped — their
 * value is not data a sentence can describe.
 */
export function ogeDescribeFormFields(
  items: readonly OgeResolvedFormItem[],
  data: unknown,
): OgeFormFieldDescription[] {
  const out: OgeFormFieldDescription[] = [];
  for (const item of items) {
    if (OPAQUE_EDITORS.has(item.editorType) || item.dataType === 'file') {
      continue;
    }
    const values = choiceValues(item);
    out.push({
      field: item.field,
      label: item.label,
      dataType: item.dataType,
      editorType: item.editorType,
      required: item.required,
      readOnly: item.readOnly || item.disabled,
      multiple:
        MULTIPLE_EDITORS.has(item.editorType) || item.dataType === 'array',
      ...(values ? { values } : {}),
      value:
        data !== null && typeof data === 'object'
          ? createFieldAccessor<unknown>(item.field)(data)
          : undefined,
    });
  }
  return out;
}
