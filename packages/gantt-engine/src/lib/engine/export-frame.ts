/**
 * The horizontal frame the drawn Gantt exports (PNG, PDF) lay out in.
 *
 * The builders compute in physical units of their own medium (CSS px on a
 * canvas, mm on a PDF page) between a `left` and a `right` page margin; this
 * frame decides which side the title column sits on and which way the
 * timeline runs. In LTR the title column is on the left and time grows to
 * the right; in RTL both mirror — the title column is on the right, time
 * grows to the left and titles are right-aligned — the same picture the
 * on-screen RTL chart shows. Text is never mirrored, only placed.
 */
export interface GanttExportFrame {
  readonly rtl: boolean;
  /** Physical left / right edges of the task-title column. */
  readonly titleLeft: number;
  readonly titleRight: number;
  /** Physical left / right edges of the timeline band. */
  readonly chartLeft: number;
  readonly chartRight: number;
  readonly chartWidth: number;
  /** Horizontal alignment of text anchored at a start edge. */
  readonly textAlign: 'left' | 'right';
  /** Physical x of a time fraction (0 = range start, 1 = range end). */
  x(fraction: number): number;
  /**
   * The physical box of a time span: `left` is its leftmost edge whatever
   * the direction, `width` is never below `minWidth`.
   */
  span(
    fromFraction: number,
    toFraction: number,
    minWidth?: number,
  ): { left: number; width: number };
  /**
   * The physical box of the part of a `{ left, width }` box that starts at
   * its *start* edge and covers `share` (0–1) of it — the progress fill.
   */
  fromStart(
    box: { left: number; width: number },
    share: number,
    minWidth?: number,
  ): { left: number; width: number };
  /** Anchor x for text that starts `inset` in from the title column start. */
  titleX(inset: number): number;
  /** Anchor x for a scale label next to the tick at `fraction`. */
  tickLabelX(fraction: number, gap: number): number;
}

/**
 * Builds the frame for a page whose content runs from `left` to `right`,
 * with a `titleWidth`-wide task-title column at the start edge.
 */
export function ganttExportFrame(
  left: number,
  right: number,
  titleWidth: number,
  rtl: boolean,
): GanttExportFrame {
  const titleLeft = rtl ? right - titleWidth : left;
  const titleRight = rtl ? right : left + titleWidth;
  const chartLeft = rtl ? left : left + titleWidth;
  const chartRight = rtl ? right - titleWidth : right;
  const chartWidth = Math.max(0, chartRight - chartLeft);
  const x = (fraction: number): number =>
    rtl
      ? chartRight - fraction * chartWidth
      : chartLeft + fraction * chartWidth;
  return {
    rtl,
    titleLeft,
    titleRight,
    chartLeft,
    chartRight,
    chartWidth,
    textAlign: rtl ? 'right' : 'left',
    x,
    span(fromFraction, toFraction, minWidth = 0) {
      const a = x(fromFraction);
      const b = x(toFraction);
      const width = Math.max(minWidth, Math.abs(b - a));
      // a minimum width grows away from the start edge, as the bar does
      return { left: rtl ? Math.max(a, b) - width : Math.min(a, b), width };
    },
    fromStart(box, share, minWidth = 0) {
      const width = Math.max(minWidth, box.width * share);
      return { left: rtl ? box.left + box.width - width : box.left, width };
    },
    titleX(inset) {
      return rtl ? titleRight - inset : titleLeft + inset;
    },
    tickLabelX(fraction, gap) {
      return rtl ? x(fraction) - gap : x(fraction) + gap;
    },
  };
}
