import type {
  OgeFormDataType,
  OgeFormEditorOptions,
  OgeFormEditorType,
  OgeFormItemData,
  OgeResolvedFormItem,
  OgeValidationRule,
} from './form-types';

const EMPTY_OPTIONS: OgeFormEditorOptions = {};
const EMPTY_RULES: readonly OgeValidationRule[] = [];

/**
 * `firstName` → `First name`, `address.city` → `City`. Deliberately simple:
 * a real label belongs on the item, this is only the "I did not bother" case.
 */
export function captionize(field: string): string {
  const leaf = field.slice(field.lastIndexOf('.') + 1);
  const spaced = leaf
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim();
  if (spaced.length === 0) return field;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

/** Reads a dot-notation path out of a model object. */
export function readPath(data: unknown, path: string): unknown {
  if (data == null) return undefined;
  let current: unknown = data;
  for (const key of path.split('.')) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/** Writes a dot-notation path, cloning every object along the way. */
export function writePath<T extends object>(
  data: T,
  path: string,
  value: unknown,
): T {
  const keys = path.split('.');
  const head = keys[0] as keyof T & string;
  if (keys.length === 1) return { ...data, [head]: value };
  const child = (data as Record<string, unknown>)[head];
  const nested =
    child != null && typeof child === 'object'
      ? (child as Record<string, unknown>)
      : {};
  return {
    ...data,
    [head]: writePath(nested, keys.slice(1).join('.'), value),
  };
}

/** Infers the value shape from a live model value. */
export function inferDataType(value: unknown): OgeFormDataType {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (value instanceof Date) return 'date';
  if (Array.isArray(value)) {
    const [first, second] = value as unknown[];
    const dateish = (v: unknown) => v === null || v instanceof Date;
    if (value.length === 2 && dateish(first) && dateish(second)) {
      return 'dateRange';
    }
    return 'array';
  }
  if (value != null && typeof value === 'object') return 'object';
  return 'string';
}

/**
 * Editor precedence, mirroring the grid's lookup-beats-dataType rule:
 * an explicit `editorType` wins, then a supplied option list, then `dataType`.
 */
export function pickEditorType(
  dataType: OgeFormDataType,
  options: OgeFormEditorOptions,
  explicit: OgeFormEditorType | undefined,
): OgeFormEditorType {
  if (explicit) return explicit;
  if (options.items) return dataType === 'array' ? 'tagBox' : 'selectBox';
  switch (dataType) {
    case 'boolean':
      return 'checkBox';
    case 'number':
      return 'numberBox';
    case 'date':
    case 'datetime':
      return 'dateBox';
    case 'dateRange':
      return 'dateRangeBox';
    case 'array':
      return 'tagBox';
    default:
      return 'textBox';
  }
}

/** Editors that render no field chrome of their own — the form supplies it. */
const BARE_EDITORS: ReadonlySet<OgeFormEditorType> = new Set([
  'checkBox',
  'switch',
  'radioGroup',
  'calendar',
  'slider', // chrome-free: the form supplies label/hint/error around it
]);

/** Whether the form must render label/hint/error chrome around this editor. */
export function isBareEditor(editorType: OgeFormEditorType): boolean {
  return BARE_EDITORS.has(editorType);
}

/** Resolves one item's effective configuration against the model and the form. */
export function resolveItem(
  item: OgeFormItemData,
  id: string,
  modelValue: unknown,
  inherited: { readonly readOnly: boolean; readonly disabled: boolean },
): OgeResolvedFormItem {
  const options = item.editorOptions ?? EMPTY_OPTIONS;
  const dataType = item.dataType ?? inferDataType(modelValue);
  const editorType = pickEditorType(dataType, options, item.editorType);
  const rules = item.validationRules ?? EMPTY_RULES;
  const required =
    item.isRequired === true || rules.some((r) => r.type === 'required');
  return {
    id,
    field: item.field,
    label: item.label ?? captionize(item.field),
    labelVisible: item.labelVisible !== false,
    hint: item.hint,
    placeholder: item.placeholder ?? '',
    dataType,
    editorType,
    editorOptions: options,
    colSpan: Math.max(1, Math.floor(item.colSpan ?? 1)),
    required,
    readOnly: item.readOnly ?? inherited.readOnly,
    disabled: item.disabled ?? inherited.disabled,
    cssClass: item.cssClass,
    group: item.group,
    validationRules: rules,
  };
}

/**
 * Applies `visibleIndex`: items that declare one come first in index order,
 * everything else keeps its declaration order behind them. Ties are stable.
 * Returns the input array untouched when nothing sets an index.
 */
export function orderByVisibleIndex<T extends { visibleIndex?: number }>(
  items: readonly T[],
): readonly T[] {
  if (!items.some((i) => i.visibleIndex !== undefined)) return items;
  const indexed = items
    .map((item, index) => ({ item, index }))
    .filter((entry) => entry.item.visibleIndex !== undefined)
    .sort((a, b) => {
      const delta = (a.item.visibleIndex ?? 0) - (b.item.visibleIndex ?? 0);
      return delta === 0 ? a.index - b.index : delta;
    })
    .map((entry) => entry.item);
  const rest = items.filter((item) => item.visibleIndex === undefined);
  return [...indexed, ...rest];
}
