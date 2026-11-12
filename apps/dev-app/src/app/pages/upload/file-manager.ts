import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { OgeModalService } from '@oge-ui/overlay';
import {
  OgeFileManager,
  ogeMemoryFileProvider,
  type OgeFileDeletingEvent,
  type OgeFileItem,
  type OgeFileProvider,
  type OgeFileView,
} from '@oge-ui/upload/file-manager';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_FILE_MANAGER_SECTIONS,
  ReactFileManagerDemos,
} from '../react-upload/file-manager';
import { DEMO_FILES } from './file-manager-data';
import {
  FILE_MANAGER_CONFIRM_SNIPPET,
  FILE_MANAGER_GETTING_STARTED_SNIPPET,
  FILE_MANAGER_READ_ONLY_SNIPPET,
} from './file-manager-snippets';

const SECTIONS = [
  'Getting started',
  'Read-only grid',
  'Confirm before deleting',
] as const;

@Component({
  selector: 'app-file-manager-page',
  imports: [
    DemoCard,
    DocHeader,
    OgeFileManager,
    PageToc,
    ReactFileManagerDemos,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="File manager"
      category="Upload"
      categoryLink="/components/upload"
      [chips]="['folder tree', 'list / grid', 'drag and drop', 'provider']"
    >
      <p>
        A file manager over any storage: a folder tree loaded folder by folder,
        the open folder as a list or a grid, a path, back / forward / up,
        sorting and search, selection with Ctrl and Shift, inline rename, new
        folders, delete, drag-to-move, drop-to-upload and a context menu.
      </p>
      <p>
        Everything goes through a <code>provider</code> — a <code>list</code>
        function plus the operations you allow — so the same component browses a
        REST API, cloud storage or a database; a command the provider does not
        implement is hidden. The keyboard follows the APG tree view and listbox
        patterns. See the
        <a
          routerLink="/components/upload/api"
          class="text-indigo-600 underline dark:text-indigo-400"
          >API</a
        >.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-file-manager-demos />
    } @else {
      <app-demo-card
        [chips]="['provider', 'fileOpen', 'keyboard']"
        heading="Getting started"
        description="Double-click or Enter opens; F2 renames; Delete deletes; drag items onto a folder (in the list, the tree or the path) to move them, drop files from the desktop to upload; right-click or Shift+F10 for the context menu."
        [code]="gettingStartedSnippet"
        language="ts"
      >
        <oge-file-manager
          [provider]="files"
          (fileOpen)="open($event)"
          style="height: 460px"
        />
        <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Opened: {{ opened() || '—' }}
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['list only', 'view']"
        heading="Read-only grid"
        description="A provider with only <code>list</code> browses without the new folder, rename, delete, move and upload commands; <code>[(view)]</code> keeps the view in your own state."
        [code]="readOnlySnippet"
        language="ts"
      >
        <oge-file-manager
          [provider]="archive"
          [(view)]="view"
          style="height: 400px"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['deleting', 'wait']"
        heading="Confirm before deleting"
        description="<code>(deleting)</code> is cancelable; <code>event.wait()</code> holds the delete until a dialog answers."
        [code]="confirmSnippet"
        language="ts"
      >
        <oge-file-manager
          [provider]="reports"
          (deleting)="confirmDelete($event)"
          style="height: 300px"
        />
      </app-demo-card>
    }
  `,
})
export class FileManagerPage {
  protected readonly fw = inject(FrameworkService);
  private readonly dialog = inject(OgeModalService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_FILE_MANAGER_SECTIONS;
  protected readonly files = ogeMemoryFileProvider(DEMO_FILES);
  protected readonly archive: OgeFileProvider = {
    list: async (folderId) => DEMO_FILES.filter((f) => f.parentId === folderId),
  };
  protected readonly reports = ogeMemoryFileProvider(
    DEMO_FILES.filter((f) => f.parentId === 'invoices').map((f) => ({
      ...f,
      parentId: null,
    })),
  );
  protected readonly view = signal<OgeFileView>('grid');
  protected readonly opened = signal('');
  protected readonly gettingStartedSnippet =
    FILE_MANAGER_GETTING_STARTED_SNIPPET;
  protected readonly readOnlySnippet = FILE_MANAGER_READ_ONLY_SNIPPET;
  protected readonly confirmSnippet = FILE_MANAGER_CONFIRM_SNIPPET;

  protected open(item: OgeFileItem): void {
    this.opened.set(item.name);
  }

  protected confirmDelete(event: OgeFileDeletingEvent): void {
    event.wait(
      this.dialog
        .confirm({
          title: 'Delete files?',
          message: `${event.items.length} item(s) will be deleted.`,
        })
        .then((ok) => (event.cancel = !ok)),
    );
  }
}
