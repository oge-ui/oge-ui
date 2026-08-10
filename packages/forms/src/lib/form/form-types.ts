import type { Signal, TemplateRef, WritableSignal } from '@angular/core';
import type { Field } from '@angular/forms/signals';
import type {
  OgeDateBoxDisplayFormat,
  OgeInputLabelMode,
  OgeInputSize,
  OgeInputStylingMode,
  OgeInputSubscriptSizing,
} from '@oge-ui/inputs';

/**
 * A Signal Forms field node, as `[formField]` consumes it. `Field<T>` is
 * invariant in `T` (its `FieldState` holds a writable signal), so a form that
 * renders heterogeneous items has to erase the value type here.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OgeFormFieldNode = Field<any>;

/**
 * The root of a Signal Forms tree, as `<oge-form [fieldTree]>` accepts it.
 *
 * Deliberately structural rather than `FieldTree<T>`: `FieldState` holds a
 * writable signal, so the type is invariant in the model shape. Angular cannot
 * infer a component generic from that position and falls back to `any`, and
 * `FieldTree<any>` resolves to the *compat* field state — which no real tree
 * satisfies. Naming only the members the form uses, with the value type erased,
 * accepts every `form()` result without that trap.
 */
export type OgeFormFieldTree = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly value: WritableSignal<any>;
  readonly touched: Signal<boolean>;
  readonly dirty: Signal<boolean>;
  readonly valid: Signal<boolean>;
  markAsTouched(): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reset(value?: any): void;
};

/**
 * Value shape an item is bound to. Drives the default editor when no
 * `editorType` is given; inferred from the model value when omitted entirely.
 */
export type OgeFormDataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'dateRange'
  | 'array'
  | 'object';

/**
 * Which `@oge-ui/inputs` editor renders an item. House camelCase names — the
 * reference libraries' `dxTextBox`-style class names are deliberately not used.
 */
export type OgeFormEditorType =
  | 'textBox'
  | 'textArea'
  | 'numberBox'
  | 'slider'
  | 'selectBox'
  | 'tagBox'
  | 'autocomplete'
  | 'treeSelect'
  | 'dateBox'
  | 'dateRangeBox'
  | 'calendar'
  | 'checkBox'
  | 'switch'
  | 'radioGroup';

/** Where an item's label sits relative to its editor. */
export type OgeFormLabelLocation = 'top' | 'start' | 'end';

/** Container-query breakpoints the responsive column count is keyed to. */
export type OgeFormScreenSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** How many layout columns the form uses; `'auto'` fits by `minColWidth`. */
export type OgeFormColCount = number | 'auto';

/** Which binding a form resolved to — derived, never configured. */
export type OgeFormMode = 'fieldTree' | 'formGroup' | 'formData';

/**
 * A declarative validation rule. Compiled into an Angular Signal Forms schema
 * in `formData` mode; ignored (with a dev-mode warning) when the caller owns
 * the form via `[fieldTree]` or `[formGroup]`.
 */
export type OgeValidationRule =
  | { readonly type: 'required'; readonly message?: string }
  | { readonly type: 'email'; readonly message?: string }
  | {
      readonly type: 'numeric';
      readonly min?: number;
      readonly max?: number;
      readonly message?: string;
    }
  | {
      readonly type: 'stringLength';
      readonly min?: number;
      readonly max?: number;
      readonly message?: string;
    }
  | {
      readonly type: 'pattern';
      readonly pattern: RegExp;
      readonly message?: string;
    }
  | {
      readonly type: 'range';
      readonly min?: Date;
      readonly max?: Date;
      readonly message?: string;
    }
  | {
      readonly type: 'custom';
      readonly validate: (context: OgeValidationContext) => string | null;
    }
  | {
      readonly type: 'async';
      readonly validate: (value: unknown) => Promise<string | null>;
      readonly message?: string;
    };

/** What a `custom` rule sees: the field's value and the whole model. */
export interface OgeValidationContext {
  readonly value: unknown;
  readonly data: Record<string, unknown>;
}

/**
 * Editor inputs an item may set. A curated, typed subset — anything beyond it
 * belongs in an `[ogeFormEditorTemplate]`, not in a reflective options bag.
 */
export interface OgeFormEditorOptions {
  /** Options for `selectBox` / `tagBox` / `autocomplete` / `radioGroup` / `treeSelect`. */
  readonly items?: readonly unknown[];
  readonly displayExpr?: string;
  readonly valueExpr?: string;
  readonly searchEnabled?: boolean;
  readonly showClearButton?: boolean;
  readonly acceptCustomValue?: boolean;
  /** `numberBox` / `dateBox` bounds. */
  readonly min?: number | Date;
  readonly max?: number | Date;
  readonly step?: number;
  readonly showSpinButtons?: boolean;
  readonly format?: Intl.NumberFormatOptions;
  readonly displayFormat?: OgeDateBoxDisplayFormat;
  /** `textBox` mode (`'password'`, `'email'`, …) and `numberBox` inputmode. */
  readonly mode?: string;
  readonly maxLength?: number;
  readonly minLength?: number;
  readonly showCounter?: boolean;
  /** `textArea` rows. */
  readonly rows?: number;
  readonly autoResize?: boolean;
  /** `checkBox` / `switch` inline text. */
  readonly text?: string;
  /** `radioGroup` orientation. */
  readonly layout?: 'vertical' | 'horizontal';
  /** `dateBox` kind. */
  readonly type?: 'date' | 'time' | 'datetime';
  readonly locale?: string;
  /** `treeSelect` data shape. */
  readonly keyExpr?: string;
  readonly parentIdExpr?: string;
  readonly itemsExpr?: string;
  readonly hasItemsExpr?: string;
  readonly dataStructure?: 'plain' | 'tree';
  readonly showCheckBoxes?: 'none' | 'normal' | 'selectAll';
  /** `calendar` / `dateBox` week rendering. */
  readonly firstDayOfWeek?: number;
  readonly showTodayButton?: boolean;
  readonly showWeekNumbers?: boolean;
}

/** One data-driven form item. Mirrors `<oge-form-item>`'s inputs. */
export interface OgeFormItemData {
  /** Model property this item edits. Dot-notation reaches nested objects. */
  readonly field: string;
  /** Stable identity; defaults to `field`. */
  readonly key?: string;
  /** Label text; defaults to a title-cased `field`. */
  readonly label?: string;
  /** Set `false` to render the editor with no label at all. */
  readonly labelVisible?: boolean;
  /** Help text under the editor. */
  readonly hint?: string;
  readonly placeholder?: string;
  readonly dataType?: OgeFormDataType;
  readonly editorType?: OgeFormEditorType;
  readonly editorOptions?: OgeFormEditorOptions;
  /** Layout columns the item spans; clamped to the current column count. */
  readonly colSpan?: number;
  readonly visible?: boolean;
  /** Explicit ordering; items without one keep their declaration order. */
  readonly visibleIndex?: number;
  /** Adds a `required` rule and shows the required mark. */
  readonly isRequired?: boolean;
  readonly validationRules?: readonly OgeValidationRule[];
  readonly readOnly?: boolean;
  readonly disabled?: boolean;
  /** Extra class on the item wrapper. */
  readonly cssClass?: string;
  /** Group caption this item belongs to, for data-driven grouping. */
  readonly group?: string;
  /**
   * Per-item slots for data-driven items — the same three a declarative
   * `<oge-form-item>` exposes as `ng-template` children. A host that generates
   * its items (the grid's row editor, say) can still give one field a custom
   * editor this way.
   */
  readonly itemTemplate?: TemplateRef<unknown>;
  readonly editorTemplate?: TemplateRef<unknown>;
  readonly labelTemplate?: TemplateRef<unknown>;
}

/** One data-driven group. Groups render as `<fieldset>` with a `<legend>`. */
export interface OgeFormGroupData {
  readonly caption: string;
  readonly key?: string;
  readonly colCount?: OgeFormColCount;
  readonly colSpan?: number;
  readonly visible?: boolean;
  /** Explicit ordering among this group's siblings. */
  readonly visibleIndex?: number;
  readonly cssClass?: string;
}

/** A resolved item as the form actually renders it — what `itemOption()` returns. */
export interface OgeResolvedFormItem {
  readonly id: string;
  readonly field: string;
  readonly label: string;
  readonly labelVisible: boolean;
  readonly hint: string | undefined;
  readonly placeholder: string;
  readonly dataType: OgeFormDataType;
  readonly editorType: OgeFormEditorType;
  readonly editorOptions: OgeFormEditorOptions;
  readonly colSpan: number;
  readonly required: boolean;
  readonly readOnly: boolean;
  readonly disabled: boolean;
  readonly cssClass: string | undefined;
  readonly group: string | undefined;
  readonly validationRules: readonly OgeValidationRule[];
}

/** Cancelable pre-submit event. Set `cancel` to keep the form open. */
export interface OgeFormSubmittingEvent<T> {
  readonly data: T;
  readonly valid: boolean;
  cancel: boolean;
  readonly event: Event | undefined;
}

/** Emitted after a submit passed validation and was not canceled. */
export interface OgeFormSubmittedEvent<T> {
  readonly data: T;
  readonly event: Event | undefined;
}

/** Emitted whenever one field's value changed. */
export interface OgeFormFieldChangedEvent {
  readonly field: string;
  readonly value: unknown;
  readonly previousValue: unknown;
}

/** Emitted after `validate()` or a submit attempt. */
export interface OgeFormValidatedEvent {
  readonly valid: boolean;
  /** One entry per invalid field, in layout order. */
  readonly errors: readonly OgeFormErrorEntry[];
}

/** One row of the validation summary. */
export interface OgeFormErrorEntry {
  readonly field: string;
  readonly label: string;
  readonly message: string;
}

/** Enter pressed inside an editor. */
export interface OgeFormKeyEvent {
  readonly field: string;
  readonly event: Event;
}

/** Appearance inputs a form forwards to every editor it renders. */
export interface OgeFormEditorAppearance {
  readonly size: OgeInputSize;
  readonly stylingMode: OgeInputStylingMode;
  readonly labelMode: OgeInputLabelMode;
  readonly subscriptSizing: OgeInputSubscriptSizing;
}
