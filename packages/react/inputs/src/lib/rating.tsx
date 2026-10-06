'use client';

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import {
  OGE_RATING_ICON_PATHS,
  normalizeRatingMax,
  normalizeRatingPrecision,
  ogeIsRtl,
  ratingItemStates,
  ratingKeyboardTarget,
  ratingPointerRatio,
  ratingPressValue,
  ratingRadioKeyTarget,
  ratingValueFromPointer,
  ratingValueText,
  resolveRatingSemantics,
  snapRatingValue,
  type OgeRatingIcon,
  type OgeRatingItemState,
  type OgeRatingSelection,
  type OgeRatingSemantics,
} from '@oge-ui/behavior';
import { useOgeField, type OgeControlProps } from './use-field';
import { useOgeInputsConfig } from './inputs-config';

/** Payload of `onHoverChange` — the pointer previews another value. */
export interface OgeRatingHoverEvent {
  /** The previewed value; `null` once the pointer leaves. */
  value: number | null;
  event: Event;
}

/** Context of `renderItem` — called once per layer (empty / filled). */
export interface OgeRatingItemRenderContext {
  /** `true` for the filled (clipped) layer, `false` for the empty one. */
  filled: boolean;
  /** `true` while a pointer previews a value (hover). */
  hovered: boolean;
}

/** Imperative handle, mirroring the Angular component's public methods. */
export interface OgeRatingHandle {
  focus(): void;
  blur(): void;
  /** Clears the rating (commits `null`). */
  clear(): void;
}

export interface OgeRatingProps extends OgeControlProps<number | null> {
  /** Number of items (stars). */
  max?: number;
  /** Value step: `1` whole items, `0.5` halves, `0.1` tenths (≥ 0.01). */
  precision?: number;
  /** A press on the current value — or Delete/Backspace/`0` — clears it. */
  allowClear?: boolean;
  /** The built-in glyph; `renderItem` replaces it. */
  icon?: OgeRatingIcon;
  /** Paint every item up to the value (`continuous`) or only its holder (`single`). */
  selection?: OgeRatingSelection;
  /** APG `slider` (default, any precision) or `radiogroup` (whole items). */
  semantics?: OgeRatingSemantics;
  /** Previews the value under the pointer before it is pressed. */
  hoverPreview?: boolean;
  /** Accessible name; `''` = the `ratingLabel` message. */
  label?: string;
  /** Overrides the locale of the spoken value (config `locale` otherwise). */
  locale?: string;
  /** Custom glyph per item, rendered in the empty and the filled layer. */
  renderItem?: (
    state: OgeRatingItemState,
    context: OgeRatingItemRenderContext,
  ) => ReactNode;
  /** The pointer previews another value (`null` when it leaves). */
  onHoverChange?: (event: OgeRatingHoverEvent) => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * Star rating — the React render of the Angular `<oge-rating>`: a value
 * between `0` (no rating, `null`) and `max` in steps of `precision`, as an
 * APG slider (or a radio group of whole items with
 * `semantics="radiogroup"`). Arrow keys follow the reading direction, a
 * press on the current value clears it while `allowClear` is on, and the
 * pointer previews the value it would pick. The arithmetic and the key map
 * are `@oge-ui/behavior`'s rating core, shared with Angular.
 *
 * ```tsx
 * <OgeRating label="Your rating" precision={0.5} value={stars} onValueChange={setStars} />
 * ```
 */
export const OgeRating = forwardRef<OgeRatingHandle, OgeRatingProps>(
  function OgeRatingRender(props, ref) {
    const {
      max = 5,
      precision = 1,
      allowClear = true,
      icon = 'star',
      selection = 'continuous',
      semantics = 'slider',
      hoverPreview = true,
      label = '',
      locale,
      renderItem,
      className,
      style,
    } = props;

    const hostRef = useRef<HTMLSpanElement>(null);
    const config = useOgeInputsConfig();
    const [hoverValue, setHoverValue] = useState<number | null>(null);

    const focusNative = (): void => {
      const host = hostRef.current;
      (
        host?.querySelector<HTMLElement>('[role="slider"]') ??
        host?.querySelector<HTMLElement>('[role="radio"][tabindex="0"]') ??
        host?.querySelector<HTMLElement>('[role="radio"]')
      )?.focus();
    };

    const field = useOgeField<number | null>({
      props,
      emptyValue: null,
      isEmpty: (value) => value === null || value === 0,
      focusNative,
    });
    const readonly = props.readonly ?? false;
    const editable = !field.effectiveDisabled && !readonly;
    const resolvedMax = normalizeRatingMax(max);
    const step = normalizeRatingPrecision(precision);
    const resolvedSemantics = resolveRatingSemantics(semantics, precision);
    const effectiveLocale = locale ?? config.locale;
    const snap = (value: number | null): number | null =>
      snapRatingValue(value, resolvedMax, step);
    const current = snap(field.value);
    const shown = hoverValue !== null ? hoverValue : current;
    const states = ratingItemStates(shown, resolvedMax, selection);
    const valueText = ratingValueText(
      current,
      resolvedMax,
      field.msg,
      effectiveLocale,
    );
    const iconPath = OGE_RATING_ICON_PATHS[icon] ?? OGE_RATING_ICON_PATHS.star;
    const rtl = (): boolean => !!hostRef.current && ogeIsRtl(hostRef.current);

    const commit = (next: number | null, event?: Event): void => {
      if (!editable) return;
      field.commit.commitNow(snap(next), event);
    };

    useImperativeHandle(ref, () => ({
      focus: focusNative,
      blur: () => (document.activeElement as HTMLElement | null)?.blur?.(),
      clear: () => field.clear(),
    }));

    // --- pointer -------------------------------------------------------------

    const pointerValue = (event: ReactMouseEvent): number | null => {
      const item = (event.target as Element | null)?.closest?.(
        '.oge-rating-item',
      ) as HTMLElement | null;
      if (!item || !hostRef.current?.contains(item)) return null;
      const index = Number(item.dataset['index']);
      if (!Number.isFinite(index)) return null;
      const ratio = ratingPointerRatio(
        event.clientX,
        item.getBoundingClientRect(),
        rtl(),
      );
      return ratingValueFromPointer(index, ratio, step);
    };

    const onPointerMove = (event: ReactPointerEvent): void => {
      if (!editable || !hoverPreview) return;
      if (event.pointerType && event.pointerType !== 'mouse') return;
      const next = pointerValue(event);
      if (next === hoverValue) return;
      setHoverValue(next);
      props.onHoverChange?.({ value: next, event: event.nativeEvent });
    };

    const onPointerLeave = (event: ReactPointerEvent): void => {
      if (hoverValue === null) return;
      setHoverValue(null);
      props.onHoverChange?.({ value: null, event: event.nativeEvent });
    };

    const onItemsClick = (event: ReactMouseEvent): void => {
      if (!editable) return;
      const pressed = pointerValue(event);
      if (pressed === null) return;
      setHoverValue(null);
      commit(ratingPressValue(current, pressed, allowClear), event.nativeEvent);
    };

    // --- keyboard ------------------------------------------------------------

    const onSliderKeyDown = (event: ReactKeyboardEvent): void => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'Enter') {
        field.handleEnterKey(event);
        return;
      }
      const next = ratingKeyboardTarget(event.key, current, {
        max: resolvedMax,
        precision: step,
        rtl: rtl(),
        allowClear,
      });
      if (next === undefined) return;
      event.preventDefault();
      commit(next, event.nativeEvent);
    };

    const isChecked = (index: number): boolean =>
      Math.round(current ?? 0) === index + 1;
    const radioStop = Math.max(0, Math.round(current ?? 0) - 1);

    const focusRadio = (index: number): void => {
      queueMicrotask(() =>
        hostRef.current
          ?.querySelector<HTMLElement>(
            `.oge-rating-item[data-index="${index}"]`,
          )
          ?.focus(),
      );
    };

    const onRadioKeyDown = (index: number, event: ReactKeyboardEvent): void => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === ' ') {
        event.preventDefault();
        if (editable && !isChecked(index)) commit(index + 1, event.nativeEvent);
        return;
      }
      if (event.key === 'Enter') {
        field.handleEnterKey(event);
        return;
      }
      const target = ratingRadioKeyTarget(
        event.key,
        current,
        resolvedMax,
        rtl(),
      );
      if (target === undefined) return;
      event.preventDefault();
      if (editable) commit(target, event.nativeEvent);
      // APG radio group: the focus follows the arrow even when read-only
      focusRadio(target - 1);
    };

    const onGroupFocus = (event: ReactFocusEvent): void => {
      const related = event.relatedTarget as Node | null;
      if (related && hostRef.current?.contains(related)) return;
      field.handleFocus(event);
    };
    const onGroupBlur = (event: ReactFocusEvent): void => {
      const related = event.relatedTarget as Node | null;
      if (related && hostRef.current?.contains(related)) return;
      field.handleBlur(event);
    };

    // --- render --------------------------------------------------------------

    const glyph = (state: OgeRatingItemState, filled: boolean): ReactNode =>
      renderItem ? (
        renderItem(state, { filled, hovered: hoverValue !== null })
      ) : (
        <svg
          className="oge-rating-svg"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path d={iconPath} />
        </svg>
      );

    const layers = (state: OgeRatingItemState, hidden: boolean) => (
      <>
        <span
          className="oge-rating-layer oge-rating-empty"
          aria-hidden={hidden ? true : undefined}
        >
          {glyph(state, false)}
        </span>
        <span
          className="oge-rating-fill"
          aria-hidden={hidden ? true : undefined}
          style={{ width: `${state.fill * 100}%` }}
        >
          <span className="oge-rating-layer oge-rating-filled">
            {glyph(state, true)}
          </span>
        </span>
      </>
    );

    const hostClasses = [
      'oge-rating',
      readonly && 'oge-rating-readonly',
      field.showError && 'oge-rating-invalid',
      hoverValue !== null && 'oge-rating-hovering',
      props.size === 'sm' && 'oge-rating-sm',
      props.size === 'lg' && 'oge-rating-lg',
      selection === 'single' && 'oge-rating-single',
      field.effectiveDisabled && 'oge-disabled',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const name = label || field.msg.ratingLabel;

    return (
      <span ref={hostRef} className={hostClasses} style={style}>
        {resolvedSemantics === 'slider' ? (
          <div
            className="oge-rating-items"
            role="slider"
            id={field.ids.inputId}
            tabIndex={field.effectiveDisabled ? -1 : (props.tabIndex ?? 0)}
            aria-label={name}
            aria-valuemin={allowClear ? 0 : step}
            aria-valuemax={resolvedMax}
            aria-valuenow={current ?? 0}
            aria-valuetext={valueText}
            aria-readonly={readonly ? true : undefined}
            aria-disabled={field.effectiveDisabled ? true : undefined}
            aria-invalid={field.showError ? true : undefined}
            aria-required={props.required ? true : undefined}
            title={props.tooltip}
            autoFocus={props.autofocus}
            onKeyDown={onSliderKeyDown}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
            onClick={onItemsClick}
            onFocus={field.handleFocus}
            onBlur={field.handleBlur}
          >
            {states.map((state) => (
              <span
                key={state.index}
                className={[
                  'oge-rating-item',
                  state.full && 'oge-rating-item-full',
                  state.partial && 'oge-rating-item-partial',
                ]
                  .filter(Boolean)
                  .join(' ')}
                data-index={state.index}
                aria-hidden="true"
              >
                {layers(state, false)}
              </span>
            ))}
          </div>
        ) : (
          <div
            className="oge-rating-items"
            role="radiogroup"
            id={field.ids.inputId}
            aria-label={name}
            aria-readonly={readonly ? true : undefined}
            aria-disabled={field.effectiveDisabled ? true : undefined}
            aria-invalid={field.showError ? true : undefined}
            aria-required={props.required ? true : undefined}
            title={props.tooltip}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
            onFocus={onGroupFocus}
            onBlur={onGroupBlur}
          >
            {states.map((state) => (
              <span
                key={state.index}
                className={[
                  'oge-rating-item',
                  state.full && 'oge-rating-item-full',
                ]
                  .filter(Boolean)
                  .join(' ')}
                role="radio"
                data-index={state.index}
                tabIndex={
                  field.effectiveDisabled
                    ? -1
                    : state.index === radioStop
                      ? (props.tabIndex ?? 0)
                      : -1
                }
                aria-checked={isChecked(state.index)}
                aria-label={ratingValueText(
                  state.itemValue,
                  resolvedMax,
                  field.msg,
                  effectiveLocale,
                )}
                aria-disabled={field.effectiveDisabled ? true : undefined}
                onClick={(event) => {
                  if (!editable) return;
                  setHoverValue(null);
                  commit(
                    ratingPressValue(current, state.index + 1, allowClear),
                    event.nativeEvent,
                  );
                }}
                onKeyDown={(event) => onRadioKeyDown(state.index, event)}
              >
                {layers(state, true)}
              </span>
            ))}
          </div>
        )}
      </span>
    );
  },
);
