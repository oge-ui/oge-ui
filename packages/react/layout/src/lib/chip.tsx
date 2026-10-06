'use client';

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  OGE_AVATAR_ICON_PATH,
  OGE_CHIP_REMOVE_SHORTCUTS,
  ogeAvatarInitials,
  ogeChipKeyIntent,
  ogeChipRemoveLabel,
  ogeResolveAvatarContent,
  type OgeChipAvatar,
  type OgeChipRemovedEvent,
  type OgeChipSeverity,
  type OgeChipSize,
  type OgeChipStylingMode,
} from '@oge-ui/behavior';
import { useOgeChipConfig } from './layout-config';

export interface OgeChipProps {
  /** Visible text and accessible name. */
  label?: string;
  /** SVG path data (`d`) of a leading `aria-hidden` icon. */
  icon?: string;
  /** A small leading avatar (image, else initials); wins over `icon`. */
  avatar?: OgeChipAvatar;
  /** Renders the chip as a toggle button with `aria-pressed`. */
  selectable?: boolean;
  /** Pressed state of a `selectable` chip (controlled). */
  selected?: boolean;
  /** Initial pressed state when uncontrolled. */
  defaultSelected?: boolean;
  /** The pressed state a toggle committed — the controlled half of `selected`. */
  onSelectedChange?: (selected: boolean) => void;
  /** Adds a remove button (and Delete/Backspace on the toggle). */
  removable?: boolean;
  /** Disables the toggle and the remove button. */
  disabled?: boolean;
  /** Density preset; falls back to the config, then `md`. */
  size?: OgeChipSize;
  /** `filled` (tinted, default) or `outlined`; falls back to the config. */
  stylingMode?: OgeChipStylingMode;
  /** Colour; `undefined` is the neutral chip. */
  severity?: OgeChipSeverity;
  /**
   * Accessible name of the toggle when the visible label is not enough; also
   * names the remove button ("Remove {label}").
   */
  ariaLabel?: string;
  /** The remove button (or Delete/Backspace) was pressed — hide the chip. */
  onRemoved?: (event: OgeChipRemovedEvent) => void;
  className?: string;
  style?: CSSProperties;
}

/** Imperative handle of `<OgeChip>`. */
export interface OgeChipHandle {
  /** Focuses the toggle button, else the remove button. */
  focus(): void;
}

const CHECK_PATH = 'M5 12.5l4.5 4.5L19 7.5';
const CROSS_PATH = 'M6 6l12 12M18 6 6 18';

/** @internal Shared by `<OgeChip>` and `<OgeChipList>`. */
export function ChipCheck() {
  return (
    <svg
      className="oge-chip-check"
      viewBox="0 0 24 24"
      width="14"
      height="14"
      aria-hidden="true"
      focusable="false"
    >
      <path d={CHECK_PATH} />
    </svg>
  );
}

/** @internal The ✕ glyph. */
export function ChipCross() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="12"
      height="12"
      aria-hidden="true"
      focusable="false"
    >
      <path d={CROSS_PATH} />
    </svg>
  );
}

/**
 * @internal The leading decoration of a chip — the same markup as the
 * Angular `span[ogeChipLead]`: always `aria-hidden`.
 */
export function ChipLead({
  avatar,
  icon,
}: {
  avatar?: OgeChipAvatar;
  icon?: string;
}) {
  // keyed by source: a new `src` gets a fresh attempt
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = avatar?.src;
  if (!avatar && !icon) return null;
  let body;
  if (avatar) {
    const content = ogeResolveAvatarContent({
      src,
      imageFailed: !!src && failedSrc === src,
      initials: avatar.initials,
      name: avatar.name,
    });
    body = (
      <span className="oge-chip-avatar">
        {content === 'image' ? (
          <img
            className="oge-chip-avatar-img"
            src={src}
            alt=""
            loading="lazy"
            onError={() => setFailedSrc(src ?? null)}
          />
        ) : content === 'initials' ? (
          avatar.initials?.trim() || ogeAvatarInitials(avatar.name)
        ) : (
          <svg viewBox="0 0 24 24" width="14" height="14" focusable="false">
            <path d={OGE_AVATAR_ICON_PATH} fill="currentColor" />
          </svg>
        )}
      </span>
    );
  } else {
    body = (
      <svg
        className="oge-chip-icon"
        viewBox="0 0 24 24"
        width="16"
        height="16"
        focusable="false"
      >
        <path d={icon} />
      </svg>
    );
  }
  return (
    <span className="oge-chip-lead" aria-hidden="true">
      {body}
    </span>
  );
}

/**
 * A compact element for a tag, a filter, an attribute or a person — the React
 * render of the Angular `<oge-chip>`. A `selectable` chip is a toggle
 * `<button aria-pressed>`, a `removable` chip adds a separate real remove
 * button, a plain chip is static text.
 *
 * ```tsx
 * <OgeChip label="Angular" />
 * <OgeChip label="Remote" selectable selected={remote} onSelectedChange={setRemote} />
 * <OgeChip label="Design" removable onRemoved={() => drop('design')} />
 * ```
 */
export const OgeChip = forwardRef<OgeChipHandle, OgeChipProps>(
  function OgeChip(props, ref) {
    const config = useOgeChipConfig();
    const {
      label = '',
      selectable = false,
      removable = false,
      disabled = false,
      severity,
    } = props;
    const [uncontrolled, setUncontrolled] = useState(
      props.defaultSelected ?? false,
    );
    const selected = props.selected ?? uncontrolled;
    const size = props.size ?? config.size ?? 'md';
    const stylingMode = props.stylingMode ?? config.stylingMode ?? 'filled';

    const mainRef = useRef<HTMLButtonElement>(null);
    const removeRef = useRef<HTMLButtonElement>(null);
    useImperativeHandle(ref, () => ({
      focus: () => (mainRef.current ?? removeRef.current)?.focus(),
    }));

    const toggle = () => {
      if (disabled) return;
      const next = !selected;
      if (props.selected === undefined) setUncontrolled(next);
      props.onSelectedChange?.(next);
    };
    const onKeyDown = (event: ReactKeyboardEvent) => {
      const intent = ogeChipKeyIntent(event.key);
      if (intent?.type !== 'remove' || !removable || disabled) return;
      event.preventDefault();
      props.onRemoved?.({ event: event.nativeEvent });
    };

    const className = [
      'oge-chip',
      size === 'sm' && 'oge-chip-sm',
      size === 'lg' && 'oge-chip-lg',
      stylingMode === 'outlined' && 'oge-chip-outlined',
      severity && severity !== 'neutral' && `oge-chip-${severity}`,
      selectable && 'oge-chip-selectable',
      selectable && selected && 'oge-chip-selected',
      removable && 'oge-chip-removable',
      disabled && 'oge-chip-disabled',
      props.className,
    ]
      .filter(Boolean)
      .join(' ');

    const content = (
      <>
        <ChipLead avatar={props.avatar} icon={props.icon} />
        <span className="oge-chip-label">{label}</span>
      </>
    );

    return (
      <span className={className} style={props.style}>
        {selectable ? (
          <button
            ref={mainRef}
            type="button"
            className="oge-chip-main"
            aria-pressed={selected}
            aria-label={props.ariaLabel}
            aria-keyshortcuts={
              removable ? OGE_CHIP_REMOVE_SHORTCUTS : undefined
            }
            disabled={disabled}
            onClick={toggle}
            onKeyDown={onKeyDown}
          >
            <ChipCheck />
            {content}
          </button>
        ) : (
          <span className="oge-chip-main">{content}</span>
        )}
        {removable && (
          <button
            ref={removeRef}
            type="button"
            className="oge-chip-remove"
            aria-label={ogeChipRemoveLabel(
              props.ariaLabel ?? label,
              config.messages,
            )}
            disabled={disabled}
            onClick={(event) => {
              if (!disabled) props.onRemoved?.({ event: event.nativeEvent });
            }}
          >
            <ChipCross />
          </button>
        )}
      </span>
    );
  },
);
