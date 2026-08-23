import {
  DragDepthCounter,
  dataTransferHasFiles,
  dropEffectFor,
  readClipboardFiles,
  readDataTransferFiles,
} from './upload-dnd';

/**
 * jsdom ships no `DataTransfer`, so every drag test builds this stub — the
 * same approach `tree-list-features.spec.ts` takes for its drag specs.
 */
function transfer(options: {
  files?: readonly File[];
  items?: readonly unknown[];
  types?: readonly string[];
}): DataTransfer {
  return {
    files: (options.files ?? []) as unknown as FileList,
    items: (options.items ?? []) as unknown as DataTransferItemList,
    types: options.types ?? (options.files?.length ? ['Files'] : []),
    dropEffect: 'none',
  } as unknown as DataTransfer;
}

const file = (name: string) => new File(['x'], name, { type: 'text/plain' });

describe('DragDepthCounter', () => {
  it('reports the hover only on the outermost enter and leave', () => {
    const depth = new DragDepthCounter();
    expect(depth.enter()).toBe(true); // the zone itself
    expect(depth.enter()).toBe(false); // a child label
    expect(depth.leave()).toBe(false); // leaving the child
    expect(depth.leave()).toBe(true); // leaving the zone
  });

  it('stays inactive when a stray leave arrives first', () => {
    const depth = new DragDepthCounter();
    expect(depth.leave()).toBe(true);
    expect(depth.active).toBe(false);
  });

  it('drops the whole gesture on reset', () => {
    const depth = new DragDepthCounter();
    depth.enter();
    depth.enter();
    depth.reset();
    expect(depth.active).toBe(false);
  });
});

describe('dataTransferHasFiles', () => {
  it('is false without a transfer', () => {
    expect(dataTransferHasFiles(null)).toBe(false);
    expect(dataTransferHasFiles(undefined)).toBe(false);
  });

  it('reads `types`, which is all the browser exposes during dragover', () => {
    expect(dataTransferHasFiles(transfer({ types: ['Files'] }))).toBe(true);
    expect(dataTransferHasFiles(transfer({ types: ['text/plain'] }))).toBe(
      false,
    );
  });
});

describe('dropEffectFor', () => {
  it('passes the explicit modes through', () => {
    expect(dropEffectFor('copy')).toBe('copy');
    expect(dropEffectFor('move')).toBe('move');
    expect(dropEffectFor('link')).toBe('link');
    expect(dropEffectFor('none')).toBe('none');
  });

  it('falls back to copy for the browser-default mode', () => {
    expect(dropEffectFor('default')).toBe('copy');
  });
});

describe('readDataTransferFiles', () => {
  it('is empty without a transfer', async () => {
    await expect(readDataTransferFiles(null)).resolves.toEqual([]);
  });

  it('reads the plain file list when directories are off', async () => {
    const files = [file('a.txt'), file('b.txt')];
    await expect(readDataTransferFiles(transfer({ files }))).resolves.toEqual(
      files,
    );
  });

  it('falls back to the file list when the entry API is missing', async () => {
    // Chromium returns null from webkitGetAsEntry() for a DataTransfer built
    // in a Playwright script, and jsdom has no entry API at all. Without this
    // fallback every synthetic drop would silently yield nothing.
    const files = [file('a.txt')];
    const items = [{ kind: 'file', webkitGetAsEntry: () => null }];
    await expect(
      readDataTransferFiles(transfer({ files, items }), { directory: true }),
    ).resolves.toEqual(files);
  });

  it('walks a dropped folder', async () => {
    const nested = file('nested.txt');
    const entry = {
      isFile: false,
      isDirectory: true,
      name: 'folder',
      createReader: () => {
        let done = false;
        return {
          readEntries: (ok: (entries: readonly unknown[]) => void) => {
            if (done) {
              ok([]);
              return;
            }
            done = true;
            ok([
              {
                isFile: true,
                isDirectory: false,
                name: 'nested.txt',
                file: (resolve: (f: File) => void) => resolve(nested),
              },
            ]);
          },
        };
      },
    };
    const items = [{ kind: 'file', webkitGetAsEntry: () => entry }];

    await expect(
      readDataTransferFiles(transfer({ items }), { directory: true }),
    ).resolves.toEqual([nested]);
  });

  it('ignores non-file items', async () => {
    const items = [{ kind: 'string', webkitGetAsEntry: () => null }];
    await expect(
      readDataTransferFiles(transfer({ items }), { directory: true }),
    ).resolves.toEqual([]);
  });
});

describe('readClipboardFiles', () => {
  it('is empty without a clipboard', () => {
    expect(readClipboardFiles(null)).toEqual([]);
  });

  it('prefers the file list', () => {
    const files = [file('pasted.png')];
    expect(readClipboardFiles(transfer({ files }))).toEqual(files);
  });

  it('falls back to items, which is where Safari puts a pasted screenshot', () => {
    const pasted = file('screenshot.png');
    const items = [{ kind: 'file', getAsFile: () => pasted }];
    expect(readClipboardFiles(transfer({ items }))).toEqual([pasted]);
  });

  it('skips items that yield no file', () => {
    const items = [{ kind: 'file', getAsFile: () => null }];
    expect(readClipboardFiles(transfer({ items }))).toEqual([]);
  });
});
