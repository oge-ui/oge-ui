'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { useOgeField, type OgeControlProps } from './use-field';

/** Imperative handle, mirroring the Angular component's public methods. */
export interface OgeCheckBoxHandle {
  focus(): void;
  blur(): void;
  /** Advances the state exactly like a user click (respects `threeState`). */
  toggle(): void;
}

export interface OgeCheckBoxProps extends OgeControlProps<boolean | null> {
  /** Lets users cycle into the indeterminate state: `null → true → false → null`. */
  threeState?: boolean;
  /** Label text; `children` renders when unset. */
  text?: string;
  /** Accessible name (`aria-label`) when there is no visible label text. */
  label?: string;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Checkbox control on a real (visually hidden) native
 * `<input type="checkbox">` — the React render of the Angular
 * `<oge-check-box>`: native label/click/Space semantics and
 * `aria-checked="mixed"` come for free. The value is `boolean | null`;
 * `null` renders the indeterminate (dash) state regardless of `threeState`,
 * which only controls whether *users* can cycle into it.
 *
 * ```tsx
 * <OgeCheckBox value={agreed} onValueChange={setAgreed}>I agree to the terms</OgeCheckBox>
 * <OgeCheckBox threeState text="Select all" value={all} onValueChange={setAll} />
 * ```
 */
export const OgeCheckBox = forwardRef<OgeCheckBoxHandle, OgeCheckBoxProps>(
  function OgeCheckBoxRender(props, ref) {
    const {
      threeState = false,
      text = '',
      label = '',
      children,
      className,
      style,
    } = props;

    const nativeRef = useRef<HTMLInputElement>(null);
    const field = useOgeField<boolean | null>({
      props,
      emptyValue: false,
      isEmpty: (value) => value !== true,
      focusNative: () => nativeRef.current?.focus(),
    });
    const readonly = props.readonly ?? false;

    // The model drives the DOM, not the other way around — the native
    // `indeterminate` property has no attribute and must be set imperatively.
    useEffect(() => {
      const el = nativeRef.current;
      if (!el) return;
      el.checked = field.value === true;
      el.indeterminate = field.value === null;
    });

    const nextValue = (): boolean | null => {
      const current = field.value;
      if (threeState) {
        // reference cycle: indeterminate → checked → unchecked → indeterminate
        if (current === null) return true;
        return current === true ? false : null;
      }
      return current !== true;
    };

    useImperativeHandle(ref, () => ({
      focus: () => nativeRef.current?.focus(),
      blur: () => nativeRef.current?.blur(),
      toggle: () => {
        if (field.effectiveDisabled || readonly) return;
        field.commit.commitNow(nextValue());
      },
    }));

    const hostClasses = [
      'oge-check-box',
      field.value === true && 'oge-check-box-checked',
      field.value === null && 'oge-check-box-indeterminate',
      field.showError && 'oge-check-box-invalid',
      readonly && 'oge-check-box-readonly',
      props.size === 'sm' && 'oge-check-box-sm',
      props.size === 'lg' && 'oge-check-box-lg',
      field.effectiveDisabled && 'oge-disabled',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <span className={hostClasses} style={style}>
        <label className="oge-check-box-field" title={props.tooltip}>
          <input
            ref={nativeRef}
            type="checkbox"
            className="oge-check-box-input"
            id={field.ids.inputId}
            disabled={field.effectiveDisabled}
            name={props.name || undefined}
            tabIndex={props.tabIndex ?? 0}
            autoFocus={props.autofocus}
            aria-label={label || undefined}
            aria-invalid={field.showError ? true : undefined}
            aria-required={props.required ? true : undefined}
            onClick={(event) => {
              if (readonly) event.preventDefault();
            }}
            onChange={(event) => {
              // React wires checkbox onChange to the native click, so the
              // readonly guard must live here too — preventDefault alone
              // does not stop it.
              if (readonly) {
                const el = nativeRef.current;
                if (el) {
                  el.checked = field.value === true;
                  el.indeterminate = field.value === null;
                }
                return;
              }
              // the native toggle already flipped `checked` — the value-sync
              // effect re-asserts the model-driven state after the commit
              field.commit.commitNow(nextValue(), event.nativeEvent);
            }}
            onKeyDown={field.handleEnterKey}
            onFocus={field.handleFocus}
            onBlur={field.handleBlur}
          />
          <span className="oge-check-box-icon" aria-hidden="true">
            {field.value === true ? (
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m3 8.5 3.5 3.5L13 4.5" />
              </svg>
            ) : field.value === null ? (
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M4 8h8" />
              </svg>
            ) : null}
          </span>
          <span className="oge-check-box-text">{text || children}</span>
        </label>
      </span>
    );
  },
);
