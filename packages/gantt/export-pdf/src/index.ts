import { jsPDF } from 'jspdf';
import type { OgeGantt, OgeGanttExportData, OgeGanttTask } from '@oge-ui/gantt';

export interface OgeGanttPdfExportOptions {
  /** Download file name. Default: `gantt.pdf`. */
  filename?: string;
  /** Heading printed above the chart. */
  title?: string;
  /** Page orientation. Default: `landscape`. */
  orientation?: 'portrait' | 'landscape';
  /** jsPDF page format. Default: `a4`. */
  pageFormat?: string | number[];
  /** Outline the critical path in red. Default: true. */
  markCriticalPath?: boolean;
  /** BCP 47 locale of the scale labels. Default: browser locale. */
  locale?: string;
}

const MARGIN = 12;
const HEADER_H = 10;
const ROW_H = 7;
const TITLE_COL_W = 60;

interface PdfLayout {
  readonly chartX: number;
  readonly chartW: number;
  readonly msPerMm: number;
  readonly rangeStart: number;
}

function barSpan(
  task: OgeGanttTask,
  layout: PdfLayout,
): { x: number; w: number } {
  const x =
    layout.chartX + (task.start.getTime() - layout.rangeStart) / layout.msPerMm;
  const w = Math.max(
    0.5,
    (task.end.getTime() - task.start.getTime()) / layout.msPerMm,
  );
  return { x, w };
}

/**
 * Builds a jsPDF document drawing the Gantt as vector graphics — a task
 * title column plus a timeline band with summary brackets, milestone
 * diamonds, progress fills and scale ticks; rows paginate and the scale
 * header repeats per page. Pure and testable; use {@link exportGanttToPdf}
 * for the one-call gantt → download flow.
 */
export function buildGanttPdfDocument<T>(
  data: OgeGanttExportData<T>,
  options: OgeGanttPdfExportOptions = {},
): jsPDF {
  const doc = new jsPDF({
    orientation: options.orientation ?? 'landscape',
    format: options.pageFormat ?? 'a4',
  });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const chartX = MARGIN + TITLE_COL_W;
  const chartW = pageW - chartX - MARGIN;
  const rangeStart = data.rangeStart.getTime();
  const rangeMs = Math.max(1, data.rangeEnd.getTime() - rangeStart);
  const layout: PdfLayout = {
    chartX,
    chartW,
    msPerMm: rangeMs / chartW,
    rangeStart,
  };
  const dateFormat = new Intl.DateTimeFormat(options.locale, {
    day: 'numeric',
    month: 'short',
  });

  let y = MARGIN;
  if (options.title !== undefined) {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(options.title, MARGIN, y + 4);
    y += 9;
  }

  const drawScaleHeader = (top: number): number => {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(110);
    doc.setDrawColor(210);
    const ticks = 8;
    for (let i = 0; i <= ticks; i++) {
      const x = chartX + (chartW / ticks) * i;
      const date = new Date(rangeStart + rangeMs * (i / ticks));
      if (i < ticks) doc.text(dateFormat.format(date), x + 0.8, top + 4);
      doc.line(x, top + HEADER_H - 4, x, top + HEADER_H);
    }
    doc.line(MARGIN, top + HEADER_H, pageW - MARGIN, top + HEADER_H);
    doc.setTextColor(0);
    return top + HEADER_H;
  };

  y = drawScaleHeader(y);
  for (const task of data.tasks) {
    if (y + ROW_H > pageH - MARGIN) {
      doc.addPage();
      y = drawScaleHeader(MARGIN);
    }
    const critical =
      options.markCriticalPath !== false && data.critical.has(task.key);
    // title cell
    doc.setFontSize(8);
    doc.setFont('helvetica', task.isSummary ? 'bold' : 'normal');
    const indent = Math.min(20, task.level * 3);
    doc.text(
      doc.splitTextToSize(task.title, TITLE_COL_W - indent - 2)[0] ?? '',
      MARGIN + indent,
      y + ROW_H / 2 + 1,
    );
    // timeline cell
    const { x, w } = barSpan(task, layout);
    const midY = y + ROW_H / 2;
    if (task.isMilestone) {
      if (critical) doc.setFillColor(220, 38, 38);
      else doc.setFillColor(55, 65, 81);
      const r = 1.8;
      doc.triangle(x - r, midY, x, midY - r, x + r, midY, 'F');
      doc.triangle(x - r, midY, x, midY + r, x + r, midY, 'F');
    } else if (task.isSummary) {
      doc.setFillColor(51, 65, 85);
      doc.rect(x, midY - 1.6, w, 1.9, 'F');
      doc.rect(x, midY - 1.6, 0.9, 3.2, 'F');
      doc.rect(x + w - 0.9, midY - 1.6, 0.9, 3.2, 'F');
    } else {
      doc.setFillColor(199, 210, 254);
      doc.roundedRect(x, midY - 2.2, w, 4.4, 1, 1, 'F');
      if (task.progress > 0) {
        doc.setFillColor(79, 70, 229);
        doc.roundedRect(
          x,
          midY - 2.2,
          Math.max(0.5, (w * task.progress) / 100),
          4.4,
          1,
          1,
          'F',
        );
      }
      if (critical) {
        doc.setDrawColor(220, 38, 38);
        doc.setLineWidth(0.4);
        doc.roundedRect(x, midY - 2.2, w, 4.4, 1, 1, 'S');
        doc.setLineWidth(0.2);
      }
    }
    // row separator
    doc.setDrawColor(235);
    doc.line(MARGIN, y + ROW_H, pageW - MARGIN, y + ROW_H);
    y += ROW_H;
  }
  return doc;
}

/**
 * Exports the Gantt (tasks in tree order, collapse ignored) as a drawn
 * `.pdf` download.
 *
 * ```ts
 * const { exportGanttToPdf } = await import('@oge-ui/gantt/export-pdf');
 * await exportGanttToPdf(this.gantt(), { filename: 'plan.pdf', title: 'Plan' });
 * ```
 */
export async function exportGanttToPdf<
  T extends object,
  D extends object = Record<string, unknown>,
>(
  gantt: OgeGantt<T, D>,
  options: OgeGanttPdfExportOptions = {},
): Promise<void> {
  const doc = buildGanttPdfDocument(gantt.getExportData(), options);
  if (typeof document === 'undefined') return;
  doc.save(options.filename ?? 'gantt.pdf');
}
