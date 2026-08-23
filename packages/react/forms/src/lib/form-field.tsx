'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';
import {
  isBareEditor,
  type OgeFieldError,
  type OgeFormLabelLocation,
  type OgeFormsMessages,
  type OgeResolvedFormItem,
} from '@oge-ui/behavior';
import { OgeFormEditor } from './form-editor';
import type {
  OgeFormAppearance,
  OgeFormItemContext,
  OgeFormLabelContext,
} from './form-types';

/**
 * One laid-out field: the label column, the editor, and — for the bare
 * controls that render no chrome of their own (check box, switch, radio
 * group, calendar, slider) — the hint and error text.
 *
 * Chrome editors keep their own subscript, so their hint and error are
 * rendered by `@oge-ui/react-inputs` and this component only supplies the
 * label when `labelLocation` is `start` or `end`. Same rule, same classes and
 * same stylesheet as the Angular `<oge-form-field>`.
 */
export interface OgeFormFieldProps {
  item: OgeResolvedFormItem;
  value: unknown;
  onValueChange: (value: unknown) => void;
  onTouched: () => void;
  errors: readonly OgeFieldError[];
  /** Resolved error text, or `null` while the field is valid or still quiet. */
  error: string | null;
  appearance: OgeFormAppearance;
  labelLocation: OgeFormLabelLocation;
  messages: OgeFormsMessages;
  showRequiredMark: boolean;
  showOptionalMark: boolean;
  showColonAfterLabel: boolean;
  /** Columns available in the enclosing layout — caps `colSpan`. */
  availableColumns: number;
  onEnterKey: (event: Event) => void;
  renderItem?: (context: OgeFormItemContext) => React.ReactNode;
  renderEditor?: (context: OgeFormItemContext) => React.ReactNode;
  renderLabel?: (context: OgeFormLabelContext) => React.ReactNode;
}

/** What the form calls to move focus into a field. */
export interface OgeFormFieldHandle {
  focus(): void;
  readonly element: HTMLElement | null;
}

export const OgeFormField = forwardRef<OgeFormFieldHandle, OgeFormFieldProps>(
  function OgeFormField(props, ref) {
    const { item, appearance, labelLocation, messages } = props;
    const hostRef = useRef<HTMLDivElement | null>(null);

    useImperativeHandle(ref, () => ({
      focus() {
        const host = hostRef.current;
        if (!host) return;
        const target =
          host.querySelector<HTMLElement>(
            'input:not([type=hidden]), select, textarea, [tabindex]:not([tabindex="-1"]), button',
          ) ?? host;
        target.focus();
      },
      get element() {
        return hostRef.current;
      },
    }));

    const bare = isBareEditor(item.editorType);
    const editorId = `${item.id}-editor`;
    const showError = props.error !== null;
    /** The form owns the label for bare controls and for side-label layouts. */
    const renderLabelRow =
      item.labelVisible && (bare || labelLocation !== 'top');
    const editorLabel = item.labelVisible ? item.label : '';
    const editorHint = bare ? '' : (item.hint ?? '');
    const subscriptVisible =
      (bare || props.renderEditor !== undefined) &&
      appearance.subscriptSizing !== 'none' &&
      (showError || !!item.hint);

    const context: OgeFormItemContext = {
      item,
      value: props.value,
      setValue: props.onValueChange,
      error: props.error,
      editorId,
    };
    const labelContext: OgeFormLabelContext = {
      label: item.label,
      item,
      required: item.required,
      editorId,
    };

    const span = Math.min(item.colSpan, Math.max(1, props.availableColumns));
    const classes = [
      'oge-form-field',
      bare && 'oge-form-field-bare',
      showError && 'oge-form-field-invalid',
      labelLocation === 'start' && 'oge-form-field-label-start',
      labelLocation === 'end' && 'oge-form-field-label-end',
      item.cssClass,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div
        ref={hostRef}
        className={classes}
        style={span > 1 ? { gridColumn: `span ${span}` } : undefined}
      >
        {props.renderItem ? (
          props.renderItem(context)
        ) : (
          <>
            {renderLabelRow && (
              <label className="oge-form-label" htmlFor={editorId}>
                {props.renderLabel ? (
                  props.renderLabel(labelContext)
                ) : (
                  <>
                    {item.label}
                    {props.showColonAfterLabel ? messages.labelColon : ''}
                  </>
                )}
                {props.showRequiredMark && item.required ? (
                  <>
                    <span className="oge-form-required-mark" aria-hidden="true">
                      {messages.requiredMark}
                    </span>
                    <span className="oge-sr-only">
                      {messages.requiredLabel}
                    </span>
                  </>
                ) : props.showOptionalMark && !item.required ? (
                  <span className="oge-form-optional-mark">
                    {messages.optionalMark}
                  </span>
                ) : null}
              </label>
            )}

            <div className="oge-form-control">
              {props.renderEditor ? (
                props.renderEditor(context)
              ) : (
                <OgeFormEditor
                  item={item}
                  value={props.value}
                  onValueChange={props.onValueChange}
                  onTouched={props.onTouched}
                  appearance={appearance}
                  label={editorLabel}
                  hint={editorHint}
                  editorId={editorId}
                  errors={props.errors}
                  showError={showError}
                  onEnterKey={props.onEnterKey}
                />
              )}

              {subscriptVisible && (
                <div className="oge-form-subscript">
                  {showError ? (
                    <span className="oge-form-error" id={`${item.id}-error`}>
                      {props.error}
                    </span>
                  ) : item.hint ? (
                    <span className="oge-form-hint" id={`${item.id}-hint`}>
                      {item.hint}
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  },
);
