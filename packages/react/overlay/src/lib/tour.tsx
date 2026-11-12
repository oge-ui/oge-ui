'use client';

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement,
} from 'react';
import { createPortal } from 'react-dom';
import {
  OGE_ACTION_SHEET_FOCUS_ATTR,
  OgeActionSheetCore,
  ogeFormatMessage,
  ogeOverlayMessage,
  ogeTourCardPosition,
  ogeTourClampStep,
  ogeTourKeyIntent,
  ogeTourResolveTarget,
  ogeTourReveal,
  ogeTourSpotlight,
  type OgeOverlayMessages,
  type OgeRect,
  type OgeTourCardPosition,
  type OgeTourCloseReason,
  type OgeTourClosedEvent,
  type OgeTourStep,
} from '@oge-ui/behavior';
import { useOgeOverlayConfig } from './overlay-config';

const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

export interface OgeTourProps {
  /** The steps, in order. */
  steps: readonly OgeTourStep[];
  /** Whether the tour is open (controlled). */
  opened?: boolean;
  /** Initial open state when uncontrolled. */
  defaultOpened?: boolean;
  /** The open state a button, a key, a dismissal or a method committed. */
  onOpenedChange?: (opened: boolean) => void;
  /** Index of the shown step (controlled; 0-based, clamped to the steps). */
  step?: number;
  /** Initial step when uncontrolled. */
  defaultStep?: number;
  /** The step a button, a key or a method moved to. */
  onStepChange?: (step: number) => void;
  /** Escape skips the tour (default `true`). */
  closeOnEscape?: boolean;
  /** A press on the dimmed page skips the tour (default `false`). */
  closeOnBackdropClick?: boolean;
  /** Renders the Skip button (default `true`; never on the last step). */
  showSkip?: boolean;
  /** Per-instance message overrides. */
  messages?: Partial<OgeOverlayMessages>;
  /** The tour closed: finished (`'done'`), skipped, dismissed or closed from code. */
  onClosed?: (event: OgeTourClosedEvent) => void;
}

/** What a `ref` on {@link OgeTour} reaches. */
export interface OgeTourHandle {
  /** Opens the tour at `step` (default the first). */
  start(step?: number): void;
  /** The next step; on the last one, finishes the tour (`'done'`). */
  next(): void;
  /** The previous step (no-op on the first). */
  previous(): void;
  /** Closes the tour (reason `'api'`). */
  close(): void;
}

/**
 * A guided tour: each step dims the page, cuts a spotlight around its target,
 * scrolls it into view and places a modal card beside it — Back / Next / Done
 * and Skip, ← / → between steps, Escape to skip, focus restored at the end,
 * and no gliding or smooth scrolling under `prefers-reduced-motion`.
 */
export const OgeTour = forwardRef<OgeTourHandle, OgeTourProps>(
  function OgeTourRender(props, ref): ReactElement | null {
    const config = useOgeOverlayConfig();
    const messages = useMemo(
      () => ({ ...config.messages, ...props.messages }),
      [config.messages, props.messages],
    );
    const text = (key: keyof OgeOverlayMessages) =>
      ogeOverlayMessage(messages, key);
    const latest = useRef(props);
    latest.current = props;

    const [uncontrolledOpen, setUncontrolledOpen] = useState(
      props.defaultOpened ?? false,
    );
    const [uncontrolledStep, setUncontrolledStep] = useState(
      props.defaultStep ?? 0,
    );
    const count = props.steps.length;
    const index = ogeTourClampStep(props.step ?? uncontrolledStep, count);
    const current = props.steps[index] as OgeTourStep | undefined;
    const isOpen = (props.opened ?? uncontrolledOpen) && !!current;
    const isLast = index >= count - 1;

    const state = useRef({
      open: isOpen,
      index,
      reason: 'api' as OgeTourCloseReason,
    });
    state.current.open = isOpen;
    state.current.index = index;

    const setOpen = (next: boolean) => {
      if (state.current.open === next) return;
      state.current.open = next;
      if (latest.current.opened === undefined) setUncontrolledOpen(next);
      latest.current.onOpenedChange?.(next);
    };
    const setStep = (next: number) => {
      const clamped = ogeTourClampStep(next, latest.current.steps.length);
      state.current.index = clamped;
      if (latest.current.step === undefined) setUncontrolledStep(clamped);
      latest.current.onStepChange?.(clamped);
    };
    const finish = (reason: OgeTourCloseReason) => {
      if (!state.current.open) return;
      state.current.reason = reason;
      setOpen(false);
    };
    const actions = {
      start: (step = 0) => {
        setStep(step);
        state.current.reason = 'api';
        setOpen(true);
      },
      next: () => {
        const last = state.current.index >= latest.current.steps.length - 1;
        if (last) finish('done');
        else setStep(state.current.index + 1);
      },
      previous: () => {
        if (state.current.index > 0) setStep(state.current.index - 1);
      },
      close: () => finish('api'),
    };
    const actionsRef = useRef(actions);
    actionsRef.current = actions;
    const finishRef = useRef(finish);
    finishRef.current = finish;

    useImperativeHandle(
      ref,
      () => ({
        start: (step?: number) => actionsRef.current.start(step),
        next: () => actionsRef.current.next(),
        previous: () => actionsRef.current.previous(),
        close: () => actionsRef.current.close(),
      }),
      [],
    );

    const uid = useId().replace(/:/g, '');
    const titleId = `oge-tour-${uid}-title`;
    const contentId = `oge-tour-${uid}-content`;
    const layerRef = useRef<HTMLDivElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const [ready, setReady] = useState(false);
    const [spotlight, setSpotlight] = useState<OgeRect | null>(null);
    const [position, setPosition] = useState<OgeTourCardPosition | null>(null);

    const coreRef = useRef<OgeActionSheetCore | null>(null);
    if (coreRef.current === null) {
      coreRef.current = new OgeActionSheetCore({
        layer: () => layerRef.current,
        sheet: () => cardRef.current,
        onDismiss: (reason) => {
          const p = latest.current;
          if (reason === 'escape' && p.closeOnEscape !== false)
            finishRef.current('escape');
          if (reason === 'backdrop' && p.closeOnBackdropClick === true)
            finishRef.current('backdrop');
        },
      });
    }
    const core = coreRef.current;

    const wasOpen = useRef(false);
    useIsomorphicLayoutEffect(() => {
      if (!isOpen) {
        if (wasOpen.current) {
          wasOpen.current = false;
          setReady(false);
          setSpotlight(null);
          setPosition(null);
          const reason = state.current.reason;
          state.current.reason = 'api';
          latest.current.onClosed?.({ reason, step: state.current.index });
        }
        return;
      }
      wasOpen.current = true;
      core.activate();
      const frame = requestAnimationFrame(() => setReady(true));
      return () => {
        cancelAnimationFrame(frame);
        core.deactivate();
      };
    }, [isOpen, core]);
    useEffect(() => () => core.destroy(), [core]);

    const rtl = () =>
      !!layerRef.current &&
      getComputedStyle(layerRef.current).direction === 'rtl';

    // each step: bring the target into view, then measure — and again on
    // every scroll or resize while open
    useEffect(() => {
      if (!isOpen || !current) return;
      const doc = layerRef.current?.ownerDocument;
      const win = doc?.defaultView;
      if (!doc || !win) return;
      ogeTourReveal(ogeTourResolveTarget(current.target, doc));
      let frame = 0;
      const measure = () => {
        const card = cardRef.current;
        if (!card) return;
        const viewport = { width: win.innerWidth, height: win.innerHeight };
        const target = ogeTourResolveTarget(current.target, doc);
        const spot = ogeTourSpotlight(
          target ? target.getBoundingClientRect() : null,
          current.padding ?? 6,
          viewport,
        );
        setSpotlight(spot);
        setPosition(
          ogeTourCardPosition(
            spot,
            { width: card.offsetWidth, height: card.offsetHeight },
            viewport,
            current.placement ?? 'bottom',
            rtl(),
          ),
        );
      };
      const schedule = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(measure);
      };
      schedule();
      win.addEventListener('resize', schedule);
      win.addEventListener('scroll', schedule, true);
      return () => {
        cancelAnimationFrame(frame);
        win.removeEventListener('resize', schedule);
        win.removeEventListener('scroll', schedule, true);
      };
    }, [isOpen, current]);

    // on the first step the Back button goes away: focus moves to Next
    // instead of falling out of the dialog
    const back = () => {
      actions.previous();
      if (state.current.index === 0) {
        cardRef.current?.querySelector<HTMLElement>('.oge-tour-next')?.focus();
      }
    };

    const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable]')) return;
      const intent = ogeTourKeyIntent(event, rtl());
      if (!intent) return;
      event.preventDefault();
      if (intent === 'next') {
        if (!isLast) actions.next();
      } else {
        back();
      }
    };

    if (!isOpen || !current || typeof document === 'undefined') return null;

    const progress = ogeFormatMessage(text('tourStep'), {
      index: index + 1,
      count,
    });
    const focusAttr = { [OGE_ACTION_SHEET_FOCUS_ATTR]: '' };
    const showSkip = props.showSkip !== false && !isLast;

    return createPortal(
      <div
        ref={layerRef}
        className={[
          'oge-tour-layer',
          ready && 'oge-tour-ready',
          !spotlight && 'oge-tour-no-target',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {spotlight && (
          <div
            className="oge-tour-spotlight"
            aria-hidden="true"
            style={{
              top: spotlight.top,
              left: spotlight.left,
              width: spotlight.width,
              height: spotlight.height,
            }}
          />
        )}
        <div
          ref={cardRef}
          className="oge-tour-card"
          role="dialog"
          tabIndex={-1}
          onKeyDown={onKeyDown}
          aria-modal="true"
          aria-roledescription={text('tourLabel')}
          aria-labelledby={titleId}
          aria-describedby={current.content ? contentId : undefined}
          data-placement={position?.placement ?? 'center'}
          style={{ top: position?.top ?? 0, left: position?.left ?? 0 }}
        >
          <p className="oge-tour-progress">{progress}</p>
          <h2 className="oge-tour-title" id={titleId}>
            {current.title}
          </h2>
          {current.content && (
            <p className="oge-tour-content" id={contentId}>
              {current.content}
            </p>
          )}
          <div className="oge-tour-footer">
            {showSkip && (
              <button
                type="button"
                className="oge-tour-button oge-tour-skip"
                onClick={() => finish('skip')}
              >
                {text('tourSkip')}
              </button>
            )}
            <span className="oge-tour-spacer" />
            {index > 0 && (
              <button
                type="button"
                className="oge-tour-button oge-tour-previous"
                onClick={back}
              >
                {text('tourPrevious')}
              </button>
            )}
            <button
              type="button"
              className="oge-tour-button oge-tour-next"
              {...focusAttr}
              onClick={() => actions.next()}
            >
              {isLast ? text('tourDone') : text('tourNext')}
            </button>
          </div>
        </div>
        <span className="oge-tour-status" role="status">
          {`${progress}: ${current.title}`}
        </span>
      </div>,
      document.body,
    );
  },
);
