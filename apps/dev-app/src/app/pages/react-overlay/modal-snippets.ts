import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React modal page. Pure data, no React imports — the
 * `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../overlay/modal.ts`.
 */
export const OVERLAY_MODAL_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Basics',
    source: reactDemoSource({
      react: ['useState'],
      use: {
        '@oge-ui/react-buttons': ['OgeButton'],
        '@oge-ui/react-overlay': ['OgeModal'],
      },
      name: 'BasicModal',
      body: `const [opened, setOpened] = useState(false);`,
      jsx: `<>
  <OgeButton text="Open" onClick={() => setOpened(true)} />

  <OgeModal
    title="Team settings"
    opened={opened}
    onOpenedChange={setOpened}
    renderFooter={({ close }) => (
      <>
        <OgeButton text="Cancel" stylingMode="text" onClick={() => close()} />
        <OgeButton text="Save" onClick={() => close()} />
      </>
    )}
  >
    <p>Centered dialog with backdrop, focus trap and scroll lock.</p>
  </OgeModal>

  {/* Escape and backdrop clicks close it (closeOnEscape /
      closeOnBackdropClick); focus returns to the opener. */}
</>`,
    }),
  },
  {
    title: 'Form content & stacked popups',
    source: reactDemoSource({
      react: ['useState'],
      use: {
        '@oge-ui/react-inputs': ['OgeSelectBox'],
        '@oge-ui/react-overlay': ['OgeModal'],
      },
      name: 'FormModal',
      before: `const statuses = ['Draft', 'In review', 'Published'];`,
      body: `const [opened, setOpened] = useState(false);
const [status, setStatus] = useState<unknown>('Draft');`,
      jsx: `<OgeModal title="Edit record" opened={opened} onOpenedChange={setOpened} width={420}>
  <OgeSelectBox label="Status" items={statuses} value={status} onValueChange={setStatus} />
  {/* the select popup renders above the modal; the first Escape
      closes the popup, the second closes the modal */}
</OgeModal>`,
    }),
  },
  {
    title: 'Full screen, placement & sizing',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-overlay': ['OgeModal'] },
      name: 'SizingModals',
      body: `const [opened, setOpened] = useState(false);
const [search, setSearch] = useState(false);
const [quiet, setQuiet] = useState(false);
const [max, setMax] = useState(false);`,
      jsx: `<>
  {/* maximize/restore toggle in the title bar drives fullScreen */}
  <OgeModal
    title="Report"
    opened={opened}
    onOpenedChange={setOpened}
    fullScreen={max}
    onFullScreenChange={setMax}
    showMaximizeButton
    width={480}
    minHeight={240}
    maxWidth="90vw"
  />

  {/* pinned near the top edge, command-palette style */}
  <OgeModal title="Search" opened={search} onOpenedChange={setSearch} placement="top" />

  {/* transparent backdrop — still modal (focus trap + scroll lock) */}
  <OgeModal title="Quiet" opened={quiet} onOpenedChange={setQuiet} shading={false} />
</>`,
    }),
  },
  {
    title: 'Window mode & modal service',
    source: reactDemoSource({
      react: ['useState'],
      use: {
        '@oge-ui/react-overlay': [
          'OgeModal',
          'OgeModalProvider',
          'useOgeModalData',
          'useOgeModalRef',
          'useOgeModals',
        ],
      },
      types: { '@oge-ui/react-overlay': ['OgeModalResizeEvent'] },
      name: 'WindowModal',
      before: `// content of an imperative modal: read its data + the ref to close with a result
function RenameDialog() {
  const data = useOgeModalData<{ name: string }>();
  const ref = useOgeModalRef<string>();
  return (
    <p>
      Renaming {data.name}{' '}
      <button type="button" onClick={() => ref.close(data.name)}>Rename</button>
    </p>
  );
}

// <OgeModalProvider> sits once near the app root — the counterpart of the
// root-provided Angular OgeModalService`,
      body: `const [opened, setOpened] = useState(false);
const onResized = (event: OgeModalResizeEvent) => console.log(event.width, event.height);

// imperative, body-appended — for transformed ancestors & prompt flows
const modals = useOgeModals();
const openPrompt = async () => {
  const ref = modals.open<string>(<RenameDialog />, {
    title: 'Rename file',
    width: 380,
    data: { name: 'report.xlsx' },
  });
  const { result } = await ref.closed;
  if (result) console.log('renamed to', result);
};`,
      jsx: `<>
  {/* drag by the title bar, resize by the corner handle */}
  <OgeModal
    title="Window"
    opened={opened}
    onOpenedChange={setOpened}
    dragEnabled
    resizeEnabled
    onResized={onResized}
  />
  <button type="button" onClick={openPrompt}>Open via useOgeModals()</button>
</>`,
    }),
  },
  {
    title: 'Async close guard',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-overlay': ['OgeModal'] },
      name: 'GuardedModal',
      body: `const [opened, setOpened] = useState(false);
const [dirty] = useState(true);

// runs for every close reason (Escape, backdrop, ✕, close());
// may be async: the modal stays open until the promise resolves
const confirmDiscard = () => !dirty || confirm('Discard unsaved changes?');`,
      jsx: `<OgeModal title="Draft" opened={opened} onOpenedChange={setOpened} closeGuard={confirmDiscard}>
  <p>Unsaved work lives here.</p>
</OgeModal>`,
    }),
  },
  {
    title: 'Busy state',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-overlay': ['OgeModal'] },
      name: 'BusyModal',
      body: `const [opened, setOpened] = useState(false);
const [saving] = useState(true);`,
      jsx: `<OgeModal title="Publishing…" opened={opened} onOpenedChange={setOpened} busy={saving}>
  {/* spinner veil + aria-busy; Escape/backdrop/✕ are blocked
      while busy — programmatic close() still works */}
</OgeModal>`,
    }),
  },
  {
    title: 'Typed result',
    source: reactDemoSource({
      react: ['useState'],
      use: {
        '@oge-ui/react-buttons': ['OgeButton'],
        '@oge-ui/react-overlay': ['OgeModal'],
      },
      types: { '@oge-ui/react-overlay': ['OgeModalClosedEvent'] },
      name: 'ConfirmModal',
      body: `const [opened, setOpened] = useState(false);

// event: { reason: 'api' | 'escape' | 'backdrop' | 'closeButton', result? }
const onClosed = (event: OgeModalClosedEvent<string>) => {
  if (event.result === 'delete') console.log('deleted');
};`,
      jsx: `<OgeModal<string>
  title="Delete file?"
  opened={opened}
  onOpenedChange={setOpened}
  onClosed={onClosed}
  renderFooter={({ close }) => (
    <>
      <OgeButton text="Cancel" stylingMode="text" onClick={() => close()} />
      <OgeButton text="Delete" severity="danger" onClick={() => close('delete')} />
    </>
  )}
>
  <p>This cannot be undone.</p>
</OgeModal>`,
    }),
  },
];
