/**
 * The file manager's state machine, shared by both render layers: a folder
 * tree loaded folder by folder from a provider, the open folder's items as a
 * list or a grid, selection, history, sorting, search, inline rename, new
 * folders, delete, move and upload — and the keyboard maps of the tree and
 * the item view. The layers own only markup and DOM events.
 */
import { foldText, ogeFormatMessage } from '@oge-ui/core';
import type { OgeMenuItem } from '../menu/menu-types';
import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';
import { formatFileSize } from './file-size';

/** One file or folder. */
export interface OgeFileItem {
  readonly id: string;
  readonly name: string;
  /** The folder it is in; `null` at the root. */
  readonly parentId: string | null;
  readonly isFolder: boolean;
  /** Bytes, for files. */
  readonly size?: number;
  /** Last change, as a `Date` or ISO text. */
  readonly modified?: Date | string;
}

/**
 * Where the files live. `list` is required; every other operation is
 * optional, and the matching command is hidden when it is missing.
 */
export interface OgeFileProvider {
  /** The items directly inside a folder (`null`: the root). */
  list(folderId: string | null): Promise<readonly OgeFileItem[]>;
  createFolder?(parentId: string | null, name: string): Promise<OgeFileItem>;
  rename?(item: OgeFileItem, name: string): Promise<OgeFileItem>;
  delete?(items: readonly OgeFileItem[]): Promise<void>;
  /** Moves items into another folder (`null`: the root). */
  move?(items: readonly OgeFileItem[], targetId: string | null): Promise<void>;
  /** Stores dropped or picked files in a folder and returns the new items. */
  upload?(
    parentId: string | null,
    files: readonly File[],
  ): Promise<readonly OgeFileItem[]>;
}

/** List (rows with columns) or grid (tiles). */
export type OgeFileView = 'list' | 'grid';
/** The sortable columns. */
export type OgeFileSortField = 'name' | 'size' | 'modified';

/** The file manager's text. */
export interface OgeFileManagerMessages {
  readonly label: string;
  readonly root: string;
  readonly folders: string;
  readonly items: string;
  readonly back: string;
  readonly forward: string;
  readonly up: string;
  readonly refresh: string;
  readonly newFolder: string;
  readonly newFolderName: string;
  readonly upload: string;
  readonly rename: string;
  readonly delete: string;
  readonly open: string;
  readonly listView: string;
  readonly gridView: string;
  readonly search: string;
  readonly nameColumn: string;
  readonly sizeColumn: string;
  readonly modifiedColumn: string;
  readonly empty: string;
  readonly noMatches: string;
  readonly loading: string;
  readonly loadError: string;
  readonly dropHint: string;
  /** ICU: `{count}` items, `{selected}` selected. */
  readonly status: string;
  readonly folderKind: string;
  readonly renameLabel: string;
  readonly nameTaken: string;
  readonly nameInvalid: string;
  /** Live-region text after a move, upload or delete. */
  readonly moved: string;
  readonly uploaded: string;
  readonly deleted: string;
}

export const OGE_DEFAULT_FILE_MANAGER_MESSAGES: OgeFileManagerMessages = {
  label: 'File manager',
  root: 'Files',
  folders: 'Folders',
  items: 'Items',
  back: 'Back',
  forward: 'Forward',
  up: 'Up one level',
  refresh: 'Refresh',
  newFolder: 'New folder',
  newFolderName: 'New folder',
  upload: 'Upload',
  rename: 'Rename',
  delete: 'Delete',
  open: 'Open',
  listView: 'List view',
  gridView: 'Grid view',
  search: 'Search in folder',
  nameColumn: 'Name',
  sizeColumn: 'Size',
  modifiedColumn: 'Modified',
  empty: 'This folder is empty',
  noMatches: 'No items match the search',
  loading: 'Loading…',
  loadError: 'The folder could not be loaded',
  dropHint: 'Drop files to upload them here',
  status:
    '{count, plural, one {# item} other {# items}}{selected, plural, =0 {} other {, # selected}}',
  folderKind: 'Folder',
  renameLabel: 'New name',
  nameTaken: 'An item with this name already exists',
  nameInvalid: 'Names cannot be empty or contain / or \\',
  moved: '{count, plural, one {# item moved} other {# items moved}}',
  uploaded: '{count, plural, one {# file uploaded} other {# files uploaded}}',
  deleted: '{count, plural, one {# item deleted} other {# items deleted}}',
};

/** A row of the folder tree. */
export interface OgeFileTreeRow {
  readonly id: string | null;
  readonly name: string;
  readonly depth: number;
  readonly expanded: boolean;
  /** `false` once loaded without subfolders; `true` while unknown. */
  readonly expandable: boolean;
  readonly loading: boolean;
  readonly current: boolean;
}

/** Cancelable, before items are deleted. */
export interface OgeFileDeletingEvent {
  readonly items: readonly OgeFileItem[];
  cancel: boolean;
  /**
   * Holds the delete until the promise settles — ask for confirmation, then
   * set `cancel`. (An Angular output cannot return a promise; this can.)
   */
  wait(promise: Promise<unknown>): void;
}

/** The commands of the toolbar and the context menu. */
export type OgeFileCommand =
  'open' | 'rename' | 'delete' | 'new-folder' | 'upload' | 'refresh';

export interface OgeFileManagerCoreOptions {
  readonly reactivity: OgeReactivityAdapter;
  readonly provider: OgeFileProvider;
  readonly messages: OgeFileManagerMessages;
  /** A file was opened (double click, Enter). */
  readonly onOpenFile?: (item: OgeFileItem) => void;
  /** The open folder changed. */
  readonly onFolderChange?: (folderId: string | null) => void;
  /** The selection changed. */
  readonly onSelectionChange?: (items: readonly OgeFileItem[]) => void;
  /** Cancelable, before a delete (a confirmation dialog hooks in here). */
  readonly onDeleting?: (event: OgeFileDeletingEvent) => void | Promise<void>;
  /** A provider call failed. */
  readonly onError?: (error: unknown) => void;
  /** Live-region text. */
  readonly announce?: (text: string) => void;
  /** Asks the layer to pick files for an upload. */
  readonly pickFiles?: () => void;
  /** Formats a date for the modified column. Default: the locale's short date and time. */
  readonly formatDate?: (date: Date) => string;
}

// a NUL can never start a real id
const ROOT_KEY = String.fromCharCode(0) + 'root';
const key = (id: string | null) => id ?? ROOT_KEY;

const time = (value: Date | string | undefined) =>
  value === undefined ? NaN : new Date(value).getTime();

/** The file manager's state machine. */
export class OgeFileManagerCore {
  private readonly cache = new Map<string, readonly OgeFileItem[]>();
  private readonly byId = new Map<string, OgeFileItem>();
  private readonly loadingCell: OgeReactiveCell<ReadonlySet<string>>;
  private readonly versionCell: OgeReactiveCell<number>;
  private readonly folderCell: OgeReactiveCell<string | null>;
  private readonly historyCell: OgeReactiveCell<{
    readonly stack: readonly (string | null)[];
    readonly index: number;
  }>;
  private readonly expandedCell: OgeReactiveCell<ReadonlySet<string>>;
  private readonly selectionCell: OgeReactiveCell<ReadonlySet<string>>;
  private readonly anchorCell: OgeReactiveCell<string | null>;
  private readonly focusCell: OgeReactiveCell<string | null>;
  private readonly treeFocusCell: OgeReactiveCell<string | null>;
  private readonly viewCell: OgeReactiveCell<OgeFileView>;
  private readonly sortCell: OgeReactiveCell<{
    readonly field: OgeFileSortField;
    readonly dir: 'asc' | 'desc';
  }>;
  private readonly searchCell: OgeReactiveCell<string>;
  private readonly renameCell: OgeReactiveCell<{
    readonly id: string;
    readonly draft: string;
    readonly error: string;
  } | null>;
  private readonly errorCell: OgeReactiveCell<string>;
  private readonly messagesCell: OgeReactiveCell<OgeFileManagerMessages>;
  private readonly dropCell: OgeReactiveCell<string | null | undefined>;
  private provider: OgeFileProvider;
  private loadIds = new Map<string, number>();

  readonly folderId: () => string | null;
  readonly messages: () => OgeFileManagerMessages;
  readonly view: () => OgeFileView;
  readonly sort: () => {
    readonly field: OgeFileSortField;
    readonly dir: 'asc' | 'desc';
  };
  readonly searchText: () => string;
  readonly errorText: () => string;
  /** The open folder is being listed. */
  readonly loading: () => boolean;
  /** The open folder's items: folders first, sorted, filtered by the search. */
  readonly items: () => readonly OgeFileItem[];
  readonly selectedIds: () => ReadonlySet<string>;
  readonly selectedItems: () => readonly OgeFileItem[];
  /** The item the arrow keys move from. */
  readonly focusedId: () => string | null;
  /** The visible folder tree, depth first. */
  readonly treeRows: () => readonly OgeFileTreeRow[];
  readonly treeFocusedId: () => string | null;
  /** The open folder's ancestors and itself, root first. */
  readonly path: () => readonly {
    readonly id: string | null;
    readonly name: string;
  }[];
  readonly canGoBack: () => boolean;
  readonly canGoForward: () => boolean;
  readonly canGoUp: () => boolean;
  readonly renaming: () => {
    readonly id: string;
    readonly draft: string;
    readonly error: string;
  } | null;
  readonly statusText: () => string;
  /** The folder a drag hovers (`null`: the root, `undefined`: none). */
  readonly dropTarget: () => string | null | undefined;
  /** Which commands the provider supports. */
  readonly can: (command: OgeFileCommand) => boolean;

  constructor(private readonly options: OgeFileManagerCoreOptions) {
    const rx = options.reactivity;
    this.provider = options.provider;
    this.loadingCell = rx.cell<ReadonlySet<string>>(new Set());
    this.versionCell = rx.cell(0);
    this.folderCell = rx.cell<string | null>(null);
    this.historyCell = rx.cell({
      stack: [null] as readonly (string | null)[],
      index: 0,
    });
    this.expandedCell = rx.cell<ReadonlySet<string>>(new Set([ROOT_KEY]));
    this.selectionCell = rx.cell<ReadonlySet<string>>(new Set());
    this.anchorCell = rx.cell<string | null>(null);
    this.focusCell = rx.cell<string | null>(null);
    this.treeFocusCell = rx.cell<string | null>(ROOT_KEY);
    this.viewCell = rx.cell<OgeFileView>('list');
    this.sortCell = rx.cell({
      field: 'name' as OgeFileSortField,
      dir: 'asc' as 'asc' | 'desc',
    });
    this.searchCell = rx.cell('');
    this.renameCell = rx.cell<{
      id: string;
      draft: string;
      error: string;
    } | null>(null);
    this.errorCell = rx.cell('');
    this.messagesCell = rx.cell(options.messages);
    this.dropCell = rx.cell<string | null | undefined>(undefined);

    this.folderId = () => this.folderCell();
    this.messages = () => this.messagesCell();
    this.view = () => this.viewCell();
    this.sort = () => this.sortCell();
    this.searchText = () => this.searchCell();
    this.errorText = () => this.errorCell();
    this.loading = () => this.loadingCell().has(key(this.folderCell()));
    this.items = rx.derived(() => {
      this.versionCell();
      const list = this.cache.get(key(this.folderCell())) ?? [];
      const query = foldText(this.searchCell().trim());
      const shown = query
        ? list.filter((i) => foldText(i.name).includes(query))
        : list;
      const { field, dir } = this.sortCell();
      const sign = dir === 'asc' ? 1 : -1;
      const collator = new Intl.Collator(undefined, {
        numeric: true,
        sensitivity: 'base',
      });
      return [...shown].sort((a, b) => {
        if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
        let order = 0;
        if (field === 'size') order = (a.size ?? -1) - (b.size ?? -1);
        else if (field === 'modified')
          order = (time(a.modified) || 0) - (time(b.modified) || 0);
        return sign * (order || collator.compare(a.name, b.name));
      });
    });
    this.selectedIds = () => this.selectionCell();
    this.selectedItems = rx.derived(() => {
      this.versionCell();
      return this.items().filter((i) => this.selectionCell().has(i.id));
    });
    this.focusedId = () => this.focusCell();
    this.treeFocusedId = () => {
      const k = this.treeFocusCell();
      return k === ROOT_KEY ? null : k;
    };
    this.treeRows = rx.derived(() => {
      this.versionCell();
      const expanded = this.expandedCell();
      const loading = this.loadingCell();
      const current = key(this.folderCell());
      const rows: OgeFileTreeRow[] = [];
      const walk = (id: string | null, name: string, depth: number) => {
        const k = key(id);
        const children = this.cache.get(k);
        const folders = children?.filter((c) => c.isFolder) ?? [];
        const open = expanded.has(k);
        rows.push({
          id,
          name,
          depth,
          expanded: open && children !== undefined,
          expandable: children === undefined || folders.length > 0,
          loading: loading.has(k),
          current: k === current,
        });
        if (open && children) {
          const collator = new Intl.Collator(undefined, {
            numeric: true,
            sensitivity: 'base',
          });
          for (const folder of [...folders].sort((a, b) =>
            collator.compare(a.name, b.name),
          )) {
            walk(folder.id, folder.name, depth + 1);
          }
        }
      };
      walk(null, this.messagesCell().root, 0);
      return rows;
    });
    this.path = rx.derived(() => {
      this.versionCell();
      const out: { id: string | null; name: string }[] = [];
      let id = this.folderCell();
      const seen = new Set<string>();
      while (id !== null && !seen.has(id)) {
        seen.add(id);
        const item = this.byId.get(id);
        out.unshift({ id, name: item?.name ?? id });
        id = item?.parentId ?? null;
      }
      out.unshift({ id: null, name: this.messagesCell().root });
      return out;
    });
    this.canGoBack = rx.derived(() => this.historyCell().index > 0);
    this.canGoForward = rx.derived(
      () => this.historyCell().index < this.historyCell().stack.length - 1,
    );
    this.canGoUp = () => this.folderCell() !== null;
    this.renaming = () => this.renameCell();
    this.statusText = rx.derived(() =>
      ogeFormatMessage(this.messagesCell().status, {
        count: this.items().length,
        selected: this.selectedItems().length,
      }),
    );
    this.dropTarget = () => this.dropCell();
    this.can = (command) => {
      const p = this.provider;
      switch (command) {
        case 'rename':
          return !!p.rename;
        case 'delete':
          return !!p.delete;
        case 'new-folder':
          return !!p.createFolder;
        case 'upload':
          return !!p.upload;
        default:
          return true;
      }
    };
  }

  setMessages(messages: OgeFileManagerMessages): void {
    this.messagesCell.set(messages);
  }

  /** A new provider: everything is listed again from the root. */
  async setProvider(provider: OgeFileProvider): Promise<void> {
    if (provider === this.provider) return;
    this.provider = provider;
    this.cache.clear();
    this.byId.clear();
    this.historyCell.set({ stack: [null], index: 0 });
    this.expandedCell.set(new Set([ROOT_KEY]));
    this.bump();
    await this.goTo(null, false);
  }

  /** Lists the root; call once after creating the core. */
  init(): Promise<void> {
    return this.goTo(null, false);
  }

  /** The size column's text. */
  sizeOf(item: OgeFileItem): string {
    return item.isFolder || item.size === undefined
      ? ''
      : formatFileSize(item.size);
  }

  /** The modified column's text. */
  modifiedOf(item: OgeFileItem): string {
    const t = time(item.modified);
    if (Number.isNaN(t)) return '';
    const date = new Date(t);
    return this.options.formatDate
      ? this.options.formatDate(date)
      : date.toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        });
  }

  /** A short kind for icons: `folder`, or the file extension. */
  kindOf(item: OgeFileItem): string {
    if (item.isFolder) return 'folder';
    const dot = item.name.lastIndexOf('.');
    return dot > 0 ? item.name.slice(dot + 1).toLowerCase() : 'file';
  }

  // --- loading ---------------------------------------------------------------

  private bump(): void {
    this.versionCell.set(this.versionCell() + 1);
  }

  private setLoading(k: string, on: boolean): void {
    const next = new Set(this.loadingCell());
    if (on) next.add(k);
    else next.delete(k);
    this.loadingCell.set(next);
  }

  /** Lists a folder into the cache (again when `force`). */
  async load(folderId: string | null, force = false): Promise<void> {
    const k = key(folderId);
    if (this.cache.has(k) && !force) return;
    const id = (this.loadIds.get(k) ?? 0) + 1;
    this.loadIds.set(k, id);
    this.setLoading(k, true);
    try {
      const items = await this.provider.list(folderId);
      if (this.loadIds.get(k) !== id) return;
      this.store(folderId, items);
      if (key(this.folderCell()) === k) this.errorCell.set('');
    } catch (error) {
      if (this.loadIds.get(k) !== id) return;
      if (key(this.folderCell()) === k)
        this.errorCell.set(this.messagesCell().loadError);
      this.options.onError?.(error);
    } finally {
      if (this.loadIds.get(k) === id) this.setLoading(k, false);
    }
  }

  private store(folderId: string | null, items: readonly OgeFileItem[]): void {
    const old = this.cache.get(key(folderId)) ?? [];
    for (const item of old) {
      if (!items.some((i) => i.id === item.id)) this.byId.delete(item.id);
    }
    for (const item of items) this.byId.set(item.id, item);
    this.cache.set(key(folderId), items);
    this.bump();
  }

  // --- navigation ------------------------------------------------------------

  private async goTo(folderId: string | null, record: boolean): Promise<void> {
    if (record) {
      const { stack, index } = this.historyCell();
      if (stack[index] !== folderId) {
        this.historyCell.set({
          stack: [...stack.slice(0, index + 1), folderId],
          index: index + 1,
        });
      }
    }
    const changed = this.folderCell() !== folderId;
    this.folderCell.set(folderId);
    this.selectionCell.set(new Set());
    this.anchorCell.set(null);
    this.focusCell.set(null);
    this.searchCell.set('');
    this.renameCell.set(null);
    this.errorCell.set('');
    this.treeFocusCell.set(key(folderId));
    // the tree shows the way to the open folder, and the folder's own children
    const expanded = new Set(this.expandedCell());
    expanded.add(key(folderId));
    let walk: string | null = folderId;
    while (walk !== null) {
      const parent: string | null = this.byId.get(walk)?.parentId ?? null;
      expanded.add(key(parent));
      walk = parent;
    }
    this.expandedCell.set(expanded);
    if (changed) this.options.onFolderChange?.(folderId);
    await this.load(folderId);
    this.focusCell.set(this.items()[0]?.id ?? null);
  }

  /** Opens a folder. */
  open(folderId: string | null): Promise<void> {
    return this.goTo(folderId, true);
  }

  /** Opens an item: a folder is entered, a file reported. */
  async openItem(item: OgeFileItem): Promise<void> {
    if (item.isFolder) await this.open(item.id);
    else this.options.onOpenFile?.(item);
  }

  back(): Promise<void> {
    const { stack, index } = this.historyCell();
    if (index === 0) return Promise.resolve();
    this.historyCell.set({ stack, index: index - 1 });
    return this.goTo(stack[index - 1], false);
  }

  forward(): Promise<void> {
    const { stack, index } = this.historyCell();
    if (index >= stack.length - 1) return Promise.resolve();
    this.historyCell.set({ stack, index: index + 1 });
    return this.goTo(stack[index + 1], false);
  }

  up(): Promise<void> {
    const current = this.folderCell();
    if (current === null) return Promise.resolve();
    return this.open(this.byId.get(current)?.parentId ?? null);
  }

  refresh(): Promise<void> {
    return this.load(this.folderCell(), true);
  }

  setView(view: OgeFileView): void {
    this.viewCell.set(view);
  }

  /** Sorts by a column; the same column again flips the direction. */
  sortBy(field: OgeFileSortField): void {
    const sort = this.sortCell();
    this.sortCell.set({
      field,
      dir: sort.field === field && sort.dir === 'asc' ? 'desc' : 'asc',
    });
  }

  setSearch(text: string): void {
    this.searchCell.set(text);
  }

  // --- tree ------------------------------------------------------------------

  /** Expands or collapses a tree folder, listing it on first expand. */
  async toggle(folderId: string | null, open?: boolean): Promise<void> {
    const k = key(folderId);
    const expanded = new Set(this.expandedCell());
    const next = open ?? !expanded.has(k);
    if (next) expanded.add(k);
    else expanded.delete(k);
    this.expandedCell.set(expanded);
    if (next) await this.load(folderId);
  }

  focusTree(folderId: string | null): void {
    this.treeFocusCell.set(key(folderId));
  }

  /** The folder tree's keyboard map (APG tree view). */
  treeKeydown(event: { readonly key: string; preventDefault(): void }): void {
    const rows = this.treeRows();
    const at = rows.findIndex((r) => key(r.id) === this.treeFocusCell());
    const row = rows[at];
    if (!row) return;
    const focus = (r: OgeFileTreeRow | undefined) => {
      if (r) this.treeFocusCell.set(key(r.id));
    };
    switch (event.key) {
      case 'ArrowDown':
        focus(rows[at + 1]);
        break;
      case 'ArrowUp':
        focus(rows[at - 1]);
        break;
      case 'Home':
        focus(rows[0]);
        break;
      case 'End':
        focus(rows[rows.length - 1]);
        break;
      case 'ArrowRight':
        if (row.expandable && !row.expanded) void this.toggle(row.id, true);
        else if (row.expanded)
          focus(rows[at + 1]?.depth > row.depth ? rows[at + 1] : undefined);
        break;
      case 'ArrowLeft':
        if (row.expanded && row.depth > 0) void this.toggle(row.id, false);
        else if (row.depth > 0) {
          for (let i = at - 1; i >= 0; i--) {
            if (rows[i].depth < row.depth) {
              focus(rows[i]);
              break;
            }
          }
        }
        break;
      case 'Enter':
      case ' ':
        void this.open(row.id);
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  // --- selection -------------------------------------------------------------

  private setSelection(ids: Iterable<string>): void {
    this.selectionCell.set(new Set(ids));
    this.options.onSelectionChange?.(this.selectedItems());
  }

  /** Click semantics: plain replaces, Ctrl / ⌘ toggles, Shift extends from the anchor. */
  select(
    id: string,
    modifiers: { readonly ctrl?: boolean; readonly shift?: boolean } = {},
  ): void {
    const items = this.items();
    this.focusCell.set(id);
    if (modifiers.shift && this.anchorCell() !== null) {
      const from = items.findIndex((i) => i.id === this.anchorCell());
      const to = items.findIndex((i) => i.id === id);
      if (from >= 0 && to >= 0) {
        const [a, b] = from < to ? [from, to] : [to, from];
        const range = items.slice(a, b + 1).map((i) => i.id);
        this.setSelection(
          modifiers.ctrl ? [...this.selectionCell(), ...range] : range,
        );
        return;
      }
    }
    this.anchorCell.set(id);
    if (modifiers.ctrl) {
      const next = new Set(this.selectionCell());
      if (next.has(id)) next.delete(id);
      else next.add(id);
      this.setSelection(next);
    } else this.setSelection([id]);
  }

  selectAll(): void {
    this.setSelection(this.items().map((i) => i.id));
  }

  clearSelection(): void {
    this.setSelection([]);
  }

  /**
   * The item view's keyboard map. `columns` is how many tiles fit a row in
   * grid view (the layer measures it); list view moves by one.
   */
  keydown(
    event: {
      readonly key: string;
      readonly ctrlKey?: boolean;
      readonly metaKey?: boolean;
      readonly shiftKey?: boolean;
      readonly altKey?: boolean;
      preventDefault(): void;
    },
    columns = 1,
  ): void {
    if (this.renameCell()) return;
    const items = this.items();
    const mod = !!(event.ctrlKey || event.metaKey);
    const at = items.findIndex((i) => i.id === this.focusCell());
    const step = this.viewCell() === 'grid' ? Math.max(1, columns) : 1;
    const move = (to: number) => {
      const target = items[Math.max(0, Math.min(items.length - 1, to))];
      if (!target) return;
      if (event.shiftKey) this.select(target.id, { shift: true });
      else if (mod) this.focusCell.set(target.id);
      else this.select(target.id);
    };
    switch (event.key) {
      case 'ArrowDown':
        move(at < 0 ? 0 : at + step);
        break;
      case 'ArrowUp':
        if (event.altKey) void this.up();
        else move(at < 0 ? 0 : at - step);
        break;
      case 'ArrowRight':
        if (this.viewCell() !== 'grid') return;
        move(at + 1);
        break;
      case 'ArrowLeft':
        if (event.altKey) void this.back();
        else if (this.viewCell() === 'grid') move(at - 1);
        else return;
        break;
      case 'Home':
        move(0);
        break;
      case 'End':
        move(items.length - 1);
        break;
      case ' ':
        if (at < 0) return;
        if (mod) this.select(items[at].id, { ctrl: true });
        else this.select(items[at].id);
        break;
      case 'Enter':
        if (at >= 0) void this.openItem(items[at]);
        break;
      case 'Backspace':
        void this.up();
        break;
      case 'F2':
        if (at >= 0) this.beginRename(items[at].id);
        break;
      case 'Delete':
        void this.deleteSelected();
        break;
      case 'a':
      case 'A':
        if (!mod) return;
        this.selectAll();
        break;
      case 'Escape':
        if (!this.selectionCell().size) return;
        this.clearSelection();
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  // --- rename and new folder ------------------------------------------------

  beginRename(id: string): void {
    const item = this.byId.get(id);
    if (!item || !this.provider.rename) return;
    this.renameCell.set({ id, draft: item.name, error: '' });
  }

  setRenameDraft(draft: string): void {
    const state = this.renameCell();
    if (state) this.renameCell.set({ ...state, draft, error: '' });
  }

  cancelRename(): void {
    this.renameCell.set(null);
  }

  private nameProblem(name: string, except?: string): string {
    const text = this.messagesCell();
    if (!name.trim() || /[/\\]/.test(name)) return text.nameInvalid;
    const siblings = this.cache.get(key(this.folderCell())) ?? [];
    const folded = foldText(name.trim());
    return siblings.some((s) => s.id !== except && foldText(s.name) === folded)
      ? text.nameTaken
      : '';
  }

  /** Commits the rename; keeps the editor open with a message when the name is refused. */
  async commitRename(): Promise<boolean> {
    const state = this.renameCell();
    const item = state && this.byId.get(state.id);
    if (!state || !item || !this.provider.rename) return false;
    const name = state.draft.trim();
    if (name === item.name) {
      this.renameCell.set(null);
      return true;
    }
    const problem = this.nameProblem(name, item.id);
    if (problem) {
      this.renameCell.set({ ...state, error: problem });
      return false;
    }
    try {
      const renamed = await this.provider.rename(item, name);
      this.replace(renamed);
      this.renameCell.set(null);
      this.focusCell.set(renamed.id);
      return true;
    } catch (error) {
      this.options.onError?.(error);
      return false;
    }
  }

  private replace(item: OgeFileItem): void {
    const k = key(item.parentId);
    const list = this.cache.get(k);
    if (list) {
      this.cache.set(
        k,
        list.map((i) => (i.id === item.id ? item : i)),
      );
    }
    this.byId.set(item.id, item);
    this.bump();
  }

  /** Creates a folder with a free name and opens its name for editing. */
  async newFolder(): Promise<void> {
    if (!this.provider.createFolder) return;
    const base = this.messagesCell().newFolderName;
    let name = base;
    for (let n = 2; this.nameProblem(name); n++) name = `${base} (${n})`;
    const parent = this.folderCell();
    try {
      const folder = await this.provider.createFolder(parent, name);
      this.store(parent, [...(this.cache.get(key(parent)) ?? []), folder]);
      this.focusCell.set(folder.id);
      this.setSelection([folder.id]);
      this.beginRename(folder.id);
    } catch (error) {
      this.options.onError?.(error);
    }
  }

  // --- delete, move, upload --------------------------------------------------

  /** Deletes the selection (after `onDeleting`, which may cancel). */
  async deleteSelected(): Promise<void> {
    const items = this.selectedItems();
    if (!items.length || !this.provider.delete) return;
    const pending: Promise<unknown>[] = [];
    const event: OgeFileDeletingEvent = {
      items,
      cancel: false,
      wait: (promise) => void pending.push(promise),
    };
    await this.options.onDeleting?.(event);
    await Promise.all(pending.map((p) => p.catch(() => (event.cancel = true))));
    if (event.cancel) return;
    try {
      await this.provider.delete(items);
      const gone = new Set(items.map((i) => i.id));
      const k = key(this.folderCell());
      this.store(
        this.folderCell(),
        (this.cache.get(k) ?? []).filter((i) => !gone.has(i.id)),
      );
      for (const item of items) {
        if (item.isFolder) this.cache.delete(key(item.id));
      }
      this.setSelection([]);
      this.focusCell.set(this.items()[0]?.id ?? null);
      this.say(this.messagesCell().deleted, items.length);
    } catch (error) {
      this.options.onError?.(error);
    }
  }

  /** Whether items may be moved into a folder (not into themselves or below). */
  canMove(ids: readonly string[], targetId: string | null): boolean {
    if (!this.provider.move || !ids.length) return false;
    for (const id of ids) {
      const item = this.byId.get(id);
      if (!item || item.parentId === targetId) return false;
      // a folder cannot move into itself or into one of its descendants
      let walk: string | null = targetId;
      while (walk !== null) {
        if (walk === id) return false;
        walk = this.byId.get(walk)?.parentId ?? null;
      }
    }
    return true;
  }

  /** Moves items into a folder. */
  async move(ids: readonly string[], targetId: string | null): Promise<void> {
    if (!this.canMove(ids, targetId) || !this.provider.move) return;
    const items = ids
      .map((id) => this.byId.get(id))
      .filter((i): i is OgeFileItem => !!i);
    try {
      await this.provider.move(items, targetId);
      const sources = new Set(items.map((i) => i.parentId));
      for (const source of sources) await this.load(source, true);
      if (this.cache.has(key(targetId))) await this.load(targetId, true);
      this.setSelection([]);
      this.say(this.messagesCell().moved, items.length);
    } catch (error) {
      this.options.onError?.(error);
    }
  }

  /** Uploads files into a folder (default: the open one). */
  async upload(
    files: readonly File[],
    folderId: string | null = this.folderCell(),
  ): Promise<void> {
    if (!files.length || !this.provider.upload) return;
    try {
      const added = await this.provider.upload(folderId, files);
      const k = key(folderId);
      if (this.cache.has(k)) {
        this.store(folderId, [...(this.cache.get(k) ?? []), ...added]);
      }
      if (folderId === this.folderCell())
        this.setSelection(added.map((i) => i.id));
      this.say(this.messagesCell().uploaded, added.length);
    } catch (error) {
      this.options.onError?.(error);
    }
  }

  /** The folder a drag hovers, for the drop highlight. */
  setDropTarget(folderId: string | null | undefined): void {
    this.dropCell.set(folderId);
  }

  private say(template: string, count: number): void {
    this.options.announce?.(ogeFormatMessage(template, { count }));
  }

  // --- commands ---------------------------------------------------------------

  /** The context menu for an item (or the empty area when `item` is null). */
  menuFor(item: OgeFileItem | null): OgeMenuItem<OgeFileCommand>[] {
    const text = this.messagesCell();
    if (item && !this.selectionCell().has(item.id)) this.select(item.id);
    const many = this.selectionCell().size > 1;
    if (item) {
      return [
        { text: text.open, value: 'open', visible: !many },
        {
          text: text.rename,
          value: 'rename',
          visible: !many && this.can('rename'),
        },
        { text: text.delete, value: 'delete', visible: this.can('delete') },
      ];
    }
    return [
      {
        text: text.newFolder,
        value: 'new-folder',
        visible: this.can('new-folder'),
      },
      { text: text.upload, value: 'upload', visible: this.can('upload') },
      { text: text.refresh, value: 'refresh' },
    ];
  }

  /** Runs a toolbar or context-menu command on the selection. */
  async run(command: OgeFileCommand): Promise<void> {
    const first = this.selectedItems()[0];
    switch (command) {
      case 'open':
        if (first) await this.openItem(first);
        break;
      case 'rename':
        if (first) this.beginRename(first.id);
        break;
      case 'delete':
        await this.deleteSelected();
        break;
      case 'new-folder':
        await this.newFolder();
        break;
      case 'upload':
        this.options.pickFiles?.();
        break;
      case 'refresh':
        await this.refresh();
        break;
    }
  }

  /** An item by id from everything listed so far. */
  item(id: string): OgeFileItem | undefined {
    return this.byId.get(id);
  }
}

/**
 * A provider over an in-memory list — demos, tests, and a starting point for
 * your own. Ids of new items come from `newId` (default: a counter).
 */
export function ogeMemoryFileProvider(
  items: readonly OgeFileItem[],
  options: { readonly newId?: () => string; readonly now?: () => Date } = {},
): OgeFileProvider & { readonly items: () => readonly OgeFileItem[] } {
  let store = [...items];
  let counter = 0;
  const newId = options.newId ?? (() => `new-${++counter}`);
  const now = options.now ?? (() => new Date());
  const descendants = (ids: Set<string>) => {
    let grew = true;
    while (grew) {
      grew = false;
      for (const item of store) {
        if (
          item.parentId !== null &&
          ids.has(item.parentId) &&
          !ids.has(item.id)
        ) {
          ids.add(item.id);
          grew = true;
        }
      }
    }
    return ids;
  };
  return {
    items: () => store,
    list: async (folderId) => store.filter((i) => i.parentId === folderId),
    createFolder: async (parentId, name) => {
      const folder: OgeFileItem = {
        id: newId(),
        name,
        parentId,
        isFolder: true,
        modified: now(),
      };
      store.push(folder);
      return folder;
    },
    rename: async (item, name) => {
      const renamed = { ...item, name, modified: now() };
      store = store.map((i) => (i.id === item.id ? renamed : i));
      return renamed;
    },
    delete: async (gone) => {
      const ids = descendants(new Set(gone.map((i) => i.id)));
      store = store.filter((i) => !ids.has(i.id));
    },
    move: async (moved, targetId) => {
      const ids = new Set(moved.map((i) => i.id));
      store = store.map((i) =>
        ids.has(i.id) ? { ...i, parentId: targetId } : i,
      );
    },
    upload: async (parentId, files) => {
      const added = files.map((file) => ({
        id: newId(),
        name: file.name,
        parentId,
        isFolder: false,
        size: file.size,
        modified: now(),
      }));
      store.push(...added);
      return added;
    },
  };
}
