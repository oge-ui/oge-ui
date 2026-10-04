'use client';

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
} from 'react';
import {
  colorsEqual,
  contrastLevels,
  contrastRatio,
  formatColor,
  hsvaToRgba,
  parseColor,
  rgbaToHsva,
  type OgeColorFormat,
  type OgeHsva,
  type OgeRgba,
} from '@oge-ui/behavior';
import {
  ColorChannelInputs,
  ColorSlider,
  ColorSurface,
  type ColorChannelChange,
  type ColorSliderChange,
  type ColorSurfaceChange,
} from './color-parts';
import { useOgeField, type OgeControlProps } from './use-field';

/** The empty-value draft — opaque black, the color box precedent. */
const DEFAULT_HSVA: OgeHsva = { h: 0, s: 0, v: 0, a: 1 };
const WHITE: OgeRgba = { r: 255, g: 255, b: 255, a: 1 };

/** Imperative handle, mirroring the Angular component's public methods. */
export interface OgeColorGradientHandle {
  /** Moves keyboard focus to the saturation/brightness surface. */
  focus(): void;
  blur(): void;
}

export interface OgeColorGradientProps extends OgeControlProps<string | null> {
  /** Accessible name of the group; falls back to the messages catalog. */
  label?: string;
  /** Committed string shape; translucent colors widen to carry alpha. */
  format?: OgeColorFormat;
  /** Alpha editing: the alpha slider + input, and alpha-carrying output. */
  editAlphaChannel?: boolean;
  /** Arrow-key increment of the surface and sliders (degrees / percent). */
  keyStep?: number;
  /** Renders the hex + channel inputs under the sliders. */
  showInputs?: boolean;
  /** Renders the WCAG contrast readout (ratio + AA / AAA pass-fail). */
  showContrast?: boolean;
  /** The background the contrast ratio is measured against (any CSS color). */
  contrastBackground?: string;
  className?: string;
  style?: CSSProperties;
}

const hsvaOf = (value: string | null | undefined): OgeHsva | null => {
  const parsed = value == null ? null : parseColor(value);
  return parsed === null ? null : rgbaToHsva(parsed);
};

/**
 * Inline color gradient — the React render of the Angular
 * `<oge-color-gradient>`: a saturation/brightness surface, hue and optional
 * alpha sliders, hex + R/G/B(/A) inputs and an optional WCAG contrast readout
 * against a configurable background, as one always-visible form editor. The
 * parts, the channel parse rules and the contrast math are the same
 * `@oge-ui/behavior` functions the Angular editor runs.
 *
 * ```tsx
 * <OgeColorGradient label="Brand color" value={brand} onValueChange={setBrand} />
 * <OgeColorGradient editAlphaChannel format="rgba" showContrast value={overlay} onValueChange={setOverlay} />
 * ```
 */
export const OgeColorGradient = forwardRef<
  OgeColorGradientHandle,
  OgeColorGradientProps
>(function OgeColorGradientRender(props, ref) {
  const {
    label = '',
    editAlphaChannel = false,
    keyStep = 5,
    showInputs = true,
    showContrast = false,
    contrastBackground = '#ffffff',
    className,
    style,
  } = props;

  const hostRef = useRef<HTMLDivElement>(null);
  const focusSurface = (): void =>
    hostRef.current
      ?.querySelector<HTMLElement>('.oge-color-surface-thumb')
      ?.focus();
  const field = useOgeField<string | null>({
    props,
    emptyValue: null,
    isEmpty: (value) => value === null || value === '',
    focusNative: focusSurface,
  });
  const readonly = props.readonly ?? false;
  const inert = field.effectiveDisabled || readonly;

  /**
   * The working color. Follows the value, but keeps its own hue/saturation
   * while the value still describes the same color — a gray has no hue.
   */
  const [draft, setDraft] = useState<OgeHsva>(
    () => hsvaOf(field.value) ?? DEFAULT_HSVA,
  );
  const [seenValue, setSeenValue] = useState(field.value);
  if (seenValue !== field.value) {
    setSeenValue(field.value);
    const parsed = field.value == null ? null : parseColor(field.value);
    if (parsed !== null && !colorsEqual(hsvaToRgba(draft), parsed)) {
      setDraft(rgbaToHsva(parsed));
    }
  }

  const latest = useRef({ props, draft, inert });
  latest.current = { props, draft, inert };

  const rgba = hsvaToRgba(draft);
  const alphaPercent = Math.round(draft.a * 100);
  const hueCss = `hsl(${Math.round(draft.h)}, 100%, 50%)`;
  const opaqueCss = `rgb(${rgba.r}, ${rgba.g}, ${rgba.b})`;
  const rgbaCss = `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${Math.round(rgba.a * 100) / 100})`;
  const msg = field.msg;

  const surfaceValueText = msg.surfaceValueText
    .replace('{saturation}', String(Math.round(draft.s)))
    .replace('{brightness}', String(Math.round(draft.v)));
  const hueValueText = msg.hueValueText.replace(
    '{value}',
    String(Math.round(draft.h)),
  );
  const alphaValueText = msg.alphaValueText.replace(
    '{value}',
    String(alphaPercent),
  );

  const background = parseColor(contrastBackground) ?? WHITE;
  const contrast = showContrast
    ? contrastLevels(contrastRatio(rgba, background))
    : null;

  const apply = (hsva: OgeHsva, event: Event): void => {
    if (latest.current.inert) return;
    setDraft(hsva);
    latest.current.draft = hsva;
    const { editAlphaChannel: withAlpha = false, format: fmt = 'hex' } =
      latest.current.props;
    const next = hsvaToRgba(hsva);
    field.commit.queue(
      formatColor(withAlpha ? next : { ...next, a: 1 }, fmt, withAlpha),
      event,
    );
  };

  const onSurfaceChanged = (change: ColorSurfaceChange): void =>
    apply({ ...latest.current.draft, s: change.s, v: change.v }, change.event);
  const onHueChanged = (change: ColorSliderChange): void =>
    apply({ ...latest.current.draft, h: change.value }, change.event);
  const onAlphaChanged = (change: ColorSliderChange): void =>
    apply({ ...latest.current.draft, a: change.value / 100 }, change.event);
  const onChannelsChanged = (change: ColorChannelChange): void => {
    apply(change.hsva, change.event);
    field.flush();
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
    focus: focusSurface,
    blur: () => (document.activeElement as HTMLElement | null)?.blur?.(),
  }));

  const hostClasses = [
    'oge-color-gradient',
    readonly && 'oge-color-gradient-readonly',
    field.showError && 'oge-color-gradient-invalid',
    field.effectiveDisabled && 'oge-disabled',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const badge = (name: string, pass: boolean) => (
    <span
      key={name}
      className={[
        'oge-color-gradient-contrast-badge',
        pass
          ? 'oge-color-gradient-contrast-pass'
          : 'oge-color-gradient-contrast-fail',
      ].join(' ')}
    >
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {pass ? (
          <path d="m3 8.5 3.5 3.5L13 4.5" />
        ) : (
          <path d="M4 4l8 8M12 4l-8 8" />
        )}
      </svg>
      {(pass ? msg.contrastPass : msg.contrastFail).replace('{level}', name)}
    </span>
  );

  return (
    <div
      ref={hostRef}
      className={hostClasses}
      style={style}
      role="group"
      aria-label={label || msg.colorGradientLabel}
      aria-invalid={field.showError ? true : undefined}
      aria-disabled={field.effectiveDisabled ? true : undefined}
      title={props.tooltip}
      onFocus={onFocusIn}
      onBlur={onFocusOut}
    >
      <ColorSurface
        saturation={draft.s}
        brightness={draft.v}
        keyStep={keyStep}
        disabled={inert}
        label={msg.colorSurfaceLabel}
        roleDescription={msg.colorSurfaceRoleDescription}
        valueText={surfaceValueText}
        style={
          {
            '--oge-color-surface-hue': hueCss,
            '--oge-color-thumb': opaqueCss,
          } as CSSProperties
        }
        onChanged={onSurfaceChanged}
        onReleased={() => field.flush()}
      />
      <ColorSlider
        kind="hue"
        value={draft.h}
        keyStep={keyStep}
        disabled={inert}
        label={msg.hueSliderLabel}
        valueText={hueValueText}
        style={{ '--oge-color-thumb': hueCss } as CSSProperties}
        onChanged={onHueChanged}
        onReleased={() => field.flush()}
      />
      {editAlphaChannel && (
        <ColorSlider
          kind="alpha"
          value={alphaPercent}
          keyStep={keyStep}
          disabled={inert}
          label={msg.alphaSliderLabel}
          valueText={alphaValueText}
          style={
            {
              '--oge-color-slider-rgb': `${rgba.r}, ${rgba.g}, ${rgba.b}`,
              '--oge-color-thumb': rgbaCss,
            } as CSSProperties
          }
          onChanged={onAlphaChanged}
          onReleased={() => field.flush()}
        />
      )}
      {showInputs && (
        <ColorChannelInputs
          hsva={draft}
          editAlpha={editAlphaChannel}
          messages={msg}
          disabled={field.effectiveDisabled}
          readonly={readonly}
          onChanged={onChannelsChanged}
        />
      )}
      {contrast && (
        <div className="oge-color-gradient-contrast">
          <span
            className="oge-color-gradient-contrast-sample"
            aria-hidden="true"
            style={{
              background: `rgb(${background.r}, ${background.g}, ${background.b})`,
            }}
          >
            <span style={{ color: rgbaCss }}>Aa</span>
          </span>
          <span className="oge-color-gradient-contrast-label">
            {msg.contrastLabel}
          </span>
          <span className="oge-color-gradient-contrast-ratio">
            {msg.contrastRatioText.replace(
              '{ratio}',
              contrast.ratio.toFixed(2),
            )}
          </span>
          {badge('AA', contrast.aa)}
          {badge('AAA', contrast.aaa)}
        </div>
      )}
    </div>
  );
});
