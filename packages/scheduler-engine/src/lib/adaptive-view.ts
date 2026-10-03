import type { OgeSchedulerView } from './scheduler-types';

/**
 * `adaptiveView` options: below `breakpoint` (the scheduler's own width, in
 * px) the visible view switches to `view`; above it again the view the user
 * had comes back.
 */
export interface OgeSchedulerAdaptiveViewOptions {
  /** Container width (px) below which the scheduler switches. Default `600`. */
  readonly breakpoint?: number;
  /** The view a narrow scheduler shows. Default `'agenda'`. */
  readonly view?: OgeSchedulerView;
}

/** Default container width below which `adaptiveView` switches views. */
export const OGE_SCHEDULER_ADAPTIVE_BREAKPOINT = 600;

/** `true` / an options object turns the behavior on; `false` (the default) off. */
export type OgeSchedulerAdaptiveView =
  boolean | OgeSchedulerAdaptiveViewOptions;

/** Normalized options; `null` when adaptive switching is off. */
export function resolveSchedulerAdaptiveView(
  value: OgeSchedulerAdaptiveView | undefined,
): Required<OgeSchedulerAdaptiveViewOptions> | null {
  if (!value) return null;
  const options = value === true ? {} : value;
  return {
    breakpoint: options.breakpoint ?? OGE_SCHEDULER_ADAPTIVE_BREAKPOINT,
    view: options.view ?? 'agenda',
  };
}

export interface OgeSchedulerAdaptiveViewControllerOptions {
  /** The `adaptiveView` input / prop (read live). */
  adaptiveView(): OgeSchedulerAdaptiveView | undefined;
  /** The current two-way `currentView`. */
  currentView(): OgeSchedulerView;
  /** Writes the two-way `currentView` (emits the change like a user switch). */
  setCurrentView(view: OgeSchedulerView): void;
}

/**
 * The scheduler's adaptive view switch, keyed off the scheduler's **own**
 * width (a `ResizeObserver` in either render layer — never the window): the
 * first time the container drops below the breakpoint the view switches to
 * the compact one (agenda) and the previous view is remembered; when it grows
 * back past the breakpoint the remembered view returns — unless the user
 * picked another view meanwhile, which then stays. Switching happens on
 * *crossings* only, so the view switcher keeps working at any width.
 */
export class OgeSchedulerAdaptiveViewController {
  private narrow = false;
  private restoreTo: OgeSchedulerView | null = null;

  constructor(
    private readonly options: OgeSchedulerAdaptiveViewControllerOptions,
  ) {}

  /** Feed the measured container width; `0` (not laid out) is ignored. */
  update(width: number): void {
    if (!(width > 0)) return;
    const settings = resolveSchedulerAdaptiveView(this.options.adaptiveView());
    if (!settings) {
      this.narrow = false;
      this.restoreTo = null;
      return;
    }
    const narrow = width < settings.breakpoint;
    if (narrow === this.narrow) return;
    this.narrow = narrow;
    const current = this.options.currentView();
    if (narrow) {
      if (current === settings.view) return;
      this.restoreTo = current;
      this.options.setCurrentView(settings.view);
      return;
    }
    const restore = this.restoreTo;
    this.restoreTo = null;
    // the user switched views while narrow: their choice wins
    if (restore !== null && current === settings.view) {
      this.options.setCurrentView(restore);
    }
  }

  /** Whether the last measured width was below the breakpoint. */
  isNarrow(): boolean {
    return this.narrow;
  }
}
