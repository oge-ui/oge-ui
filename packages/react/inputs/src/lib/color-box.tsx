'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import {
  OGE_DEFAULT_COLOR_PALETTE,
  formatColor,
  hsvaToRgba,
  parseColor,
  rgbaToHsva,
  type OgeColorBoxApplyValueMode,
  type OgeColorBoxView,
  type OgeColorFormat,
  type OgeHsva,
  type OgeRgba,
} from '@oge-ui/behavior';
import {
  OgePopup,
  useAnchoredPanel,
  useOgeOverlayConfig,
  type OgePopupPlacement,
} from '@oge-ui/react-overlay';
import {
  ColorPalette,
  ColorSlider,
  ColorSurface,
  type ColorPalettePick,
  type ColorSliderChange,
  type ColorSurfaceChange,
} from './color-parts';
import { OgeFieldChrome } from './field-chrome';
import {
  nativeInputAttrs,
  successIconVisible,
  type OgeFieldExtrasProps,
} from './field-extras';
import { useOgeField, type OgeControlProps } from './use-field';

/** The empty-field draft — opaque black, the DevExtreme precedent. */
const DEFAULT_HSVA: OgeHsva = { h: 0, s: 0, v: 0, a: 1 };

/** Imperative handle, mirroring the Angular component's public methods. */
export interface OgeColorBoxHandle {
  focus(): void;
  blur(): void;
  open(): void;
  close(): void;
  toggle(): void;
  clear(): void;
}

export interface OgeColorBoxProps
  extends OgeControlProps<string | null>, OgeFieldExtrasProps {
  /** Committed string shape; translucent colors widen to carry alpha. */
  format?: OgeColorFormat;
  /** Which picker surfaces the popup renders. */
  view?: OgeColorBoxView;
  /** Alpha editing: the alpha slider + input, and alpha-carrying output. */
  editAlphaChannel?: boolean;
  /** Popup commit policy: on interaction (default) or via the OK/Cancel footer. */
  applyValueMode?: OgeColorBoxApplyValueMode;
  /** `false` makes the text read-only — picker input only. */
  acceptCustomValue?: boolean;
  /** Arrow-key increment of the panel parts, in value units (degrees / percent). */
  keyStep?: number;
  /** Palette swatches as CSS color strings; `undefined` = the built-in set. */
  palette?: readonly string[];
  /** Swatch columns of the palette grid. */
  paletteColumns?: number;
  /** Clicking the field opens the picker. */
  openOnFieldClick?: boolean;
  /** Hides the rail chevron when `false` — field click / keyboard still open. */
  showDropDownButton?: boolean;
  /**
   * Renders the eyedropper button (pick a color from anywhere on screen) in
   * browsers that ship the `EyeDropper` API; elsewhere the button never
   * renders — progressive enhancement, no polyfill.
   */
  showEyedropper?: boolean;
  dropdownPlacement?: OgePopupPlacement;
  /** Picker visibility — controlled when provided. */
  opened?: boolean;
  /** Uncontrolled initial picker visibility. */
  defaultOpened?: boolean;
  onOpenedChange?: (opened: boolean) => void;
  onDropDownOpened?: () => void;
  onDropDownClosed?: () => void;
  /** Raw text on every keystroke, regardless of the commit policy. */
  onInputChange?: (event: { text: string; event: Event }) => void;
  label?: string;
  labelMode?: 'static' | 'floating' | 'hidden' | 'outside';
  stylingMode?: 'outlined' | 'filled' | 'underlined';
  placeholder?: string;
  hint?: string;
  subscriptSizing?: 'fixed' | 'dynamic' | 'none';
  fluid?: boolean;
  showClearButton?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Color editor on the shared oge field chrome — the React render of the
 * Angular `<oge-color-box>`: the field shows a swatch and the committed color
 * text, the popup is a saturation/brightness surface with hue/alpha sliders,
 * hex + channel inputs and an optional swatch palette. The value is always a
 * CSS color string, normalized to `format` on commit.
 *
 * No WAI-ARIA APG color-picker pattern exists, so the popup is composed from
 * primitives: a `role="dialog"` that takes real DOM focus, APG sliders for
 * hue and alpha, a 2-axis `role="slider"` surface with mandatory
 * `aria-valuetext`, and a `role="grid"` palette. Typed text parses any CSS
 * color (hex, `rgb()`/`rgba()`, `hsl()`, named colors); unparseable text
 * shows the invalid state while typing and reverts on blur — a wrong color
 * is never committed.
 *
 * ```tsx
 * <OgeColorBox label="Brand" value={brand} onValueChange={setBrand} />
 * ```
 */
export const OgeColorBox = forwardRef<OgeColorBoxHandle, OgeColorBoxProps>(
  function OgeColorBoxRender(props, ref) {
    const {
      // `format` is read live through `latest.current.props` when a commit is
      // formatted, so it is deliberately not destructured here.
      view = 'gradient',
      editAlphaChannel = false,
      applyValueMode = 'instantly',
      acceptCustomValue = true,
      keyStep = 5,
      paletteColumns = 10,
      openOnFieldClick = true,
      showDropDownButton = true,
      showEyedropper = true,
      showSuccessIcon = false,
      selectOnFocus = false,
      inputAttr,
      label = '',
      labelMode = 'static',
      stylingMode = 'outlined',
      placeholder = '',
      hint,
      subscriptSizing = 'fixed',
      fluid = false,
      showClearButton = false,
      prefix,
      suffix,
      className,
      style,
    } = props;

    const overlayConfig = useOgeOverlayConfig();
    const hostRef = useRef<HTMLSpanElement>(null);
    const nativeRef = useRef<HTMLInputElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);

    const field = useOgeField<string | null>({
      props,
      emptyValue: null,
      isEmpty: (value) => value === null || value === '',
      parseErrorMessage: (msg) => msg.invalidColorError,
      focusNative: () => nativeRef.current?.focus(),
    });
    const readonly = props.readonly ?? false;

    /** Uncommitted typed text; `null` = show the committed value. */
    const [text, setText] = useState<string | null>(null);
    /** Panel working color (useButtons collects interactions here before OK). */
    const [draft, setDraft] = useState<OgeHsva | null>(null);

    // --- opened (controlled/uncontrolled) -----------------------------------

    const [uncontrolledOpened, setUncontrolledOpened] = useState(
      props.defaultOpened ?? false,
    );
    const opened = props.opened ?? uncontrolledOpened;
    const openedRef = useRef(opened);
    openedRef.current = opened;

    const latest = useRef({ props, field, opened, text, draft });
    latest.current = { props, field, opened, text, draft };

    const setOpened = (next: boolean): void => {
      if (latest.current.props.opened === undefined) {
        setUncontrolledOpened(next);
      }
      latest.current.props.onOpenedChange?.(next);
    };

    // An external programmatic write resets uncommitted text — the Angular
    // `onValueWritten` rule.
    const lastValue = useRef(props.value);
    useEffect(() => {
      if (props.value !== undefined && lastValue.current !== props.value) {
        setText(null);
        field.setParseInvalid(false);
      }
      lastValue.current = props.value;
    }, [props.value]);

    // --- derivations --------------------------------------------------------

    /** The committed value's HSVA; opaque black for an empty field (dx). */
    const currentHsva = (): OgeHsva => {
      const value = latest.current.field.value;
      const parsed = value == null ? null : parseColor(value);
      return parsed === null ? DEFAULT_HSVA : rgbaToHsva(parsed);
    };

    const inputText = text ?? field.value ?? '';

    /** The field swatch paint — the committed string itself (CSS parses it). */
    const swatchCss =
      field.value != null && parseColor(field.value) !== null
        ? field.value
        : 'transparent';

    /** The panel's working HSVA — the draft while open, else the value. */
    const displayHsva = draft ?? currentHsva();
    const displayRgba: OgeRgba = hsvaToRgba(displayHsva);
    const alphaPercent = Math.round(displayHsva.a * 100);
    const hueCss = `hsl(${Math.round(displayHsva.h)}, 100%, 50%)`;
    /** Opaque working color — fills the surface thumb (no alpha there). */
    const draftCss = `rgb(${displayRgba.r}, ${displayRgba.g}, ${displayRgba.b})`;
    /** Working color with alpha — the alpha thumb and the preview pane. */
    const draftRgbaCss = `rgba(${displayRgba.r}, ${displayRgba.g}, ${displayRgba.b}, ${Math.round(displayRgba.a * 100) / 100})`;
    const rgbCss = `${displayRgba.r}, ${displayRgba.g}, ${displayRgba.b}`;
    const hexText = formatColor(displayRgba, 'hex', editAlphaChannel);
    const paletteColors = props.palette ?? OGE_DEFAULT_COLOR_PALETTE;

    const surfaceValueText = field.msg.surfaceValueText
      .replace('{saturation}', String(Math.round(displayHsva.s)))
      .replace('{brightness}', String(Math.round(displayHsva.v)));
    const hueValueText = field.msg.hueValueText.replace(
      '{value}',
      String(Math.round(displayHsva.h)),
    );
    const alphaValueText = field.msg.alphaValueText.replace(
      '{value}',
      String(alphaPercent),
    );

    /** The `EyeDropper` API is Chromium-only today — detect, never polyfill. */
    const eyedropperSupported =
      typeof window !== 'undefined' && 'EyeDropper' in window;

    // --- panel --------------------------------------------------------------

    const panel = useAnchoredPanel({
      // anchor on the bordered container, not the host — the host also holds
      // the label and subscript, which the popup must ignore
      anchor: () =>
        hostRef.current?.querySelector<HTMLElement>('.oge-input-container') ??
        hostRef.current,
      panel: () => popupRef.current,
      placement: () => latest.current.props.dropdownPlacement ?? 'bottom-start',
      width: () => undefined as unknown as number | 'anchor',
      offset: () => overlayConfig.offset,
      viewportPadding: () => overlayConfig.viewportPadding,
      restoreFocus: () => nativeRef.current?.focus(),
      onClosed: () => {
        if (openedRef.current) setOpened(false);
      },
    });
    const panelRef = useRef(panel);
    panelRef.current = panel;

    // Tracks what we have already announced: the panel machine can close
    // itself (Escape, outside click), so `machine.isOpen` alone would miss
    // those closes and never run the teardown.
    const announcedOpen = useRef(false);
    useEffect(() => {
      const machine = panelRef.current;
      if (opened) {
        if (!machine.isOpen) machine.open();
        if (announcedOpen.current) return;
        announcedOpen.current = true;
        setDraft(currentHsva());
        // the composed color dialog takes real DOM focus (date-box precedent)
        setTimeout(() => {
          popupRef.current
            ?.querySelector<HTMLElement>('[data-focus-target]')
            ?.focus();
        });
        latest.current.props.onDropDownOpened?.();
      } else {
        if (machine.isOpen) machine.close('api');
        if (!announcedOpen.current) return;
        announcedOpen.current = false;
        setDraft(null);
        latest.current.props.onDropDownClosed?.();
      }
    }, [opened, panel.isOpen]);

    // --- open/close ---------------------------------------------------------

    const open = (): void => {
      if (field.effectiveDisabled || latest.current.props.readonly) return;
      setOpened(true);
    };
    const close = (): void => setOpened(false);
    const toggle = (): void => (openedRef.current ? close() : open());

    // --- typing -------------------------------------------------------------

    /** Commits the typed text; unparseable text reverts to the value. */
    const commitTypedText = (event?: Event): void => {
      const raw = latest.current.text;
      if (raw === null) return;
      setText(null);
      field.setParseInvalid(false);
      if (raw.trim() === '') {
        field.commit.commitNow(null, event);
        return;
      }
      const parsed = parseColor(raw);
      if (parsed !== null) commitRgba(parsed, event);
      // parsed === null → revert: inputText falls back to the committed value
    };

    const onKeydown = (event: ReactKeyboardEvent): void => {
      if (field.effectiveDisabled || latest.current.props.readonly) return;
      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault();
          if (!openedRef.current) open();
          return;
        }
        case 'Enter': {
          commitTypedText(event.nativeEvent);
          if (openedRef.current) close();
          field.handleEnterKey(event);
          return;
        }
        case 'Escape': {
          // the panel machine closes the popup; second Escape reverts
          // uncommitted text
          if (!openedRef.current && latest.current.text !== null) {
            event.preventDefault();
            setText(null);
            field.setParseInvalid(false);
          }
          return;
        }
      }
    };

    // --- commit -------------------------------------------------------------

    /** Normalized commit string; alpha coerced opaque without alpha editing. */
    const formatted = (rgba: OgeRgba): string => {
      const withAlpha = latest.current.props.editAlphaChannel ?? false;
      return formatColor(
        withAlpha ? rgba : { ...rgba, a: 1 },
        latest.current.props.format ?? 'hex',
        withAlpha,
      );
    };

    const commitRgba = (rgba: OgeRgba, event?: Event): void => {
      field.commit.commitNow(formatted(rgba), event);
      setText(null);
      field.setParseInvalid(false);
    };

    const commitHsva = (hsva: OgeHsva, event?: Event): void => {
      commitRgba(hsvaToRgba(hsva), event);
    };

    // --- panel interactions -------------------------------------------------

    /** Every panel interaction lands here: draft always, commit per the mode. */
    const applyDraftChange = (hsva: OgeHsva, event: Event): void => {
      setDraft(hsva);
      if ((latest.current.props.applyValueMode ?? 'instantly') === 'useButtons')
        return;
      field.commit.queue(formatted(hsvaToRgba(hsva)), event);
      setText(null);
      field.setParseInvalid(false);
    };

    const displayHsvaOf = (): OgeHsva => latest.current.draft ?? currentHsva();

    const onSurfaceChanged = (change: ColorSurfaceChange): void => {
      applyDraftChange(
        { ...displayHsvaOf(), s: change.s, v: change.v },
        change.event,
      );
    };

    const onHueChanged = (change: ColorSliderChange): void => {
      applyDraftChange({ ...displayHsvaOf(), h: change.value }, change.event);
    };

    const onAlphaChanged = (change: ColorSliderChange): void => {
      applyDraftChange(
        { ...displayHsvaOf(), a: change.value / 100 },
        change.event,
      );
    };

    /** Pointer gestures flush their live-queued commits on release. */
    const onPartReleased = (): void => {
      if (
        (latest.current.props.applyValueMode ?? 'instantly') === 'instantly'
      ) {
        field.flush();
      }
    };

    // React fires `onChange` per keystroke; the Angular `(change)` semantics
    // (apply on blur/Enter) are recovered with uncontrolled inputs applied
    // from `onBlur` and Enter.
    const applyHex = (element: HTMLInputElement, event: Event): void => {
      const parsed = parseColor(element.value);
      if (parsed === null) {
        element.value = hexText; // revert — a wrong color is never applied
        return;
      }
      applyDraftChange(rgbaToHsva(parsed), event);
    };

    const applyChannel = (
      channel: 'r' | 'g' | 'b',
      element: HTMLInputElement,
      event: Event,
    ): void => {
      const numeric = Number.parseFloat(element.value);
      const rgba = { ...hsvaToRgba(displayHsvaOf()) };
      if (!Number.isFinite(numeric)) {
        element.value = String(rgba[channel]);
        return;
      }
      rgba[channel] = Math.min(Math.max(Math.round(numeric), 0), 255);
      // keep the working hue: only re-derive the changed channel's effect
      const next = { ...rgbaToHsva(rgba), a: displayHsvaOf().a };
      applyDraftChange(next, event);
    };

    const applyAlphaInput = (element: HTMLInputElement, event: Event): void => {
      const numeric = Number.parseFloat(element.value);
      if (!Number.isFinite(numeric)) {
        element.value = String(Math.round(displayHsvaOf().a * 100));
        return;
      }
      const alpha = Math.min(Math.max(Math.round(numeric), 0), 100) / 100;
      applyDraftChange({ ...displayHsvaOf(), a: alpha }, event);
    };

    /** Opens the platform eyedropper; a cancelled pick is not an error. */
    const pickFromScreen = async (event: {
      nativeEvent: Event;
    }): Promise<void> => {
      const ctor = (
        window as unknown as {
          EyeDropper?: new () => { open(): Promise<{ sRGBHex: string }> };
        }
      ).EyeDropper;
      if (!ctor) return;
      try {
        const result = await new ctor().open();
        const parsed = parseColor(result.sRGBHex);
        if (parsed === null) return;
        // sRGBHex is always opaque — keep the working alpha
        const hsva = { ...rgbaToHsva(parsed), a: displayHsvaOf().a };
        applyDraftChange(hsva, event.nativeEvent);
      } catch {
        /* AbortError — the user pressed Escape */
      }
    };

    /** Uncontrolled-input glue: apply on blur, and on Enter apply eagerly. */
    const changeHandlers = (
      apply: (element: HTMLInputElement, event: Event) => void,
    ) => ({
      onBlur: (event: ReactFocusEvent<HTMLInputElement>) =>
        apply(event.target as HTMLInputElement, event.nativeEvent),
      onKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => {
        event.stopPropagation();
        if (event.key === 'Enter') {
          apply(event.currentTarget, event.nativeEvent);
        }
      },
    });

    const onPalettePick = (pick: ColorPalettePick): void => {
      const parsed = parseColor(pick.color);
      if (parsed === null) return;
      const hsva = rgbaToHsva(parsed);
      if (
        (latest.current.props.applyValueMode ?? 'instantly') === 'useButtons'
      ) {
        setDraft(hsva);
        return;
      }
      setDraft(hsva);
      commitRgba(parsed, pick.event);
      // a palette pick is a final choice — close (the date-pick precedent)
      close();
      nativeRef.current?.focus();
    };

    const applyDraft = (event: { nativeEvent: Event }): void => {
      const current = latest.current.draft;
      if (current !== null) commitHsva(current, event.nativeEvent);
      close();
      nativeRef.current?.focus();
    };

    // --- blur ---------------------------------------------------------------

    const onBlur = (event: ReactFocusEvent): void => {
      // focus moving into the picker dialog is not a real blur
      const related = event.relatedTarget as Node | null;
      if (related && hostRef.current?.contains(related)) return;
      commitTypedText();
      if (openedRef.current) close();
      field.handleBlur(event);
    };

    useImperativeHandle(
      ref,
      () => ({
        focus: () => nativeRef.current?.focus(),
        blur: () => nativeRef.current?.blur(),
        open,
        close,
        toggle,
        clear: () => field.clear(),
      }),
      [],
    );

    // --- render -------------------------------------------------------------

    const floatUp = field.focused || !field.isEmpty || opened;
    const placeholderText =
      labelMode === 'floating' && label && !floatUp ? '' : placeholder;

    const describedBy = (() => {
      const parts: string[] = [];
      if (subscriptSizing !== 'none') {
        if (field.showError && field.resolvedErrorText) {
          parts.push(field.ids.errorId);
        } else if (hint) parts.push(field.ids.hintId);
      }
      return parts.length ? parts.join(' ') : undefined;
    })();

    const successVisible = successIconVisible(showSuccessIcon, {
      pending: props.pending ?? false,
      invalid: field.effectiveInvalid,
      empty: field.isEmpty,
      touched: field.effectiveTouched,
    });
    const extraAttrs = nativeInputAttrs(inputAttr);

    const hostClasses = [
      'oge-input',
      'oge-color-box',
      opened && 'oge-select-box-open',
      field.effectiveDisabled && 'oge-disabled',
      field.focused && 'oge-input-focused',
      field.showError && 'oge-input-invalid',
      readonly && 'oge-input-readonly',
      field.isEmpty && 'oge-input-empty',
      fluid && 'oge-input-fluid',
      floatUp && 'oge-input-float-up',
      props.size === 'sm' && 'oge-input-sm',
      props.size === 'lg' && 'oge-input-lg',
      stylingMode === 'filled' && 'oge-input-filled',
      stylingMode === 'underlined' && 'oge-input-underlined',
      labelMode === 'floating' && 'oge-input-label-floating',
      labelMode === 'outside' && 'oge-input-label-outside',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    /**
     * A channel field of the panel — uncontrolled so typing is never fought,
     * re-keyed on the working value so a draft change from elsewhere (the
     * surface, a slider, the eyedropper) refreshes the box.
     */
    const channelField = (
      tag: string,
      ariaLabel: string,
      value: number,
      max: number,
      apply: (element: HTMLInputElement, event: Event) => void,
    ) => (
      <label className="oge-color-box-field">
        <input
          className="oge-color-box-channel"
          type="number"
          min={0}
          max={max}
          defaultValue={value}
          key={`${tag}-${value}`}
          aria-label={ariaLabel}
          {...changeHandlers(apply)}
        />
        <span className="oge-color-box-field-tag" aria-hidden="true">
          {tag}
        </span>
      </label>
    );

    return (
      <span ref={hostRef} className={hostClasses} style={style}>
        <OgeFieldChrome
          host={{
            msg: field.msg,
            ...field.ids,
            label,
            labelMode,
            required: props.required ?? false,
            pendingVisible: props.pending ?? false,
            successVisible,
            showClear:
              showClearButton &&
              !field.isEmpty &&
              !field.effectiveDisabled &&
              !readonly,
            clear: () => field.clear(),
            subscriptSizing,
            showError: field.showError,
            resolvedErrorText: field.resolvedErrorText,
            hint,
            counter: null,
            reveal: null,
            copy: null,
            spin: null,
            dropdown: {
              visible: showDropDownButton && !field.effectiveDisabled,
              expanded: opened,
              toggle,
            },
          }}
          prefix={
            <>
              {prefix}
              <span className="oge-color-box-swatch" aria-hidden="true">
                <span
                  className="oge-color-box-swatch-fill"
                  style={{ background: swatchCss }}
                ></span>
              </span>
            </>
          }
          suffix={suffix}
        >
          <input
            {...extraAttrs}
            ref={nativeRef}
            className="oge-input-native"
            type="text"
            role="combobox"
            aria-haspopup="dialog"
            aria-autocomplete="none"
            autoComplete="off"
            spellCheck={false}
            id={field.ids.inputId}
            value={inputText}
            placeholder={placeholderText}
            disabled={field.effectiveDisabled}
            readOnly={readonly || !acceptCustomValue}
            name={props.name || undefined}
            title={props.tooltip}
            tabIndex={props.tabIndex ?? 0}
            autoFocus={props.autofocus}
            aria-expanded={opened}
            aria-controls={opened ? panel.panelId : undefined}
            aria-label={labelMode === 'hidden' && label ? label : undefined}
            aria-labelledby={
              labelMode !== 'hidden' && label ? field.ids.labelId : undefined
            }
            aria-describedby={describedBy}
            aria-invalid={field.showError ? true : undefined}
            aria-required={props.required ? true : undefined}
            onChange={(event) => {
              const raw = event.target.value;
              setText(raw);
              props.onInputChange?.({ text: raw, event: event.nativeEvent });
              field.setParseInvalid(
                raw.trim() !== '' && parseColor(raw) === null,
              );
            }}
            onClick={() => {
              if (field.effectiveDisabled || readonly) return;
              if (!openedRef.current && openOnFieldClick) open();
            }}
            onKeyDown={onKeydown}
            onFocus={(event) => {
              if (selectOnFocus) nativeRef.current?.select();
              field.handleFocus(event);
            }}
            onBlur={onBlur}
          />
        </OgeFieldChrome>
        {opened && (
          <OgePopup panel={panel} ref={popupRef}>
            <div
              className="oge-color-box-panel"
              role="dialog"
              aria-label={label || field.msg.colorPickerLabel}
            >
              {view !== 'palette' && (
                <>
                  <ColorSurface
                    saturation={displayHsva.s}
                    brightness={displayHsva.v}
                    keyStep={keyStep}
                    label={field.msg.colorSurfaceLabel}
                    roleDescription={field.msg.colorSurfaceRoleDescription}
                    valueText={surfaceValueText}
                    style={
                      {
                        '--oge-color-surface-hue': hueCss,
                        '--oge-color-thumb': draftCss,
                      } as CSSProperties
                    }
                    onChanged={onSurfaceChanged}
                    onReleased={onPartReleased}
                  />
                  <ColorSlider
                    kind="hue"
                    value={displayHsva.h}
                    keyStep={keyStep}
                    label={field.msg.hueSliderLabel}
                    valueText={hueValueText}
                    style={{ '--oge-color-thumb': hueCss } as CSSProperties}
                    onChanged={onHueChanged}
                    onReleased={onPartReleased}
                  />
                  {editAlphaChannel && (
                    <ColorSlider
                      kind="alpha"
                      value={alphaPercent}
                      keyStep={keyStep}
                      label={field.msg.alphaSliderLabel}
                      valueText={alphaValueText}
                      style={
                        {
                          '--oge-color-slider-rgb': rgbCss,
                          '--oge-color-thumb': draftRgbaCss,
                        } as CSSProperties
                      }
                      onChanged={onAlphaChanged}
                      onReleased={onPartReleased}
                    />
                  )}
                  <div className="oge-color-box-fields">
                    {showEyedropper && eyedropperSupported && (
                      <button
                        type="button"
                        className="oge-color-box-eyedropper"
                        aria-label={field.msg.eyedropperButton}
                        title={field.msg.eyedropperButton}
                        onClick={pickFromScreen}
                      >
                        <svg
                          viewBox="0 0 16 16"
                          width="14"
                          height="14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="m9.5 3.5 3 3M11 2l3 3-1.5 1.5-3-3zM10.25 4.75 3.5 11.5 3 13.5l2-.5 6.75-6.75" />
                        </svg>
                      </button>
                    )}
                    <label className="oge-color-box-field oge-color-box-field-hex">
                      <input
                        className="oge-color-box-channel"
                        type="text"
                        spellCheck={false}
                        autoComplete="off"
                        defaultValue={hexText}
                        key={`hex-${hexText}`}
                        aria-label={field.msg.hexInputLabel}
                        {...changeHandlers(applyHex)}
                      />
                      <span
                        className="oge-color-box-field-tag"
                        aria-hidden="true"
                      >
                        HEX
                      </span>
                    </label>
                    {channelField(
                      'R',
                      field.msg.redInputLabel,
                      displayRgba.r,
                      255,
                      (element, event) => applyChannel('r', element, event),
                    )}
                    {channelField(
                      'G',
                      field.msg.greenInputLabel,
                      displayRgba.g,
                      255,
                      (element, event) => applyChannel('g', element, event),
                    )}
                    {channelField(
                      'B',
                      field.msg.blueInputLabel,
                      displayRgba.b,
                      255,
                      (element, event) => applyChannel('b', element, event),
                    )}
                    {editAlphaChannel &&
                      channelField(
                        'A',
                        field.msg.alphaInputLabel,
                        alphaPercent,
                        100,
                        applyAlphaInput,
                      )}
                  </div>
                </>
              )}
              {view !== 'gradient' && (
                <ColorPalette
                  colors={paletteColors}
                  columns={paletteColumns}
                  selected={displayRgba}
                  label={field.msg.paletteLabel}
                  onPicked={onPalettePick}
                />
              )}
              {applyValueMode === 'useButtons' && (
                <div className="oge-color-box-actions">
                  <span className="oge-color-box-preview" aria-hidden="true">
                    <span
                      className="oge-color-box-preview-pane"
                      style={{ background: swatchCss }}
                    ></span>
                    <span
                      className="oge-color-box-preview-pane"
                      style={{ background: draftRgbaCss }}
                    ></span>
                  </span>
                  <button
                    type="button"
                    className="oge-color-box-action oge-color-box-ok"
                    onClick={applyDraft}
                  >
                    {field.msg.okButton}
                  </button>
                  <button
                    type="button"
                    className="oge-color-box-action"
                    onClick={() => close()}
                  >
                    {field.msg.cancelButton}
                  </button>
                </div>
              )}
            </div>
          </OgePopup>
        )}
      </span>
    );
  },
);
