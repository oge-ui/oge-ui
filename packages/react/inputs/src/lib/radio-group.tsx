'use client';

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import {
  resolveDisabled,
  resolveDisplay,
  resolveValue,
  type OgeSelectDisabledExpr,
  type OgeSelectDisplayExpr,
  type OgeSelectValueExpr,
} from '@oge-ui/behavior';
import { useOgeField, type OgeControlProps } from './use-field';

/** Column (`vertical`, default) or row (`horizontal`) arrangement. */
export type OgeRadioGroupLayout = 'vertical' | 'horizontal';

/** Payload of `onItemClick` — a radio was activated by click or keyboard. */
export interface OgeRadioGroupItemClickEvent<TItem = unknown> {
  item: TItem;
  index: number;
  event: Event;
}

/** Imperative handle, mirroring the Angular component's public methods. */
export interface OgeRadioGroupHandle {
  /** Moves keyboard focus to the roving-tabindex radio. */
  focus(): void;
  blur(): void;
}

export interface OgeRadioGroupProps<
  TItem = unknown,
> extends OgeControlProps<unknown> {
  /** The selectable items. */
  items?: readonly TItem[];
  /** Item → display text. Omitted, the item itself is stringified. */
  displayExpr?: OgeSelectDisplayExpr<TItem>;
  /** Item → committed value. Omitted, the whole item is the value. */
  valueExpr?: OgeSelectValueExpr<TItem>;
  /** Marks individual items as non-selectable. */
  disabledExpr?: OgeSelectDisabledExpr<TItem>;
  layout?: OgeRadioGroupLayout;
  /** Accessible name of the group (`aria-label`). */
  label?: string;
  /** Custom item rendering (the radio dot stays). */
  renderItem?: (
    item: TItem,
    context: { index: number; selected: boolean; active: boolean },
  ) => ReactNode;
  /** A radio item was activated by click or keyboard. */
  onItemClick?: (event: OgeRadioGroupItemClickEvent<TItem>) => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * Radio group over a flat item array — the React render of the Angular
 * `<oge-radio-group>`: WAI-ARIA radiogroup with roving tabindex, arrows move
 * focus *and* selection (wrapping, disabled items skipped, RTL-aware),
 * Home/End jump to the edges. Shares the select-family expression vocabulary
 * (`displayExpr`/`valueExpr`/`disabledExpr`) via `@oge-ui/behavior`.
 *
 * ```tsx
 * <OgeRadioGroup label="Plan" items={plans} value={plan} onValueChange={setPlan} />
 * ```
 */
export const OgeRadioGroup = forwardRef(function OgeRadioGroupRender<TItem>(
  props: OgeRadioGroupProps<TItem>,
  ref: React.ForwardedRef<OgeRadioGroupHandle>,
) {
  const {
    items = [],
    displayExpr,
    valueExpr,
    disabledExpr,
    layout = 'vertical',
    label = '',
    renderItem,
    className,
    style,
  } = props;

  const hostRef = useRef<HTMLSpanElement>(null);
  const field = useOgeField<unknown>({
    props,
    emptyValue: null,
    isEmpty: (value) => value == null,
    focusNative: () => focusRadio(focusTargetIndex),
  });
  const readonly = props.readonly ?? false;

  /** Last item that held focus — the roving-tabindex anchor. */
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const isItemDisabled = (item: TItem): boolean =>
    resolveDisabled(disabledExpr, item);
  const isChecked = (item: TItem): boolean =>
    Object.is(resolveValue(valueExpr, item), field.value);

  /** The single item that carries the reachable tabindex. */
  const focusTargetIndex = (() => {
    const enabled = (index: number): boolean =>
      index >= 0 && index < items.length && !isItemDisabled(items[index]);
    if (enabled(focusedIndex)) return focusedIndex;
    const selected = items.findIndex(
      (item) => isChecked(item) && !isItemDisabled(item),
    );
    if (selected >= 0) return selected;
    return items.findIndex((item) => !isItemDisabled(item));
  })();

  const focusRadio = (index: number): void => {
    const radios =
      hostRef.current?.querySelectorAll<HTMLButtonElement>('.oge-radio');
    radios?.[index]?.focus();
  };

  const onItemClick = (item: TItem, index: number, event: Event): void => {
    if (field.effectiveDisabled || readonly) return;
    if (isItemDisabled(item)) return;
    setFocusedIndex(index);
    props.onItemClick?.({ item, index, event });
    const next = resolveValue(valueExpr, item);
    if (Object.is(next, field.value)) return; // radios can't unselect
    field.commit.commitNow(next, event);
  };

  const onKeyDown = (event: ReactKeyboardEvent): void => {
    const key = event.key;
    const isArrow =
      key === 'ArrowRight' ||
      key === 'ArrowLeft' ||
      key === 'ArrowDown' ||
      key === 'ArrowUp';
    if (!isArrow && key !== 'Home' && key !== 'End') return;
    if (field.effectiveDisabled || readonly) return;
    const enabledIndices = items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !isItemDisabled(item))
      .map(({ index }) => index);
    if (enabledIndices.length === 0) return;
    event.preventDefault();
    let nextIndex: number;
    if (key === 'Home') {
      nextIndex = enabledIndices[0];
    } else if (key === 'End') {
      nextIndex = enabledIndices[enabledIndices.length - 1];
    } else {
      let forward: boolean;
      if (key === 'ArrowDown') {
        forward = true;
      } else if (key === 'ArrowUp') {
        forward = false;
      } else {
        const rtl =
          hostRef.current !== null &&
          getComputedStyle(hostRef.current).direction === 'rtl';
        forward = (key === 'ArrowRight') !== rtl;
      }
      const position = enabledIndices.indexOf(focusTargetIndex);
      const delta = forward ? 1 : -1;
      nextIndex =
        enabledIndices[
          (position + delta + enabledIndices.length) % enabledIndices.length
        ];
    }
    setFocusedIndex(nextIndex);
    focusRadio(nextIndex);
    // WAI-ARIA radio-group pattern: arrows move the selection too.
    onItemClick(items[nextIndex], nextIndex, event.nativeEvent);
  };

  const onFocusIn = (event: ReactFocusEvent): void => {
    const related = event.relatedTarget as Node | null;
    if (related && hostRef.current?.contains(related)) return;
    field.handleFocus(event);
  };

  const onFocusOut = (event: ReactFocusEvent): void => {
    const related = event.relatedTarget as Node | null;
    if (related && hostRef.current?.contains(related)) return;
    field.handleBlur(event);
  };

  useImperativeHandle(ref, () => ({
    focus: () => focusRadio(focusTargetIndex),
    blur: () => (document.activeElement as HTMLElement | null)?.blur?.(),
  }));

  const hostClasses = [
    'oge-radio-group',
    layout === 'horizontal' && 'oge-radio-group-horizontal',
    field.showError && 'oge-radio-group-invalid',
    readonly && 'oge-radio-group-readonly',
    props.size === 'sm' && 'oge-radio-group-sm',
    props.size === 'lg' && 'oge-radio-group-lg',
    field.effectiveDisabled && 'oge-disabled',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      ref={hostRef}
      className={hostClasses}
      style={style}
      role="radiogroup"
      aria-label={label || undefined}
      aria-required={props.required ? true : undefined}
      aria-invalid={field.showError ? true : undefined}
      title={props.tooltip}
      onKeyDown={onKeyDown}
      onFocus={onFocusIn}
      onBlur={onFocusOut}
    >
      {items.map((item, index) => (
        <button
          key={index}
          type="button"
          role="radio"
          className={[
            'oge-radio',
            isChecked(item) && 'oge-radio-checked',
            isItemDisabled(item) && 'oge-disabled',
          ]
            .filter(Boolean)
            .join(' ')}
          disabled={field.effectiveDisabled || isItemDisabled(item)}
          aria-checked={isChecked(item)}
          tabIndex={index === focusTargetIndex ? (props.tabIndex ?? 0) : -1}
          onClick={(event) => onItemClick(item, index, event.nativeEvent)}
          onFocus={() => setFocusedIndex(index)}
        >
          <span className="oge-radio-dot" aria-hidden="true"></span>
          {renderItem ? (
            renderItem(item, {
              index,
              selected: isChecked(item),
              active: index === focusedIndex,
            })
          ) : (
            <span className="oge-radio-text">
              {resolveDisplay(displayExpr, item)}
            </span>
          )}
        </button>
      ))}
    </span>
  );
}) as <TItem = unknown>(
  props: OgeRadioGroupProps<TItem> & {
    ref?: React.ForwardedRef<OgeRadioGroupHandle>;
  },
) => ReactNode;
