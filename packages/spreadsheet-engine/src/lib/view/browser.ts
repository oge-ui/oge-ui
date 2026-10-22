/**
 * The viewer's browser work both render layers share — fetching a workbook
 * from a URL, object URLs for pictures, writing the clipboard, opening a
 * link, printing, and reading the grid's pointer events. Every helper is
 * guarded: on a server, or where an API is missing, it does nothing and says
 * so. Nothing here reaches for `window` or `document` (the engine runs in
 * Workers and Node, ADR 0005): a helper that needs them takes them from the
 * render layer, which owns the DOM.
 */
import type { OgeClipboardContent, OgePrintTable } from './clipboard';
import type { OgeGridHeaderTarget, OgeGridPointerPoint } from './grid-view';

/** What the gestures read from a pointer event over the grid's scroller. */
export function ogeGridPoint(
  event: { readonly clientX: number; readonly clientY: number },
  scroller: Pick<Element, 'getBoundingClientRect' | 'scrollTop' | 'scrollLeft'>,
): OgeGridPointerPoint {
  return {
    clientX: event.clientX,
    clientY: event.clientY,
    rect: scroller.getBoundingClientRect(),
    scrollTop: scroller.scrollTop,
    scrollLeft: scroller.scrollLeft,
  };
}

/** The header a pointer event's target is in — select-all, a row or a column header, an outline button — read from the grid's markup. */
export function ogeGridHeaderAt(
  target: EventTarget | null,
): OgeGridHeaderTarget | null {
  const element = target as Element | null;
  if (!element || typeof element.closest !== 'function') return null;
  if (element.closest('.oge-spreadsheet-select-all'))
    return { kind: 'select-all' };
  const outline = element.closest(
    '.oge-spreadsheet-outline-button, .oge-spreadsheet-outline-level',
  );
  if (outline) {
    const axis =
      outline.getAttribute('data-axis') === 'columns' ? 'columns' : 'rows';
    const group = outline.getAttribute('data-group');
    if (group != null) return { kind: 'outline', axis, group: Number(group) };
    const level = outline.getAttribute('data-level');
    if (level != null)
      return { kind: 'outline-level', axis, level: Number(level) };
  }
  const header = element.closest(
    '.oge-spreadsheet-column-header, .oge-spreadsheet-row-header',
  );
  const col = header?.getAttribute('data-col');
  if (col != null) return { kind: 'column-header', col: Number(col) };
  const row = header?.getAttribute('data-row');
  return row != null ? { kind: 'row-header', row: Number(row) } : null;
}

/** Whether a list that scrolls sideways can scroll back and forward. */
export interface OgeScrollEdges {
  readonly back: boolean;
  readonly forward: boolean;
}

/** Where a sideways-scrolling list (the sheet tabs) can still go — `scrollLeft` is negative in a right-to-left one. */
export function ogeScrollEdges(
  list: Pick<Element, 'scrollLeft' | 'scrollWidth' | 'clientWidth'>,
): OgeScrollEdges {
  const offset = Math.abs(list.scrollLeft);
  const room = list.scrollWidth - list.clientWidth;
  return { back: offset > 1, forward: offset < room - 1 };
}

/** Fetches a workbook from a URL (same-origin credentials); `null` when it cannot be fetched. */
export async function ogeFetchWorkbook(
  url: string,
  signal?: AbortSignal,
): Promise<Blob | null> {
  if (typeof fetch !== 'function') return null;
  try {
    const response = await fetch(url, {
      credentials: 'same-origin',
      ...(signal ? { signal } : {}),
    });
    return response.ok ? await response.blob() : null;
  } catch {
    return null;
  }
}

/** Object URLs, one per key, made on first use and revoked together. */
export class OgeObjectUrls {
  private readonly urls = new Map<string, string>();

  /** The URL for `key`, from the blob `make` returns (`null`: none, or no object URLs here). */
  url(key: string, make: () => Blob | null): string | null {
    const known = this.urls.get(key);
    if (known) return known;
    if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function')
      return null;
    const blob = make();
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    this.urls.set(key, url);
    return url;
  }

  /** Revokes every URL made so far. */
  release(): void {
    if (
      typeof URL !== 'undefined' &&
      typeof URL.revokeObjectURL === 'function'
    ) {
      for (const url of this.urls.values()) URL.revokeObjectURL(url);
    }
    this.urls.clear();
  }
}

/** Writes copied cells to the clipboard: text and Excel-compatible HTML where the browser can, else text. */
export async function ogeWriteClipboard(
  content: OgeClipboardContent,
): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return false;
  try {
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([content.text], { type: 'text/plain' }),
          'text/html': new Blob([content.html], { type: 'text/html' }),
        }),
      ]);
    } else {
      await navigator.clipboard.writeText(content.text);
    }
    return true;
  } catch {
    return false;
  }
}

/** Opens an external link (already sanitised) in a new browsing context of `view`, without an opener. */
export function ogeOpenLink(
  view: Pick<Window, 'open'> | null | undefined,
  href: string,
): void {
  view?.open(href, '_blank', 'noopener,noreferrer');
}

/**
 * Prints a sheet's table (`ogePrintTable`) from `host` — the page's document —
 * in a hidden frame that goes away after printing, built from DOM nodes,
 * never markup. `false` when the frame has no document to print.
 */
export function ogePrintSheetTable(
  host: Document,
  table: OgePrintTable,
  title: string,
): boolean {
  const frame = host.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  Object.assign(frame.style, {
    position: 'fixed',
    width: '0',
    height: '0',
    border: '0',
    left: '-10000px',
  });
  host.body.appendChild(frame);
  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!doc || !win) {
    frame.remove();
    return false;
  }
  doc.title = title;
  const element = doc.createElement('table');
  Object.assign(element.style, {
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
  });
  const columns = doc.createElement('colgroup');
  for (const width of table.columns) {
    const column = doc.createElement('col');
    column.style.width = `${width}px`;
    columns.appendChild(column);
  }
  element.appendChild(columns);
  for (const row of table.rows) {
    const tr = doc.createElement('tr');
    tr.style.height = `${row.height}px`;
    for (const cell of row.cells) {
      const td = doc.createElement('td');
      if (cell.rowSpan > 1) td.rowSpan = cell.rowSpan;
      if (cell.colSpan > 1) td.colSpan = cell.colSpan;
      Object.assign(td.style, cell.style);
      td.textContent = cell.text;
      tr.appendChild(td);
    }
    element.appendChild(tr);
  }
  doc.body.appendChild(element);
  win.addEventListener('afterprint', () => frame.remove(), { once: true });
  try {
    win.focus();
  } catch {
    // a frame that cannot take focus still prints
  }
  win.print();
  return true;
}
