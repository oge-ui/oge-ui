'use client';
import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
} from 'react';
import {
  OgeFileManagerCore,
  type OgeFileCommand,
  type OgeFileDeletingEvent,
  type OgeFileItem,
  type OgeFileManagerMessages,
  type OgeFileProvider,
  type OgeFileSortField,
  type OgeFileView,
  type OgeMenuItem,
} from '@oge-ui/behavior';
import { OgeContextMenu } from '@oge-ui/react-overlay';
import { createMemoAdapter } from './rx-adapter';
import { useOgeUploadConfig } from './upload-config';

/** The MIME type an item drag carries: a JSON array of item ids. */
export const OGE_FILE_ITEMS_MIME = 'application/x-oge-file-items';

/** What a `ref` on {@link OgeFileManager} reaches. */
export interface OgeFileManagerHandle {
  /** Lists the open folder again. */
  refresh(): Promise<void>;
  /** Opens a folder (`null`: the root). */
  open(folderId: string | null): Promise<void>;
  /** Uploads files into the open folder. */
  upload(files: readonly File[]): Promise<void>;
}

/** Props of {@link OgeFileManager}. */
export interface OgeFileManagerProps {
  /** Where the files live: `list` plus the operations you allow. */
  provider: OgeFileProvider;
  /** List (rows) or grid (tiles). Controlled with `onViewChange`. */
  view?: OgeFileView;
  /** Fires when the toolbar switches the view. */
  onViewChange?: (view: OgeFileView) => void;
  /** Overrides of the message catalog. */
  messages?: Partial<OgeFileManagerMessages>;
  /** A file was opened (double click, Enter). */
  onFileOpen?: (item: OgeFileItem) => void;
  /** The open folder changed (`null`: the root). */
  onFolderChange?: (folderId: string | null) => void;
  /** The selection changed. */
  onSelectionChange?: (items: readonly OgeFileItem[]) => void;
  /** Cancelable, before a delete: set `cancel` (a confirmation dialog hooks in here). */
  onDeleting?: (event: OgeFileDeletingEvent) => void | Promise<void>;
  /** A provider call failed. */
  onProviderError?: (error: unknown) => void;
  className?: string;
  style?: CSSProperties;
}

const FolderIcon = ({ size = 16 }: { size?: number }) => (
  <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
    <path
      d="M1.5 3.5h4.5l1.5 1.5h7v7.5h-13z"
      fill="currentColor"
      opacity=".85"
    />
  </svg>
);
const FileIcon = () => (
  <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
    <path
      d="M3.5 1.5h6l3 3v10h-9zM9.5 1.5v3h3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);
const Stroke = ({ d, width = 1.6 }: { d: string; width?: number }) => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
    <path
      d={d}
      fill="none"
      stroke="currentColor"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function dragKind(event: DragEvent): 'files' | 'items' | null {
  const types = Array.from(event.dataTransfer?.types ?? []);
  if (types.includes(OGE_FILE_ITEMS_MIME)) return 'items';
  if (types.includes('Files')) return 'files';
  return null;
}

/**
 * A file manager over any storage: a folder tree, the open folder as a list
 * or a grid, a path, back / forward / up, sorting and search, selection with
 * Ctrl and Shift, inline rename, new folders, delete, drag-to-move, drop-to-
 * upload and a context menu. Everything goes through `provider`; commands it
 * does not implement are hidden.
 */
export const OgeFileManager = forwardRef<
  OgeFileManagerHandle,
  OgeFileManagerProps
>(function OgeFileManagerRender(props, ref): ReactElement {
  const { provider, view, messages, className, style } = props;
  const config = useOgeUploadConfig();
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const latest = useRef(props);
  latest.current = props;
  const id = `oge-fm-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const list = useRef<HTMLUListElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const renameInput = useRef<HTMLInputElement>(null);
  const [announcement, setAnnouncement] = useState('');
  const [fileDrag, setFileDrag] = useState(false);
  // kept in state: building the menu selects the item, and the re-render
  // that follows must not fall back to an empty list
  const [menuItems, setMenuItems] = useState<readonly OgeMenuItem[]>([]);

  const coreRef = useRef<OgeFileManagerCore | null>(null);
  if (coreRef.current === null) {
    coreRef.current = new OgeFileManagerCore({
      reactivity: createMemoAdapter(() => rerender()),
      provider: { list: async () => [] },
      messages: config.messages.fileManager,
      onOpenFile: (item) => latest.current.onFileOpen?.(item),
      onFolderChange: (folder) => latest.current.onFolderChange?.(folder),
      onSelectionChange: (items) => latest.current.onSelectionChange?.(items),
      onDeleting: (event) => latest.current.onDeleting?.(event),
      onError: (error) => latest.current.onProviderError?.(error),
      announce: setAnnouncement,
      pickFiles: () => fileInput.current?.click(),
    });
  }
  const core = coreRef.current;

  useImperativeHandle(
    ref,
    () => ({
      refresh: () => core.refresh(),
      open: (folderId: string | null) => core.open(folderId),
      upload: (files: readonly File[]) => core.upload(files),
    }),
    [core],
  );

  useEffect(() => {
    void core.setProvider(provider);
  }, [core, provider]);
  useEffect(() => {
    if (view) core.setView(view);
  }, [core, view]);
  useEffect(() => {
    core.setMessages({ ...config.messages.fileManager, ...messages });
  }, [core, config, messages]);

  const text = core.messages();
  const renaming = core.renaming();
  const focusedId = core.focusedId();
  const itemId = (itemKey: string | null) =>
    itemKey === null ? undefined : `${id}-item-${encodeURIComponent(itemKey)}`;
  const treeRowId = (folderId: string | null) =>
    `${id}-folder-${folderId === null ? 'root' : encodeURIComponent(folderId)}`;

  // the rename box takes the focus when it opens
  useLayoutEffect(() => {
    const input = renameInput.current;
    if (input && input.ownerDocument.activeElement !== input) {
      input.focus();
      input.select();
    }
  }, [renaming?.id]);
  // keep the focused item in view
  useEffect(() => {
    const itemKey = itemId(focusedId);
    if (itemKey) {
      list.current?.ownerDocument
        .getElementById(itemKey)
        ?.scrollIntoView?.({ block: 'nearest' });
    }
  });

  const setView = (next: OgeFileView) => {
    core.setView(next);
    latest.current.onViewChange?.(next);
  };
  const arrow = (field: OgeFileSortField) => {
    const sort = core.sort();
    return sort.field === field ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : '';
  };
  const describe = (item: OgeFileItem) =>
    [
      item.name,
      item.isFolder ? text.folderKind : '',
      core.sizeOf(item),
      core.modifiedOf(item),
    ]
      .filter(Boolean)
      .join(', ');

  const onDragOver = (
    event: DragEvent,
    folderId: string | null,
    area = false,
  ) => {
    const kind = dragKind(event);
    if (!kind) return;
    if (kind === 'files' && !core.can('upload')) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = kind === 'files' ? 'copy' : 'move';
    if (kind === 'files') setFileDrag(area || folderId === core.folderId());
    core.setDropTarget(area ? undefined : folderId);
  };
  const onDrop = (event: DragEvent, folderId: string | null) => {
    const kind = dragKind(event);
    if (!kind) return;
    event.preventDefault();
    event.stopPropagation();
    setFileDrag(false);
    core.setDropTarget(undefined);
    if (kind === 'files') {
      void core.upload(Array.from(event.dataTransfer.files ?? []), folderId);
      return;
    }
    try {
      const ids: unknown = JSON.parse(
        event.dataTransfer.getData(OGE_FILE_ITEMS_MIME) || '[]',
      );
      if (Array.isArray(ids)) void core.move(ids.map(String), folderId);
    } catch {
      // not ours
    }
  };
  const dropProps = (folderId: string | null) => ({
    onDragOver: (event: DragEvent) => onDragOver(event, folderId),
    onDragLeave: () => core.setDropTarget(undefined),
    onDrop: (event: DragEvent) => onDrop(event, folderId),
  });

  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.target !== event.currentTarget) return;
    const columns =
      list.current && core.view() === 'grid'
        ? getComputedStyle(list.current)
            .gridTemplateColumns.split(' ')
            .filter(Boolean).length
        : 1;
    core.keydown(event, columns);
  };
  const onRenameKey = (event: KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();
    if (event.key === 'Enter') {
      event.preventDefault();
      void core.commitRename().then((ok) => {
        if (ok) list.current?.focus();
      });
    } else if (event.key === 'Escape') {
      event.preventDefault();
      core.cancelRename();
      list.current?.focus();
    }
  };
  const onItemClick = (event: MouseEvent, item: OgeFileItem) => {
    core.select(item.id, {
      ctrl: event.ctrlKey || event.metaKey,
      shift: event.shiftKey,
    });
    list.current?.focus({ preventScroll: true });
  };

  const items = core.items();
  const button = (
    cls: string,
    label: string,
    onClick: () => void,
    icon: ReactElement,
    extra: { disabled?: boolean; pressed?: boolean } = {},
  ) => (
    <button
      type="button"
      className={`oge-fm-button ${cls}`}
      disabled={extra.disabled}
      aria-pressed={extra.pressed}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {icon}
    </button>
  );

  return (
    <div
      className={['oge-fm', className].filter(Boolean).join(' ')}
      style={style}
      role="group"
      aria-label={text.label}
    >
      <div className="oge-fm-toolbar" role="toolbar" aria-label={text.label}>
        <span className="oge-fm-group">
          {button(
            'oge-fm-back',
            text.back,
            () => void core.back(),
            <Stroke d="M10 3 5 8l5 5" />,
            { disabled: !core.canGoBack() },
          )}
          {button(
            'oge-fm-forward',
            text.forward,
            () => void core.forward(),
            <Stroke d="m6 3 5 5-5 5" />,
            { disabled: !core.canGoForward() },
          )}
          {button(
            'oge-fm-up',
            text.up,
            () => void core.up(),
            <Stroke d="M8 13V3M3.5 7.5 8 3l4.5 4.5" />,
            { disabled: !core.canGoUp() },
          )}
        </span>
        <ol className="oge-fm-path">
          {core.path().map((step, index, all) => (
            <li key={step.id ?? ''}>
              <button
                type="button"
                className="oge-fm-button"
                aria-current={index === all.length - 1 ? 'location' : undefined}
                onClick={() => void core.open(step.id)}
                {...dropProps(step.id)}
              >
                {step.name}
              </button>
            </li>
          ))}
        </ol>
        <span className="oge-fm-spacer" />
        <span className="oge-fm-group">
          {core.can('new-folder') &&
            button(
              'oge-fm-new-folder',
              text.newFolder,
              () => void core.newFolder(),
              <Stroke
                d="M1.5 4.5v8h13v-7H7.5L6 4H1.5zM8 7.5v4M6 9.5h4"
                width={1.3}
              />,
            )}
          {core.can('upload') &&
            button(
              'oge-fm-upload',
              text.upload,
              () => fileInput.current?.click(),
              <Stroke
                d="M8 11V2.5M4.5 6 8 2.5 11.5 6M2.5 10.5v3h11v-3"
                width={1.4}
              />,
            )}
          {core.can('delete') &&
            button(
              'oge-fm-delete',
              text.delete,
              () => void core.deleteSelected(),
              <Stroke
                d="M2.5 4.5h11M6 4.5V2.5h4v2M4 4.5l.7 9h6.6l.7-9"
                width={1.3}
              />,
              { disabled: !core.selectedItems().length },
            )}
          {button(
            'oge-fm-refresh',
            text.refresh,
            () => void core.refresh(),
            <Stroke d="M13 8a5 5 0 1 1-1.5-3.6M13 2.5v3h-3" width={1.4} />,
          )}
        </span>
        <span className="oge-fm-group">
          {button(
            'oge-fm-list-view',
            text.listView,
            () => setView('list'),
            <Stroke d="M2 4h12M2 8h12M2 12h12" width={1.4} />,
            { pressed: core.view() === 'list' },
          )}
          {button(
            'oge-fm-grid-view',
            text.gridView,
            () => setView('grid'),
            <Stroke
              d="M2.5 2.5h4v4h-4zM9.5 2.5h4v4h-4zM2.5 9.5h4v4h-4zM9.5 9.5h4v4h-4z"
              width={1.3}
            />,
            { pressed: core.view() === 'grid' },
          )}
        </span>
        <input
          className="oge-fm-search"
          type="search"
          aria-label={text.search}
          placeholder={text.search}
          value={core.searchText()}
          onChange={(event) => core.setSearch(event.target.value)}
        />
      </div>

      <div className="oge-fm-body">
        <ul
          className="oge-fm-tree"
          role="tree"
          tabIndex={0}
          aria-label={text.folders}
          aria-activedescendant={treeRowId(core.treeFocusedId())}
          onKeyDown={(event) => core.treeKeydown(event)}
        >
          {core.treeRows().map((row) => (
            <li
              key={row.id ?? ''}
              id={treeRowId(row.id)}
              role="treeitem"
              className={[
                'oge-fm-tree-row',
                row.current && 'oge-fm-current',
                row.id === core.treeFocusedId() && 'oge-fm-focused',
                core.dropTarget() === row.id && 'oge-fm-drop-target',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-level={row.depth + 1}
              aria-expanded={row.expandable ? row.expanded : undefined}
              aria-selected={row.current}
              aria-busy={row.loading || undefined}
              style={{ paddingInlineStart: 8 + row.depth * 14 }}
              onClick={() => {
                core.focusTree(row.id);
                void core.open(row.id);
              }}
              {...dropProps(row.id)}
            >
              <span
                className={
                  row.expanded ? 'oge-fm-twisty oge-fm-open' : 'oge-fm-twisty'
                }
                aria-hidden="true"
                onClick={(event) => {
                  event.stopPropagation();
                  void core.toggle(row.id);
                }}
              >
                {row.expandable && (
                  <svg viewBox="0 0 16 16" width="12" height="12">
                    <path
                      d="m6 3 5 5-5 5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              <span className="oge-fm-icon oge-fm-folder" aria-hidden="true">
                <FolderIcon />
              </span>
              <span>{row.name}</span>
            </li>
          ))}
        </ul>

        <OgeContextMenu
          items={menuItems}
          target=".oge-fm-item, .oge-fm-items"
          ariaLabel={text.label}
          onOpening={(event) => {
            const itemKey = (event.target as HTMLElement).closest<HTMLElement>(
              '.oge-fm-item',
            )?.dataset['id'];
            const built = core.menuFor(
              itemKey === undefined ? null : (core.item(itemKey) ?? null),
            );
            setMenuItems(built);
            event.items = built;
          }}
          onItemClick={(event) =>
            void core.run(event.item.value as OgeFileCommand)
          }
        >
          <div
            className="oge-fm-main"
            onDragOver={(event) => onDragOver(event, core.folderId(), true)}
            onDragLeave={(event) => {
              const related = event.relatedTarget as Node | null;
              if (related && event.currentTarget.contains(related)) return;
              setFileDrag(false);
              core.setDropTarget(undefined);
            }}
            onDrop={(event) => onDrop(event, core.folderId())}
          >
            {core.view() === 'list' && (
              <div className="oge-fm-columns" aria-hidden="true">
                {(['name', 'size', 'modified'] as const).map((field) => (
                  <button
                    key={field}
                    type="button"
                    className="oge-fm-button"
                    tabIndex={-1}
                    onClick={() => core.sortBy(field)}
                  >
                    {field === 'name'
                      ? text.nameColumn
                      : field === 'size'
                        ? text.sizeColumn
                        : text.modifiedColumn}
                    {arrow(field)}
                  </button>
                ))}
              </div>
            )}
            <ul
              ref={list}
              className={
                core.view() === 'grid'
                  ? 'oge-fm-items oge-fm-grid'
                  : 'oge-fm-items'
              }
              role="listbox"
              tabIndex={0}
              aria-multiselectable="true"
              aria-label={text.items}
              aria-activedescendant={itemId(focusedId)}
              aria-busy={core.loading() || undefined}
              onKeyDown={onKeyDown}
            >
              {items.map((item) => {
                const editing = renaming?.id === item.id ? renaming : null;
                return (
                  <li
                    key={item.id}
                    id={itemId(item.id)}
                    data-id={item.id}
                    role="option"
                    className={[
                      'oge-fm-item',
                      item.id === focusedId && 'oge-fm-focused',
                      item.isFolder &&
                        core.dropTarget() === item.id &&
                        'oge-fm-drop-target',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-selected={core.selectedIds().has(item.id)}
                    aria-label={describe(item)}
                    draggable={!editing}
                    onClick={(event) => onItemClick(event, item)}
                    onDoubleClick={() => void core.openItem(item)}
                    onDragStart={(event) => {
                      if (!core.selectedIds().has(item.id))
                        core.select(item.id);
                      event.dataTransfer.setData(
                        OGE_FILE_ITEMS_MIME,
                        JSON.stringify([...core.selectedIds()]),
                      );
                      event.dataTransfer.setData(
                        'text/plain',
                        core
                          .selectedItems()
                          .map((i) => i.name)
                          .join('\n'),
                      );
                      event.dataTransfer.effectAllowed = 'move';
                    }}
                    {...(item.isFolder ? dropProps(item.id) : {})}
                  >
                    <span className="oge-fm-name">
                      <span
                        className={
                          item.isFolder
                            ? 'oge-fm-icon oge-fm-folder'
                            : 'oge-fm-icon'
                        }
                        aria-hidden="true"
                      >
                        {item.isFolder ? (
                          <FolderIcon size={18} />
                        ) : (
                          <FileIcon />
                        )}
                      </span>
                      {editing ? (
                        <span>
                          <input
                            ref={renameInput}
                            className="oge-fm-rename"
                            aria-label={text.renameLabel}
                            aria-invalid={!!editing.error}
                            aria-describedby={
                              editing.error
                                ? `${itemId(item.id)}-error`
                                : undefined
                            }
                            value={editing.draft}
                            onChange={(event) =>
                              core.setRenameDraft(event.target.value)
                            }
                            onKeyDown={onRenameKey}
                            onBlur={() => void core.commitRename()}
                            onClick={(event) => event.stopPropagation()}
                          />
                          {editing.error && (
                            <span
                              className="oge-fm-rename-error"
                              id={`${itemId(item.id)}-error`}
                            >
                              {editing.error}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span>{item.name}</span>
                      )}
                    </span>
                    <span className="oge-fm-size">{core.sizeOf(item)}</span>
                    <span className="oge-fm-modified">
                      {core.modifiedOf(item)}
                    </span>
                  </li>
                );
              })}
            </ul>
            {core.loading() && !items.length ? (
              <div className="oge-fm-message" role="status">
                {text.loading}
              </div>
            ) : core.errorText() ? (
              <div className="oge-fm-message" role="alert">
                {core.errorText()}
              </div>
            ) : !items.length ? (
              <div className="oge-fm-message">
                {core.searchText() ? text.noMatches : text.empty}
              </div>
            ) : null}
            {fileDrag && (
              <div className="oge-fm-dropzone" aria-hidden="true">
                {text.dropHint}
              </div>
            )}
          </div>
        </OgeContextMenu>
      </div>

      <div className="oge-fm-status">
        <span>{core.statusText()}</span>
        <span className="oge-fm-sr-only" role="status" aria-live="polite">
          {announcement}
        </span>
      </div>
      <input
        ref={fileInput}
        className="oge-fm-sr-only"
        type="file"
        multiple
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          void core.upload(Array.from(event.target.files ?? []));
          event.target.value = '';
        }}
      />
    </div>
  );
});
