import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  OgeFileManagerCore,
  type OgeFileCommand,
  type OgeFileDeletingEvent,
  type OgeFileItem,
  type OgeFileManagerMessages,
  type OgeFileProvider,
  type OgeFileTreeRow,
  type OgeFileView,
  type OgeReactiveCell,
  type OgeReactivityAdapter,
} from '@oge-ui/behavior';
import {
  OgeContextMenu,
  type OgeContextMenuOpeningEvent,
  type OgeMenuListItemClickEvent,
} from '@oge-ui/overlay';
import { OGE_UPLOAD_CONFIG } from '@oge-ui/upload';

const SIGNAL_ADAPTER: OgeReactivityAdapter = {
  cell<T>(initial: T): OgeReactiveCell<T> {
    const state = signal(initial);
    const cell = (() => state()) as OgeReactiveCell<T>;
    cell.set = (value) => state.set(value);
    return cell;
  },
  derived: (compute) => computed(compute),
};

/** The MIME type an item drag carries: a JSON array of item ids. */
export const OGE_FILE_ITEMS_MIME = 'application/x-oge-file-items';

let nextId = 0;

/**
 * A file manager over any storage: a folder tree, the open folder as a list
 * or a grid, a path, back / forward / up, sorting and search, selection with
 * Ctrl and Shift, inline rename, new folders, delete, drag-to-move, drop-to-
 * upload and a context menu. Everything goes through `provider`; commands it
 * does not implement are hidden.
 *
 * ```html
 * <oge-file-manager [provider]="files" (fileOpen)="preview($event)" />
 * ```
 */
@Component({
  selector: 'oge-file-manager',
  exportAs: 'ogeFileManager',
  imports: [OgeContextMenu],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrl: './file-manager.scss',
  template: `
    <div class="oge-fm" role="group" [attr.aria-label]="core.messages().label">
      <div
        class="oge-fm-toolbar"
        role="toolbar"
        [attr.aria-label]="core.messages().label"
      >
        <span class="oge-fm-group">
          <button
            type="button"
            class="oge-fm-button oge-fm-back"
            [disabled]="!core.canGoBack()"
            [attr.aria-label]="core.messages().back"
            [attr.title]="core.messages().back"
            (click)="core.back()"
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path
                d="M10 3 5 8l5 5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            class="oge-fm-button oge-fm-forward"
            [disabled]="!core.canGoForward()"
            [attr.aria-label]="core.messages().forward"
            [attr.title]="core.messages().forward"
            (click)="core.forward()"
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path
                d="m6 3 5 5-5 5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            class="oge-fm-button oge-fm-up"
            [disabled]="!core.canGoUp()"
            [attr.aria-label]="core.messages().up"
            [attr.title]="core.messages().up"
            (click)="core.up()"
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path
                d="M8 13V3M3.5 7.5 8 3l4.5 4.5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </span>
        <ol class="oge-fm-path">
          @for (step of core.path(); track step.id; let last = $last) {
            <li>
              <button
                type="button"
                class="oge-fm-button"
                [attr.aria-current]="last ? 'location' : null"
                (click)="core.open(step.id)"
                (dragover)="onDragOver($event, step.id)"
                (dragleave)="core.setDropTarget(undefined)"
                (drop)="onDrop($event, step.id)"
              >
                {{ step.name }}
              </button>
            </li>
          }
        </ol>
        <span class="oge-fm-spacer"></span>
        <span class="oge-fm-group">
          @if (core.can('new-folder')) {
            <button
              type="button"
              class="oge-fm-button oge-fm-new-folder"
              [attr.aria-label]="core.messages().newFolder"
              [attr.title]="core.messages().newFolder"
              (click)="core.newFolder()"
            >
              <svg
                viewBox="0 0 16 16"
                width="16"
                height="16"
                aria-hidden="true"
              >
                <path
                  d="M1.5 4.5v8h13v-7H7.5L6 4H1.5zM8 7.5v4M6 9.5h4"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.3"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          }
          @if (core.can('upload')) {
            <button
              type="button"
              class="oge-fm-button oge-fm-upload"
              [attr.aria-label]="core.messages().upload"
              [attr.title]="core.messages().upload"
              (click)="pick()"
            >
              <svg
                viewBox="0 0 16 16"
                width="16"
                height="16"
                aria-hidden="true"
              >
                <path
                  d="M8 11V2.5M4.5 6 8 2.5 11.5 6M2.5 10.5v3h11v-3"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          }
          @if (core.can('delete')) {
            <button
              type="button"
              class="oge-fm-button oge-fm-delete"
              [disabled]="!core.selectedItems().length"
              [attr.aria-label]="core.messages().delete"
              [attr.title]="core.messages().delete"
              (click)="core.deleteSelected()"
            >
              <svg
                viewBox="0 0 16 16"
                width="16"
                height="16"
                aria-hidden="true"
              >
                <path
                  d="M2.5 4.5h11M6 4.5V2.5h4v2M4 4.5l.7 9h6.6l.7-9"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.3"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          }
          <button
            type="button"
            class="oge-fm-button oge-fm-refresh"
            [attr.aria-label]="core.messages().refresh"
            [attr.title]="core.messages().refresh"
            (click)="core.refresh()"
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path
                d="M13 8a5 5 0 1 1-1.5-3.6M13 2.5v3h-3"
                fill="none"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </span>
        <span class="oge-fm-group">
          <button
            type="button"
            class="oge-fm-button oge-fm-list-view"
            [attr.aria-pressed]="core.view() === 'list'"
            [attr.aria-label]="core.messages().listView"
            [attr.title]="core.messages().listView"
            (click)="setView('list')"
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path
                d="M2 4h12M2 8h12M2 12h12"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linecap="round"
              />
            </svg>
          </button>
          <button
            type="button"
            class="oge-fm-button oge-fm-grid-view"
            [attr.aria-pressed]="core.view() === 'grid'"
            [attr.aria-label]="core.messages().gridView"
            [attr.title]="core.messages().gridView"
            (click)="setView('grid')"
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path
                d="M2.5 2.5h4v4h-4zM9.5 2.5h4v4h-4zM2.5 9.5h4v4h-4zM9.5 9.5h4v4h-4z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.3"
              />
            </svg>
          </button>
        </span>
        <input
          class="oge-fm-search"
          type="search"
          [attr.aria-label]="core.messages().search"
          [attr.placeholder]="core.messages().search"
          [value]="core.searchText()"
          (input)="core.setSearch($any($event.target).value)"
        />
      </div>

      <div class="oge-fm-body">
        <ul
          class="oge-fm-tree"
          role="tree"
          tabindex="0"
          [attr.aria-label]="core.messages().folders"
          [attr.aria-activedescendant]="treeRowId(core.treeFocusedId())"
          (keydown)="core.treeKeydown($event)"
        >
          <!-- eslint-disable @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -- the keyboard lives on the tree / listbox (aria-activedescendant) -->
          @for (row of core.treeRows(); track row.id) {
            <li
              class="oge-fm-tree-row"
              role="treeitem"
              [id]="treeRowId(row.id)"
              [class.oge-fm-current]="row.current"
              [class.oge-fm-focused]="row.id === core.treeFocusedId()"
              [class.oge-fm-drop-target]="core.dropTarget() === row.id"
              [attr.aria-level]="row.depth + 1"
              [attr.aria-expanded]="row.expandable ? row.expanded : null"
              [attr.aria-selected]="row.current"
              [attr.aria-busy]="row.loading || null"
              [style.padding-inline-start.px]="8 + row.depth * 14"
              (click)="openFolder(row)"
              (dragover)="onDragOver($event, row.id)"
              (dragleave)="core.setDropTarget(undefined)"
              (drop)="onDrop($event, row.id)"
            >
              <span
                class="oge-fm-twisty"
                [class.oge-fm-open]="row.expanded"
                (click)="$event.stopPropagation(); core.toggle(row.id)"
                aria-hidden="true"
              >
                @if (row.expandable) {
                  <svg viewBox="0 0 16 16" width="12" height="12">
                    <path
                      d="m6 3 5 5-5 5"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                }
              </span>
              <span class="oge-fm-icon oge-fm-folder" aria-hidden="true">
                <svg viewBox="0 0 16 16" width="16" height="16">
                  <path
                    d="M1.5 3.5h4.5l1.5 1.5h7v7.5h-13z"
                    fill="currentColor"
                    opacity=".85"
                  />
                </svg>
              </span>
              <span>{{ row.name }}</span>
            </li>
          }
          <!-- eslint-enable @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
        </ul>

        <div
          class="oge-fm-main"
          [ogeContextMenu]="[]"
          contextMenuTarget=".oge-fm-item, .oge-fm-items"
          [contextMenuAriaLabel]="core.messages().label"
          (contextMenuOpening)="onMenuOpening($event)"
          (contextMenuItemClick)="onMenuClick($event)"
          (dragover)="onDragOver($event, core.folderId(), true)"
          (dragleave)="onMainLeave($event)"
          (drop)="onDrop($event, core.folderId())"
        >
          @if (core.view() === 'list') {
            <div class="oge-fm-columns" aria-hidden="true">
              <button
                type="button"
                class="oge-fm-button"
                tabindex="-1"
                (click)="core.sortBy('name')"
              >
                {{ core.messages().nameColumn }}{{ arrow('name') }}
              </button>
              <button
                type="button"
                class="oge-fm-button"
                tabindex="-1"
                (click)="core.sortBy('size')"
              >
                {{ core.messages().sizeColumn }}{{ arrow('size') }}
              </button>
              <button
                type="button"
                class="oge-fm-button"
                tabindex="-1"
                (click)="core.sortBy('modified')"
              >
                {{ core.messages().modifiedColumn }}{{ arrow('modified') }}
              </button>
            </div>
          }
          <ul
            #itemsList
            class="oge-fm-items"
            role="listbox"
            tabindex="0"
            aria-multiselectable="true"
            [class.oge-fm-grid]="core.view() === 'grid'"
            [attr.aria-label]="core.messages().items"
            [attr.aria-activedescendant]="itemId(core.focusedId())"
            [attr.aria-busy]="core.loading() || null"
            (keydown)="onKeydown($event)"
          >
            <!-- eslint-disable @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -- the keyboard lives on the tree / listbox (aria-activedescendant) -->
            @for (item of core.items(); track item.id) {
              <li
                class="oge-fm-item"
                role="option"
                [id]="itemId(item.id)"
                [attr.data-id]="item.id"
                [attr.aria-selected]="core.selectedIds().has(item.id)"
                [attr.aria-label]="describe(item)"
                [class.oge-fm-focused]="item.id === core.focusedId()"
                [class.oge-fm-drop-target]="
                  item.isFolder && core.dropTarget() === item.id
                "
                [attr.draggable]="core.renaming()?.id !== item.id"
                (click)="onItemClick($event, item)"
                (dblclick)="core.openItem(item)"
                (dragstart)="onDragStart($event, item)"
                (dragover)="item.isFolder && onDragOver($event, item.id)"
                (drop)="item.isFolder && onDrop($event, item.id)"
              >
                <span class="oge-fm-name">
                  <span
                    class="oge-fm-icon"
                    [class.oge-fm-folder]="item.isFolder"
                    aria-hidden="true"
                  >
                    @if (item.isFolder) {
                      <svg viewBox="0 0 16 16" width="18" height="18">
                        <path
                          d="M1.5 3.5h4.5l1.5 1.5h7v7.5h-13z"
                          fill="currentColor"
                          opacity=".85"
                        />
                      </svg>
                    } @else {
                      <svg viewBox="0 0 16 16" width="18" height="18">
                        <path
                          d="M3.5 1.5h6l3 3v10h-9zM9.5 1.5v3h3"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.2"
                          stroke-linejoin="round"
                        />
                      </svg>
                    }
                  </span>
                  @if (core.renaming(); as edit) {
                    @if (edit.id === item.id) {
                      <span>
                        <input
                          #renameInput
                          class="oge-fm-rename"
                          [attr.aria-label]="core.messages().renameLabel"
                          [attr.aria-invalid]="!!edit.error"
                          [attr.aria-describedby]="
                            edit.error ? itemId(item.id) + '-error' : null
                          "
                          [value]="edit.draft"
                          (input)="
                            core.setRenameDraft($any($event.target).value)
                          "
                          (keydown)="onRenameKey($event)"
                          (blur)="core.commitRename()"
                          (click)="$event.stopPropagation()"
                        />
                        @if (edit.error) {
                          <span
                            class="oge-fm-rename-error"
                            [id]="itemId(item.id) + '-error'"
                            >{{ edit.error }}</span
                          >
                        }
                      </span>
                    } @else {
                      <span>{{ item.name }}</span>
                    }
                  } @else {
                    <span>{{ item.name }}</span>
                  }
                </span>
                <span class="oge-fm-size">{{ core.sizeOf(item) }}</span>
                <span class="oge-fm-modified">{{ core.modifiedOf(item) }}</span>
              </li>
            }
            <!-- eslint-enable @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
          </ul>
          @if (core.loading() && !core.items().length) {
            <div class="oge-fm-message" role="status">
              {{ core.messages().loading }}
            </div>
          } @else if (core.errorText()) {
            <div class="oge-fm-message" role="alert">
              {{ core.errorText() }}
            </div>
          } @else if (!core.items().length) {
            <div class="oge-fm-message">
              {{
                core.searchText()
                  ? core.messages().noMatches
                  : core.messages().empty
              }}
            </div>
          }
          @if (fileDrag()) {
            <div class="oge-fm-dropzone" aria-hidden="true">
              {{ core.messages().dropHint }}
            </div>
          }
        </div>
      </div>

      <div class="oge-fm-status">
        <span>{{ core.statusText() }}</span>
        <span class="oge-fm-sr-only" role="status" aria-live="polite">{{
          announcement()
        }}</span>
      </div>
      <input
        #fileInput
        class="oge-fm-sr-only"
        type="file"
        multiple
        tabindex="-1"
        aria-hidden="true"
        (change)="onPick($event)"
      />
    </div>
  `,
})
export class OgeFileManager {
  private readonly config = inject(OGE_UPLOAD_CONFIG);
  private readonly itemsList = viewChild<ElementRef<HTMLElement>>('itemsList');
  private readonly renameInput =
    viewChild<ElementRef<HTMLInputElement>>('renameInput');
  private readonly fileInput =
    viewChild<ElementRef<HTMLInputElement>>('fileInput');

  /** Where the files live: `list` plus the operations you allow. */
  readonly provider = input.required<OgeFileProvider>();
  /** List (rows) or grid (tiles); two-way. */
  readonly view = model<OgeFileView>('list');
  /** Overrides of the message catalog. */
  readonly messages = input<Partial<OgeFileManagerMessages>>({});

  /** A file was opened (double click, Enter). */
  readonly fileOpen = output<OgeFileItem>();
  /** The open folder changed (`null`: the root). */
  readonly folderChange = output<string | null>();
  /** The selection changed. */
  readonly selectionChange = output<readonly OgeFileItem[]>();
  /** Cancelable, before a delete: set `cancel` (a confirmation dialog hooks in here). */
  readonly deleting = output<OgeFileDeletingEvent>();
  /** A provider call failed. */
  readonly providerError = output<unknown>();

  protected readonly id = `oge-fm-${nextId++}`;
  protected readonly announcement = signal('');
  protected readonly fileDrag = signal(false);

  /** The state the template binds. */
  protected readonly core: OgeFileManagerCore = new OgeFileManagerCore({
    reactivity: SIGNAL_ADAPTER,
    provider: { list: async () => [] },
    messages: this.config.messages.fileManager,
    onOpenFile: (item) => this.fileOpen.emit(item),
    onFolderChange: (folder) => this.folderChange.emit(folder),
    onSelectionChange: (items) => this.selectionChange.emit(items),
    onDeleting: (event) => this.deleting.emit(event),
    onError: (error) => this.providerError.emit(error),
    announce: (text) => this.announcement.set(text),
    pickFiles: () => this.pick(),
  });

  constructor() {
    effect(() => {
      const provider = this.provider();
      untracked(() => void this.core.setProvider(provider));
    });
    effect(() => {
      const view = this.view();
      untracked(() => this.core.setView(view));
    });
    effect(() => {
      const messages = {
        ...this.config.messages.fileManager,
        ...this.messages(),
      };
      untracked(() => this.core.setMessages(messages));
    });
    // the rename box takes the focus when it opens
    afterRenderEffect(() => {
      const input = this.renameInput()?.nativeElement;
      if (input && untracked(() => this.core.renaming())) {
        untracked(() => {
          if (input.ownerDocument.activeElement !== input) {
            input.focus();
            input.select();
          }
        });
      }
    });
    // keep the focused item in view
    afterRenderEffect(() => {
      const id = this.core.focusedId();
      const list = this.itemsList()?.nativeElement;
      if (!id || !list) return;
      list.ownerDocument
        .getElementById(this.itemId(id) ?? '')
        ?.scrollIntoView?.({ block: 'nearest' });
    });
  }

  /** Lists the open folder again. */
  refresh(): Promise<void> {
    return this.core.refresh();
  }

  /** Opens a folder (`null`: the root). */
  open(folderId: string | null): Promise<void> {
    return this.core.open(folderId);
  }

  /** Uploads files into the open folder. */
  upload(files: readonly File[]): Promise<void> {
    return this.core.upload(files);
  }

  protected setView(view: OgeFileView): void {
    this.view.set(view);
  }

  protected pick(): void {
    this.fileInput()?.nativeElement.click();
  }

  protected treeRowId(id: string | null | undefined): string {
    return `${this.id}-folder-${id === null || id === undefined ? 'root' : encodeURIComponent(id)}`;
  }

  protected itemId(id: string | null): string | null {
    return id === null ? null : `${this.id}-item-${encodeURIComponent(id)}`;
  }

  protected arrow(field: 'name' | 'size' | 'modified'): string {
    const sort = this.core.sort();
    return sort.field === field ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : '';
  }

  protected describe(item: OgeFileItem): string {
    const parts = [item.name];
    if (item.isFolder) parts.push(this.core.messages().folderKind);
    const size = this.core.sizeOf(item);
    if (size) parts.push(size);
    const modified = this.core.modifiedOf(item);
    if (modified) parts.push(modified);
    return parts.join(', ');
  }

  protected openFolder(row: OgeFileTreeRow): void {
    this.core.focusTree(row.id);
    void this.core.open(row.id);
  }

  protected onItemClick(event: MouseEvent, item: OgeFileItem): void {
    this.core.select(item.id, {
      ctrl: event.ctrlKey || event.metaKey,
      shift: event.shiftKey,
    });
    this.itemsList()?.nativeElement.focus({ preventScroll: true });
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.target !== event.currentTarget) return;
    const list = this.itemsList()?.nativeElement;
    const columns =
      list && this.core.view() === 'grid'
        ? getComputedStyle(list).gridTemplateColumns.split(' ').filter(Boolean)
            .length
        : 1;
    this.core.keydown(event, columns);
  }

  protected onRenameKey(event: KeyboardEvent): void {
    event.stopPropagation();
    if (event.key === 'Enter') {
      event.preventDefault();
      void this.core.commitRename().then((ok) => {
        if (ok) this.itemsList()?.nativeElement.focus();
      });
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.core.cancelRename();
      this.itemsList()?.nativeElement.focus();
    }
  }

  protected onMenuOpening(event: OgeContextMenuOpeningEvent): void {
    const id = (event.target as HTMLElement).closest<HTMLElement>(
      '.oge-fm-item',
    )?.dataset['id'];
    const item = id === undefined ? null : (this.core.item(id) ?? null);
    event.items = this.core.menuFor(item);
  }

  protected onMenuClick(event: OgeMenuListItemClickEvent): void {
    void this.core.run(event.item.value as OgeFileCommand);
  }

  protected onDragStart(event: DragEvent, item: OgeFileItem): void {
    if (!this.core.selectedIds().has(item.id)) this.core.select(item.id);
    const ids = [...this.core.selectedIds()];
    event.dataTransfer?.setData(OGE_FILE_ITEMS_MIME, JSON.stringify(ids));
    event.dataTransfer?.setData(
      'text/plain',
      this.core
        .selectedItems()
        .map((i) => i.name)
        .join('\n'),
    );
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  private dragKind(event: DragEvent): 'files' | 'items' | null {
    const types = Array.from(event.dataTransfer?.types ?? []);
    if (types.includes(OGE_FILE_ITEMS_MIME)) return 'items';
    if (types.includes('Files')) return 'files';
    return null;
  }

  protected onDragOver(
    event: DragEvent,
    folderId: string | null,
    area = false,
  ): void {
    const kind = this.dragKind(event);
    if (!kind) return;
    if (kind === 'files' && !this.core.can('upload')) return;
    if (
      kind === 'items' &&
      !this.core.can('rename') &&
      !this.core.can('delete') &&
      area
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer)
      event.dataTransfer.dropEffect = kind === 'files' ? 'copy' : 'move';
    if (kind === 'files') {
      this.fileDrag.set(area || folderId === this.core.folderId());
      this.core.setDropTarget(area ? undefined : folderId);
    } else this.core.setDropTarget(area ? undefined : folderId);
  }

  protected onMainLeave(event: DragEvent): void {
    const related = event.relatedTarget as Node | null;
    if (related && (event.currentTarget as HTMLElement).contains(related))
      return;
    this.fileDrag.set(false);
    this.core.setDropTarget(undefined);
  }

  protected onDrop(event: DragEvent, folderId: string | null): void {
    const kind = this.dragKind(event);
    if (!kind) return;
    event.preventDefault();
    event.stopPropagation();
    this.fileDrag.set(false);
    this.core.setDropTarget(undefined);
    if (kind === 'files') {
      void this.core.upload(
        Array.from(event.dataTransfer?.files ?? []),
        folderId,
      );
      return;
    }
    try {
      const ids = JSON.parse(
        event.dataTransfer?.getData(OGE_FILE_ITEMS_MIME) ?? '[]',
      );
      if (Array.isArray(ids)) void this.core.move(ids.map(String), folderId);
    } catch {
      // not ours
    }
  }

  protected onPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    void this.core.upload(Array.from(input.files ?? []));
    input.value = '';
  }
}
