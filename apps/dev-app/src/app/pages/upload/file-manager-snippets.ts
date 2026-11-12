import { demoSource } from '../../shared/demo-source';

export const FILE_MANAGER_GETTING_STARTED_SNIPPET = demoSource({
  use: { '@oge-ui/upload/file-manager': ['OgeFileManager'] },
  helpers: { '@oge-ui/upload/file-manager': ['ogeMemoryFileProvider'] },
  types: { '@oge-ui/upload/file-manager': ['OgeFileItem', 'OgeFileProvider'] },
  body: `// a provider talks to your storage: list a folder, plus the operations you
// allow (createFolder, rename, delete, move, upload) — here, an in-memory one
readonly files: OgeFileProvider = ogeMemoryFileProvider([
  { id: 'projects', name: 'Projects', parentId: null, isFolder: true },
  { id: 'readme', name: 'Read me.txt', parentId: null, isFolder: false, size: 1284 },
  { id: 'spec', name: 'Specification.docx', parentId: 'projects', isFolder: false, size: 84210 },
]);
readonly opened = signal('');

open(item: OgeFileItem): void {
  this.opened.set(item.name);
}`,
  template: `<!-- Double-click or Enter opens; F2 renames; Delete deletes; drag items
     onto a folder to move them, drop files from the desktop to upload;
     right-click for the context menu. -->
<oge-file-manager
  [provider]="files"
  (fileOpen)="open($event)"
  style="height: 460px"
/>
<p>Opened: {{ opened() || '—' }}</p>`,
});

export const FILE_MANAGER_READ_ONLY_SNIPPET = demoSource({
  use: { '@oge-ui/upload/file-manager': ['OgeFileManager'] },
  types: { '@oge-ui/upload/file-manager': ['OgeFileProvider', 'OgeFileView'] },
  body: `// only list(): no new folder, rename, delete, move or upload commands
readonly archive: OgeFileProvider = {
  list: async (folderId) =>
    (await fetch(\`/api/archive?folder=\${folderId ?? ''}\`)).json(),
};
readonly view = signal<OgeFileView>('grid');`,
  template: `<!-- a read-only browser in grid view; [(view)] keeps the view in your
     own state -->
<oge-file-manager [provider]="archive" [(view)]="view" style="height: 400px" />`,
});

export const FILE_MANAGER_CONFIRM_SNIPPET = demoSource({
  use: { '@oge-ui/upload/file-manager': ['OgeFileManager'] },
  helpers: {
    '@oge-ui/upload/file-manager': ['ogeMemoryFileProvider'],
    '@oge-ui/overlay': ['OgeModalService'],
  },
  types: { '@oge-ui/upload/file-manager': ['OgeFileDeletingEvent'] },
  body: `private readonly dialog = inject(OgeModalService);
readonly files = ogeMemoryFileProvider([
  { id: 'q3', name: 'Q3 report.pdf', parentId: null, isFolder: false, size: 92004 },
  { id: 'q4', name: 'Q4 report.pdf', parentId: null, isFolder: false, size: 88512 },
]);

confirmDelete(event: OgeFileDeletingEvent): void {
  // wait() holds the delete until the answer: cancel on "No"
  event.wait(
    this.dialog
      .confirm({
        title: 'Delete files?',
        message: \`\${event.items.length} item(s) will be deleted.\`,
      })
      .then((ok) => (event.cancel = !ok)),
  );
}`,
  template: `<!-- (deleting) is cancelable; event.wait() holds it for a dialog -->
<oge-file-manager
  [provider]="files"
  (deleting)="confirmDelete($event)"
  style="height: 300px"
/>`,
});
