/**
 * Server-side exports (P-13): for views too large to build in the browser,
 * the grid sends its query and its columns to your endpoint and saves what
 * comes back — a URL the browser downloads itself, or a streamed `Response`
 * written straight to disk where the File System Access API exists.
 */
import type { LoadOptions } from '@oge-ui/core';
import type { RowKey } from '@oge-ui/core';
import type { OgeExportColumn } from './grid-options';

/** What the server should produce. */
export type OgeServerExportFormat = 'xlsx' | 'csv';

/** One column of a server export: what the grid shows, without accessors. */
export interface OgeServerExportColumn {
  readonly field: string;
  readonly caption: string;
  readonly dataType: string;
  /** On-screen width in px, for the column width in the file. */
  readonly width?: number;
  /** A date column's zone, for writing the wall clock the grid shows. */
  readonly timeZone?: string;
}

/** The serializable request a grid sends to an export endpoint. */
export interface OgeServerExportRequest {
  readonly format: OgeServerExportFormat;
  readonly fileName: string;
  /** The view's filter, search and sort — never a page: the whole view. */
  readonly loadOptions: Pick<LoadOptions, 'filter' | 'searchText' | 'sort'>;
  /** The visible field columns, in order. */
  readonly columns: readonly OgeServerExportColumn[];
  /** With `scope: 'selection'`: only these rows. */
  readonly selectedKeys?: readonly RowKey[];
}

/**
 * Sends the request and returns the file: a URL (the browser downloads it,
 * streamed by the server), a `Response` (streamed to disk when possible) or a
 * `Blob`.
 */
export type OgeServerExportHandler = (
  request: OgeServerExportRequest,
) => Promise<string | Response | Blob>;

const EXTENSIONS: Record<OgeServerExportFormat, string> = {
  xlsx: '.xlsx',
  csv: '.csv',
};

/** The file name with the format's extension. */
export function ogeExportFileName(
  name: string,
  format: OgeServerExportFormat,
): string {
  const extension = EXTENSIONS[format];
  const base = name.trim() || 'export';
  return base.toLowerCase().endsWith(extension) ? base : `${base}${extension}`;
}

/** Builds the request from the grid's view. */
export function ogeServerExportRequest<T>(input: {
  readonly format: OgeServerExportFormat;
  readonly fileName: string;
  readonly loadOptions: LoadOptions;
  readonly columns: readonly OgeExportColumn<T>[];
  readonly selectedKeys?: readonly RowKey[];
}): OgeServerExportRequest {
  const { filter, searchText, sort } = input.loadOptions;
  return {
    format: input.format,
    fileName: ogeExportFileName(input.fileName, input.format),
    loadOptions: {
      ...(filter ? { filter } : {}),
      ...(searchText ? { searchText } : {}),
      ...(sort?.length ? { sort } : {}),
    },
    columns: input.columns
      .filter((c): c is OgeExportColumn<T> & { field: string } => !!c.field)
      .map((c) => ({
        field: c.field,
        caption: c.caption,
        dataType: c.dataType,
        ...(c.width ? { width: c.width } : {}),
        ...(c.timeZone ? { timeZone: c.timeZone } : {}),
      })),
    ...(input.selectedKeys ? { selectedKeys: input.selectedKeys } : {}),
  };
}

interface SaveWindow {
  showSaveFilePicker?: (options: {
    suggestedName: string;
  }) => Promise<{ createWritable(): Promise<WritableStream<Uint8Array>> }>;
}

/**
 * Saves what an export handler returned. A URL is downloaded by the browser
 * (the server streams it); a streamed `Response` is piped to a file the
 * person picks where the File System Access API exists, and otherwise read
 * into a Blob first. Resolves `false` when the person cancelled the picker.
 */
export async function ogeSaveExport(
  result: string | Response | Blob,
  fileName: string,
  doc: Document,
): Promise<boolean> {
  const view = doc.defaultView as (Window & SaveWindow) | null;
  const download = (href: string) => {
    const anchor = doc.createElement('a');
    anchor.href = href;
    anchor.download = fileName;
    anchor.rel = 'noopener';
    doc.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };
  if (typeof result === 'string') {
    download(result);
    return true;
  }
  let blob: Blob;
  if (result instanceof Blob) blob = result;
  else {
    if (!result.ok)
      throw new Error(
        `The export failed: ${result.status} ${result.statusText}`,
      );
    if (result.body && view?.showSaveFilePicker) {
      let handle;
      try {
        handle = await view.showSaveFilePicker({ suggestedName: fileName });
      } catch (error) {
        if ((error as { name?: string }).name === 'AbortError') return false;
        throw error;
      }
      await result.body.pipeTo(await handle.createWritable());
      return true;
    }
    blob = await result.blob();
  }
  const url = URL.createObjectURL(blob);
  try {
    download(url);
  } finally {
    // revoked after the click has started the download
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  return true;
}
