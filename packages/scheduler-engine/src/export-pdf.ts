/**
 * `@oge-ui/scheduler-engine/export-pdf` — the scheduler's list PDF, shared
 * by both render layers: the period's appointments grouped by day (time,
 * subject, location, resources), paginated with the column header repeated
 * per page. `jspdf` is an **optional peer** pulled in only by this entry.
 * Text outside WinAnsi needs a Unicode font — per export (`font`) or once
 * via `setOgePdfDefaultFont()` from `@oge-ui/behavior`.
 */
import { ogeDateTimeFormat } from '@oge-ui/core';
import { jsPDF } from 'jspdf';
import {
  registerOgePdfFont,
  resolveOgePdfFont,
  warnOgePdfUnicode,
  type OgePdfFont,
} from '@oge-ui/behavior';
import type {
  OgeSchedulerExportData,
  OgeSchedulerExportRow,
} from './lib/export-data';

/** Options of the scheduler PDF export. */
export interface OgeSchedulerPdfExportOptions {
  /** Download file name. Default: `schedule.pdf`. */
  filename?: string;
  /** Heading above the list. Default: the visible period's title. */
  title?: string;
  /** Page orientation. Default: `portrait`. */
  orientation?: 'portrait' | 'landscape';
  /** jsPDF page format. Default: `a4`. */
  pageFormat?: string | number[];
  /** Adds the resources column when appointments have resources. Default: true. */
  includeResources?: boolean;
  /**
   * Unicode TrueType font to embed — needed for text outside WinAnsi
   * (Turkish `ğ ş ı İ`, Greek, Cyrillic, …). Default: the font set by
   * `setOgePdfDefaultFont()`, else Helvetica; `null` forces Helvetica.
   */
  font?: OgePdfFont | null;
}

const MARGIN = 14;
const ROW_H = 6.5;
const DAY_H = 8;
const HEADER_H = 7;

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** The time column text of a row (`allDay` text for all-day rows). */
function timeText<T>(
  row: OgeSchedulerExportRow<T>,
  data: OgeSchedulerExportData<T>,
): string {
  if (row.allDay) return data.messages.allDay;
  const format = ogeDateTimeFormat(data.locale, {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${format.format(row.startDate)} – ${format.format(row.endDate)}`;
}

/**
 * Builds a jsPDF document listing the export rows by day. Pure and
 * testable; the render packages' `exportSchedulerToPdf` is the one-call
 * scheduler → download flow.
 */
export function buildSchedulerPdfDocument<T>(
  data: OgeSchedulerExportData<T>,
  options: OgeSchedulerPdfExportOptions = {},
): jsPDF {
  const doc = new jsPDF({
    orientation: options.orientation ?? 'portrait',
    format: options.pageFormat ?? 'a4',
  });
  const font = resolveOgePdfFont(options);
  const family = font ? registerOgePdfFont(doc, font) : 'helvetica';
  const title = options.title ?? data.title;
  if (family === 'helvetica') {
    warnOgePdfUnicode([
      title,
      ...data.rows.flatMap((row) => [
        row.text,
        row.location ?? '',
        ...row.resources.map((entry) => entry.text),
      ]),
    ]);
  }
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const withResources =
    options.includeResources !== false &&
    data.rows.some((row) => row.resources.length > 0);
  const usable = pageW - MARGIN * 2;
  const columns = [
    { header: data.messages.start, width: usable * 0.24 },
    {
      header: data.messages.subject,
      width: usable * (withResources ? 0.36 : 0.5),
    },
    {
      header: data.messages.location,
      width: usable * (withResources ? 0.2 : 0.26),
    },
    ...(withResources
      ? [{ header: data.resources[0]?.label ?? '', width: usable * 0.2 }]
      : []),
  ];
  const dayFormat = ogeDateTimeFormat(data.locale, { dateStyle: 'full' });

  let y = MARGIN;
  doc.setFont(family, 'bold');
  doc.setFontSize(14);
  doc.text(title, MARGIN, y + 5);
  y += 11;

  const drawHeader = (): void => {
    doc.setFont(family, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(90);
    let x = MARGIN;
    for (const column of columns) {
      doc.text(column.header, x, y + 4.5);
      x += column.width;
    }
    doc.setDrawColor(200);
    doc.line(MARGIN, y + HEADER_H, pageW - MARGIN, y + HEADER_H);
    doc.setTextColor(0);
    y += HEADER_H + 1.5;
  };
  const ensure = (height: number): void => {
    if (y + height <= pageH - MARGIN) return;
    doc.addPage();
    y = MARGIN;
    drawHeader();
  };

  drawHeader();
  if (data.rows.length === 0) {
    doc.setFont(family, 'normal');
    doc.setFontSize(10);
    doc.text(data.messages.noData, MARGIN, y + 5);
    return doc;
  }
  let lastDay = '';
  for (const row of data.rows) {
    const key = dayKey(row.startDate);
    if (key !== lastDay) {
      ensure(DAY_H + ROW_H);
      lastDay = key;
      doc.setFont(family, 'bold');
      doc.setFontSize(10);
      doc.text(dayFormat.format(row.startDate), MARGIN, y + 5.5);
      y += DAY_H;
    }
    ensure(ROW_H);
    doc.setFont(family, 'normal');
    doc.setFontSize(9);
    const cells = [
      timeText(row, data),
      row.text,
      row.location ?? '',
      ...(withResources
        ? [row.resources.map((entry) => entry.text).join(', ')]
        : []),
    ];
    let x = MARGIN;
    cells.forEach((cell, index) => {
      const width = columns[index].width - 2;
      doc.text(doc.splitTextToSize(cell, width)[0] ?? '', x, y + 4.5);
      x += columns[index].width;
    });
    y += ROW_H;
  }
  return doc;
}
