import { isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  Directive,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  chartAnimationVars,
  chartPrefersReducedMotion,
  detectChartRtl,
  measureChartElement,
  mergeOgeChartsMessages,
  observeChartRtl,
  observeChartSize,
  printOgeChart,
  resolveChartAnimation,
  type OgeChartAnimationOptions,
  type OgeChartPrintOptions,
} from '@oge-ui/charts-engine';
import { OGE_CHARTS_CONFIG, type OgeChartsMessages } from '../config';

/**
 * What the gauges, the bullet chart and the non-cartesian charts share: the
 * config + messages, the measured plot size, the page direction (an
 * explicit `rtlEnabled` wins) and the export / print surface. Abstract —
 * each chart adds its view model and template. Not public API.
 */
let nextVisualId = 0;

@Directive()
export abstract class OgeChartVisualBase {
  /** Per-instance id prefix (the keyboard hint's `aria-describedby`). */
  protected readonly uid = `oge-chart-visual-${nextVisualId++}`;
  protected readonly config = inject(OGE_CHARTS_CONFIG);
  protected readonly destroyRef = inject(DestroyRef);
  protected readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly title = input('');
  readonly locale = input<string | undefined>(undefined);
  readonly messages = input<Partial<OgeChartsMessages>>({});
  /**
   * The first-render draw-in and the hover transitions (`{ enabled,
   * duration, easing }`); `prefers-reduced-motion` always wins.
   */
  readonly animation = input<boolean | OgeChartAnimationOptions>(true);

  protected readonly plotWrapEl =
    viewChild.required<ElementRef<HTMLElement>>('plotWrap');
  private readonly svgEl =
    viewChild.required<ElementRef<SVGSVGElement>>('svgEl');

  protected readonly msg = computed<OgeChartsMessages>(() =>
    mergeOgeChartsMessages(this.config.messages, this.messages()),
  );
  protected readonly effectiveLocale = computed(
    () => this.locale() ?? this.config.locale,
  );
  /** Rows of the screen-reader table. */
  protected readonly tableLimit = computed(
    () => this.config.a11yTableLimit ?? 50,
  );

  protected readonly hostSize = signal(this.initialSize());
  protected readonly width = computed(() => this.hostSize().width);
  protected readonly height = computed(() => this.hostSize().height);

  /** The page direction, read after the first render (SSR-safe). */
  protected readonly autoRtl = signal(false);

  private readonly reducedMotion = chartPrefersReducedMotion();
  protected readonly resolvedAnimation = computed(() =>
    resolveChartAnimation(this.animation(), this.reducedMotion),
  );
  protected readonly animationVars = computed(() =>
    chartAnimationVars(this.resolvedAnimation()),
  );
  /** True until the first-render draw-in has played. */
  private readonly entering = signal(true);
  protected readonly drawingIn = computed(
    () => this.entering() && this.resolvedAnimation().drawIn,
  );

  constructor() {
    // the draw-in runs once: from the first render with data, for `duration`
    effect((onCleanup) => {
      if (!this.isBrowser || !untracked(this.entering)) return;
      if (!this.hasData()) return;
      const timer = setTimeout(
        () => this.entering.set(false),
        untracked(this.resolvedAnimation).duration + 50,
      );
      onCleanup(() => clearTimeout(timer));
    });
    afterNextRender(() => {
      this.autoRtl.set(detectChartRtl(this.hostEl.nativeElement));
      const stopRtl = observeChartRtl(this.hostEl.nativeElement, (rtl) =>
        this.autoRtl.set(rtl),
      );
      this.destroyRef.onDestroy(stopRtl);
      const stop = observeChartSize(this.plotWrapEl().nativeElement, (size) =>
        this.hostSize.set(size),
      );
      this.destroyRef.onDestroy(stop);
      this.afterFirstRender();
    });
  }

  /** The first-frame size (before the container is measured). */
  protected abstract initialSize(): { width: number; height: number };

  /** Whether there is anything to draw (starts the draw-in). */
  protected abstract hasData(): boolean;

  /** Runs once in the browser after the first render. */
  protected afterFirstRender(): void {
    // hook
  }

  /** Re-measures the container and re-reads the page direction. */
  refresh(): void {
    const size = measureChartElement(this.plotWrapEl().nativeElement);
    if (size !== null) this.hostSize.set(size);
    this.autoRtl.set(detectChartRtl(this.hostEl.nativeElement));
  }

  /** The live SVG root — the exporters rasterize/serialize it. */
  getSvgElement(): SVGSVGElement {
    return this.svgEl().nativeElement;
  }

  /** Opens the browser's print dialog for the chart alone. */
  print(options: OgeChartPrintOptions = {}): Promise<void> {
    return printOgeChart(this, { title: untracked(this.title), ...options });
  }
}

/**
 * The visuals that compute geometry in script and so take `rtlEnabled`
 * (house rule: `boolean | undefined`, unset follows the page).
 */
@Directive()
export abstract class OgeChartVisualRtlBase extends OgeChartVisualBase {
  /** Mirrored layout; unset follows the page `dir`. */
  readonly rtlEnabled = input<boolean | undefined>(undefined);
  protected readonly rtl = computed(() => this.rtlEnabled() ?? this.autoRtl());
  /** An explicit direction is also set as `dir` on the host. */
  protected readonly hostDir = computed(() => {
    const explicit = this.rtlEnabled();
    return explicit === undefined ? null : explicit ? 'rtl' : 'ltr';
  });
}
