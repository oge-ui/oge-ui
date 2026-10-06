'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';
import {
  chartAnimationVars,
  chartPrefersReducedMotion,
  detectChartRtl,
  mergeOgeChartsMessages,
  observeChartRtl,
  printOgeChart,
  type OgeChartAnimationOptions,
  type OgeChartPrintOptions,
  type OgeChartResolvedAnimation,
  type OgeChartsMessages,
  type OgeChartSize,
} from '@oge-ui/charts-engine';
import { resolveChartAnimation } from '@oge-ui/charts-engine';
import { useOgeChartsConfig } from './charts-config';
import { useChartSize, useIsomorphicLayoutEffect, useStable } from './hooks';

/** What every gauge / non-cartesian visual shares (the Angular `OgeChartVisualBase`). */
export interface ChartVisual {
  readonly rootRef: RefObject<HTMLDivElement | null>;
  readonly plotWrapRef: RefObject<HTMLDivElement | null>;
  readonly svgRef: RefObject<SVGSVGElement | null>;
  readonly msg: OgeChartsMessages;
  readonly locale: string | undefined;
  readonly tableLimit: number;
  readonly size: OgeChartSize;
  readonly rtl: boolean;
  readonly dir: 'rtl' | 'ltr' | undefined;
  readonly animation: OgeChartResolvedAnimation;
  readonly drawingIn: boolean;
  readonly rootStyle: CSSProperties;
  refresh(): void;
  getSvgElement(): SVGSVGElement;
  print(options?: OgeChartPrintOptions): Promise<void>;
  focus(): void;
}

export function useChartVisual(options: {
  readonly name: string;
  readonly initialSize: OgeChartSize;
  readonly hasData: boolean;
  readonly title?: string;
  readonly locale?: string;
  readonly messages?: Partial<OgeChartsMessages>;
  readonly animation?: boolean | OgeChartAnimationOptions;
  readonly rtlEnabled?: boolean;
  readonly style?: CSSProperties;
}): ChartVisual {
  const config = useOgeChartsConfig();
  const messages = useStable(options.messages);
  const msg = useMemo(
    () => mergeOgeChartsMessages(config.messages, messages),
    [config.messages, messages],
  );
  const locale = options.locale ?? config.locale;
  const rootRef = useRef<HTMLDivElement>(null);
  const plotWrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, measure] = useChartSize(plotWrapRef, options.initialSize);

  // the page direction, read after mount (SSR-safe)
  const [autoRtl, setAutoRtl] = useState(false);
  useIsomorphicLayoutEffect(() => {
    setAutoRtl(detectChartRtl(rootRef.current));
    return observeChartRtl(rootRef.current, setAutoRtl);
  }, []);
  const rtl = options.rtlEnabled ?? autoRtl;
  const dir =
    options.rtlEnabled === undefined
      ? undefined
      : options.rtlEnabled
        ? 'rtl'
        : 'ltr';

  const animationOption = useStable(options.animation ?? true);
  const [reducedMotion] = useState(chartPrefersReducedMotion);
  const animation = useMemo(
    () => resolveChartAnimation(animationOption, reducedMotion),
    [animationOption, reducedMotion],
  );
  const [entering, setEntering] = useState(true);
  const hasData = options.hasData;
  useEffect(() => {
    if (!entering || !hasData) return undefined;
    const timer = setTimeout(() => setEntering(false), animation.duration + 50);
    return () => clearTimeout(timer);
  }, [entering, hasData, animation.duration]);

  const rootStyle = {
    ...chartAnimationVars(animation),
    ...options.style,
  } as CSSProperties;
  const title = options.title ?? '';
  const name = options.name;

  return {
    rootRef,
    plotWrapRef,
    svgRef,
    msg,
    locale,
    tableLimit: config.a11yTableLimit ?? 50,
    size,
    rtl,
    dir,
    animation,
    drawingIn: entering && animation.drawIn,
    rootStyle,
    refresh() {
      measure();
      setAutoRtl(detectChartRtl(rootRef.current));
    },
    getSvgElement() {
      const svg = svgRef.current;
      if (svg === null) throw new Error(`${name} is not mounted`);
      return svg;
    },
    print(printOptions = {}) {
      return printOgeChart(
        {
          getSvgElement: () => {
            const svg = svgRef.current;
            if (svg === null) throw new Error(`${name} is not mounted`);
            return svg;
          },
        },
        { title, ...printOptions },
      );
    },
    focus() {
      plotWrapRef.current?.focus();
    },
  };
}

/**
 * The gauges' first-render sweep: the indicator paints once at the scale
 * minimum, then transitions to the value (a frame after mount).
 */
export function useGaugeSweep(
  value: number | null,
  min: number,
  drawIn: boolean,
): number | null {
  const [swept, setSwept] = useState(false);
  useEffect(() => {
    // StrictMode: cleanup cancels, the re-run schedules again
    const frame = requestAnimationFrame(() => setSwept(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return swept || !drawIn ? value : min;
}
