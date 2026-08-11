import type { OgeGantt, OgeGanttExportData, OgeGanttTask } from '@oge-ui/gantt';

/**
 * Dependency-free PNG export: the Gantt drawn onto a canvas — scale
 * header, bars with progress fills, summary brackets, milestone diamonds
 * and optional critical-path outlining.
 */
export interface OgeGanttImageExportOptions {
  /** Download file name. Default: `gantt.png`. */
  filename?: string;
  /** Canvas pixel width. Height derives from the row count. Default: 1600. */
  width?: number;
  /** Device-pixel scale factor for crisp output. Default: 2. */
  pixelRatio?: number;
  /** Outline the critical path in red. Default: true. */
  markCriticalPath?: boolean;
  /** BCP 47 locale of the scale labels. Default: browser locale. */
  locale?: string;
  /** Background color. Default: white. */
  background?: string;
}

const MARGIN = 24;
const HEADER_H = 28;
const ROW_H = 26;
const TITLE_COL_W = 220;

/** Logical (CSS-pixel) canvas size for a plan — pure, testable in jsdom. */
export function ganttImageSize(
  taskCount: number,
  width = 1600,
): { width: number; height: number } {
  return { width, height: MARGIN * 2 + HEADER_H + taskCount * ROW_H };
}

/**
 * Draws the export data onto a fresh canvas and returns it. In
 * environments without a 2D context (jsdom) the sized canvas is returned
 * undrawn.
 */
export function buildGanttCanvas<T>(
  data: OgeGanttExportData<T>,
  options: OgeGanttImageExportOptions = {},
): HTMLCanvasElement {
  const ratio = options.pixelRatio ?? 2;
  const size = ganttImageSize(data.tasks.length, options.width);
  const canvas = document.createElement('canvas');
  canvas.width = size.width * ratio;
  canvas.height = size.height * ratio;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return canvas;
  ctx.scale(ratio, ratio);

  ctx.fillStyle = options.background ?? '#ffffff';
  ctx.fillRect(0, 0, size.width, size.height);

  const chartX = MARGIN + TITLE_COL_W;
  const chartW = size.width - chartX - MARGIN;
  const rangeStart = data.rangeStart.getTime();
  const rangeMs = Math.max(1, data.rangeEnd.getTime() - rangeStart);
  const xOf = (date: Date): number =>
    chartX + ((date.getTime() - rangeStart) / rangeMs) * chartW;
  const dateFormat = new Intl.DateTimeFormat(options.locale, {
    day: 'numeric',
    month: 'short',
  });

  // scale header
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillStyle = '#6b7280';
  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 1;
  const ticks = 10;
  for (let i = 0; i <= ticks; i++) {
    const x = chartX + (chartW / ticks) * i;
    const date = new Date(rangeStart + rangeMs * (i / ticks));
    if (i < ticks) ctx.fillText(dateFormat.format(date), x + 3, MARGIN + 14);
    ctx.beginPath();
    ctx.moveTo(x, MARGIN + HEADER_H - 8);
    ctx.lineTo(x, MARGIN + HEADER_H);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(MARGIN, MARGIN + HEADER_H);
  ctx.lineTo(size.width - MARGIN, MARGIN + HEADER_H);
  ctx.stroke();

  const drawBar = (task: OgeGanttTask<T>, y: number): void => {
    const critical =
      options.markCriticalPath !== false && data.critical.has(task.key);
    const x = xOf(task.start);
    const w = Math.max(2, xOf(task.end) - x);
    const midY = y + ROW_H / 2;
    if (task.isMilestone) {
      ctx.fillStyle = critical ? '#dc2626' : '#374151';
      ctx.beginPath();
      ctx.moveTo(x, midY - 6);
      ctx.lineTo(x + 6, midY);
      ctx.lineTo(x, midY + 6);
      ctx.lineTo(x - 6, midY);
      ctx.closePath();
      ctx.fill();
    } else if (task.isSummary) {
      ctx.fillStyle = '#334155';
      ctx.fillRect(x, midY - 5, w, 6);
      ctx.fillRect(x, midY - 5, 3, 11);
      ctx.fillRect(x + w - 3, midY - 5, 3, 11);
    } else {
      ctx.fillStyle = '#c7d2fe';
      ctx.fillRect(x, midY - 7, w, 14);
      if (task.progress > 0) {
        ctx.fillStyle = '#4f46e5';
        ctx.fillRect(x, midY - 7, Math.max(2, (w * task.progress) / 100), 14);
      }
      if (critical) {
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, midY - 7, w, 14);
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#d1d5db';
      }
    }
  };

  let y = MARGIN + HEADER_H;
  for (const task of data.tasks) {
    ctx.fillStyle = '#111827';
    ctx.font = task.isSummary
      ? 'bold 12px system-ui, sans-serif'
      : '12px system-ui, sans-serif';
    const indent = Math.min(60, task.level * 12);
    ctx.fillText(
      task.title,
      MARGIN + indent,
      y + ROW_H / 2 + 4,
      TITLE_COL_W - indent - 8,
    );
    drawBar(task, y);
    ctx.strokeStyle = '#e5e7eb';
    ctx.beginPath();
    ctx.moveTo(MARGIN, y + ROW_H);
    ctx.lineTo(size.width - MARGIN, y + ROW_H);
    ctx.stroke();
    y += ROW_H;
  }
  return canvas;
}

/**
 * Exports the Gantt (tasks in tree order, collapse ignored) as a `.png`
 * download. No external dependencies — plain canvas drawing.
 *
 * ```ts
 * const { exportGanttToPng } = await import('@oge-ui/gantt/export-image');
 * await exportGanttToPng(this.gantt(), { filename: 'plan.png' });
 * ```
 */
export async function exportGanttToPng<
  T extends object,
  D extends object = Record<string, unknown>,
>(
  gantt: OgeGantt<T, D>,
  options: OgeGanttImageExportOptions = {},
): Promise<void> {
  if (typeof document === 'undefined') return;
  const canvas = buildGanttCanvas(gantt.getExportData(), options);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  );
  if (blob === null) return;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = options.filename ?? 'gantt.png';
  anchor.click();
  URL.revokeObjectURL(url);
}
