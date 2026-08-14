/**
 * Reading files out of a drag or a paste.
 *
 * The house DnD precedent is `tree-view-dnd.ts`: pure functions plus the one
 * or two constants the interaction needs, unit-testable without a component.
 *
 * Framework-free by contract — see the `src/lib/engine` lint block.
 */
import type { OgeUploadDropEffect } from '../upload-types';

/**
 * `dragleave` fires on every child the pointer crosses, so a boolean
 * "is hovering" flag flickers as the pointer moves over the zone's own label.
 * The fix is a depth counter: `enter` increments, `leave` decrements, and the
 * highlight is on while the count is positive.
 */
export class DragDepthCounter {
  private depth = 0;

  /** Returns `true` when this enter is the one that starts the hover. */
  enter(): boolean {
    this.depth += 1;
    return this.depth === 1;
  }

  /** Returns `true` when this leave is the one that ends the hover. */
  leave(): boolean {
    this.depth = Math.max(0, this.depth - 1);
    return this.depth === 0;
  }

  /** Drop and cancel both end the gesture outright. */
  reset(): void {
    this.depth = 0;
  }

  get active(): boolean {
    return this.depth > 0;
  }
}

/**
 * `true` when the drag carries files rather than, say, selected text.
 *
 * During `dragover` the browser withholds the file list for privacy, so the
 * only thing readable is `types` — which is exactly what this checks.
 */
export function dataTransferHasFiles(
  transfer: DataTransfer | null | undefined,
): boolean {
  if (!transfer) {
    return false;
  }
  const types = transfer.types;
  // `types` is a DOMStringList in older engines and a frozen array in current
  // ones; `Array.from` reads both, and `lib` here has no `dom.iterable`.
  return Array.from(types as ArrayLike<string>).includes('Files');
}

/** Maps the public mode onto the `dataTransfer.dropEffect` value. */
export function dropEffectFor(
  mode: OgeUploadDropEffect,
): DataTransfer['dropEffect'] {
  switch (mode) {
    case 'copy':
      return 'copy';
    case 'move':
      return 'move';
    case 'link':
      return 'link';
    case 'none':
      return 'none';
    default:
      // 'default' hands the decision back to the browser.
      return 'copy';
  }
}

/** The non-standard directory half of the `DataTransferItem` API. */
interface FileSystemEntryLike {
  readonly isFile: boolean;
  readonly isDirectory: boolean;
  readonly name: string;
  file?(
    onSuccess: (file: File) => void,
    onError: (error: unknown) => void,
  ): void;
  createReader?(): {
    readEntries(
      onSuccess: (entries: readonly FileSystemEntryLike[]) => void,
      onError: (error: unknown) => void,
    ): void;
  };
}

interface DataTransferItemLike {
  readonly kind: string;
  webkitGetAsEntry?(): FileSystemEntryLike | null;
  getAsFile(): File | null;
}

function entryFile(entry: FileSystemEntryLike): Promise<File | null> {
  return new Promise((resolve) => {
    if (!entry.file) {
      resolve(null);
      return;
    }
    entry.file(
      (file) => resolve(file),
      () => resolve(null),
    );
  });
}

function readDirectory(
  entry: FileSystemEntryLike,
): Promise<readonly FileSystemEntryLike[]> {
  const reader = entry.createReader?.();
  if (!reader) {
    return Promise.resolve([]);
  }
  // `readEntries` yields at most 100 entries per call and signals the end with
  // an empty batch, so a directory of 250 files needs three round trips.
  const all: FileSystemEntryLike[] = [];
  const readBatch = (): Promise<readonly FileSystemEntryLike[]> =>
    new Promise((resolve) => {
      reader.readEntries(
        (entries) => {
          if (entries.length === 0) {
            resolve(all);
            return;
          }
          all.push(...entries);
          resolve(readBatch());
        },
        () => resolve(all),
      );
    });
  return readBatch();
}

async function walkEntry(entry: FileSystemEntryLike): Promise<readonly File[]> {
  if (entry.isFile) {
    const file = await entryFile(entry);
    return file ? [file] : [];
  }
  if (!entry.isDirectory) {
    return [];
  }
  const children = await readDirectory(entry);
  const nested = await Promise.all(children.map((child) => walkEntry(child)));
  return nested.flat();
}

/**
 * Pulls every file out of a drop, descending into folders when asked.
 *
 * Falls back to `transfer.files` whenever the entry API is unavailable, which
 * covers three real cases: browsers without `webkitGetAsEntry`, jsdom (no
 * `DataTransfer` at all), and a Playwright-synthesized `DataTransfer`, where
 * Chromium returns `null` from `webkitGetAsEntry()`. Without the fallback,
 * every drop in an e2e test would silently produce nothing.
 */
export async function readDataTransferFiles(
  transfer: DataTransfer | null | undefined,
  options: { readonly directory: boolean } = { directory: false },
): Promise<readonly File[]> {
  if (!transfer) {
    return [];
  }

  const plain = Array.from(transfer.files ?? []);
  if (!options.directory) {
    return plain;
  }

  const items = Array.from(
    (transfer.items ?? []) as ArrayLike<DataTransferItemLike>,
  );
  const entries = items
    .filter((item) => item.kind === 'file')
    .map((item) => item.webkitGetAsEntry?.() ?? null)
    .filter((entry): entry is FileSystemEntryLike => entry !== null);

  if (entries.length === 0) {
    return plain;
  }

  const walked = await Promise.all(entries.map((entry) => walkEntry(entry)));
  return walked.flat();
}

/** Pulls files out of a paste, for the `pastable` mode. */
export function readClipboardFiles(
  clipboard: DataTransfer | null | undefined,
): readonly File[] {
  if (!clipboard) {
    return [];
  }
  const direct = Array.from(clipboard.files ?? []);
  if (direct.length > 0) {
    return direct;
  }
  // Safari puts a pasted screenshot on `items` without populating `files`.
  const items = Array.from(
    (clipboard.items ?? []) as ArrayLike<DataTransferItemLike>,
  );
  return items
    .filter((item) => item.kind === 'file')
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null);
}
