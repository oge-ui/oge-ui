'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import {
  isStepReachable,
  resolveStepIndex,
  runAsyncGuard,
  stepBlockReason,
  stepItemDescriptor,
  stepState,
  stepperKeyTarget,
  type OgeStepChangedEvent,
  type OgeStepChangingEvent,
  type OgeStepBlockedEvent,
  type OgeStepData,
  type OgeStepDescriptorCore,
  type OgeStepState,
  type OgeStepperDisplay,
  type OgeStepperFinishEvent,
  type OgeStepperMessages,
  type OgeStepperOrientation,
} from '@oge-ui/behavior';
import { useOgeStepperConfig } from './navigation-config';

let nextStepperId = 0;

// --- render-prop contexts ---------------------------------------------------

/** Context handed to `renderHeader` / `renderIndicator`. */
export interface OgeStepHeaderContext {
  /** The source `steps` entry. */
  item: OgeStepData | undefined;
  index: number;
  /** What the indicator shows right now. */
  state: OgeStepState;
}

/** Context handed to `renderContent`. */
export interface OgeStepContentContext {
  item: OgeStepData | undefined;
  index: number;
}

/**
 * One step — the React counterpart of both an `<oge-step>` child and a `steps`
 * entry: the shared data shape plus the React content slots.
 */
export interface OgeStepDefinition extends OgeStepData {
  /** Step body. The React counterpart of a step's projected content. */
  content?: ReactNode;
  /** Custom header rendering for this step alone. */
  renderHeader?: (context: OgeStepHeaderContext) => ReactNode;
  /** Custom indicator rendering for this step alone. */
  renderIndicator?: (context: OgeStepHeaderContext) => ReactNode;
  /** Lazy body for this step alone. Ignored when `content` is set. */
  renderContent?: (context: OgeStepContentContext) => ReactNode;
}

/** Normalized step with the React slots on top of the shared core. */
interface OgeReactStepDescriptor extends OgeStepDescriptorCore {
  readonly content?: ReactNode;
  readonly renderHeader?: (context: OgeStepHeaderContext) => ReactNode;
  readonly renderIndicator?: (context: OgeStepHeaderContext) => ReactNode;
  readonly renderContent?: (context: OgeStepContentContext) => ReactNode;
}

/** Imperative handle, mirroring the Angular component's public methods. */
export interface OgeStepperHandle {
  /** id prefix of the generated header / panel pairs. */
  readonly stepperId: string;
  /** Index of the active step. */
  readonly activeIndex: number;
  /** Key of the active step, when it has one. */
  readonly activeKey: string | undefined;
  /** `true` while an async `stepGuard` is in flight. */
  readonly changePending: boolean;
  /** Moves to the step at an index or with a key, through the full pipeline. */
  goTo(target: number | string, event?: Event): void;
  /** Advances one step, or finishes when already on the last one. */
  next(event?: Event): void;
  /** Goes back one step. */
  previous(event?: Event): void;
  /** Clears the rendered-body cache and returns to the first step. */
  reset(): void;
  /** Focuses the active step's header. */
  focus(): void;
}

export interface OgeStepperProps {
  /** The steps, in render order. */
  steps?: readonly OgeStepDefinition[];
  /** Index of the active step — controlled when provided. */
  activeIndex?: number;
  /** Uncontrolled initial active index. */
  defaultActiveIndex?: number;
  onActiveIndexChange?: (index: number) => void;
  /** Key of the active step — controlled when provided; wins over the index. */
  activeKey?: string;
  /** Uncontrolled initial active key. */
  defaultActiveKey?: string;
  onActiveKeyChange?: (key: string | undefined) => void;
  /** Main axis of the step list. */
  orientation?: OgeStepperOrientation;
  /** How much of each header is rendered. */
  display?: OgeStepperDisplay;
  /**
   * Blocks moving past a step that is neither `completed` nor `optional`.
   * Defaults to `false`, matching Material and PrimeNG.
   */
  linear?: boolean;
  /** Blocks every step change. */
  disabled?: boolean;
  /** Renders the built-in Back / Next bar. */
  showNavigation?: boolean;
  /**
   * Adds arrow / Home / End navigation over the headers. Off by default: the
   * headers are buttons in a list, not tabs, so they are Tab-reachable already.
   */
  keyboardNavigation?: boolean;
  /** Creates a step's body on first activation instead of up front. */
  deferRendering?: boolean;
  /** Keeps a body mounted after the user leaves it. */
  keepAlive?: boolean;
  /** Accessible name of the step list. */
  ariaLabel?: string;
  /** Per-instance message overrides. */
  messages?: Partial<OgeStepperMessages>;
  /** Shared header renderer — overridden by a step's own `renderHeader`. */
  renderHeader?: (context: OgeStepHeaderContext) => ReactNode;
  /** Shared indicator renderer. */
  renderIndicator?: (context: OgeStepHeaderContext) => ReactNode;
  /** Shared lazy-body renderer for steps that carry no `content`. */
  renderContent?: (context: OgeStepContentContext) => ReactNode;
  /** Cancelable pre-event, emitted before the step's `stepGuard` runs. */
  onStepChanging?: (event: OgeStepChangingEvent) => void;
  /** The active step changed. */
  onStepChanged?: (event: OgeStepChangedEvent) => void;
  /** A step change was refused, with the reason. */
  onStepBlocked?: (event: OgeStepBlockedEvent) => void;
  /** `next()` was confirmed on the last step. */
  onFinished?: (event: OgeStepperFinishEvent) => void;
  /** Fires whenever an async `stepGuard` starts or settles. */
  onChangePendingChange?: (pending: boolean) => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * A step-by-step process — the React render of the Angular `<oge-stepper>`: a
 * list of step headers plus the body of the active one.
 *
 * **There is no WAI-ARIA APG pattern for a stepper**, so the semantics are a
 * deliberate choice: an ordered list of `<button>` headers carrying
 * `aria-current="step"`, with each body a `role="group"` labelled by its
 * header. `group` rather than `region` on purpose: `region` is a landmark, and
 * a five-step wizard would add five of them to a page the APG asks to keep
 * under seven.
 *
 * That is **one semantic in both orientations** — unlike Material, which emits
 * tab semantics when horizontal, claiming panels may be browsed freely, which
 * is exactly what a `linear` stepper exists to forbid.
 *
 * Because the headers are not tabs, they all stay in the Tab sequence (the
 * accordion pattern). Arrow / Home / End are an opt-in enhancement via
 * `keyboardNavigation`, and they deliberately **do not wrap**.
 *
 * ```tsx
 * <OgeStepper
 *   linear
 *   activeIndex={step}
 *   onActiveIndexChange={setStep}
 *   steps={[
 *     { key: 'account', label: 'Account', completed: valid, content: <Account /> },
 *     { key: 'review', label: 'Review', content: <Review /> },
 *   ]}
 * />
 * ```
 */
export const OgeStepper = forwardRef<OgeStepperHandle, OgeStepperProps>(
  function OgeStepperRender(props, ref) {
    const {
      disabled = false,
      showNavigation = false,
      keyboardNavigation = false,
      deferRendering = false,
      keepAlive = true,
      ariaLabel,
      className,
      style,
    } = props;

    const config = useOgeStepperConfig();
    const messages: OgeStepperMessages = {
      ...config.messages,
      ...props.messages,
    };
    const orientation = props.orientation ?? config.orientation ?? 'horizontal';
    const display = props.display ?? config.display ?? 'full';
    const linear = props.linear ?? config.linear ?? false;

    const stepperIdRef = useRef<string>(undefined);
    stepperIdRef.current ??= `oge-stepper-${nextStepperId++}`;
    const stepperId = stepperIdRef.current;

    const listRef = useRef<HTMLOListElement>(null);
    const headerEls = useRef(new Map<string, HTMLButtonElement>());

    // --- descriptors ---------------------------------------------------------

    const descriptors: readonly OgeReactStepDescriptor[] = (props.steps ?? [])
      .filter((item) => item.visible !== false)
      .map((item, index) => ({
        ...stepItemDescriptor(item, index),
        content: item.content,
        renderHeader: item.renderHeader ?? props.renderHeader,
        renderIndicator: item.renderIndicator ?? props.renderIndicator,
        renderContent:
          item.content !== undefined
            ? undefined
            : (item.renderContent ?? props.renderContent),
      }));

    /** Stable identity of the rendered list — the effects' dependency. */
    const signature = descriptors.map((d) => d.id).join(' ');

    // --- active step (controlled/uncontrolled) -------------------------------

    const [uncontrolledIndex, setUncontrolledIndex] = useState(() => {
      if (props.defaultActiveKey !== undefined) {
        const index = descriptors.findIndex(
          (d) => d.key === props.defaultActiveKey,
        );
        if (index !== -1) return index;
      }
      return props.defaultActiveIndex ?? 0;
    });

    // `activeKey` wins over `activeIndex`, the way the Angular effects order
    // them so an initial key binding beats the index default.
    const keyIndex =
      props.activeKey === undefined
        ? -1
        : descriptors.findIndex((d) => d.key === props.activeKey);
    const activeIndex =
      keyIndex !== -1 ? keyIndex : (props.activeIndex ?? uncontrolledIndex);
    const activeKey = descriptors[activeIndex]?.key;

    const [changePending, setChangePendingState] = useState(false);
    const changePendingRef = useRef(false);

    const [renderedIds, setRenderedIds] = useState<ReadonlySet<string>>(
      () => new Set(),
    );

    const latest = useRef({
      props,
      descriptors,
      activeIndex,
      linear,
      disabled,
    });
    latest.current = { props, descriptors, activeIndex, linear, disabled };

    const setActiveIndex = (index: number): void => {
      if (props.activeIndex === undefined) setUncontrolledIndex(index);
      const p = latest.current.props;
      p.onActiveIndexChange?.(index);
      p.onActiveKeyChange?.(latest.current.descriptors[index]?.key);
    };

    const setChangePending = (pending: boolean): void => {
      changePendingRef.current = pending;
      setChangePendingState(pending);
      latest.current.props.onChangePendingChange?.(pending);
    };

    // Keep the index in range when steps are removed.
    useEffect(() => {
      const count = latest.current.descriptors.length;
      if (count > 0 && latest.current.activeIndex > count - 1) {
        setActiveIndex(count - 1);
      }
    }, [signature]);

    // Remember which bodies have been shown, for keepAlive.
    useEffect(() => {
      const id = latest.current.descriptors[latest.current.activeIndex]?.id;
      if (id === undefined || !keepAlive) return;
      setRenderedIds((ids) => (ids.has(id) ? ids : new Set(ids).add(id)));
    }, [activeIndex, signature]);

    // --- the change pipeline -------------------------------------------------

    /** Runs the leaving step's guard, then commits. */
    const confirmLeave = (
      fromIndex: number,
      commit: () => void,
      deny?: () => void,
    ): void => {
      runAsyncGuard(latest.current.descriptors[fromIndex]?.stepGuard, {
        allow: commit,
        deny: () => deny?.(),
        pending: (active) => setChangePending(active),
        label: 'oge-stepper stepGuard',
      });
    };

    /** `stepChanging` → `stepGuard` → commit → `stepChanged`. */
    const requestChange = (index: number, event?: Event): void => {
      const { descriptors: ds, props: p } = latest.current;
      const from = latest.current.activeIndex;
      if (index === from || (p.disabled ?? false) || changePendingRef.current) {
        return;
      }
      const target = ds[index];
      if (!target) return;
      const blocked = stepBlockReason({
        descriptors: ds,
        index,
        activeIndex: from,
        linear: latest.current.linear,
        disabled: p.disabled ?? false,
      });
      if (blocked) {
        p.onStepBlocked?.({ fromIndex: from, toIndex: index, reason: blocked });
        return;
      }
      const changing: OgeStepChangingEvent = {
        fromIndex: from,
        toIndex: index,
        fromKey: ds[from]?.key,
        toKey: target.key,
        item: target.item,
        event,
        cancel: false,
      };
      p.onStepChanging?.(changing);
      if (changing.cancel) return;
      // Unlike the tab strip, the guard runs *inside* the selection pipeline:
      // leaving a step is the thing an application needs to veto.
      confirmLeave(
        from,
        () => {
          setActiveIndex(index);
          latest.current.props.onStepChanged?.({
            index,
            key: target.key,
            previousIndex: from,
            previousKey: ds[from]?.key,
            item: target.item,
            event,
          });
        },
        () =>
          latest.current.props.onStepBlocked?.({
            fromIndex: from,
            toIndex: index,
            reason: 'guard',
          }),
      );
    };

    const isLast = activeIndex >= descriptors.length - 1;

    const next = (event?: Event): void => {
      const { descriptors: ds, activeIndex: from } = latest.current;
      if (from >= ds.length - 1) {
        // The guard runs either way, so a final step can still veto the finish.
        confirmLeave(from, () =>
          latest.current.props.onFinished?.({
            index: from,
            key: ds[from]?.key,
          }),
        );
        return;
      }
      requestChange(from + 1, event);
    };

    const previous = (event?: Event): void =>
      requestChange(latest.current.activeIndex - 1, event);

    // --- keyboard ------------------------------------------------------------

    const onKeyDown = (event: ReactKeyboardEvent<HTMLOListElement>): void => {
      if (!keyboardNavigation || disabled) return;
      const ds = descriptors;
      const first = headerEls.current.get(ds[0]?.id ?? '');
      const rtl =
        orientation !== 'vertical' &&
        !!first &&
        getComputedStyle(first).direction === 'rtl';
      const active = listRef.current?.ownerDocument.activeElement;
      const focused = ds.findIndex(
        (d) => headerEls.current.get(d.id) === active,
      );
      const target = stepperKeyTarget({
        key: event.key,
        orientation,
        rtl,
        count: ds.length,
        current: focused === -1 ? activeIndex : focused,
        isDisabled: (i) => ds[i]?.disabled ?? true,
      });
      if (target === undefined) return;
      event.preventDefault();
      // Focus only — activation stays on Enter/Space, which the buttons handle
      // natively. Moving focus must not run a guard.
      if (target !== null) headerEls.current.get(ds[target].id)?.focus();
    };

    // --- imperative surface --------------------------------------------------

    useImperativeHandle(
      ref,
      () => ({
        stepperId,
        activeIndex,
        activeKey,
        changePending,
        goTo: (target: number | string, event?: Event) => {
          const index = resolveStepIndex(latest.current.descriptors, target);
          if (index !== -1) requestChange(index, event);
        },
        next,
        previous,
        reset: () => {
          setRenderedIds(new Set());
          setActiveIndex(0);
        },
        focus: () => {
          const d = latest.current.descriptors[latest.current.activeIndex];
          if (d) headerEls.current.get(d.id)?.focus();
        },
      }),
      [stepperId, activeIndex, activeKey, changePending],
    );

    // --- render --------------------------------------------------------------

    const headerId = (index: number): string => `${stepperId}-header-${index}`;
    const panelId = (index: number): string => `${stepperId}-panel-${index}`;
    const optionalId = (index: number): string =>
      `${stepperId}-optional-${index}`;

    const isRendered = (id: string): boolean =>
      !deferRendering || renderedIds.has(id);

    const stateOf = (d: OgeReactStepDescriptor, index: number): OgeStepState =>
      stepState(d, index, activeIndex);

    const hostClassName = [
      'oge-stepper',
      orientation === 'vertical' && 'oge-stepper-vertical',
      linear && 'oge-stepper-linear',
      disabled && 'oge-disabled',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const renderIndicator = (
      d: OgeReactStepDescriptor,
      index: number,
    ): ReactNode => {
      const state = stateOf(d, index);
      if (d.renderIndicator)
        return d.renderIndicator({ item: d.item, index, state });
      if (d.icon) {
        return (
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
            <path d={d.icon} />
          </svg>
        );
      }
      if (d.iconClass) return <i className={d.iconClass} />;
      if (state === 'done') {
        return (
          <svg
            viewBox="0 0 16 16"
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m3 8.5 3.5 3.5L13 4.5" />
          </svg>
        );
      }
      if (state === 'error') {
        return (
          <svg
            viewBox="0 0 16 16"
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="m4 4 8 8M12 4l-8 8" />
          </svg>
        );
      }
      return index + 1;
    };

    const renderHeaderText = (
      d: OgeReactStepDescriptor,
      index: number,
    ): ReactNode => {
      if (d.renderHeader) {
        return d.renderHeader({
          item: d.item,
          index,
          state: stateOf(d, index),
        });
      }
      return (
        <>
          <span className="oge-stepper-label">{d.label}</span>
          {display === 'full' &&
            // the error message replaces the description while the step is
            // invalid: two sub-lines would compete
            (d.invalid && d.errorMessage ? (
              <span className="oge-stepper-error">{d.errorMessage}</span>
            ) : (
              d.description && (
                <span className="oge-stepper-description">{d.description}</span>
              )
            ))}
        </>
      );
    };

    const renderPanel = (
      d: OgeReactStepDescriptor,
      index: number,
    ): ReactNode => {
      if (index !== activeIndex && !isRendered(d.id)) return null;
      const body =
        d.content ?? d.renderContent?.({ item: d.item, index }) ?? null;
      return (
        <div
          key={`panel-${d.id}`}
          className="oge-stepper-panel"
          role="group"
          id={panelId(index)}
          aria-labelledby={headerId(index)}
          hidden={index !== activeIndex}
          inert={index !== activeIndex}
        >
          {body}
        </div>
      );
    };

    return (
      <div
        className={hostClassName}
        style={style}
        data-orientation={orientation}
        data-display={display}
      >
        {/*
          The list is not interactive; the keydown is delegated from its own
          focusable <button> headers.
        */}
        <ol
          ref={listRef}
          className="oge-stepper-list"
          aria-label={ariaLabel ?? messages.stepper}
          onKeyDown={onKeyDown}
        >
          {descriptors.map((d, i) => {
            const state = stateOf(d, i);
            return (
              <li
                key={d.id}
                className={[
                  'oge-stepper-item',
                  d.cssClass,
                  state === 'done' && 'oge-stepper-item-done',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <button
                  type="button"
                  className={[
                    'oge-stepper-header',
                    i === activeIndex && 'oge-stepper-header-active',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  ref={(el) => {
                    if (el) headerEls.current.set(d.id, el);
                    else headerEls.current.delete(d.id);
                  }}
                  id={headerId(i)}
                  data-state={state}
                  aria-current={i === activeIndex ? 'step' : undefined}
                  aria-controls={panelId(i)}
                  aria-describedby={d.optional ? optionalId(i) : undefined}
                  disabled={d.disabled || disabled}
                  aria-disabled={
                    isStepReachable({
                      descriptors,
                      index: i,
                      activeIndex,
                      linear,
                      disabled,
                    })
                      ? undefined
                      : true
                  }
                  onClick={(event) => requestChange(i, event.nativeEvent)}
                >
                  <span className="oge-stepper-indicator" aria-hidden="true">
                    {renderIndicator(d, i)}
                  </span>

                  {display !== 'indicator' && (
                    <span className="oge-stepper-text">
                      {renderHeaderText(d, i)}
                      {d.optional && (
                        <span
                          className="oge-stepper-optional"
                          id={optionalId(i)}
                        >
                          {messages.optional}
                        </span>
                      )}
                    </span>
                  )}

                  {/*
                    The indicator is aria-hidden, so the state is announced here
                    instead of being inferred from a glyph.
                  */}
                  {state === 'done' && (
                    <span className="oge-sr-only">{messages.completed}</span>
                  )}
                  {state === 'error' && (
                    <span className="oge-sr-only">{messages.invalid}</span>
                  )}
                </button>

                {orientation === 'vertical' && renderPanel(d, i)}
              </li>
            );
          })}
        </ol>

        {orientation === 'horizontal' &&
          descriptors.map((d, i) => renderPanel(d, i))}

        {showNavigation && (
          <div className="oge-stepper-nav">
            <button
              type="button"
              className="oge-stepper-nav-btn oge-stepper-nav-previous"
              disabled={activeIndex === 0 || disabled || changePending}
              onClick={(event) => previous(event.nativeEvent)}
            >
              {messages.previous}
            </button>
            <button
              type="button"
              className="oge-stepper-nav-btn oge-stepper-nav-next"
              disabled={disabled || changePending}
              onClick={(event) => next(event.nativeEvent)}
            >
              {isLast ? messages.finish : messages.next}
            </button>
          </div>
        )}
      </div>
    );
  },
);
