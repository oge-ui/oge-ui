import { StrictMode, createRef } from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import {
  ogeMemoryFileProvider,
  type OgeFileItem,
  type OgeFileProvider,
} from '@oge-ui/behavior';
import {
  OGE_FILE_ITEMS_MIME,
  OgeFileManager,
  type OgeFileManagerHandle,
  type OgeFileManagerProps,
} from './file-manager';
import { OgeUploadConfigProvider } from './upload-config';

const FILES: OgeFileItem[] = [
  { id: 'docs', name: 'Documents', parentId: null, isFolder: true },
  { id: 'pics', name: 'Pictures', parentId: null, isFolder: true },
  { id: 'cv', name: 'cv.pdf', parentId: 'docs', isFolder: false, size: 2048 },
  { id: 'a', name: 'notes.txt', parentId: null, isFolder: false, size: 300 },
  { id: 'b', name: 'photo.png', parentId: null, isFolder: false, size: 5000 },
];

const names = (container: HTMLElement) =>
  Array.from(
    container.querySelectorAll('.oge-fm-item .oge-fm-name > span:last-child'),
  ).map((n) => n.textContent);

function transfer(types: Record<string, string>, files: File[] = []) {
  const data = { ...types };
  return {
    get types() {
      return [...Object.keys(data), ...(files.length ? ['Files'] : [])];
    },
    files,
    dropEffect: 'none',
    effectAllowed: 'all',
    getData: (t: string) => data[t] ?? '',
    setData: (t: string, v: string) => {
      data[t] = v;
    },
  };
}

async function open(
  extra: Partial<OgeFileManagerProps> = {},
  provider: OgeFileProvider = ogeMemoryFileProvider(FILES),
) {
  const view = render(<OgeFileManager provider={provider} {...extra} />);
  await waitFor(() =>
    expect(
      view.container.querySelectorAll('.oge-fm-item').length,
    ).toBeGreaterThan(0),
  );
  return view;
}

describe('<OgeFileManager>', () => {
  it('lists, navigates, and reports opened files and folders', async () => {
    const onFileOpen = vi.fn();
    const onFolderChange = vi.fn();
    const { container } = await open({ onFileOpen, onFolderChange });
    expect(names(container)).toEqual([
      'Documents',
      'Pictures',
      'notes.txt',
      'photo.png',
    ]);
    fireEvent.doubleClick(container.querySelector('[data-id="docs"]')!);
    await waitFor(() => expect(names(container)).toEqual(['cv.pdf']));
    expect(onFolderChange).toHaveBeenLastCalledWith('docs');
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() => expect(names(container)).toHaveLength(4));
    fireEvent.click(screen.getByRole('button', { name: 'Forward' }));
    await waitFor(() => expect(names(container)).toEqual(['cv.pdf']));
    fireEvent.click(screen.getByRole('button', { name: 'Up one level' }));
    await waitFor(() => expect(names(container)).toHaveLength(4));
    fireEvent.click(screen.getAllByRole('treeitem')[2]);
    await waitFor(() =>
      expect(container.querySelector('.oge-fm-message')?.textContent).toBe(
        'This folder is empty',
      ),
    );
    fireEvent.click(container.querySelector('.oge-fm-path button')!);
    await waitFor(() => expect(names(container)).toHaveLength(4));
    fireEvent.doubleClick(container.querySelector('[data-id="a"]')!);
    expect(onFileOpen.mock.calls[0][0].id).toBe('a');
  });

  it('selects, sorts, searches and switches the view', async () => {
    const onSelectionChange = vi.fn();
    const onViewChange = vi.fn();
    const { container } = await open({ onSelectionChange, onViewChange });
    fireEvent.click(container.querySelector('[data-id="a"]')!);
    fireEvent.click(container.querySelector('[data-id="b"]')!, {
      ctrlKey: true,
    });
    expect(
      onSelectionChange.mock.calls.at(-1)[0].map((i: OgeFileItem) => i.id),
    ).toEqual(['a', 'b']);
    expect(container.querySelector('.oge-fm-status')?.textContent).toContain(
      '4 items, 2 selected',
    );
    const listbox = screen.getByRole('listbox');
    fireEvent.keyDown(listbox, { key: 'Home' });
    fireEvent.keyDown(listbox, { key: 'ArrowDown', shiftKey: true });
    expect(
      container
        .querySelector('[data-id="pics"]')
        ?.getAttribute('aria-selected'),
    ).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Grid view' }));
    expect(onViewChange).toHaveBeenLastCalledWith('grid');
    expect(listbox.className).toContain('oge-fm-grid');
    fireEvent.keyDown(listbox, { key: 'ArrowRight' });
    fireEvent.click(screen.getByRole('button', { name: 'List view' }));
    const columns = container.querySelectorAll('.oge-fm-columns button');
    fireEvent.click(columns[1]);
    fireEvent.click(columns[1]);
    expect(names(container).slice(2)).toEqual(['photo.png', 'notes.txt']);
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'photo' },
    });
    expect(names(container)).toEqual(['photo.png']);
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'zzz' },
    });
    expect(container.querySelector('.oge-fm-message')?.textContent).toBe(
      'No items match the search',
    );
  });

  it('renames, creates folders and deletes after onDeleting', async () => {
    let cancel = true;
    const { container } = await open({
      onDeleting: (event) => {
        event.cancel = cancel;
      },
    });
    const listbox = screen.getByRole('listbox');
    fireEvent.click(container.querySelector('[data-id="a"]')!);
    fireEvent.keyDown(listbox, { key: 'F2' });
    const input = screen.getByRole('textbox', { name: 'New name' });
    fireEvent.change(input, { target: { value: 'Pictures' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() =>
      expect(
        container.querySelector('.oge-fm-rename-error')?.textContent,
      ).toContain('already exists'),
    );
    fireEvent.change(input, { target: { value: 'todo.txt' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(names(container)).toContain('todo.txt'));
    fireEvent.keyDown(listbox, { key: 'F2' });
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'New name' }), {
      key: 'Escape',
    });
    expect(container.querySelector('.oge-fm-rename')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'New folder' }));
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'New name' })).toHaveProperty(
        'value',
        'New folder',
      ),
    );
    fireEvent.blur(screen.getByRole('textbox', { name: 'New name' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await act(async () => undefined);
    expect(names(container)).toContain('New folder');
    cancel = false;
    fireEvent.keyDown(listbox, { key: 'Delete' });
    await waitFor(() => expect(names(container)).not.toContain('New folder'));
    expect(
      container.querySelector('.oge-fm-status [role="status"]')?.textContent,
    ).toBe('1 item deleted');
  });

  it('moves dragged items, uploads dropped and picked files', async () => {
    const ref = createRef<OgeFileManagerHandle>();
    const { container } = await open({ ref } as Partial<OgeFileManagerProps>);
    const dt = transfer({});
    fireEvent.dragStart(container.querySelector('[data-id="b"]')!, {
      dataTransfer: dt,
    });
    expect(JSON.parse(dt.getData(OGE_FILE_ITEMS_MIME))).toEqual(['b']);
    const docs = container.querySelector('[data-id="docs"]')!;
    fireEvent.dragOver(docs, { dataTransfer: dt });
    expect(docs.className).toContain('oge-fm-drop-target');
    fireEvent.dragLeave(docs, { dataTransfer: dt });
    fireEvent.drop(docs, { dataTransfer: dt });
    await waitFor(() => expect(names(container)).not.toContain('photo.png'));
    const main = container.querySelector('.oge-fm-main')!;
    const files = transfer({}, [new File(['hi'], 'hello.txt')]);
    fireEvent.dragOver(main, { dataTransfer: files });
    expect(container.querySelector('.oge-fm-dropzone')).not.toBeNull();
    fireEvent.dragLeave(main, { dataTransfer: files });
    expect(container.querySelector('.oge-fm-dropzone')).toBeNull();
    fireEvent.drop(main, { dataTransfer: files });
    await waitFor(() => expect(names(container)).toContain('hello.txt'));
    const tree = screen.getAllByRole('treeitem')[2];
    const move = transfer({ [OGE_FILE_ITEMS_MIME]: JSON.stringify(['a']) });
    fireEvent.dragOver(tree, { dataTransfer: move });
    fireEvent.drop(tree, { dataTransfer: move });
    await waitFor(() => expect(names(container)).not.toContain('notes.txt'));
    fireEvent.dragOver(main, {
      dataTransfer: transfer({ 'text/uri-list': 'x' }),
    });
    fireEvent.drop(main, {
      dataTransfer: transfer({ [OGE_FILE_ITEMS_MIME]: '{' }),
    });
    const picker = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const click = vi.spyOn(picker, 'click').mockImplementation(() => undefined);
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }));
    expect(click).toHaveBeenCalled();
    fireEvent.change(picker, {
      target: { files: [new File(['x'], 'picked.txt')] },
    });
    await waitFor(() => expect(names(container)).toContain('picked.txt'));
    await act(() => ref.current!.upload([new File(['y'], 'by-ref.txt')]));
    expect(names(container)).toContain('by-ref.txt');
    await act(() => ref.current!.open('docs'));
    await act(() => ref.current!.refresh());
  });

  it('drives the tree, hides what the provider cannot do and shows failures', async () => {
    const onProviderError = vi.fn();
    const { container, rerender } = await open({
      onProviderError,
      messages: { root: 'Dosyalar' },
    });
    const tree = screen.getByRole('tree');
    expect(screen.getAllByRole('treeitem')[0].textContent).toContain(
      'Dosyalar',
    );
    fireEvent.keyDown(tree, { key: 'ArrowDown' });
    fireEvent.keyDown(tree, { key: 'ArrowRight' });
    await waitFor(() =>
      expect(
        screen.getAllByRole('treeitem')[1].getAttribute('aria-expanded'),
      ).toBeNull(),
    );
    fireEvent.keyDown(tree, { key: 'Enter' });
    await waitFor(() => expect(names(container)).toEqual(['cv.pdf']));
    fireEvent.click(container.querySelector('.oge-fm-twisty')!);
    const readOnly: OgeFileProvider = {
      list: async (id) => FILES.filter((f) => f.parentId === id),
    };
    rerender(
      <OgeFileManager provider={readOnly} onProviderError={onProviderError} />,
    );
    await waitFor(() => expect(names(container)).toHaveLength(4));
    expect(screen.queryByRole('button', { name: 'New folder' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Upload' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    rerender(
      <OgeFileManager
        provider={{ list: () => Promise.reject(new Error('offline')) }}
        onProviderError={onProviderError}
      />,
    );
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain(
        'could not be loaded',
      ),
    );
    expect(onProviderError).toHaveBeenCalled();
  });

  it('builds the context menu per target', async () => {
    const onFileOpen = vi.fn();
    const { container } = await open({ onFileOpen });
    fireEvent.contextMenu(container.querySelector('[data-id="a"]')!, {
      clientX: 5,
      clientY: 5,
    });
    await screen.findByRole('menuitem', { name: 'Open' });
    expect(screen.getAllByRole('menuitem').map((m) => m.textContent)).toEqual([
      'Open',
      'Rename',
      'Delete',
    ]);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Open' }));
    await waitFor(() => expect(onFileOpen).toHaveBeenCalled());
  });

  it('takes its text from the provider config and survives StrictMode', async () => {
    const { container } = render(
      <StrictMode>
        <OgeUploadConfigProvider
          config={{ messages: { fileManager: { root: 'Belgeler' } } }}
        >
          <OgeFileManager provider={ogeMemoryFileProvider(FILES)} />
        </OgeUploadConfigProvider>
      </StrictMode>,
    );
    await waitFor(() =>
      expect(container.querySelectorAll('.oge-fm-item')).toHaveLength(4),
    );
    expect(screen.getAllByRole('treeitem')[0].textContent).toContain(
      'Belgeler',
    );
  });
});
