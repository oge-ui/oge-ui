import type { OgeReactivityAdapter } from '../reactivity';
import {
  OGE_DEFAULT_FILE_MANAGER_MESSAGES,
  OgeFileManagerCore,
  ogeMemoryFileProvider,
  type OgeFileItem,
  type OgeFileProvider,
} from './file-manager-core';

const plain: OgeReactivityAdapter = {
  cell<T>(initial: T) {
    let value = initial;
    const cell = (() => value) as (() => T) & { set(v: T): void };
    cell.set = (v) => (value = v);
    return cell;
  },
  derived: (compute) => compute,
};

const FILES: OgeFileItem[] = [
  { id: 'docs', name: 'Documents', parentId: null, isFolder: true },
  { id: 'pics', name: 'Pictures', parentId: null, isFolder: true },
  {
    id: 'cv',
    name: 'cv.pdf',
    parentId: 'docs',
    isFolder: false,
    size: 2048,
    modified: '2026-01-02T10:00:00Z',
  },
  { id: 'old', name: 'Archive', parentId: 'docs', isFolder: true },
  { id: 'deep', name: 'deep.txt', parentId: 'old', isFolder: false, size: 10 },
  {
    id: 'a',
    name: 'a10.txt',
    parentId: null,
    isFolder: false,
    size: 300,
    modified: '2026-03-01T00:00:00Z',
  },
  {
    id: 'b',
    name: 'a9.txt',
    parentId: null,
    isFolder: false,
    size: 100,
    modified: '2026-02-01T00:00:00Z',
  },
  { id: 'c', name: 'Ünal.md', parentId: null, isFolder: false, size: 200 },
];

function setup(provider: OgeFileProvider = ogeMemoryFileProvider(FILES)) {
  const events = {
    opened: [] as OgeFileItem[],
    folders: [] as (string | null)[],
    said: [] as string[],
    errors: [] as unknown[],
    picks: 0,
  };
  const core = new OgeFileManagerCore({
    reactivity: plain,
    provider,
    messages: OGE_DEFAULT_FILE_MANAGER_MESSAGES,
    onOpenFile: (item) => events.opened.push(item),
    onFolderChange: (id) => events.folders.push(id),
    announce: (text) => events.said.push(text),
    onError: (error) => events.errors.push(error),
    pickFiles: () => events.picks++,
    formatDate: (d) => d.toISOString().slice(0, 10),
  });
  return { core, events, provider };
}

const key = (k: string, extra: Record<string, unknown> = {}) => {
  const event = { key: k, preventDefault: vi.fn(), ...extra };
  return event;
};

describe('OgeFileManagerCore', () => {
  it('lists the root folders first, sorted naturally, and filters by search', async () => {
    const { core } = setup();
    await core.init();
    expect(core.items().map((i) => i.name)).toEqual([
      'Documents',
      'Pictures',
      'a9.txt',
      'a10.txt',
      'Ünal.md',
    ]);
    core.sortBy('size');
    expect(
      core
        .items()
        .map((i) => i.id)
        .slice(2),
    ).toEqual(['b', 'c', 'a']);
    core.sortBy('size');
    expect(
      core
        .items()
        .map((i) => i.id)
        .slice(2),
    ).toEqual(['a', 'c', 'b']);
    core.sortBy('modified');
    expect(core.items()[2].id).toBe('c');
    core.setSearch('unal');
    expect(core.items().map((i) => i.id)).toEqual(['c']);
    expect(core.statusText()).toBe('1 item');
    core.setSearch('');
    expect(core.sizeOf(core.item('a')!)).toBe('300 B');
    expect(core.sizeOf(core.item('docs')!)).toBe('');
    expect(core.modifiedOf(core.item('a')!)).toBe('2026-03-01');
    expect(core.modifiedOf(core.item('c')!)).toBe('');
    expect(core.kindOf(core.item('docs')!)).toBe('folder');
    expect(core.kindOf(core.item('c')!)).toBe('md');
  });

  it('navigates folders with history, up and the path', async () => {
    const { core, events } = setup();
    await core.init();
    await core.openItem(core.item('docs')!);
    expect(core.path().map((p) => p.name)).toEqual(['Files', 'Documents']);
    await core.open('old');
    expect(core.path().map((p) => p.id)).toEqual([null, 'docs', 'old']);
    expect(core.items().map((i) => i.name)).toEqual(['deep.txt']);
    expect(core.focusedId()).toBe('deep');
    await core.back();
    expect(core.folderId()).toBe('docs');
    expect(core.canGoForward()).toBe(true);
    await core.forward();
    expect(core.folderId()).toBe('old');
    await core.up();
    await core.up();
    expect(core.folderId()).toBeNull();
    expect(core.canGoUp()).toBe(false);
    await core.up(); // at the root: nothing
    await core.forward(); // nothing ahead after a new path
    expect(events.folders).toEqual([
      'docs',
      'old',
      'docs',
      'old',
      'docs',
      null,
    ]);
    await core.openItem(core.item('a')!);
    expect(events.opened.map((i) => i.id)).toEqual(['a']);
    while (core.canGoBack()) await core.back();
    await core.back(); // nothing behind
  });

  it('builds the folder tree lazily and drives it from the keyboard', async () => {
    const { core } = setup();
    await core.init();
    let rows = core.treeRows();
    expect(rows.map((r) => [r.name, r.depth, r.expandable])).toEqual([
      ['Files', 0, true],
      ['Documents', 1, true],
      ['Pictures', 1, true],
    ]);
    expect(rows[0].current).toBe(true);
    core.focusTree(null);
    core.treeKeydown(key('ArrowDown'));
    expect(core.treeFocusedId()).toBe('docs');
    core.treeKeydown(key('ArrowRight')); // loads and expands Documents
    await vi.waitFor(() => expect(core.treeRows().length).toBe(4));
    rows = core.treeRows();
    expect(rows[2]).toMatchObject({ name: 'Archive', depth: 2 });
    core.treeKeydown(key('ArrowRight')); // into the first child
    expect(core.treeFocusedId()).toBe('old');
    core.treeKeydown(key('ArrowLeft')); // to the parent
    expect(core.treeFocusedId()).toBe('docs');
    core.treeKeydown(key('ArrowLeft')); // collapse
    expect(core.treeRows().length).toBe(3);
    core.treeKeydown(key('End'));
    expect(core.treeFocusedId()).toBe('pics');
    core.treeKeydown(key('Enter'));
    await vi.waitFor(() => expect(core.folderId()).toBe('pics'));
    // an empty folder is no longer expandable once listed
    expect(core.treeRows().find((r) => r.id === 'pics')?.expandable).toBe(
      false,
    );
    core.treeKeydown(key('Home'));
    core.treeKeydown(key('ArrowUp'));
    expect(core.treeFocusedId()).toBeNull();
    const ignored = key('x');
    core.treeKeydown(ignored);
    expect(ignored.preventDefault).not.toHaveBeenCalled();
    await core.toggle('docs');
    await core.toggle('docs');
  });

  it('selects with click modifiers and the list keyboard', async () => {
    const { core } = setup();
    await core.init();
    const ids = core.items().map((i) => i.id); // docs, pics, b, a, c
    core.select('pics');
    core.select('a', { shift: true });
    expect([...core.selectedIds()]).toEqual(['pics', 'b', 'a']);
    core.select('docs', { ctrl: true });
    expect(core.selectedItems().map((i) => i.id)).toEqual([
      'docs',
      'pics',
      'b',
      'a',
    ]);
    core.select('docs', { ctrl: true });
    expect(core.selectedIds().has('docs')).toBe(false);
    core.select('c', { ctrl: true, shift: true });
    // Ctrl+Shift adds the whole range from the anchor (Documents) to the selection
    expect(core.statusText()).toBe('5 items, 5 selected');
    core.keydown(key('Escape'));
    expect(core.selectedIds().size).toBe(0);
    core.keydown(key('Home'));
    expect(core.focusedId()).toBe(ids[0]);
    core.keydown(key('ArrowDown', { shiftKey: true }));
    expect(core.selectedIds().size).toBe(2);
    core.keydown(key('ArrowDown', { ctrlKey: true }));
    expect(core.focusedId()).toBe(ids[2]);
    core.keydown(key(' ', { ctrlKey: true }));
    expect(core.selectedIds().has(ids[2])).toBe(true);
    core.keydown(key(' '));
    expect([...core.selectedIds()]).toEqual([ids[2]]);
    core.keydown(key('End'));
    core.keydown(key('ArrowUp'));
    expect(core.focusedId()).toBe(ids[3]);
    core.keydown(key('a', { metaKey: true }));
    expect(core.selectedIds().size).toBe(5);
    const right = key('ArrowRight');
    core.keydown(right); // list view: not ours
    expect(right.preventDefault).not.toHaveBeenCalled();
    const plainA = key('a');
    core.keydown(plainA);
    expect(plainA.preventDefault).not.toHaveBeenCalled();
    core.setView('grid');
    core.keydown(key('Home'));
    core.keydown(key('ArrowDown'), 3);
    expect(core.focusedId()).toBe(ids[3]);
    core.keydown(key('ArrowLeft'));
    core.keydown(key('ArrowRight'));
    expect(core.focusedId()).toBe(ids[3]);
    core.keydown(key('Enter'));
    core.keydown(key('Enter')); // opens a9.txt? focused is a10
    core.clearSelection();
    const esc = key('Escape');
    core.keydown(esc);
    expect(esc.preventDefault).not.toHaveBeenCalled();
    core.keydown(key('ArrowUp', { altKey: true }));
    core.keydown(key('ArrowLeft', { altKey: true }));
    core.keydown(key('Backspace'));
    core.keydown(key('Delete'));
  });

  it('renames inline with checks, creates folders with free names', async () => {
    const { core, provider } = setup();
    await core.init();
    core.keydown(key('Home'));
    core.keydown(key('F2'));
    expect(core.renaming()).toMatchObject({ id: 'docs', draft: 'Documents' });
    core.keydown(key('Delete')); // the editor owns the keys
    core.setRenameDraft('pictures');
    expect(await core.commitRename()).toBe(false);
    expect(core.renaming()?.error).toBe(
      'An item with this name already exists',
    );
    core.setRenameDraft('a/b');
    expect(await core.commitRename()).toBe(false);
    expect(core.renaming()?.error).toBe(
      'Names cannot be empty or contain / or \\',
    );
    core.setRenameDraft(' Docs ');
    expect(await core.commitRename()).toBe(true);
    expect(core.item('docs')?.name).toBe('Docs');
    core.beginRename('docs');
    expect(await core.commitRename()).toBe(true); // unchanged name: just closes
    core.beginRename('docs');
    core.cancelRename();
    expect(core.renaming()).toBeNull();
    expect(await core.commitRename()).toBe(false);
    await core.newFolder();
    await core.newFolder();
    expect(
      core
        .items()
        .filter((i) => i.isFolder)
        .map((i) => i.name),
    ).toEqual(['Docs', 'New folder', 'New folder (2)', 'Pictures']);
    expect(core.renaming()?.draft).toBe('New folder (2)');
    expect(
      (provider as ReturnType<typeof ogeMemoryFileProvider>).items(),
    ).toHaveLength(10);
  });

  it('deletes after the cancelable event, moves with checks and uploads', async () => {
    let cancel = true;
    const provider = ogeMemoryFileProvider(FILES);
    const said: string[] = [];
    const core = new OgeFileManagerCore({
      reactivity: plain,
      provider,
      messages: OGE_DEFAULT_FILE_MANAGER_MESSAGES,
      announce: (t) => said.push(t),
      onDeleting: (event) => {
        event.wait(
          Promise.resolve().then(() => {
            event.cancel = cancel;
          }),
        );
      },
    });
    await core.init();
    core.select('b');
    await core.deleteSelected();
    expect(core.item('b')).toBeDefined();
    cancel = false;
    await core.deleteSelected();
    expect(core.item('b')).toBeUndefined();
    expect(said).toEqual(['1 item deleted']);
    await core.deleteSelected(); // nothing selected
    expect(core.canMove(['docs'], 'docs')).toBe(false); // into itself
    await core.toggle('docs', true);
    expect(core.canMove(['docs'], 'old')).toBe(false); // into a descendant
    expect(core.canMove(['a'], null)).toBe(false); // already there
    expect(core.canMove(['a'], 'docs')).toBe(true);
    await core.move(['a'], 'docs');
    expect(core.items().some((i) => i.id === 'a')).toBe(false);
    expect(said.at(-1)).toBe('1 item moved');
    await core.move(['missing'], 'docs');
    core.setDropTarget('docs');
    expect(core.dropTarget()).toBe('docs');
    const file = new File(['x'.repeat(5)], 'new.txt');
    await core.upload([file]);
    expect(core.selectedItems().map((i) => i.name)).toEqual(['new.txt']);
    expect(said.at(-1)).toBe('1 file uploaded');
    await core.upload([file], 'pics'); // not listed yet: stored, not cached
    await core.upload([]);
    core.select('docs');
    await core.deleteSelected(); // a folder and its contents
    expect(provider.items().some((i) => i.id === 'deep')).toBe(false);
  });

  it('builds context menus and runs commands', async () => {
    const { core, events } = setup();
    await core.init();
    const fileMenu = core.menuFor(core.item('a')!);
    expect(fileMenu.map((m) => m.value)).toEqual(['open', 'rename', 'delete']);
    expect([...core.selectedIds()]).toEqual(['a']);
    core.select('b', { ctrl: true });
    expect(
      core.menuFor(core.item('b')!).find((m) => m.value === 'open')?.visible,
    ).toBe(false);
    expect(core.menuFor(null).map((m) => m.value)).toEqual([
      'new-folder',
      'upload',
      'refresh',
    ]);
    core.select('a');
    await core.run('open');
    expect(events.opened.map((i) => i.id)).toEqual(['a']);
    await core.run('rename');
    expect(core.renaming()?.id).toBe('a');
    core.cancelRename();
    await core.run('upload');
    expect(events.picks).toBe(1);
    await core.run('refresh');
    await core.run('new-folder');
    core.cancelRename();
    await core.run('delete');
    expect(core.can('delete')).toBe(true);
    expect(core.can('open')).toBe(true);
  });

  it('hides what a read-only provider cannot do and reports failures', async () => {
    let fail = false;
    const readOnly: OgeFileProvider = {
      list: async (id) => {
        if (fail) throw new Error('offline');
        return FILES.filter((f) => f.parentId === id);
      },
    };
    const { core, events } = setup(readOnly);
    await core.init();
    expect(
      ['rename', 'delete', 'new-folder', 'upload'].map((c) =>
        core.can(c as 'rename'),
      ),
    ).toEqual([false, false, false, false]);
    expect(
      core
        .menuFor(null)
        .filter((m) => m.visible !== false)
        .map((m) => m.value),
    ).toEqual(['refresh']);
    core.beginRename('a');
    expect(core.renaming()).toBeNull();
    await core.newFolder();
    await core.move(['a'], 'docs');
    fail = true;
    await core.refresh();
    expect(core.errorText()).toBe('The folder could not be loaded');
    expect(events.errors).toHaveLength(1);
    fail = false;
    const empty = ogeMemoryFileProvider([]);
    await core.setProvider(empty);
    await core.setProvider(empty); // the same provider: nothing to do
    core.setMessages({
      ...OGE_DEFAULT_FILE_MANAGER_MESSAGES,
      root: 'Dosyalar',
    });
    expect(core.treeRows()[0].name).toBe('Dosyalar');
  });

  it('reports failed provider writes', async () => {
    const broken: OgeFileProvider = {
      list: async (id) => FILES.filter((f) => f.parentId === id),
      createFolder: async () => Promise.reject(new Error('no')),
      rename: async () => Promise.reject(new Error('no')),
      delete: async () => Promise.reject(new Error('no')),
      move: async () => Promise.reject(new Error('no')),
      upload: async () => Promise.reject(new Error('no')),
    };
    const { core, events } = setup(broken);
    await core.init();
    await core.newFolder();
    core.beginRename('a');
    core.setRenameDraft('z.txt');
    expect(await core.commitRename()).toBe(false);
    core.select('a');
    await core.deleteSelected();
    await core.move(['a'], 'docs');
    await core.upload([new File(['x'], 'x.txt')]);
    expect(events.errors).toHaveLength(5);
  });

  it('drops a listing overtaken by a newer one', async () => {
    const releases: (() => void)[] = [];
    const slow: OgeFileProvider = {
      list: (id) =>
        id === 'docs'
          ? new Promise((resolve) => {
              release = () =>
                resolve(FILES.filter((f) => f.parentId === 'docs'));
            })
          : Promise.resolve(FILES.filter((f) => f.parentId === id)),
    };
    const { core } = setup(slow);
    await core.init();
    const first = core.load('docs');
    const second = core.load('docs', true);
    releases.forEach((release) => release());
    await Promise.all([first, second]);
    expect(core.loading()).toBe(false);
  });
});
