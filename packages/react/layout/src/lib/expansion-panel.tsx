'use client';

import {
  createElement,
  forwardRef,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  ogeExpansionShowsToggle,
  runOgeExpansionToggle,
  type OgeAccordionExpandGuard,
  type OgeAccordionSize,
  type OgeAccordionStylingMode,
  type OgeAccordionTogglePosition,
  type OgeExpansionPanelCollapsingEvent,
  type OgeExpansionPanelExpandingEvent,
  type OgeExpansionPanelToggleEvent,
} from '@oge-ui/behavior';
import { useOgeAccordionConfig } from './layout-config';

export interface OgeExpansionPanelProps {
  /** Header title. */
  title?: string;
  /** Secondary line under the title. */
  subtitle?: string;
  /** SVG path data (`d`) rendered as a 24×24 aria-hidden icon before the title. */
  icon?: string;
  /** Native `title` tooltip of the header button. */
  hint?: string;
  /**
   * Whether the body is shown (controlled). User and handle toggles run
   * `onExpanding` / `onCollapsing` and the guard, then `onExpandedChange`.
   */
  expanded?: boolean;
  /** Initial state when uncontrolled. */
  defaultExpanded?: boolean;
  /** The state a toggle committed — the controlled half of `expanded`. */
  onExpandedChange?: (expanded: boolean) => void;
  /** Blocks toggling; the header stays visible but leaves the Tab sequence. */
  disabled?: boolean;
  /** Veto run before every toggle — the accordion's `expandGuard`. */
  expandGuard?: OgeAccordionExpandGuard;
  /** Side of the header the chevron sits on — logical, so RTL mirrors it. */
  togglePosition?: OgeAccordionTogglePosition;
  /** Hides the chevron; falls back to the accordion config's `hideToggle`. */
  hideToggle?: boolean;
  /** `aria-level` of the heading wrapping the header button. */
  headingLevel?: number;
  /** Gives the body `role="region"` (APG-optional). */
  useRegionRole?: boolean;
  /**
   * Height animation: `true` uses the default duration, a number overrides it
   * in milliseconds, `false` disables it. Suppressed under reduced motion.
   */
  animation?: boolean | number;
  /** Render `children` only from the first expand on (kept afterwards). */
  deferRendering?: boolean;
  /** Visual variant — the accordion's. */
  stylingMode?: OgeAccordionStylingMode;
  /** Density of the header row — the accordion's. */
  size?: OgeAccordionSize;
  /** Real buttons beside the toggle — never inside it. */
  headerActions?: ReactNode;
  /** The panel body. */
  children?: ReactNode;
  /** Cancelable pre-event of an expand. */
  onExpanding?: (event: OgeExpansionPanelExpandingEvent) => void;
  /** Cancelable pre-event of a collapse. */
  onCollapsing?: (event: OgeExpansionPanelCollapsingEvent) => void;
  /** The panel expanded through a user or handle toggle. */
  onOpened?: (event: OgeExpansionPanelToggleEvent) => void;
  /** The panel collapsed through a user or handle toggle. */
  onClosed?: (event: OgeExpansionPanelToggleEvent) => void;
  className?: string;
  style?: CSSProperties;
}

/** Imperative handle of `<OgeExpansionPanel>`. */
export interface OgeExpansionPanelHandle {
  /** Whether the panel is expanded. */
  isExpanded(): boolean;
  /** Runs the expand pipeline; resolves whether the panel ended up expanded. */
  expand(): Promise<boolean>;
  /** Runs the collapse pipeline; resolves whether the panel ended up collapsed. */
  collapse(): Promise<boolean>;
  /** Expands a collapsed panel, collapses an expanded one. */
  toggle(): Promise<boolean>;
  /** Focuses the header button. */
  focus(): void;
}

/**
 * One stand-alone disclosure panel — the React render of the Angular
 * `<oge-expansion-panel>` (Kendo's ExpansionPanel), following the WAI-ARIA
 * APG disclosure pattern: the title is a `<button aria-expanded
 * aria-controls>` inside a heading, Enter / Space toggle it and the collapsed
 * body is `inert`. The toggle pipeline is `@oge-ui/behavior`'s
 * `runOgeExpansionToggle`, shared with the Angular panel and the panel bar.
 *
 * ```tsx
 * <OgeExpansionPanel
 *   title="Shipping"
 *   subtitle="2 addresses"
 *   headerActions={<button type="button">Edit</button>}
 * >
 *   Shipping details…
 * </OgeExpansionPanel>
 * ```
 */
export const OgeExpansionPanel = forwardRef<
  OgeExpansionPanelHandle,
  OgeExpansionPanelProps
>(function OgeExpansionPanelRender(props, ref) {
  const {
    title = '',
    subtitle,
    icon,
    hint,
    disabled = false,
    togglePosition = 'end',
    headingLevel = 3,
    useRegionRole = true,
    animation = true,
    deferRendering = true,
    stylingMode = 'outlined',
    size = 'md',
  } = props;
  const config = useOgeAccordionConfig();
  const uid = `oge-expansion-panel-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [internal, setInternal] = useState(props.defaultExpanded ?? false);
  const controlled = props.expanded !== undefined;
  const expanded = controlled ? (props.expanded as boolean) : internal;
  const [pending, setPending] = useState(false);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const regionRef = useRef<HTMLDivElement | null>(null);
  const rendered = useRef(false);
  if (expanded) rendered.current = true;

  // the async guard settles later — read the current state, not a closure's
  const live = useRef({ props, expanded, pending, controlled });
  live.current = { props, expanded, pending, controlled };

  const request = (next: boolean, event?: Event): Promise<boolean> => {
    const now = live.current;
    return runOgeExpansionToggle<
      OgeExpansionPanelExpandingEvent | OgeExpansionPanelCollapsingEvent
    >({
      next,
      current: now.expanded,
      disabled: now.props.disabled ?? false,
      pending: now.pending,
      guard: now.props.expandGuard,
      preEvent: () => ({ event, cancel: false }),
      emitPre: (pre) =>
        next
          ? live.current.props.onExpanding?.(pre)
          : live.current.props.onCollapsing?.(pre),
      setPending,
      label: 'OgeExpansionPanel expandGuard',
      commit: () => {
        const latest = live.current;
        if (!next) {
          // the body turns inert — hand focus back to the header first
          const active = regionRef.current?.ownerDocument?.activeElement;
          if (active && regionRef.current?.contains(active)) {
            toggleRef.current?.focus();
          }
        }
        if (!latest.controlled) setInternal(next);
        latest.props.onExpandedChange?.(next);
        if (next) latest.props.onOpened?.({ event });
        else latest.props.onClosed?.({ event });
      },
    });
  };

  useImperativeHandle(ref, () => ({
    isExpanded: () => live.current.expanded,
    expand: () => request(true),
    collapse: () => request(false),
    toggle: () => request(!live.current.expanded),
    focus: () => toggleRef.current?.focus(),
  }));

  const showsToggle = ogeExpansionShowsToggle(
    props.hideToggle,
    config.hideToggle ?? false,
  );

  const button = (
    <button
      ref={toggleRef}
      type="button"
      className="oge-expansion-panel-toggle"
      data-toggle-position={togglePosition}
      id={`${uid}-header`}
      aria-expanded={expanded}
      aria-controls={`${uid}-panel`}
      aria-disabled={disabled ? true : undefined}
      tabIndex={disabled ? -1 : 0}
      title={hint}
      onClick={(event) => {
        if (disabled) return;
        void request(!expanded, event.nativeEvent);
      }}
    >
      {showsToggle && (
        <span className="oge-expansion-panel-chevron" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path
              d="M6 9l6 6 6-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}
      {icon && (
        <svg
          className="oge-expansion-panel-icon"
          viewBox="0 0 24 24"
          width="18"
          height="18"
          aria-hidden="true"
        >
          <path
            d={icon}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      <span className="oge-expansion-panel-titles">
        <span className="oge-expansion-panel-title">{title}</span>
        {subtitle && (
          <span className="oge-expansion-panel-subtitle">{subtitle}</span>
        )}
      </span>
      {pending && (
        <>
          <span className="oge-expansion-panel-spinner" aria-hidden="true" />
          <span className="oge-expansion-panel-sr">
            {config.messages.pending}
          </span>
        </>
      )}
    </button>
  );

  const headingTag =
    headingLevel >= 1 && headingLevel <= 6 ? `h${headingLevel}` : null;

  return (
    <div
      className={[
        'oge-expansion-panel',
        expanded && 'oge-expansion-panel-expanded',
        disabled && 'oge-expansion-panel-disabled',
        pending && 'oge-expansion-panel-pending',
        props.className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={props.style}
      data-styling-mode={stylingMode}
      data-size={size}
    >
      <div className="oge-expansion-panel-header">
        {headingTag ? (
          createElement(
            headingTag,
            { className: 'oge-expansion-panel-heading' },
            button,
          )
        ) : (
          <div
            className="oge-expansion-panel-heading"
            role="heading"
            aria-level={headingLevel}
          >
            {button}
          </div>
        )}
        {props.headerActions && (
          <div className="oge-expansion-panel-actions">
            {props.headerActions}
          </div>
        )}
      </div>
      <div
        ref={regionRef}
        className={[
          'oge-expansion-panel-region',
          expanded && 'oge-expansion-panel-region-open',
          animation !== false && 'oge-expansion-panel-region-animated',
        ]
          .filter(Boolean)
          .join(' ')}
        style={
          typeof animation === 'number'
            ? ({
                ['--oge-expansion-panel-transition']: `${animation}ms`,
              } as CSSProperties)
            : undefined
        }
        role={useRegionRole ? 'region' : undefined}
        id={`${uid}-panel`}
        aria-labelledby={`${uid}-header`}
        inert={!expanded}
      >
        <div className="oge-expansion-panel-inner">
          <div className="oge-expansion-panel-body">
            {!deferRendering || rendered.current ? props.children : null}
          </div>
        </div>
      </div>
    </div>
  );
});
