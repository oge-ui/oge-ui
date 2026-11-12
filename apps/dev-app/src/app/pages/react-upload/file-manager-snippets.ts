import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React file manager. Pure data, no React imports — the
 * `llms.txt` generator and the compile gate load this module in plain Node.
 * Section-for-section mirror of `../upload/file-manager.ts`.
 */
export const FILE_MANAGER_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Getting started',
    source: reactDemoSource({
      use: {
        '@oge-ui/react-upload/file-manager': [
          'OgeFileManager',
          'ogeMemoryFileProvider',
        ],
      },
      react: ['useState'],
      before: `// a provider talks to your storage: list a folder, plus the operations you
// allow (createFolder, rename, delete, move, upload) — here, an in-memory one
const files = ogeMemoryFileProvider([
  { id: 'projects', name: 'Projects', parentId: null, isFolder: true },
  { id: 'readme', name: 'Read me.txt', parentId: null, isFolder: false, size: 1284 },
  { id: 'spec', name: 'Specification.docx', parentId: 'projects', isFolder: false, size: 84210 },
]);`,
      name: 'Drive',
      body: `const [opened, setOpened] = useState('');`,
      jsx: `<>
  {/* Double-click or Enter opens; F2 renames; Delete deletes; drag items
      onto a folder to move them, drop files from the desktop to upload;
      right-click for the context menu. */}
  <OgeFileManager
    provider={files}
    onFileOpen={(item) => setOpened(item.name)}
    style={{ height: 460 }}
  />
  <p>Opened: {opened || '—'}</p>
</>`,
    }),
  },
  {
    title: 'Read-only grid',
    source: reactDemoSource({
      use: { '@oge-ui/react-upload/file-manager': ['OgeFileManager'] },
      types: {
        '@oge-ui/react-upload/file-manager': ['OgeFileProvider', 'OgeFileView'],
      },
      react: ['useState'],
      before: `// only list(): no new folder, rename, delete, move or upload commands
const archive: OgeFileProvider = {
  list: async (folderId) =>
    (await fetch(\`/api/archive?folder=\${folderId ?? ''}\`)).json(),
};`,
      name: 'Archive',
      body: `const [view, setView] = useState<OgeFileView>('grid');`,
      jsx: `<>
  {/* a read-only browser in grid view, the view in your own state */}
  <OgeFileManager
    provider={archive}
    view={view}
    onViewChange={setView}
    style={{ height: 400 }}
  />
</>`,
    }),
  },
  {
    title: 'Confirm before deleting',
    source: reactDemoSource({
      use: {
        '@oge-ui/react-upload/file-manager': [
          'OgeFileManager',
          'ogeMemoryFileProvider',
        ],
      },
      types: { '@oge-ui/react-upload/file-manager': ['OgeFileDeletingEvent'] },
      before: `const reports = ogeMemoryFileProvider([
  { id: 'q3', name: 'Q3 report.pdf', parentId: null, isFolder: false, size: 92004 },
  { id: 'q4', name: 'Q4 report.pdf', parentId: null, isFolder: false, size: 88512 },
]);

// onDeleting may return a promise (or use event.wait): cancel on "No"
async function confirmDelete(event: OgeFileDeletingEvent) {
  event.cancel = !window.confirm(\`Delete \${event.items.length} item(s)?\`);
}`,
      name: 'Reports',
      jsx: `<>
  <OgeFileManager
    provider={reports}
    onDeleting={confirmDelete}
    style={{ height: 300 }}
  />
</>`,
    }),
  },
];
