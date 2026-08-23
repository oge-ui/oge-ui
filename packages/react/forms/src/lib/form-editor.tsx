'use client';

import {
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  OgeAutocomplete,
  OgeCalendar,
  OgeCheckBox,
  OgeColorBox,
  OgeDateBox,
  OgeDateRangeBox,
  OgeNumberBox,
  OgeRadioGroup,
  OgeSelectBox,
  OgeSlider,
  OgeSwitch,
  OgeTagBox,
  OgeTextArea,
  OgeTextBox,
  OgeTreeSelect,
} from '@oge-ui/react-inputs';
import { OgeFileUploader } from '@oge-ui/react-upload';
import type { OgeFieldError, OgeResolvedFormItem } from '@oge-ui/behavior';
import type { OgeFormAppearance } from './form-types';

/**
 * The one editor of a resolved item. Which editor that is was decided by the
 * shared `pickEditorType` (ADR 0001); this file only wires the item's curated
 * `editorOptions` onto the matching React editor.
 *
 * There is a single arm, unlike Angular's three: React has no `formControl` /
 * `formField` binding, so every editor is driven by the controlled
 * `value` + `onValueChange` pair the whole React layer uses.
 */
export interface OgeFormEditorProps {
  item: OgeResolvedFormItem;
  value: unknown;
  onValueChange: (value: unknown) => void;
  /** Marks the field touched — the display gate the error text waits on. */
  onTouched: () => void;
  appearance: OgeFormAppearance;
  /** Accessible name; empty when the form renders the label itself. */
  label: string;
  /** Hint text; empty when the form renders the hint itself (bare editors). */
  hint: string;
  /** Id put on the rendered control, so the form's `<label for>` resolves. */
  editorId: string;
  /** Errors in the shared shape — the editor renders its own subscript. */
  errors: readonly OgeFieldError[];
  /** `true` once the field must show its error. */
  showError: boolean;
  onEnterKey: (event: Event) => void;
}

export function OgeFormEditor(props: OgeFormEditorProps) {
  const { item, appearance, editorId } = props;
  const options = item.editorOptions;
  const hostRef = useRef<HTMLDivElement | null>(null);

  const chrome = {
    fluid: true,
    size: appearance.size,
    stylingMode: appearance.stylingMode,
    labelMode: appearance.labelMode,
    subscriptSizing: appearance.subscriptSizing,
    id: editorId,
    label: props.label,
    hint: props.hint.length > 0 ? props.hint : undefined,
    placeholder: item.placeholder,
    required: item.required,
    disabled: item.disabled,
    readonly: item.readOnly,
    errors: props.errors,
    // the form owns the display gate, so the editor is told outright
    touched: props.showError,
    errorDisplay: 'touched' as const,
    onBlur: props.onTouched,
  };
  const bare = {
    size: appearance.size,
    id: editorId,
    label: props.label,
    required: item.required,
    disabled: item.disabled,
    readonly: item.readOnly,
  };

  const items = (options.items ?? []) as readonly unknown[];
  const displayExpr = options.displayExpr ?? '';
  const valueExpr = options.valueExpr ?? '';
  const numberMin = typeof options.min === 'number' ? options.min : undefined;
  const numberMax = typeof options.max === 'number' ? options.max : undefined;
  const dateMin = options.min instanceof Date ? options.min : undefined;
  const dateMax = options.max instanceof Date ? options.max : undefined;
  const dateType =
    options.type ?? (item.dataType === 'datetime' ? 'datetime' : 'date');

  const commit = (value: unknown) => props.onValueChange(value);

  // Enter anywhere inside the editor is the form's `onEditorEnterKey`; the
  // native listener sees the event even when an editor stops its propagation
  // to React (the popup editors do, to keep Enter out of the page).
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.defaultPrevented) return;
      props.onEnterKey(event);
    };
    host.addEventListener('keydown', onKeyDown);
    return () => host.removeEventListener('keydown', onKeyDown);
    // no dependency array on purpose: the listener closes over the latest
    // `onEnterKey`, and re-binding one listener per render is cheaper than
    // threading the callback through a ref
  });

  const editor = (() => {
    switch (item.editorType) {
      case 'textArea':
        return (
          <OgeTextArea
            {...chrome}
            value={(props.value as string) ?? ''}
            onValueChange={commit}
            rows={options.rows ?? 3}
            autoResize={options.autoResize ?? false}
            maxLength={options.maxLength}
            minLength={options.minLength}
            showCounter={options.showCounter ?? false}
          />
        );
      case 'numberBox':
        return (
          <OgeNumberBox
            {...chrome}
            value={(props.value as number | null) ?? null}
            onValueChange={commit}
            min={numberMin}
            max={numberMax}
            step={options.step ?? 1}
            showSpinButtons={options.showSpinButtons ?? false}
            format={options.format}
          />
        );
      case 'selectBox':
        return (
          <OgeSelectBox
            {...chrome}
            value={props.value}
            onValueChange={commit}
            items={items}
            displayExpr={displayExpr}
            valueExpr={valueExpr}
            searchEnabled={options.searchEnabled ?? false}
            showClearButton={options.showClearButton ?? false}
            acceptCustomValue={options.acceptCustomValue ?? false}
          />
        );
      case 'tagBox':
        return (
          <OgeTagBox
            {...chrome}
            value={(props.value as readonly unknown[]) ?? []}
            onValueChange={commit}
            items={items}
            displayExpr={displayExpr}
            valueExpr={valueExpr}
            searchEnabled={options.searchEnabled ?? false}
          />
        );
      case 'autocomplete':
        return (
          <OgeAutocomplete
            {...chrome}
            value={(props.value as string) ?? ''}
            onValueChange={commit}
            items={items}
            displayExpr={displayExpr}
          />
        );
      case 'dateBox':
        return (
          <OgeDateBox
            {...chrome}
            value={(props.value as Date | null) ?? null}
            onValueChange={commit}
            type={dateType}
            min={dateMin}
            max={dateMax}
            displayFormat={options.displayFormat}
            locale={options.locale}
            showClearButton={options.showClearButton ?? false}
          />
        );
      case 'dateRangeBox':
        return (
          <OgeDateRangeBox
            {...chrome}
            value={(props.value as [Date | null, Date | null]) ?? [null, null]}
            onValueChange={commit}
            min={dateMin}
            max={dateMax}
          />
        );
      case 'colorBox':
        return (
          <OgeColorBox
            {...chrome}
            value={(props.value as string | null) ?? null}
            onValueChange={commit}
            format={options.colorFormat ?? 'hex'}
            editAlphaChannel={options.editAlphaChannel ?? false}
            view={options.view ?? 'gradient'}
            palette={options.palette}
            showClearButton={options.showClearButton ?? false}
          />
        );
      case 'treeSelect':
        return (
          <OgeTreeSelect
            {...chrome}
            value={props.value}
            onValueChange={commit}
            items={items as readonly object[]}
            keyExpr={options.keyExpr ?? 'id'}
            parentIdExpr={options.parentIdExpr ?? 'parentId'}
            displayExpr={options.displayExpr ?? 'text'}
            dataStructure={options.dataStructure}
            showCheckBoxes={options.showCheckBoxes ?? 'none'}
            searchEnabled={options.searchEnabled ?? false}
          />
        );
      case 'checkBox':
        return (
          <OgeCheckBox
            {...bare}
            value={(props.value as boolean) ?? false}
            onValueChange={commit}
            text={options.text ?? ''}
          />
        );
      case 'switch':
        return (
          <OgeSwitch
            {...bare}
            value={(props.value as boolean) ?? false}
            onValueChange={commit}
          />
        );
      case 'slider':
        // the slider has no `label` prop — the form draws the label and the
        // handle takes its accessible name from `ariaLabel`
        return (
          <OgeSlider
            size={bare.size}
            id={bare.id}
            required={bare.required}
            disabled={bare.disabled}
            readonly={bare.readonly}
            ariaLabel={props.label}
            value={(props.value as number) ?? numberMin ?? 0}
            onValueChange={commit}
            min={numberMin ?? 0}
            max={numberMax ?? 100}
            step={options.step ?? 1}
          />
        );
      case 'radioGroup':
        return (
          <OgeRadioGroup
            {...bare}
            value={props.value}
            onValueChange={commit}
            items={items}
            displayExpr={displayExpr}
            valueExpr={valueExpr}
            layout={options.layout ?? 'vertical'}
          />
        );
      case 'calendar':
        return (
          <OgeCalendar
            {...bare}
            value={(props.value as Date | null) ?? null}
            onValueChange={commit}
            min={dateMin}
            max={dateMax}
            firstDayOfWeek={options.firstDayOfWeek}
            locale={options.locale}
            showTodayButton={options.showTodayButton ?? false}
            showWeekNumbers={options.showWeekNumbers ?? false}
          />
        );
      case 'fileUploader':
        return (
          <OgeFileUploader
            id={editorId}
            accept={(options.accept as string) ?? ''}
            multiple={(options.multiple as boolean) ?? true}
            maxFileSize={options.maxFileSize as number | undefined}
            uploadUrl={(options.uploadUrl as string) ?? ''}
            required={item.required}
            disabled={item.disabled}
            readOnly={item.readOnly}
            value={(props.value as readonly File[]) ?? []}
            onValueChange={commit}
            onTouch={props.onTouched}
          />
        );
      default:
        return (
          <OgeTextBox
            {...chrome}
            value={(props.value as string) ?? ''}
            onValueChange={commit}
            mode={(options.mode as 'text') ?? 'text'}
            maxLength={options.maxLength}
            minLength={options.minLength}
            showCounter={options.showCounter ?? false}
          />
        );
    }
  })();

  return (
    <div className="oge-form-editor" ref={hostRef}>
      {editor}
    </div>
  );
}

/** Keyboard helper shared with the field chrome. */
export function isEnterKey(event: ReactKeyboardEvent): boolean {
  return event.key === 'Enter' && !event.defaultPrevented;
}
