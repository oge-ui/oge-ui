import { createMetadataKey } from '@angular/forms/signals';
import type {
  OgeFormDataType,
  OgeFormEditorOptions,
  OgeFormEditorType,
  OgeFormFieldNode,
  OgeFormItemData,
} from './form-types';

/**
 * Layout metadata a Signal Forms schema can carry, so the description of a
 * field lives next to its validation instead of being repeated in an `items`
 * array.
 *
 * ```ts
 * const profile = form(model, (p) => {
 *   required(p.email);
 *   metadata(p.email, OGE_FORM_LABEL, () => 'E-mail address');
 *   metadata(p.email, OGE_FORM_GROUP, () => 'Contact');
 * });
 * ```
 *
 * ```html
 * <!-- no items, no children: the schema is the layout -->
 * <oge-form [fieldTree]="profile" [colCount]="2" />
 * ```
 *
 * Angular's own `REQUIRED` / `MIN` / `MAX` / `MIN_LENGTH` / `MAX_LENGTH` /
 * `PATTERN` metadata is already bound to the editors by the `FormField`
 * directive, so none of it is duplicated here.
 */
export const OGE_FORM_LABEL = createMetadataKey<string>();

/** Help text under the editor — the schema's answer to `hint`. */
export const OGE_FORM_HINT = createMetadataKey<string>();

/** Placeholder for the editor. */
export const OGE_FORM_PLACEHOLDER = createMetadataKey<string>();

/** Layout columns the field spans. */
export const OGE_FORM_COL_SPAN = createMetadataKey<number>();

/** Explicit editor, overriding whatever the value type would pick. */
export const OGE_FORM_EDITOR = createMetadataKey<OgeFormEditorType>();

/** Curated editor inputs — the schema's answer to `editorOptions`. */
export const OGE_FORM_EDITOR_OPTIONS =
  createMetadataKey<OgeFormEditorOptions>();

/** Value shape, when the live value is not descriptive enough. */
export const OGE_FORM_DATA_TYPE = createMetadataKey<OgeFormDataType>();

/** Caption of the group this field belongs to; groups are created on demand. */
export const OGE_FORM_GROUP = createMetadataKey<string>();

/** Ordering hint, equivalent to an item's `visibleIndex`. */
export const OGE_FORM_ORDER = createMetadataKey<number>();

/** Signal Forms field state, as far as the metadata reader needs it. */
interface MetadataFieldState {
  readonly hidden?: () => boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?<M>(key: any): M | undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function read<T>(state: MetadataFieldState, key: any): T | undefined {
  const value = state.metadata?.<(() => T | undefined) | undefined>(key);
  return typeof value === 'function' ? value() : undefined;
}

/**
 * Builds one item description from a field's metadata. Returns `undefined`
 * for a field the schema hid with `hidden()`, so schema-level visibility and
 * layout visibility stay the same thing.
 */
export function itemFromMetadata(
  field: string,
  node: OgeFormFieldNode,
): OgeFormItemData | undefined {
  const state = node() as unknown as MetadataFieldState;
  if (state.hidden?.() === true) return undefined;
  return {
    field,
    label: read<string>(state, OGE_FORM_LABEL),
    hint: read<string>(state, OGE_FORM_HINT),
    placeholder: read<string>(state, OGE_FORM_PLACEHOLDER),
    colSpan: read<number>(state, OGE_FORM_COL_SPAN),
    editorType: read<OgeFormEditorType>(state, OGE_FORM_EDITOR),
    editorOptions: read<OgeFormEditorOptions>(state, OGE_FORM_EDITOR_OPTIONS),
    dataType: read<OgeFormDataType>(state, OGE_FORM_DATA_TYPE),
    group: read<string>(state, OGE_FORM_GROUP),
    visibleIndex: read<number>(state, OGE_FORM_ORDER),
  };
}
