import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import {
  ogeMemoryFileProvider,
  type OgeFileDeletingEvent,
  type OgeFileItem,
  type OgeFileProvider,
  type OgeFileView,
} from '@oge-ui/behavior';
import { provideOgeUploadConfig } from '../../src/lib/config';
import { OGE_FILE_ITEMS_MIME, OgeFileManager } from './file-manager';

const FILES: OgeFileItem[] = [
  { id: 'docs', name: 'Documents', parentId: null, isFolder: true },
  { id: 'pics', name: 'Pictures', parentId: null, isFolder: true },
  { id: 'cv', name: 'cv.pdf', parentId: 'docs', isFolder: false, size: 2048 },
  {
    id: 'a',
    name: 'notes.txt',
    parentId: null,
    isFolder: false,
    size: 300,
    modified: '2026-03-01T10:00:00Z',
  },
  { id: 'b', name: 'photo.png', parentId: null, isFolder: false, size: 5000 },
];

@Component({
  imports: [OgeFileManager],
  template: `<oge-file-manager
    [provider]="provider()"
    [(view)]="view"
    (fileOpen)="opened.push($event)"
    (folderChange)="folders.push($event)"
    (selectionChange)="selected = $event"
    (deleting)="onDeleting($event)"
    (providerError)="errors.push($event)"
  />`,
})
class Host {
  readonly provider = signal<OgeFileProvider>(ogeMemoryFileProvider(FILES));
  readonly view = signal<OgeFileView>('list');
  readonly opened: OgeFileItem[] = [];
  readonly folders: (string | null)[] = [];
  readonly errors: unknown[] = [];
  selected: readonly OgeFileItem[] = [];
  cancelDelete = false;
  onDeleting(event: OgeFileDeletingEvent): void {
    event.cancel = this.cancelDelete;
  }
}

async function setup(messages = {}) {
  TestBed.configureTestingModule({
    providers: [
      provideOgeUploadConfig({ messages: { fileManager: messages } }),
    ],
  });
  const fixture = TestBed.createComponent(Host);
  const el = fixture.nativeElement as HTMLElement;
  await settle(fixture);
  return { fixture, el, host: fixture.componentInstance };
}

async function settle(fixture: ComponentFixture<Host>) {
  for (let i = 0; i < 3; i++) {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));
  }
  fixture.detectChanges();
}

const q = <T extends Element = HTMLElement>(el: HTMLElement, s: string) =>
  el.querySelector(s) as T;
const names = (el: HTMLElement) =>
  Array.from(
    el.querySelectorAll('.oge-fm-item .oge-fm-name > span:last-child'),
  ).map((n) => n.textContent?.trim());
const key = (target: Element, k: string, extra: KeyboardEventInit = {}) =>
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key: k, bubbles: true, ...extra }),
  );

/** A DataTransfer stand-in jsdom lacks. */
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
const drag = (target: Element, type: string, dataTransfer: unknown) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
  target.dispatchEvent(event);
  return event;
};

describe('OgeFileManager', () => {
  it('lists the root, opens folders from the list and the tree, and walks back', async () => {
    const { fixture, el, host } = await setup();
    expect(names(el)).toEqual([
      'Documents',
      'Pictures',
      'notes.txt',
      'photo.png',
    ]);
    expect(q(el, '.oge-fm-status').textContent).toContain('4 items');
    const tree = el.querySelectorAll('.oge-fm-tree [role="treeitem"]');
    expect(tree).toHaveLength(3);
    expect(tree[0].getAttribute('aria-selected')).toBe('true');
    q(el, '.oge-fm-item[data-id="docs"]').dispatchEvent(
      new MouseEvent('dblclick', { bubbles: true }),
    );
    await settle(fixture);
    expect(names(el)).toEqual(['cv.pdf']);
    expect(
      q(el, '.oge-fm-path [aria-current="location"]').textContent?.trim(),
    ).toBe('Documents');
    q<HTMLButtonElement>(el, '.oge-fm-back').click();
    await settle(fixture);
    expect(names(el)).toHaveLength(4);
    (
      el.querySelectorAll('.oge-fm-tree [role="treeitem"]')[2] as HTMLElement
    ).click();
    await settle(fixture);
    expect(host.folders).toEqual(['docs', null, 'pics']);
    expect(q(el, '.oge-fm-message').textContent).toContain(
      'This folder is empty',
    );
    // up is a new step in the history, so back returns to Pictures
    q<HTMLButtonElement>(el, '.oge-fm-up').click();
    await settle(fixture);
    expect(q<HTMLButtonElement>(el, '.oge-fm-forward').disabled).toBe(true);
    q<HTMLButtonElement>(el, '.oge-fm-back').click();
    await settle(fixture);
    expect(host.folders.at(-1)).toBe('pics');
    q<HTMLButtonElement>(el, '.oge-fm-back').click();
    await settle(fixture);
    q<HTMLButtonElement>(el, '.oge-fm-forward').click();
    await settle(fixture);
    expect(host.folders.at(-1)).toBe('pics');
    (el.querySelectorAll('.oge-fm-path button')[0] as HTMLElement).click();
    await settle(fixture);
    q(el, '.oge-fm-item[data-id="a"]').dispatchEvent(
      new MouseEvent('dblclick', { bubbles: true }),
    );
    expect(host.opened.map((i) => i.id)).toEqual(['a']);
  });

  it('selects with modifiers and the keyboard, and toggles the view', async () => {
    const { fixture, el, host } = await setup();
    const item = (id: string) => q(el, `.oge-fm-item[data-id="${id}"]`);
    item('a').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    item('b').dispatchEvent(
      new MouseEvent('click', { bubbles: true, ctrlKey: true }),
    );
    fixture.detectChanges();
    expect(host.selected.map((i) => i.id)).toEqual(['a', 'b']);
    expect(q(el, '.oge-fm-status').textContent).toContain(
      '4 items, 2 selected',
    );
    const list = q(el, '[role="listbox"]');
    key(list, 'Home');
    key(list, 'ArrowDown', { shiftKey: true });
    fixture.detectChanges();
    expect(item('pics').getAttribute('aria-selected')).toBe('true');
    expect(list.getAttribute('aria-activedescendant')).toBe(item('pics').id);
    key(list, 'a', { ctrlKey: true });
    fixture.detectChanges();
    expect(host.selected).toHaveLength(4);
    q<HTMLButtonElement>(el, '.oge-fm-grid-view').click();
    fixture.detectChanges();
    expect(host.view()).toBe('grid');
    expect(list.classList).toContain('oge-fm-grid');
    expect(el.querySelector('.oge-fm-columns')).toBeNull();
    key(list, 'ArrowRight');
    host.view.set('list');
    fixture.detectChanges();
    expect(q(el, '.oge-fm-list-view').getAttribute('aria-pressed')).toBe(
      'true',
    );
    (el.querySelectorAll('.oge-fm-columns button')[1] as HTMLElement).click();
    (el.querySelectorAll('.oge-fm-columns button')[1] as HTMLElement).click();
    fixture.detectChanges();
    expect(names(el).slice(2)).toEqual(['photo.png', 'notes.txt']);
    expect(q(el, '.oge-fm-columns').textContent).toContain('Size ↓');
    const search = q<HTMLInputElement>(el, '.oge-fm-search');
    search.value = 'PHOTO';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(names(el)).toEqual(['photo.png']);
    search.value = 'zzz';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(q(el, '.oge-fm-message').textContent).toContain('No items match');
  });

  it('renames inline, creates folders and deletes after the event', async () => {
    const { fixture, el, host } = await setup({ newFolderName: 'Yeni klasör' });
    const list = q(el, '[role="listbox"]');
    q(el, '.oge-fm-item[data-id="a"]').dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    key(list, 'F2');
    await settle(fixture);
    const input = q<HTMLInputElement>(el, '.oge-fm-rename');
    expect(input.value).toBe('notes.txt');
    input.value = 'Pictures';
    input.dispatchEvent(new Event('input'));
    key(input, 'Enter');
    await settle(fixture);
    expect(q(el, '.oge-fm-rename-error').textContent).toContain(
      'already exists',
    );
    expect(input.getAttribute('aria-invalid')).toBe('true');
    input.value = 'todo.txt';
    input.dispatchEvent(new Event('input'));
    key(input, 'Enter');
    await settle(fixture);
    expect(names(el)).toContain('todo.txt');
    expect(el.querySelector('.oge-fm-rename')).toBeNull();
    key(list, 'F2');
    await settle(fixture);
    key(q(el, '.oge-fm-rename'), 'Escape');
    await settle(fixture);
    expect(el.querySelector('.oge-fm-rename')).toBeNull();
    q<HTMLButtonElement>(el, '.oge-fm-new-folder').click();
    await settle(fixture);
    expect(q<HTMLInputElement>(el, '.oge-fm-rename').value).toBe('Yeni klasör');
    q<HTMLInputElement>(el, '.oge-fm-rename').dispatchEvent(new Event('blur'));
    await settle(fixture);
    host.cancelDelete = true;
    q<HTMLButtonElement>(el, '.oge-fm-delete').click();
    await settle(fixture);
    expect(names(el)).toContain('Yeni klasör');
    host.cancelDelete = false;
    key(list, 'Delete');
    await settle(fixture);
    expect(names(el)).not.toContain('Yeni klasör');
    expect(q(el, '.oge-fm-status [role="status"]').textContent).toContain(
      '1 item deleted',
    );
  });

  it('moves dragged items onto a folder and uploads dropped files', async () => {
    const { fixture, el } = await setup();
    const photo = q(el, '.oge-fm-item[data-id="b"]');
    const dt = transfer({});
    drag(photo, 'dragstart', dt);
    expect(JSON.parse(dt.getData(OGE_FILE_ITEMS_MIME))).toEqual(['b']);
    const docs = q(el, '.oge-fm-item[data-id="docs"]');
    const over = drag(docs, 'dragover', dt);
    fixture.detectChanges();
    expect(over.defaultPrevented).toBe(true);
    expect(docs.classList).toContain('oge-fm-drop-target');
    drag(docs, 'drop', dt);
    await settle(fixture);
    expect(names(el)).not.toContain('photo.png');
    // a file from the desktop, dropped on the open folder
    const files = transfer({}, [new File(['hello'], 'hello.txt')]);
    const main = q(el, '.oge-fm-main');
    drag(main, 'dragover', files);
    fixture.detectChanges();
    expect(el.querySelector('.oge-fm-dropzone')).not.toBeNull();
    drag(main, 'dragleave', files);
    fixture.detectChanges();
    expect(el.querySelector('.oge-fm-dropzone')).toBeNull();
    drag(main, 'drop', files);
    await settle(fixture);
    expect(names(el)).toContain('hello.txt');
    // onto a tree folder
    const tree = el.querySelectorAll('.oge-fm-tree [role="treeitem"]')[2];
    const move = transfer({ [OGE_FILE_ITEMS_MIME]: JSON.stringify(['a']) });
    drag(tree, 'dragover', move);
    drag(tree, 'dragleave', move);
    drag(tree, 'drop', move);
    await settle(fixture);
    expect(names(el)).not.toContain('notes.txt');
    // unrelated drags are ignored
    const text = transfer({ 'text/uri-list': 'x' });
    expect(drag(main, 'dragover', text).defaultPrevented).toBe(false);
    drag(main, 'drop', text);
    drag(main, 'drop', transfer({ [OGE_FILE_ITEMS_MIME]: '{' }));
    // the picker
    const picker = q<HTMLInputElement>(el, 'input[type="file"]');
    const click = vi.spyOn(picker, 'click').mockImplementation(() => undefined);
    q<HTMLButtonElement>(el, '.oge-fm-upload').click();
    expect(click).toHaveBeenCalled();
    Object.defineProperty(picker, 'files', {
      value: [new File(['x'], 'picked.txt')],
      configurable: true,
    });
    picker.dispatchEvent(new Event('change'));
    await settle(fixture);
    expect(names(el)).toContain('picked.txt');
  });

  it('drives the folder tree from the keyboard and hides unsupported commands', async () => {
    const { fixture, el, host } = await setup({ root: 'Dosyalar' });
    const tree = q(el, '[role="tree"]');
    expect(tree.querySelector('[role="treeitem"]')?.textContent).toContain(
      'Dosyalar',
    );
    key(tree, 'ArrowDown');
    key(tree, 'ArrowRight');
    await settle(fixture);
    expect(tree.querySelectorAll('[role="treeitem"]').length).toBe(3);
    // listed without subfolders: no longer expandable
    expect(
      tree
        .querySelectorAll('[role="treeitem"]')[1]
        .getAttribute('aria-expanded'),
    ).toBeNull();
    key(tree, 'Enter');
    await settle(fixture);
    expect(host.folders.at(-1)).toBe('docs');
    (tree.querySelector('.oge-fm-twisty') as HTMLElement).click();
    await settle(fixture);
    host.provider.set({
      list: async (id) => FILES.filter((f) => f.parentId === id),
    });
    await settle(fixture);
    expect(el.querySelector('.oge-fm-new-folder')).toBeNull();
    expect(el.querySelector('.oge-fm-upload')).toBeNull();
    expect(el.querySelector('.oge-fm-delete')).toBeNull();
    q<HTMLButtonElement>(el, '.oge-fm-refresh').click();
    await settle(fixture);
    host.provider.set({ list: () => Promise.reject(new Error('offline')) });
    await settle(fixture);
    expect(q(el, '[role="alert"]').textContent).toContain(
      'could not be loaded',
    );
    expect(host.errors).toHaveLength(1);
  });

  it('builds the context menu per target and runs its commands', async () => {
    const { fixture, el, host } = await setup();
    const row = q(el, '.oge-fm-item[data-id="a"]');
    row.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 5,
        clientY: 5,
      }),
    );
    await settle(fixture);
    const menu = document.querySelector('[role="menu"]') as HTMLElement;
    expect(
      Array.from(menu.querySelectorAll('[role="menuitem"]')).map((m) =>
        m.textContent?.trim(),
      ),
    ).toEqual(['Open', 'Rename', 'Delete']);
    (menu.querySelector('[role="menuitem"]') as HTMLElement).click();
    await settle(fixture);
    expect(host.opened.map((i) => i.id)).toEqual(['a']);
    const empty = q(el, '.oge-fm-items');
    empty.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 5,
        clientY: 5,
      }),
    );
    await settle(fixture);
    const areaMenu = document.querySelector('[role="menu"]') as HTMLElement;
    expect(areaMenu.textContent).toContain('New folder');
    expect(areaMenu.textContent).toContain('Refresh');
  });
});
