'use client';

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type CSSProperties,
} from 'react';
import { useOgeField, type OgeControlProps } from './use-field';

/** Imperative handle, mirroring the Angular component's public methods. */
export interface OgeSwitchHandle {
  focus(): void;
  blur(): void;
  /** Flips the state (no-op while disabled/readonly). */
  toggle(): void;
}

export interface OgeSwitchProps extends OgeControlProps<boolean> {
  /** Accessible name of the switch (`aria-label`). */
  label?: string;
  /** Track text while on; `undefined` = messages `switchOn` ('ON'). */
  onText?: string;
  /** Track text while off; `undefined` = messages `switchOff` ('OFF'). */
  offText?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * On/off toggle — the React render of the Angular `<oge-switch>`: a native
 * `<button role="switch">` with `aria-checked`, a sliding thumb and
 * localized track text (`switchOn`/`switchOff` messages, overridable per
 * instance; empty strings hide the text). Click, Space and Enter toggle.
 *
 * ```tsx
 * <OgeSwitch label="Notifications" value={notify} onValueChange={setNotify} />
 * ```
 */
export const OgeSwitch = forwardRef<OgeSwitchHandle, OgeSwitchProps>(
  function OgeSwitchRender(props, ref) {
    const { label = '', onText, offText, className, style } = props;

    const nativeRef = useRef<HTMLButtonElement>(null);
    const field = useOgeField<boolean>({
      props,
      emptyValue: false,
      isEmpty: (value) => !value,
      focusNative: () => nativeRef.current?.focus(),
    });
    const readonly = props.readonly ?? false;

    /** The state-matched track text; `null` hides the text element. */
    const trackText = (() => {
      const text = field.value
        ? (onText ?? field.msg.switchOn)
        : (offText ?? field.msg.switchOff);
      return text === '' ? null : text;
    })();

    const toggle = (event?: Event) => {
      if (field.effectiveDisabled || readonly) return;
      field.commit.commitNow(!field.value, event);
    };

    useImperativeHandle(ref, () => ({
      focus: () => nativeRef.current?.focus(),
      blur: () => nativeRef.current?.blur(),
      toggle: () => toggle(),
    }));

    const hostClasses = [
      'oge-switch',
      field.value && 'oge-switch-on',
      field.showError && 'oge-switch-invalid',
      readonly && 'oge-switch-readonly',
      props.size === 'sm' && 'oge-switch-sm',
      props.size === 'lg' && 'oge-switch-lg',
      field.effectiveDisabled && 'oge-disabled',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <span className={hostClasses} style={style}>
        <button
          ref={nativeRef}
          type="button"
          role="switch"
          className="oge-switch-button"
          id={field.ids.inputId}
          disabled={field.effectiveDisabled}
          name={props.name || undefined}
          title={props.tooltip}
          tabIndex={props.tabIndex ?? 0}
          autoFocus={props.autofocus}
          aria-checked={field.value}
          aria-label={label || undefined}
          aria-invalid={field.showError ? true : undefined}
          aria-required={props.required ? true : undefined}
          onClick={(event) => toggle(event.nativeEvent)}
          onFocus={field.handleFocus}
          onBlur={field.handleBlur}
        >
          <span className="oge-switch-track" aria-hidden="true">
            {trackText !== null && (
              <span className="oge-switch-text">{trackText}</span>
            )}
            <span className="oge-switch-thumb"></span>
          </span>
        </button>
      </span>
    );
  },
);
