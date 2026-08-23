import type { CSSProperties, ReactNode } from 'react';
import type {
  OgeFormColCount,
  OgeFormFieldChangedEvent,
  OgeFormsMessages,
  OgeFormValidatedEvent,
  OgeFormEditorType,
  OgeFormErrorEntry,
  OgeFormGroupData,
  OgeFormItemDataBase,
  OgeFormLabelLocation,
  OgeFormScreenSize,
  OgeResolvedFormItem,
} from '@oge-ui/behavior';

/**
 * The React face of the forms family. The item model, the rule evaluator and
 * every default come from `@oge-ui/behavior` (ADR 0001); what this file adds
 * is the part that cannot be shared — React content slots and the props/
 * callbacks that stand in for Angular's inputs, outputs and projected
 * children.
 */

/** What a per-item render prop is handed. */
export interface OgeFormItemContext {
  /** The resolved item, exactly as `itemOption()` reports it. */
  readonly item: OgeResolvedFormItem;
  /** The item's current value in the bound model. */
  readonly value: unknown;
  /** Writes this item's value back into the model. */
  readonly setValue: (value: unknown) => void;
  /** Resolved error text, or `null` while the field is valid. */
  readonly error: string | null;
  /** Id the label's `htmlFor` points at — put it on a custom editor. */
  readonly editorId: string;
}

/** What the label render prop is handed. */
export interface OgeFormLabelContext {
  readonly label: string;
  readonly item: OgeResolvedFormItem;
  readonly required: boolean;
  readonly editorId: string;
}

/** What a group's caption render prop is handed. */
export interface OgeFormGroupCaptionContext {
  readonly caption: string;
  readonly colCount: OgeFormColCount | undefined;
}

/**
 * One item, with this layer's content slots. Everything but the slots is the
 * framework-free {@link OgeFormItemDataBase} — Angular's item carries three
 * `TemplateRef`s in their place.
 */
export interface OgeFormItemDefinition extends OgeFormItemDataBase {
  /** Replaces the whole field: label, editor and subscript. */
  renderItem?: (context: OgeFormItemContext) => ReactNode;
  /** Replaces only the editor, keeping the label and error chrome. */
  renderEditor?: (context: OgeFormItemContext) => ReactNode;
  /** Replaces the label content. */
  renderLabel?: (context: OgeFormLabelContext) => ReactNode;
}

/** A group node of the layout tree: a `<fieldset>` with a `<legend>`. */
export interface OgeFormGroupDefinition extends OgeFormGroupData {
  readonly kind?: 'group';
  /** Items, nested groups and sections inside this group. */
  readonly children?: readonly OgeFormNodeDefinition[];
  /** Applies to every descendant that does not set its own. */
  readonly readOnly?: boolean;
  readonly disabled?: boolean;
  renderCaption?: (context: OgeFormGroupCaptionContext) => ReactNode;
}

/**
 * A tabbed / accordion / wizard section. Its children are groups — each one
 * becomes a tab, a panel or a step, and anything that is not a group is
 * wrapped in one so every panel still has a caption to show.
 */
export interface OgeFormSectionDefinition {
  readonly kind: 'tabs' | 'accordion' | 'steps';
  readonly key?: string;
  readonly colSpan?: number;
  readonly visible?: boolean;
  readonly visibleIndex?: number;
  readonly cssClass?: string;
  readonly children?: readonly OgeFormNodeDefinition[];
  /** Tabs only: renders the invalid-field count on a tab header. Default `true`. */
  readonly showErrorBadges?: boolean;
  /** Accordion and wizard: marks a panel that holds an invalid field. */
  readonly showInvalidSections?: boolean;
  /** Wizard only: a step may not be passed until it validates. */
  readonly linear?: boolean;
  /** Wizard only: touches the leaving step's fields as the user advances. */
  readonly touchOnLeave?: boolean;
  /** Wizard only: axis of the step header rail. */
  readonly orientation?: 'horizontal' | 'vertical';
  /** Wizard only: renders the stepper's built-in Back / Next bar. Default `true`. */
  readonly showNavigation?: boolean;
  /** Accordion only: whether more than one panel may be open at a time. */
  readonly multiple?: boolean;
  /** Accordion only: whether the open panel may be closed again. */
  readonly collapsible?: boolean;
  /**
   * Mounts a panel on first visit instead of up front. Defaults to `false`
   * here — unlike the tab panel and the stepper themselves — because a form
   * usually wants every field in the DOM (native submit, autofill, browser
   * search); validation runs on the model either way.
   */
  readonly deferRendering?: boolean;
  /** Keeps a rendered panel's fields mounted while it is hidden. Default `true`. */
  readonly keepAlive?: boolean;
  /** Index of the displayed tab / step — controlled when provided. */
  readonly activeIndex?: number;
  readonly onActiveIndexChange?: (index: number) => void;
  /** Uncontrolled starting tab / step. */
  readonly defaultActiveIndex?: number;
  /** Accordion only: keys of the expanded panels — controlled when provided. */
  readonly expandedKeys?: readonly string[];
  readonly onExpandedKeysChange?: (keys: readonly string[]) => void;
  /** Uncontrolled starting set of expanded panel keys. */
  readonly defaultExpandedKeys?: readonly string[];
}

/** One node of the layout tree Angular expresses with projected children. */
export type OgeFormNodeDefinition =
  OgeFormItemDefinition | OgeFormGroupDefinition | OgeFormSectionDefinition;

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

/** The imperative surface of `<OgeForm>` — Angular's public methods. */
export interface OgeFormHandle<T extends object = Record<string, unknown>> {
  /** Validates, runs the submit pipeline and reports whether it went through. */
  submit(event?: Event): Promise<boolean>;
  /** Re-reads validity and fires `onValidated`. Does not touch focus. */
  validate(): boolean;
  /** Resets every field to `values`, or to the data the form started with. */
  reset(values?: Partial<T>): void;
  /** Empties every editor by data type without changing validation state. */
  clear(): void;
  /** Focuses a named field, or the first one when called with no argument. */
  focus(field?: string): void;
  /** Reveals, focuses and (optionally) scrolls to the first invalid field. */
  focusFirstInvalid(): boolean;
  /** The resolved configuration of one item, as the form renders it. */
  itemOption(field: string): OgeResolvedFormItem | undefined;
  /** Merges a partial object, or one field's value, into the bound data. */
  updateData(fieldOrData: string | Partial<T>, value?: unknown): void;
  /** One entry per invalid field, in layout order. */
  readonly errors: readonly OgeFormErrorEntry[];
  /** Whether every bound field currently validates. */
  readonly valid: boolean;
  /** Whether any bound field has been edited since the last reset. */
  readonly dirty: boolean;
  /** The bound model, as the form currently holds it. */
  readonly data: T;
}

/** Appearance props the form forwards to every editor it renders. */
export interface OgeFormAppearance {
  readonly size: 'sm' | 'md' | 'lg';
  readonly stylingMode: 'outlined' | 'filled' | 'underlined';
  readonly labelMode: 'static' | 'floating' | 'hidden' | 'outside';
  readonly subscriptSizing: 'fixed' | 'dynamic' | 'none';
}

/** Props of `<OgeForm>`. */
export interface OgeFormProps<T extends object = Record<string, unknown>> {
  /** The bound model — controlled when provided. */
  formData?: T;
  /** Uncontrolled initial model. */
  defaultFormData?: T;
  /** Fires whenever the model changes (the controlled-pair callback). */
  onFormDataChange?: (data: T) => void;

  /** Data-driven items, appended after the layout tree. */
  items?: readonly OgeFormItemDefinition[];
  /** Data-driven groups, matched to items by `caption` / `key`. */
  groups?: readonly OgeFormGroupData[];
  /**
   * The nested layout: groups, tabbed/accordion/wizard sections and the items
   * inside them. This is React's stand-in for Angular's projected
   * `<oge-form-item>` / `<oge-form-group>` / `<oge-form-tabs>` children — the
   * one API shape that cannot be shared, since React has no content
   * projection.
   */
  layout?: readonly OgeFormNodeDefinition[];

  /** Column count; `'auto'` fits as many `minColWidth` columns as fit. */
  colCount?: OgeFormColCount;
  /** Column count per container-query breakpoint of the form's own width. */
  colCountByScreen?: Partial<Record<OgeFormScreenSize, number>>;
  /** Narrowest column `colCount: 'auto'` will produce, in pixels. */
  minColWidth?: number;
  /** Where labels sit; `'start'`/`'end'` give every field a label column. */
  labelLocation?: OgeFormLabelLocation;
  /** Forwarded to every editor's own label chrome. */
  labelMode?: 'static' | 'floating' | 'hidden' | 'outside';
  /** Gives side labels a shared column width so they line up. */
  alignItemLabels?: boolean;
  showColonAfterLabel?: boolean;
  showRequiredMark?: boolean;
  showOptionalMark?: boolean;
  size?: 'sm' | 'md' | 'lg';
  stylingMode?: 'outlined' | 'filled' | 'underlined';
  subscriptSizing?: 'fixed' | 'dynamic' | 'none';

  /** Makes every editor read-only. */
  readOnly?: boolean;
  /** Disables every editor via a `<fieldset disabled>` wrapper. */
  disabled?: boolean;
  /** Renders the validation summary above the fields after a failed submit. */
  showValidationSummary?: boolean;
  /** Scrolls the first invalid field into view when a submit fails. */
  scrollToFirstInvalid?: boolean;
  /** Per-instance string overrides. */
  messages?: Partial<OgeFormsMessages>;
  /**
   * Whether the fields are wrapped in a real `<form>`. Set `false` when the
   * form renders inside another form — nested `<form>` elements are invalid
   * HTML. With `false` there is no native submit, so drive it with `submit()`.
   */
  renderFormElement?: boolean;

  /** Cancelable pre-submit. Set `cancel` to keep the form open. */
  onSubmitting?: (event: OgeFormSubmittingEvent<T>) => void;
  /** Fires after a submit passed validation and was not canceled. */
  onSubmitted?: (event: OgeFormSubmittedEvent<T>) => void;
  /** Fires whenever one field's value changed. */
  onFieldChanged?: (event: OgeFormFieldChangedEvent) => void;
  /** Fires after `validate()` or a submit attempt. */
  onValidated?: (event: OgeFormValidatedEvent) => void;
  /** Enter pressed inside an editor. */
  onEditorEnterKey?: (event: OgeFormKeyEvent) => void;

  /** Form-level fallbacks for the per-item slots. */
  renderItem?: (context: OgeFormItemContext) => ReactNode;
  renderEditor?: (context: OgeFormItemContext) => ReactNode;
  renderLabel?: (context: OgeFormLabelContext) => ReactNode;
  renderGroupCaption?: (context: OgeFormGroupCaptionContext) => ReactNode;
  /** Rendered under the fields — Angular's `[ogeFormActions]` slot. */
  actions?: ReactNode;

  className?: string;
  style?: CSSProperties;
  id?: string;
}

/** Which editor a resolved item renders — re-exported for render props. */
export type { OgeFormEditorType, OgeResolvedFormItem, OgeFormErrorEntry };
