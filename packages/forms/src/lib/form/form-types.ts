import type { Signal, TemplateRef, WritableSignal } from '@angular/core';
import type { Field } from '@angular/forms/signals';
import type {
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
 * The shared half of the vocabulary lives in `@oge-ui/behavior` so the React
 * layer runs the same model and the same rules (ADR 0001). Re-exported here,
 * so every consumer's import path is unchanged.
 */
export type { OgeFormItemDataBase } from '@oge-ui/behavior';
import type { OgeFormItemDataBase } from '@oge-ui/behavior';

export type {
  OgeFormColCount,
  OgeFormDataType,
  OgeFormEditorOptions,
  OgeFormEditorType,
  OgeFormErrorEntry,
  OgeFormFieldChangedEvent,
  OgeFormGroupData,
  OgeFormLabelLocation,
  OgeFormScreenSize,
  OgeFormValidatedEvent,
  OgeResolvedFormItem,
  OgeValidationContext,
  OgeValidationRule,
} from '@oge-ui/behavior';

/** Which binding a form resolved to — derived, never configured. */
export type OgeFormMode = 'fieldTree' | 'formGroup' | 'formData';

/**
 * One data-driven form item: the shared fields plus this layer's own content
 * slots. Everything but the slots is the framework-free
 * `OgeFormItemDataBase` — React's item carries render props in their place.
 */
export interface OgeFormItemData extends OgeFormItemDataBase {
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
